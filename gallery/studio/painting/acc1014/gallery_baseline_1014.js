/**
 * 挂廊 gallery/index.html 招聘方可读性基线审计 — 2026-10-14
 *
 * 背景：1013 全量真触摸回归 24/24 后，21 件作品本体技术闸口清空、卡主人实机；
 * 但挂廊入口 gallery/index.html 本身从未做过双端专项审计——它是招聘方（字节视觉/
 * 产品）第一落点，属 BOARD 优先级②「移动端 / 交互手感」+ BACKLOG P13 双端可公开访问。
 *
 * 三档：移动 390x844@2 / 桌面 1280x720@1 / 横屏 844x390@2（移动模拟）
 * 探针：加载完整、零真实错误、横向溢出（以 visualViewport 为准，坑#11）、
 *       21 卡账实、计数文案一致性、封面 canvas 首帧已绘制、链接相对可达、
 *       hero/section 文案。
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');

const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const GALLERY = path.join(__dirname, '..', '..', '..', 'index.html');

const PROBE = `(function(){
  var vv = window.visualViewport || {width:innerWidth,height:innerHeight};
  var cards = Array.prototype.slice.call(document.querySelectorAll('a.card'));
  var covers = Array.prototype.slice.call(document.querySelectorAll('.cover canvas'));
  function nonDefault(cv){
    try{
      // 坑（1014 自查）：只采左上角 8x8 会对「内容不在角落」的封面假阴性
      // （山水在画面下半、粒子随机）。改为全画布抽样，统计非透明像素占比。
      var cx = cv.getContext('2d');
      var d = cx.getImageData(0,0,cv.width,cv.height).data;
      var n=0;
      for(var i=3;i<d.length;i+=4*6){ if(d[i]>12) n++; }
      return n >= 40;   // 抽样点中至少 40 个有实色，视为已绘制
    }catch(e){return 'ERR:'+e.message;}
  }
  var de = document.documentElement;
  var overflowX = de.scrollWidth - Math.round(vv.width);
  var offenders = [];
  document.querySelectorAll('body *').forEach(function(el){
    var r = el.getBoundingClientRect();
    if(r.right > vv.width + 1 && r.width > 0 && r.height > 0){
      offenders.push(el.tagName+'.'+((el.className&&el.className.toString().split(' ')[0])||'')+
        ' right='+Math.round(r.right)+' w='+Math.round(r.width));
    }
  });
  var links = cards.map(function(a){ return a.getAttribute('href'); });
  var h2 = (document.querySelector('.section-head h2')||{}).textContent||'';
  var count = (document.querySelector('.section-head .count')||{}).textContent||'';
  var desc = (document.querySelector('header.hero .desc')||{}).textContent||'';
  return {
    ready: document.readyState,
    vw: vv.width, vh: vv.height,
    scrollW: de.scrollWidth, overflowX: overflowX,
    offenders: offenders.slice(0,8), offenderN: offenders.length,
    cardN: cards.length,
    coverN: covers.length,
    coversPainted: covers.map(function(c){
      return {w:c.width,h:c.height,painted:nonDefault(c)};
    }),
    allLinksRelative: links.every(function(h){return h && h.indexOf('works/')===0;}),
    h2: h2.trim(), count: count.trim(),
    heroText: desc,
    heroSaysSeven: /七件/.test(desc),
    countSays20: /20 Pieces/.test(count) || /二十则/.test(h2),
  };
})()`;

async function audit(mobile, w, h, label, port){
  await H.killAll(port); await H.waitMs(300);
  const profile = 'fg1014-' + label;
  const s = await H.launch({ out: OUT, profile, wsPath: WS, port, mobile, width:w, height:h });
  await s.goto('file://' + encodeURI(GALLERY) + '?cb=' + Date.now());
  await s.waitFor("document.readyState === 'complete' || document.readyState === 'interactive'", {timeout:8000});
  await s.waitFor("document.querySelectorAll('a.card').length >= 21", {timeout:8000});
  await H.waitMs(1800);
  const r = await s.q(PROBE);
  const errs = await s.realErrors();
  await s.shot('baseline_' + label);
  try { await s.send('Browser.close'); } catch(e){}
  return { label, mobile, w, h, probe: r, realErrors: errs };
}

(async () => {
  const results = [];
  const cases = [
    [true, 390, 844, 'm390', 9314],
    [false, 1280, 720, 'desk', 9324],
    [true, 844, 390, 'land', 9334],
  ];
  for (const [mob,w,h,label,port] of cases){
    let r = null;
    for (let attempt=0; attempt<3 && !r; attempt++){
      try { r = await audit(mob,w,h,label,port+attempt*100); }
      catch(e){ console.error('['+label+'] attempt'+attempt+' FAIL', e.message); await H.waitMs(800); }
    }
    results.push(r);
    await H.waitMs(500);
  }
  fs.writeFileSync(path.join(OUT,'gallery_baseline_1014_result.json'), JSON.stringify(results,null,2));

  let pass=0, fail=0;
  for (const r of results){
    if(!r){ console.log('SCENE MISSING'); fail++; continue; }
    const p=r.probe; const checks=[];
    function chk(name, ok, detail){ checks.push({name,ok:!!ok,detail}); ok?pass++:fail++; }
    chk('ready', p.ready==='complete'||p.ready==='interactive', p.ready);
    chk('zeroRealErrors', (!r.realErrors || r.realErrors.length===0), JSON.stringify(r.realErrors||[]));
    chk('cardN=21', p.cardN===21, p.cardN);
    chk('noHorizontalOverflow', p.overflowX<=1 && p.offenderN===0,
        'overflowX='+p.overflowX+' offenders='+p.offenderN+' '+JSON.stringify(p.offenders.slice(0,3)));
    chk('allLinksWorksRelative', p.allLinksRelative, '');
    // 7 张实时 canvas 封面：加载后立即 rAF/draw，首帧后应有非透明像素
    const paintedOk = p.coverN===7 && p.coversPainted.every(c=>c.painted===true);
    chk('coversPainted(7canvas)', paintedOk, 'coverN='+p.coverN+' unpainted='+JSON.stringify(p.coversPainted.filter(c=>c.painted!==true)));
    // 计数账实：21 卡 ↔ hero「二十一件」↔ section「二十一件 / 21 Pieces」
    chk('copyCountConsistent(21)', !p.countSays20 && /二十一件/.test(p.h2) && /21 Pieces/.test(p.count), p.h2+' / '+p.count);
    chk('heroCountSays21', /二十一件/.test(p.heroText||'')===true, p.heroText);
    checks.push({name:'INFO heroOldSevenRemoved', ok:true, detail:String(p.heroSaysSeven)});
    console.log('\n=== '+r.label+' ('+r.w+'x'+r.h+') ===');
    for(const c of checks) console.log((c.ok?'PASS ':'FAIL ')+c.name+(c.detail!==undefined&&c.detail!==''?'  :: '+c.detail:''));
  }
  console.log('\nTOTAL pass='+pass+' fail='+fail);
  process.exit(fail?1:0);
})();
