const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const full = path.resolve(__dirname, '../../../works/ta-xue.html');
(async () => {
  const s = await H.launch({ out: __dirname, profile: 'probeVW', wsPath: WS, port: 9361, mobile: true, width: 390, height: 844 });
  await s.goto('file://' + encodeURI(full) + '?cb=' + Date.now());
  for (let i = 0; i < 6; i++) {
    const info = await s.q(`({iw:innerWidth,ih:innerHeight,ow:outerWidth,sw:screen.width,dpr:devicePixelRatio,
      vv:visualViewport&&visualViewport.width, ax:getComputedStyle(document.documentElement).getPropertyValue('--ax')})`);
    console.log(JSON.stringify(info));
    await H.waitMs(400);
  }
  await H.killAll(9361);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
