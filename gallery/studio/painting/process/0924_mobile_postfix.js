// 0924 修复后回归：resize 防抖有效性 + 芦花进度保留
const H = require('/app/data/所有对话/主对话/rongball-xr/gallery/works/lib/cdp-harness.js');
const WSPATH='/app/data/所有对话/主对话/绒球创作时间/20260823/node_modules/ws';
const DIR='/app/data/所有对话/主对话/rongball-xr/gallery/works';
const OUT='/app/data/所有对话/主对话/rongball-xr/gallery/studio/painting/process';

(async () => {
  const out = {};

  // ---------- 芦花：防抖 + 进度保留 ----------
  {
    await H.killAll(9511);
    const s=await H.launch({out:OUT,profile:'luPost',port:9511,mobile:true,wsPath:WSPATH});
    await s.goto('file://'+encodeURI(`${DIR}/lu-hua.html`)+`?fast=1&seed=42&cb=${Date.now()}`);
    await H.waitMs(2000);
    // 先交互让诗显示、有散絮
    await s.drag('#scene',[[120,560],[170,552],[220,546],[270,542]]);
    await H.waitMs(500);
    await s.waitFor('JSON.parse(document.getElementById("state").textContent).poem===true',{timeout:8000});
    const before=await s.state();
    // 8 次高频 resize（间隔 <120ms）
    for(let i=0;i<8;i++) await s.send('Emulation.setDeviceMetricsOverride',{width:844,height:390-(i%2)*44,deviceScaleFactor:2,mobile:true});
    // burst 刚结束立即读：防抖静默未满，不应已重排（reeds 仍是竖屏那批 122）
    const immediate=await s.state();
    // 等过静默 120ms：执行一次重排（reeds 变为横屏那批，非 122）
    await H.waitMs(400);
    const after=await s.state();
    out.luhua={
      beforeReeds:before.reeds, beforePoem:before.poem, totalShed:before.totalShed,
      immediateReeds:immediate.reeds, immediatePoem:immediate.poem,
      afterReeds:after.reeds, afterPoem:after.poem, totalShedKept:after.totalShed,
      debounceWorked: immediate.reeds===before.reeds && after.reeds!==before.reeds,
      progressKept: after.poem===true && after.totalShed===before.totalShed
    };
    out.luhua.errors=await s.realErrors();
    await s.kill();
  }

  // ---------- 秋虫：防抖，burst 期间 backing 不动，静默后落定 ----------
  {
    await H.killAll(9512);
    const s=await H.launch({out:OUT,profile:'qcPost',port:9512,mobile:true,wsPath:WSPATH});
    await s.goto('file://'+encodeURI(`${DIR}/qiu-chong-v0915.html`)+`?fast=1&seed=42&cb=${Date.now()}`);
    await H.waitMs(2000);
    const probe=`(function(){var c=document.getElementById('scene');return c.width+'x'+c.height;})()`;
    const before=await s.q(probe);
    for(let i=0;i<8;i++) await s.send('Emulation.setDeviceMetricsOverride',{width:844,height:390-(i%2)*44,deviceScaleFactor:2,mobile:true});
    const immediate=await s.q(probe);
    await H.waitMs(400);
    const after=await s.q(probe);
    out.qiuchong={before,immediate,after,
      debounceWorked: immediate===before && after!==before && after.includes('1688')};
    out.qiuchong.errors=await s.realErrors();
    await s.kill();
  }
  console.log(JSON.stringify(out,null,2));
  const ok=out.luhua.debounceWorked && out.luhua.progressKept && out.qiuchong.debounceWorked
    && out.luhua.errors.length===0 && out.qiuchong.errors.length===0;
  console.log('RESULT:', ok?'PASS':'FAIL');
  process.exit(ok?0:1);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
