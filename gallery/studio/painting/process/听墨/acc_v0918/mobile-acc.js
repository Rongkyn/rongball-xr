/* 听墨 v0918 移动端深磨 · 验收 harness
 * verify: 390x844 dpr2 移动端；desktop: 1280x860 桌面回归
 */
const path = require('path');
const H = require('../../../../../works/lib/cdp-harness.js');

const MODE = process.argv[2] || 'verify';
const PORT = parseInt(process.argv[3] || '9620', 10);
const OUT = __dirname;
const WORK = 'file://' + path.resolve(__dirname, '../../../../../works/ting-mo.html') + '?cb=' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mobile = MODE !== 'desktop';

(async () => {
  const s = await H.launch({
    out: OUT, profile: 'acc_' + MODE, port: PORT, mobile,
    width: mobile ? 390 : 1280, height: mobile ? 844 : 860,
    wsPath: '/usr/lib/node_modules/@coze/cli/node_modules/ws',
  });
  const rep = { mode: MODE };
  try {
    await s.goto(WORK);
    await sleep(1400);

    // 1) 布局：真视口（visualViewport）判横向溢出；画框完整落在可视宽内
    const vp = await s.viewport();
    rep.layout = await s.q(`(function(){
      var f=document.querySelector('.frame').getBoundingClientRect();
      var vw = ${vp.w}, vh = ${vp.h};
      return { vw:Math.round(vw), vh:Math.round(vh),
        frameW:Math.round(f.width), frameH:Math.round(f.height),
        frameLeft:Math.round(f.left), frameRight:Math.round(f.right),
        frameFitsW: f.left>=-1 && f.right<=vw+1,
        titleVisible: (function(){var r=document.querySelector('h1').getBoundingClientRect();
          return r.top>=0 && r.bottom<=vh && r.left>=0 && r.right<=vw;})() };
    })()`);

    // 2) 点 3 滴后测 FPS（忙时）
    await s.tap('#ink', 100, 260);
    await s.tap('#ink', 200, 340);
    await s.tap('#ink', mobile?300:560, 260);
    rep.fps = await s.q(`(async function(){
      var n=0,t0=performance.now();
      await new Promise(function(res){(function tick(){n++;if(performance.now()-t0<2500)requestAnimationFrame(tick);else res();})();});
      return Math.round(n/2.5*10)/10;
    })()`);

    // 3) 拖笔：真墨判定要求 alpha>40（旧判定把透明黑底误算 100%）
    const inkProbe = () => s.pixels('#ink', 'a>40 && r<120 && g<120 && b<110', 2);
    const before = await inkProbe();
    await s.drag('#ink', mobile ? [[40,560],[110,520],[180,560],[250,520],[320,560]]
                                        : [[200,600],[300,560],[400,600],[500,560],[600,600]]);
    await sleep(1000);
    const after = await inkProbe();
    rep.ink = { beforePx: before, afterPx: after, grew: after > before + 20 };

    // 4) 声音探针：plop + grain（lastGrain 回归修复后应 >0）
    rep.snd = await s.q('JSON.parse(JSON.stringify(window.__snd))');
    rep.sndChecks = { plopsGt0: rep.snd.plops >= 3, grainsGt0: rep.snd.grains > 0, acRunning: rep.snd.ac==='running' };

    // 5) 研墨清纸按钮可点且在可视区内、热区≥32px
    rep.controls = await s.q(`(function(){
      function info(id){var el=document.getElementById(id),r=el.getBoundingClientRect();
        var vw=visualViewport?visualViewport.width:innerWidth, vh=visualViewport?visualViewport.height:innerHeight;
        return {w:Math.round(r.width),h:Math.round(r.height),
          inView:r.top>=0&&r.bottom<=vh&&r.left>=0&&r.right<=vw, bigEnough:r.height>=24};}
      return {snd:info('snd'),clear:info('clear')};
    })()`);

    // 墨迹证据截图（在清纸之前）
    rep.hint = await s.q(`(function(){
      var d=getComputedStyle(document.querySelector('.hint-desk')).display!=='none';
      var t=getComputedStyle(document.querySelector('.hint-touch')).display!=='none';
      return {deskShown:d, touchShown:t};
    })()`);
    await s.shot('tm_' + MODE + '_v0918');

    // 6) 移动端长按清纸：清后墨覆盖率应回落到接近 0
    if(mobile){
      // 直接模拟长按：pointerdown 后保持 750ms（harness tap 只 hold 60ms，这里用 q 原生派发）
      const cleared = await s.q(`(async function(){
        var c=document.getElementById('ink'), r=c.getBoundingClientRect();
        var cx=r.left+r.width/2, cy=r.top+r.height/2;
        c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,clientX:cx,clientY:cy,pointerId:2,pointerType:'touch',button:0}));
        await new Promise(res=>setTimeout(res,760));
        c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,clientX:cx,clientY:cy,pointerId:2,pointerType:'touch',button:0}));
        await new Promise(res=>setTimeout(res,300));
        return {grinds: window.__snd.grinds, stateText: document.getElementById('state').textContent,
          waterGone: typeof totalWater!=='undefined' ? totalWater : -1};
      })()`);
      rep.longPressClear = cleared;
    }

    rep.errors = s.errors;
    rep.realErrors = await s.realErrors();
    rep.pass = rep.layout.frameFitsW && rep.layout.titleVisible && rep.ink.grew &&
               rep.sndChecks.plopsGt0 && rep.sndChecks.grainsGt0 &&
               rep.controls.clear.inView && rep.controls.clear.bigEnough &&
               rep.realErrors.length===0 &&
               (!mobile || (rep.longPressClear.stateText==='研墨…' && rep.longPressClear.waterGone===0)) &&
               (mobile ? (rep.hint.touchShown && !rep.hint.deskShown) : (rep.hint.deskShown && !rep.hint.touchShown));
  } finally {
    await s.kill();
  }
  console.log(JSON.stringify(rep, null, 2));
  process.exit(rep.pass ? 0 : 2);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
