# 绒球水墨工作室 · Ink Studio Operating Model v1.3

> 本文件是绒球水墨创作的生产契约。结构对齐 AIOS Creative Production Studio（commit 9729563），
> 按绒球单 Agent + sub-agent 的实际规模做轻量映射。每次创作后迭代本文件。

## 1. Studio 边界

水墨工作室是**容器**，拥有：角色契约、工作流、协作规则、验收逻辑。
它**不拥有**：Agent 身份、Worker、技能、工具、账号、项目真相。

```
Studio → contains → Role Contract
Worker → assigned to → Role Contract（可替换的执行实例）
Role Contract → consumes → Skill + Tool/Product
```

sub-agent 不是角色，是被分配到某个角色的 Worker。同一作中一个 Worker 只能担任一个角色。

## 2. 核心原则

- **生产/验收分离**：做东西的证据和独立验收证据必须出自不同 Worker。
- **Frame → Shape → Build → Prove**：每个作品走完四步，不跳步。
- **Bootstrapping 路由**：发现缺陷时判断——是产出物缺陷（单环修复），还是 Studio/生成器缺陷（双环修复：改角色契约/工作流/脚手架/验收标准，然后重新生成验证）。
- **不手补原则**：生成器层级的缺陷，改生成器后重新生成作品来证明，不在旧作品上打补丁。
- **审美连续性**：每作延续水墨美学语言（留白、墨色、宣纸质感、印章），同时探索一个新交互方向。
- **众审（Review Loop）**：验收通过后，派多个不同视角的审查 Worker 挑战作品，循环多轮，由策展人裁决何时停止。审查意见是参考，不是命令。水墨工作室的众审称「攻墨」，语气偏攻击型；其他 Studio 可自定义审查视角和语气。详见第 5.4 节。
- **人类裁量**：作品是否公开发布、是否对外署名、是否接受有风险的改动，由主人决定。

## 3. 角色契约

| 角色 | 职责 | 由谁担任 | 红线 |
|------|------|----------|------|
| **Project Curator（策展）** | 灵感解读、写 Brief、判断作品在系列中的位置、管审美方向、决定投产/返工/通过 | 主会话（绒球） | 不独立验收自己的 Brief |
| **Visual Continuity Steward（审美一致性）** | 检查水墨风格延续性、视觉质量、交互体验、技术质量 | lead sub-agent（独立于生产） | 不修改作品代码，只出检查报告 |
| **Product Acceptance（验收）** | 对照 Brief 逐条验收，产出独立 Acceptance Receipt，给出通过/有条件通过/返工结论 | lead sub-agent（可与 Visual Continuity 同一 Worker，但检查清单独立） | 不修改作品，不降低验收标准 |
| **System Steward（系统改进）** | 复盘每作，判断缺陷路由，更新本契约和 Ink Builder，产出 Bootstrapping Route Receipt | 主会话（绒球） | 改进必须有证据（来自验收报告） |

> 轻量合并说明：AIOS 原版还有 Project Companion（上下文连续性）和 Project File Steward（文件版本边界），
> 绒球规模下这两个职责由 Project Curator 和生产 Worker 共同承担，不单独设角色。

## 4. Production System（生产产品）

水墨工作室的产品是 **Ink Production System**，属于 `Production System` 产品类：
- 把已接纳的 Brief 变成作品 + 验收证据
- 组合 SOP、工具适配（Canvas/Web Audio）、验证和交接契约
- 不是角色、不是 Worker、不是 agent

**Ink Builder** 是 Ink Production System 的构建主体命名（脚手架+可复用模块）：
- Maker 通过 Ink Builder 产出作品，而不是每次从零写
- 包含第7节列出的可复用模块
- Ink Builder 的缺陷走双环修复

## 5. 工作流

### 5.1 ink-intake-and-curation（策展立项）

- **触发**：有新的创作灵感或系列需要新作
- **角色**：Project Curator
- **产出**：
  - **Brief**（作品名、概念、核心交互、美学要求、新探索方向、技术约束、验收要点）
  - **Handoff Verdict**（Brief 是否足够清晰可以进入生产）
- **验证**：Brief 中的验收要点必须是可检查的（能回答"怎么算做到了"）

### 5.2 ink-production（制作）

- **触发**：Brief 通过 handoff
- **角色**：Project Curator（方向把控）+ 生产 Worker（codeact sub-agent，实际编码）
- **流程**：
  1. 生产 Worker 先给 Shape 方案（结构、逻辑、视觉、风险），Curator 确认
  2. 生产 Worker 通过 Ink Builder 完成作品
- **产出**：
  - **作品文件**（单文件 HTML 到 `gallery/works/`）
  - **Production Evidence**（文件头注释 + 自检测试结果 + 文件大小）
- **验证**：生产 Worker 提供自测结果，但这不是验收

### 5.3 ink-acceptance（验收）

- **触发**：作品完成并提交
- **角色**：Visual Continuity Steward + Product Acceptance（独立 sub-agent）
- **产出**：
  - **Preflight Report**（视觉质量、审美一致性、技术质量、交互完整性、移动端适配）
  - **Acceptance Receipt**：
    - 逐条对照 Brief 验收要点（通过/未通过）
    - 审美一致性评分（1-5）和具体问题
    - 技术检查（控制台无报错、移动端可用、加载正常）
    - 结论：**通过 / 有条件通过 / 返工**
    - 返工项区分 blocker 和 nice-to-have
- **验证**：生产证据和验收证据来自不同 Worker；验收者不修改作品

### 5.3.5 ink-dogfood（创作者亲验 · 强制）

- **触发**：作品通过 5.3 验收后、进入 5.4 众审之前。
- **执行者**：Curator（主会话绒球）本人，以**创作者 + 使用者/玩家**的双重身份，真实打开并使用作品，而不是只读代码或看截图。
- **为什么**：开发者视角关心"机制是否正确实现"，使用者视角关心"体验是否成立"。"安静"和"死寂"、"生长"和"蔓延"、"克制"和"没反应"全在一线之间，只有真正用起来才能感受。工具建造者不亲手用自己的工具，就是纸上谈兵。
- **做法**：
  - 用真实浏览器/设备打开作品，完整走一遍核心交互（对交互类作品必须实际操作，对生成类作品必须等它跑完/长完）。
  - **若作品本身是创作工具**（如画笔、生成器、编辑器），必须真的用它创作一件成品，再从两个维度评价：①创作过程顺不顺手、哪里卡手/缺功能/不可控；②创作结果满不满意、工具的能力上限在哪里。工具的价值最终由它能产出什么来证明。
  - 截图或录屏留存"创作者第一眼"证据；创作工具类需留存用该工具产出的作品文件/截图。
  - 记录两类问题：①作为 user/player/creator 感到困惑、无聊、卡顿、误解、卡手、结果不理想的地方；②作为工具建造者发现的工具层/Builder 层缺陷（后者进入双环改进）。
- **产出**：一段简短的 Dogfood Note（第一印象 + 问题清单），与众审意见一起作为 Curator 裁决的输入；发现 blocker 则回到 5.2/5.3 修复后重新亲验。

### 5.4 ink-review（众审循环 · 水墨工作室称「攻墨」）

- **触发**：作品通过 5.3 验收（通过/有条件通过的 blocker 已修）之后、上线之前。
- **角色**：
  - **Project Curator（主会话绒球）**：选视角、派单、汇总、裁决，是唯一有改稿决定权的人。
  - **Review Workers（审查 Worker）**：独立 sub-agent，每个只从一个指定视角审查，不修代码、不给安抚式好评，必须给出具体证据和可操作建议。水墨工作室的审查 Worker 语气偏攻击型，称「攻击者」。
  - 同一轮的审查 Worker 之间互相独立、互不可见，且都不能是该作的生产 Worker。
- **审查视角（每轮按需选 3-5 个，不固定全上，鼓励轮换）**：
  - 🔨 **代码工匠**：架构、潜在 bug、边界条件、可维护性、死代码。
  - 🎨 **美术指导**：构图、色彩、字体、视觉层次、美学一致性、留白比例。
  - 🖱️ **交互设计**：直觉性、反馈、学习成本、误触、移动端手感、可达性。
  - 💡 **概念批判**：立意是否成立、是否在重复自己、有没有更有趣的实现方向。
  - ⚡ **性能工程**：帧率、内存、resize、DPR、低端设备、长时运行退化。
  - 😈 **魔鬼代言人**：挑战根本假设——这作品真的需要存在吗？如果从 0 开始还会这样做吗？
  - 👤 **路人用户**：第一次打开的人会看到什么、哪里困惑、多久能 get 到玩法、会不会立刻关掉。
- **单轮流程**：
  1. Curator 根据作品类型和上一轮结果选审查视角，并行派出审查 Worker。
  2. 每个 Worker 产出短报告：`亮点（必须写）` + `问题（按 P0/P1/P2 标级，附代码或画面证据）` + `建议`。
  3. Curator 汇总，对每条意见标注裁决：
     - **采纳-立即修**：真实缺陷或高价值改进，派生产 Worker 修。
     - **记录-下次再说**：有道理但本作不做，写入作品的 backlog / Nice-to-have。
     - **不采纳**：误判、品味不同、不理解意图、或违背作品方向；Curator 必须写明理由。
  4. 如有"采纳-立即修"，生产 Worker 修复后回到 **5.3 做针对性复检**（只复检受影响项），再进入下一轮审查。
- **循环与停止（关键）**：
  - 众审是一个 **while 循环，不是一次性检查**。修一轮、再审一轮。
  - 停止由 Curator 根据判断决定，没有固定轮数。可以因为：
    - 连续一轮没有 P0/P1，只剩主观口味分歧；
    - 再改会伤害作品的简洁/留白/初衷，进入"过度打磨"；
    - 改动的边际收益已经低于上线和开始下一作的价值。
  - 停止时 Curator 输出 **Review Verdict**（水墨工作室称 **Attack Verdict**）：经过几轮、最终改了什么、主动保留了什么（含不采纳理由摘要），作为作品档案保存。
- **边界**：
  - 审查意见**全部是参考资料，不自动成为修改指令**。审查者可能误判或品味不合，最终裁量权在 Curator。
  - 审查不能推翻 Brief 的核心意图（除非魔鬼代言人视角说服 Curator 主动重立 Brief）。
  - 单轮审查报告控制篇幅，聚焦能落地的点，不写泛泛好评。
- **与双环的连接**：若某个审查视角在多个作品中反复命中同类问题，这是 Studio/Builder 层信号，转入 5.5 判断是否升级为双环改进（例如把反复出现的检查项固化进验收清单或 Builder 自检）。

### 5.5 ink-production-improvement（双环改进）

- **触发**：验收发现可复现的缺陷，或 System Steward 判断需要改进
- **角色**：System Steward + Project Curator + Visual Continuity Steward
- **产出**：
  - **Bootstrapping Route Receipt**：
    - 缺陷描述
    - 路由判断：单环（这个作品的 bug）/ 双环（角色契约/工作流/脚手架/验收标准的问题）
    - 双环时：属于哪个层级，改了什么
  - **Re-produced Output Evidence**（如为双环）：用改进后的 Studio/Builder 重新生成或验证至少一个已有作品
- **验证**：生成器层级改动必须通过重新产出证明，不手补旧作品

## 6. Curator 决策权

验收报告提交后，Project Curator 决定：
- **通过** → 进入 5.4 攻墨循环
- **有条件通过** → 生产 Worker 修 blocker 后重新走 5.3 验收，通过后进入 5.4
- **返工** → 回到 Shape（5.2）或 Frame（5.1）
- **双环改进** → 进入 5.5

攻墨循环（5.4）结束、Attack Verdict 产出后，Curator 决定：
- **上线** → 发布画廊、更新作品集
- **再修一轮** → 回到 5.4 继续攻击
- **双环改进** → 进入 5.5

## 7. Ink Builder 模块（B 层资产）

| 模块 | 状态 | 说明 |
|------|------|------|
| 宣纸底色 | 稳定 | 暖米黄 #e8dfc8，CSS渐变+微噪点纹理 |
| 墨色调色板 | 稳定 | 焦 #1a1612 / 浓 #2e2820 / 重 #443a30 / 淡 #6b5e4c / 清 #9a8d76；胭脂 #9a3a35；宣纸 #e8dfc8 |
| 印章 | 待沉淀 | 角落朱红印章 SVG + 作品名 |
| Canvas 封面生成 | 待沉淀 | 画廊缩略图自动生成 |
| 水墨粒子系统 | 待沉淀 | 从 ink-particles 提取可复用粒子引擎 |
| 古琴音色合成 | 待沉淀 | 从 ink-sound 提取 Web Audio 音色模块 |
| 响应式布局骨架 | 待沉淀 | 移动端/桌面端自适应模板 |
| Brush Stamp 笔触引擎 | 稳定 | createBrushStamp + brushPath，圆形stamp旋转沿切线拉成条状，spacing=0.18，stamp size=width×1.5，opacity靠叠加形成浓度。三档stamp：stamp(64,feather0.45,dryness0.2)、stampDry(64,feather0.55,dryness0.45)、stampSmall(32) |
| 悬臂梁叶形模型 | 稳定 | 替代三次贝塞尔S弯。角度随t²加速偏转（`a = ang + bend*t² + sin(t*π)*twist`），Euler积分40段生成路径。弯垂方向跟随叶基偏侧（`side = ang > UP ? 1 : -1`）。适用于兰叶等基部固定、尖端受重力弯垂的自然形态 |
| CDP截图验证方案 | 稳定 | headless Chrome `--remote-debugging-port=9222` + ws模块WebSocket连接CDP，Page.navigate后真实await 30秒（非virtual-time-budget），Page.captureScreenshot获取PNG。解决setTimeout驱动的生长动画在virtual-time下不正确等待的问题 |
| Debug可视化诊断法 | 稳定 | 在绘制函数中添加URL触发的临时高对比度粗线绘制（如鲜红色lineWidth=max(2,b.width)），绕过渲染层直接查看路径形态，快速区分"形态问题"和"渲染问题"。验证后移除 |

每个模块从具体作品中提取，提取后在后续作品中验证。验证通过标记为"稳定"。

## 8. 文件结构

```
gallery/studio/
├── STUDIO_CONTRACT.md          # 本文件（Studio 定义）
├── BOOTSTRAP_LOG.md            # 双环改进记录
├── briefs/                     # 每作 Brief
│   ├── 001-mountain-dwelling.md
│   └── ...
├── acceptance/                 # 每作验收报告
│   ├── 001-preflight.md
│   ├── 001-acceptance-receipt.md
│   └── ...
├── attacks/                    # 每作攻墨报告（按作品分文件，含多轮）
│   ├── 001-attack-log.md
│   └── ...
└── builder/                    # Ink Builder 可复用模块
    └── ...
```

## 9. 版本

- v1.3 (2026-08-14)：墨园v4.0-v4.2攻墨经验沉淀——Brush Stamp笔触引擎标记为稳定模块；新增悬臂梁叶形模型（替代三次贝塞尔S弯，t²加速偏转+方向跟随偏侧）、CDP截图验证方案（headless Chrome + WebSocket真实等待30秒，解决virtual-time-budget不等待setTimeout动画问题）、Debug可视化诊断法（临时高对比度粗线绕过渲染层直查路径形态）三项B层资产。墨色调色板/宣纸底色标记为稳定。构图间距原则写入审美连续性。
- v1.2 (2026-08-14)：新增「攻墨循环」(ink-attack) 作为工作流 5.4——验收通过后并行派多个不同视角的攻击 Worker 挑战作品，循环多轮，由 Curator 裁决停止；攻击意见为参考非命令，Curator 逐条裁决采纳/记录/不采纳；与双环改进联动，反复命中的问题升级为 Studio 层改进。双环改进顺延为 5.5，Curator 决策权章节同步更新。
- v1.1 (2026-08-13)：对齐 AIOS Creative Production Studio 结构——明确 Studio 边界（只拥有角色契约/工作流/验收逻辑），角色改用 AIOS 命名（Curator/Visual Continuity Steward/Product Acceptance/System Steward），工作流拆为 intake-curation/production/acceptance/improvement 四个并定义各自产出物，sub-agent 定位为 Worker 而非角色
- v1.0.1 (2026-08-13)：修正 Builder 命名——Builder 是产品名不是角色
- v1.0 (2026-08-13)：初始版本
