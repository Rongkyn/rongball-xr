// 0924 移动端基线验收：芦花 / 秋虫（复用 cdp-harness.launch mobile 分支）
const H = require('/app/data/所有对话/主对话/rongball-xr/gallery/works/lib/cdp-harness.js');
const WSPATH = '/app/data/所有对话/主对话/绒球创作时间/20260823/node_modules/ws';
const DIR = '/app/data/所有对话/主对话/rongball-xr/gallery/works';
const OUT = '/app/data/所有对话/主对话/rongball-xr/gallery/studio/painting/process';
const FILES = [
  { name: '芦花', file: 'lu-hua.html', profile: 'lu0924', port: 9501 },
  { name: '秋虫', file: 'qiu-chong-v0915.html', profile: 'qc0924', port: 9502 }
];

(async () => {
  const summary = {};
  for (const f of FILES) {
    await H.killAll(f.port);
    const s = await H.launch({ out: OUT, profile: f.profile, port: f.port, mobile: true, wsPath: WSPATH });
    const r = {};
    const url = 'file://' + encodeURI(`${DIR}/${f.file}`) + `?fast=1&seed=42&cb=${Date.now()}`;
    await s.goto(url);
    await H.waitMs(2500);

    // 探针先验（避坑#8/#18：IIFE 闭包，只走 #state 镜像）
    r.vp = await s.viewport();
    r.st0 = await s.state();

    // 触控交互旅程：轻点 + 拖动（坐标相对 #scene，全屏 canvas 取中部）
    await s.tap('#scene', 195, 600, { holdMs: 50 });
    await s.drag('#scene', [[120,560],[160,555],[200,550],[240,548],[280,545]]);
    await H.waitMs(900);
    r.stAfterTouch = await s.state();
    await s.shot(`${f.profile}_portrait`);

    // 旋转横屏（send 直出，同一会话）
    await s.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
    await H.waitMs(1200);
    r.landscape = await s.q(`(function(){
      var c=document.getElementById('scene');
      return { vw: visualViewport?Math.round(visualViewport.width):window.innerWidth,
               css:{w:c.clientWidth,h:c.clientHeight}, back:{w:c.width,h:c.height} };
    })()`);
    r.landscapeOK = Math.abs(r.landscape.css.w-844)<=1 && Math.abs(r.landscape.css.h-390)<=1 && r.landscape.back.w>0 && r.landscape.back.h>0;
    await s.shot(`${f.profile}_landscape`);

    // resize 抖动：模拟移动端地址栏收起/旋转的高频 resize（当前 resize 未 debounce → 每次重建）
    let bursts = 0;
    for (let i=0;i<8;i++){
      await s.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390-(i%2)*44, deviceScaleFactor:2, mobile:true });
      bursts++;
    }
    await H.waitMs(900);
    r.resizeBurst = { sent: bursts };
    r.stAfterBurst = await s.state().catch(e=>({err:String(e)}));
    r.burstBroken = !!(r.stAfterBurst && r.stAfterBurst.err);

    // 回竖屏
    await s.send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:2, mobile:true });
    await H.waitMs(800);
    r.stBack = await s.state();
    await s.shot(`${f.profile}_back`);

    // 无横向溢出（visualViewport 口径）
    r.overflow = await s.q(`(function(){
      return { scrollW: document.documentElement.scrollWidth,
               visW: visualViewport?Math.round(visualViewport.width):window.innerWidth,
               bodyScrollW: document.body.scrollWidth };
    })()`);
    r.noHOverflow = r.overflow.scrollW <= r.overflow.visW + 1;

    r.errors = await s.realErrors();
    summary[f.name] = r;
    await s.kill();
  }
  console.log(JSON.stringify(summary, null, 2));
  const bad = Object.values(summary).some(r =>
    (r.errors&&r.errors.length) || !r.landscapeOK || r.burstBroken || !r.noHOverflow);
  process.exit(bad?1:0);
})().catch(e=>{ console.error('FATAL', e); process.exit(2); });
