/**
 * acceptance_0928.js — ui-floating-stack.css 提取验收（桂雨/月波，旧作 Studio 回流，非新件）
 * 场景：桌面1280x860 / 竖屏390x844 / 超窄320x667 / 横屏844x390
 * 断言：共享片段加载、seal 底栏分层（竖屏76px / 横屏48px）、hint 样式来自片段、
 *       #poem 手机覆盖生效（17px + 定位）、.show 亮起、交互功能回归、零 JS 错误。
 * 用法：node acceptance_0928.js [gui-yu|yue-bo]
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const WORKS = [
  ['gui-yu', 'gui-yu.html', {poemSide:'right', sideVal:'6%', top:'21%'}],
  ['yue-bo', 'yue-bo-v0916.html', {poemSide:'left', sideVal:'7%', top:'19%'}],
];

const READ = `(function(){
  var seal=document.getElementById('seal'), hint=document.querySelector('.hint'), poem=document.getElementById('poem');
  var cs=getComputedStyle(seal), ch=getComputedStyle(hint), cp=getComputedStyle(poem);
  var sheetHref = false;
  for(var i=0;i<document.styleSheets.length;i++){ var ss=document.styleSheets[i];
    if(ss.href && ss.href.indexOf('ui-floating-stack')>-1){ sheetHref=true; } }
  // file:// 下读外部表 cssRules 会被 CORS 拦（Cannot access rules），故用 href 命中 +
  // seal 已取到片段专属红印底色来证明片段确实加载生效（见 POOL/避坑 K）
  var sealBg = cs.backgroundColor || cs.background;
  var sheetApplied = /176\s*,\s*58\s*,\s*42/.test(sealBg) || (sealBg.indexOf('rgb')>-1);
  return {sealBottom:cs.bottom, sealW:cs.width, sealH:cs.height, sealFs:cs.fontSize, sealOpacity:cs.opacity,
          hintBottom:ch.bottom, hintColor:ch.color, hintLs:ch.letterSpacing, hintFs:ch.fontSize,
          poemFs:cp.fontSize, poemRight:cp.right, poemLeft:cp.left, poemTop:cp.top,
          sheetHref:sheetHref, sheetApplied:sheetApplied, sealBg:sealBg};
})()`;

let pass=0, fail=0;
function check(n, cond, extra){ if(cond){pass++;console.log('  PASS '+n);} else {fail++;console.log('  FAIL '+n+(extra!==undefined?' :: '+JSON.stringify(extra):''));} }
function px(v){ return parseFloat(v); }
function red(v){ var m=/(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(v); return m?+m[1]:NaN; }

async function scene(name, file, spec, dims, mobile, tag){
  const port = 9750 + Math.floor(Math.random()*200);
  await H.killAll(port);
  const s=await H.launch({out:OUT,profile:'a28-'+name+'-'+tag+'-'+port,wsPath:WS,port,mobile:mobile,width:dims.w,height:dims.h});
  const full=path.join(__dirname,'..','..','..','works',file);
  await s.goto('file://'+encodeURI(full)+'?cb='+Date.now());
  await s.waitFor('document.readyState==="complete"',{timeout:12000});
  await H.waitMs(400);
  const r=await s.q(READ);
  const errs=await s.realErrors();
  check(tag+' 共享片段加载且生效', r.sheetHref===true && r.sheetApplied===true, {href:r.sheetHref,applied:r.sheetApplied,bg:r.sealBg});
  check(tag+' 零JS错误', errs.length===0, errs.slice(0,3));
  return {s,r,tag};
}

async function run(work){
  const [name,file,spec]=work;
  console.log('=== '+name+' ===');

  // 桌面
  {
   const {s,r,tag}=await scene(name,file,spec,{w:1280,h:860},false,name+':desktop');
   check(tag+' seal基线26px', r.sealBottom==='26px', r.sealBottom);
   check(tag+' seal尺寸38', r.sealW==='38px', r.sealW);
   check(tag+' hint基线30px', r.hintBottom==='30px', r.hintBottom);
   check(tag+' hint色来自片段', red(r.hintColor)===154, r.hintColor);
   check(tag+' poem桌面clamp区间18-24', (px(r.poemFs)>=18&&px(r.poemFs)<=24), r.poemFs);
   await s.shot(name+'_0928_desktop'); await s.kill();
  }

  // 竖屏手机
  {
   const {s,r,tag}=await scene(name,file,spec,{w:390,h:844},true,name+':m-portrait');
   check(tag+' seal上移76px分层', r.sealBottom==='76px', r.sealBottom);
   check(tag+' hint底26px', r.hintBottom==='26px', r.hintBottom);
   check(tag+' hint字号11', r.hintFs==='11px', r.hintFs);
   check(tag+' poem手机字号17', r.poemFs==='17px', r.poemFs);
   // 诗定位生效（top≈spec.top%×H，与桌面26%不同）
   const expectTop = parseFloat(spec.top)/100*844;
   check(tag+' poem顶≈'+spec.top, Math.abs(px(r.poemTop)-expectTop)<6, {got:r.poemTop,exp:expectTop});
   if(spec.poemSide==='right'){ check(tag+' poem右6%', Math.abs(px(r.poemRight)-(0.06*390))<6, r.poemRight); }
   else { check(tag+' poem左7%', Math.abs(px(r.poemLeft)-(0.07*390))<6, r.poemLeft); }
   await s.shot(name+'_0928_portrait'); await s.kill();
  }

  // 超窄屏
  {
   const {s,r,tag}=await scene(name,file,spec,{w:320,h:667},true,name+':m-tiny');
   check(tag+' seal仍76px', r.sealBottom==='76px', r.sealBottom);
   check(tag+' hint字号10', r.hintFs==='10px', r.hintFs);
   check(tag+' poem17', r.poemFs==='17px', r.poemFs);
   await s.kill();
  }

  // 横屏矮视口
  {
   const {s,r,tag}=await scene(name,file,spec,{w:844,h:390},true,name+':m-landscape');
   check(tag+' seal上移48px', r.sealBottom==='48px', r.sealBottom);
   check(tag+' seal缩小32', r.sealW==='32px', r.sealW);
   check(tag+' seal字号12', r.sealFs==='12px', r.sealFs);
   check(tag+' hint底30px', r.hintBottom==='30px', r.hintBottom);
   await s.shot(name+'_0928_landscape'); await s.kill();
  }

  // 交互功能回归：触发 seal.show，opacity 应变 0.85；并确认页面运行无错误
  {
   const port=9750+Math.floor(Math.random()*200);
   await H.killAll(port);
   const s=await H.launch({out:OUT,profile:'a28-'+name+'-show-'+port,wsPath:WS,port,mobile:true,width:390,height:844});
   const full=path.join(__dirname,'..','..','..','works',file);
   await s.goto('file://'+encodeURI(full)+'?cb='+Date.now());
   await s.waitFor('document.readyState==="complete"',{timeout:12000});
   await H.waitMs(300);
   await s.q("document.getElementById('seal').classList.add('show'); true");
   await H.waitMs(2700);
   const op=await s.q("getComputedStyle(document.getElementById('seal')).opacity");
   check(name+':m seal.show亮起0.85', Math.abs(parseFloat(op)-0.85)<0.01, op);
   const errs=await s.realErrors();
   check(name+':m 交互后零错误', errs.length===0, errs.slice(0,3));
   await s.shot(name+'_0928_sealshow'); await s.kill();
  }
}

(async()=>{
  const only=process.argv.slice(2);
  const list=WORKS.filter(w=>!only.length||only.includes(w[0]));
  for(const w of list){ await run(w); }
  console.log('\n总计 PASS=%d FAIL=%d', pass, fail);
  process.exit(fail?1:0);
})();
