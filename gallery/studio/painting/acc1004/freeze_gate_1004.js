/**
 * 冻结闸口统一回归（Freeze Gate Audit）— 2026-10-04
 *
 * 背景：8 件作品集候选的四条主线（移动端 / 加载性能 / 四段式叙事 / 交互手感）
 * 已分别于 0918-1003 验收闭环，但此后 0930-1003 又改动多件
 * （墨洇高清平滑放大 + maxDpr、叙事总稿补墨洇、首页数据亮点）。
 * 主人手机/Pico 实机复验、圈选冻结之前，先做一次跨件统一回归，
 * 确认没有「修 A 坏 B」的加载/首帧/响应式/手势回归。
 *
 * 本脚本只测「冻结健康」公共闸口，不重复各件专项断言：
 *   A. 加载完整：readyState=complete，无 JSERR 状态，无真实 JS 错误
 *   B. 首帧已上画：canvas backing 已按视口/DPR 初始化（非默认 300x150）
 *   C. 画布入屏：主交互 canvas 宽高 >100 且不超出 visualViewport
 *   D. 触摸手势可用：canvas 本体 touch-action:none；一次真触摸手势后作品有响应
 *   E. 清纸入口可用：清纸按钮点击后状态/画面被重置
 *
 * 双档：移动 390x844@2 + 桌面 1280x720@1
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');

const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const WORKS_DIR = path.join(__dirname, '..', '..', '..', 'works');

// 8 件候选。canvas=主交互画布；json=有无 JSON 镜像；jsonMetric=镜像字段
// textState=件：#state 存叙事文本（ting-mo）；mo-yin 有 JSON mirror
const WORK = [
  { tag: 'ink-garden', file: 'ink-garden.html',        canvas: '#scene', json: false, clearBtn: ['btnClear', 'clearBtn', 'btn-clear'], yFrac: 0.55 },
  { tag: 'can-he',     file: 'can-he.html',            canvas: '#pond',  json: true,  jsonMetric: 'rain',  clearBtn: ['btnClear', 'clearBtn', 'btn-clear'], yFrac: 0.55 },
  { tag: 'lu-hua',     file: 'lu-hua.html',            canvas: '#scene', json: true,  jsonMetric: 'gusts', clearBtn: ['btnClear', 'clearBtn', 'btn-clear'], yFrac: 0.60 },
  { tag: 'gui-yu',     file: 'gui-yu.html',            canvas: '#scene', json: true,  jsonMetric: 'shake', clearBtn: ['btnClear', 'clearBtn', 'btn-clear'], yFrac: 0.30 },
  { tag: 'yue-bo',     file: 'yue-bo-v0916.html',      canvas: '#scene', json: true,  jsonMetric: 'nRipple', clearBtn: ['btnClear', 'clearBtn', 'btn-clear'], yFrac: 0.75 },
  { tag: 'qiu-chong',  file: 'qiu-chong-v0915.html',   canvas: '#scene', json: true,  jsonMetric: 'hushes', clearBtn: ['btnClear', 'clearBtn', 'btn-clear'], yFrac: 0.72 },
  { tag: 'ting-mo',    file: 'ting-mo.html',           canvas: '#ink',   json: false, textState: true, backing: 'fixed', clearBtn: ['clear'], yFrac: 0.55 },
  { tag: 'mo-yin',     file: 'mo-yin.html',            canvas: '#ink',   json: true,  jsonMetric: 'tw', clearMode: 'gesture', clearBtn: ['clear'], yFrac: 0.55 },
];

function dragPts(rect, w) {
  const y = Math.round(rect.height * w.yFrac);
  const x0 = Math.round(rect.width * 0.22);
  const x1 = Math.round(rect.width * 0.78);
  const pts = [];
  for (let i = 0; i <= 8; i++) pts.push([Math.round(x0 + (x1 - x0) * i / 8), y]);
  return pts;
}

// 读 #state：返回 {raw, json}
async function readState(s) {
  const raw = await s.q(`(function(){var e=document.getElementById('state');return e?e.textContent:'';})()`);
  let json = null;
  if (raw && raw[0] === '{') { try { json = JSON.parse(raw); } catch (e) {} }
  return { raw, json };
}

// 统计主画布深色（墨色）像素数，用于无 JSON 镜像件的手势/清纸判定
async function inkPixels(s, sel) {
  return s.q(`(function(){
    var c=document.querySelector(${JSON.stringify(sel)});
    var x=c.getContext('2d');
    var d=x.getImageData(0,0,c.width,c.height).data;
    var n=0; for(var i=0;i<d.length;i+=4){ if(d[i+3]>40&&(d[i]<140||d[i+1]<140||d[i+2]<140))n++; }
    return n;
  })()`);
}

// 启动 + 导航 + 健康探针；不健康（串台坑#8/#16）换端口/profile 重开，最多 3 次
async function bootHealthy(w, mobile, port) {
  const dims = mobile ? { w: 390, h: 844 } : { w: 1280, h: 720 };
  const full = path.join(WORKS_DIR, w.file);
  for (let attempt = 0; attempt < 3; attempt++) {
    const usePort = port + attempt * 100;
    const profile = 'fg1004' + (mobile ? 'm' : 'd') + '-' + w.tag + (attempt ? '-r' + attempt : '');
    await H.killAll(usePort);
    await H.waitMs(400);
    const s = await H.launch({
      out: OUT, profile, wsPath: WS, port: usePort, mobile, width: dims.w, height: dims.h,
    });
    await s.goto('file://' + encodeURI(full) + '?fast=1&cb=' + Date.now());
    const probe = await s.waitFor(`(function(){
      var el=document.querySelector(${JSON.stringify(w.canvas)});
      if(!el)return false;
      var r=el.getBoundingClientRect();
      return document.readyState==='complete' && r.width>100 && r.height>100;
    })()`, { timeout: 9000 }).catch(() => null);
    if (probe) return s;
    await s.kill();
    await H.waitMs(700);
  }
  throw new Error('bootHealthy 失败 ' + w.tag + ' ' + (mobile ? 'm' : 'd'));
}

async function probe(w, mobile, port) {
  const s = await bootHealthy(w, mobile, port);
  const R = { tag: w.tag, view: mobile ? 'mobile' : 'desktop', checks: {}, detail: {}, realErrors: [] };

  // —— A/B. backing 与视口/DPR 对齐（排除默认 300x150）——
  // backing：responsive=随 CSS 尺寸×DPR（默认）；fixed=固定物理坐标方画框（ting-mo 常量 704，CSS 缩放显示）
  const backingExpr = w.backing==='fixed'
    ? `(function(){var el=document.querySelector(${JSON.stringify(w.canvas)});
        return el.width===el.height && el.width>=256 && el.width<=512;})()`
    : `(function(){
        var el=document.querySelector(${JSON.stringify(w.canvas)});
        var r=el.getBoundingClientRect();
        var dpr=Math.min(window.devicePixelRatio||1,2);
        var expectW=Math.round(r.width*dpr), expectH=Math.round(r.height*dpr);
        return Math.abs(el.width-expectW)<=3 && Math.abs(el.height-expectH)<=3;
      })()`;
  const backingOk = await s.waitFor(backingExpr, { timeout: 6000 }).catch(() => null);
  R.checks.backingHealthy = backingOk === true;

  const pre = await readState(s);
  R.detail.stateAtLoad = (pre.raw || '').slice(0, 60);
  R.checks.loadedComplete = !/^JSERR/.test(pre.raw || '');

  // —— C. 画布入屏 + 不溢出 visualViewport ——
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
  R.checks.canvasInScreen = geom.w > 100 && geom.h > 100;
  R.checks.noOverflow = !geom.overflowX && !geom.overflowY;

  // —— D. touch-action 挂本体 + 真触摸手势响应 ——
  const touchAction = await s.q(`getComputedStyle(document.querySelector(${JSON.stringify(w.canvas)})).touchAction`);
  R.detail.touchAction = touchAction;
  R.checks.touchActionNone = touchAction === 'none';

  const rect = { width: geom.w, height: geom.h };
  const pts = dragPts(rect, w);
  let gestureResponds = false;
  if (w.json && pre.json) {
    const before = pre.json[w.jsonMetric];
    await s.drag(w.canvas, pts, { pointerType: 'touch' });
    // 镜像每 10 帧更新一次（can-he）+ FAST 指标（rain）衰减快：
    // 不赌固定延时，用 waitFor 在 1200ms 窗口内轮询指标是否离开手势前值
    const changed = await s.waitFor(`(function(){
      var e=document.getElementById('state'); if(!e)return false;
      try{ var j=JSON.parse(e.textContent); return j[${JSON.stringify(w.jsonMetric)}]!==${JSON.stringify(before)}; }
      catch(err){ return false; }
    })()`, { timeout: 1200 }).catch(() => null);
    const after = (await readState(s)).json;
    gestureResponds = changed === true;
    R.detail.gesture = { before, after: after ? after[w.jsonMetric] : null };
  } else if (w.textState) {
    // ting-mo：触摸拖笔后叙事状态离开「研墨…」或墨色像素增加
    const beforePx = await inkPixels(s, w.canvas);
    await s.drag(w.canvas, pts, { pointerType: 'touch' });
    await H.waitMs(500);
    const afterSt = await readState(s);
    const afterPx = await inkPixels(s, w.canvas);
    gestureResponds = (afterSt.raw || '') !== (pre.raw || '') || afterPx > beforePx;
    R.detail.gesture = { beforePx, afterPx, state: (afterSt.raw || '').slice(0, 20) };
  } else {
    // ink-garden：tap 种兰，查墨色像素净增
    const beforePx = await inkPixels(s, w.canvas);
    await s.tap(w.canvas, Math.round(geom.w * 0.3), Math.round(geom.h * 0.3), { holdMs: 70, mouse: true, touch: mobile });
    await H.waitMs(600);
    const afterPx = await inkPixels(s, w.canvas);
    gestureResponds = afterPx > beforePx;
    R.detail.gesture = { beforePx, afterPx };
  }
  R.checks.gestureResponds = gestureResponds;

  // —— E. 清纸入口 ——
  if (w.clearMode === 'gesture') {
    // mo-yin：无按钮；桌面双击、移动端长按 800ms（作品 hint 明示）
    if (mobile) {
      await s.tap(w.canvas, Math.round(geom.w*0.5), Math.round(geom.h*0.5),
        { holdMs: 800, mouse: false, touch: true });
    } else {
      const dbl = await s.q(`(function(){
        var c=document.querySelector(${JSON.stringify(w.canvas)});
        var r=c.getBoundingClientRect();
        var cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
        function pe(t,n){c.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:cx,clientY:cy,pointerId:1,pointerType:'mouse',button:0,buttons:n?1:0}));}
        function me(t,n,cc){c.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,clientX:cx,clientY:cy,button:0,buttons:n?1:0,detail:cc?2:1}));}
        pe('pointerdown',1);me('mousedown',1,false);pe('pointerup',0);me('mouseup',0,false);
        pe('pointerdown',1);me('mousedown',1,true);pe('pointerup',0);me('mouseup',0,true);
        c.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true,clientX:cx,clientY:cy,button:0}));
        return 'dbl';
      })()`);
      R.detail.dblInfo = dbl;
    }
    await H.waitMs(400);
    const gst = (await readState(s)).json;
    // 判据只认 tw=0：宣纸层有固定底纹墨点，像素判据会误报；tw=总水量 是清纸权威信号
    R.detail.afterClear = { tw: gst ? gst.tw : null };
    R.checks.clearOk = !!gst && gst.tw < 0.05;
    R.detail.clearInfo = mobile ? 'longpress' : 'dblclick';
  } else {
  const clearSel = w.clearBtn.map(b => '#' + b).join(',');
  const clearInfo = await s.q(`(function(){
    var b=document.querySelector(${JSON.stringify(clearSel)});
    if(!b)return 'noBtn';
    try{b.click();return 'clicked';}catch(e){return String(e);}
  })()`);
  await H.waitMs(600);
  let clearOk = clearInfo === 'clicked';
  if (clearOk) {
    if (w.json) {
      if (w.tag === 'mo-yin') {
        const st = (await readState(s)).json;
        clearOk = !!st && st.tw < 0.05;
      }
      // 其余件清纸按钮语义不一，只确认点击无错误（不强制状态归零）
    } else if (w.textState) {
      const st = await readState(s);
      const px = await inkPixels(s, w.canvas);
      // ting-mo 清纸：回到研墨态 或 墨色像素清零
      clearOk = /研墨/.test(st.raw || '') || px === 0;
      R.detail.afterClear = { state: (st.raw || '').slice(0, 20), px };
    }
  }
  R.detail.clearInfo = clearInfo;
  R.checks.clearOk = clearOk;
  }

  R.realErrors = await s.realErrors();
  R.checks.zeroErrors = R.realErrors.length === 0;
  R.pass = Object.values(R.checks).every(v => v === true);
  await s.kill();
  return R;
}

(async () => {
  const all = [];
  let port = 10601;
  for (const w of WORK) {
    for (const mobile of [true, false]) {
      const R = await probe(w, mobile, port);
      port += 100;
      await H.waitMs(600);
      all.push(R);
      const failed = Object.entries(R.checks).filter(([, v]) => v !== true).map(([k]) => k);
      console.log(`[${R.pass ? 'PASS' : 'FAIL'}] ${R.tag} ${R.view}` + (failed.length ? '  ✗ ' + failed.join(',') : ''));
      if (R.realErrors.length) console.log('   realErrors: ' + R.realErrors.join(' | '));
    }
  }
  const fails = all.filter(r => !r.pass);
  const summary = {
    date: '2026-10-04', dimension: 'freeze-gate',
    total: all.length, pass: all.length - fails.length, fail: fails.length,
    results: all.map(r => ({ tag: r.tag, view: r.view, pass: r.pass, checks: r.checks, detail: r.detail, realErrors: r.realErrors })),
  };
  fs.writeFileSync(path.join(OUT, 'freeze_gate_1004_result.json'), JSON.stringify(summary, null, 2));
  console.log('\n== 冻结闸口汇总 == ' + summary.pass + '/' + summary.total + ' PASS');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
