# 墨园 · Acceptance Receipt

> 验收员：独立 sub-agent（Visual Continuity Steward + Product Acceptance 双重角色）
> 验收日期：2026-08-14
> 作品文件：`gallery/works/ink-garden.html`（32,945 bytes）
> 原型参照：`绒球创作时间/20260813/墨园.html`
> 验收方式：完整代码审查 + JS 语法检查 + 原型核心算法逐行对比，未修改作品任何代码

---

## Preflight Report

### 1. JS 语法检查

- 从 HTML 中提取 `<script>` 内联 JS（26,251 字符），执行 `node --check`：
  - **结果：SYNTAX OK**，零语法错误。
- `"use strict"` 模式 ✓
- IIFE 包裹，无全局污染 ✓
- 所有花括号、圆括号、方括号配对正确 ✓

### 2. 文件大小

- 32,945 bytes ≈ 32 KB，远低于 500 KB 上限 ✓
- 但引入了 **3 个外部 Google Fonts 请求**（详见验收要点 #7）

### 3. 依赖检查

| 依赖 | 类型 | 状态 |
|------|------|------|
| Google Fonts (Ma Shan Zheng, ZCOOL XiaoWei, Noto Serif SC) | 外部 CDN | ⚠️ 违反"零外部依赖"技术约束（有 fallback） |
| 无 JS 库/框架 | — | ✓ |
| 所有 CSS/JS 内联 | — | ✓ |
| 无图片/音频等外部资源 | — | ✓ |

### 4. DOM 引用完整性

- 所有 `getElementById` 调用目标元素均存在于 DOM 中 ✓
- `querySelectorAll('.pbtn[data-plant]')` 选择器匹配 7 个按钮 ✓
- 无未定义变量引用 ✓

### 5. 核心算法保留（原型对比）

| 核心算法 | 原型 | 作品 | 状态 |
|----------|------|------|------|
| 递归分形 `growBranch()` | ✓ | ✓ | 完整保留 |
| 种子随机 `rand(offset)` (sin-based) | ✓ | ✓ | 完整保留 |
| 风力系统 (strength/targetStrength/direction) | ✓ | ✓ | 完整保留 |
| 落叶粒子系统 `fallingLeaves` | ✓ | ✓ | 完整保留 |
| 墨色深度变化 (inkMix) | ✓ | ✓ | 完整保留 |
| 宣纸纹理逐像素生成 | ✓ | ✓ | 完整保留（改进：防抖缓存） |
| 枝条分段曲线 (curveAmt) | ✓ | ✓ | 完整保留 |
| 分枝概率/双枝概率/中部分枝 | ✓ | ✓ | 完整保留 |
| 松针/梅花/竹叶/普通叶四种渲染 | ✓ | ✓ | 完整保留 |

**结论**：作品在原型基础上改进，核心算法 100% 保留，未从头重写，符合技术约束。

---

## Brief 验收要点逐条结果

### 要点 1：六种植物均可主动选择栽种，各有独特形态 — ✅ PASS

**证据：**

- 底部选择栏 7 个按钮：竹(0)、松(1)、柳(2)、梅(3)、兰(4)、枯(5)、随缘(random)，每个都有 `data-plant` 属性。
- 选择栏事件绑定正确（`document.querySelectorAll('.pbtn[data-plant]')`），点击切换 `.active` 类并更新 `selectedPlant`。
- `resolvePlantIndex()` 正确处理数字索引和 `'random'` 两种情况。
- 六种植物各有独立参数配置，形态差异显著：

| 物种 | maxDepth | branchAngle | curve | 特征 |
|------|----------|-------------|-------|------|
| 竹 | 7 | 0.12（极小） | +0.015（微直） | 直立多节，椭圆绿叶 |
| 松 | 6 | 0.55（大） | +0.04 | 宽大分枝，放射状松针 |
| 柳 | 6 | 0.35 | **-0.06**（下弯） | 细长下垂枝，浅绿叶 |
| 梅 | 5 | 0.7（最大） | +0.02 | 短曲虬枝，五瓣粉花+黄花蕊 |
| 兰 | 4 | 0.25 | +0.08（最弯） | 长弧叶，低分枝率，草姿 |
| 枯 | 8 | 0.4 | +0.025 | 最深层无叶，褐墨色 |

- `leafColor: null` 正确用于枯树，`hasLeaf` 判断为 false，不画叶/花。
- 梅花使用独立的 `blossomColor: '#d4808a'`，与普通叶色区分。
- 六种植物在 draw 函数中有三种专属渲染分支（松针簇、五瓣梅花、竹叶椭圆），其余走通用椭圆叶。

**结论**：六种植物全部可选、可栽，形态参数和渲染方式确实各有不同。PASS。

---

### 要点 2：递归分形结构正确，种子随机保证同株形态一致 — ✅ PASS

**证据：**

- `growBranch(id, x, y, angle, length, width, depth, parentId, offset)` 递归函数结构完整：
  1. 从基点开始，按 `sp.segments` 分段绘制，每段叠加 `curveAmt` 曲率。
  2. 到达终点后判断是否继续分枝（`branchChance`）。
  3. 左枝（`baseAngle - bAngle`）必生，右枝按 `doubleBranchChance` 概率生，中部枝按 30% 概率在 depth>2 时生，中心延续枝按 50% 概率生。
  4. 每次递归 `depth - 1`，终止条件 `depth <= 0`。
- 种子随机函数：
  ```javascript
  rand(offset) {
    const s = Math.sin(this.seed + offset * 127.1) * 43758.5453;
    return s - Math.floor(s);
  }
  ```
  - `this.seed = Math.random() * 10000` 在构造时一次性生成，之后所有随机量均通过 `this.rand(offset)` 以确定性方式派生。
  - 相同 `seed` + 相同 `offset` 永远产生相同值，因此同一株植物的结构完全确定、可复现。
  - 不同 offset 值（+7, +11, +13, +17, +19, +23, +29, +31, +37 等）用于不同随机决策，避免相关性。
- 每株植物 `buildBranches()` 在构造时一次生成完整枝条结构存入 `this.branches`，之后绘制阶段不再修改结构，仅控制可见数量（生长动画）和风力偏移。
- `this.maxGrowth = this.branches.length` 在构建后计算，用于驱动逐枝生长动画。

**结论**：递归分形结构正确，种子随机确定性保证同株形态一致。PASS。

---

### 要点 3：逐枝生长动画流畅，风力影响末梢 — ✅ PASS

**证据：**

- **逐枝生长**：
  - `this.growth` 从 0 递增，每帧 `this.growth += sp_growSpeed(this.species) * dt * 60`。
  - `visibleCount = Math.min(Math.floor(this.growth) + 1, this.branches.length)` 控制可见枝条数。
  - 当前正在生长的枝条（最后一条）通过 `partialGrowth` 实现枝条内部的部分绘制（逐段插值），不是整枝突然出现。
  - `lineWidth` 也随 `partialGrowth` 缩放，生长尖端由细变粗。
  - 各物种 `growSpeed` 不同（竹 1.8 最快、兰 2.0、柳 1.2 最慢），节奏感有区分。
  - 生长时尖端有粒子飞溅效果（`Math.random() < 0.3` 时在新可见枝条尖端产生粒子），增强"生长"感。

- **风力影响末梢**：
  - `swayFactor = (1 - b.depth / this.species.maxDepth) * 0.5`：depth 越小（越靠近末梢）swayFactor 越大，depth 越大（主干）swayFactor 越小。
  - `windX = Math.sin(time * 0.001 + b.id * 0.3 + seed * 0.01) * wind.strength * 8 * swayFactor`
  - 枝条内部各段按 `growthFactor`（0→1 从基到端）线性叠加风偏移，实现"基干不动、末梢摇曳"的自然弯曲效果。
  - 风系统有缓慢过渡：`wind.strength += (wind.targetStrength - wind.strength) * dt * 0.5`，不会突变。
  - 风力目标随机变化（每帧 0.3% 概率改变），方向 ±1。
  - 右侧风指示器 5 根柱条实时反映风力大小，超过 0.5 时变色。

- **动效流畅性**：
  - 使用 `requestAnimationFrame`，`dt` 上限 0.05s（防止标签页切换后跳跃）。
  - 叶子/花也有独立摇曳：`sway = Math.sin(time * 0.002 + b.id + seed) * 0.15`。
  - 落叶粒子有 `sway` 摆动 + 风力影响 + 旋转，轨迹自然。

**结论**：逐枝生长动画有枝条级和段内双层插值，流畅自然；风力正确影响末梢而非整株平移。PASS。

---

### 要点 4：水墨美学：宣纸纹理、墨色浓淡、留白>40%、动效缓慢有机 — ✅ PASS

**证据：**

- **宣纸纹理**：
  - 底色 `#f0ebe0` 暖米黄，三层质感：底色填充 → 逐像素纤维噪声（±16 灰度扰动，原型为 ±18）→ 18 个径向渐变色斑（原型为 20 个，略微减少）。
  - 纹理缓存到离屏 Canvas `paperCanvas`，不逐帧重绘 ✓
  - resize 时防抖重建（详见要点 #6 改进项验证）。

- **墨色浓淡**：
  - 六种植物各有独立枝干色（从 `#2e2a25` 浓墨到 `#5a4e40` 淡褐墨）。
  - 深度墨色变化：`inkMix = 0.3 + depthFactor * 0.4`，深枝（主干）更浓、浅枝（末梢）更淡，透明度也从 0.6 到 1.0 变化。
  - 末梢颜色向 `rgba(180,170,150)` 提亮，模拟"飞白"淡墨效果。
  - 梅花粉红 `#d4808a`、松针墨绿 `#4a6040`、竹叶翠绿 `#5a7a50`、兰草中绿 `#608050`，色彩克制不艳。

- **留白 >40%**：
  - `groundY = H * 0.82`，植物生长区域限制在 `groundY - 250` 到 `groundY`（约画面底部 250px 范围）。
  - 画面上部 ~60% 区域仅有宣纸底 + 极淡远山（alpha 0.12）+ 渐变暗角。
  - 初始仅预置 3 株（竹/松/柳），分布在 25%/50%/75% 宽度。
  - 无植物数量上限（见 Nice-to-have），但植物仅在底部 250px 带内生长，上部留白不会被侵占。
  - 目测留白 >55%，远超 40% 要求 ✓

- **动效缓慢有机**：
  - 风速缓变：`dt * 0.5` 过渡系数，变化周期约数十秒。
  - 枝摇频率：`time * 0.001`，周期约 6.28 秒/弧度，非常缓慢。
  - 叶摇频率：`time * 0.002`，约枝摇 2 倍但仍缓慢。
  - 远山漂移：`time * 0.0001`，极慢。
  - 落叶寿命：`life -= dt * 0.15`，约 6.7 秒飘落，缓慢。
  - 粒子寿命：`life -= dt * 1.5`，约 0.67 秒消散，适中。
  - 移除植物有淡出动画：`this.fade -= dt * 1.5`，约 0.67 秒渐隐，不突兀。
  - 全局 CSS 过渡 `transition: all .3s ease`（按钮）、`transition: height .5s ease`（风指示器）。
  - 所有时间驱动使用正弦函数，平滑无突变。

- **额外水墨元素**：
  - 远山两层（alpha 0.12），轮廓用正弦波叠加，有缓慢呼吸感。
  - 地面线用双频正弦叠加（`x*0.02` 和 `x*0.005`），自然起伏。
  - 地面渐变从透明到淡赭石色。
  - 径向暗角（vignette）增强"画在纸上"的聚焦感。
  - 点击/栽种/移除时墨点飞溅 + 涟漪扩散动画。

**结论**：宣纸纹理层次丰富，墨色有浓淡深浅变化，留白充裕，所有动效频率控制在缓慢范围内。PASS。

---

### 要点 5：UI风格与画廊其他作品统一（印章、书法标题、宣纸按钮）— ✅ PASS

**证据：**

- **印章**：
  - 右下角独立 Canvas（`#sealCanvas`，64×64），朱红底 `#a33a2c`，白文"墨园"二字竖排 ✓
  - 使用 `destination-out` 叠加 50 个随机圆形做斑驳做旧，外加四角磨损 ✓
  - 内边框 `rgba(255,240,225,0.35)` 增加金石感 ✓
  - 位置 `bottom:20px; right:26px`，与山居印章位置（右下角）统一 ✓
  - 移动端缩至 48×48（`bottom:18px; right:18px`）✓
  - `pointer-events: none` 不阻挡交互 ✓
  - Web Font 加载后通过 `document.fonts.ready` 重绘印章，确保书法字体生效 ✓

- **书法标题**：
  - `#titleBlock h1` 使用 `"Ma Shan Zheng","STKaiti","KaiTi",serif` 字体栈 ✓
  - 字号 34px（移动端 28px），字间距 8px（移动端 6px），符合书法标题稀疏有致的排版 ✓
  - 英文副标题 "INK GARDEN" 使用 ZCOOL XiaoWei 字体，10px，字间距 3px ✓
  - 文字有微弱白色投影 `text-shadow: 0 1px 0 rgba(255,255,255,.5)`，模拟纸面浮雕感 ✓

- **宣纸按钮**：
  - 选择栏容器：`background: rgba(243,236,224,.9)`（宣纸色），`border: 1px solid var(--line)`（细边框），`border-radius: 28px`（胶囊形），`backdrop-filter: blur(6px)` ✓
  - 植物按钮：42×42px 圆形（移动端 38×38px），透明底，hover 时淡墨色背景 `rgba(90,74,56,.08)` ✓
  - 选中状态：朱红底 `var(--seal)` + 米白字 + 朱红阴影，与印章色系呼应 ✓
  - 字体使用 Ma Shan Zheng 书法体 ✓
  - 提示文字 tooltip 悬停淡入 ✓
  - 分隔线 `#barDivider` 区分植物选择和功能按钮（清园/调风）✓
  - 统计面板 `#stats` 同样宣纸半透明底 + 细边框 + blur ✓

- **CSS 变量体系统一**：
  - `--paper: #f3ece0`、`--ink: #1c1a17`、`--seal: #a33a2c` 等变量定义了完整的水墨色板 ✓
  - 与山居的配色方向一致（暖米黄宣纸 + 深墨 + 朱红印章）✓

- **与山居对比**：
  - 山居印章也是右下角朱红方印、canvas 绘制、destination-out 斑驳 — 风格统一 ✓
  - 山居标题也使用书法字体 — 统一 ✓
  - 山居工具栏也使用宣纸色半透明背景 — 统一 ✓

**结论**：印章、书法标题、宣纸按钮三大视觉标志均到位，与山居风格统一。PASS。

---

### 要点 6：桌面+移动端可操作（点击/触摸栽种、右键/长按移除），无控制台报错 — ✅ PASS

**证据：**

- **桌面端交互**：
  - 左键栽种：`mousedown` 事件，`e.button === 2` 时跳过（交给 contextmenu 处理）✓
  - 右键移除：`contextmenu` 事件，`e.preventDefault()` 阻止默认菜单，调用 `removePlantAt()` ✓
  - `removePlantAt()` 通过 `findNearestPlant(x, y, 60)` 查找 60px 范围内最近的非 dying 植物，标记 `dying = true` 并触发墨点飞溅 ✓
  - 移除时有触觉反馈：`navigator.vibrate(20)`（支持的设备）✓

- **移动端交互**：
  - `touchstart`：记录起始位置，启动 300ms 长按定时器 ✓
  - `touchmove`：移动超过 10px 阈值时取消长按定时器（标记 `touchMoved = true`），避免拖拽误触发 ✓
  - `touchend`：如果长按定时器仍在（未被长按触发也未被移动取消），则执行栽种；清除定时器 ✓
  - `touchcancel`：清理定时器和状态 ✓
  - 所有 touch 事件均 `e.preventDefault()` + `{ passive: false }`，防止页面滚动/缩放干扰 ✓
  - `touch-action: none`、`user-select: none`、`-webkit-tap-highlight-color: transparent` CSS 配合 ✓
  - `gesturestart` preventDefault 禁止双指缩放 ✓
  - `maximum-scale=1.0` viewport 设置 ✓

  **逻辑验证**：长按 300ms 后定时器触发 `removePlantAt` 并将 `touchTimer = null`；松手时 `touchend` 检查 `touchTimer` 已为 null，不会再触发 `plantAt`，避免长按后松手又栽种。短按（<300ms）松手时定时器仍在，清除后执行栽种。移动超过 10px 时取消定时器，松手不栽种也不移除。三种场景逻辑正确 ✓

- **移动端布局**：
  - 选择栏在移动端改为右对齐（`left:auto; right:78px`），避开右下角印章 ✓
  - `max-width: calc(100vw - 96px)` 防止溢出 ✓
  - 按钮 38×38px，略低于 44×44px 推荐但在可接受范围内（圆形紧凑布局）✓
  - 风指示器 `right:14px`，印章 `right:18px`，两者不重叠 ✓
  - 标题/统计字号缩小 ✓
  - 提示文字上移至 `bottom:78px` ✓
  - 选择栏支持横向滚动（`overflow-x:auto`，滚动条隐藏）✓

- **控制台报错检查**：
  - 代码审查未发现未定义变量、null 引用、类型错误 ✓
  - 所有 DOM 元素在 JS 执行前已定义（script 在 body 末尾）✓
  - `navigator.vibrate` 有 try-catch 包裹 ✓
  - `document.fonts.ready` 有存在性检查 ✓
  - `wb` 风指示器更新有 `if (!bar) continue` 防御 ✓
  - 语法检查通过 ✓

**结论**：桌面端左键/右键、移动端触摸/长按两套交互完整，长按防误触逻辑正确，响应式布局合理，无控制台报错。PASS。

---

### 要点 7：单文件HTML可独立运行，<500KB — ⚠️ CONDITIONAL PASS

**证据：**

- 单文件 HTML ✓（32,945 bytes ≈ 32 KB，远低于 500 KB）
- 所有 CSS/JS 内联 ✓
- **但引入了 3 个外部 Google Fonts 资源**：
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@300;400;500;600&display=swap" rel="stylesheet">
  ```
- Brief 技术约束明确要求"**零外部依赖**"。
- **缓解因素**：
  - 每个字体声明都有系统字体 fallback（`"STKaiti","KaiTi",serif` / `"Songti SC","STSong",serif`）。
  - Google Fonts 使用 `display=swap`，字体加载期间用 fallback 显示，加载后无缝切换。
  - 印章在 `document.fonts.ready` 后重绘，确保字体到位。
  - 文件体积本身仅 32 KB。
- **问题本质**：在无网络环境下，页面仍可正常运行（栽种/风力/移除等全部功能不受影响），但标题和印章的书法字体会回退到系统楷体/宋体，视觉品质降级。这不是"无法运行"，而是"非完全自包含"。

**结论**：文件大小达标，单文件结构正确，核心功能不依赖网络即可运行。但严格来说，Google Fonts CDN 引用违反了"零外部依赖"技术约束。判定为 **CONDITIONAL PASS**——功能完整但不完全满足自包含要求。

---

## Brief 六项改进要点落实情况

| # | 改进要点 | 落实情况 | 证据 |
|---|---------|---------|------|
| 1 | 植物选择栏（竹松柳梅兰枯+随缘） | ✅ 已落实 | 底部胶囊栏 7 按钮，`resolvePlantIndex()` 处理随机 |
| 2 | 水墨UI统一（宣纸按钮+书法字体） | ✅ 已落实 | CSS 变量色板、Ma Shan Zheng 字体、宣纸半透明底+细边框 |
| 3 | 朱红"墨园"印章 | ✅ 已落实 | 右下角 canvas 绘制，斑驳做旧，Web Font 加载后重绘 |
| 4 | 右键/长按移除单株 | ✅ 已落实 | contextmenu + 300ms 长按定时器，findNearestPlant 60px 范围 |
| 5 | 标题用马善政书法体 | ✅ 已落实 | `font-family: "Ma Shan Zheng"` + 系统楷体 fallback |
| 6 | 宣纸纹理 resize 防抖/缓存 | ✅ 已落实 | `resizeTimer` 200ms 防抖，首次同步生成，后续缓存+延迟重建 |

**六项改进全部落实。**

---

## 发现的问题

### Blockers（必须修才能上线）

**无 Blocker。** 作品核心功能完整，7 条验收要点中 6 条 PASS、1 条 CONDITIONAL PASS，不影响基本使用和美学表达。

---

### Nice-to-have（建议改进，不阻塞上线）

1. **外部 Google Fonts 依赖违反"零外部依赖"约束**
   - 位置：`<head>` 中 3 个 `<link>` 标签
   - 原因：Ma Shan Zheng、ZCOOL XiaoWei、Noto Serif SC 均从 Google Fonts CDN 加载。
   - 影响：离线环境下回退到系统字体，视觉品质降级。虽然有 fallback 且不影响功能，但与 Brief 技术约束"零外部依赖"和"单文件 HTML 可独立运行"的严格解读有冲突。
   - 建议：若要严格满足约束，可将字体以 base64 内嵌（但会显著增加文件体积），或接受系统字体 fallback 并在文档中注明。考虑到 32KB 的极简体积和字体对水墨美学的重要性，当前方案是合理的工程权衡，但应在验收记录中标注此偏差。

2. **无植物数量上限**
   - 位置：`plantAt()` 函数直接 `plants.push(new Plant(...))`，无 MAX_PLANTS 检查。
   - 原因：原型也没有上限，但山居设置了 `MAX_ELEMENTS = 60`。
   - 影响：用户在桌面端疯狂点击可栽种数百株，每株有数十个枝条，每帧全部绘制+风力计算，可能导致低端设备帧率下降。
   - 建议：添加合理上限（如 80-100 株），达到上限时最早的植物自动淡出移除或提示"园满"。

3. **`clearGarden()` 未清空 `fallingLeaves`**
   - 位置：`clearGarden()` 函数仅设置所有植物 `dying = true` 并清空 `particles = []`，但未清空 `fallingLeaves`。
   - 影响：清园后，已经在空中的落叶会继续飘落直到飞出屏幕或生命结束，视觉上影响不大（几秒内消失），但逻辑上不一致。
   - 建议：在 `clearGarden()` 中添加 `fallingLeaves = [];`。

4. **未使用 DPR（devicePixelRatio）缩放**
   - 位置：`resize()` 函数直接使用 `W = window.innerWidth; canvas.width = W`。
   - 原因：原型同样未处理 DPR。
   - 影响：在高 DPI 屏幕（Retina/4K）上，Canvas 绘制内容会略显模糊。对水墨风格来说影响较小（水墨本身有晕染模糊感），但印章和细线可能不够锐利。
   - 建议：可设置 `canvas.width = W * dpr; canvas.style.width = W + 'px'; ctx.scale(dpr, dpr)`，DPR 上限 2。注意宣纸纹理也需按 DPR 缩放。

5. **风力方向不影响枝条摆动方向**
   - 位置：`windX` 计算使用 `Math.sin(...)` 产生正负振荡，但不乘以 `wind.direction`。
   - 现状：`wind.direction` 仅在落叶粒子水平速度中使用（`l.vx += wind.strength * 0.01 * wind.direction`）。枝条的风向由 sin 函数自然振荡产生正负，不随 `direction` 改变。
   - 影响：用户点击"调风"改变方向时，视觉上枝条不会明显偏向某一侧，只有落叶方向改变。对于"风过枝摇"的体验，枝条偏向感不够明显。
   - 建议：可在 windX 中叠加一个方向偏置项，如 `+ wind.strength * wind.direction * 5 * swayFactor`。

6. **移动端植物按钮略小于推荐触摸目标**
   - 位置：`@media (max-width:640px) .pbtn{width:38px;height:38px}`
   - 影响：38×38px 低于 WCAG 推荐的 44×44px 最小触摸目标。但按钮间距 4px + 圆形布局，实际误触率不高。
   - 建议：可增大到 40×40px 或通过 padding 扩大点击区域。

7. **死代码：`parentId` 参数未使用、`order` 字段未使用、`splatter` 标志未使用**
   - `growBranch(id, x, y, angle, length, width, depth, parentId, offset)` 中 `parentId` 接收但函数体内未引用。
   - `branch.order = this.branches.length` 赋值后从未读取。
   - 粒子的 `splatter: true` 标志在创建时设置，但粒子绘制循环中不检查该字段。
   - 影响：无功能影响，仅为代码整洁度问题。原型中同样存在。
   - 建议：清理或注释说明保留意图。

---

## 亮点

1. **六株植物形态差异鲜明**：竹的直立小角度、柳的下弯负曲率、梅的大角度虬枝、兰的长弧草叶、枯的深层无叶——仅通过参数配置就实现了六种辨识度极高的植物形态，体现了分形系统的表达力。

2. **长按防误触逻辑严谨**：300ms 阈值 + 10px 移动容差 + timer 状态管理，三种场景（短按栽种、长按移除、移动取消）互不冲突，`touchend` 中通过检查 `touchTimer` 是否为 null 避免重复触发。这是移动端交互的成熟实现。

3. **移除动画优雅**：不是直接删除植物，而是标记 `dying` 后逐帧降低 `fade`（约 0.67 秒淡出），同时墨点飞溅，最后在 `fade <= 0` 时 splice 移除。植物"消逝"如同墨色褪尽，符合水墨美学。

4. **宣纸纹理 resize 防抖方案**：首次同步生成（保证首屏有纹理），后续 resize 时先用旧纹理拉伸填充（200ms 防抖期间不空白），防抖结束后重建新尺寸纹理。相比原型的每次 resize 同步重建，体验明显提升。

5. **印章 Web Font 就绪后重绘**：`document.fonts.ready.then(() => drawSeal())` 确保印章文字在 Ma Shan Zheng 字体加载完成后重新绘制，避免首次绘制时字体未到位导致的字体闪烁。这个细节在山居的印章中被列为 Nice-to-have 问题，本作主动修复了。

6. **生长粒子反馈**：枝条生长时有 30% 概率在尖端产生微小粒子飞溅，如同"生长的碎屑"，是低成本高效果的动态细节。

7. **CSS 变量色板系统化**：`:root` 定义了完整的水墨色板变量（paper/ink/seal/line 五个层级），所有 UI 元素引用变量，未来主题调整和模块沉淀非常方便。

---

## 最终结论

**[ ] 通过  [x] 有条件通过  [ ] 返工**

理由：

作品《墨园》在原型基础上完成了 Brief 要求的全部 6 项改进，7 条验收要点中 6 条 PASS、1 条 CONDITIONAL PASS。核心算法（递归分形、种子随机、风力系统、落叶粒子）100% 保留并正确运行。六种植物形态差异鲜明，逐枝生长动画流畅，风力正确影响末梢，水墨美学到位（宣纸纹理、墨色浓淡、留白>55%、动效缓慢有机），UI 风格与山居统一（印章、书法标题、宣纸按钮），桌面+移动端交互完整且逻辑严谨，JS 零语法错误，文件仅 32KB。

唯一的 CONDITIONAL 项是 Google Fonts 外部依赖。考虑到：(1) 有完善的系统字体 fallback，(2) 使用 `display=swap` 不阻塞渲染，(3) 核心功能完全不依赖网络，(4) 字体对水墨美学品质有关键作用，(5) 内嵌字体会使文件体积暴增数十倍——这是一个合理的工程权衡，但需在验收记录中明确标注此偏差。

**无 Blocker。** 7 项 Nice-to-have 均为建议性质，不影响上线。其中"无植物数量上限"和"clearGarden 未清空落叶"建议在下次迭代中优先处理。

作品《墨园》判定为**有条件通过**，可进入画廊上线流程。外部字体依赖这一偏差由 Project Curator 决定是否要求修正（内嵌字体或接受 fallback）。
