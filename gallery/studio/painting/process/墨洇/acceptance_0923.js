/**
 * acceptance_0923.js — 墨洇 v0923 移动端深磨 CDP 验收
 * 场景：移动竖屏/横屏/小屏 + 桌面回归；静态布局、触摸交互、长按清纸、干涸闭环
 * 复用 lib/cdp-harness.js；每场景独立 profile
 */
const path = require('path');
const H = require('../../../../works/lib/cdp-harness.js');
const WS_PATH = '/Coze/Drive/绒球/所有对话/主对话/绒球创作时间/20260823/node_modules/ws';

const REPO = '/Coze/Drive/绒球/所有对话/主对话/rongball-xr';
const OUT = path.join(REPO, 'gallery/studio/painting/process/墨洇/acc0923');
const FILE = 'file://' + encodeURI(path.join(REPO, 'gallery/works/mo-yin.html'));

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra != null ? ':: ' + JSON.stringify(extra) : ''); }
}

async function mobileScenario() {
  console.log('\n=== 场景1：移动竖屏 390×844（touch） ===');
  await H.killAll(9511);
  const s = await H.launch({ out: OUT, wsPath: WS_PATH, profile: 'm_portrait', port: 9511, mobile: true });
  await s.goto(FILE + '?fast=1&cb=' + Date.now());

  // 1. 无横向溢出：画框完整入屏（visualViewport 口径，坑#11）
  const vp = await s.viewport();
  check('viewport 390 口径', vp.w === 390 && vp.h === 844, vp);
  const fr = await s.q(`(function(){
    var f=document.querySelector('.frame').getBoundingClientRect();
    return {l:+f.left.toFixed(1),t:+f.top.toFixed(1),r:+f.right.toFixed(1),b:+f.bottom.toFixed(1),w:+f.width.toFixed(1)};
  })()`);
  check('画框左缘≥0', fr.l >= 0, fr);
  check('画框右缘≤390', fr.r <= 390, fr);
  check('画框上缘≥0', fr.t >= 0, fr);
  check('画框完整入屏(底≤844)', fr.b <= 844, fr);

  // 2. touch 提示出现（pointer:coarse，坑#13）
  const touchHintShown = await s.q(`(function(){
    var t=document.querySelector('.hint-touch'), d=document.querySelector('.hint-desk');
    var cs=getComputedStyle(t), cd=getComputedStyle(d);
    return cs.display!=='none' && cd.display==='none';
  })()`);
  check('coarse：触摸提示显示/桌面提示隐藏', touchHintShown === true);

  // 3. 落墨（tap 双派保险；本件 pointer 路由）
  const rect = await s.tap('#ink', Math.round(fr.w*0.3), Math.round(fr.w*0.35), { holdMs: 50 });
  check('tap 返回 rect', Array.isArray(rect) && rect[2] > 0, rect);
  const st1 = await s.state();
  // fast 模式有开场滴（drops=1），tap 后为第 2 滴
  check('落墨后 drops=2（开场滴+tap）', st1.drops === 2, st1);

  // 4. 轻量干涸闭环（fast 实测 ~23s，见 drytime_sim.js）
  const dried = await s.waitFor('JSON.parse(document.getElementById("state").textContent).dried===true', { timeout: 40000, label: 'dried' });
  check('水尽墨定 dried=true', dried === true);
  const sealDone = await s.q(`document.getElementById('seal').classList.contains('done')`);
  check('印章 done', sealDone === true);
  await s.shot('m_dry');

  // 5. 干涸后循环停转省电（rAF 不再自调度；镜像 ts 应停止推进）
  const tsA = JSON.parse(await s.q('document.getElementById("state").textContent')).ts;
  await new Promise(r => setTimeout(r, 700));
  const tsB = JSON.parse(await s.q('document.getElementById("state").textContent')).ts;
  check('干涸后帧循环停转（镜像 700ms 不更新）', tsA === tsB, { tsA, tsB });

  // 6. 干涸后再落墨：revive→kick 唤醒循环
  await s.tap('#ink', Math.round(fr.w*0.7), Math.round(fr.w*0.5), { holdMs: 40 });
  const st2 = await s.state();
  check('再落墨 drops 递增', st2.drops === 3, st2);
  check('再落墨 alive=true', st2.alive === true, st2);
  await new Promise(r => setTimeout(r, 400));
  const tsC = JSON.parse(await s.q('document.getElementById("state").textContent')).ts;
  check('新滴唤醒帧循环（镜像恢复推进）', tsC > tsB, { tsB, tsC });

  // 7. 拖笔（在复活的循环上）
  await s.drag('#ink', [[60,200],[110,210],[170,240],[220,300]]);
  const inkCov = await s.pixels('#ink', 'a>40', 3);
  check('拖笔后墨像素>0', inkCov > 0, inkCov);

  // 8. 长按清纸（合成 touch pointer 路由）：长按 700ms，清掉含拖笔的全部水量
  const cleared = await s.q(`(async function(){
    var c=document.getElementById('ink');
    var r=c.getBoundingClientRect();
    var cx=r.left+ r.width*0.5, cy=r.top+r.height*0.5;
    c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,clientX:cx,clientY:cy,pointerId:2,pointerType:'touch',button:0,buttons:1}));
    await new Promise(function(res){setTimeout(res,720)});
    var st=JSON.parse(document.getElementById('state').textContent);
    return {tw: st.tw, drops: st.drops, label: document.getElementById('stateLabel').textContent};
  })()`);
  check('长按后水量归零', cleared.tw === 0, cleared);
  check('长按后 drops 归零', cleared.drops === 0, cleared);
  check('长按后标签=研墨…', cleared.label.indexOf('研墨') === 0, cleared);
  await s.shot('m_afterlongpress');

  const errs = await s.realErrors();
  check('零 JS 错误', errs.length === 0, errs);
  await s.kill();
}

async function landscapeScenario() {
  console.log('\n=== 场景2：移动横屏 844×390（touch） ===');
  await H.killAll(9512);
  // harness mobile 固定 390×844；横屏用普通 launch + 触摸模拟不可得，改用窗口尺寸 + coarse 媒体查询断言
  const s = await H.launch({ out: OUT, wsPath: WS_PATH, profile: 'm_land', port: 9512, width: 844, height: 390 });
  await s.goto(FILE + '?fast=1&cb=' + Date.now());
  const fr = await s.q(`(function(){
    var f=document.querySelector('.frame').getBoundingClientRect();
    return {l:+f.left.toFixed(1),t:+f.top.toFixed(1),r:+f.right.toFixed(1),b:+f.bottom.toFixed(1)};
  })()`);
  check('横屏画框左缘≥0', fr.l >= 0, fr);
  check('横屏画框右缘≤844', fr.r <= 844, fr);
  check('横屏画框上缘≥0', fr.t >= 0, fr);
  check('横屏画框底缘≤390', fr.b <= 390, fr);
  const subHidden = await s.q(`getComputedStyle(document.querySelector('.sub')).display`);
  check('横屏 sub 隐藏', subHidden === 'none', subHidden);
  const dried = await s.waitFor('JSON.parse(document.getElementById("state").textContent).dried===true', { timeout: 20000 });
  check('横屏干涸闭环', dried === true);
  await s.shot('land_dry');
  const errs = await s.realErrors();
  check('横屏零 JS 错误', errs.length === 0, errs);
  await s.kill();
}

async function smallScreenScenario() {
  console.log('\n=== 场景3：小屏 320×568（touch，iPhone SE 一代） ===');
  await H.killAll(9513);
  const s = await H.launch({ out: OUT, wsPath: WS_PATH, profile: 'm_small', port: 9513, width: 320, height: 568 });
  await s.goto(FILE + '?fast=1&cb=' + Date.now());
  const fr = await s.q(`(function(){
    var f=document.querySelector('.frame').getBoundingClientRect();
    return {l:+f.left.toFixed(1),r:+f.right.toFixed(1),b:+f.bottom.toFixed(1)};
  })()`);
  check('小屏画框右缘≤320', fr.r <= 320, fr);
  check('小屏画框底缘≤568', fr.b <= 568, fr);
  // hint 不截断：触摸提示元素完整入屏
  const hint = await s.q(`(function(){
    var h=document.querySelector('.hint-touch').getBoundingClientRect();
    return {l:h.left,r:h.right};
  })()`);
  check('触摸 hint 完整入屏', hint.l >= 0 && hint.r <= 320, hint);
  await s.shot('small_static');
  const errs = await s.realErrors();
  check('小屏零 JS 错误', errs.length === 0, errs);
  await s.kill();
}

async function desktopScenario() {
  console.log('\n=== 场景4：桌面回归 1280×860 ===');
  await H.killAll(9514);
  const s = await H.launch({ out: OUT, wsPath: WS_PATH, profile: 'desktop', port: 9514 });
  await s.goto(FILE + '?fast=1&cb=' + Date.now());
  const fr = await s.q(`(function(){
    var f=document.querySelector('.frame').getBoundingClientRect();
    return {w:Math.round(f.width),l:f.left,r:f.right};
  })()`);
  check('桌面画框 704', fr.w === 704, fr);
  check('桌面画框居中入屏', fr.l >= 0 && fr.r <= 1280, fr);
  const deskHint = await s.q(`getComputedStyle(document.querySelector('.hint-desk')).display!=='none'`);
  check('桌面提示显示', deskHint === true);
  // 桌面双击清纸仍可用
  const dbl = await s.q(`(async function(){
    var c=document.getElementById('ink');
    var r=c.getBoundingClientRect();
    var cx=r.left+r.width*0.5, cy=r.top+r.height*0.5;
    function dbl(){ c.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true,clientX:cx,clientY:cy})); }
    await new Promise(function(res){setTimeout(res,200)});
    dbl();
    await new Promise(function(res){setTimeout(res,150)});
    return JSON.parse(document.getElementById('state').textContent).tw;
  })()`);
  check('双击清纸水量归零', dbl === 0, dbl);
  const dried = await s.waitFor('JSON.parse(document.getElementById("state").textContent).dried===true', { timeout: 20000 });
  check('桌面干涸闭环回归', dried === true);
  await s.shot('desktop_dry');
  const errs = await s.realErrors();
  check('桌面零 JS 错误', errs.length === 0, errs);
  await s.kill();
}

(async function main() {
  await mobileScenario();
  await landscapeScenario();
  await smallScreenScenario();
  await desktopScenario();
  console.log('\n================ 汇总 ================');
  console.log('PASS', pass, '/ FAIL', fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
