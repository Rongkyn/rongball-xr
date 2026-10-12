const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const full = path.resolve(__dirname, '../../../works/ta-xue.html');
(async () => {
  const s = await H.launch({ out: __dirname, profile: 'probeTX', wsPath: WS, port: 9351, mobile: true, width: 390, height: 844 });
  await s.goto('file://' + encodeURI(full) + '?cb=' + Date.now());
  await H.waitMs(2200);
  const info = await s.q(`(function(){
    var fr=document.querySelector('.frame').getBoundingClientRect();
    var ax=getComputedStyle(document.documentElement).getPropertyValue('--ax');
    return {iw:innerWidth,ih:innerHeight,dpr:devicePixelRatio,ax:ax,frameW:fr.width,frameL:fr.left,
      hdr:document.querySelector('header').getBoundingClientRect().height,
      ftr:document.querySelector('footer').getBoundingClientRect().height,
      portrait: innerHeight>=innerWidth};
  })()`);
  console.log(JSON.stringify(info, null, 1));
  await H.killAll(9351);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
