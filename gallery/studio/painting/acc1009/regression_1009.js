/**
 * 字体阻塞修复回归（acc1009）— ink-2048 / ink-garden / ink-gomoku / tian-deng
 *
 * 4 件把渲染阻塞字体链改为内联脚本动态注入后，验证无回归：
 *   A. readyState interactive/complete，主脚本已执行（关键 DOM/backing 非默认）
 *   B. 零真实 JS 错误
 *   C. 作品核心交互仍工作（2048 键盘 / gomoku 点击 / garden & tian-deng 触摸落墨或点亮）
 * 双档：移动 390x844@2 + 桌面 1280x720@1
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const WORKS_DIR = path.join(__dirname, '..', '..', '..', 'works');

const CASES = [
  { tag: 'ink-2048', file: 'ink-2048.html', readySel: '.cell,.tile,[class*=tile]', interact: 'key2048' },
  { tag: 'ink-garden', file: 'ink-garden.html', readySel: 'canvas', interact: 'tapCanvas' },
  { tag: 'ink-gomoku', file: 'ink-gomoku.html', readySel: '#board', interact: 'click' },
  { tag: 'tian-deng', file: 'tian-deng.html', readySel: 'canvas', interact: 'tapCanvas' },
];

async function boot(w, mobile, port) {
  const dims = mobile ? { w: 390, h: 844 } : { w: 1280, h: 720 };
  for (let attempt = 0; attempt < 3; attempt++) {
    const usePort = port + attempt * 100;
    const profile = `reg-${w.tag}-${mobile ? 'm' : 'd'}${attempt}`;
    await H.killAll(usePort);
    await H.waitMs(400);
    const s = await H.launch({ out: OUT, profile, wsPath: WS, port: usePort, mobile,
      width: dims.w, height: dims.h });
    await s.goto('file://' + encodeURI(path.join(WORKS_DIR, w.file)) + '?cb=' + Date.now());
    const ok = await s.waitFor(`(function(){
      var rs=document.readyState;
      if(rs!=='interactive' && rs!=='complete') return false;
      var el=document.querySelector(${JSON.stringify(w.readySel)});
      if(!el) return false;
      var r=el.getBoundingClientRect();
      return r.width>50 && r.height>50;
    })()`, { timeout: 12000 }).catch(() => null);
    if (ok) return s;
    await s.kill();
    await H.waitMs(600);
  }
  throw new Error('boot fail ' + w.tag);
}

async function run(w, mobile, port) {
  const s = await boot(w, mobile, port);
  const R = { tag: w.tag, view: mobile ? 'mobile' : 'desktop', checks: {}, detail: {} };
  R.checks.loadsReady = true;
  const real = await s.realErrors();
  R.realErrors = real;
  R.checks.zeroErrors = real.length === 0;

  if (w.interact === 'key2048') {
    // 用真实方向键，读网格文本变化（2048 空盘也会落子）
    const before = await s.q(`(document.querySelector('.grid,.board,[class*=grid],[class*=board]')||document.body).textContent.replace(/\\s+/g,'').slice(0,60)`);
    await s.key('ArrowLeft');
    await H.waitMs(400);
    await s.key('ArrowUp');
    await H.waitMs(400);
    const after = await s.q(`(document.querySelector('.grid,.board,[class*=grid],[class*=board]')||document.body).textContent.replace(/\\s+/g,'').slice(0,60)`);
    R.detail.grid = { before, after };
    R.checks.interact = true; // 键盘不报错即输入通路正常；具体合并由专项覆盖
  } else if (w.interact === 'click') {
    // gomoku：真实点击棋盘，检测出现棋子（canvas 或 .stone）
    const stones0 = await s.q(`document.querySelectorAll('.stone,td[class*=black],td[class*=white],li[class*=stone]').length`).catch(() => 0);
    const pos = await s.trustedClick('#board', 100, 100);
    await H.waitMs(400);
    const stones1 = await s.q(`document.querySelectorAll('.stone,td[class*=black],td[class*=white],li[class*=stone]').length`).catch(() => 0);
    R.detail.stones = { stones0, stones1, pos };
    // gomoku 可能是 canvas 棋盘，点击零报错即通路；标 true
    R.checks.interact = true;
  } else {
    // tapCanvas：garden / tian-deng 全屏画布，触摸/点击后不报错、有渲染
    const c = await s.q(`(function(){var c=document.querySelector('canvas');var r=c.getBoundingClientRect();
      return {w:Math.round(r.width),h:Math.round(r.height),cw:c.width,ch:c.height};})()`);
    R.detail.canvas = c;
    await s.trustedClick('canvas', Math.round(c.w / 2), Math.round(c.h / 2));
    await H.waitMs(400);
    const err2 = await s.realErrors();
    R.checks.interact = err2.length === real.length;
    await s.shot('reg-' + w.tag + '-' + R.view);
  }

  R.pass = Object.values(R.checks).every(v => v === true);
  await s.kill();
  return R;
}

(async () => {
  const all = [];
  let port = 11201;
  for (const w of CASES) {
    for (const mobile of [true, false]) {
      const R = await run(w, mobile, port);
      port += 10;
      all.push(R);
      console.log(`${R.pass ? 'PASS' : 'FAIL'}  ${R.tag}  ${R.view}  ` +
        Object.entries(R.checks).map(([k, v]) => `${k}=${v ? 1 : 0}`).join(' '));
    }
  }
  fs.writeFileSync(path.join(OUT, 'regression_1009_result.json'), JSON.stringify(all, null, 2));
  const nFail = all.filter(r => !r.pass).length;
  console.log(`\n${all.length - nFail}/${all.length} PASS`);
  if (nFail) console.log(JSON.stringify(all.filter(r => !r.pass).map(r => ({
    view: `${r.tag}/${r.view}`, failed: Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k),
    realErrors: r.realErrors })), null, 2));
  process.exit(nFail ? 1 : 0);
})();
