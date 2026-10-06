/**
 * 挂廊其余 9 件旧作健康冒烟 — 2026-10-06
 *
 * 背景：8 件作品集候选 1004 冻结闸口 16/16 PASS、绒丝/踏雪/天灯 1005 补体检 6/6 PASS，
 * 待审队列仍 5 件超闸（需 ≤2）→ 不开新件。挂廊 20 件中其余 9 件从未做过
 * 统一双端健康核验，今日按优先级③+④补：加载/backing/入屏/touch-action/交互/零错误。
 *
 * 公共检查（双档：移动 390x844@2 + 桌面 1280x720@1）：
 *   A. 加载完整/可用，零真实 JS 错误
 *   B. 主画布 backing 已初始化（非默认 300x150）
 *      - responsive：backing ≈ css × min(dpr,2)
 *      - fixed：固定 backing（gomoku 固定方盘 / dom 件无画布）
 *   C. 画布入屏不溢出 visualViewport
 *   D. touch-action 挂画布本体（body 上的不算，见 POOL §L）
 *   E. 作品专属交互：tap 后像素哈希变化 / 键盘移动后网格变化
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');

const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const WORKS_DIR = path.join(__dirname, '..', '..', '..', 'works');

const WORK = [
  { tag: 'feng-duo', file: 'feng-duo.html', canvas: '#cv', backing: 'responsive', interact: 'tap', yFrac: 0.5 },
  { tag: 'ink-2048', file: 'ink-2048.html', canvas: null, backing: 'dom', interact: 'key2048' },
  { tag: 'ink-gomoku', file: 'ink-gomoku.html', canvas: '#board', backing: 'fixed', interact: 'tap', clickOnly: true },
  { tag: 'ink-particles', file: 'ink-particles.html', canvas: '#canvas', backing: 'fixedcss', interact: 'drag' },
  { tag: 'ink-sound', file: 'ink-sound.html', canvas: '#c', backing: 'responsive', interact: 'tap', yFrac: 0.5 },
  { tag: 'living-landscape', file: 'living-landscape.html', canvas: '#mainCanvas', backing: 'fixedcss', interact: 'tap', yFrac: 0.5 },
  { tag: 'mo-yun', file: 'mo-yun.html', canvas: '#c', backing: 'responsive', interact: 'tap', yFrac: 0.5 },
  { tag: 'mountain-dwelling', file: 'mountain-dwelling.html', canvas: '#scene', backing: 'responsive', interact: 'tap', yFrac: 0.5 },
  { tag: 'tai-hen', file: 'tai-hen.html', canvas: '#rd', backing: 'responsive', interact: 'tap', yFrac: 0.5 },
];

async function bootHealthy(w, mobile, port) {
  const dims = mobile ? { w: 390, h: 844 } : { w: 1280, h: 720 };
  const full = path.join(WORKS_DIR, w.file);
  for (let attempt = 0; attempt < 3; attempt++) {
    const usePort = port + attempt * 100;
    const profile = 'sm1006' + (mobile ? 'm' : 'd') + '-' + w.tag + (attempt ? '-r' + attempt : '');
    await H.killAll(usePort);
    await H.waitMs(400);
    const s = await H.launch({
      out: OUT, profile, wsPath: WS, port: usePort, mobile,
      width: dims.w, height: dims.h,
    });
    await s.goto('file://' + encodeURI(full) + '?cb=' + Date.now());
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
  throw new Error('bootHealthy 失败 ' + w.tag);
}

async function pixelHash(s, sel) {
  return s.q(`(function(){
    var c=document.querySelector(${JSON.stringify(sel)}), x=c.getContext('2d');
    var w=c.width, h=c.height, n=0, hsh=2166136261>>>0;
    try {
      var d=x.getImageData(0,0,w,h).data;
      for(var i=0;i<d.length;i+=4*97){ hsh^=d[i]; hsh=Math.imul(hsh,16777619)>>>0; n++; }
    } catch(e){ return -1; }
    return hsh;
  })()`);
}

async function runOne(w, mobile, port) {
  const s = await bootHealthy(w, mobile, port);
  const R = { tag: w.tag, view: mobile ? 'mobile' : 'desktop', checks: {}, detail: {} };

  // B backing
  if (w.canvas) {
    const backingExpr = w.backing === 'responsive'
      ? `(function(){
          var el=document.querySelector(${JSON.stringify(w.canvas)});
          var r=el.getBoundingClientRect();
          var dpr=Math.min(window.devicePixelRatio||1,2);
          var ew=Math.round(r.width*dpr), eh=Math.round(r.height*dpr);
          return el.width>300 && el.height>150 &&
                 Math.abs(el.width-ew)<=4 && Math.abs(el.height-eh)<=4;
        })()`
      : `(function(){
          var el=document.querySelector(${JSON.stringify(w.canvas)});
          return el.width>200 && el.height>200 && !(el.width===300&&el.height===150);
        })()`;
    R.checks.backingHealthy = await s.waitFor(backingExpr, { timeout: 9000 }).catch(() => null) === true;
    R.detail.backing = await s.q(`(function(){var e=document.querySelector(${JSON.stringify(w.canvas)});
      return {w:e.width,h:e.height};})()`);
  } else {
    const domReady = await s.waitFor(`!!document.getElementById('gameBoard')`, { timeout: 5000 }).catch(() => null);
    R.checks.backingHealthy = domReady === true;
  }

  // C geom
  if (w.canvas) {
    const geom = await s.q(`(function(){
      var el=document.querySelector(${JSON.stringify(w.canvas)});
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
  } else {
    const geom = await s.q(`(function(){
      var el=document.getElementById('gameBoard');
      var r=el.getBoundingClientRect();
      var vw=(window.visualViewport&&window.visualViewport.width)||window.innerWidth;
      var vh=(window.visualViewport&&window.visualViewport.height)||window.innerHeight;
      return {w:Math.round(r.width),h:Math.round(r.height),
              left:Math.round(r.left),top:Math.round(r.top),
              overflowX: r.left < -1 || r.right > vw + 1,
              overflowY: r.top < -1 || r.bottom > vh + 1};
    })()`);
    R.detail.geom = geom;
    R.checks.canvasInScreen = geom.w > 100;
    R.checks.noOverflow = !geom.overflowX && !geom.overflowY;
  }

  // D touch-action on canvas itself
  if (w.canvas) {
    const ta = await s.q(`getComputedStyle(document.querySelector(${JSON.stringify(w.canvas)})).touchAction`);
    R.detail.touchAction = ta;
    R.checks.touchActionNone = ta === 'none';
  } else {
    // 2048：touchmove 已 preventDefault，手势挂 #gameBoard
    const ta = await s.q(`getComputedStyle(document.getElementById('gameBoard')).touchAction`);
    R.detail.touchAction = ta;
    R.checks.touchActionNone = ta === 'none';
  }

  // E 专属交互
  if (w.interact === 'tap') {
    const g = R.detail.geom;
    const fx = Math.round(g.w * 0.5), fy = Math.round(g.h * (w.yFrac || 0.5));
    const before = await pixelHash(s, w.canvas);
    // click-only 作品：合成 mousedown/up 不产生 click → CDP 可信点击
    if (w.clickOnly) await s.trustedClick(w.canvas, fx, fy);
    else await s.tap(w.canvas, fx, fy, { holdMs: 50, mouse: true, touch: mobile });
    await H.waitMs(450);
    let after = await pixelHash(s, w.canvas);
    // 落子未变（资源抖动/首子点恰被动画覆盖）：换 3 个不同交点补击
    if (w.clickOnly && after === before) {
      const spots = [[0.3,0.3],[0.72,0.35],[0.35,0.7]];
      for (const [sx,sy] of spots) {
        await s.trustedClick(w.canvas, Math.round(g.w*sx), Math.round(g.h*sy));
        await H.waitMs(350);
        after = await pixelHash(s, w.canvas);
        if (after !== before) break;
      }
    }
    R.detail.tap = { before, after };
    R.checks.interactOk = before >= 0 && after >= 0 && after !== before;
  } else if (w.interact === 'drag') {
    const g = R.detail.geom;
    const before = await pixelHash(s, w.canvas);
    const m = Math.min(g.w, g.h);
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push([
      Math.round(g.w*0.2 + (g.w*0.5)*i/10),
      Math.round(g.h*0.3 + (g.h*0.3)*i/10)
    ]);
    await s.drag(w.canvas, pts, { pointerType: mobile ? 'touch' : 'mouse' });
    await H.waitMs(300);
    let after = await pixelHash(s, w.canvas);
    // 资源压力抖动时合成拖动可能丢失 → 换条路径重试；desktop 再补 CDP 真实鼠标拖动
    if (after === before) {
      const pts2 = [];
      for (let i = 0; i <= 12; i++) pts2.push([
        Math.round(g.w*0.15 + (g.w*0.7)*i/12),
        Math.round(g.h*0.6 - (g.h*0.35)*i/12)
      ]);
      await s.drag(w.canvas, pts2, { pointerType: mobile ? 'touch' : 'mouse' });
      await H.waitMs(300);
      after = await pixelHash(s, w.canvas);
    }
    if (!mobile && after === before) {
      for (let i = 0; i <= 12; i++) {
        const xx = Math.round(g.w*0.2 + (g.w*0.6)*i/12);
        const yy = Math.round(g.h*0.75 - (g.h*0.5)*i/12);
        const t = i===0 ? 'mousePressed' : 'mouseMoved';
        await s.send('Input.dispatchMouseEvent', i===0
          ? {type:t,x:xx,y:yy,button:'left',clickCount:1}
          : {type:t,x:xx,y:yy,buttons:1});
      }
      await s.send('Input.dispatchMouseEvent',{type:'mouseReleased',
        x:Math.round(g.w*0.8),y:Math.round(g.h*0.25),button:'left',clickCount:1});
      await H.waitMs(300);
      after = await pixelHash(s, w.canvas);
    }
    R.detail.drag = { before, after };
    R.checks.interactOk = before >= 0 && after >= 0 && after !== before;
  } else if (w.interact === 'key2048') {
    // 空盘初始两子位置随机，单次方向键可能无可移动 → 依次试四个方向直到变化。
    // 必须用 s.key()（CDP 真实按键）：合成 KeyboardEvent 在 window 派发不经过 document 监听（避坑#23）。
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
    R.detail.key2048 = { before, after: lastAfter };
    R.checks.interactOk = moved;
  }

  const realErrors = await s.realErrors();
  R.realErrors = realErrors;
  R.checks.zeroErrors = realErrors.length === 0;
  R.pass = Object.values(R.checks).every(v => v === true);
  await s.kill();
  return R;
}

(async () => {
  const all = [];
  let port = 10801;
  for (const w of WORK) {
    for (const mobile of [true, false]) {
      let R = await runOne(w, mobile, port);
      // 资源压力抖动（连开 18 chrome，backingHealthy/interactOk 偶发丢失）：失败时换新 profile 整件重跑一次。
      // zeroErrors 失败不重跑（那是真实代码错误，重跑会掩盖）
      if (!R.pass && R.checks.zeroErrors !== false) {
        R.detail.retried = true;
        await H.waitMs(1200);
        R = await runOne(w, mobile, port + 1);
      }
      port += 100;
      await H.waitMs(500); // 1007: 箱内内存紧，案例间冷却降 Chrome 连开压力（ECONNREFUSED 防 flake）
      all.push(R);
      console.log(`${R.pass ? 'PASS' : 'FAIL'}  ${R.tag}  ${R.view}  ` +
        Object.entries(R.checks).map(([k, v]) => `${k}=${v ? 1 : 0}`).join(' '));
    }
  }
  fs.writeFileSync(path.join(OUT, 'smoke_1006_result.json'), JSON.stringify(all, null, 2));
  const nFail = all.filter(r => !r.pass).length;
  console.log(`\n${all.length - nFail}/${all.length} PASS`);
  process.exit(nFail ? 1 : 0);
})();
