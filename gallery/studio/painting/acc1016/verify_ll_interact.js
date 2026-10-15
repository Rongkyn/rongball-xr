/* acc1016 living-landscape 修复后交互复验：移动真触摸点涟漪（ripples 计数） */
const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE = path.resolve(__dirname, '../../../works/living-landscape.html');
(async()=>{
  const port = 9637;
  await H.killAll(port);
  const s = await H.launch({ out:__dirname, profile:'vlli', wsPath:WS, port,
    width:390, height:844, dpr:3, mobile:true, reducedMotion:true });
  let pass=true; const issues=[];
  try {
    await s.goto('file://'+encodeURI(FILE)+'?cb='+Date.now());
    await H.waitMs(2500);
    const before = await s.q('(typeof ripples!=="undefined")?ripples.length:-1');
    await s.tap('#mainCanvas', 200, 420, { holdMs:70, touch:true, mouse:false });
    await H.waitMs(500);
    const after = await s.q('(typeof ripples!=="undefined")?ripples.length:-1');
    if (!(after > before)) { pass=false; issues.push('涟漪未增加 '+before+'->'+after); }
    const errs=(s.errors||[]).filter(e=>!/favicon|the server responded|Failed to load resource/i.test(e));
    if(errs.length){pass=false;issues.push('ERR:'+errs.slice(0,2).join('|'));}
    console.log((pass?'PASS':'FAIL')+' M living-landscape tap-ripples '+before+'->'+after+(issues.length?'  ⚠ '+issues.join(' ; '):''));
  } finally { await s.kill().catch(()=>{}); }
  await H.killAll(port);
  process.exit(pass?0:2);
})();
