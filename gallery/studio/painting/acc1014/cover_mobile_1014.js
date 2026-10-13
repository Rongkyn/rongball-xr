const H=require('../../../works/lib/cdp-harness.js');
const path=require('path');
const WS='/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const GALLERY=path.join(__dirname,'..','..','..','index.html');
(async()=>{
  const s=await H.launch({out:__dirname,profile:'covmob',wsPath:WS,port:9451,mobile:true,width:390,height:844});
  try{
    await s.goto('file://'+encodeURI(GALLERY)+'?cb='+Date.now());
    await s.waitFor("document.querySelectorAll('.cover canvas').length>=7",{timeout:8000});
    await H.waitMs(2200);
    const r=await s.q(`(function(){
      return [].slice.call(document.querySelectorAll('.cover canvas')).map(function(cv){
        var card=cv.closest('a.card'); var name=card?card.querySelector('h3').textContent:'?';
        var x=cv.getContext('2d'); var d=x.getImageData(0,0,cv.width,cv.height).data; var n=0;
        for(var i=3;i<d.length;i+=4*6){if(d[i]>12)n++;}
        var rect=cv.getBoundingClientRect();
        return {name:name,kind:cv.getAttribute('data-cover'),w:cv.width,h:cv.height,
          cssW:Math.round(rect.width),cssH:Math.round(rect.height),n:n,
          dpr:window.devicePixelRatio||1};
      });
    })()`);
    console.log(JSON.stringify(r,null,1));
  }finally{await s.kill();}
})();
