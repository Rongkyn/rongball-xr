/**
 * baseline_1002.js — 墨洇 mo-yin 四主线缺口基线审计（2026-10-02）
 * 不重复 0923（静态/触摸/长按/干涸已覆盖）。聚焦四条主线漏本件的缺口：
 *   ① 加载性能：同步纤维场+纸底的解析/执行阻塞（Navigation Timing + longtask）
 *   ② FPS 实测：活动期真实帧率（注入 rAF 帧计数）
 *   ③ 桌面清晰度：backing 220 vs 显示 704/DPR（截图 + 放大比）
 *   ④ 四段式叙事：fast 全旅程记录 stateLabel 状态迁移
 */
const H = require('../../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE = 'file://' + encodeURI('/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/works/mo-yin.html');

let pass=0, fail=0; const fails=[];
function check(n,c,e){ if(c){pass++;console.log('  PASS '+n);}else{fail++;fails.push(n);console.log('  FAIL '+n+(e!==undefined?' :: '+JSON.stringify(e):''));} }

const RAF_HOOK = `(function(){
  window.__frames=0; window.__ft0=performance.now();
  var raf=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=function(cb){ return raf(function(t){ window.__frames++; return cb(t); }); };
})();`;

async function loadTiming(s,label){
  const t = await s.q(`(function(){
    var n=performance.getEntriesByType('navigation')[0]||{};
    var lt=performance.getEntriesByType('longtask').map(function(x){return +x.duration.toFixed(1);});
    return { start: +(n.navigationStart||0).toFixed(0),
      respEnd:+((n.responseEnd||0)).toFixed(0),
      interactive:+((n.domInteractive||0)).toFixed(0),
      dcl:+((n.domContentLoadedEventStart||0)).toFixed(0),
      complete:+((n.domComplete||0)).toFixed(0),
      parseExec:+(((n.domComplete||0)-(n.responseEnd||0))).toFixed(0),
      longtasks: lt };
  })()`);
  console.log('  ['+label+'] 加载时序(相对navStart ms): responseEnd='+t.respEnd+
    ' domInteractive='+t.interactive+' domComplete='+t.complete+' 解析+执行≈'+t.parseExec+'ms'+
    ' longtasks='+JSON.stringify(t.longtasks));
  return t;
}
async function fpsWindow(s,ms){
  await s.q(`window.__frames=0; window.__ft0=performance.now(); true`);
  await H.waitMs(ms);
  return await s.q(`+((window.__frames)/((performance.now()-window.__ft0)/1000)).toFixed(1)`);
}
async function backingInfo(s){
  return await s.q(`(function(){
    var ink=document.getElementById('ink'), paper=document.getElementById('paper');
    var ir=ink.getBoundingClientRect(), pr=paper.getBoundingClientRect();
    return { inkBack: ink.width+'x'+ink.height, inkDisp: Math.round(ir.width)+'x'+Math.round(ir.height),
      inkScale: +(ir.width/ink.width).toFixed(2), paperBack: paper.width+'x'+paper.height,
      paperDisp: Math.round(pr.width)+'x'+Math.round(pr.height), dpr: window.devicePixelRatio||1 };
  })()`);
}

(async()=>{
  /* ===== 场景1：桌面 1280 — 加载/FPS/清晰度/叙事 ===== */
  console.log('\n[场景1] 桌面 1280×860 (fast)');
  await H.killAll(9621);
  let s=await H.launch({out:__dirname,profile:'b1002_d',port:9621,wsPath:WS});
  await s.send('Page.addScriptToEvaluateOnNewDocument',{source:RAF_HOOK});
  const t0nav=Date.now();
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`document.readyState==='complete' && JSON.parse(document.getElementById('state').textContent).drops>=1`,
    {timeout:15000,label:'desk ready'});
  console.log('  goto→ready 墙钟='+(Date.now()-t0nav)+'ms');
  const lt=await loadTiming(s,'桌面');
  check('桌面 解析+执行 < 800ms', lt.parseExec<800, lt.parseExec);

  const bi=await backingInfo(s);
  console.log('  backing 信息: '+JSON.stringify(bi));
  check('桌面 ink backing=220（记录放大比）', bi.inkBack==='220x220', bi);
  check('桌面 ink 显示放大比 ≥3（块状风险）', bi.inkScale>=3, bi.inkScale);

  // FPS：活动期（开场滴刚落，tw 高）
  const fps=await fpsWindow(s,2000);
  console.log('  桌面活动期实测 FPS='+fps);
  check('桌面活动期 FPS ≥ 50', fps>=50, fps);
  await s.shot('desk_ink_detail');

  // 叙事：记录状态迁移直到干涸
  const journey=[];
  let last='';
  const driedAt=await s.waitFor((function(){}).constructor===Function?'true':'true'); // noop
  const tstart=Date.now();
  // 重新开始旅程观测：当前可能已在洇散中；轮询至 dried
  while(true){
    const cur=await s.q(`document.getElementById('stateLabel').textContent`);
    const st=await s.state();
    if(cur!==last){ journey.push({at:Date.now()-tstart, label:cur}); last=cur; }
    if(st.dried) break;
    if(Date.now()-tstart>30000) break;
    await H.waitMs(150);
  }
  console.log('  叙事状态迁移: '+JSON.stringify(journey));
  const distinct=[...new Set(journey.map(j=>j.label))];
  check('叙事为四段式（distinct labels=4）', distinct.length===4, distinct);

  // 桌面零错误
  const errs=await s.realErrors();
  check('桌面 零JS错误', errs.length===0, errs.slice(0,3));
  await s.kill();

  /* ===== 场景2：移动竖屏 390 — FPS/触摸拖笔/清晰度 ===== */
  console.log('\n[场景2] 移动竖屏 390×844 (fast)');
  await H.killAll(9622);
  s=await H.launch({out:__dirname,profile:'b1002_m',port:9622,wsPath:WS,mobile:true});
  await s.send('Page.addScriptToEvaluateOnNewDocument',{source:RAF_HOOK});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`document.readyState==='complete' && JSON.parse(document.getElementById('state').textContent).drops>=1`,
    {timeout:15000,label:'m ready'});
  const mlt=await loadTiming(s,'移动');
  check('移动 解析+执行 < 800ms', mlt.parseExec<800, mlt.parseExec);
  const mbi=await backingInfo(s);
  console.log('  移动 backing 信息: '+JSON.stringify(mbi));

  // 触摸拖笔后再测 FPS（活动+交互同时）
  await s.drag('#ink',[[50,420],[130,440],[210,400],[290,430]],{pointerType:'touch'});
  const st=await s.state();
  check('移动 触摸拖笔后水量>0.4', st.tw>0.4, st);
  const mfps=await fpsWindow(s,2000);
  console.log('  移动活动期实测 FPS='+mfps);
  check('移动活动期 FPS ≥ 40', mfps>=40, mfps);

  const vp=await s.viewport();
  const ovf=await s.q(`document.documentElement.scrollWidth<=visualViewport.width+1`);
  check('移动 无横向溢出', ovf===true, {scrollW:await s.q(`document.documentElement.scrollWidth`), vw:vp.w});
  await s.shot('m_ink_detail');
  const merr=await s.realErrors();
  check('移动 零JS错误', merr.length===0, merr.slice(0,3));
  await s.kill();

  console.log('\n================ 基线审计结果 ================');
  console.log('PASS='+pass+' FAIL='+fail);
  if(fails.length) console.log('失败/缺口项: '+fails.join(' | '));
  process.exit(fail?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
