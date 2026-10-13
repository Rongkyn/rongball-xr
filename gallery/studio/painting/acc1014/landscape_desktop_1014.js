// living-landscape 1014 桌面回归：确认触摸补齐未动到鼠标路径
// 鼠标移动扰流 / click 涟漪（非季节区）/ 点季节按钮无涟漪但切季 / wheel 调速 / hint 仍为鼠标版
const H = require('../../../works/lib/cdp-harness.js');
const path=require('path');
const WS='/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE=path.join(__dirname,'..','..','..','works','living-landscape.html');
let pass=0,fail=0; const ok=(c,m,v)=>{console.log((c?'PASS':'FAIL')+' '+m+(v!==undefined?' :: '+v:''));c?pass++:fail++;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const s=await H.launch({out:__dirname,profile:'land1014desk',wsPath:WS,port:9437,mobile:false,width:1280,height:720});
  const dbg=async()=>s.q('window.__acc1014');
  try{
    await s.goto('file://'+encodeURI(FILE)+'?acc1014=1&cb='+Date.now());
    await s.waitFor('window.__acc1014',{timeout:8000}); await sleep(700);
    ok((await s.realErrors()).length===0,'boot zeroRealErrors');
    const hint=await s.q("document.getElementById('hint').textContent.replace(/\\s+/g,'')");
    ok(hint.indexOf('鼠标')>=0 && hint.indexOf('滚轮')>=0,'desktop hint preserved',hint);
    const cursorShown=await s.q("getComputedStyle(document.getElementById('cursor')).display!=='none'");
    ok(cursorShown,'desktop custom cursor shown');

    // 鼠标移动 → mouseX/Y
    await s.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:900,y:500}); await sleep(120);
    const d=await dbg();
    ok(Math.abs(d.mouseX-900)<10&&Math.abs(d.mouseY-500)<10,'mouse move maps',JSON.stringify([d.mouseX,d.mouseY]));

    // 桌面 click 开阔区 → 1 涟漪
    const r0=(await dbg()).rippleN;
    await s.trustedClick('#mainCanvas',300,500); await sleep(150);
    ok((await dbg()).rippleN-r0===1,'desktop canvas click +1 ripple');

    // 桌面点季节按钮 → 切季、无涟漪
    const r1=(await dbg()).rippleN;
    const dot=await s.q(`(function(){var d=document.querySelector('.season-dot[data-season="3"]').getBoundingClientRect();
      return [Math.round(d.left+d.width/2),Math.round(d.top+d.height/2)];})()`);
    await s.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:dot[0],y:dot[1]}); await sleep(30);
    await s.send('Input.dispatchMouseEvent',{type:'mousePressed',x:dot[0],y:dot[1],button:'left',clickCount:1});
    await s.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:dot[0],y:dot[1],button:'left',clickCount:1});
    await sleep(200);
    const active=await s.q("document.querySelector('.season-dot[data-season=\"3\"]').classList.contains('active')");
    ok(active===true,'desktop season dot switches');
    ok((await dbg()).rippleN===r1,'desktop season dot no ripple');

    // wheel → timeScale
    const t0=(await dbg()).timeScale;
    await s.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:400,y:400,deltaX:0,deltaY:-400}); await sleep(150);
    const t1=(await dbg()).timeScale;
    ok(t1>t0+0.3,'wheel up accelerates',t0.toFixed(2)+' -> '+t1.toFixed(2));

    ok((await s.realErrors()).length===0,'post zeroRealErrors',JSON.stringify(await s.realErrors()));
    await s.shot('landscape_desktop1014');
  }finally{await s.kill();}
  console.log('\\nTOTAL pass='+pass+' fail='+fail); process.exit(fail?1:0);
})();
