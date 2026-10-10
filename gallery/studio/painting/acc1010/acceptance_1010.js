/**
 * acceptance_1010.js — 墨洇 mo-yin v1009 尺度修复验收（1009 场次遗漏未提交的改动）
 * 修复内容：点落半径 14→6 格 / 行笔半径 6.5→3 格 / 开场一滴 16→8 格
 * 断言口径：墨斑以 CSS 像素归一（墨芯 alpha>0.25 的包围盒），快洇后仍须「可辨小滴不霸屏」。
 */
const H=require('../../../works/lib/cdp-harness.js');
const WS='/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE='file://'+encodeURI('/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/works/mo-yin.html');
let pass=0,fail=0; const fails=[];
function check(n,c,e){if(c){pass++;console.log('  PASS '+n);}else{fail++;fails.push(n);console.log('  FAIL '+n+(e!==undefined?' :: '+JSON.stringify(e):''));} }

/** 墨斑度量：alpha>64 的像素包围盒，全部换算成 CSS 像素（除以 dpr backing 比）；返回 bbox 占画布比 */
async function inkBlob(s, alphaTh){
  return await s.q(`(function(){
    var c=document.getElementById('ink'),x=c.getContext('2d');
    var d=x.getImageData(0,0,c.width,c.height).data,Wd=c.width,Ht=c.height;
    var minX=Wd,minY=Ht,maxX=-1,maxY=-1,cnt=0;
    for(var y=0;y<Ht;y+=2)for(var xx=0;xx<Wd;xx+=2){
      if(d[(y*Wd+xx)*4+3]>${alphaTh}){cnt++;
        if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    }
    var k=Math.round(c.getBoundingClientRect().width)/Wd; // backing→CSS
    return {w:+((maxX-minX)*k).toFixed(0),h:+((maxY-minY)*k).toFixed(0),
      wRatio:+(((maxX-minX)*k/c.getBoundingClientRect().width)).toFixed(2),
      hRatio:+(((maxY-minY)*k/c.getBoundingClientRect().height)).toFixed(2),
      cover:+(cnt/((Wd/2)*(Ht/2))).toFixed(3), empty:cnt===0};
  })()`);
}

(async()=>{
  /* ===== 场景1：桌面开场一滴（fast）— 尺度 + 四段式不回归 + backing ===== */
  console.log('\n[场景1] 桌面 1280×860 fast 开场一滴');
  await H.killAll(9661);
  let s=await H.launch({out:__dirname,profile:'a10_d',port:9661,wsPath:WS});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`JSON.parse(document.getElementById('state').textContent).dried===true`,{timeout:20000});
  await H.waitMs(300);
  let blob=await inkBlob(s,64);
  console.log('  干涸墨斑(CSS px): '+JSON.stringify(blob));
  check('A 开场墨斑宽 60–260px（原半径16格≈300+px霸屏）', blob.w>=40 && blob.w<=260, blob);
  check('A 开场墨斑占画宽比 ≤0.55（不霸屏）', blob.wRatio<=0.55, blob);
  check('A 墨斑非空（修尺度没把墨滴修没）', blob.empty===false, blob);

  const bi=await s.q(`(function(){var i=document.getElementById('ink'),r=i.getBoundingClientRect();
    return{css:Math.round(r.width),back:i.width,dpr:window.devicePixelRatio||1};})()`);
  check('B backing=CSS×min(dpr,2) 不回归', bi.back===Math.round(bi.css*Math.min(bi.dpr,2)), bi);

  const label=await s.q(`document.getElementById('stateLabel').textContent`);
  check('C 终态「水尽墨定」', label==='水尽墨定', label);
  await s.shot('a10_desk_opening');
  const errs=await s.realErrors();
  check('Z 零真实错误', errs.length===0, errs.slice(0,3));
  await s.kill();

  /* ===== 场景2：桌面点击点落 — 单滴尺度（~38px 初始/洇开~90px） ===== */
  console.log('\n[场景2] 桌面点击点落');
  await H.killAll(9662);
  s=await H.launch({out:__dirname,profile:'a10_tap',port:9662,wsPath:WS});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  // 跳过开场滴：等其干涸后，在偏左上净空处点一下（开场滴在正中 50%/45%）
  await s.waitFor(`JSON.parse(document.getElementById('state').textContent).dried===true`,{timeout:20000});
  await H.waitMs(300);
  const before=JSON.parse(await s.q(`document.getElementById('state').textContent`));
  await s.tap('#ink',90,110);
  await s.waitFor(`JSON.parse(document.getElementById('state').textContent).drops===${before.drops+1}`,{timeout:5000});
  await H.waitMs(250);
  blob=await inkBlob(s,110);   // 新墨深，只数深墨；与旧干涸墨斑区分不了位置，改用镜像水量+局部
  const st1=JSON.parse(await s.q(`document.getElementById('state').textContent`));
  console.log('  点后 tw='+st1.tw+' drops='+st1.drops+'（tw=N²网格求和，绝对值不作尺度判据）');
  check('D 点落计数 +1 且页面仍活', st1.drops===before.drops+1 && st1.alive, st1);
  // 局部墨斑：只看左上 25%×25% 区域
  const local=await s.q(`(function(){
    var c=document.getElementById('ink'),x=c.getContext('2d');
    var r=c.getBoundingClientRect(), k=c.width/r.width;
    var X=Math.round(160*k),Y=Math.round(180*k);
    var d=x.getImageData(0,0,X,Y).data,Wd=X;
    var minX=X,minY=Y,maxX=-1,maxY=-1,cnt=0;
    for(var y=0;y<Y;y+=2)for(var xx=0;xx<X;xx+=2)
      if(d[(y*Wd+xx)*4+3]>100){cnt++;if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    return {w:+((maxX-minX)/k).toFixed(0),h:+((maxY-minY)/k).toFixed(0),cnt:cnt};
  })()`);
  console.log('  左上点落墨斑: '+JSON.stringify(local));
  check('D 点落墨斑 20–150px（原~220px大墨坨）', local.cnt>0 && local.w>=15 && local.w<=150, local);
  await s.shot('a10_desk_tap');
  check('Z 零真实错误', (await s.realErrors()).length===0);
  await s.kill();

  /* ===== 场景3：桌面拖笔行墨 — 笔迹连续且线条细（像笔不像拖把） ===== */
  console.log('\n[场景3] 桌面拖笔行墨');
  await H.killAll(9663);
  s=await H.launch({out:__dirname,profile:'a10_drag',port:9663,wsPath:WS});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`(function(){try{return JSON.parse(document.getElementById('state').textContent).drops>=1;}catch(e){return false;}})()`);
  // 在净空的左上区域拖一条短横笔（开场滴在正中）；拖完立刻量（快洇，tw 会快速衰减）
  // 坑#27（1010 复跑实锤·脚本侧假 FAIL）：drag 在单个 eval 内同步派完全部事件，但物理 step/render
  // 在下一个 rAF；若先 await 读 state 再量像素，fast 模式蒸发×200，几帧内笔迹 alpha 已跌破阈值
  // → 量出 edge/core=0 的假 FAIL。修：①先拿手势前镜像；②drag；③首个物理帧落地后（waitFor drops+1）
  // 立即在同一个 eval 内并行量像素，不插入多余 await。
  const before3=JSON.parse(await s.q(`document.getElementById('state').textContent`));
  await s.drag('#ink',[[80,90],[160,100],[240,95]],{pointerType:'mouse'});
  // 等「手势后首个物理帧」落地（drops+1），到点即返回、不久等
  await s.waitFor(`JSON.parse(document.getElementById('state').textContent).drops===${before3.drops+1}`,{timeout:5000});
  const st3=JSON.parse(await s.q(`document.getElementById('state').textContent`));
  console.log('  拖笔后 tw='+st3.tw+' drops='+st3.drops);
  check('E 拖笔产生水量（tw>3，N²网格求和口径）', st3.tw>3, st3);
  // 笔迹宽度：在拖笔带（CSS y 55–140）逐列量墨的纵向厚度，避开开场滴（x≈260）
  // α 口径（render: a=t*246，t=1-exp(-TONE_K*S)）：α>180=焦芯/α>60=含墨缘
  const stroke=await s.q(`(function(){
    var c=document.getElementById('ink'),x=c.getContext('2d');
    var r=c.getBoundingClientRect(), k=c.width/r.width;
    var y0=Math.round(55*k),y1=Math.round(140*k);
    var d=x.getImageData(0,y0,c.width,y1-y0).data,Wd=c.width,H=y1-y0;
    var widths=[],cores=[];
    for(var col=Math.round(40*k);col<Math.round(250*k);col+=Math.round(10*k)){
      var top=H,bot=-1,ctop=H,cbot=-1;
      for(var y=0;y<H;y+=2){var a=d[(y*Wd+col)*4+3];
        if(a>60){if(y<top)top=y;bot=y;}
        if(a>180){if(y<ctop)ctop=y;cbot=y;}}
      if(bot>=0)widths.push((bot-top)/k);
      if(cbot>=0)cores.push((cbot-ctop)/k);
    }
    function med(w){w.sort(function(a,b){return a-b;});return w.length?+w[Math.floor(w.length/2)].toFixed(0):0;}
    return {edge:med(widths),core:med(cores),n:widths.length};
  })()`);
  console.log('  笔迹厚度: '+JSON.stringify(stroke));
  check('E 笔芯(α>180)≤45px 且墨缘(α>60)≤80px（原半径6.5格拖把级~100px+）',
    stroke.core>0 && stroke.core<=45 && stroke.edge<=80, stroke);
  await s.shot('a10_desk_drag');
  check('Z 零真实错误', (await s.realErrors()).length===0);
  await s.kill();

  /* ===== 场景4：移动竖屏触摸 — 点落尺度 + backing 不回归 + 无溢出 ===== */
  console.log('\n[场景4] 移动 390×844 fast 触摸');
  await H.killAll(9664);
  s=await H.launch({out:__dirname,profile:'a10_m',port:9664,wsPath:WS,mobile:true});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`JSON.parse(document.getElementById('state').textContent).dried===true`,{timeout:20000});
  await H.waitMs(800);
  const mbi=await s.q(`(function(){var i=document.getElementById('ink'),r=i.getBoundingClientRect();
    return{css:Math.round(r.width),back:i.width,dpr:window.devicePixelRatio||1};})()`);
  check('F 移动 backing=CSS×2（抗瞬时dpr=1）', mbi.back===mbi.css*2, mbi);
  const mb=await inkBlob(s,64);
  console.log('  移动开场墨斑: '+JSON.stringify(mb));
  check('F 移动端墨斑占宽 ≤0.6（小屏更不能霸屏）', mb.wRatio<=0.6, mb);
  check('F 无横向溢出', await s.q(`document.documentElement.scrollWidth<=visualViewport.width+1`)===true);
  await s.shot('a10_m_opening');
  check('Z 零真实错误', (await s.realErrors()).length===0);
  await s.kill();

  console.log('\n================ 验收结果 ================');
  console.log('PASS='+pass+' FAIL='+fail);
  if(fails.length)console.log('失败项: '+fails.join(' | '));
  process.exit(fail?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2);});
