// 0930 L3 采用注释补记后回归 smoke：6 件受影响作品，桌面全量 + 移动端抽 3 件（gui-yu/yue-bo/ink-garden）。
// 只动了 HTML 头注释，验收锚点：readyState complete / canvas 尺寸化并已上画 / 零 JS 错误。
// 复用 lib/cdp-harness.js（未新增能力）。
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'out');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
fs.mkdirSync(OUT, { recursive: true });

const WORKS = [
  ['mo-yin', 'mo-yin.html', 'paper'],
  ['lu-hua', 'lu-hua.html', 'scene'],
  ['qiu-chong', 'qiu-chong-v0915.html', 'scene'],
  ['gui-yu', 'gui-yu.html', 'scene'],
  ['yue-bo', 'yue-bo-v0916.html', 'scene'],
  ['ink-garden', 'ink-garden.html', 'scene'],
];
const MOBILE_SET = new Set(['gui-yu', 'yue-bo', 'ink-garden']);

function inkExpr(canvasId) {
  return `(function(){
  var c=document.getElementById(${JSON.stringify(canvasId)});
  if(!c||!c.getContext) return false;
  var W=c.width,H=c.height;
  if(!W||!H || (W===300&&H===150)) return false;
  var x=c.getContext('2d');
  try{
    var d=x.getImageData(0,0,W,H).data;
    var step=Math.max(4,Math.floor(d.length/2500));
    for(var i=0;i<d.length;i+=step){
      var r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
      if(a>12 && !(r>232&&g>222&&b>195)) return true;
    }
  }catch(e){return 'ERR:'+e.message;}
  return false;
})()`;
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

async function runOne(workName, file, canvasId, mobile, port) {
  const tag = workName + (mobile ? ':m' : ':d');
  const s = await H.launch({
    out: OUT, profile: 'a30' + (mobile ? 'm' : 'd') + '-' + workName, wsPath: WS, port,
    mobile, width: mobile ? 390 : 1280, height: mobile ? 844 : 860,
  });
  const full = path.join(__dirname, '..', '..', '..', 'works', file);
  const url = 'file://' + encodeURI(full) + '?cb=' + Date.now();
  const t0 = Date.now();
  await s.goto(url);
  let complete = false;
  try { await s.waitFor('document.readyState==="complete"', { timeout: 12000 }); complete = true; } catch (e) {}
  let firstInkMs = null, paintErr = null;
  while (Date.now() - t0 < 12000) {
    const r = await s.q(inkExpr(canvasId));
    if (r === true) { firstInkMs = Date.now() - t0; break; }
    if (typeof r === 'string' && r.indexOf('ERR:') === 0) { paintErr = r; break; }
    await H.waitMs(150);
  }
  const errs = await s.realErrors();
  check(tag + ' complete', complete);
  check(tag + ' 已上画', firstInkMs !== null, { paintErr });
  check(tag + ' 零错误', errs.length === 0, errs.slice(0, 3));
  console.log('     firstInk=%sms errs=%d', firstInkMs, errs.length);
  await s.kill();
}

(async () => {
  const only = process.argv.slice(2);
  let port = 9801;
  for (const w of WORKS) {
    if (only.length && !only.includes(w[0])) continue;
    console.log('=== ' + w[0] + ' ===');
    await H.killAll(port);
    await runOne(w[0], w[1], w[2], false, port++);
    if (MOBILE_SET.has(w[0])) {
      await H.killAll(port);
      await runOne(w[0], w[1], w[2], true, port++);
    }
  }
  console.log('\nRESULT pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
