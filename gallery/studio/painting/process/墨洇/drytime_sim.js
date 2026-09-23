/* 用桩环境加载 mo-yin.html 真实物理代码，实测干涸时间（不拍超时） */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../../../../works/mo-yin.html'), 'utf8');
const blocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const code = blocks.filter(s => s.trim()).sort((a, b) => b.length - a.length)[0];

const N = 220;
function ctxStub() {
  const chain = { addColorStop() { } };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createImageData' || k === 'getImageData') return () => ({ data: new Float32Array(N * N * 4) });
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => chain;
      if (typeof t[k] !== 'undefined') return t[k];
      return function () { };
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
const canvasStub = {
  width: N, height: N, style: {},
  getContext: () => ctxStub(),
  addEventListener: () => { },
  getBoundingClientRect: () => ({ left: 10, top: 54, width: 368, height: 368 }),
  setPointerCapture: () => { }, classList: { add() { }, remove() { }, contains: () => false }
};
const win = {
  devicePixelRatio: 2,
  addEventListener: () => { },
  resizeDebounce: { createResizeDebounce: () => { } }
};
const doc = {
  querySelector: () => canvasStub,
  getElementById: () => canvasStub,
  addEventListener: () => { }
};

// 去掉作品的自动开场/自动帧循环，改为受控
let controlled = code
  .replace(/if\(FAST\)\{ openingDrop\(\); \} else \{ setTimeout\(openingDrop, 700\); \}/, '')
  .replace(/requestAnimationFrame\(frame\);/, '')
  .replace(/\nkick\(\);\n/, '\n');

const runner = new Function('window', 'document', 'location', 'addEventListener',
  'requestAnimationFrame',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'URLSearchParams', 'Float32Array', 'Math', 'Date', 'JSON',
  controlled + `
  ;return {
    state: () => ({ alive, dried, tw: totalWater, drops: dropCount }),
    // 跑 n 帧（含 frame() 的干涸判定逻辑，但不渲染）
    runFrames: (n) => {
      for (let f = 0; f < n; f++) {
        if (alive) {
          for (let k = 0; k < STEPS * STEP_MULT; k++) step();
          if (totalWater < 0.4) {
            idleFrames++;
            if (idleFrames > (FAST ? 24 : 90) && !dried) { dried = true; alive = false; }
          } else idleFrames = 0;
        }
      }
    },
    tap: (gx, gy) => { drop(gx, gy, 14, 3.6, 1.6); dropCount++; revive(); },
    dragDrop: (gx, gy) => { drop(gx, gy, 6.5, 2.0, 1.0); },
    opening: () => openingDrop()
  };`);

const sim = runner(win, doc, { search: '?fast=1' }, () => { }, () => { },
  setTimeout, clearTimeout, setInterval, clearInterval,
  URLSearchParams, Float32Array, Math, Date, JSON);

// 复刻验收场景1动作
sim.opening();
sim.tap(N * 0.3, N * 0.35);
console.log('轻量（开场+tap）初始 tw:', sim.state().tw.toFixed(1), 'drops:', sim.state().drops);

let f = 0;
while (!sim.state().dried && f < 30000) {
  sim.runFrames(300); f += 300;
  console.log('帧', f, (f / 60).toFixed(1) + 's', 'tw:', sim.state().tw.toFixed(1));
}
console.log(sim.state().dried ? '轻量干涸于 ' + f + ' 帧 ≈ ' + (f / 60).toFixed(1) + 's'
  : '30000 帧未干涸 tw=' + sim.state().tw.toFixed(1));
