/**
 * 验收 0922：桂雨 gui-yu / 月波 yue-bo 移动端深磨
 * 场景：竖屏 390x844（静态+交互）、横屏 844x390、小屏 320x568、桌面 1280x860 回归
 */
const H = require('../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const WORKS = '/app/data/所有对话/主对话/rongball-xr/gallery/works';
const OUT = __dirname + '/acc0922';

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

const fireTouch = s => (x, y) => s.q(`(function(){
  var c=document.getElementById('scene');
  var r=c.getBoundingClientRect();
  c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,
    clientX:r.left+${x},clientY:r.top+${y},pointerId:1,pointerType:'touch',button:0,buttons:1}));
  return 1;
})()`);

async function layoutProbe(s) {
  return s.q(`(function(){
    function R(sel){var e=document.querySelector(sel);if(!e)return null;var r=e.getBoundingClientRect();
      return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)];}
    var vp=visualViewport;
    return {
      vw: vp?Math.round(vp.width):innerWidth, vh: vp?Math.round(vp.height):innerHeight,
      scrollW: document.documentElement.scrollWidth,
      poem: R('#poem'), hint: R('.hint'), seal: R('.seal'),
      hintVisible: getComputedStyle(document.querySelector('.hint')).display
    };
  })()`);
}

function overlap(a,b){ return !(a[2]<=b[0]||b[2]<=a[0]||a[3]<=b[1]||b[3]<=a[1]); }

(async () => {
  const works = [
    ['gui-yu', 'gui-yu.html'],
    ['yue-bo', 'yue-bo-v0916.html'],
  ];
  for (const [id, file] of works) {
    console.log('===== ' + id + ' =====');
    const fileUrl = 'file://' + encodeURI(path.join(WORKS, file));

    // ---- 竖屏 390x844：静态布局（hint/seal 此刻未显示，只验入屏与溢出）----
    let port = id==='gui-yu'?9801:9811;
    await H.killAll(port);
    let s = await H.launch({ out: OUT, profile: id+'_p', port, mobile: true, wsPath: WS });
    await s.goto(fileUrl + '?cb=' + Date.now());
    await H.waitMs(2200);
    let L = await layoutProbe(s);
    check('竖屏 无横向溢出', L.scrollW <= L.vw, {scrollW:L.scrollW,vw:L.vw});
    check('竖屏 诗完整入屏', L.poem && L.poem[0]>=-1 && L.poem[2]<=L.vw+1 && L.poem[1]>=-1 && L.poem[3]<=L.vh+1, L.poem);
    await s.shot(id+'_portrait');
    const errs1 = await s.realErrors();
    check('竖屏 零 JS 错误', errs1.length===0, errs1);

    // ---- 竖屏：触摸交互（须真生效，触发 audio + 场景状态）----
    const tap = fireTouch(s);
    if (id==='gui-yu') {
      // 树冠区偏左上（hub 含外扩），点 (120,300) 期望摇树落花
      await tap(120, 300);
      await H.waitMs(900);
      const st = await s.state();
      check('竖屏 点树摇枝落花 spawned>0', st.spawned > 0, {spawned:st.spawned});
      check('竖屏 audio 已初始化', st.audio === true);
      // 地面点按出涟漪/落声
      await tap(200, L.vh - 80);
      await H.waitMs(600);
      const st2 = await s.state();
      check('竖屏 点地 drops 增加', st2.drops > st.drops, {drops:[st.drops,st2.drops]});
    } else {
      // 月波：点月影倒影（月亮 x≈281，倒影在其正下方水面）碎月影
      await tap(281, 680);
      await H.waitMs(900);
      const st = await s.state();
      check('竖屏 点水碎月影 shard>0', st.shard > 0, st);
      check('竖屏 audio 已初始化', st.audio === true);
      // 点天：云走开
      await tap(60, 120);
      await H.waitMs(700);
      const st2 = await s.state();
      check('竖屏 点天有响应', st2.audio === true);
    }

    // 等静场：诗+印章显示后，验印章与 hint 不同屏重叠（hint 已淡出则跳过重叠，但位置不叠）
    await H.waitMs(14000);
    const stS = await s.state();
    L = await layoutProbe(s);
    check('静场 诗已显示', stS.poemShown === true);
    if (L.seal && L.hint) {
      // 竖屏印章 bottom:76，hint bottom:26：纵向区间应分离
      check('竖屏 印章与 hint 不重叠', !overlap(L.seal, L.hint), {seal:L.seal,hint:L.hint});
    }
    await s.shot(id+'_settled');
    await s.kill();

    // ---- 横屏 844x390 ----
    port = id==='gui-yu'?9802:9812;
    await H.killAll(port);
    s = await H.launch({ out: OUT, profile: id+'_l', port, mobile: true, wsPath: WS });
    await s.goto(fileUrl + '?cb=' + Date.now());
    await s.send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
    await H.waitMs(1800);
    L = await layoutProbe(s);
    check('横屏 无横向溢出', L.scrollW <= 844, L.scrollW);
    check('横屏 诗完整入屏', L.poem && L.poem[2]<=845 && L.poem[3]<=391, L.poem);
    check('横屏 印章在 hint 上方不重叠', L.seal && L.hint && !overlap(L.seal,L.hint) && L.seal[3] <= L.hint[1]+1, {seal:L.seal,hint:L.hint});
    await s.shot(id+'_landscape');
    check('横屏 零 JS 错误', (await s.realErrors()).length===0, await s.realErrors());
    await s.kill();

    // ---- 小屏 320x568 ----
    port = id==='gui-yu'?9803:9813;
    await H.killAll(port);
    s = await H.launch({ out: OUT, profile: id+'_s', port, mobile: true, wsPath: WS });
    await s.goto(fileUrl + '?cb=' + Date.now());
    await s.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 2, mobile: true });
    await H.waitMs(1800);
    L = await layoutProbe(s);
    check('小屏 hint 完整入屏', L.hint && L.hint[0]>=-1 && L.hint[2]<=321 && L.hint[3]<=569, L.hint);
    check('小屏 诗完整入屏', L.poem && L.poem[0]>=-1 && L.poem[2]<=321 && L.poem[3]<=569, L.poem);
    check('小屏 无横向溢出', L.scrollW <= 320, L.scrollW);
    check('小屏 印章与 hint 不重叠', L.seal && L.hint && !overlap(L.seal,L.hint), {seal:L.seal,hint:L.hint});
    await s.shot(id+'_small');
    check('小屏 零 JS 错误', (await s.realErrors()).length===0, await s.realErrors());
    await s.kill();

    // ---- 桌面 1280x860 回归 ----
    port = id==='gui-yu'?9804:9814;
    await H.killAll(port);
    s = await H.launch({ out: OUT, profile: id+'_d', port, wsPath: WS });
    await s.goto(fileUrl + '?cb=' + Date.now());
    await H.waitMs(2000);
    L = await layoutProbe(s);
    check('桌面 无溢出', L.scrollW <= 1280, L.scrollW);
    check('桌面 诗入屏', L.poem && L.poem[2]<=1280 && L.poem[3]<=860, L.poem);
    await s.shot(id+'_desktop');
    check('桌面 零 JS 错误', (await s.realErrors()).length===0, await s.realErrors());
    await s.kill();
  }

  console.log('\\n===== TOTAL: ' + pass + ' PASS / ' + fail + ' FAIL =====');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERR', e); process.exit(2); });
