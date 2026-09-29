/**
 * 交互手感（interaction feel）系统验收 — 2026-09-29
 * 此前已系统验收：移动端布局 / 加载性能 / 四段式叙事；「交互手感」是唯一从未系统验收的维度。
 *
 * 本轮发现并修复（旧坑新形态：声明写了但没作用到交互元素）：
 *   6 件 canvas 实际 touch-action=auto（声明写在不继承的 html,body 上，touch-action 不继承），
 *   真机上拖动类手势会被浏览器滚动/缩放语义先于页面劫持；pointermove 也无 preventDefault。
 *   处方：给 canvas 本体补 touch-action:none（标准正解）+ 桌面 cursor:crosshair（可点暗示）。
 *
 * 覆盖 6 件（听墨为有意可滚动文档页，本轮不动）：
 *   ink-garden 画 / can-he 持续搅雨 / lu-hua 扫风 / gui-yu 摇树 / yue-bo 碎月·拨云 / qiu-chong 轻扫觅虫
 * 双档：移动 390x844@2 + 桌面 1280x720@1
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');

const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const WORKS_DIR = path.join(__dirname, '..', '..', '..', 'works');

// metric: 从 #state 读的响应指标；ink-garden 无镜像，用画布像素增量
// yFrac：手势纵向位置（命中真实热区）；qiu-chong 用 hushes（近虫即静）；ink-garden 无镜像走像素
const WORK = [
  { tag: 'ink-garden', file: 'ink-garden.html',  canvas: '#scene', metric: null,       yFrac: 0.55 },
  { tag: 'can-he',     file: 'can-he.html',      canvas: '#pond',  metric: 'rain',     yFrac: 0.55 },
  { tag: 'lu-hua',     file: 'lu-hua.html',      canvas: '#scene', metric: 'gusts',    yFrac: 0.60 },
  { tag: 'gui-yu',     file: 'gui-yu.html',      canvas: '#scene', metric: 'shake',    yFrac: 0.30 },
  { tag: 'yue-bo',     file: 'yue-bo-v0916.html', canvas: '#scene', metric: 'nRipple', yFrac: 0.75 },
  { tag: 'qiu-chong',  file: 'qiu-chong-v0915.html', canvas: '#scene', metric: 'hushes', yFrac: 0.72 },
];

// 手势点位：按件命中热区的横向拖动（CSS px，相对画布）
function dragPts(rect, w) {
  const y = Math.round(rect.height * w.yFrac);
  const x0 = Math.round(rect.width * 0.22);
  const x1 = Math.round(rect.width * 0.78);
  const pts = [];
  for (let i = 0; i <= 8; i++) pts.push([Math.round(x0 + (x1 - x0) * i / 8), y]);
  return pts;
}

async function readMetric(s, metric) {
  if (!metric) return null;
  // 直接读文本自行解析，避免某帧镜像为空时 state() 抛错中断整场
  const txt = await s.q(`(function(){var e=document.getElementById('state');return e?e.textContent:'';})()`);
  if (!txt || txt[0] !== '{') return null;
  try { const st = JSON.parse(txt); return st[metric] != null ? st[metric] : null; }
  catch (e) { return null; }
}

// 启动 + 导航 + 健康探针；不健康（串台坑#8/#16）则换端口/profile 重开，最多 3 次
async function bootHealthy(w, mobile, port) {
  const dims = mobile ? { w: 390, h: 844 } : { w: 1280, h: 720 };
  const full = path.join(WORKS_DIR, w.file);
  for (let attempt = 0; attempt < 3; attempt++) {
    const usePort = port + attempt * 100;
    const profile = 'a29' + (mobile ? 'm' : 'd') + '-' + w.tag + (attempt ? '-r' + attempt : '');
    await H.killAll(usePort);
    await H.waitMs(500);
    const s = await H.launch({
      out: OUT, profile, wsPath: WS, port: usePort, mobile, width: dims.w, height: dims.h,
    });
    await s.goto('file://' + encodeURI(full) + '?fast=1&cb=' + Date.now());
    // backing 必须已按视口初始化（排除 canvas 默认 300x150 / innerWidth 未稳定的早期态）
    const probe = await s.waitFor(`(function(){
      var el=document.querySelector(${JSON.stringify(w.canvas)});
      if(!el)return false;
      var r=el.getBoundingClientRect();
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var expectW=Math.round(window.innerWidth*dpr), expectH=Math.round(window.innerHeight*dpr);
      return document.readyState==='complete' && r.width>100 &&
             Math.abs(el.width-expectW)<=2 && Math.abs(el.height-expectH)<=2;
    })()`, { timeout: 8000 }).catch(() => null);
    if (probe) return s;
    await s.kill();
    await H.waitMs(800);
  }
  throw new Error('bootHealthy 失败 ' + w.tag + ' ' + (mobile ? 'm' : 'd'));
}

async function probe(w, mobile, port) {
  const s = await bootHealthy(w, mobile, port);
  const R = { tag: w.tag, view: mobile ? 'mobile' : 'desktop', asserts: {}, behavior: {}, realErrors: [] };

  // —— 计算样式/坐标映射 ——
  const st = await s.q(`(function(){
    var el=document.querySelector(${JSON.stringify(w.canvas)});
    var cs=getComputedStyle(el); var r=el.getBoundingClientRect();
    return {backingW:el.width,backingH:el.height,cssW:Math.round(r.width),cssH:Math.round(r.height),
            touchAction:cs.touchAction,cursor:cs.cursor,inScreen:r.width>100&&r.height>100};
  })()`);
  R.style = st;
  R.asserts.touchActionNone = st.touchAction === 'none';
  R.asserts.cursorCrosshair = st.cursor === 'crosshair';
  R.asserts.canvasInScreen = st.inScreen;
  const dpr = mobile ? 2 : 1;
  R.asserts.coordMapConsistent =
    Math.abs(st.backingW / st.cssW - dpr) < 0.2 && Math.abs(st.backingH / st.cssH - dpr) < 0.2;

  const rect = await s.q(`(function(){var r=document.querySelector(${JSON.stringify(w.canvas)}).getBoundingClientRect();return {width:r.width,height:r.height};})()`);
  const pts = dragPts(rect, w);

  if (w.metric) {
    // —— 触摸拖动响应 ——
    const bT = await readMetric(s, w.metric);
    await s.drag(w.canvas, pts, { pointerType: 'touch' });
    await H.waitMs(450);
    const aT = await readMetric(s, w.metric);
    R.behavior.touch = { before: bT, after: aT, responds: bT != null && aT != null && aT !== bT };
    // —— 鼠标拖动响应 ——
    const bM = await readMetric(s, w.metric);
    await s.drag(w.canvas, pts, { pointerType: 'mouse' });
    await H.waitMs(450);
    const aM = await readMetric(s, w.metric);
    R.behavior.mouse = { before: bM, after: aM, responds: bM != null && aM != null && aM !== bM };
    R.behavior.responds = R.behavior.touch.responds || R.behavior.mouse.responds;
  } else {
    // —— ink-garden：点按种兰（非自由画笔）。在空区用 tap 种 3 株，查落点附近墨色像素净增。
    //    tap 默认 pointer+mouse 双派；移动端再 touch=true 追加真触摸。
    const probeRegion = async (cx, cy) => s.q(`(function(){
      var c=document.querySelector(${JSON.stringify(w.canvas)});
      var d=c.getContext('2d').getImageData(${cx}-40,${cy}-40,80,80).data;
      var n=0; for(var i=0;i<d.length;i+=4){ if(d[i+3]>40&&(d[i]<120||d[i+1]<120||d[i+2]<120))n++; }
      return n;
    })()`);
    const spots = [
      [Math.round(rect.width * 0.20), Math.round(rect.height * 0.30)],
      [Math.round(rect.width * 0.45), Math.round(rect.height * 0.22)],
      [Math.round(rect.width * 0.70), Math.round(rect.height * 0.35)],
    ];
    let grewT = 0;
    for (const [x, y] of spots) {
      const b = await probeRegion(x, y);
      await s.tap(w.canvas, x, y, { holdMs: 70, mouse: true, touch: mobile });
      await H.waitMs(500);
      const a = await probeRegion(x, y);
      if (a > b) grewT++;
    }
    R.behavior.touch = { planted: grewT, responds: grewT > 0 };
    R.behavior.mouse = { planted: grewT, responds: grewT > 0 };
    R.behavior.responds = grewT > 0;
  }

  // —— 清理按钮 ——
  R.behavior.clearOk = await s.q(`(function(){
    var b=document.getElementById('btnClear')||document.getElementById('clearBtn')||document.getElementById('btn-clear');
    if(!b)return 'noBtn'; try{b.click();return true;}catch(e){return String(e);}
  })()`);

  R.realErrors = await s.realErrors();
  R.pass = R.asserts.touchActionNone && R.asserts.cursorCrosshair && R.asserts.canvasInScreen &&
           R.asserts.coordMapConsistent && R.realErrors.length === 0 && R.behavior.responds === true;
  await s.kill();
  return R;
}

(async () => {
  const all = [];
  let port = 10101;
  for (const w of WORK) {
    for (const mobile of [true, false]) {
      const R = await probe(w, mobile, port);
      port += 200;                 // 大幅错开端口，避免复用残留
      await H.waitMs(700);          // 冷却，等上一实例完全退出
      all.push(R);
      console.log(`[${R.pass ? 'PASS' : 'FAIL'}] ${R.tag} ${R.view}`);
      console.log(`   touch-action=${R.style.touchAction} cursor=${R.style.cursor} backing=${R.style.backingW}x${R.style.backingH} css=${R.style.cssW}x${R.style.cssH}`);
      console.log(`   行为 touch: ${JSON.stringify(R.behavior.touch)} mouse: ${JSON.stringify(R.behavior.mouse)} clear=${R.behavior.clearOk}`);
      if (R.realErrors.length) console.log('   realErrors: ' + R.realErrors.join(' | '));
    }
  }
  const fails = all.filter(r => !r.pass);
  const summary = {
    date: '2026-09-29', dimension: 'interaction-feel',
    total: all.length, pass: all.length - fails.length, fail: fails.length,
    results: all.map(r => ({
      tag: r.tag, view: r.view, pass: r.pass, asserts: r.asserts,
      touchResponds: r.behavior.touch && r.behavior.touch.responds,
      mouseResponds: r.behavior.mouse && r.behavior.mouse.responds,
      clear: r.behavior.clearOk, realErrors: r.realErrors,
    })),
  };
  fs.writeFileSync(path.join(OUT, 'acceptance_0929_result.json'), JSON.stringify(summary, null, 2));
  console.log('\n== 汇总 == ' + summary.pass + '/' + summary.total + ' PASS');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
