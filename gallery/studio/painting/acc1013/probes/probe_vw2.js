const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
async function probe(file, port, prof) {
  const full = path.resolve(__dirname, '../../../works/' + file);
  const s = await H.launch({ out: __dirname, profile: prof, wsPath: WS, port, mobile: true, width: 390, height: 844 });
  await s.goto('file://' + encodeURI(full) + '?cb=' + Date.now());
  await H.waitMs(1200);
  const info = await s.q(`({iw:innerWidth, vv:visualViewport.width,
    dce:document.documentElement.clientWidth, sw:document.documentElement.scrollWidth,
    bodySW:document.body.scrollWidth})`);
  console.log(file, JSON.stringify(info));
  await H.killAll(port);
}
(async () => {
  await probe('ta-xue.html', 9371, 'pvwA');
  await probe('tian-deng.html', 9372, 'pvwB');
  await probe('feng-duo.html', 9373, 'pvwC');
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
