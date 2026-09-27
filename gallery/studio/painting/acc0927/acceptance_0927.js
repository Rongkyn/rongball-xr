/**
 * acceptance_0927.js — P12 加载性能验收（7 件作品集候选，旧作能力审计非新件）
 * 每件双端（桌面 1280x860 / 移动 390x844）：
 *   外链资源数 / raw+gzip 体积 / DCL·load·FCP 时刻 / 首帧墨色上画时刻 / JS 错误
 * 用法：node acceptance_0927.js [work...]（默认全 7 件）
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;

const WORKS = [
  ['ink-garden', 'ink-garden.html', 'scene'],
  ['can-he', 'can-he.html', 'pond'],
  ['ting-mo', 'ting-mo.html', 'paper'],
  ['lu-hua', 'lu-hua.html', 'scene'],
  ['gui-yu', 'gui-yu.html', 'scene'],
  ['yue-bo', 'yue-bo-v0916.html', 'scene'],
  ['qiu-chong', 'qiu-chong-v0915.html', 'scene'],
];

const COLLECT = `(function(){
  var nav = performance.getEntriesByType('navigation')[0] || {};
  var res = performance.getEntriesByType('resource').map(function(r){
    return {u:r.name.split('?')[0].split('/').pop().slice(0,80), full:r.name.split('?')[0].slice(0,110),
            st:+r.startTime.toFixed(0), du:+r.duration.toFixed(0),
            sz:(r.transferSize||0), enc:(r.encodedBodySize||0)};
  });
  var fcpList = performance.getEntriesByName('first-contentful-paint');
  return {
    rs: document.readyState,
    dcl: nav.domContentLoadedEventEnd ? +nav.domContentLoadedEventEnd.toFixed(0) : null,
    load: nav.loadEventEnd ? +nav.loadEventEnd.toFixed(0) : null,
    fcp: fcpList.length ? +fcpList[0].startTime.toFixed(0) : null,
    resources: res
  };
})()`;

// 首帧已上画：canvas 已脱离默认 300x150（尺寸化生效）+ 出现任意非暖纸色/设计色像素。
// v0927：墨园/听墨初始空纸、秋虫暗夜、残荷棕褐，单认深色像素会漏；故尺寸化 + 非纸色双条件。
function inkExpr(canvasId) {
  return `(function(){
  var c=document.getElementById(${JSON.stringify(canvasId)});
  if(!c||!c.getContext) return false;
  var W=c.width,H=c.height;
  if(!W||!H || (W===300&&H===150)) return false;  // 未尺寸化=初始化未完成（墨园死件时正是此态）
  var x=c.getContext('2d');
  try{
    var d=x.getImageData(0,0,W,H).data;
    var step=Math.max(4,Math.floor(d.length/2500));
    for(var i=0;i<d.length;i+=step) {
      var r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
      // 排除暖纸色（含宣纸底色渐变）与全透明
      if(a>12 && !(r>232&&g>222&&b>195)) return true;
    }
  }catch(e){return 'ERR:'+e.message;}
  return false;
})()`;
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

async function runOne(workName, file, canvasId, mobile, port) {
  const tag = workName + (mobile ? ':m' : ':d');
  const prof = 'a27' + (mobile ? 'm' : 'd') + '-' + workName;
  const s = await H.launch({
    out: OUT, profile: prof, wsPath: WS, port,
    mobile: mobile, width: mobile ? 390 : 1280, height: mobile ? 844 : 860,
  });
  const full = path.join(__dirname, '..', '..', '..', 'works', file);
  const raw = fs.statSync(full).size;
  const gz = zlib.gzipSync(fs.readFileSync(full)).length;
  const url = 'file://' + encodeURI(full) + '?cb=' + Date.now();
  const t0 = Date.now();
  await s.goto(url);
  let complete = false;
  try { await s.waitFor('document.readyState==="complete"', { timeout: 12000 }); complete = true; } catch (e) {}
  let firstInkMs = null, paintErr = null;
  while (Date.now() - t0 < 12000) {
    const r = await s.q(inkExpr(canvasId));
    if (r === true) { firstInkMs = Date.now() - t0; break; }
    if (typeof r === 'string' && r.indexOf('ERR:') === 0) { paintErr = r; break; }
    await H.waitMs(150);
  }
  await H.waitMs(500);
  const metrics = await s.q(COLLECT);
  const errs = await s.realErrors();
  const external = metrics.resources.filter(function(r){ return /^https?:/.test(r.full); });
  const result = {
    tag: tag, raw: raw, gz: gz, complete: complete,
    dcl: metrics.dcl, load: metrics.load, fcp: metrics.fcp,
    firstInkMs: firstInkMs, paintErr: paintErr,
    externalCount: external.length,
    external: external.map(function(r){ return r.full; }),
    jsErrors: errs,
    resourceCount: metrics.resources.length
  };
  check(tag + ' readyState complete', complete);
  check(tag + ' 首帧墨色上画', firstInkMs !== null, { paintErr: paintErr });
  check(tag + ' 零 JS 错误', errs.length === 0, errs.slice(0, 3));
  console.log('     raw=%dB gzip=%dB dcl=%sms load=%sms fcp=%sms firstInk=%sms res=%d ext=%d',
    raw, gz, metrics.dcl, metrics.load, metrics.fcp, firstInkMs, metrics.resources.length, external.length);
  await s.kill();
  return result;
}

(async () => {
  const only = process.argv.slice(2);
  const list = WORKS.filter(function(w){ return !only.length || only.includes(w[0]); });
  const all = [];
  let portBase = 9701;
  for (const w of list) {
    console.log('=== ' + w[0] + ' ===');
    await H.killAll(portBase);
    all.push(await runOne(w[0], w[1], w[2], false, portBase++));
    await H.killAll(portBase);
    all.push(await runOne(w[0], w[1], w[2], true, portBase++));
  }
  fs.writeFileSync(
    path.join(__dirname, '..', 'process', '\u52a0\u8f7d\u6027\u80fd0927', 'result.json'),
    JSON.stringify(all, null, 1));
  console.log('\\n\u603b\u8ba1 PASS=%d FAIL=%d', pass, fail);
  process.exit(fail ? 1 : 0);
})();
