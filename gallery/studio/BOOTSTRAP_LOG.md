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
- 验收结论：待验收

### 问题记录
（验收后填写）

### 双环改进
（如有）

### Re-produced Evidence
（如有）
