/**
 * noise-lib.js v1.0 — 带种子二维 Perlin 噪声（2026-10-15 提取入池）
 *
 * 能力：单文件零依赖的经典 Ken Perlin improved noise（2D），支持确定性种子与自定义随机源，
 *      供地形起伏、云雾、水流、肌理底座等程序化生成复用。
 *
 * 来源（重复实现实锤，POOL §二）：
 *   - gallery/works/mountain-dwelling.html 内联 Noise 类（LCG 种子 42，确定性山居构图，grad 不掩码）
 *   - gallery/works/living-landscape.html 内联误名 SimplexNoise 类（实为同一 Perlin，
 *     Math.random 洗牌，每次加载换景，grad 经典 h&3 掩码）
 *   两者 fade/lerp/perm 结构一致；洗牌随机源与 grad 掩码口径不同（由构造参数区分），
 *   提取时逐位对齐，视觉零漂移。
 *
 * 公开 API（全局 window.PerlinNoise，file:// 直接 <script src> 即用，无模块系统依赖）：
 *   new PerlinNoise(seed?, opts?)
 *     - seed 为正整数：用 Park-Miller LCG（s=s*16807%2147483647）洗牌，同一 seed 永远同一排列
 *     - seed 省略/null：用 Math.random() 洗牌（每次实例排列不同，适合"每次打开换一幅"）
 *     - seed 也可传函数：自定义 [0,1) 随机源
 *     - opts.gradMask（默认 true）：grad 先 h&3 掩码（经典教材口径，= 山水间原实现）；
 *       传 false 则直接用散列号（= 山居原实现）。两者只在 h∈{0,1} 时输出相同，不可混用。
 *   .noise2D(x, y) -> 约 [-1,1] 的连续平滑噪声
 * 最小示例：
 *   <script src="lib/noise-lib.js"></script>
 *   <script>
 *     const n1 = new PerlinNoise(42, {gradMask:false}); // 山居：确定性 + 不掩码梯度
 *     const v  = n1.noise2D(x * 0.0015, 0);
 *     const n2 = new PerlinNoise();                     // 山水间：每次加载不同 + 掩码梯度
 *   </script>
 *
 * 坑点 / 限制：
 *  1. 这是经典梯度噪声 Perlin，不是 Simplex——山水间历史类名叫 SimplexNoise 属误名，勿再复制该误名。
 *  2. 构造一次、全程复用：排列表在构造时生成，反复 new 会重复洗牌且改变后续构图。
 *  3. 确定性诉求必须传数字 seed；省略 seed 走 Math.random，不可用于需要逐帧/逐次一致的场景。
 *  4. 输出范围实测约 [-1,1)，不保证严格边界；作为位移/角度系数时按作品既有缩放口径使用。
 *  5. 整数 seed 路径的洗牌取 j = s % (i+1)（直接用 LCG 整数），不是 floor(s/2147483647*(i+1))，
 *     两者数学不等价；提取时已逐位对齐山居原实现，勿"顺手统一"，否则确定性构图会变。
 *  6. grad 存在两种历史口径（提取时实锤，初版库曾误以为两件相同）：
 *       - 山水间：经典 h&3 掩码（本库默认 gradMask:true）
 *       - 山居 ：不掩码，直接 h<2（gradMask:false）
 *     两者仅 h∈{0,1} 时梯度相同，其余散列号方向不同，山体/云雾形状会变。
 *     迁移旧件必须按该件原口径传参，并跑逐位回归（acc1015/parity_noiselib.js），不看"差不多"。
 *
 * CHANGELOG：
 *   v1.0（2026-10-15）：从山居/山水间两件作品提取，LCG 种子路径与山居 Noise(42) 逐位同构，
 *                       Math.random 路径与山水间原洗牌同分布；两件接入双端 CDP 回归无视觉漂移。
 */
(function (global) {
  'use strict';

  class PerlinNoise {
    /**
     * @param {number|function|null} [seed] 数字=LCG 确定性种子；函数=自定义随机源；省略=Math.random
     * @param {{gradMask?:boolean}} [opts] gradMask=true（默认）先 h&3（山水间/经典口径）；
     *                                      false 直接用散列号（山居口径）
     */
    constructor(seed, opts) {
      const gradMask = !opts || opts.gradMask !== false;
      this._gradMask = gradMask;
      this.perm = new Uint8Array(512);
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;

      let rnd;          // [0,1) 浮点随机源（无 seed / 自定义函数路径）
      let lcgState = 0; // 非 0 = 整数 seed 路径，洗牌直接用整数取模（山居原口径，见坑 5）
      if (typeof seed === 'function') {
        rnd = seed;
      } else if (seed === undefined || seed === null) {
        // 山水间原行为：每次加载洗牌成不同排列
        rnd = Math.random;
      } else {
        // 山居原行为：Park-Miller 最小标准随机数整数；注意原洗牌是 j = s % (i+1)
        lcgState = seed || 1;
      }

      for (let i = 255; i > 0; i--) {
        const j = lcgState
          ? ((lcgState = (lcgState * 16807) % 2147483647) % (i + 1))
          : Math.floor(rnd() * (i + 1));
        const t = p[i]; p[i] = p[j]; p[j] = t;
      }
      for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    }

    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }

    // 梯度有两种历史口径（见文件头坑 6）：默认 h&3 掩码（山水间/经典），
    // gradMask:false 时直接用 h（山居）。迁移旧件必须按原口径，否则形状会变。
    grad(hash, x, y) {
      const h = this._gradMask ? hash & 3 : hash;
      const u = h < 2 ? x : y;
      const v = h < 2 ? y : x;
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }

    noise2D(x, y) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      const u = this.fade(x);
      const v = this.fade(y);
      const a = this.perm[X] + Y;
      const b = this.perm[X + 1] + Y;
      return this.lerp(v,
        this.lerp(u, this.grad(this.perm[a], x, y), this.grad(this.perm[b], x - 1, y)),
        this.lerp(u, this.grad(this.perm[a + 1], x, y - 1), this.grad(this.perm[b + 1], x - 1, y - 1))
      );
    }
  }

  global.PerlinNoise = PerlinNoise;
})(typeof window !== 'undefined' ? window : globalThis);
