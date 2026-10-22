/**
 * P01 一句话水墨 v1 — CDP 双档验收（2026-10-23 创作时间）
 *
 * 验收面：
 *  A. 主题映射：特异词优先（空山新雨后=雨 而非 山；孤舟=舟）
 *  B. 生成闭环：输入→成画→state 镜像（themeKey/poem/seed）→换一卷变体不同
 *  C. 确定性：同句同变体 hash 相同；变体不同 hash 不同
 *  D. 视觉非空：纸面/墨色/朱印像素三齐全；11 主题各出一张目检截图
 *  E. 题原句：勾选后按原句竖排，note 标注
 *  F. 存图：点「存图」确实产出 PNG dataURL（拦截 toDataURL 调用）
 *  G. 沙箱合规：零外部资源请求（performance resource 为空）
 *  H. 布局：移动 390 无横溢；双档零真实错误
 *  I. 性能：单次程序化渲染（含 getImageData 无关）< 1000ms
 */
const H = require('../../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');

const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const SHOT_DIR = path.join(OUT, 'shots1023');
fs.mkdirSync(SHOT_DIR, { recursive: true });
const PRODUCT = path.join(__dirname, '..', '..', '..', '..', 'products', 'p01-yijuhua', 'index.html');

const results = [];
function rec(suite, name, ok, detail) {
  results.push({ suite, name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
  console.log((ok ? 'PASS ' : 'FAIL ') + suite + ' :: ' + name + (detail !== undefined ? ' — ' + detail : ''));
}

const THEME_CASES = [
  ['晚安，今天有点想你', 'moon'],
  ['空山新雨后，天气晚来秋', 'rain'],
  ['独钓寒江雪', 'snow'],
  ['野旷天低树', 'mountain'],
  ['孤舟蓑笠翁', 'boat'],
  ['桃花开了春天好温柔', 'flower'],
  ['宁可食无肉，不可居无竹', 'bamboo'],
  ['停车坐爱枫林晚，霜叶红于二月花', 'autumn'],
  ['千山鸟飞绝', 'bird'],
  ['行到水穷处坐看云起时', 'cloud'],
  ['江水悠悠向东流', 'jiang'],
];

const THEME_SHOTS = [
  ['default', ''], ['mountain', '远山安静'], ['moon', '晚安想你'], ['rain', '听雨'],
  ['snow', '寒江雪'], ['jiang', '江水悠悠'], ['boat', '一叶扁舟'], ['flower', '桃花春风'],
  ['bamboo', '竹影清风'], ['autumn', '枫林晚秋'], ['bird', '归鸟'], ['cloud', '坐看云起']
];

async function boot(mobile, port) {
  const dims = mobile ? { w: 390, h: 844 } : { w: 1280, h: 720 };
  await H.killAll(port);
  await H.waitMs(400);
  const s = await H.launch({
    out: OUT, profile: 'p01' + (mobile ? 'm' : 'd'),
    wsPath: WS, port, mobile, width: dims.w, height: dims.h,
  });
  await s.goto('file://' + encodeURI(PRODUCT) + '?cb=' + Date.now());
  await s.waitFor(`(function(){return !!(window.__p01Debug && window.__p01Debug.state().rendered);})()`, { timeout: 10000 });
  return s;
}

// 等成画稳定（busy 落回 false）
async function waitIdle(s) {
  await s.waitFor(`(function(){return window.__p01Debug.state().busy===false;})()`, { timeout: 8000 });
  await H.waitMs(120);
}
// 可信点击元素中心：trustedClick 的 x/y 是相对元素的 CSS 像素，必须显式传中心
// （既有件惯例；省略得 NaN 会点到页面原点 —— 本脚本第一轮实锤的假阴性）
async function centerClick(s, sel) {
  // scrollIntoView 防 720 矮视口：画布把按钮顶出视口时 CDP 点击落在视口外静默丢失
  const c = await s.q(`(function(){
    var el=document.querySelector(${JSON.stringify(sel)});
    el.scrollIntoView({block:'center'});
    var r=el.getBoundingClientRect();
    return {x:Math.round(r.width/2), y:Math.round(r.height/2)};
  })()`);
  await s.trustedClick(sel, c.x, c.y);
}

async function runSuite(mobile, port) {
  const tag = mobile ? 'mobile390' : 'desktop1280';
  const s = await boot(mobile, port);
  try {
    // A. 主题映射
    for (const [text, expect] of THEME_CASES) {
      const got = await s.q(`window.__p01Debug.detectTheme(${JSON.stringify(text)})`);
      rec(tag, '主题映射「' + text.slice(0, 6) + '」=>' + expect, got === expect, 'got=' + got);
    }

    // B. 生成闭环：输入 + 真触摸/点击成画
    await s.q(`(function(){var i=document.getElementById('phrase');i.value='晚安，今天有点想你';
      i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await centerClick(s,'#btnGen');
    await waitIdle(s);
    let st = await s.q('JSON.stringify(window.__p01Debug.state())');
    st = JSON.parse(st);
    rec(tag, '成画后镜像 themeKey=moon', st.themeKey === 'moon', st.themeKey);
    rec(tag, '成画后题诗为月题', st.poem && st.poem.indexOf('月') >= 0, st.poem);
    rec(tag, 'seed 为数字', typeof st.seed === 'number' && st.seed > 0, st.seed);
    const seed0 = st.seed;

    // C1. 确定性：同句同变体
    const p1 = await s.q(`window.__p01Debug.paint(${JSON.stringify('晚安，今天有点想你')},0,false)`);
    const p2 = await s.q(`window.__p01Debug.paint(${JSON.stringify('晚安，今天有点想你')},0,false)`);
    rec(tag, '确定性：同句同变体同 hash', p1.hash === p2.hash && p1.seed === p2.seed, p1.hash.slice(0, 10));

    // C2. 变体不同
    const p3 = await s.q(`window.__p01Debug.paint(${JSON.stringify('晚安，今天有点想你')},1,false)`);
    rec(tag, '换卷：变体不同 hash 不同', p3.hash !== p1.hash, p1.hash.slice(0, 10) + ' vs ' + p3.hash.slice(0, 10));
    rec(tag, '换卷：变体不同 seed 不同', p3.seed !== p1.seed);

    // 真实点「换一卷」：state.variant 递增
    await centerClick(s,'#btnShuffle');
    await waitIdle(s);
    st = JSON.parse(await s.q('JSON.stringify(window.__p01Debug.state())'));
    rec(tag, '换一卷按钮 variant=1', st.variant === 1, 'variant=' + st.variant + ' seed0=' + seed0 + ' seedNow=' + st.seed);
    rec(tag, '换一卷后 seed 已变', st.seed !== seed0);

    // D. 像素三齐全：分区域判（上部天区=纸面留白；下半幅=山墨；题字区右上=朱印）
    const px = await s.q(`(function(){
      var c=document.getElementById('paper'),x=c.getContext('2d'),W=c.width,H=c.height;
      function region(x0,y0,x1,y1){
        var d=x.getImageData(x0,y0,x1-x0,y1-y0).data,n=d.length;
        var paper=0,ink=0,red=0;
        for(var i=0;i<n;i+=16){
          var r=d[i],g=d[i+1],b=d[i+2];
          if(r>222&&g>212&&b>188)paper++;
          if(r<105&&g<112&&b<122)ink++;
          if(r>140&&r<215&&g<110&&b<95)red++;
        }
        var sampled=n/16;
        return {paper:paper/sampled,ink:ink/sampled,red:red/sampled};
      }
      return {
        sky: region(Math.round(W*0.05),Math.round(H*0.05),Math.round(W*0.62),Math.round(H*0.30)),
        land: region(0,Math.round(H*0.55),W,H),
        seal: region(Math.round(W*0.66),Math.round(H*0.05),W,Math.round(H*0.30))
      };
    })()`);
    rec(tag, '像素：天区留白纸面>55%', px.sky.paper > 0.55, px.sky.paper.toFixed(3));
    rec(tag, '像素：下半幅山体墨色>8%', px.land.ink > 0.08, px.land.ink.toFixed(3));
    rec(tag, '像素：题字区朱印像素存在', px.seal.red > 0.0004, px.seal.red.toFixed(5));

    // E. 题原句
    await s.q(`document.getElementById('useOwn').click()`);
    await waitIdle(s);
    st = JSON.parse(await s.q('JSON.stringify(window.__p01Debug.state())'));
    rec(tag, '题原句：note 标注原句', (await s.q('document.getElementById("themeNote").textContent')).indexOf('你的原句') >= 0);
    await s.q(`document.getElementById('useOwn').click()`);
    await waitIdle(s);

    // F. 存图拦截
    const saveProbe = await s.q(`(async function(){
      var called=null;
      var orig=HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL=function(t){called=t||'image/png';return orig.apply(this,arguments);};
      // 压住下载行为：anchor.click 已被 headless 忽略，无副作用
      (function(){var b=document.getElementById('btnSave');b.getBoundingClientRect();b.click();})();
      await new Promise(r=>setTimeout(r,150));
      HTMLCanvasElement.prototype.toDataURL=orig;
      return called;
    })()`);
    rec(tag, '存图：toDataURL 以 image/png 触发', saveProbe === 'image/png', saveProbe);

    // G. 沙箱零外链
    const ext = await s.q(`(function(){
      return performance.getEntriesByType('resource')
        .map(function(e){return e.name;})
        .filter(function(u){return /^https?:|\\/\\//.test(u);}).length;
    })()`);
    rec(tag, '沙箱：零外部资源请求', ext === 0, 'external=' + ext);

    // H1. 无横溢
    const ovf = await s.q(`(function(){
      return {sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
              body:document.body.scrollWidth};
    })()`);
    rec(tag, '布局：无横向溢出', ovf.sw <= ovf.cw, JSON.stringify(ovf));

    // I. 性能：连续 5 次渲染取最大
    const bench = await s.q(`(function(){
      var worst=0;
      for(var i=0;i<5;i++){
        var t0=performance.now();
        window.__p01Debug.paint('性能测试句晚夜雪',i,false);
        worst=Math.max(worst,performance.now()-t0);
      }
      return Math.round(worst);
    })()`);
    rec(tag, '性能：单次渲染<1000ms', bench < 1000, bench + 'ms');

    // D2. 主题截图（仅移动端跑，目检产物）
    if (mobile) {
      for (const [tk, text] of THEME_SHOTS) {
        if (tk === 'default') {
          await s.q(`window.__p01Debug.paint('',0,false)`);
        } else {
          const key = await s.q(`window.__p01Debug.detectTheme(${JSON.stringify(text)})`);
          await s.q(`window.__p01Debug.paint(${JSON.stringify(text)},0,false)`);
          if (key !== tk) rec(tag, '截图用例主题核对(' + tk + ')', false, 'detect=' + key);
        }
        await H.waitMs(60);
        await s.shot('p01_' + tk);
      }
    }
    await s.shot('p01_page_' + tag);

    // H2. 真实错误
    const errs = await s.realErrors();
    rec(tag, '零真实 JS 错误', errs.length === 0, errs.slice(0, 3).join(' | '));
  } finally {
    await s.kill();
  }
}

(async () => {
  try {
    await runSuite(true, 9301);
    await H.waitMs(800);
    await runSuite(false, 9311);
  } catch (e) {
    console.error('SUITE CRASH:', e && e.stack || e);
    process.exitCode = 2;
  }
  const fail = results.filter(r => !r.ok);
  fs.writeFileSync(path.join(OUT, 'acc1023_p01_result.json'),
    JSON.stringify({ ts: new Date().toISOString(), total: results.length, fail: fail.length, results }, null, 2));
  console.log('\\n==== ' + (results.length - fail.length) + '/' + results.length + ' PASS, ' + fail.length + ' FAIL ====');
  // 截图落在 harness out，移动到 shots 目录
  try {
    for (const f of fs.readdirSync(OUT)) {
      if (/^p01_.*\.(png|jpg)$/.test(f)) {
        fs.renameSync(path.join(OUT, f), path.join(SHOT_DIR, f));
      }
    }
  } catch (e) { console.warn('screenshot move:', e.message); }
  process.exit(fail.length ? 1 : 0);
})();
