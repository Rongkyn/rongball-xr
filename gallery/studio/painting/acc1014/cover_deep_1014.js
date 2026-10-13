// 精查 grid2048 / gomoku 封面是否真的绘制（全像素 alpha + 非纸色 RGB）
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const GALLERY = path.join(__dirname, '..', '..', '..', 'index.html');

const PROBE = `(function(){
  var out={};
  ['grid2048','gomoku'].forEach(function(kind){
    var cv=document.querySelector('canvas[data-cover="'+kind+'"]');
    var r=cv.getBoundingClientRect();
    cv.scrollIntoView({block:'center'});
    var x=cv.getContext('2d');
    var d=x.getImageData(0,0,cv.width,cv.height).data;
    var alphaN=0, colorN=0, nonPaperN=0, minA=255, sample=null;
    for(var i=0;i<d.length;i+=4){
      var rr=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
      if(a>10)alphaN++;
      if(a>10 && !(rr>235&&g>230&&b>218))nonPaperN++;
      if(a<minA)minA=a;
      if(!sample && a>40){sample=[rr,g,b,a];}
    }
    out[kind]={cssW:Math.round(r.width),cssH:Math.round(r.height),bmW:cv.width,bmH:cv.height,
      alphaN:alphaN,nonPaperN:nonPaperN,total:d.length/4,samplePx:sample};
  });
  return out;
})()`;

(async()=>{
  const s = await H.launch({out:__dirname,profile:'coverdeep',wsPath:WS,port:9420,mobile:false,width:1280,height:900});
  try{
    await s.goto('file://' + encodeURI(GALLERY) + '?cb=' + Date.now());
    await s.waitFor("document.querySelectorAll('canvas[data-cover]').length >= 7", {timeout:8000});
    await H.waitMs(2500); // 2048/gomoku 一次性 draw，给足首帧
    const r = await s.q(PROBE);
    console.log(JSON.stringify(r,null,2));
    await s.shot('coverdeep');
  } finally { await s.kill(); }
})();
