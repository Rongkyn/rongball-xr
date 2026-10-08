/**
 * 候 hou 全档健康基线（acc1009）— 2026-10-09
 *
 * 背景：全仓 21 件作品中，hou.html 是唯一未进过任何验收套件的件
 * （1004 冻结闸口 8 件、1005 三件套、1006 全量 9 件均不含）。
 * 待审队列仍 5 件超闸 → 不开新件，按优先级③深磨此唯一缺口，
 * 先跑基线记录真实当前状态，再定修不修、修什么。
 *
 * 公共检查（三档：移动 390x844@2 + 桌面 1280x720@1 + 横屏 844x390@2）：
 *   A. 加载完整：readyState complete/interactive，画布已渲染
 *   B. backing 对齐视口 × dpr（非默认 300x150）
 *   C. 画布入屏不溢出
 *   D. touch-action 挂画布本体（§L 口径）
 *   E. 真实手势留墨：tap / drag 后画布深色墨点像素计数增加
 *   F. hint 首次交互后淡出
 *   G. resize 后 backing 仍健康（resize burst 不闪坏）
 *   H. 零真实 JS 错误
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');

const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const WORK_FILE = path.join(__dirname, '..', '..', '..', 'works', 'hou.html');

async function bootHealthy(mobile, w, h, port, tag) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const usePort = port + attempt * 100;
    const profile = 'bl1009-' + tag + (attempt ? '-r' + attempt : '');
    await H.killAll(usePort);
    await H.waitMs(400);
    const s = await H.launch({
      out: OUT, profile, wsPath: WS, port: usePort, mobile,
      width: w, height: h,
    });
    await s.goto('file://' + encodeURI(WORK_FILE) + '?cb=' + Date.now());
    const probe = await s.waitFor(`(function(){
      var el=document.querySelector('#scene');
      if(!el)return false;
      var r=el.getBoundingClientRect();
      return r.width>100 && r.height>100 &&
             (document.readyState==='complete' || document.readyState==='interactive');
    })()`, { timeout: 9000 }).catch(() => null);
    if (probe) return s;
    await s.kill();
    await H.waitMs(700);
  }
  throw new Error('bootHealthy 失败 ' + tag);
}

/** 统计画布上「深色且不透明」的墨像素抽样数 */
async function inkCount(s) {
  return s.q(`(function(){
    var c=document.querySelector('#scene'), x=c.getContext('2d');
    var d=x.getImageData(0,0,c.width,c.height).data;
    var n=0;
    for(var i=0;i<d.length;i+=4*4){
      var r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
      if(a>60 && r<110 && g<105 && b<100) n++;
    }
    return n;
  })()`);
}

async function runOne(mobile, w, h, port, tag, gesture) {
  const s = await bootHealthy(mobile, w, h, port, tag);
  const R = { tag, view: tag, checks: {}, detail: {} };
  const cv = '#scene';

  // A/B backing
  R.checks.backingHealthy = await s.waitFor(`(function(){
      var el=document.querySelector(${JSON.stringify(cv)});
      var r=el.getBoundingClientRect();
      var dpr=Math.min(window.devicePixelRatio||1,2);
      return Math.abs(el.width-Math.round(r.width*dpr))<=3 &&
             Math.abs(el.height-Math.round(r.height*dpr))<=3;
  })()`, { timeout: 6000 }).catch(() => null) === true;
  R.detail.backing = await s.q(`(function(){var e=document.querySelector(${JSON.stringify(cv)});
    return {w:e.width,h:e.height,css:[Math.round(e.getBoundingClientRect().width),
      Math.round(e.getBoundingClientRect().height)]};})()`);

  // C geom
  const geom = await s.q(`(function(){
    var el=document.querySelector(${JSON.stringify(cv)});
    var r=el.getBoundingClientRect();
    var vw=(window.visualViewport&&window.visualViewport.width)||window.innerWidth;
    var vh=(window.visualViewport&&window.visualViewport.height)||window.innerHeight;
    return {w:Math.round(r.width),h:Math.round(r.height),vw:Math.round(vw),vh:Math.round(vh),
            overflowX: r.left < -1 || r.right > vw + 1,
            overflowY: r.top < -1 || r.bottom > vh + 1};
  })()`);
  R.detail.geom = geom;
  R.checks.noOverflow = !geom.overflowX && !geom.overflowY;

  // D touch-action
  const ta = await s.q(`getComputedStyle(document.querySelector(${JSON.stringify(cv)})).touchAction`);
  R.detail.touchAction = ta;
  R.checks.touchActionNone = ta === 'none';

  // E/F 手势留墨 + hint 淡出
  const before = await inkCount(s);
  if (gesture === 'drag') {
    // hou 的鼠标/触摸监听都挂在 canvas 本体（mouseup 在 window），harness.drag
    // 向画布派发合成 Pointer+Mouse 双序列，与本件监听目标一致。
    const pts = [[Math.round(geom.w*0.2), Math.round(geom.h*0.45)],
                 [Math.round(geom.w*0.4), Math.round(geom.h*0.5)],
                 [Math.round(geom.w*0.6), Math.round(geom.h*0.55)],
                 [Math.round(geom.w*0.8), Math.round(geom.h*0.48)]];
    await s.drag(cv, pts, mobile ? { pointerType: 'touch' } : {});
  } else {
    // 点三个位置
    for (const [fx, fy] of [[0.3,0.45],[0.5,0.55],[0.7,0.5]]) {
      await s.tap(cv, Math.round(geom.w*fx), Math.round(geom.h*fy),
        { holdMs: 60, mouse: true, touch: mobile });
      await H.waitMs(120);
    }
  }
  await H.waitMs(500);
  const after = await inkCount(s);
  R.detail.ink = { before, after, delta: after - before };
  R.checks.gestureInks = after > before;

  // hint transition:opacity 1s ease——交互后 opacity 置 0，需等过渡跑完再判，
  // 提前在 ~0.5s 读会落在 0.1 阈值附近（浏览器过渡曲线中后段）。等 1300ms 稳定。
  await H.waitMs(1300);

  const hintState = await s.q(`(function(){
    var h=document.getElementById('hint');
    return {opacity:getComputedStyle(h).opacity, display:getComputedStyle(h).display};
  })()`);
  R.detail.hint = hintState;
  R.checks.hintFades = parseFloat(hintState.opacity) < 0.1 || hintState.display === 'none';

  // G resize burst：移动档改 dpr 重放口径，桌面/移动统一改窗口后 backing 仍对齐
  await s.q(`(function(){
    for(var i=0;i<5;i++){ window.dispatchEvent(new Event('resize')); }
    return 1;
  })()`);
  await H.waitMs(400);
  R.checks.backingAfterResize = await s.q(`(function(){
      var el=document.querySelector(${JSON.stringify(cv)});
      var r=el.getBoundingClientRect();
      var dpr=Math.min(window.devicePixelRatio||1,2);
      return Math.abs(el.width-Math.round(r.width*dpr))<=3 &&
             Math.abs(el.height-Math.round(r.height*dpr))<=3;
  })()`) === true;

  const realErrors = await s.realErrors();
  R.realErrors = realErrors;
  R.checks.zeroErrors = realErrors.length === 0;
  R.pass = Object.values(R.checks).every(v => v === true);
  await s.shot('bl1009-' + tag);
  await s.kill();
  return R;
}

(async () => {
  const all = [];
  const cases = [
    { mobile: true,  w: 390, h: 844, tag: 'mobile',  gesture: 'tap',  port: 10801 },
    { mobile: false, w: 1280, h: 720, tag: 'desktop', gesture: 'drag', port: 10811 },
    { mobile: true,  w: 844, h: 390, tag: 'landscape', gesture: 'tap', port: 10821 },
  ];
  for (const c of cases) {
    const R = await runOne(c.mobile, c.w, c.h, c.port, c.tag, c.gesture);
    all.push(R);
    console.log(`${R.pass ? 'PASS' : 'FAIL'}  hou  ${R.view}  ` +
      Object.entries(R.checks).map(([k, v]) => `${k}=${v ? 1 : 0}`).join(' '));
  }
  fs.writeFileSync(path.join(OUT, 'baseline_1009_result.json'), JSON.stringify(all, null, 2));
  const nFail = all.filter(r => !r.pass).length;
  console.log(`\n${all.length - nFail}/${all.length} PASS`);
  if (nFail) console.log('FAIL detail: ' + JSON.stringify(all.filter(r => !r.pass).map(r => ({
    view: r.view, failed: Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k),
    realErrors: r.realErrors,
  })), null, 2));
  process.exit(nFail ? 1 : 0);
})();
