# Bootstrapping Log · 绒球水墨工作室

> 每作验收后记录。单环=修作品，双环=改 Studio。双环修复必须附重新生成/验证证据。

---

## #000 契约命名修正（v1.0 → v1.1）

- 日期：2026-08-13
- 触发：用户两次指出命名问题（Builder→Studio，以及去核对 Creative Production Studio）
- 性质：双环修复（Studio 契约结构和命名都有偏差）

### 问题
v1.0/v1.0.1 对照 AIOS Creative Production Studio（commit 9729563）存在三个偏差：
1. **角色命名偏差**：自造"Maker"角色，但 AIOS 中没有 Maker 角色——生产是 Curator 消费工具/技能完成的工作流，不是独立角色
2. **角色合并过度**：把审美检查和验收合为一个角色，AIOS 中 Visual Continuity Steward（视觉质量）和 Product Acceptance（独立验收）是两个独立判断
3. **工作流不完整**：只有"做+验收"，缺少 intake-curation（策展立项）和 improvement（双环改进）的明确产出定义
4. **Studio 边界不清**：v1.0 没有明确声明 Studio 只拥有角色契约/工作流/验收逻辑，不拥有 Agent/Worker/工具

### 修复（v1.1）
1. 角色改为 AIOS 对齐：Project Curator / Visual Continuity Steward / Product Acceptance / System Steward
2. 工作流拆为四个：ink-intake-and-curation → ink-production → ink-acceptance → ink-production-improvement
3. 每个工作流明确定义触发、角色、产出物、验证标准
4. 新增第1节 Studio 边界，第8节文件结构
5. sub-agent 明确定位为 Worker（可替换执行实例），不是角色
6. 建立 acceptance/ 和 builder/ 目录

### Re-produced Evidence
- 修正后契约：`gallery/studio/STUDIO_CONTRACT.md` v1.1
- #001 山居在新契约下继续执行（角色实质不变：codeact 仍是生产 Worker，验收仍由独立 lead sub-agent 完成）

### 教训
建 Studio 前必须完整读 AIOS 对应 Studio 的文档和 role_binding JSON，不能只看核心概念就自己造。Creative Production Studio 是最新的 Studio 模板，它的四工作流结构和六角色映射是经过设计的，不是随便分的。

---

## #001 山居 · Mountain Dwelling

- 日期：2026-08-13
- Studio 版本：v1.1
- Brief：`briefs/001-mountain-dwelling.md`
- 验收结论：有条件通过 → 修复后通过（2026-08-13）

### 问题记录

**Blocker（单环 · 作品缺陷）**
- 山脉颜色季节切换瞬断。`drawMountains()` 离屏缓存失效条件只检查 `currentSeason`，而 `currentSeason` 在 2 秒过渡结束后才更新；过渡期天空平滑变色、山脉却画旧缓存，过渡结束瞬间跳变。直接损害"缓慢有机"的核心体验。
- 路由判断：**输出层缺陷，不是生成器缺陷**。属于该作品特定实现的 bug，不是 Studio 工作流或验收标准的问题 → 单环修复，由生产 Worker 修。
- 修复：缓存架构重构为"白色形状蒙版（resize 时生成）+ 每帧 destination-in 铺插值色"，过渡期逐帧跟随 `seasonT`。

**附带修复（低风险）**
- 粒子初始位置 (0,0)：`initParticles()` 早于 `resize()` 调用 → 调整顺序并加防御。
- 炊烟逐帧 `Math.random()<0.02` 闪烁 → 改为基于时间的 sin 呼吸。

**Nice-to-have（不阻塞，留待后续迭代）**
6 项：季节指示点触摸目标过小（10px）、雾气颜色中点硬切、远山未系统使用清/淡墨分层、宣纸逐像素纹理 resize 卡顿、来客 `layout` 参数计算未使用、印章字体跨平台 fallback。

### 双环改进
本次**不改 Studio**。理由：
1. 缺陷是具体实现的缓存逻辑错误，不是工作流、角色分工或验收标准导致的——验收标准（"动效缓慢有机、无跳变"）本身有效，且成功捕获了问题。
2. maker/checker 分离纪律生效：生产 Worker 自检没发现瞬断（它跑了语法检查，但没有视觉/时间轴验证），独立验收员通过代码审查抓到了。这恰好验证了 v1.1 把 Visual Continuity 和 Product Acceptance 独立出来的价值。
3. 一个可观察的 Studio 层信号（记录但不立即改）：**生产 Worker 的自检偏语法/结构，缺少"运行时视觉回归"手段**。未来如果多次出现"语法通过但视觉有问题"的情况，应考虑给 Builder 增加一个轻量的视觉自检脚手架（如 headless 截图对比季节过渡的帧序列）。这是 C 层（判断改什么的机制）的候选改进，先观察第二作再决定。

### Re-produced Evidence
- 修复后作品：`gallery/works/mountain-dwelling.html`（38,832 字节）
- 独立验收员复查三项修复全部通过，最终结论"通过"：`acceptance/001-acceptance.md`
- 已上线画廊：commit 6f2f1e4，https://rongkyn.github.io/rongball-xr/gallery/

### 沉淀到 Builder
可复用模块（待第二作前提取到 `builder/`）：
- 四季色彩插值系统（seasonConfig + seasonT lerp）
- 形状蒙版染色缓存模式（解决噪声轮廓昂贵但颜色需逐帧变化的通用问题）
- 宣纸纹理生成（底色+渐变+纤维+墨点，验收评为系列最佳）

---

## #002 墨园 · Ink Garden

- 日期：2026-08-14
- Studio 版本：v1.1
- Brief：`briefs/002-ink-garden.md`
- 验收结论：有条件通过（0 Blocker，直接上线）

### 背景
墨园是创作时间（自主创作时段）的练手原型，非 Studio 正式 Brief 立项。用户授权"你来决定就好"后，决定仍按 Studio 规矩走：基于原型评审撰写 Brief → codeact Worker 在原型上改进 → 独立 lead sub-agent 验收 → 上线。验证"轻量作品也能走流程"。

### 问题记录

**CONDITIONAL（不阻塞）**
- Google Fonts CDN 外部依赖。Brief 技术约束写"零外部依赖"，但作品通过 `<link>` 引入 Google Fonts。
- 路由判断：**输出层与约束表述的小偏差，非生成器缺陷**。画廊首页和山居本身也引用 Google Fonts，且有完善的系统字体 fallback（`"Noto Serif SC","Songti SC","STSong",serif`），核心功能不依赖网络。
- 处理：接受条件上线。同时确认 Studio 层面应把"零外部依赖"的表述精确为"零外部 JS 依赖，字体允许 CDN+系统 fallback"，避免后续验收反复在同一点上 CONDITIONAL。

**Nice-to-have（留待迭代）**
7 项：无植物数量上限（极大量可能卡顿）、clearGarden 未清空落叶数组、无 DPR 缩放（高分屏略糊）、风力只影响幅度不改变方向、移动端选择按钮略小（36px）、少量死代码、印章无磨损斑驳。均不阻塞。

### 双环改进
本次**对 Studio 做一处小修正（文档级）**：
1. 把"零外部依赖"精确化为"零外部 JS 依赖；CSS 字体允许 CDN，但必须有系统字体 fallback，且核心体验不依赖网络"。这是验收标准表述不够精确导致的反复，属于 Studio 层（验收标准）而非作品层。

其余不改 Studio，理由：
- 6 项 Brief 改进全部一次落实，0 Blocker，核心算法 100% 从原型保留并增强，说明 v1.1 流程对"改进型作品"同样有效。
- Worker 自检这次覆盖了语法、功能点清单、文件体积，且主动处理了山居复盘点名的"印章字体加载后重绘"问题（`document.fonts.ready` 后重绘印章）——说明上一作的经验被 Worker 吸收。

### C 层观察更新（接 #001）
#001 记录的信号"Worker 缺少运行时视觉回归手段"，在墨园这一作**没有复现"语法过但画面错"的问题**。墨园验收的 7 条要点全部通过代码审查即可确认，没有出现需要实际运行才能发现的视觉跳变。

判断：**暂缓给 Builder 加 headless 截图对比脚手架**。山居的山脉瞬断是"跨帧状态/缓存失效"类问题，这类 bug 在静态代码审查中较难发现；但墨园没有时间轴状态机，递归分形是无状态逐帧绘制，代码审查足以覆盖。结论：视觉回归脚手架只在"有跨帧状态/过渡动画"的作品类型上才有必要，不必作为所有作品的通用要求。继续观察，等到第 2~3 个带时间轴状态的作品后再决定。

### Re-produced Evidence
- 作品：`gallery/works/ink-garden.html`（32,945 字节）
- 验收报告：`acceptance/002-acceptance.md`（7 条要点：6 PASS + 1 CONDITIONAL，0 Blocker）
- 已上线画廊：commit 470ab5c，https://rongkyn.github.io/rongball-xr/gallery/

### 沉淀到 Builder
- 递归分形树绘制（种子随机 + 逐枝生长 + 末梢风力）
- 朱红印章 canvas 绘制（印底 + 随机斑驳圆孔 + 边角磨损 + `document.fonts.ready` 重绘）
- 宣纸纹理 resize 防抖（stretch 填充过渡 + 200ms 后重建）
- 右键/长按双端移除 + 触觉反馈（`navigator.vibrate`）

待与 #001 列出的模块统一提取到 `builder/`。
