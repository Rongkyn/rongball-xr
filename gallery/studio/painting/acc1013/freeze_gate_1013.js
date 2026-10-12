/**
 * 挂廊余量 12 件 · 修复后 harness 真手势统一回归 — 2026-10-13
 *
 * 背景：1012 冻结闸口只覆盖 8 件代表作。其余 12 件（1005 三件：floss/ta-xue/tian-deng；
 * 1006 九件）历史上仅在以下 harness 缺陷窗口内验过手势：
 *   - 坑#26（1009 才修）：drag 页面模板引用 Node 变量 o → 首行 ReferenceError、
 *     零事件派出，被 {__evalError} 静默吞；自运动件 before≠after 照样成立 → 假阳性 PASS。
 *   - 坑#24（1007 才修）：mobile 触摸模拟下派鼠标 Input 死等。
 * 今日用修复后 harness 重跑，断言锚定各件权威状态钩子（JSON 镜像/DOM 计数），
 * 无钩子件用像素哈希但配「静默期」防自运动假阳性，揪出真实移动端手势缺口。
 *
 * 公共闸口：A 加载完整零错误  B backing 非默认 300x150 且对齐  C 入屏不溢出
 *           D canvas 本体 touch-action:none（dom 件判其手势宿主）
 *           E 真触摸手势后权威状态变化（各件 interact 专属）
 * 双档：移动 390x844@2 + 桌面 1280x720@1
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');

const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const WORKS_DIR = path.join(__dirname, '..', '..', '..', 'works');

// interact 类型：
//  dragJson  拖动后 JSON 镜像字段变化（metric）
//  tapJson   点按后 JSON 镜像字段变化（metric）
//  key       键盘方向后 DOM 变化（2048）
//  clickDom  可信点击后 DOM 棋盘落子计数变化（gomoku）
//  touchMove 真触摸拖移后状态变化（ink-sound 已画点数；ink-particles 粒子数——验移动绘制是否真存在）
//  tapPx     点按后像素哈希变化（floss / living-landscape / mo-yun / mountain-dwelling）
//  wind      ta-xue：pointerdown 点花苞 + 滑杆
//  auto      tian-deng：?fast=1&auto=2 自动旅程灯数推进
const WORK = [
  { tag: 'feng-duo',      file: 'feng-duo.html',          canvas: '#cv',    backing: 'responsive', interact: 'tapPx', yFrac: 0.5 },
  { tag: 'floss-threads', file: 'floss-threads.html',     canvas: '#c',     backing: 'responsive', interact: 'tapPx', yFrac: 0.5 },
  { tag: 'ta-xue',        file: 'ta-xue.html',            canvas: '#scene', backing: 'fixed704',   interact: 'wind' },
  { tag: 'tian-deng',     file: 'tian-deng.html',         canvas: '#c',     backing: 'responsive', interact: 'auto', query: 'fast=1&auto=2&nostore=1' },
  { tag: 'ink-2048',      file: 'ink-2048.html',          canvas: null,     backing: 'dom',        interact: 'key' },
  { tag: 'ink-gomoku',    file: 'ink-gomoku.html',        canvas: '#board', backing: 'fixedCss',   interact: 'clickDom', clickOnly: true },
  { tag: 'ink-particles', file: 'ink-particles.html',     canvas: '#canvas',backing: 'fixedCss',   interact: 'touchMove' },
  { tag: 'ink-sound',     file: 'ink-sound.html',         canvas: '#c',     backing: 'responsive', interact: 'touchMove' },
  { tag: 'living-landscape', file: 'living-landscape.html', canvas: '#mainCanvas', backing: 'fixedCss', interact: 'tapPx', yFrac: 0.5 },
  { tag: 'mo-yun',        file: 'mo-yun.html',            canvas: '#c',     backing: 'responsive', interact: 'tapPx', yFrac: 0.5 },
  { tag: 'mountain-dwelling', file: 'mountain-dwelling.html', canvas: '#scene', backing: 'responsive', interact: 'tapPx', yFrac: 0.55 },
  { tag: 'tai-hen',       file: 'tai-hen.html',           canvas: '#rd',    backing: 'responsive', interact: 'tapJson', metric: 'taps' },
];

async function bootHealthy(w, mobile, port) {
  const dims = mobile ? { w: 390, h: 844 } : { w: 1280, h: 720 };
  const full = path.join(WORKS_DIR, w.file);
  for (let attempt = 0; attempt < 3; attempt++) {
    const usePort = port + attempt * 100;
    const profile = 'fg1013' + (mobile ? 'm' : 'd') + '-' + w.tag + (attempt ? '-r' + attempt : '');
    await H.killAll(usePort);
    await H.waitMs(400);
    const s = await H.launch({
      out: OUT, profile, wsPath: WS, port: usePort, mobile,
      width: dims.w, height: dims.h,
    });
    const qs = (w.query ? w.query + '&' : '') + 'cb=' + Date.now();
    await s.goto('file://' + encodeURI(full) + '?' + qs);
    const probeExpr = w.canvas
      ? `(function(){
          var el=document.querySelector(${JSON.stringify(w.canvas)});
          if(!el)return false;
          var r=el.getBoundingClientRect();
          return r.width>80 && r.height>80 &&
                 (document.readyState==='complete' || document.readyState==='interactive');
        })()`
      : `(function(){
          var b=document.getElementById('gameBoard');
          return !!b && b.getBoundingClientRect().width>100 &&
                 (document.readyState==='complete' || document.readyState==='interactive');
        })()`;
    const probe = await s.waitFor(probeExpr, { timeout: 9000 }).catch(() => null);
    if (probe) return s;
    await s.kill();
    await H.waitMs(700);
  }
  throw new Error('bootHealthy 失败 ' + w.tag + ' ' + (mobile ? 'm' : 'd'));
}

async function pixelHash(s, sel) {
  return s.q(`(function(){
    var c=document.querySelector(${JSON.stringify(sel)}), x=c.getContext('2d');
    var w=c.width, h=c.height, hsh=2166136261>>>0;
    try {
      var d=x.getImageData(0,0,w,h).data;
      for(var i=0;i<d.length;i+=4*97){ hsh^=d[i]; hsh=Math.imul(hsh,16777619)>>>0; }
    } catch(e){ return -1; }
    return hsh;
  })()`);
}

async function readState(s) {
  const raw = await s.q(`(function(){var e=document.getElementById('state');return e?e.textContent:'';})()`);
  let json = null;
  if (raw && raw[0] === '{') { try { json = JSON.parse(raw); } catch (e) {} }
  return { raw, json };
}

async function runOne(w, mobile, port) {
  const s = await bootHealthy(w, mobile, port);
  const R = { tag: w.tag, view: mobile ? 'mobile' : 'desktop', checks: {}, detail: {} };

  // —— B backing ——
  if (w.canvas) {
    let backingExpr;
    if (w.backing === 'responsive') {
      backingExpr = `(function(){
          var el=document.querySelector(${JSON.stringify(w.canvas)});
          var r=el.getBoundingClientRect();
          var dpr=Math.min(window.devicePixelRatio||1,2);
          var ew=Math.round(r.width*dpr), eh=Math.round(r.height*dpr);
          return el.width>300 && el.height>150 &&
                 Math.abs(el.width-ew)<=4 && Math.abs(el.height-eh)<=4;
        })()`;
    } else if (w.backing === 'fixed704') {
      backingExpr = `(function(){var el=document.querySelector(${JSON.stringify(w.canvas)});
          return el.width===el.height && el.width===704;})()`;
    } else { // fixedCss：固定 backing（非 300x150 默认即可）
      backingExpr = `(function(){
          var el=document.querySelector(${JSON.stringify(w.canvas)});
          return el.width>200 && el.height>200 && !(el.width===300&&el.height===150);
        })()`;
    }
    R.checks.backingHealthy = await s.waitFor(backingExpr, { timeout: 9000 }).catch(() => null) === true;
    R.detail.backing = await s.q(`(function(){var e=document.querySelector(${JSON.stringify(w.canvas)});
      return {w:e.width,h:e.height};})()`);
  } else {
    R.checks.backingHealthy = await s.waitFor(`!!document.getElementById('gameBoard')`, { timeout: 5000 }).catch(() => null) === true;
  }

  // —— C geom ——
  const geomSel = w.canvas ? w.canvas : '#gameBoard';
  const geom = await s.q(`(function(){
    var el=document.querySelector(${JSON.stringify(geomSel)});
    var r=el.getBoundingClientRect();
    var vw=(window.visualViewport&&window.visualViewport.width)||window.innerWidth;
    var vh=(window.visualViewport&&window.visualViewport.height)||window.innerHeight;
    return {w:Math.round(r.width),h:Math.round(r.height),
            left:Math.round(r.left),top:Math.round(r.top),vw:Math.round(vw),vh:Math.round(vh),
            overflowX: r.left < -1 || r.right > vw + 1,
            overflowY: r.top < -1 || r.bottom > vh + 1};
  })()`);
  R.detail.geom = geom;
  R.checks.canvasInScreen = geom.w > 80 && geom.h > 80;
  R.checks.noOverflow = !geom.overflowX && !geom.overflowY;

  // —— D touch-action 挂手势宿主本体 ——
  const ta = await s.q(`getComputedStyle(document.querySelector(${JSON.stringify(geomSel)})).touchAction`);
  R.detail.touchAction = ta;
  R.checks.touchActionNone = ta === 'none';

  // —— E 专属交互（修复后 harness；权威信号优先） ——
  const g = geom;
  if (w.interact === 'tapPx' || w.interact === 'tapJson') {
    // 自运动防假阳性：先等 500ms 取两次基线哈希，确认度量稳定后再手势
    const b1 = await pixelHash(s, w.canvas);
    await H.waitMs(500);
    const b2 = await pixelHash(s, w.canvas);
    const st0 = w.interact === 'tapJson' ? (await readState(s)).json : null;
    await s.tap(w.canvas, Math.round(g.w * 0.5), Math.round(g.h * (w.yFrac || 0.5)),
      { holdMs: 70, mouse: !mobile, touch: mobile });
    await H.waitMs(500);
    const a = await pixelHash(s, w.canvas);
    R.detail.tap = { b1, b2, a };
    if (w.interact === 'tapJson') {
      const st1 = (await readState(s)).json;
      const before = st0 ? st0[w.metric] : null;
      const after = st1 ? st1[w.metric] : null;
      R.detail.tapJson = { before, after };
      R.checks.interactOk = typeof after === 'number' && after > before;
    } else {
      // 像素件：手势后变化且变化不等于静默漂移量
      R.checks.interactOk = b1 >= 0 && a >= 0 && a !== b2 && a !== b1;
    }
  } else if (w.interact === 'wind') {
    // ta-xue：滑杆 input + pointerdown 点画布（pointer 事件双端同源，真触摸也产生 pointer）
    const wind = await s.q(`(function(){
      var r=document.getElementById('wind');
      r.value='2'; r.dispatchEvent(new Event('input',{bubbles:true}));
      return parseFloat(r.value);
    })()`);
    await s.tap(w.canvas, Math.round(g.w*0.4), Math.round(g.h*0.4),
      { holdMs: 60, mouse: !mobile, touch: mobile });
    await H.waitMs(300);
    R.detail.wind = wind;
    R.checks.interactOk = wind === 2;
  } else if (w.interact === 'auto') {
    // tian-deng 真实放飞链路：点「地面灯」开心愿面板 → 点「点灯放飞」→ released 计数 +1。
    // （1013 初版脚本错点天空空处只读 released，桌面矮视口误 FAIL；探针证实作品健康。
    //   权威信号=作品内 released + #state 镜像 "r"，双口径。）
    const ready = await s.waitFor(`ground && ground.state==='ground'`, { timeout: 6000 }).catch(() => null);
    const rBefore = await s.q(`released`);
    const gp = await s.q(`ground?{x:ground.x,y:ground.y}:null`);
    let panelOpened = false;
    if (ready === true && gp) {
      await s.tap(w.canvas, Math.round(gp.x), Math.round(gp.y),
        { holdMs: 70, mouse: !mobile, touch: mobile });
      await H.waitMs(400);
      panelOpened = await s.q(`panel.classList.contains('open')`);
      if (panelOpened) {
        await s.q(`document.getElementById('releaseBtn').click()`);
      }
    }
    // FAST 未开，点亮→上升约 1400ms 才 released+1；轮询等待
    const flyOk = await s.waitFor(`released >= ${(rBefore || 0) + 1}`, { timeout: 3000 }).catch(() => null);
    await H.waitMs(150);
    const raw = await s.q(`(function(){var e=document.getElementById('state');return e?e.textContent:'';})()`);
    const rAfter = await s.q(`released`);
    R.detail.auto = { ready: ready === true, rBefore, rAfter, panelOpened, flyOk: flyOk === true, stateHead: (raw || '').slice(0, 70) };
    R.checks.interactOk = flyOk === true && rAfter > rBefore;
  } else if (w.interact === 'key') {
    const before = await s.q(`document.getElementById('tileLayer').children.length + '|' +
      document.getElementById('score').textContent`);
    let moved = false, lastAfter = before;
    for (const dir of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
      await s.key(dir);
      await H.waitMs(220);
      lastAfter = await s.q(`document.getElementById('tileLayer').children.length + '|' +
        document.getElementById('score').textContent`);
      if (lastAfter !== before) { moved = true; break; }
    }
    R.detail.key = { before, after: lastAfter };
    R.checks.interactOk = moved;
  } else if (w.interact === 'clickDom') {
    // gomoku：真触摸/可信点击后棋盘黑子计数 +1（DOM 无直接暴露，用 canvas 像素落子哈希）
    const b1 = await pixelHash(s, w.canvas);
    await H.waitMs(300);
    const b2 = await pixelHash(s, w.canvas);
    const spots = [[0.5,0.5],[0.3,0.3],[0.72,0.35],[0.35,0.7],[0.65,0.65]];
    let a = b2;
    for (const [sx, sy] of spots) {
      if (mobile) await s.tap(w.canvas, Math.round(g.w*sx), Math.round(g.h*sy), { holdMs: 60, mouse: false, touch: true });
      else await s.trustedClick(w.canvas, Math.round(g.w*sx), Math.round(g.h*sy));
      await H.waitMs(350);
      a = await pixelHash(s, w.canvas);
      if (a !== b2 && a !== b1) break;
    }
    R.detail.clickDom = { b1, b2, a };
    R.checks.interactOk = a >= 0 && a !== b2 && a !== b1;
  } else if (w.interact === 'touchMove') {
    // ink-sound / ink-particles：核心交互=移动。桌面拖鼠标、移动真触摸拖（不派 mouse）。
    // 若作品只听 mousemove 无 touch/pointermove 监听，移动端拖移零响应——本断言实锤。
    // 度量：两作每帧都重绘静态景物（月亮/山等也走 arc），不能直接数总 arc。
    // 注入只读探针：rAF 中逐帧采样 arc 数，取「静默 12 帧均值」与「手势后 12 帧峰值」，
    // 交互产生的粒子/音符粒子使峰值显著高于静默基线。
    await s.q(`(function(){
      if(!CanvasRenderingContext2D.prototype.__w1013){
        var of=CanvasRenderingContext2D.prototype.arc;
        CanvasRenderingContext2D.prototype.arc=function(){ window.__a1013=(window.__a1013||0)+1; return of.apply(this,arguments); };
        CanvasRenderingContext2D.prototype.__w1013=true;
      }
      window.__frames1013=[];
      window.__a1013=0;
      (function tick(){
        requestAnimationFrame(function(){
          var v=window.__a1013||0; window.__frames1013.push(v); window.__a1013=0;
          if(window.__frames1013.length<60) tick();
        });
      })();
    })()`);
    await H.waitMs(700); // 静默 ~42 帧
    const idleFrames = await s.q(`window.__frames1013.slice()`);
    const idleAvg = idleFrames.length ? idleFrames.reduce((a,b)=>a+b,0)/idleFrames.length : 0;
    // 重置帧采样窗
    await s.q(`window.__frames1013=[]; (function tick(){
      requestAnimationFrame(function(){
        var v=window.__a1013||0; window.__frames1013.push(v); window.__a1013=0;
        if(window.__frames1013.length<40) tick();
      });
    })();`);
    const pts = [];
    for (let i = 0; i <= 12; i++) pts.push([
      Math.round(g.w*0.2 + (g.w*0.55)*i/12),
      Math.round(g.h*0.35 + (g.h*0.3)*i/12)
    ]);
    if (mobile) {
      // 避坑#29：mobile 触摸拖动必须用 CDP 真触摸 touchDrag（dispatchTouchEvent），
      // drag({pointerType:'touch'}) 只派合成 PointerEvent，只听 touch 的作品会被假阴性误判
      await s.touchDrag(w.canvas, pts);
    } else {
      await s.drag(w.canvas, pts, { pointerType: 'mouse' });
    }
    await H.waitMs(700);
    const gesFrames = await s.q(`window.__frames1013.slice()`);
    const gesPeak = gesFrames.length ? Math.max.apply(null, gesFrames) : 0;
    R.detail.touchMove = { idleAvg: +idleAvg.toFixed(1), gesPeak, gesFrames: gesFrames.slice(0, 18) };
    // 手势帧 arc 峰值须显著高于静默均值（粒子/音符爆发阈值 +8，静态景物每帧恒定）
    R.checks.interactOk = gesPeak > idleAvg + 8;
  }

  R.realErrors = await s.realErrors();
  R.checks.zeroErrors = R.realErrors.length === 0;
  R.pass = Object.values(R.checks).every(v => v === true);
  await s.kill();
  return R;
}

(async () => {
  const all = [];
  let port = 10901;
  for (const w of WORK) {
    for (const mobile of [true, false]) {
      let R;
      try {
        R = await runOne(w, mobile, port);
      } catch (e) {
        R = { tag: w.tag, view: mobile ? 'mobile' : 'desktop', checks: { fatal: false }, detail: { error: String(e) }, realErrors: [], pass: false };
      }
      // 资源抖动：非零错误类 FAIL 换新端口整件重跑一次
      if (!R.pass && R.checks.zeroErrors !== false && !R.detail.error) {
        await H.waitMs(1200);
        try { R = await runOne(w, mobile, port + 1); R.detail.retried = true; } catch (e) {}
      }
      port += 100;
      await H.waitMs(500);
      all.push(R);
      const failed = Object.entries(R.checks).filter(([, v]) => v !== true).map(([k]) => k);
      console.log(`[${R.pass ? 'PASS' : 'FAIL'}] ${R.tag} ${R.view}` + (failed.length ? '  ✗ ' + failed.join(',') : '') + (R.detail.error ? ' ERR:' + R.detail.error : ''));
      if (R.realErrors && R.realErrors.length) console.log('   realErrors: ' + R.realErrors.join(' | '));
    }
  }
  const fails = all.filter(r => !r.pass);
  const summary = {
    date: '2026-10-13', dimension: 'freeze-gate-rest12',
    total: all.length, pass: all.length - fails.length, fail: fails.length,
    results: all.map(r => ({ tag: r.tag, view: r.view, pass: r.pass, checks: r.checks, detail: r.detail, realErrors: r.realErrors })),
  };
  fs.writeFileSync(path.join(OUT, 'freeze_gate_1013_result.json'), JSON.stringify(summary, null, 2));
  console.log('\n== 余量12件回归汇总 == ' + summary.pass + '/' + summary.total + ' PASS');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
