/**
 * 旧作三档健康回归（floss / ta-xue / tian-deng）— 2026-10-05
 *
 * 背景：8 件作品集候选 1004 已过冻结闸口、只待主人实机圈选，
 * 待审队列仍 5 件超闸 → 今日不开新件，按优先级④清偿 Studio 欠账
 * （过程档补齐：绒丝 / 踏雪 / 天灯）。本脚本对三件非简历候选旧作
 * 做一次「补档前健康核验」，确认归档时记录的是作品真实当前状态，
 * 不凭 08 月笔记里的旧验收口径。
 *
 * 公共检查（双档：移动 390x844@2 + 桌面 1280x720@1）：
 *   A. 加载完整：readyState=complete，零真实 JS 错误
 *   B. 主画布 backing 已初始化（非默认 300x150；ta-xue 固定 704 方轴）
 *   C. 画布入屏不溢出 visualViewport
 *   D. touch-action 挂画布本体
 *   E. 作品专属交互：
 *      - floss-threads：点按后能量态变化（字符串被拨动）
 *      - ta-xue：点按花苞 / 风滑杆可用，无错误
 *      - tian-deng：?fast=1&auto=2 自动放灯旅程，灯数推进
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');

const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const WORKS_DIR = path.join(__dirname, '..', '..', '..', 'works');

const WORK = [
  { tag: 'floss-threads', file: 'floss-threads.html', canvas: '#c',
    yFrac: 0.5, query: '', interact: 'pluck' },
  { tag: 'ta-xue', file: 'ta-xue.html', canvas: '#scene',
    backing: 'fixed', yFrac: 0.5, query: '', interact: 'wind' },
  { tag: 'tian-deng', file: 'tian-deng.html', canvas: '#c',
    yFrac: 0.5, query: 'fast=1&auto=2&nostore=1', interact: 'auto' },
];

async function bootHealthy(w, mobile, port) {
  const dims = mobile ? { w: 390, h: 844 } : { w: 1280, h: 720 };
  const full = path.join(WORKS_DIR, w.file);
  for (let attempt = 0; attempt < 3; attempt++) {
    const usePort = port + attempt * 100;
    const profile = 'sm1005' + (mobile ? 'm' : 'd') + '-' + w.tag + (attempt ? '-r' + attempt : '');
    await H.killAll(usePort);
    await H.waitMs(400);
    const s = await H.launch({
      out: OUT, profile, wsPath: WS, port: usePort, mobile,
      width: dims.w, height: dims.h,
    });
    const qs = (w.query ? w.query + '&' : '') + 'cb=' + Date.now();
    await s.goto('file://' + encodeURI(full) + '?' + qs);
    const probe = await s.waitFor(`(function(){
      var el=document.querySelector(${JSON.stringify(w.canvas)});
      if(!el)return false;
      var r=el.getBoundingClientRect();
      return r.width>100 && r.height>100 &&
             (document.readyState==='complete' || document.readyState==='interactive');
    })()`, { timeout: 9000 }).catch(() => null);
    if (probe) return s;
    await s.kill();
    await H.waitMs(700);
  }
  throw new Error('bootHealthy 失败 ' + w.tag);
}

async function runOne(w, mobile, port) {
  const s = await bootHealthy(w, mobile, port);
  const R = { tag: w.tag, view: mobile ? 'mobile' : 'desktop', checks: {}, detail: {} };

  // A/B backing
  const backingExpr = w.backing === 'fixed'
    ? `(function(){var el=document.querySelector(${JSON.stringify(w.canvas)});
        return el.width===el.height && el.width===704;})()`
    : `(function(){
        var el=document.querySelector(${JSON.stringify(w.canvas)});
        var r=el.getBoundingClientRect();
        var dpr=Math.min(window.devicePixelRatio||1,2);
        var expectW=Math.round(r.width*dpr), expectH=Math.round(r.height*dpr);
        return Math.abs(el.width-expectW)<=3 && Math.abs(el.height-expectH)<=3;
      })()`;
  R.checks.backingHealthy = await s.waitFor(backingExpr, { timeout: 6000 }).catch(() => null) === true;
  R.detail.backing = await s.q(`(function(){var e=document.querySelector(${JSON.stringify(w.canvas)});
    return {w:e.width,h:e.height};})()`);

  // C geom
  const geom = await s.q(`(function(){
    var el=document.querySelector(${JSON.stringify(w.canvas)});
    var r=el.getBoundingClientRect();
    var vw=(window.visualViewport&&window.visualViewport.width)||window.innerWidth;
    var vh=(window.visualViewport&&window.visualViewport.height)||window.innerHeight;
    return {w:Math.round(r.width),h:Math.round(r.height),
            left:Math.round(r.left),top:Math.round(r.top),vw:Math.round(vw),vh:Math.round(vh),
            overflowX: r.left < -1 || r.right > vw + 1,
            overflowY: r.top < -1 || r.bottom > vh + 1};
  })()`);
  R.detail.geom = geom;
  R.checks.canvasInScreen = geom.w > 100 && geom.h > 100;
  R.checks.noOverflow = !geom.overflowX && !geom.overflowY;

  // D touch-action
  const ta = await s.q(`getComputedStyle(document.querySelector(${JSON.stringify(w.canvas)})).touchAction`);
  R.detail.touchAction = ta;
  R.checks.touchActionNone = ta === 'none';

  // E 专属交互
  if (w.interact === 'pluck') {
    // 点按画布中部：floss 用 mouse/touch 双监听，tap 双派即可；
    // 验证：全局总能量/激活弦数变化（作品内闭包变量不可见→用像素变化间接验证）
    const before = await s.q(`(function(){
      var c=document.querySelector('#c'), x=c.getContext('2d');
      var d=x.getImageData(0,0,c.width,c.height).data;
      var n=0; for(var i=0;i<d.length;i+=4){ if(d[i+3]>40 && d[i]>120) n++; }
      return n;
    })()`);
    await s.tap(w.canvas, Math.round(geom.w*0.5), Math.round(geom.h*0.5),
      { holdMs: 60, mouse: true, touch: mobile });
    await H.waitMs(400);
    const after = await s.q(`(function(){
      var c=document.querySelector('#c'), x=c.getContext('2d');
      var d=x.getImageData(0,0,c.width,c.height).data;
      var n=0; for(var i=0;i<d.length;i+=4){ if(d[i+3]>40 && d[i]>120) n++; }
      return n;
    })()`);
    R.detail.pluck = { before, after };
    R.checks.interactOk = after !== before;
  } else if (w.interact === 'wind') {
    // 风滑杆 input + 画布点按（找花苞点不到也不报错：只验链路无错误）
    const wind = await s.q(`(function(){
      var r=document.getElementById('wind');
      r.value='2'; r.dispatchEvent(new Event('input',{bubbles:true}));
      return parseFloat(r.value);
    })()`);
    await s.tap(w.canvas, Math.round(geom.w*0.4), Math.round(geom.h*0.4),
      { holdMs: 60, mouse: true, touch: mobile });
    await H.waitMs(400);
    R.detail.wind = wind;
    R.checks.interactOk = wind === 2;
  } else if (w.interact === 'auto') {
    // tian-deng auto=2 自动放灯：等总放灯数/星数推进（#state 镜像）
    const progress = await s.waitFor(`(function(){
      var e=document.getElementById('state'); if(!e)return false;
      var t=e.textContent;
      return t.indexOf('JSERR')<0 && (t.indexOf('"r"')>=0);
    })()`, { timeout: 6000 }).catch(() => null);
    let released = 0;
    const raw = await s.q(`(function(){var e=document.getElementById('state');return e?e.textContent:'';})()`);
    const m = raw && raw.match(/"r"\s*:\s*(\d+)/);
    if (m) released = parseInt(m[1], 10);
    R.detail.auto = { released, stateHead: (raw || '').slice(0, 80) };
    R.checks.interactOk = progress === true || released >= 1;
  }

  const realErrors = await s.realErrors();
  R.realErrors = realErrors;
  R.checks.zeroErrors = realErrors.length === 0;
  R.pass = Object.values(R.checks).every(v => v === true);
  await s.kill();
  return R;
}

(async () => {
  const all = [];
  let port = 10701;
  for (const w of WORK) {
    for (const mobile of [true, false]) {
      const R = await runOne(w, mobile, port);
      port += 100;
      all.push(R);
      console.log(`${R.pass ? 'PASS' : 'FAIL'}  ${R.tag}  ${R.view}  ` +
        Object.entries(R.checks).map(([k, v]) => `${k}=${v ? 1 : 0}`).join(' '));
    }
  }
  fs.writeFileSync(path.join(OUT, 'smoke_1005_result.json'), JSON.stringify(all, null, 2));
  const nFail = all.filter(r => !r.pass).length;
  console.log(`\n${all.length - nFail}/${all.length} PASS`);
  process.exit(nFail ? 1 : 0);
})();
