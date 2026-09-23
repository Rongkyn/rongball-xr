/**
 * resize-debounce.js — v1.0（2026-09-23 提取入池）
 *
 * 能力：窗口 resize 防抖编排——移动端地址栏收放 / 滚动会高频触发 resize，
 *      直接做画布重排会整屏清空闪 + 景物位置跳变（墨园/桂雨/月波三件各自实锤）。
 * 来源：ink-garden（0922）、gui-yu（0922）、yue-bo（0922）三处同源实现 → 达
 *      「重复实现直接提取」标准（POOL.md §D）。
 * 状态：selected（墨洇 v0923 接入；墨园/桂雨/月波同步改为引用）
 *
 * 公开 API：
 *   createResizeDebounce(fn, opts) -> { trigger, flush, dispose }
 *     @param {function} fn  真正的重排函数（尺寸真变化且防抖静默后调用）
 *     @param {object}  [opts]
 *       @param {number} [opts.wait=120]        防抖静默毫秒
 *       @param {function} [opts.size]          返回 [w,h]，默认 [innerWidth,innerHeight]
 *       @param {boolean} [opts.bind=true]      是否自动监听 window resize
 *       @param {boolean} [opts.immediate=true] 首次 trigger 是否同步执行（初始化必须同步）
 *     - trigger()：按「首次同步 / 后续防抖」规则调度（供手动调用或已存在的监听使用）
 *     - flush() ：取消防抖、立即执行一次重排（尺寸未变仍跳过）
 *     - dispose()：解绑监听并清 timer
 *
 * 最小示例：
 *   const rd = createResizeDebounce(performResize, { wait: 120 });
 *   // bind:true 时 window resize 已自动接管；初始化通常无需再手动调用——
 *   // 若作品结构要求初始化先跑一次：rd.trigger()  // 首次同步
 *
 * 坑点（三件作品踩过，别再踩）：
 *  1. 首次初始化必须同步，不能进防抖队列——否则首帧画布尺寸是旧值。
 *  2. performResize 必须先比尺寸：地址栏收放有时 innerWidth/innerHeight 不变
 *     （仅视觉位置抖动），重排是纯浪费且会造成闪屏。
 *  3. 尺寸口径默认 window.innerWidth/innerHeight（布局视口）。移动验收若需
 *     visualViewport 口径，传 opts.size 自定义。
 *  4. 本模块只负责「何时调 fn」，fn 内部重排逻辑（dpr/setTransform/景物位移）
 *     由作品自有，模块不接管。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.resizeDebounce = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function defaultSize() {
    return [window.innerWidth, window.innerHeight];
  }

  function createResizeDebounce(fn, opts) {
    opts = opts || {};
    const wait = opts.wait != null ? opts.wait : 120;
    const sizeFn = opts.size || defaultSize;
    const doBind = opts.bind !== false;
    let immediate = opts.immediate !== false;
    let timer = null;
    let last = [0, 0];

    function perform() {
      const s = sizeFn();
      if (s[0] === last[0] && s[1] === last[1]) return;
      last = s;
      fn();
    }
    function trigger() {
      if (immediate) { immediate = false; perform(); return; }
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { timer = null; perform(); }, wait);
    }
    function flush() {
      if (timer) { clearTimeout(timer); timer = null; }
      perform();
    }
    function onResize() { trigger(); }
    if (doBind) window.addEventListener('resize', onResize);
    function dispose() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (doBind) window.removeEventListener('resize', onResize);
    }

    return { trigger: trigger, flush: flush, dispose: dispose };
  }

  return { createResizeDebounce: createResizeDebounce };
});
