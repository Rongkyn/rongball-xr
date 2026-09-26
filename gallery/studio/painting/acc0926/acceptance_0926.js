/**
 * acceptance_0926.js — 验证 P10 四段式叙事 HTML 板块草稿加载零错误（旧作能力，非新作品）
 * 覆盖：桌面 1280、移动 390x844（零横向溢出、零 JS 错误）
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const FILE = 'file://' + encodeURI(path.join(__dirname, '..', 'process', '_portfolio_section_draft_0926.html'));

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

(async () => {
  // 桌面
  const desk = await H.launch({ out: OUT, profile: 'acc0926d', port: 9626, wsPath: WS });
  await desk.goto(FILE + '?cb=' + Date.now());
  await desk.waitFor('document.readyState === "complete"', { timeout: 10000 });
  check('desktop: h2=水墨互动系列', await desk.q('document.querySelector("h2").textContent') === '水墨互动系列');
  check('desktop: 3 张完整卡片', Number(await desk.q('document.querySelectorAll(".card").length')) === 3);
  check('desktop: 4 张紧凑卡', Number(await desk.q('document.querySelectorAll(".mini").length')) === 4);
  const deskErr = await desk.realErrors();
  check('desktop: 零 JS 错误', deskErr.length === 0, deskErr);
  await desk.shot('draft_desktop');
  await desk.kill();

  // 移动 390x844
  const mob = await H.launch({ out: OUT, profile: 'acc0926m', port: 9627, mobile: true, width: 390, height: 844, wsPath: WS });
  await mob.goto(FILE + '?cb=' + Date.now());
  await mob.waitFor('document.readyState === "complete"', { timeout: 10000 });
  const probe = await mob.q(`(function(){
    return { scrollW: document.documentElement.scrollWidth,
      visW: visualViewport ? Math.round(visualViewport.width) : innerWidth };
  })()`);
  check('mobile: 无横向溢出', probe.scrollW <= probe.visW + 1, probe);
  const mobErr = await mob.realErrors();
  check('mobile: 零 JS 错误', mobErr.length === 0, mobErr);
  await mob.shot('draft_mobile');
  await mob.kill();

  console.log('\n== ' + pass + '/' + (pass + fail) + ' PASS ==');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('EXC:', e); process.exit(2); });
