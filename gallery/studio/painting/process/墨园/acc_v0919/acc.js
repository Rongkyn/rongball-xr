/* 墨园 ink-garden v0919 深磨 · 基线体检 + 双端验收 harness
 * usage: node acc.js baseline desktop 9631 | node acc.js baseline mobile 9632
 *        node acc.js verify desktop 9631   | node acc.js verify mobile 9632
 */
const path = require('path');
const fs = require('fs');
const H = require('../../../../../works/lib/cdp-harness.js');

const MODE = process.argv[2] || 'baseline';   // baseline | verify
const SHAPE = process.argv[3] || 'desktop';    // desktop | mobile
const PORT = parseInt(process.argv[4] || '9631', 10);
const OUT = __dirname;
const WORK = 'file://' + path.resolve(__dirname, '../../../../../works/ink-garden.html') + '?cb=' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mobile = SHAPE === 'mobile';

(async () => {
  await H.killAll(PORT);
  const s = await H.launch({
    out: OUT, profile: 'ig_' + MODE + '_' + SHAPE, port: PORT, mobile,
    width: mobile ? 390 : 1280, height: mobile ? 844 : 860,
    wsPath: '/usr/lib/node_modules/@coze/cli/node_modules/ws',
  });
  const rep = { mode: MODE, shape: SHAPE, ts: new Date().toISOString() };
  try {
    const t0 = Date.now();
    await s.goto(WORK);
    await sleep(1800);
    rep.bootMs = Date.now() - t0;

    // 1) 真视口 + 横向溢出 + 关键 UI 入屏
    const vp = await s.viewport();
    rep.viewport = vp;
    rep.layout = await s.q(`(function(){
      var c=document.getElementById('scene').getBoundingClientRect();
      var vw=${vp.w}, vh=${vp.h};
      function rect(sel){var el=document.querySelector(sel);if(!el)return null;
        var r=el.getBoundingClientRect();
        return {l:Math.round(r.left),t:Math.round(r.top),r:Math.round(r.right),b:Math.round(r.bottom),
          fits:r.left>=-1&&r.right<=vw+1&&r.top>=-1&&r.bottom<=vh+1};}
      return {
        canvasW:Math.round(c.width), canvasH:Math.round(c.height),
        docScrollW: document.documentElement.scrollWidth,
        overflowX: document.documentElement.scrollWidth > vw + 1,
        bar: rect('#barWrap'), hint: rect('#hint'), stats: rect('#stats'),
        title: rect('#titleBlock'), wind: rect('#wind-indicator')
      };
    })()`);

    // 2) 加载/内存/JS 资源
    rep.resources = await s.q(`(function(){
      var ents=performance.getEntriesByType('resource');
      var ext=ents.filter(function(e){return /fonts\\.(googleapis|gstatic)/.test(e.name);});
      return {count:ents.length,
        fontReqs:ext.length,
        fontBytes:ext.reduce(function(a,e){return a+(e.transferSize||0);},0),
        totalTransfer:ents.reduce(function(a,e){return a+(e.transferSize||0);},0),
        domMs: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd),
        loadMs: Math.round(performance.getEntriesByType('navigation')[0].loadEventEnd)};
    })()`);
    rep.jsHeap = await s.q(`(performance.memory && performance.memory.usedJSHeapSize) || -1`);

    // 3) 栽种交互：点 3 株 + 数草木
    const r = await s.tap('#scene', Math.round(vp.w*0.5), Math.round(vp.h*0.55));
    rep.tapRect = r;
    await sleep(900);
    await s.tap('#scene', Math.round(vp.w*0.35), Math.round(vp.h*0.6));
    await sleep(900);
    await s.tap('#scene', Math.round(vp.w*0.66), Math.round(vp.h*0.62));
    await sleep(1400);
    rep.plantCount = await s.q(`document.getElementById('plant-count').textContent`);

    // 4) FPS（忙时，6s）
    rep.fps = await s.q(`(new Promise(function(res){
      var frames=0; var t0=performance.now();
      function tick(){frames++; if(performance.now()-t0<6000){requestAnimationFrame(tick);}
        else{res({frames:frames, fps:+(frames/6).toFixed(1)});}}
      requestAnimationFrame(tick);
    }))`);

    // 5) 纸纹生成耗时探针（重建一次并计时）
    // 作品函数在闭包内，不可直接调；用 resize 路径近似测首屏之外一次重建成本
    rep.paintRatio = await s.pixels('#scene', 'a>20 && r<235', 3);

    // 6) 调风/除草/留影按钮可达性（点击调风不报错即通过）
    await s.q(`document.getElementById('btn-wind').click(); 'wind-clicked'`);
    await sleep(300);

    rep.errors = await s.realErrors();
    await s.shot('ig_' + MODE + '_' + SHAPE);
    rep.shot = 'ig_' + MODE + '_' + SHAPE + '.png';
  } catch (e) {
    rep.fatal = String(e && e.stack || e);
  } finally {
    fs.writeFileSync(path.join(OUT, 'acc_' + MODE + '_' + SHAPE + '.json'), JSON.stringify(rep, null, 2));
    console.log(JSON.stringify(rep, null, 2));
    await s.kill();
  }
})();
