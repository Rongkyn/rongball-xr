/**
 * 基线 0925：芦花 lu-hua / 秋虫 qiu-chong 横屏布局实测
 * 背景：0924 两件移动端深磨后记录「横屏偏挤（次要，记入后续）」。
 * 场景：横屏 844x390、竖屏 390x844 回归
 */
const H = require('../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const WORKS = '/app/data/所有对话/主对话/rongball-xr/gallery/works';
const OUT = __dirname + '//_base0925';

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

async function probe(s) {
  return s.q(`(function(){
    function R(sel){var e=document.querySelector(sel);if(!e)return null;var r=e.getBoundingClientRect();
      return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)];}
    var vp=visualViewport;
    return {
      vw: vp?Math.round(vp.width):innerWidth, vh: vp?Math.round(vp.height):innerHeight,
      scrollW: document.documentElement.scrollWidth,
      title: R('.title'), poem: R('#poem'), hint: R('.hint'), seal: R('.seal')
    };
  })()`);
}

(async () => {
  const works = [
    ['lu-hua', 'lu-hua.html', 9901],
    ['qiu-chong', 'qiu-chong-v0915.html', 9911],
  ];
  for (const [id, file, port0] of works) {
    console.log('===== ' + id + ' =====');
    const fileUrl = 'file://' + encodeURI(path.join(WORKS, file));

    // 横屏 844x390
    let port = port0;
    await H.killAll(port);
    let s = await H.launch({ out: OUT, profile: id+'_l', port, mobile: true, width: 844, height: 390, wsPath: WS });
    await s.goto(fileUrl + '?cb=' + Date.now());
    await H.waitMs(2500);
    let L = await probe(s);
    check('横屏 无横向溢出', L.scrollW <= L.vw, {scrollW:L.scrollW,vw:L.vw});
    console.log('   横屏 probe:', JSON.stringify(L));
    await s.shot(id+'_landscape_844x390');
    const errs = await s.realErrors();
    check('横屏 零JS错误', errs.length === 0, errs.slice(0,3));
    await s.kill();

    // 竖屏回归 390x844
    port = port0 + 1;
    await H.killAll(port);
    s = await H.launch({ out: OUT, profile: id+'_p', port, mobile: true, wsPath: WS });
    await s.goto(fileUrl + '?cb=' + Date.now());
    await H.waitMs(2500);
    L = await probe(s);
    check('竖屏回归 无横向溢出', L.scrollW <= L.vw, {scrollW:L.scrollW,vw:L.vw});
    check('竖屏回归 零JS错误', (await s.realErrors()).length === 0);
    await s.shot(id+'_portrait_390x844');
    await s.kill();
  }
  console.log('\n==== RESULT: ' + pass + ' pass / ' + fail + ' fail ====');
  process.exit(fail ? 1 : 0);
})();
