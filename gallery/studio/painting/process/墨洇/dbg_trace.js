const H=require('../../../../works/lib/cdp-harness.js');
const WS='/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE='file://'+encodeURI('/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/works/mo-yin.html');
(async()=>{
  await H.killAll(9642);
  const s=await H.launch({out:__dirname,profile:'dbgtr',port:9642,wsPath:WS,mobile:true});
  await s.send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__tr=[];
    window.addEventListener('resize',function(){
      window.__tr.push({kind:'resize',innerW:innerWidth,innerH:innerHeight,
        vvw:visualViewport?Math.round(visualViewport.width):null,dpr:window.devicePixelRatio,t:Date.now()});
    });
    var mo=null;
    document.addEventListener('DOMContentLoaded',function(){
      var i=document.getElementById('ink');
      try{
        var desc=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'width');
        Object.defineProperty(i,'width',{configurable:true,
          get:function(){return desc.get.call(this);},
          set:function(v){ window.__tr.push({kind:'width-set',val:v,
            css:Math.round(i.getBoundingClientRect().width),dpr:window.devicePixelRatio,t:Date.now()});
            desc.set.call(this,v);}});
      }catch(e){window.__tr.push({err:String(e)});}
    });
  `});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await H.waitMs(2500);
  (await s.q(`window.__tr`)).forEach(l=>console.log(JSON.stringify(l)));
  await s.kill();process.exit(0);
})().catch(e=>{console.error(e);process.exit(2);});
