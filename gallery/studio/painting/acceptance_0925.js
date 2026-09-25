/**
 * 验收 0925：芦花 / 秋虫 横屏布局深磨（迭代旧作，非新件）
 * 覆盖：横屏844x390、竖屏390x844回归、运行时旋转竖→横触发重建
 */
const H = require('../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const WORKS = '/app/data/所有对话/主对话/rongball-xr/gallery/works';
const OUT = __dirname + '/acc0925';

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}
async function probe(s) {
  return s.q(`(function(){
    return { vw: visualViewport?Math.round(visualViewport.width):innerWidth,
      scrollW: document.documentElement.scrollWidth };
  })()`);
}
(async () => {
  const works = [
    ['lu-hua', 'lu-hua.html', 9941],
    ['qiu-chong', 'qiu-chong-v0915.html', 9951],
  ];
  for (const [id, file, port0] of works) {
    console.log('===== ' + id + ' =====');
    const fileUrl = 'file://' + encodeURI(path.join(WORKS, file));
    let port = port0;
    await H.killAll(port);
    // 竖屏启动
    let s = await H.launch({ out: OUT, profile: id, port, mobile: true, wsPath: WS });
    await s.goto(fileUrl + '?cb=' + Date.now());
    await H.waitMs(2200);
    let p = await probe(s);
    check('竖屏 无横向溢出', p.scrollW <= p.vw);
    await s.shot(id + '_1_portrait');

    // 运行时旋转为横屏：直接改设备指标，触发页面 resize
    await s.send('Emulation.setDeviceMetricsOverride',
      { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
    await H.waitMs(900);
    p = await probe(s);
    check('旋转后 无横向溢出', p.scrollW <= 844, p);
    const errs = await s.realErrors();
    check('旋转后 零JS错误', errs.length === 0, errs.slice(0,3));
    await s.shot(id + '_2_rotated_landscape');
    await s.kill();

    // 独立横屏冷启动
    port = port0 + 1;
    await H.killAll(port);
    s = await H.launch({ out: OUT, profile: id + '_cold', port, mobile: true, width: 844, height: 390, wsPath: WS });
    await s.goto(fileUrl + '?cb=' + Date.now());
    await H.waitMs(2200);
    p = await probe(s);
    check('横屏冷启动 无横向溢出', p.scrollW <= 844, p);
    check('横屏冷启动 零JS错误', (await s.realErrors()).length === 0);
    await s.shot(id + '_3_cold_landscape');
    await s.kill();
  }
  console.log('\n==== RESULT: ' + pass + ' pass / ' + fail + ' fail ====');
  process.exit(fail ? 1 : 0);
})();
