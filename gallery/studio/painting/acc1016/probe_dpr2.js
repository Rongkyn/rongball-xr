const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE = path.resolve(__dirname, '../../../works/living-landscape.html');
(async()=>{
  const port=9649; await H.killAll(port);
  const s=await H.launch({out:__dirname,profile:'pdpr3',wsPath:WS,port,width:390,height:844,dpr:3,mobile:true,reducedMotion:true});
  // 在导航前注入不行（goto 自建连）；改为导航后立即高频轮询
  await s.goto('file://'+encodeURI(FILE)+'?cb3='+Date.now());
  for (let i=0;i<16;i++){
    const v=await s.q(`JSON.stringify({t:Math.round(performance.now()),dpr:devicePixelRatio,bw:(function(){var c=document.getElementById('mainCanvas');return c?c.width:-1;})(),max:(typeof maxDpr!=='undefined'?maxDpr:'na'),ready:document.readyState})`);
    console.log(v);
    await H.waitMs(180);
  }
  await s.kill().catch(()=>{}); await H.killAll(port);
  process.exit(0);
})();
