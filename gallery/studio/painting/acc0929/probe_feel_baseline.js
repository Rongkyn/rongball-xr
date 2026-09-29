/**
 * probe_feel_baseline.js — 交互手感基线探针（0929，7 件作品集候选，旧作审计非新件）
 * 双端（桌面 1280x860 / 移动 390x844 touch）只读采集：
 *  ① canvas backing vs CSS 尺寸（坐标映射是否 1:1）
 *  ② touch-action / cursor 口径
 *  ③ hint 文案与是否出屏截断
 *  ④ #state 镜像字段
 *  ⑤ body 是否可滚动、横向溢出
 * 用法：node probe_feel_baseline.js
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;

const WORKS = [
  ['ink-garden', 'ink-garden.html', '#scene'],
  ['can-he', 'can-he.html', '#pond'],
  ['ting-mo', 'ting-mo.html', '#ink'],
  ['lu-hua', 'lu-hua.html', '#scene'],
  ['gui-yu', 'gui-yu.html', '#scene'],
  ['yue-bo', 'yue-bo-v0916.html', '#scene'],
  ['qiu-chong', 'qiu-chong-v0915.html', '#scene'],
];

function COLLECT(sel) {
  return `(function(){
  var c=document.querySelector(${JSON.stringify(sel)});
  if(!c) return {missing:true};
  var cs=getComputedStyle(c);
  var r=c.getBoundingClientRect();
  var hint=document.querySelector('.hint');
  var hr=hint?hint.getBoundingClientRect():null, hcs=hint?getComputedStyle(hint):null;
  var st=document.getElementById('state');
  var body=document.body, docEl=document.documentElement;
  return {
    cw:c.width, ch:c.height,
    cssW:Math.round(r.width), cssH:Math.round(r.height),
    rectLeft:Math.round(r.left), rectTop:Math.round(r.top), rectRight:Math.round(r.right), rectBottom:Math.round(r.bottom),
    touchAction:cs.touchAction, cursor:cs.cursor,
    ratioX:+(c.width/r.width).toFixed(3), ratioY:+(c.height/r.height).toFixed(3),
    inScreen: r.left>=-1 && r.top>=-1 && r.right<=window.innerWidth+1 && r.bottom<=window.innerHeight+1,
    hint: hint ? {text:hint.textContent.trim().slice(0,90), fs:hcs.fontSize,
                  clipped: hr.right > window.innerWidth+1 || hr.left < -1,
                  hr:{l:Math.round(hr.left),r:Math.round(hr.right),t:Math.round(hr.top),b:Math.round(hr.bottom)},
                  h:Math.round(hr.height)} : null,
    stateText: st ? st.textContent.trim().slice(0,200) : null,
    scrollW: docEl.scrollWidth, clientW: docEl.clientWidth,
    canScrollV: docEl.scrollHeight > window.innerHeight+1,
    bodyOverflowX: getComputedStyle(body).overflowX,
    vw: window.innerWidth, vh: window.innerHeight,
    vvw: visualViewport ? Math.round(visualViewport.width) : null
  };
})()`;
}

async function probe(work, mobile, port) {
  const [name, file, sel] = work;
  const tag = name + (mobile ? ':m' : ':d');
  await H.killAll(port);
  const s = await H.launch({
    out: OUT, profile: 'p29' + (mobile ? 'm' : 'd') + '-' + name,
    wsPath: WS, port, mobile,
    width: mobile ? 390 : 1280, height: mobile ? 844 : 860,
  });
  const full = path.join(__dirname, '..', '..', '..', 'works', file);
  await s.goto('file://' + encodeURI(full) + '?fast=1&cb=' + Date.now());
  await s.waitFor('document.readyState==="complete"', { timeout: 12000 });
  await H.waitMs(500);
  const r = await s.q(COLLECT(sel));
  const errs = await s.realErrors();
  r.tag = tag;
  r.errors = errs.slice(0, 4);
  await s.kill();
  return r;
}

(async () => {
  const all = [];
  let port = 9801;
  for (const w of WORKS) {
    const d = await probe(w, false, port++);
    const m = await probe(w, true, port++);
    all.push(d, m);
    console.log('== ' + w[0] + ' ==');
    console.log(' d: backing=' + d.cw + 'x' + d.ch + ' css=' + d.cssW + 'x' + d.cssH +
      ' ratio=' + d.ratioX + '/' + d.ratioY + ' cursor=' + d.cursor + ' inScreen=' + d.inScreen +
      ' canScrollV=' + d.canScrollV + ' hintClipped=' + (d.hint && d.hint.clipped) + ' errs=' + d.errors.length);
    console.log(' m: backing=' + m.cw + 'x' + m.ch + ' css=' + m.cssW + 'x' + m.cssH +
      ' ratio=' + m.ratioX + '/' + m.ratioY + ' touchAction=' + m.touchAction + ' inScreen=' + m.inScreen +
      ' canScrollV=' + m.canScrollV + ' hintClipped=' + (m.hint && m.hint.clipped) +
      ' errs=' + m.errors.length);
    if (m.hint) console.log('    hint(fs=' + m.hint.fs + ',h=' + m.hint.h + '): ' + m.hint.text);
    if (m.stateText) console.log('    state: ' + m.stateText);
    if (m.errors.length) console.log('    M ERRORS: ' + JSON.stringify(m.errors));
  }
  fs.writeFileSync(path.join(OUT, 'baseline_result.json'), JSON.stringify(all, null, 1));
  console.log('\nsaved baseline_result.json');
  process.exit(0);
})();
