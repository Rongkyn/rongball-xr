/* 验证 0923 定型 fast 模型：8 子步 + 速率×12 的干涸帧数与单帧成本 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../../../../works/mo-yin.html'), 'utf8');
const blocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let code = blocks.filter(s => s.trim()).sort((a, b) => b.length - a.length)[0];
code = code.replace(/if\(FAST\)\{ openingDrop\(\); \} else \{ setTimeout\(openingDrop, 700\); \}/, '')
  .replace(/requestAnimationFrame\(frame\);/, '').replace(/\nkick\(\);\n/, '\n');

const N = 220;
function cs() {
  const ch = { addColorStop() { } };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createImageData' || k === 'getImageData') return () => ({ data: new Float32Array(N * N * 4) });
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ch;
      return typeof t[k] !== 'undefined' ? t[k] : function () { };
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
const cv = {
  width: N, height: N, style: {}, getContext: () => cs(), addEventListener: () => { },
  getBoundingClientRect: () => ({ left: 10, top: 54, width: 368, height: 368 }),
  setPointerCapture: () => { }, classList: { add() { }, remove() { }, contains: () => false }
};
const win = { devicePixelRatio: 2, addEventListener: () => { }, resizeDebounce: { createResizeDebounce: () => { } } };
const doc = { querySelector: () => cv, getElementById: () => cv, addEventListener: () => { } };

const runner = new Function('window', 'document', 'location', 'addEventListener', 'requestAnimationFrame',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'URLSearchParams', 'Float32Array', 'Math', 'Date', 'JSON',
  code + `
  ;return {
    step, drop,
    wsum: () => { let s = 0; for (let i = 0; i < W.length; i++) s += W[i]; return s; },
    FAST_K, EVAP
  };`);

const sim = runner(win, doc, { search: '?fast=1' }, () => { }, () => { },
  setTimeout, clearTimeout, setInterval, clearInterval,
  URLSearchParams, Float32Array, Math, Date, JSON);
console.log('FAST_K:', sim.FAST_K, 'EVAP:', sim.EVAP);
sim.drop(N * 0.5, N *0.45, 16, 4.5, 1.8);
sim.drop(N * 0.3, N * 0.35, 14, 3.6, 1.6);

// 单帧（8 子步）成本
let t = process.hrtime.bigint();
for (let i = 0; i < 100; i++) for (let k = 0; k < 8; k++) sim.step();
const perFrame = Number(process.hrtime.bigint() - t) / 1e6 / 100;
console.log('单帧(8子步)成本:', perFrame.toFixed(2), 'ms → Node 内上限', Math.round(1000 / perFrame), 'fps');

// 干涸帧数（idle 窗 24）
let idle = 0, f = 0;
while (f < 60000) {
  for (let k = 0; k < 8; k++) sim.step();
  f++;
  const w = sim.wsum();
  if (w < 0.4) { idle++; if (idle > 24) break; } else idle = 0;
}
console.log('干涸帧数:', f, '@30fps ≈', (f / 30).toFixed(1), 's；@60fps ≈', (f / 60).toFixed(1), 's');
