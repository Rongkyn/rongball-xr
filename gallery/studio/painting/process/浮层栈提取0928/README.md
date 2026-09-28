# ui-floating-stack 提取 · 过程档（2026-09-28 创作时间）

> 属性：**Studio 共享能力回流欠账清偿**（BOARD 优先级④；非新件、非视觉改款）
> 无主人点题；待审队列 5 件超闸（需 ≤2），今日不开新件。

## Intent（为什么做这个）
- BOARD §六两次挂账「底部印章/hint 分层（桂雨/月波双件）→ ui-floating-stack 仍欠」；
  POOL §E 记载双件重复实现，达 POOL 提取触发规则的「重复实现实锤」标准。
- 移动端/加载性能/四段式叙事三条作品集主线此前已分别深磨（0918-0927），
  今日清这笔已明确的能力回流欠账，直接服务 P13 冻结（共享片段降低 7 件库的重复维护面）。

## 基线实测（CDP，非推理）
探针 390x844 / 844x390，发现**两类长期潜伏的「写了但没跑」缺陷**，根因同一：
1. **竖屏印章分层从未生效**：`@media(max-width:480px){ .seal{bottom:76px} }` 写在
   `.seal` 基础规则（bottom:26px）**之前**，同特异性源码后者胜 → computed sealBottom=26px，
   红印与底部 hint 同底重叠（matchMedia 报 true 但值没变，极易骗过断言）。
2. **#poem 手机定位/字号从未生效**：同块内 `#poem{right/left,top:21%/19%,font-size:17px}`
   也在 `#poem` 基础规则之前 → computed font-size=24px、top≈26%、side≈8%/左侧≈7%？实测
   gui-yu 31px(8%) / yue-bo 262px(右侧非7%)，手机版诗的版式与桌面完全相同。
- 横屏矮视口（@media max-height:430px）因媒体块在基础规则之后，一直正确（48px/32px）。

## 做法
1. 新建 `gallery/works/lib/ui-floating-stack.css`：hint（底居中、10s 淡入淡出）+
   seal（右下红印，.show 亮起）+ 三个响应式覆盖（≤480 印章抬 76px / ≤340 收字距 /
   高 ≤430 缩印抬 48px）。**顺序：先基础规则、所有媒体覆盖块统一置于其后**。
   - 配色暴露 CSS 变量 --fs-hint-color/--fs-seal-bg/--fs-seal-color，默认值=原双件色值，零视觉漂移。
   - 头部文档写清依赖（.ui 基础类）、用法、坑。
2. gui-yu / yue-bo：删除内联 hint/seal/keyframes/hintFade 块，head 加
   `<link rel="stylesheet" href="lib/ui-floating-stack.css">`；作品专属 `#poem` 手机覆盖块
   移到内联 `<style>` 末尾（基础 #poem 规则之后），让其真正生效。
3. 功能行为零改动（JS 一字未动，仅 CSS 来源切换）。

## 验收（复用 lib/cdp-harness.js）
`acc0928/acceptance_0928.js`：每件 4 视口（桌面 1280x860 / 竖屏 390x844 / 超窄 320x667 /
横屏 844x390）+ show 交互场景。
- gui-yu **28/28 PASS**、yue-bo **28/28 PASS**（合计 56/56），全程零 JS 错误。
- 关键实证：竖屏 sealBottom 由 26px → **76px**（分层成立）；#poem 手机字号 24px → **17px**、
  top/side 定位生效；横屏 seal 48px/32px 保持；seal.show opacity=0.85。
- 截图目视：竖屏红印明确落在 hint 两行文字上方，不再重叠。

## 新踩的坑（当轮回流）
- **K（CSS 跨源规则读取）**：file:// 下读外部样式表 `sheet.cssRules` 抛
  "Cannot access rules"（跨源保护），不能用「读到 .seal 规则」判定外链 CSS 已加载；
  但样式照常应用。处方：判定 = `styleSheets` 里 href 命中片段名 + 元素 computed 值取到
  片段专属样式（红印底色），不读 cssRules。已回流 POOL §K 与本片段头文档。
- **复用强化（对既有坑#18b / POOL E 的重要补充）**：源码顺序坑不止「媒体块被覆盖」，
  本次实锤它能让两件作品的**整套手机版式（印章分层+诗定位）静默失效多日**且 matchMedia
  仍报 true。排查铁律：凡响应式断言，必须读 getComputedStyle 实际值核对，禁只验 matchMedia；
  提取共享片段是系统性消灭此类顺序漂移的正解。

## 入池/待办
- ui-floating-stack.css 状态 **validated**（桂雨/月波 2 件接入、有运行证据）。
- 后续：第 3 件需底部浮层栈的作品出现时直接复用；noise-lib/season-lib 重复实锤仍待触碰山水件。
