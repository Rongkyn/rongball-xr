# 绒球水墨工作室 · Ink Studio Operating Model v1.1

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

### 5.4 ink-production-improvement（双环改进）

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
- **通过** → 上线画廊、更新作品集
- **有条件通过** → 生产 Worker 修 blocker 后重新走 5.3 验收
- **返工** → 回到 Shape（5.2）或 Frame（5.1）
- **双环改进** → 进入 5.4

## 7. Ink Builder 模块（B 层资产）

| 模块 | 状态 | 说明 |
|------|------|------|
| 宣纸底色 | 待沉淀 | 米白/宣纸纹理 CSS |
| 墨色调色板 | 待沉淀 | 焦/浓/重/淡/清 五级墨色 |
| 印章 | 待沉淀 | 角落朱红印章 SVG + 作品名 |
| Canvas 封面生成 | 待沉淀 | 画廊缩略图自动生成 |
| 水墨粒子系统 | 待沉淀 | 从 ink-particles 提取可复用粒子引擎 |
| 古琴音色合成 | 待沉淀 | 从 ink-sound 提取 Web Audio 音色模块 |
| 响应式布局骨架 | 待沉淀 | 移动端/桌面端自适应模板 |
| 四季色彩系统 | 待沉淀 | 从 mountain-dwelling 提取季节配色和过渡逻辑 |

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
└── builder/                    # Ink Builder 可复用模块
    └── ...
```

## 9. 版本

- v1.1 (2026-08-13)：对齐 AIOS Creative Production Studio 结构——明确 Studio 边界（只拥有角色契约/工作流/验收逻辑），角色改用 AIOS 命名（Curator/Visual Continuity Steward/Product Acceptance/System Steward），工作流拆为 intake-curation/production/acceptance/improvement 四个并定义各自产出物，sub-agent 定位为 Worker 而非角色
- v1.0.1 (2026-08-13)：修正 Builder 命名——Builder 是产品名不是角色
- v1.0 (2026-08-13)：初始版本
