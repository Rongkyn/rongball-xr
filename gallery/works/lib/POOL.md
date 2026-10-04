# POOL.md — 绒球能力共享池总账

> 本目录是「绒球的房间」全部互动作品背后的**共享能力池**。
> 原则（2026-08-28 确立）：研究线把底层做深，作品线把体验做好看，可复用能力沉淀于此，供未来所有作品与任何 Agent 伙伴取用。
> **本文件面向陌生读者（人或 Agent）**：不假设你了解任何作品背景，凭本文件与各模块头部文档即可接入。
> 分层与状态词汇借鉴 AIOS Asset Intelligence（L1/L2/L3 模型）。

## 分层模型

| 层 | 回答 | 载体 |
|----|------|------|
| L1 池总账 | 有什么能力、什么状态 | 本文件 |
| L2 模块本体 | 具体怎么用 | `lib/*.js` 单文件 + 头部文档 |
| L3 采用记录 | 哪件作品在用哪个版本 | 作品 HTML 头部注释 `<!-- uses: lib/xxx.js vX.Y -->` |

## 状态词汇表

| 状态 | 含义 |
|------|------|
| `candidate` | 候选：单一来源，未复用 |
| `selected` | 已选用：被某作品接入使用 |
| `validated` | 已验证：≥2 件作品在用，有运行证据（即已 dogfood） |
| `deprecated` | 弃用：已被替代，保留供考古 |

## 入池标准（每条必须满足）

1. **自包含**：单文件、零外部依赖（或明确声明），拷走即用。
2. **接口文档**：模块头部写清公开 API、参数、最小示例。
3. **状态标注**：使用上方状态词汇表，不贴永久的"新/旧"标签；真相 = 模块身份 + 版本号 + 入池日期。
4. **坑点标注**：已知限制、浏览器策略约束、易踩的坑写明，不藏在代码里。

## 提取触发规则

- 能力首现留在作品内，**第二件作品需要它时**才提取入池（避免过早抽象）。
- 例外：已在两件以上作品中**重复实现**的能力（重复造轮子实锤），直接排期提取。

## 消费规则（任何 Agent 使用前）

1. 查本文件（L1）确认能力与状态。
2. 读模块头部文档（L2）确认接口与坑点。
3. 采用后在作品 HTML 头部留 L3 采用记录：模块 + 版本 + 日期。
4. 发现模块缺陷：优先修复并升版本号，在模块头部 CHANGELOG 记录；不另起分支版本。

## 非目标（Non-goals）

- 不是作品档案馆：作品本体在 `works/*.html`，这里只放跨作品能力。
- 不是代码片段堆场：没有明确第二使用场景的能力不提前入池。
- 不是"可能有用"的囤积：每条入池能力必须有真实的复用触发或重复实现证据。

---

## 一、已入池

| 模块 | 能力 | 状态 | 文档 |
|------|------|------|------|
| `audio-lib.js` | Web Audio 声音资产：KS 古琴拨弦、加法铃音、master 总线出声口 | `validated`（真 import 4 件：听墨/残荷/芦花/风铎；另有桂雨/月波/秋虫 3 件内联同源代码未改 import，按 dogfood 证据补记；0930 体检复核） | `README.md` |
| `resize-debounce.js` | 窗口 resize 防抖 + 构造即自动首次尺寸化 | `validated`（真 script 引用 6 件：墨园/桂雨/月波/秋虫/芦花/墨洇，0927 双端 42/42；0930 复核 L3 采用注释齐全） | 模块头文档 |
| `cdp-harness.js` | CDP 交互验收 harness（建连/goto/tap/drag/像素/错误） | `validated`（全部作品验收在用；0927 错误带 `[file:line]` 详情） | 模块头文档 |
| `ui-floating-stack.css` | 底部浮层栈：hint 操作提示 + 角落印章 seal 的版式与分层（窄屏/矮视口响应式） | `validated`（桂雨/月波 2 件接入，0928 双端 56/56；0930 补 L3 采用注释） | 模块头文档 |

## 二、重复实现实锤（优先提取）

| 候选模块 | 能力 | 重复证据 | 计划 |
|----------|------|----------|------|
| `noise-lib.js` | 二维噪声（地形/云雾/肌理底座） | `living-landscape.html` SimplexNoise 类 与 `mountain-dwelling.html` Noise 类各自独立实现 | 下次触碰任一山水作品时提取，统一为带种子噪声模块 |
| `season-lib.js` | 四季配色/参数配置 | `living-landscape.html` getCurrentSeasonConfig 与 `mountain-dwelling.html` SEASONS 各自定义 | 与 noise-lib 同期评估 |

## 三、单一来源候选（candidate）

| 候选模块 | 能力 | 来源作品 | 备注 |
|----------|------|----------|------|
| 水墨物理引擎（扩散/毛细/蒸发/纤维吸附/锋线追踪） | 一滴墨洇开的完整物理 | `mo-yin.html` | 研究课题 case001 验证资产，将作为 `ink-sim.js` 物理底座统一提取（见第四节） |
| 液体/纸面声组（落墨噗/行笔摩擦/锋线耳语/拂纸唰） | 模拟状态驱动的声音合成，frontAcc 锋线活动度标定 | `ting-mo.html` | 已在 audio-lib 路线图登记；参数档案见 `works/ting-mo-notes.md` |
| 笔刷引擎（brushPath stamp 铺贴） | 压感墨色、枯笔飞白、笔触纸纹 | `ink-garden.html` | 墨园主线壁垒，体量大，版本稳定后提取核心层 |
| 踏雪三件套（递归枝干/遮罩像素积雪/粒子飘落） | 程序化植物形态+积雪累积+氛围粒子 | `ta-xue.html` | 下一件植物或季节主题作品出现时提取 |
| 响应式方画框（CSS `--frame: min(92vw,704px,72dvh)` + canvas 100% 缩放 + 窄屏媒体查询） | 固定方形画布在手机/横屏完整入屏不改物理坐标 | `ting-mo.html` v0918 | candidate：待第二件方形作品（残荷/墨洇）移动端打磨时提取为 ui-layout 片段 |
| 触屏清纸手势（长按 650ms + 位移>12px 取消 + contextmenu 拦截 + `pointer:coarse` 提示切换） | 移动浏览器 dblclick 不可靠时的等效"重开"原语 | `ting-mo.html` v0918 | candidate：与上同期提取；注意须与作品自身 pointerdown 共存（capture 阶段挂） |
| 自适应性能降档器（运行时画像 `perfProfile` + 滑动窗口 FPS 监控 + 低于阈值降级/回升迟滞防抖） | 高密度粒子/植株场景保帧率：关落叶、减风动刷新、降细节，按设备内存/CPU 核心/移动端给初档 | `ink-garden.html` v0919 | candidate：仅墨园 1 件，待第二件高负载实时作品复用时提取为 perf-governor 片段；降级项须可平滑过渡避免视觉跳变 |

## 四、规划中（研究线输血）

| 候选模块 | 能力 | 来源 | 状态 |
|----------|------|------|------|
| `ink-sim.js` | 统一水墨模拟引擎：滴墨/扫笔/干涸/积墨四场景标准接口，内嵌谱系对比最优算法 | 研究课题「水墨模拟算法谱系」（ink-simulation-atlas） | 7 算法横向对比中，选型后移植 JS 入池；作品交互原语（点击/拖动/等待/叠加）与四场景一一对应 |

## 五、明确不入池

- `ink-2048.html` / `ink-gomoku.html` 游戏逻辑：强专用，无复用场景。
- `hou.html`：纯氛围小品，无独立通用引擎。
- 各作品构图/文案/印章：属于作品个性，不是能力。

## 维护

- **资产管理员角色**由绒球每周复盘日程（周日）承担：检查候选是否达提取条件、L3 采用记录是否齐全、版本是否过期、清单是否与实际一致。
- 体检记录：20260830 首次体检——audio-lib 状态由 validated 修正为 selected（实际仅听墨 1 件 import）；踏雪三件套维持 candidate（无第二使用作品，触发规则如此）；noise-lib/season-lib 重复实锤仍待触碰山水作品时提取。
- 20260918 听墨移动端深磨：新增两条候选（响应式方画框 / 触屏长按清纸），均为单一来源，按"第二件复用才提取"留 candidate；audio-lib 采用情况无变化（仍 selected）。
- **20260930 采用记录体检（账实核对）**：扫全部 works 真实引用后修正三处账实不符——①resize-debounce 实际 6 件真 script 引用（gui-yu/ink-garden/lu-hua/mo-yin/qiu-chong/yue-bo），原总账把「墨洇」误写成「墨隐」，已纠正；6 件 L3 采用注释补齐并统一标 v1.1（ink-garden/mo-yin 原标 v1.0，库 0927 已升 v1.1）。②audio-lib 实际 4 件真 import（ting-mo/can-he/lu-hua/tai-hen），另有 gui-yu/yue-bo/qiu-chong 3 件内联同源代码；4 件真 import 达 validated 口径（旧总账仅认听墨 1 件、标 selected，系墨韵早期来源被误算），状态升 validated 并在表格注明。③ui-floating-stack 2 件接入（gui-yu/yue-bo）补 L3 采用注释。noise-lib/season-lib 重复实锤仍按触发规则待触碰山水作品时提取，本次不提前。
- 本池随 rongball-room 仓库公开，取用请注明来源。

*维护者：绒球 🧶 ｜ 分层模型致谢 AIOS Project Asset Intelligence*

---

## 2026-09-21 回流（残荷 v0921 移动端深磨）

### A. 移动端浮层「保证性净空」原则（跨件复用）
- 竖长移动屏里，桌面端留出的浮层锚区（如题诗固定右侧）可能被占满宽度的画面元素侵入。**浮层可读性不能依赖"随机构图恰好净空"**——即使 PRNG 确定性，不同种子/实时粒子位置仍会侵入（残荷 m42 实测诗区深色占比 0.198）。
- 处方：`#poem::before` 加 radial-gradient 纸色衬板（light 主题）或 text-shadow（dark 主题，如苔痕），opacity 随浮层一起过渡淡入；边缘渐变到透明。
- 配套：`@media (pointer:coarse)` 下把浮层移到画面天然净空侧（残荷：右→左），但**仍要衬板兜底**，不能只挪位置。

### B. 竖屏纵向分布因子（VY）
- 竖长移动屏（`H > W*1.35`）把画面纵向分布区间 ×1.28 向下拉长，避免主体挤在上半截、下半空白；横屏/桌面保持 1.0。环境元素、事件落点距离同步缩放，并 `Math.min(H-6, ...)` 防出界。

### C. 验收钩子的确定性落点
- auto/验收自动触发的事件（如自动雨）应**瞄准确定性目标**（如最大盛水叶中心、spread 收至 0.4 目标宽内），不要随机撒全屏——否则偶发喂不满触发条件导致 waitFor 超时 flake。

---

## 2026-09-22 回流（桂雨 / 月波 v0922 移动端深磨）

### D. resize 防抖（120ms + 尺寸不变跳过）——三件实锤，提取条件已达
- 移动端地址栏收放 / 页面滚动会高频触发 `resize`，直接做画布重排会整屏清空闪 + 景物跳变（墨园 0922 首修；桂雨/月波 0922 同款复现）。
- 处方（三处同源）：`setTimeout(performResize,120)` 防抖；`performResize` 先比 `innerWidth/innerHeight`，与上次相同直接 return；首次初始化保持同步。
- 已在 ink-garden / gui-yu / yue-bo 三件各自实现 → **已提取 `lib/resize-debounce.js`（0923，selected）**，墨园/桂雨/月波/墨洇接入；0924 扩用到芦花/秋虫（库内 7 件实时画布件全部接入）。

### D2. 零尺寸守卫 + 除法步长兜底（0924 秋虫 P0 实锤）
- 页面解析早期 / 部分 headless 时序，`window.innerWidth/innerHeight` 可能为 0（mobile override 前后、about:blank 默认布局 980 等口径都会出现）。
- 两类致命写法：① `resize` 里直接用 0 尺寸建 backing store / 渐变（退化）；② **`for(x=0;x<=W;x+=W/k)` 步长 `0/k=0` → 同步死循环**，`readyState` 永停 "loading"，表现为导航不返回（极似 harness/CDP 挂）。
- 处方：resize 开头 `if(innerWidth<=0||innerHeight<=0) return;`（真实尺寸到达的下一次 resize 补上）；一切「尺寸/常量」作循环步长处写 `Math.max(1, W/k)`。排查口径：`Page.navigate` 已返回但 readyState 恒 loading → 先查同步脚本里的除法步长循环。

### D3. backing 的 DPR 用「观测最大值」，不信 resize 瞬时 dpr=1（1002 墨洇实锤，candidate）
- 症状：移动模拟（真机同理的 CDP 重放时序）加载后 Chrome 补发一次 resize，该回调里 `devicePixelRatio` 短暂读成 1；resize 若用「当前 dpr」重设 backing，会把正确的 css×2 retina 画布降成 css×1 → 墨缘/画面发糊。load 时刻正确、数百 ms 后被重置是判别要点（详见 harness 避坑#20）。
- 处方：作品侧缓存 `maxDpr`，每次 resize `if(devicePixelRatio>maxDpr) maxDpr=devicePixelRatio`，backing 用 `css × Math.min(maxDpr,2)`——只升不降（真机 DPR 不会因地址栏收放变 1）。
- 状态：墨洇 1 件实锤 → candidate；第 2 件同款（resize 里 backing 被 dpr=1 降档）出现时，连同 D/D2 一并评估提取 `lib/canvas-backing.js`（零尺寸守卫 + maxDpr + backing 同步三件套）。

### E. 底部浮层栈（hint / 印章分层）——双件 candidate
- 固定在底部角落的两个浮层（居中 hint、右下角印章）在竖屏会纵向区间重叠，横屏矮视口更严重。
- 处方：窄屏把印章抬到 hint 之上（`bottom:76px`，按 hint 实际高度预留净空）；横屏矮视口（`max-height:430px`）印章缩小并上抬；二者都是 fixed 定位，按"底栏分层"排布而非左右避让。
- 踩坑：响应式覆盖块必须置于基础规则**之后**（同特异性源码后者胜，见 harness 避坑#18b）。
- ~~candidate：桂雨/月波 2 件同款~~ → **已提取 `lib/ui-floating-stack.css`（0928，validated）**；提取时实测发现原双件媒体块写在基础规则之前，窄屏印章分层与 #poem 手机定位此前从未生效（见下方 §K）。

### F. 触摸合成事件 pointerType 口径
- 验收脚本合成 pointer 事件驱动 touch 路由时，`pointerType:'touch'` 才与真机等价；`tap()` 默认 mouse 双派在部分只按触摸语义分流的旧作上不等价（0922 月波点位实测）。记入 harness 避坑#18，不单独入池。

---

## 2026-09-25 回流（芦花 / 秋虫 横屏布局深磨）

### G. 横屏布局因子（LANDSCAPE 三件套）——双件实锤，candidate
- 横屏（`W > H`，典型 844x390）下，凡「数量按 W、高度按 H」的生成式场景都会出两类病：
  ① 数量随宽膨胀、细元素密集成林；② 主体高度随矮缩短、只占画面下半、顶部空。芦花（数量+株高）
  与秋虫（地平线+草高）同款复现。
- 处方（三件套）：
  1. `LANDSCAPE = W > H`（resize 内设置）；
  2. **密度按有效画幅** `span = min(W, H*2.2)`，数量/丛宽都用 span，宽屏不翻倍；
  3. **竖向尺寸补偿**：株高/草高横屏乘系数（芦花 1.32、秋虫 1.55，按主体类型取），地平线横屏下移
     （秋虫 GROUND 0.74H→0.82H），再以 `min(..., H*0.96)` 封顶防出界。
- candidate：芦花/秋虫 2 件；第 3 件同款出现时提取 `lib/landscape-layout.js`（span + 尺寸补偿两函数）。

### H. resize 必须「重建场景」而非只改画布（旋转正确性）
- 秋虫 resize 原先只 `W/H=innerWidth; backing store 重设`，**不重建**草丛/虫/萤——运行时旋转后
  位置停留在旧朝向，与新 LANDSCAPE 因子叠加必错。
- 处方：resize 末尾「仅在已有场景时」调用 rebuild（首帧由启动序列完成，避免重复）。
- 判据：凡生成式坐标（clump/actor 存绝对 x,y 的）resize 后都要重建；只做 DPR/画布缩放不算响应旋转。

### I. Array.from 回调参数顺序 + ASI（JS 语言坑，跨件踩中即致命）
- `Array.from({length:n}, (ci) => ...)` 的首参是**元素值**（空槽为 undefined），**index 在第二参**。
  误把首参当 index → `((undefined+0.5)/n)*W = NaN` → 坐标 NaN → gradient/arc 非有限报错，
  表现为「EXC:Uncaught」但画面部分正常、极难一眼定位。正解 `(_el, ci) => ...`。
- 叠加 ASI：箭头函数表达式换行后以 `+ x(...)` 起行会被解析为独立语句、箭头返回 undefined。
  用**块体 `{ const base=...; return base + x(...); }`** 一并规避。
- 排查口径：JSON.stringify 会把 NaN 显示成 `null`，排查时直接打原始数组 / `Number.isFinite`，勿被误导。

### J. 硬弹簧显式积分的稳定域（健壮性加固，非本次 NaN 真根因）
- 弹簧 `omega += (torque - k*theta - damp*omega)*dt` 显式积分，稳定步长约 `2/sqrt(k)`；k≈21 时
  h≈0.44 是无阻尼理论值，FAST(SPEED=3)+大扭矩会逼近边界。
- 处方（芦花 stepReeds）：按 `ceil(dt/0.0085)` 子步进 + 末尾有限性兜底与 theta/omega 合理域 clamp。
  属防御性加固；真遇到 NaN 仍应先查生成期数据（本次真根因是 I，不是物理）。

## 2026-09-28 回流（ui-floating-stack 提取 · 桂雨/月波）

### K. 外链 CSS 的 file:// 跨源规则读取 + 源码顺序坑的系统性危害
- **K1 读不到 cssRules 不等于没加载**：file:// 下访问外部 `<link>` 样式表的
  `document.styleSheets[i].cssRules` 会抛 "Cannot access rules"（跨源保护），但样式照常应用。
  判定外链 CSS 是否加载生效 = `styleSheets` 中 href 命中文件名 + 元素 getComputedStyle 取到该片段专属样式；
  不要依赖读 cssRules。
- **K2（对坑#18b / §E 的实锤升级）**：源码顺序坑的真实危害是「整套手机版式静默失效」。
  桂雨/月波把 `@media(max-width:480px)` 块（印章 bottom:76px + #poem 手机定位/17px）写在
  `.seal` / `#poem` 基础规则之前，同特异性后者胜 → 竖屏手机 computed sealBottom=26px（与 hint 同底重叠）、
  #poem font-size=24px/定位=桌面值，**这些响应式覆盖多日从未生效**，而 matchMedia 一直报 true。
  铁律：响应式断言必须核对 getComputedStyle 实际值，禁只验 matchMedia / matchMedia 报 true ≠ 值已变。
  已提取共享片段（基础规则在前、媒体块统一在后）系统性消除该顺序漂移；#poem 作品专属覆盖移至内联样式末尾。
- 验收：acc0928/acceptance_0928.js，桂雨/月波各 28 项（4 视口 + show 交互）共 **56/56 PASS**，零 JS 错误。

## 2026-09-29 回流（交互手感系统审计 · 6 件）

### L. touch-action 必须挂在「接收手势的元素本体」——不继承，写在 body 上静默失效
- **L1 现象**：can-he/lu-hua/gui-yu/yue-bo/qiu-chong 把 `touch-action:none` 写在 `html,body{}`、
  ink-garden 写在 body，但 `getComputedStyle(canvas).touchAction` 实测全是 `auto`
  （**touch-action 非可继承属性**）。仅 ting-mo 一开始写在 `canvas#ink` 上正确。
- **L2 真机后果**：canvas 上拖动类手势被浏览器滚动/缩放仲裁先于页面劫持、pointermove 被打断
  （各件 pointermove 也均未 preventDefault）。合成 PointerEvent 无法复现此层（JS 派发 4/4 正常），
  必须以 `getComputedStyle` 实际值 + 标准判定。
- **L3 处方（标准正解，最小改动）**：声明加到 canvas 本体
  `canvas{ … touch-action:none; }`；顺带补桌面 `cursor:crosshair`（原 5 件 cursor=auto 无可点暗示）。
- **L4 手感验收口径（新增维度）**：①先读各件触发条件、按真实热区选点（gui-yu 树冠 y≈0.30、
  yue-bo 水面 y≈0.75、qiu-chong 草地带 y≈0.72；统一点位必漏→假阴性）；②先读交互模型再写断言
  （ink-garden 是点按种兰非自由画笔、按钮 #btn-clear）；③boot 后 innerWidth 未稳定时 canvas 短暂为
  默认 300x150，健康探针用 waitFor 等 backing 与视口尺寸一致；④连续密集 launch 多实例会串台（坑#8/#16）：
  端口错开 + kill 冷却 + 不健康换 profile 重开。
- **harness 本体增强**：`drag(sel, pts, {pointerType:'touch'})` 支持真触摸拖动（默认 mouse 向后兼容）。
- 验收：acc0929/acceptance_0929.js，6 件 × 移动+桌面共 **12/12 PASS**，零 JS 错误。

## 2026-10-04 回流（冻结闸口统一回归 · 8 件）

### M. Freeze Gate 冻结前跨件回归（固化流程，可复用脚本）
- **场景**：各主线专项验收闭环后，大改（如墨洇高清化）到主人圈选冻结之间，跑一次「公共冻结健康闸口」
  确认无「修 A 坏 B」。不重复各件专项断言，只测公共项：加载完整 / backing 非默认 300×150 且对齐 /
  画布入屏不溢出 / touch-action:none + 真触摸响应 / 清纸入口可用。双档（390×844@2、1280×720@1）。
- **脚本**：`acc1004/freeze_gate_1004.js`（配置驱动，8 件清单 + 每件画布/镜像/清纸模式），
  结果写 `freeze_gate_1004_result.json`。后续冻结前/大改后直接重跑。
- **M1 两种 backing 形态要分开判**：responsive=backing 随 css×dpr；fixed=固定物理坐标方画框
  （ting-mo #ink 是扩散网格 N=320，CSS 缩放显示；704 是宣纸纹理层 #paper，别搞混）。
- **M2 清纸入口形态**：多数件是按钮；mo-yin 无按钮，桌面双击 / 移动长按 800ms，判据只认 tw（总水量）归零
  ——宣纸层固定底纹会让墨色像素判据误报。
- 验收：8 件 × 双档 **16/16 PASS**，零真实 JS 错误。线上技术冻结闸口清空，待主人实机 + 圈选。

### N. 手势后读镜像禁固定延时（harness 避坑#21）
- can-he 镜像每 10 帧才刷一次（手势后立即读=旧帧，误报未响应）；fast=1 下 rainLevel 按 dt×3 快衰
  （τ≈1.4s，读太晚归 0，也误报）。正确口径：手势后 waitFor「镜像字段离开手势前值」，~1200ms 窗口轮询。

## 2026-10-05 回流（绒丝/踏雪/天灯 冻结前体检 · 过程档补档）

### O. D3 第 2/3 件实锤 → 已提取 `lib/canvas-backing.js`
- floss-threads、tian-deng 两件 resize 里「当前 dpr」重设 backing，移动模拟下 backing 被降成 css×1（1005 冒烟实测 backing 390×844、应为 780×1688）。连同墨洇共 3 件 → §D+D2+D3 提取条件达成。
- **已提取 `lib/canvas-backing.js`（selected）**：零尺寸守卫 + maxDpr 只升不降 + backing/变换同步三件套。
- floss-threads/tian-deng 本次按最小改动直接内联修复（未引入 require/构建链，两件均为单文件 HTML）；后续接入构建或大改时换库，不为此返工。
- 复跑冒烟：`acc1005/smoke_1005.js` 三件 × 双视口 **6/6 PASS**，零真实 JS 错误。

### O2. 等比入屏规则禁囚于窄屏媒体查询（harness 避坑#22）
- ta-xue 立轴缩放只在 `@media(max-width:760px)` 生效，矮宽桌面（1280×581）纵向溢出 123px。处方：入屏缩放放媒体查询外，媒体查询只留窄屏增量。判据固化为「geom.top≥0 且 rect 高 ≤ visualViewport.height」双视口必过。
- 同批回流：floss canvas 本体补 touch-action（§L 同型，body 上的不算）；headless 阻塞字体 <link> 拖 load 的口径（接受 interactive+画布就位）。

### O3. 过程档欠账清零
- 绒丝/踏雪/天灯三件 process 档补齐：`process/件名/{intent,iteration-log}.md`，v1–v4 按作品 notes 回填，1005 修复记为 v5。
