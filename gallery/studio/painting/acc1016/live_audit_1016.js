/* acc1016 线上 Pages 部署审计 · 桌面21 + 移动8代表作
 * 目的：file:// 验收覆盖不到的 HTTPS 线上坑——网络失败/混合内容/部署版本/首屏渲染。
 * 复用 lib/cdp-harness.js；选择器按 1013 权威 TARGETS + 各件实际 canvas id。
 */
const path = require('path');
const fs = require('fs');
const H = require('../../../works/lib/cdp-harness.js');

const WS_PATH = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const BASE = 'https://rongkyn.github.io/rongball-xr/gallery/';
const OUT = __dirname;

// tag, file, canvas选择器(null=DOM游戏), dom兜底选择器
const W = [
  ['feng-duo','feng-duo.html','#cv'],
  ['floss-threads','floss-threads.html','#c'],
  ['ta-xue','ta-xue.html','#scene'],
  ['tian-deng','tian-deng.html','#c'],
  ['ink-2048','ink-2048.html',null,'#gameBoard'],
  ['ink-gomoku','ink-gomoku.html','#board'],
  ['ink-particles','ink-particles.html','#canvas'],
  ['ink-sound','ink-sound.html','#c'],
  ['living-landscape','living-landscape.html','#mainCanvas'],
  ['mo-yun','mo-yun.html','#c'],
  ['mountain-dwelling','mountain-dwelling.html','#scene'],
  ['tai-hen','tai-hen.html','#rd'],
  ['ting-mo','ting-mo.html','#paper'],
  ['mo-yin','mo-yin.html','#paper'],
  ['can-he','can-he.html','#pond'],
  ['lu-hua','lu-hua.html','#scene'],
  ['qiu-chong','qiu-chong-v0915.html','#scene'],
  ['yue-bo','yue-bo-v0916.html','#scene'],
  ['gui-yu','gui-yu.html','#scene'],
  ['hou','hou.html','#scene'],
  ['ink-garden','ink-garden.html','#scene'],
];
// 8 代表作（移动复验 retina backing / overflow / console）
const MOBILE = ['living-landscape','ink-garden','ting-mo','can-he','gui-yu','yue-bo','mo-yin','lu-hua'];
const BUST = 'cb=' + Date.now();

async function boot(url, port, mobile) {
  await H.killAll(port);
  const s = await H.launch({
    out: OUT, profile: 'la1016-' + (mobile ? 'm' : 'd') + '-' + process.pid,
    wsPath: WS_PATH, port,
    width: mobile ? 390 : 1280, height: mobile ? 844 : 720,
    dpr: mobile ? 3 : 1, mobile: !!mobile, reducedMotion: true,
  });
  s.netFailed = []; s.netBad = []; s.mixed = [];
  const wrap = await s.send('Network.enable');
  s.ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.method === 'Network.loadingFailed') {
      if (m.params.type !== 'Favicon' && !(m.params.errorText||'').includes('favicon'))
        s.netFailed.push((m.params.errorText||'fail') + ' ' + (m.params.type||'?'));
    }
    if (m.method === 'Network.responseReceived') {
      const r = m.params.response;
      if (r.status >= 400 && !/favicon/i.test(r.url)) s.netBad.push(r.status + ' ' + r.url.replace(BASE,''));
      if (r.url.startsWith('http://')) s.mixed.push(r.url.slice(0,80));
    }
  });
  await s.goto(url + (url.includes('?') ? '&' : '?') + BUST);
  return s;
}

async function measure(s, sel, domSel) {
  const target = sel || domSel;
  return s.q(`(function(){
    var el=document.querySelector(${JSON.stringify(target)});
    if(!el) return null;
    var r=el.getBoundingClientRect();
    var vw=(window.visualViewport&&window.visualViewport.width)||window.innerWidth;
    return {
      found:true, tag:el.tagName.toLowerCase(),
      w:Math.round(r.width), h:Math.round(r.height),
      left:Math.round(r.left), right:Math.round(r.right),
      bw: el.tagName==='CANVAS'?el.width:0, bh: el.tagName==='CANVAS'?el.height:0,
      ox: r.left < -1 || r.right > vw + 1,
      hostW: window.innerWidth, dpr: window.devicePixelRatio||1
    };
  })()`);
}

async function runOne(w, mobile, port) {
  const [tag,file,sel,domSel] = w;
  const url = BASE + 'works/' + file;
  const s = await boot(url, port, mobile);
  const rec = { tag, mobile, pass: true, issues: [] };
  try {
    await s.waitFor('document.readyState==="complete"', { timeout: 12000 }).catch(()=>null);
    await H.waitMs(2600);
    rec.location = await s.q('location.protocol');
    rec.ready = await s.q('document.readyState');
    const m = await measure(s, sel, domSel);
    rec.m = m;
    if (!m) { rec.pass=false; rec.issues.push('主元素未找到('+(sel||domSel)+')'); }
    else if (m.w < 80 || m.h < 80) { rec.pass=false; rec.issues.push('尺寸过小 '+m.w+'x'+m.h); }
    if (m && m.ox) { rec.pass=false; rec.issues.push('横向溢出 hostW='+m.hostW+' right='+m.right); }
    if (m && m.bw > 0) {
      const expect = Math.round(m.w * Math.min(m.dpr,2));
      if (Math.abs(m.bw - expect) > 4 && m.dpr > 1) {
        // retina 下 backing 显著低于 css*dpr = 降级
        if (m.bw < m.w * 1.5) { rec.pass=false; rec.issues.push('backing降级 '+m.bw+'x'+m.bh+' css='+m.w+'x'+m.h+' dpr='+m.dpr); }
      }
    }
    const realErrs = (s.errors||[]).filter(e => !/favicon|the server responded|Failed to load resource/i.test(e));
    if (realErrs.length) { rec.pass=false; rec.issues.push('ERR:'+realErrs.slice(0,2).join(' | ')); }
    if (s.netFailed.length) { rec.pass=false; rec.issues.push('NETFAIL:'+[...new Set(s.netFailed)].slice(0,3).join(',')); }
    if (s.netBad.length) { rec.pass=false; rec.issues.push('HTTP:'+[...new Set(s.netBad)].slice(0,3).join(',')); }
    if (s.mixed.length) { rec.pass=false; rec.issues.push('MIXED:'+s.mixed.length); }
    if (rec.location !== 'https:') { rec.pass=false; rec.issues.push('非HTTPS:'+rec.location); }
  } catch (e) {
    rec.pass=false; rec.issues.push('EX:'+String(e).slice(0,120));
  } finally {
    await s.kill().catch(()=>{});
  }
  console.log((rec.pass?'PASS':'FAIL') + ' ' + (mobile?'M ':'D ') + tag.padEnd(18) +
    (m_ok(rec) ? 'host='+rec.m.w+'x'+rec.m.h+' back='+rec.m.bw+'x'+rec.m.bh+' ox='+(rec.m.ox?1:0) : '') +
    (rec.issues.length ? '  ⚠ '+rec.issues.join(' ; ') : ''));
  return rec;
}
function m_ok(r){ return r.m && r.m.w; }

async function auditGallery(port) {
  const s = await boot(BASE + 'index.html', port, false);
  const g = { tag:'gallery-index', pass:true, issues:[] };
  try {
    await s.waitFor('document.readyState==="complete"',{timeout:12000}).catch(()=>null);
    await H.waitMs(1500);
    const links = await s.q(`(function(){
      var out=[]; document.querySelectorAll('a[href$=".html"]').forEach(function(a){
        out.push(a.getAttribute('href'));
      }); return out;
    })()`);
    g.links = links.length;
    g.ox = await s.q('document.documentElement.scrollWidth > window.innerWidth + 1');
    const realErrs = (s.errors||[]).filter(e => !/favicon|the server responded|Failed to load resource/i.test(e));
    g.netBad = [...new Set(s.netBad)].slice(0,5);
    if (realErrs.length) { g.pass=false; g.issues.push('ERR:'+realErrs.slice(0,2).join(' | ')); }
    if (g.netBad.length) { g.pass=false; g.issues.push('HTTP:'+g.netBad.join(',')); }
    if (g.ox) { g.pass=false; g.issues.push('横向滚动'); }
  } finally { await s.kill().catch(()=>{}); }
  console.log((g.pass?'PASS':'FAIL')+' D gallery-index     links='+g.links+' ox='+(g.ox?1:0)+(g.issues.length?'  ⚠ '+g.issues.join(' ; '):''));
  return g;
}

(async () => {
  const port = 9632;
  const desktop=[];
  for (let i=0;i<W.length;i++) {
    desktop.push(await runOne(W[i], false, port));
    await H.waitMs(250);
  }
  const mobile=[];
  for (const tag of MOBILE) {
    const w = W.find(x=>x[0]===tag);
    mobile.push(await runOne(w, true, port));
    await H.waitMs(250);
  }
  const gallery = await auditGallery(port);
  const all = desktop.concat(mobile);
  const fails = all.filter(r=>!r.pass);
  const report = {
    at: new Date().toISOString(), url: BASE,
    desktop: { total: desktop.length, pass: desktop.filter(r=>r.pass).length },
    mobile: { total: mobile.length, pass: mobile.filter(r=>r.pass).length },
    gallery, fails,
  };
  fs.writeFileSync(path.join(OUT,'live_audit_1016.json'), JSON.stringify(report,null,2));
  console.log('\n=== desktop ' + report.desktop.pass + '/' + report.desktop.total +
    ' PASS · mobile ' + report.mobile.pass + '/' + report.mobile.total +
    ' · gallery ' + (gallery.pass?'PASS':'FAIL') + ' · 总失败 ' + fails.length + ' ===');
  await H.killAll(port);
  process.exit(fails.length || !gallery.pass ? 2 : 0);
})();
