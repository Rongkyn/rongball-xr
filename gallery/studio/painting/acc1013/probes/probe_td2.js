const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const full = path.resolve(__dirname, '../../../works/tian-deng.html');
async function seq(mobile, port, prof) {
  const s = await H.launch({ out: __dirname, profile: prof, wsPath: WS, port, mobile, width: mobile?390:1280, height: mobile?844:581 });
  await s.goto('file://' + encodeURI(full) + '?cb=' + Date.now());
  await H.waitMs(2000);
  const geom = await s.q(`(function(){var r=document.querySelector('canvas').getBoundingClientRect();return{w:r.width,h:r.height};})()`);
  const r0 = await s.q(`released`);
  console.log(prof, 'pre-tap r=', r0, 'ground=', await s.q(`ground?[ground.x,ground.y,ground.state]:null`));
  await s.tap('canvas', Math.round(geom.w*0.5), Math.round(geom.h*0.5), { holdMs: 70, mouse: !mobile, touch: mobile });
  await H.waitMs(500);
  const r1 = await s.q(`released`);
  console.log(prof, 'post-tap(sky) r=', r1, 'panel=', await s.q(`panel.classList.contains('open')`));
  // 正确流程：点地面灯开面板 → 点放飞
  const g = await s.q(`ground?{x:ground.x,y:ground.y,st:ground.state}:null`);
  console.log(prof, 'ground now', g);
  if (g && g.st==='ground') {
    await s.tap('canvas', Math.round(g.x), Math.round(g.y), { holdMs: 70, mouse: !mobile, touch: mobile });
    await H.waitMs(400);
    console.log(prof, 'panel after ground tap=', await s.q(`panel.classList.contains('open')`));
    await s.q(`document.getElementById('releaseBtn').click()`);
    await H.waitMs(mobile?1800:1800);
    console.log(prof, 'r after release=', await s.q(`released`), 'gstate=', await s.q(`ground?ground.state:null`));
  }
  await H.killAll(port);
}
(async () => {
  await seq(true, 9331, 'probeTDm');
  await seq(false, 9332, 'probeTDd');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
