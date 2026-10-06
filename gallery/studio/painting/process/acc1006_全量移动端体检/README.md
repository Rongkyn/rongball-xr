# 1006 旧作深磨：全量移动端/加载/交互体检（9 件 × 双档）

**性质**：旧作打磨（无新件）。新件三硬闸状态：待审队列 5 件 > 2 → 硬闸关闭，本轮只磨旧作。
**验收**：18/18 PASS（`node smoke_1006.js`，复用 lib/cdp-harness.js 真实 CDP，非截图猜）。

## 背景
主人 10 月开投，作品是简历正式组成。0927 加载性能只修了 3 件代表作，其余 6 件未体检；
1005 BOARD 规则升级（touch-action 本体、backing 口径）后尚无全量回归。本轮做 9 件双档基线。

## 发现并修复的真实缺陷

### 1. 阻塞 @import 致离线整页不启动（P0，2 件）
- **ink-2048 / ink-gomoku**：`<style>` 内 `@import url(Google Fonts)`。
  headless 实测：资源不可达时 readyState 长停 `loading`，**内联脚本不执行**——2048 棋盘为空、
  gomoku 无交互。主人演示/离线打开直接黑屏。
- **修法**：@import 移到 `<style>` 外，改 `<link media="print" onload="this.media='all'">`
  非阻塞加载（同 0927 口径）；字体栈补本地兜底（楷体/Songti/Noto Serif/宋体），字体永不阻塞渲染。
- 全仓 grep 确认仅这 2 件有阻塞 @import，已清零。

### 2. touch-action 未挂手势元素本体（7 件，避坑#22 §L）
- mo-yun / mountain-dwelling / tai-hen / living-landscape / ink-particles / ink-gomoku / ink-sound
  的 `touch-action` 只在 body 或缺失，手势元素本身 `touch-action: auto`——手机上手势会被浏览器
  劫持（滚屏/缩放手势冲突）。
- **修法**：在 canvas（gomoku 为 `#board`）自身 CSS 加 `touch-action: none`。

### 3. resize 重放 dpr=1 把 retina backing 降糊（2 件，避坑#20 同类）
- **mo-yun**：`DPR = min(devicePixelRatio,2)` 每次 resize 直取，CDP resize 重放瞬时 dpr=1，
  backing 从 780×1688 掉到 390×844 永久糊。
- **ink-sound**：更严重——直接 `devicePixelRatio` 无上限（4K 屏 backing 爆炸），且用
  `ctx.scale` 非 setTransform，重复 resize 变换累积；坐标映射各处散乘裸 devicePixelRatio。
- **修法**：maxDpr 只升不降（`if(_d>DPR)DPR=_d`）；ink-sound 封顶 2、改 `setTransform` 重置、
  所有坐标映射统一用 `_maxDpr`。

### 4. ink-2048 桌面矮视口溢出
- `.game-board` 固定 380px，矮视口/窄屏溢出。
- 改 `width/height: min(380px, 100vw-24px, 100vh-250px)`，并在 board 本体加 touch-action:none。

## 验收方法（新坑均已回流本体）
- 冒烟 6 项/档：backingHealthy、canvasInScreen、noOverflow、touchActionNone、专属交互、zeroErrors。
- **新坑 1**：合成 MouseEvent 的 mousedown+mouseup 在 Chrome 中**不产生 click 事件**
  （安全行为）。gomoku 只监听 click，`tap()` 静默。→ harness 新增 `trustedClick()`（CDP 真实
  Input.dispatchMouseEvent），click-only 作品专用。
- **新坑 2**：`drag()` 原本只派 pointer 事件，ink-particles 只监听 mousemove → 拖动静默。
  → `drag()` 增加 `opts.mouse`（默认 true）同步派 mousedown/mousemove/mouseup（同 tap §15 双派）。
- **新坑 3**：连开 18 个 chrome 时 backingHealthy/交互偶发资源抖动 → bootHealthy 3 次换 profile、
  交互多落点补击、主循环整件重跑一次（zeroErrors 失败不重跑，避免掩盖真实代码错误）。

## 结论
9 件全部双档达标。其中 ink-2048 修复了「离线完全打不开」的简历演示级 P0，价值最高。
未做新件，符合迭代优先定位。
