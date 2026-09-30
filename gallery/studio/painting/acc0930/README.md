# 0930 L3 采用记录体检（Studio 欠账清偿）

## 起因
四档作品集主线（移动端 0918 / 加载 0927 / 叙事 0928 / 手感 0929）均已系统闭环，冻结动作全部卡在主人手机实机。队列 5 件超「待审 ≤2」闸，今日不得开新件。按五档优先级落到④ Studio 能力回流欠账：POOL.md 9 月体检之一「L3 采用记录核对」。

## 做法：账实核对（扫全部 works 真实引用，不凭总账）
逐条 grep 作品的真实 `<script src>` / `<link href>` 引用，与 POOL 表格比对，揪出三处账实不符：

1. **resize-debounce.js（v1.1）**：实际 6 件真 script 引用（gui-yu/ink-garden/lu-hua/mo-yin/qiu-chong/yue-bo）。
   - 原总账把「墨洇 mo-yin」误写成「墨隐」→ 已纠正。
   - 6 件中 5 件缺 L3 `uses:` 注释；ink-garden、mo-yin 原标 v1.0，而库 0927 已升 v1.1。
   - 处理：6 件头部统一补 `<!-- uses: lib/resize-debounce.js v1.1（接入日期，库 0927 升 v1.1） -->`。
2. **audio-lib.js（v1.1）**：实际 4 件真 import（ting-mo/can-he/lu-hua/tai-hen），另有 gui-yu/yue-bo/qiu-chong 3 件内联同源代码。
   - 原总账仅认听墨 1 件、标 selected（系墨韵早期来源被误算）。4 件真 import 已达 POOL「≥2 件在用 + 运行证据」的 validated 口径 → 状态升 validated，表格注明 4 真 import + 3 内联。
3. **ui-floating-stack.css**：gui-yu/yue-bo 2 件接入但无 L3 注释。
   - 处理：补 `<!-- uses: lib/ui-floating-stack.css（0928 接入） -->`。不标版本号（模块头文档本身无版本标记，避免自创版本造成新的账实不符）。

noise-lib / season-lib 的重复实锤仍按「第二件复用才提取」规则，待触碰山水作品时提取，本次不提前入池。

## 验收（复用 lib/cdp-harness.js，无新增能力）
脚本 `smoke_l3comments.js`：6 件桌面端 + gui-yu/yue-bo/ink-garden 移动端，共 9 个环境 × 3 锚点。
- 锚点：readyState complete / canvas 尺寸化且首帧已上画 / 零 JS 错误。
- 结果：**pass=27 fail=0**。
- firstInk 5.8–9.2s 为无缓存 headless 冷启环境值（与 0927 同环境口径），本次仅改 HTML 头注释，不构成回归。

## 改动清单
- 作品头注释：mo-yin / lu-hua / qiu-chong-v0915 / gui-yu / yue-bo-v0916 / ink-garden（仅注释，0 字节逻辑改动）
- lib/POOL.md：三处表格修正 + 维护区登记 0930 条目
- 本目录：smoke 脚本 + 本过程档

## 不做
- 不开新件（队列超闸，未过三硬闸）。
- 不动任何 JS/CSS 运行逻辑。
- 不把内联同源的 3 件改成 import（属各件自身迭代，超本次账实核对范围；已在 POOL 注明）。
