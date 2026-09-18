
const path=require('path');
const H=require('../../../../../works/lib/cdp-harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const s=await H.launch({out:__dirname,profile:'probe',port:9611,mobile:true,width:390,height:844,
    wsPath:'/usr/lib/node_modules/@coze/cli/node_modules/ws'});
  try{
    await s.goto('file://'+path.resolve(__dirname,'../../../../../works/ting-mo.html')+'?cb='+Date.now());
    await sleep(800);
    console.log(JSON.stringify(await s.q(`(function(){
      return {innerW:innerWidth, innerH:innerHeight, dpr:devicePixelRatio,
        vv: visualViewport?{w:Math.round(visualViewport.width),h:Math.round(visualViewport.height),scale:visualViewport.scale}:null,
        screenW:screen.width, frame:Math.round(document.querySelector('.frame').getBoundingClientRect().width)};
    })()`),null,2));
    // 显式再设一次 override（排除 goto 重连丢失）
    await s.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
    await sleep(400);
    console.log('re-override innerW=', await s.q('innerWidth'));
    await s.shot('probe_mobile');
  }finally{ await s.kill(); }
})().catch(e=>{console.error(e);process.exit(1)});
