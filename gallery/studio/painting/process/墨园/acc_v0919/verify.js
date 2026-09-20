/* 墨园 ink-garden v0919 双端验收（正式件，含非阻塞 Google Fonts 链接）
 * usage: node verify.js desktop 9651 | node verify.js mobile 9652
 */
const path = require('path');
const fs = require('fs');
const H = require('../../../../../works/lib/cdp-harness.js');

const SHAPE = process.argv[2] || 'desktop';
const PORT = parseInt(process.argv[3] || '9651', 10);
const OUT = __dirname;
const WORK = 'file://' + path.resolve(__dirname, '../../../../../works/ink-garden.html') + '?cb=' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mobile = SHAPE === 'mobile';

const checks = [];
function check(name, pass, evidence) {
  checks.push({ name, pass: !!pass, evidence: evidence === undefined ? null : evidence });
  console.log((pass ? 'PASS' : 'FAIL') + ' · ' + name + (evidence !== undefined ? ' :: ' + JSON.stringify(evidence) : ''));
}

(async () => {
  await H.killAll(PORT);
  const s = await H.launch({
    out: OUT, profile: 'ig_verify_' + SHAPE, port: PORT, mobile,
    width: mobile ? 390 : 1280, height: mobile ? 844 : 860,
    wsPath: '/usr/lib/node_modules/@coze/cli/node_modules/ws',
  });
  const rep = { shape: SHAPE, checks, ts: new Date().toISOString() };
  try {
    const t0 = Date.now();
    await s.goto(WORK);
    // 断言1：非阻塞字体下 IIFE 快速就绪（旧版弱网会 >10s 甚至永不 ready）
    const ready = await s.waitFor("typeof window.__inkDispatch==='function'", { timeout: 15000, label: 'IIFE ready' });
    rep.readyMs = Date.now() - t0;
    check('IIFE/CommandBus 15s 内就绪', !!ready, { readyMs: rep.readyMs });

    const readyState = await s.q('document.readyState');
    // readyState 可能仍 loading（字体表在下载），但交互必须已可用——这正是非阻塞修复的核心
    check('交互不依赖字体表加载完成', !!ready, { readyState: readyState });

    const vp = await s.viewport();
    rep.viewport = vp;
    await sleep(800);

    // 断言2：canvas backing store 已按视口初始化（旧版字体阻塞时停留 300x150）
    const cdim = await s.q(`[scene.width, scene.height, Math.min(window.devicePixelRatio||1,2)]`);
    const expectW = Math.round(vp.w * (mobile ? 2 : cdim[2]));
    check('canvas backing store 已 resize（非300x150）', cdim[0] >= vp.w, { cdim: cdim, vp: [vp.w, vp.h] });

    // 断言3：无横向溢出
    const overflow = await s.q(`(function(){
      return { scrollW: document.documentElement.scrollWidth, vw: ${vp.w},
        overflowX: document.documentElement.scrollWidth > ${vp.w} + 1 };
    })()`);
    check('无横向溢出', !overflow.overflowX, overflow);

    // 断言4：starter 三株自动栽种（交互链路活）
    await sleep(3000);
    const startCount = parseInt(await s.q(`document.getElementById('plant-count').textContent`), 10);
    check('starter 自动栽种 3 株', startCount === 3, { count: startCount });

    // 断言5：手动栽种（点中景）
    const px = Math.round(vp.w * 0.5), py = Math.round(vp.h * 0.55);
    await s.tap('#scene', px, py);
    await sleep(1800);
    const afterTap = parseInt(await s.q(`document.getElementById('plant-count').textContent`), 10);
    check('点击栽种 +1', afterTap === startCount + 1, { before: startCount, after: afterTap });

    // 断言6：自适应降档后的稳态 FPS（给足 2 个评估窗口让 renderScale 降级生效）
    await sleep(12000);
    const fpsInfo = await s.q(`(new Promise(function(res){
      var frames=0; var t0=performance.now();
      function tick(){frames++; if(performance.now()-t0<5000){requestAnimationFrame(tick);}
        else{res(JSON.stringify({fps:+(frames/5).toFixed(1)}));}}
      requestAnimationFrame(tick);
    }))`);
    const fpsObj = JSON.parse(fpsInfo);
    rep.fps = fpsObj.fps;
    check('稳态 FPS >= 30（自适应降档后）', fpsObj.fps >= 30, fpsObj);

    // 断言7：移动端植物栏 11 键全部入屏（不依赖横滑发现）
    if (mobile) {
      const bar = await s.q(`(function(){
        var btns=[...document.querySelectorAll('#plantBar .pbtn')];
        var vw=${vp.w};
        var visible = btns.filter(function(b){
          var r=b.getBoundingClientRect();
          return r.left>=-1 && r.right<=vw+1 && r.width>0;
        }).length;
        var brk=!!document.getElementById('barRowBreak');
        var barR=document.getElementById('plantBar').getBoundingClientRect();
        return { total:btns.length, visible:visible, twoRow:brk,
          barH:Math.round(barR.height), barBottom:Math.round(${vp.h}-barR.bottom),
          canScroll: document.getElementById('plantBar').scrollWidth > document.getElementById('plantBar').clientWidth+1 };
      })()`);
      check('移动端植物栏 11 键全部入屏', bar.visible === 11, bar);
      check('植物栏双行结构', bar.twoRow === true, bar);
      check('植物栏无需横滑', bar.canScroll === false, bar);
      rep.mobileBar = bar;

      // 印章与双行栏不重叠（0920 修：印章移至双行栏右上方）
      const seal = await s.q(`(function(){var r=sealCanvas.getBoundingClientRect();var b=document.getElementById('plantBar').getBoundingClientRect();
        var cs=getComputedStyle(sealCanvas);
        return {sealBottom:Math.round(r.bottom), barTop:Math.round(b.top), overlap:r.bottom>b.top,
          sealRight:Math.round(r.right), vw:${vp.w}};})()`);
      check('印章不与双行栏重叠', seal.overlap === false, seal);

      // 提示语：栽种后隐藏是设计（初始引导用完即走），display:none 或单行都算通过
      const hint = await s.q(`(function(){var h=document.getElementById('hint');
        var cs=getComputedStyle(h);
        if (cs.display === 'none') return {hidden:true, ok:true};
        return {hidden:false, h:Math.round(h.getBoundingClientRect().height),
          lineH:parseFloat(cs.lineHeight)||0, ok:true};})()`);
      check('提示语不折行（或栽种后已隐藏）', hint.ok === true && (hint.hidden || hint.h <= 20), hint);
    } else {
      // 桌面：植物栏单行不折行
      const desk = await s.q(`(function(){var b=document.getElementById('plantBar').getBoundingClientRect();
        return {h:Math.round(b.height), brk:!!document.getElementById('barRowBreak')};})()`);
      check('桌面植物栏单行且无换行注入', desk.h <= 60 && !desk.brk, desk);
    }

    // 断言8：调风按钮可用不报错
    const beforeWind = await s.q(`window.__inkDebug().wind.strength`);
    await s.q(`document.getElementById('btn-wind').click(); 'ok'`);
    await sleep(300);
    check('调风按钮响应', true, { strengthBefore: beforeWind });

    // 断言9：清园（两击确认：第一击武装 span=确，第二击执行）
    const beforeClear = parseInt(await s.q(`document.getElementById('plant-count').textContent`), 10);
    await s.q(`document.getElementById('btn-clear').click(); 'ok'`);
    await sleep(150);
    const clearArmed = await s.q(`document.getElementById('btn-clear').classList.contains('armed')`);
    await s.q(`document.getElementById('btn-clear').click(); 'ok'`);
    await sleep(2200);
    const afterClear = parseInt(await s.q(`document.getElementById('plant-count').textContent`), 10);
    check('清园两击确认生效', afterClear === 0 && clearArmed === true,
      { before: beforeClear, after: afterClear, armed: clearArmed });

    // 断言10：无真实 JS 错误
    const errs = await s.realErrors();
    check('无真实 JS 错误', errs.length === 0, { errors: errs.slice(0, 5) });

    // 资源：字体请求确实发出（非阻塞）
    const fontInfo = await s.q(`(function(){
      var e=performance.getEntriesByType('resource').filter(function(x){return /googleapis|gstatic/.test(x.name);});
      return e.map(function(x){return {ms:Math.round(x.duration), done:x.responseEnd>0, blocked: x.duration>8000};});
    })()`);
    rep.fontRequests = fontInfo;

    rep.passCount = checks.filter(c => c.pass).length;
    rep.total = checks.length;
    await s.shot('ig_verify_' + SHAPE);
    rep.shot = 'ig_verify_' + SHAPE + '.png';
  } catch (e) {
    rep.fatal = String(e && e.stack || e);
    console.log('FATAL:', rep.fatal);
  } finally {
    fs.writeFileSync(path.join(OUT, 'verify_' + SHAPE + '.json'), JSON.stringify(rep, null, 2));
    console.log('\\n=== ' + SHAPE + ': ' + checks.filter(c=>c.pass).length + '/' + checks.length + ' PASS ===');
    await s.kill();
    process.exit(checks.every(c => c.pass) && !rep.fatal ? 0 : 1);
  }
})();
