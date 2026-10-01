/**
 * acceptance_1001.js — P11 首页数据亮点验收（作品集内容修正，非新作品）
 * 对象：求职准备/作品集/作品集_v0.1.html（正本在云盘，仓内 process/P11首页亮点1001/ 存快照）
 * 断言：stats 三卡 = 粉丝/赞 · 7章论文 · 20件原型；无「6 章」残留；VR 卡章数表述已修正；
 *       桌面 1280 + 移动 390x844 零横向溢出、零 JS 错误。
 * 避坑#17：中文路径必须 encodeURI。
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const FILE = 'file://' + encodeURI('/Coze/Drive/绒球/所有对话/主对话/求职准备/作品集/作品集_v0.1.html');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

async function statProbe(s) {
  return await s.q(`(function(){
    const cards=[...document.querySelectorAll('.stat')].map(c=>({
      num:c.querySelector('.num').textContent.trim(), lbl:c.querySelector('.lbl').textContent.trim()}));
    return { n:cards.length, cards,
      bodyHas6: document.body.innerText.includes('6 章'),
      roleOk: document.body.innerText.includes('论文 7 章已定稿'),
      ver: document.querySelector('.ver').textContent,
      h1: document.querySelector('.hero h1').textContent.trim() };
  })()`);
}

(async () => {
  await H.killAll(9710); await H.killAll(9711);

  // ===== 桌面 1280 =====
  const desk = await H.launch({ out: OUT, profile: 'acc1001d', port: 9710, wsPath: WS });
  await desk.goto(FILE + '?cb=' + Date.now());
  await desk.waitFor('document.readyState === "complete"', { timeout: 10000 });
  check('desktop: 非 about:blank（中文路径编码生效）', await desk.q('location.href') !== 'about:blank');
  const d = await statProbe(desk);
  check('desktop: 定位句保留', d.h1.includes('能开始创作'), d.h1);
  check('desktop: stats 三卡', d.n === 3, d.cards);
  check('desktop: 卡1=获赞1.9万·粉497', d.cards[0] && d.cards[0].num === '1.9万' && d.cards[0].lbl.includes('497'), d.cards[0]);
  check('desktop: 卡2=7章论文', d.cards[1] && d.cards[1].num === '7 章', d.cards[1]);
  check('desktop: 卡3=20件原型', d.cards[2] && d.cards[2].num === '20 件' && d.cards[2].lbl.includes('原型'), d.cards[2]);
  check('desktop: 无「6 章」残留', d.bodyHas6 === false);
  check('desktop: VR卡章数已修正', d.roleOk === true);
  check('desktop: ver行含2026-10-01', d.ver.includes('2026-10-01'), d.ver);
  const deskErr = await desk.realErrors();
  check('desktop: 零 JS 错误', deskErr.length === 0, deskErr);
  await desk.shot('p11_desktop');
  await desk.kill();

  // ===== 移动 390x844 =====
  const mob = await H.launch({ out: OUT, profile: 'acc1001m', port: 9711, mobile: true, width: 390, height: 844, wsPath: WS });
  await mob.goto(FILE + '?cb=' + Date.now());
  await mob.waitFor('document.readyState === "complete"', { timeout: 10000 });
  const ov = await mob.q(`(function(){
    return { scrollW: document.documentElement.scrollWidth,
      visW: visualViewport ? Math.round(visualViewport.width) : innerWidth };
  })()`);
  check('mobile: 无横向溢出', ov.scrollW <= ov.visW + 1, ov);
  const m = await statProbe(mob);
  check('mobile: stats 三卡且内容正确', m.n === 3 && m.cards[1] && m.cards[1].num === '7 章' && m.cards[2] && m.cards[2].num === '20 件', m.cards);
  check('mobile: 无「6 章」残留', m.bodyHas6 === false);
  const mobErr = await mob.realErrors();
  check('mobile: 零 JS 错误', mobErr.length === 0, mobErr);
  await mob.shot('p11_mobile');
  await mob.kill();

  console.log('\n== ' + pass + '/' + (pass + fail) + ' PASS ==');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('EXC:', e); process.exit(2); });
