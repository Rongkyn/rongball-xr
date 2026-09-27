/**
 * resize-debounce.js — v1.1（2026-09-27；v1.0 2026-09-23 提取入池）
 *
 * 能力：窗口 resize 防抖编排——移动端地址栏收放 / 滚动会高频触发 resize，
 *      直接做画布重排会整屏清空闪 + 景物位置跳变（墨园/桂雨/月波三件各自实锤）。
 * 来源：ink-garden（0922）、gui-yu（0922）、yue-bo（0922）三处同源实现 → 达
 *      「重复实现直接提取」标准（POOL.md §D）。
 * 状态：validated（墨园/桂雨/月波/秋虫/芦花/墨隐在用，v0927 全量双端 42/42 验收）
 *
 * v1.1 变更（0927，修复系统性初始化缺陷）：
 *  - 构造时自动同步 perform() 一次：页面加载不派发 resize 事件，v1.0 只绑监听导致
 *    不显式 trigger() 的作品 canvas 永远停 300x150（秋虫实锤）。opts.autoInit=false 关闭。
 *  - perform 零尺寸安全跳过；fn 抛错不吞（TDZ 由调用方守卫）。
 *
 * 公开 API：
 *   createResizeDebounce(fn, opts) -> { trigger, flush, dispose }
 *     @param {function} fn  真正的重排函数（尺寸真变化且防抖静默后调用）
 *     @param {object}  [opts]
 *       @param {number} [opts.wait=120]        防抖静默毫秒
 *       @param {function} [opts.size]          返回 [w,h]，默认 [innerWidth,innerHeight]
 *       @param {boolean} [opts.bind=true]      是否自动监听 window resize
 *       @param {boolean} [opts.autoInit=true]  构造时自动同步执行一次（v1.1 新增，通常保持开启）
 *       @param {boolean} [opts.immediate=true] 首次 trigger 是否同步执行（初始化必须同步）
 *     - trigger()：按「首次同步 / 后续防抖」规则调度（供手动调用或已存在的监听使用）
 *     - flush() ：取消防抖、立即执行一次重排（尺寸未变仍跳过）
 *     - dispose()：解绑监听并清 timer
 *
 * 最小示例：
 *   createResizeDebounce(performResize, { wait: 120 });
 *   // v1.1 构造即自动首次尺寸化；bind 接管后续 resize。一般无需手动 trigger。
 *   // 作品自行初始化（如另调 resize()）可传 { autoInit:false }；需要补跑用 rd.trigger()。
 *
 * 坑点（0927 又实锤两条，别再踩）：
 *  1. 首次初始化必须同步，不能进防抖队列——否则首帧画布尺寸是旧值（v1.1 已自动做）。
 *  2. performResize 必须先比尺寸：地址栏收放有时 innerWidth/innerHeight 不变
 *     （仅视觉位置抖动），重排是纯浪费且会造成闪屏。
 *  3. 尺寸口径默认 window.innerWidth/innerHeight（布局视口）。移动验收若需
 *     visualViewport 口径，传 opts.size 自定义。
 *  4. 本模块只负责「何时调 fn」，fn 内部重排逻辑（dpr/setTransform/景物位移）
 *     由作品自有，模块不接管。
 *  5.【漏引 script 标签】fn 所在作品 html 必须先 <script src> 引入本文件，否则
 *     window.resizeDebounce 为 undefined（墨园 0923 实锤，整作死掉）。
 *  6.【TDZ】autoInit/trigger 的首次 perform 发生在构造点，若 fn 引用的场景数据
 *     （let/const）声明在构造点之后 → Cannot access before initialization
 *     （桂雨 gCols、秋虫 clumps 实锤）。把数据声明前置，或在 fn 内用就绪标志守卫。
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
      // v1.1：零尺寸（headless 解析早期）不执行，也不写 last；真实尺寸到达后的 resize 会补。
      if (!s[0] || !s[1]) return;
      if (s[0] === last[0] && s[1] === last[1]) return;
      last = s;
      try { fn(); } catch (e) {
        // v1.1：初始化时 fn 常引用尚未声明的场景数据（TDZ）。不吞错——继续抛出，但保证
        // resize 监听已就位，真实尺寸/后续事件仍能重试。调用方应在 fn 内做就绪守卫。
        throw e;
      }
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
    // v1.1 关键修复：构造即同步执行一次 perform()。页面加载本身不派发 resize 事件，
    // 若不主动跑，canvas 永远停在默认 300x150（秋虫 0927 实锤）。零尺寸时 perform 安全跳过。
    // 显式 opts.autoInit=false 可关闭（作品会自行调 resize 初始化，如芦花）。
    if (opts.autoInit !== false) perform();
    function dispose() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (doBind) window.removeEventListener('resize', onResize);
    }

    return { trigger: trigger, flush: flush, dispose: dispose };
  }

  return { createResizeDebounce: createResizeDebounce };
});
