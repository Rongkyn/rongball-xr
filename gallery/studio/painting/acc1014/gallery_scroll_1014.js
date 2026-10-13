// 挂廊深测 1014：滚动触发懒渲染封面 + 移动端布局 + 卡片跳转
// 目的：排除 baseline「coversPainted=false」是否为 IntersectionObserver 懒渲染造成的探针假象
const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const GALLERY = path.join(__dirname, '..', '..', '..', 'index.html');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
let PORT = 9401;
const mkPort = () => ++PORT;

const SCROLL_PROBE = `(async function(){
  var cards=[].slice.call(document.querySelectorAll('a.card'));
  var cols = new Set();
  // 逐卡滚入视口，每步等 IO 触发 + 封面绘制
  for (var i=0;i<cards.length;i++){
    cards[i].scrollIntoView({block:'center'});
    await new Promise(r=>setTimeout(r,260));
  }
  await new Promise(r=>setTimeout(r,600));
  window.scrollTo(0,0);
  await new Promise(r=>setTimeout(r,200));
  // 列数：同一 offsetTop 的卡片数
  var rows={};
  cards.forEach(c=>{var k=c.getBoundingClientRect().top+window.scrollY; rows[Math.round(k/10)]=(rows[Math.round(k/10)]||0)+1;});
  var colCount=Math.max.apply(null,Object.keys(rows).map(k=>rows[k]));
  var cov=cards.map(function(a){
    var cv=a.querySelector('.cover canvas'); if(!cv) return {err:'noCanvas'};
    var x=cv.getContext('2d'); var d;
    try{ d=x.getImageData(0,0,cv.width,cv.height).data; }catch(e){ return {err:e.message,w:cv.width,h:cv.height}; }
    var painted=false;
    for(var i=3;i<d.length;i+=4*7){ if(d[i]>10){painted=true;break;} }
    var r=a.getBoundingClientRect();
    return {t:a.querySelector('h3').textContent,painted:painted,w:Math.round(r.width)};
  });
  return {
    colCount: colCount,
    cardW: cov.length?cov[0].w:null,
    paintedN: cov.filter(c=>c.painted).length,
    unpainted: cov.filter(c=>!c.painted).map(c=>c.t||c.err),
    bodyScrollW: document.body.scrollWidth, winW: window.innerWidth,
    overflowX: document.body.scrollWidth - window.innerWidth
  };
})()`;

async function run(label, w, h, touch){
  console.log('\n=== '+label+' scroll-pass ('+w+'x'+h+') ===');
  const profile = 'scroll_' + label;
  const s = await H.launch({out:__dirname, profile, wsPath:WS, port:mkPort(), mobile:touch, width:w, height:h});
  try{
    await s.goto('file://' + encodeURI(GALLERY) + '?cb=' + Date.now());
    await s.waitFor("document.querySelectorAll('a.card').length >= 21", {timeout:8000});
    await H.waitMs(800);
    const r = await s.q(SCROLL_PROBE);
    console.log('colCount       ::', r.colCount);
    console.log('cardW          ::', r.cardW, '(winW='+r.winW+')');
    console.log('paintedN/21    ::', r.paintedN);
    console.log('unpainted      ::', JSON.stringify(r.unpainted));
    console.log('overflowX      ::', r.overflowX);
    console.log((r.paintedN===21?'PASS':'FAIL')+' coversPaintAfterScroll');
    console.log(((touch?r.colCount===1:r.colCount>=2)?'PASS':'FAIL')+' expectedColumns '+label);
    await s.shot('scroll_'+label);

    // 卡片点击跳转：点第一张（a.card 真实 href 跳转，file:// 同域）
    const href0 = await s.q("document.querySelector('a.card').getAttribute('href')");
    console.log('firstCardHref  ::', href0);
    const nav = await s.q(`(async function(){
      var a=document.querySelector('a.card');
      var r=a.getBoundingClientRect();
      a.scrollIntoView({block:'center'});
      await new Promise(x=>setTimeout(x,300));
      var rr=a.getBoundingClientRect();
      return {x:Math.round(rr.left+rr.width/2),y:Math.round(rr.top+rr.height/2)};
    })()`);
    // 真实可信点击（CDP Input 层，产生真 click 触发 <a> 导航），坐标元素中心像素
    await s.trustedClick('a.card', Math.round((await s.q("document.querySelector('a.card').getBoundingClientRect().width"))/2), 60);
    await H.waitMs(1600);
    const loc = await s.q("location.pathname.split('/').pop()");
    const errs2 = await s.realErrors();
    console.log('afterTapLoc    ::', loc);
    console.log((loc && loc.indexOf('ink-particles')===0?'PASS':'FAIL')+' cardTapNavigates');
    console.log((errs2.length===0?'PASS':'FAIL')+' zeroRealErrorsOnWork :: '+JSON.stringify(errs2));
    await s.shot('work_from_'+label);
  } finally { await s.kill(); }
}

(async()=>{
  await run('m390',390,844,true);
  await run('desk',1280,720,false);
  await H.cleanup();
})();
