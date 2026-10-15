const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE = path.resolve(__dirname, '../../../works/living-landscape.html');
(async()=>{
  const port=9650; await H.killAll(port);
  const s=await H.launch({out:__dirname,profile:'pdpr4',wsPath:WS,port,width:390,height:844,dpr:3,mobile:true,reducedMotion:true});
  // Page.addScriptToEvaluateOnNewDocument 让记录器在页面任何脚本前注入
  await s.send('Page.addScriptToEvaluateOnNewDocument', { source:
    'window.__tl=[];var __t0=performance.now();(function(){var d=window.devicePixelRatio||1;var c=document.getElementById("mainCanvas");' +
    'window.__tl.push(Math.round(performance.now()-__t0)+"ms dpr="+d+" bw="+(c?c.width:"-"));})();' +
    'setInterval(function(){var d=window.devicePixelRatio||1;var c=document.getElementById("mainCanvas");' +
    'window.__tl.push(Math.round(performance.now()-__t0)+"ms dpr="+d+" bw="+(c?c.width:"-"));},100);'
  });
  await s.goto('file://'+encodeURI(FILE)+'?cb4='+Date.now());
  await H.waitMs(3200);
  const tl = await s.q('window.__tl');
  console.log(Array.isArray(tl) ? tl.filter(x=>!x.endsWith('dpr=2 bw=-')).slice(0,30).join('\n') : tl);
  await s.kill().catch(()=>{}); await H.killAll(port);
  process.exit(0);
})();
