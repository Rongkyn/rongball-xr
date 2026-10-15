const H = require('../../../works/lib/cdp-harness.js');
const fs = require('fs');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
(async () => {
  const port = 9631;
  await H.killAll(port);
  const s = await H.launch({ out: __dirname, profile: 'probe404', wsPath: WS, port, width: 1280, height: 720 });
  const reqs = [];
  s.ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.method === 'Network.responseReceived') {
      const r = m.params.response;
      if (r.status >= 400) reqs.push(r.status + ' ' + r.url + ' mime=' + r.mimeType);
    }
    if (m.method === 'Network.loadingFailed') reqs.push('FAILED ' + (m.params.errorText||'') + ' ' + (m.params.type||''));
  });
  await s.send('Network.enable');
  await s.goto('https://rongkyn.github.io/rongball-xr/gallery/works/mo-yun.html?cb=' + Date.now());
  await H.waitMs(3500);
  console.log('BAD REQUESTS:'); reqs.forEach(r => console.log(' ', r));
  console.log('location:', await s.q('location.href'));
  console.log('ready:', await s.q('document.readyState'));
  const cv = await s.q(`(function(){var c=document.querySelector('#cv');if(!c)return'no canvas';var r=c.getBoundingClientRect();return JSON.stringify({w:r.width,h:r.height,bw:c.width,bh:c.height});})()`);
  console.log('canvas:', cv);
  console.log('errors:', JSON.stringify(s.errors, null, 1));
  await s.kill();
  process.exit(0);
})();
