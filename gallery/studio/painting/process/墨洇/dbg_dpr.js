const H=require('../../../../works/lib/cdp-harness.js');
const WS='/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE='file://'+encodeURI('/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/works/mo-yin.html');
(async()=>{
  await H.killAll(9641);
  const s=await H.launch({out:__dirname,profile:'dbgpr',port:9641,wsPath:WS,mobile:true});
  // 导航前先注入探针，在页面脚本执行各阶段记录 dpr
  await s.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__log=[];
    window.__log.push({stage:'pre', dpr:window.devicePixelRatio, t:performance.now()});
    document.addEventListener('readystatechange',function(){
      window.__log.push({stage:document.readyState,dpr:window.devicePixelRatio,t:performance.now()});
    });
    window.addEventListener('load',function(){
      var i=document.getElementById('ink'),r=i.getBoundingClientRect();
      window.__log.push({stage:'load',dpr:window.devicePixelRatio,css:Math.round(r.width),back:i.width,t:performance.now()});
    });
  `});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`document.readyState==='complete'`);
  await H.waitMs(500);
  const log=await s.q(`window.__log`);
  log.forEach(l=>console.log(JSON.stringify(l)));
  // 直接手动调一次 syncInkBacking（但它是闭包私有，只能观察）
  const now=await s.q(`(function(){var i=document.getElementById('ink'),r=i.getBoundingClientRect();
    return{dpr:window.devicePixelRatio,css:Math.round(r.width),back:i.width};})()`);
  console.log('manual probe:',JSON.stringify(now));
  await s.kill();process.exit(0);
})().catch(e=>{console.error(e);process.exit(2);});
