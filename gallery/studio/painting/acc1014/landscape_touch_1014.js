// living-landscape 1014 触摸补齐 — 真触摸（CDP Input.dispatchTouchEvent）确定性验收
// 页面在 ?acc1014=1 时挂 window.__acc1014={mouseX,mouseY,timeScale,rippleN}
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE = path.join(__dirname, '..', '..', '..', 'works', 'living-landscape.html');

let pass=0, fail=0;
const ok=(c,m,v)=>{ console.log((c?'PASS':'FAIL')+' '+m+(v!==undefined?' :: '+v:'')); c?pass++:fail++; };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  const s = await H.launch({out:__dirname,profile:'land1014b',wsPath:WS,port:9435,mobile:true,width:390,height:844});
  const dbg=async()=>s.q('window.__acc1014');
  // 真触摸原语
  const touch=(type,pts)=>s.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(p=>({x:p[0],y:p[1]})),modifiers:0});
  try{
    await s.goto('file://' + encodeURI(FILE) + '?acc1014=1&cb=' + Date.now());
    await s.waitFor("window.__acc1014", {timeout:8000});
    await sleep(800);
    ok((await s.realErrors()).length===0,'boot zeroRealErrors',JSON.stringify(await s.realErrors()));

    const ui = await s.q(`(function(){return{
      cursorNone:getComputedStyle(document.getElementById('cursor')).display==='none',
      hint:document.getElementById('hint').textContent.replace(/\\s+/g,'')};})()`);
    ok(ui.cursorNone,'touch hides custom cursor');
    ok(ui.hint.indexOf('双指竖拖')>=0 && ui.hint.indexOf('单指拖动')>=0,'touch hint swapped',ui.hint);

    // ① 单指拖动 → mouseX/mouseY 跟随手指
    const d0 = await dbg();
    await touch('touchStart',[[60,520]]); await sleep(40);
    await touch('touchMove',[[140,460]]); await sleep(40);
    await touch('touchMove',[[230,380]]); await sleep(60);
    const dMove = await dbg();
    await touch('touchEnd',[]); await sleep(60);
    ok(Math.abs(dMove.mouseX-230)<24 && Math.abs(dMove.mouseY-380)<24,
       '1-finger drag maps to flow-field mouseX/Y', JSON.stringify({from:[d0.mouseX,d0.mouseY],got:[dMove.mouseX,dMove.mouseY]}));

    // ② 单指轻点 → 恰好 +1 涟漪（preventDefault 抑制合成 click，无双发）
    const rBefore = (await dbg()).rippleN;
    await touch('touchStart',[[120,600]]); await sleep(50);
    await touch('touchEnd',[]);
    await sleep(120);
    const rAfter1 = (await dbg()).rippleN;
    await sleep(450); // 等可能的合成 click 迟到
    const rAfter2 = (await dbg()).rippleN;
    ok(rAfter1-rBefore===1,'single tap creates exactly 1 ripple','+ '+(rAfter1-rBefore));
    ok(rAfter2===rAfter1,'no late synthetic-click second ripple','rippleN '+rBefore+'->'+rAfter1+'->'+rAfter2);

    // ②b 季节按钮轻点不应产生涟漪（被 onSeasonUI 放行给按钮 click）
    const dotPos = await s.q(`(function(){var d=document.querySelector('.season-dot[data-season="2"]').getBoundingClientRect();
      return [Math.round(d.left+d.width/2),Math.round(d.top+d.height/2)];})()`);
    const rB=(await dbg()).rippleN;
    await touch('touchStart',[dotPos]); await sleep(50); await touch('touchEnd',[]); await sleep(200);
    const seasonActive = await s.q("document.querySelector('.season-dot[data-season=\"2\"]').classList.contains('active')");
    ok((await dbg()).rippleN===rB,'tap season dot spawns no ripple');
    ok(seasonActive===true,'tap season dot still switches season');

    // ③ 双指竖拖上滑 → timeScale 显著增大（从 1.0 接近上限 3.0）
    const ts0=(await dbg()).timeScale;
    await touch('touchStart',[[110,640],[260,640]]); await sleep(40);
    for(let y=640;y>=300;y-=34){ await touch('touchMove',[[110,y],[260,y]]); await sleep(28); }
    await touch('touchEnd',[]); await sleep(150);
    const ts1=(await dbg()).timeScale;
    ok(ts1>ts0+0.8,'two-finger up-drag accelerates time','timeScale '+ts0.toFixed(2)+' -> '+ts1.toFixed(2));

    // ③b 双指下滑 → 回降
    await touch('touchStart',[[110,300],[260,300]]); await sleep(40);
    for(let y=300;y<=620;y+=34){ await touch('touchMove',[[110,y],[260,y]]); await sleep(28); }
    await touch('touchEnd',[]); await sleep(150);
    const ts2=(await dbg()).timeScale;
    ok(ts2<ts1-0.5,'two-finger down-drag decelerates time',ts1.toFixed(2)+' -> '+ts2.toFixed(2));

    ok((await s.realErrors()).length===0,'post-touch zeroRealErrors',JSON.stringify(await s.realErrors()));
    await s.shot('landscape_touch1014');
  } finally { await s.kill(); }
  console.log('\\nTOTAL pass='+pass+' fail='+fail);
  process.exit(fail?1:0);
})();
