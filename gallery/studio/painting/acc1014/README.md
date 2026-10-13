# acc1014 · 挂廊入口审计 + 山水间移动端核心交互补齐 + 封面 resize 空白修复（2026-10-14）

## 为什么做这件
今日硬闸：待审队列 5 件 > 2，不得开新件；无主人点题；四主线（移动端/加载/叙事/手感）技术闸口
已清空、冻结全卡在主人 Pico/手机实机 → 按优先级②/③磨旧作。选了两个**真实未阻塞缺口**（证据驱动，非臆造）：

1. **作品集挂廊 `gallery/index.html` 本身从未做过双端专项审计**——它是招聘方第一落点，比任何单件都先被看到。
2. **P12 代表作 living-landscape（山水间）移动端核心交互缺失**——1013 真触摸回归只验了点按涟漪
   （freeze_gate 配置 interact:'tapPx'），拖动扰流与滚轮调速在触摸端完全没测过。

## 发现（先证后改，区分探针假阴性与真实缺陷）

排查中连踩三类**探针假阴性**（已回流 harness 避坑#31）：
- 封面选择器想当然写 `.card-cover canvas`，实际类名是 `.cover canvas` → 误报 noCanvas；
- 只采画布左上角 8×8，山/粒子内容不在角落 → 误报未绘制，改全画布抽样；
- 28px 粗步长采样踩中 2048/棋盘透明网格间隙 → 误报空白；全像素扫描证实桌面 grid2048 有 29756、
  gomoku 有 7199 非纸色像素（桌面健康，问题只在移动端 resize 后）。

### 真实缺陷（3 类，均修复）

| # | 位置 | 问题 | 性质 |
|---|------|------|------|
| 1 | works/living-landscape.html | 只挂 mousemove/click/wheel，无任何 touch 监听：手机上**拖动扰流场、滚轮调速两大核心交互零响应**，只能看不能游 | 作品真缺陷 |
| 2 | works/living-landscape.html | 桌面 document click 对所有点击 push 涟漪，触摸点季节按钮时合成 click 也产涟漪（双发/误触 UI）；对 cancelable=false 的 touchend 硬调 preventDefault 刷控制台告警 | 作品真缺陷 |
| 3 | gallery/index.html | grid2048 / gomoku 封面是 init 一次性 draw()（无 rAF），移动端 dpr2 补发 resize 时 canvas.width 重置清空画布、无人重绘 → **两张封面手机端空白** | 挂廊真缺陷 |
| 4 | gallery/index.html | hero「七件互动小品」、section「二十则 / 20 Pieces」与实际 21 卡账实不符；两张卡面只写鼠标能力 | 内容账实 |

## 修复

### living-landscape.html
- hint DOM 加 `id="hint"`；触摸分支（`'ontouchstart' in window || maxTouchPoints>0`）：
  - 隐藏桌面自定义圆光标，hint 切换为「单指拖动…/轻点…/双指竖拖…」；
  - 单指拖动 → 直写既有 mouseX/mouseY（复用鼠标力场，不另造）；移动阈值 8px 区分轻点；
  - 双指竖拖 → wheel 语义，两指中点 deltaY×0.012 改 timeScale（clamp 0.2–3.0，上滑加速/下滑减速）；
  - touchstart 时 elementFromPoint+closest('.season-indicator') 记录起按是否落在季节按钮
    （抬手坐标会偏移）；落在按钮上的点按放行给按钮自身 click、不产涟漪；
  - 未移动的画布轻点在 touchend 产 1 个涟漪，`if(e.cancelable) e.preventDefault()` 抑制合成 click 双发。
- 桌面 document click 监听加 `.closest('.season-indicator')` 提前 return（鼠标点季节点也不再多涟漪，
  顺手修掉旧瑕疵）。
- body 原有 `touch-action:none; overflow:hidden` 无需改 CSS。
- 验收期临时探针 `?acc1014=1`（window.__acc1014 镜像闭包变量）**验收后已移除**，交付本体无 debug 钩子。

### gallery/index.html
- 计数统一「二十一件互动小品」「作品 · 二十一件 / 21 Pieces」；
- ink-particles 卡：「随鼠标挥毫」→「随手势挥毫」、描述「鼠标或指尖过处」、tag「鼠标 · 触摸」；
- living-landscape 卡：「手势或鼠标化作"气"扰动流场，轻点激起涟漪，滚轮或双指竖拖调节时间流速」；
- init 内 `let paint=null;`；grid2048 / gomoku 两分支结尾 `draw();` → `paint=draw; draw();`；
  resize() 末尾加 `if(paint) paint();`（一次性封面 resize 清空后补绘；rAF 常驻的 5 张无需注册）。

## 验收（复用 lib/cdp-harness.js，真触摸/真鼠标 CDP，非合成事件）

- `landscape_touch_1014.js`（m390 390×844@2，Input.dispatchTouchEvent）**11/11 PASS**：
  启动零错 / 圆光标隐藏 / hint 切换 / 单指拖动映射 mouseX,mouseY / 轻点恰好 1 涟漪 /
  350ms 后无迟到合成 click / 季节点无涟漪 / 季节点仍切季 / 双指上滑 1.00→3.00 /
  双指下滑 3.00→0.20 / 收尾零错。
- `landscape_desktop_1014.js`（1280×720，dispatchMouseEvent + mouseWheel）**9/9 PASS**：
  桌面 hint/cursor/移动映射/canvas click +1 涟漪/季节点切季无涟漪/wheel 1.00→1.40/零错（零回归）。
- `gallery_baseline_1014.js` 三档（m390 / desk 1280×720 / land 844×390）**24/24 PASS**：
  ready / 零真错误 / 21 卡 / 7 张 canvas 封面三端全绘制 / 无横向溢出 / 链接全相对 / 计数一致。
  结果见 `gallery_baseline_1014_result.json`。
- `acc1013/freeze_gate_1013.js` 全量回归 **24/24 PASS**（含 living-landscape mobile/desktop），无「修 A 坏 B」。
- 视觉证据：`mcovers_2048_gomoku.png`（移动 2048 数字方块+五子棋盘棋子已画出）、
  `mhero_1014.png`（移动页首「二十一件」无溢出）、`landscape_touch1014.png`、
  `baseline_{m390,desk,land}.png`、`scroll_{m390,desk}.png`。

## 回流
- harness 头部新增避坑 **#30**（触摸合成 click 双发/误触 UI 的验收铁律 + cancelable 守卫）、
  **#31**（像素探针三类假阴性）；
- POOL.md 新增 **§AH**（单路由 mousemove/wheel → 触摸映射范式，第 2 件实锤，candidate 不提前抽库）、
  **§AI**（一次性静态 canvas 封面 resize 清空必须注册重绘，candidate，第 2 件复现即提
  lib/static-canvas-cover.js）、**§AJ**（挂廊账实审计）。
- harness 无新原语（touchDrag/双指 dispatchTouchEvent 均为既有 API 直接调用）。

## 待主人（唯一未闭环项）
Pico / 手机实机验收 living-landscape 触摸手感：单指拖动扰流、轻点涟漪、双指竖拖调速、季节点按；
并看手机端挂廊 2048/五子棋封面是否正常显示。

## 纳管说明
脚本（4 个正式 + 3 个辅助审计）、结果 JSON、关键截图随仓纳管；11 个 cdp-harness 临时 user-data-dir
（~35MB：coverdeep/ covmob/ dbgd/ fg1014-*/ land1014*/ scroll_*/ shotcovers/）与一次性调试脚本
dbg_dot.js 已在 .gitignore 排除。
