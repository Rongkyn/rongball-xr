/**
 * acc1015 · noise-lib 提取等价性校验（Node 侧，逐位 + 分布）
 *  - 山居原内联 Noise（LCG seed=42）与新 PerlinNoise(42)：perm 表与大网格噪声输出必须全等
 *  - 山水间原内联误名 SimplexNoise（Math.random 洗牌）：注入同一 PRNG 后与新库无 seed 路径输出全等
 */
global.window = global;
require('../../../works/lib/noise-lib.js');
const PerlinNoise = global.PerlinNoise;

// ---- 山居原实现（逐字摘自 mountain-dwelling.html，仅格式差异）----
class OldNoise {
  constructor(seed) {
    this.p = new Uint8Array(512);
    const q = new Uint8Array(256);
    let s = seed || 1;
    for (let i = 0; i < 256; i++) { q[i] = i; }
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [q[i], q[j]] = [q[j], q[i]];
    }
    for (let i = 0; i < 512; i++) this.p[i] = q[i & 255];
  }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(h, x, y) { const u = h < 2 ? x : y, v = h < 2 ? y : x; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
  noise2D(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = this.fade(x), v = this.fade(y);
    const a = this.p[X] + Y, b = this.p[X + 1] + Y;
    return this.lerp(v,
      this.lerp(u, this.grad(this.p[a], x, y), this.grad(this.p[b], x - 1, y)),
      this.lerp(u, this.grad(this.p[a + 1], x, y - 1), this.grad(this.p[b + 1], x - 1, y - 1)));
  }
}

// ---- 山水间原实现（逐字摘自 living-landscape.html）----
class OldSimplex {
  constructor(rnd) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  noise2D(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = this.fade(x), v = this.fade(y);
    const a = this.perm[X] + Y, b = this.perm[X + 1] + Y;
    return this.lerp(v,
      this.lerp(u, this.grad(this.perm[a], x, y), this.grad(this.perm[b], x - 1, y)),
      this.lerp(u, this.grad(this.perm[a + 1], x, y - 1), this.grad(this.perm[b + 1], x - 1, y - 1)));
  }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y) {
    // 山水间原件口径：经典 h&3 掩码
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
}

let fail = 0;
const check = (name, cond, extra) => {
  console.log((cond ? 'PASS' : 'FAIL') + ' · ' + name + (extra ? ' · ' + extra : ''));
  if (!cond) fail++;
};

// 1) 山居 seed=42：perm 全等
const oldMd = new OldNoise(42);
const newMd = new PerlinNoise(42, { gradMask: false });
let permEq = true;
for (let i = 0; i < 512; i++) if (oldMd.p[i] !== newMd.perm[i]) { permEq = false; break; }
check('山居 LCG(42) perm[512] 全等', permEq);

// 2) 山居：作品真实调用域上的噪声输出全等（山脉/云雾坐标域）
let nDiff = 0, nCnt = 0, maxAbs = 0;
for (let x = -200; x <= 1600; x += 7) {
  for (const [nx, ny] of [[x * 0.0012, 0], [x * 0.0048, 50], [x * 0.009, 80], [x * 0.003, 150], [x * 0.003 + 100, 150]]) {
    const a = oldMd.noise2D(nx, ny), b = newMd.noise2D(nx, ny);
    nCnt++; if (a !== b) nDiff++; maxAbs = Math.max(maxAbs, Math.abs(a - b));
  }
}
check('山居 噪声输出全等（' + nCnt + ' 点）', nDiff === 0, 'diff=' + nDiff + ' maxAbs=' + maxAbs);

// 3) 山水间 Math.random 路径：注入同一 PRNG 序列，输出全等
function mulberry(seed) { let s = seed >>> 0; return function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r1 = mulberry(20261015), r2 = mulberry(20261015);
const oldLl = new OldSimplex(r1);
const newLl = new PerlinNoise(r2);
let permEq2 = true;
for (let i = 0; i < 512; i++) if (oldLl.perm[i] !== newLl.perm[i]) { permEq2 = false; break; }
check('山水间 随机源注入 perm[512] 全等', permEq2);
let nDiff2 = 0;
for (let x = -100; x <= 1600; x += 11) {
  for (const [nx, ny] of [[x * 0.001, 0], [x * 0.003, 2], [x * 0.008, 3], [x * 0.05, 200], [x * 0.006, 400.05]]) {
    if (oldLl.noise2D(nx, ny) !== newLl.noise2D(nx, ny)) nDiff2++;
  }
}
check('山水间 随机路径噪声输出全等', nDiff2 === 0, 'diff=' + nDiff2);

// 4) 默认构造（Math.random）可用、范围有界、两次实例排列大概率不同
const a = new PerlinNoise(), b = new PerlinNoise();
let inRange = true, diffPos = 0;
for (let i = 0; i < 2000; i++) { const v = a.noise2D(i * 0.01, i * 0.013); if (!(v >= -1.01 && v <= 1.01)) inRange = false; if (a.perm[i & 511] !== b.perm[i & 511]) diffPos++; }
check('无 seed 默认构造范围有界', inRange);
check('两实例排列不同（换景语义）', diffPos > 200, 'diffPos=' + diffPos);

// 5) 确定性：同 seed 两实例全等
const c1 = new PerlinNoise(42), c2 = new PerlinNoise(42);
let det = true;
for (let i = 0; i < 512; i++) if (c1.perm[i] !== c2.perm[i]) det = false;
for (let i = 0; i < 500; i++) if (c1.noise2D(i * 0.01, 1) !== c2.noise2D(i * 0.01, 1)) det = false;
check('同 seed 确定性复现', det);

console.log(fail === 0 ? '\nALL PASS' : '\n' + fail + ' FAILED');
process.exit(fail ? 1 : 0);
