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
