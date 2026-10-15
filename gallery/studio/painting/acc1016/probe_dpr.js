const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE = path.resolve(__dirname, '../../../works/living-landscape.html');
(async()=>{
  const port=9648; await H.killAll(port);
  const s=await H.launch({out:__dirname,profile:'pdpr',wsPath:WS,port,width:390,height:844,dpr:3,mobile:true,reducedMotion:true});
  await s.goto('file://'+encodeURI(FILE)+'?cb='+Date.now());
  for (const t of [0,100,300,600,1000,2000,3000,4000]) {
    await H.waitMs(t===0?0: (t-[0,100,300,600,1000,2000,3000,4000][[0,100,300,600,1000,2000,3000,4000].indexOf(t)-1]||0));
  }
  // simpler: sample every 500ms
  await s.kill().catch(()=>{}); await H.killAll(port);

  const s2=await H.launch({out:__dirname,profile:'pdpr2',wsPath:WS,port,width:390,height:844,dpr:3,mobile:true,reducedMotion:true});
  await s2.goto('file://'+encodeURI(FILE)+'?cb2='+Date.now());
  for (let i=0;i<=10;i++){
    const v=await s2.q(`JSON.stringify({t:Math.round(performance.now()),dpr:devicePixelRatio,bw:document.getElementById('mainCanvas').width,max:(typeof maxDpr!=='undefined'?maxDpr:'na')})`);
    console.log(v);
    await H.waitMs(400);
  }
  await s2.kill().catch(()=>{}); await H.killAll(port);
  process.exit(0);
})();
