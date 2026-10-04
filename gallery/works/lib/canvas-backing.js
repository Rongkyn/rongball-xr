/*
 * canvas-backing.js · 画布 backing 三件套（POOL.md §D + D2 + D3 提取，1005）
 * 1. 零尺寸守卫：innerWidth/Height<=0 直接跳过（页面解析早期/headless 时序可能为 0）
 * 2. maxDpr 只升不降：移动模拟/真机重放 resize 瞬时 dpr=1 不得把 retina backing 降糊（避坑#20）
 * 3. backing 与 CSS 尺寸同步 + 变换矩阵重设
 *
 * 用法：
 *   const CB = require('./canvas-backing.js');
 *   const backing = CB.create(canvas, {maxDpr: 2});
 *   function onResize(){
 *     if(!backing.sync({ctx})) return;      // 零尺寸返回 false
 *     // 用 backing.W / backing.H / backing.dpr 做布局重建
 *   }
 *   window.addEventListener('resize', onResize);
 * 浏览器直挂（非打包）：本文件同时挂 window.CanvasBacking。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.CanvasBacking = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function create(canvas, opts) {
    opts = opts || {};
    var cap = opts.maxDpr || 2;
    var b = {
      canvas: canvas,
      W: 0, H: 0, dpr: 1,
      // 同步 backing；返回 true 表示尺寸有效且已同步，false 表示零尺寸被守卫拦下
      sync: function (o) {
        o = o || {};
        var w = window.innerWidth, h = window.innerHeight;
        if (w <= 0 || h <= 0) return false;           // D2 零尺寸守卫
        var dprNow = Math.min(window.devicePixelRatio || 1, cap);
        if (dprNow > b.dpr) b.dpr = dprNow;           // D3 只升不降
        b.W = w; b.H = h;
        canvas.width = Math.round(w * b.dpr);
        canvas.height = Math.round(h * b.dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        if (o.ctx) o.ctx.setTransform(b.dpr, 0, 0, b.dpr, 0, 0);
        return true;
      }
    };
    return b;
  }

  return { create: create };
});
