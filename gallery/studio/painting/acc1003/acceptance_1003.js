/**
 * acceptance_1003.js — P10 对齐：板块草稿新增墨洇紧凑卡后的回归验收（旧作内容迭代，非新作品）
 * 覆盖：桌面 1280（卡片数/墨洇文案/零错误）、移动 390x844（零横向溢出/墨洇卡在屏内/零错误）
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
  const desk = await H.launch({ out: OUT, profile: 'acc1003d', port: 9636, wsPath: WS });
  await desk.goto(FILE + '?cb=' + Date.now());
  await desk.waitFor('document.readyState === "complete"', { timeout: 10000 });
  check('desktop: h2=水墨互动系列', await desk.q('document.querySelector("h2").textContent') === '水墨互动系列');
  check('desktop: 3 张完整卡片', Number(await desk.q('document.querySelectorAll(".card").length')) === 3);
  check('desktop: 5 张紧凑卡', Number(await desk.q('document.querySelectorAll(".mini").length')) === 5);
  check('desktop: 引言 8 件候选', /打磨出 8 件候选/.test(await desk.q('document.querySelector(".sec-lead").textContent')));
  check('desktop: 墨洇紧凑卡存在', /墨洇/.test(await desk.q([
    'Array.prototype.map.call(document.querySelectorAll(".mini h4"),',
    'function(e){return e.textContent;}).join("|")'].join(''))));
  const deskErr = await desk.realErrors();
  check('desktop: 零 JS 错误', deskErr.length === 0, deskErr);
  await desk.shot('draft1003_desktop');
  await desk.kill();

  // 移动 390x844
  const mob = await H.launch({ out: OUT, profile: 'acc1003m', port: 9637, mobile: true, width: 390, height: 844, wsPath: WS });
  await mob.goto(FILE + '?cb=' + Date.now());
  await mob.waitFor('document.readyState === "complete"', { timeout: 10000 });
  const probe = await mob.q(`(function(){
    var moyin = Array.prototype.filter.call(document.querySelectorAll('.mini h4'),
      function(e){ return e.textContent.indexOf('墨洇') >= 0; })[0];
    var r = moyin ? moyin.getBoundingClientRect() : null;
    return { scrollW: document.documentElement.scrollWidth,
      visW: visualViewport ? Math.round(visualViewport.width) : innerWidth,
      moyinLeft: r ? Math.round(r.left) : null,
      moyinRight: r ? Math.round(r.right) : null };
  })()`);
  check('mobile: 无横向溢出', probe.scrollW <= probe.visW + 1, probe);
  check('mobile: 墨洇卡入屏', probe.moyinLeft >= 0 && probe.moyinRight <= probe.visW + 1, probe);
  const mobErr = await mob.realErrors();
  check('mobile: 零 JS 错误', mobErr.length === 0, mobErr);
  await mob.shot('draft1003_mobile');
  await mob.kill();

  console.log('\n== ' + pass + '/' + (pass + fail) + ' PASS ==');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('EXC:', e); process.exit(2); });
