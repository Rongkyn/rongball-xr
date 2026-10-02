/**
 * acceptance_1002.js — 墨洇 v1002 迭代后验收（v2：修测试时序盲区 + DPR 已作品侧修复）
 * 关键：导航前注入「页面内迁移记录器」，连 goto 静默 2s 内的 stateLabel 变化也完整捕获；
 *       FPS 计时器自包含，不依赖 hook 外变量。
 */
const H=require('../../../../works/lib/cdp-harness.js');
const WS='/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE='file://'+encodeURI('/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/works/mo-yin.html');
let pass=0,fail=0; const fails=[];
function check(n,c,e){if(c){pass++;console.log('  PASS '+n);}else{fail++;fails.push(n);console.log('  FAIL '+n+(e!==undefined?' :: '+JSON.stringify(e):''));} }

/* 导航前注入：帧计数 + 状态迁移记录器（MutationObserver 抓 #stateLabel 文本，页面自己计时） */
const PRE=`(function(){
  window.__frames=0; window.__ft0=performance.now();
  var raf=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=function(cb){return raf(function(t){window.__frames++;return cb(t);});};
  window.__seq=[];
  document.addEventListener('DOMContentLoaded',function(){
    var el=document.getElementById('stateLabel');
    function rec(){ window.__seq.push({t:+performance.now().toFixed(0), label:el.textContent}); }
    rec();
    new MutationObserver(rec).observe(el,{childList:true,characterData:true,subtree:true});
  });
})();`;
async function fpsWindow(s,ms){
  await s.q(`window.__frames=0;window.__ft0=performance.now();true`);
  await H.waitMs(ms);
  return await s.q(`+((window.__frames)/((performance.now()-window.__ft0)/1000)).toFixed(1)`);
}
async function edgeSmoothness(s){
  return await s.q(`(function(){
    var c=document.getElementById('ink'),x=c.getContext('2d');
    var d=x.getImageData(0,0,c.width,c.height).data,Wd=c.width;
    var cy=Math.round(c.height*0.45),row=[];
    for(var xx=0;xx<Wd;xx++)row.push(d[(cy*Wd+xx)*4]);
    var a=row.findIndex(function(v){return v<200;}),b=a;
    while(b<row.length&&row[b]>70)b++;
    var jumps=0,steps=0,plateau=0;
    for(var k=a+1;k<=b&&k<row.length;k++){var dd=Math.abs(row[k]-row[k-1]);steps++;
      if(dd===0)plateau++; if(dd>=6)jumps++;}
    return {bandLen:b-a,plateauRatio:+(plateau/Math.max(1,steps)).toFixed(2),
      bigJumpRatio:+(jumps/Math.max(1,steps)).toFixed(2)};
  })()`);
}

(async()=>{
  /* ===== 场景1：桌面 fast — backing/平滑度/四段式/FPS ===== */
  console.log('\n[场景1] 桌面 1280×860 fast');
  await H.killAll(9651);
  let s=await H.launch({out:__dirname,profile:'v2_d',port:9651,wsPath:WS});
  await s.send('Page.addScriptToEvaluateOnNewDocument',{source:PRE});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`JSON.parse(document.getElementById('state').textContent).dried===true`,{timeout:20000});
  await H.waitMs(200);
  const bi=await s.q(`(function(){var i=document.getElementById('ink'),r=i.getBoundingClientRect();
    return{css:Math.round(r.width),back:i.width,dpr:window.devicePixelRatio||1};})()`);
  check('A 桌面 backing=CSS×dpr', bi.back===Math.round(bi.css*Math.min(bi.dpr,2)), bi);

  // 用页面内记录器读完整迁移（含 goto 静默期）
  const seq=await s.q(`window.__seq.map(function(x){return x.label;})`);
  const uniq=[]; seq.forEach(l=>{ if(uniq[uniq.length-1]!==l) uniq.push(l); });
  console.log('  fast 完整迁移(去重相邻): '+JSON.stringify(uniq));
  check('C fast 依次：洇散中→墨色沉定→水尽墨定',
    uniq[0]==='洇散中…' && uniq.includes('墨色沉定…') && uniq[uniq.length-1]==='水尽墨定' &&
    uniq.indexOf('墨色沉定…')<uniq.indexOf('水尽墨定'), uniq);
  await s.shot('v2_desk_final');

  // 平滑度：重开一次新 fast 旅程测墨缘（当前已干涸墨芯渡带仍在，先试当前帧）
  const es=await edgeSmoothness(s);
  console.log('  干涸帧墨缘: '+JSON.stringify(es));
  check('D 墨缘无阶梯 bigJumpRatio<0.18', es.bigJumpRatio<0.18, es);
  const errs=await s.realErrors();
  check('E 桌面零错误', errs.length===0, errs.slice(0,3));
  await s.kill();

  /* ===== 场景1b：桌面活动期 FPS（新 fast 旅程，落滴后立即测） ===== */
  console.log('\n[场景1b] 桌面活动期 FPS');
  await H.killAll(9652);
  s=await H.launch({out:__dirname,profile:'v2_fps',port:9652,wsPath:WS});
  await s.send('Page.addScriptToEvaluateOnNewDocument',{source:PRE});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`JSON.parse(document.getElementById('state').textContent).drops>=1`);
  const fps=await fpsWindow(s,1500);
  console.log('  桌面 FPS='+fps);
  check('E 桌面 FPS≥50', fps>=50, fps);
  await s.kill();

  /* ===== 场景2：移动竖屏 dpr2 — backing 抗 resize dpr=1 + 触摸拖笔/FPS/溢出 ===== */
  console.log('\n[场景2] 移动竖屏 390×844 fast');
  await H.killAll(9653);
  s=await H.launch({out:__dirname,profile:'v2_m',port:9653,wsPath:WS,mobile:true});
  await s.send('Page.addScriptToEvaluateOnNewDocument',{source:PRE});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`JSON.parse(document.getElementById('state').textContent).drops>=1`);
  await H.waitMs(800);  // 等 CDP resize(dpr=1) 重放过去
  const mbi=await s.q(`(function(){var i=document.getElementById('ink'),r=i.getBoundingClientRect();
    return{css:Math.round(r.width),back:i.width,dpr:window.devicePixelRatio||1};})()`);
  console.log('  移动 '+JSON.stringify(mbi));
  check('A 移动 resize 后仍 backing=CSS×2（抗dpr瞬时1）', mbi.back===mbi.css*2, mbi);

  await s.drag('#ink',[[50,420],[130,440],[210,400],[290,430]],{pointerType:'touch'});
  const st=await s.state();
  check('E 移动触摸拖笔水量>0.4', st.tw>0.4, st);
  const mes=await edgeSmoothness(s);
  check('D 移动墨缘无阶梯', mes.bigJumpRatio<0.18, mes);
  const mfps=await fpsWindow(s,1500);
  console.log('  移动 FPS='+mfps);
  check('E 移动 FPS≥40', mfps>=40, mfps);
  check('E 移动无横向溢出', await s.q(`document.documentElement.scrollWidth<=visualViewport.width+1`)===true);
  await s.shot('v2_m_detail');
  const merr=await s.realErrors();
  check('E 移动零错误', merr.length===0, merr.slice(0,3));
  await s.kill();

  /* ===== 场景3：起·研墨段（正常速度，记录器抓开场首帧） ===== */
  console.log('\n[场景3] 桌面正常速度（起→承）');
  await H.killAll(9654);
  s=await H.launch({out:__dirname,profile:'v2_n',port:9654,wsPath:WS});
  await s.send('Page.addScriptToEvaluateOnNewDocument',{source:PRE});
  await s.goto(FILE+'?cb='+Date.now());
  await s.waitFor(`window.__seq.length>=2`,{timeout:15000});
  const nseq=await s.q(`window.__seq.map(function(x){return x.label;})`);
  const nuniq=[]; nseq.forEach(l=>{if(nuniq[nuniq.length-1]!==l)nuniq.push(l);});
  console.log('  正常开场迁移: '+JSON.stringify(nuniq));
  check('C 首帧「研墨…」（起），随后「洇散中…」（承）',
    nuniq[0]==='研墨…' && nuniq[1]==='洇散中…', nuniq);
  await s.kill();

  console.log('\n================ 验收结果 ================');
  console.log('PASS='+pass+' FAIL='+fail);
  if(fails.length)console.log('失败项: '+fails.join(' | '));
  process.exit(fail?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
