const H=require('../../../works/lib/cdp-harness.js');
const path=require('path');
const WS='/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const GALLERY=path.join(__dirname,'..','..','..','index.html');
(async()=>{
  const s=await H.launch({out:__dirname,profile:'shotcovers',wsPath:WS,port:9461,mobile:true,width:390,height:844});
  try{
    await s.goto('file://'+encodeURI(GALLERY)+'?cb='+Date.now());
    await s.waitFor("document.querySelectorAll('.cover canvas').length>=7",{timeout:8000});
    await H.waitMs(2000);
    await s.q(`document.querySelector('canvas[data-cover="grid2048"]').closest('a.card').scrollIntoView({block:'center'})`);
    await H.waitMs(700);
    await s.shot('mcovers_2048_gomoku');
    // hero too
    await s.q('window.scrollTo(0,0)'); await H.waitMs(400);
    await s.shot('mhero_1014');
  }finally{await s.kill();}
})();
