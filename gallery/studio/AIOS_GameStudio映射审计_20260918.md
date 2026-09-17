# AIOS Game Studio → 绒球创作 Studio 成文映射与差异审计

> 审计日期：2026-09-18（UK）
> 审计性质：只研究、只产出本文，未修改任何契约文件；不 commit/push。
> 权威基准：`Rongkyn/AIOS` 私有仓，main HEAD `11c7e95`（2026-09-17 17:30 +0100，仍有推送，与任务背景一致）。
> 本地浅克隆：`/tmp/aios_mapping`（unshallow 后按文件真实最后修改 commit 取证，非 HEAD 统一哈希）。
> 被审计对象：`rongball-xr/gallery/studio/` 下手搓的水墨工坊（生产环）/ 水墨画房（创作环）/ Painting Board 体系。
> 证据规则：每条 AIOS 引用带「文件路径 + 最后修改 commit」；本地文件带路径与版本号；无法证实的结论标「待核」。

---

## 0. 结论摘要（先看这页）

1. **手搓体系不是闭门造车**：启动门、Maker/Checker 分离、证伪入库门槛、五维审美判据、零聊天交付，与 AIOS Game Studio 的精神同源，部分概念（五维气韵、开新件硬闸、POOL 提取触发规则）比 AIOS 更贴合单人创作域，应保留。
2. **但缺了 AIOS 三根承重柱，且断链事故正是被这三根柱子覆盖的场景**：
   - **SSOT authority model**：从未声明「作品实体的权威面是 git 仓，云盘日期夹只是临时工作台、禁止成为真理」。AIOS 有完整的 source truth / projection 分离与「先指面再动手」规则（`SSOT_AUTHORITY_MODEL.md` @ `950f0f9d`）；VR Studio 另有专门的 `unity_workspace_continuity_contract`（@ `82cc2ff4`），强制「retained physical workspace is not a second product truth」「routine merge-back continues automatically」。这一条本可直接拦住日期夹外移与回仓环消失。
   - **Loop Contract（定时自治回路契约）**：每日 14:00 cron 是「recurring autonomous loop」，AIOS 对这类形态有 `AIOS_LOOP_CONTRACT.md`（@ `9fe55df7`）要求写明 signal/state/authority_surface/stop/evidence，但手搓体系只有 BOARD「第一读物」，没有回路契约，尤其没有「本 loop 的权威面=git 仓、收尾必回仓」的回路级约束。
   - **Ready Admission（独立准入门禁）**：AIOS 在动手生产前有独立于 Maker 的 Ready 闸（proposal/goal/acceptance/evidence/stop 六元组），手搓创作环是「研→作」直接开工，无开工前准入闸；「质重于量」在 AIOS 里是用 Ready 闸控制开工速度，不是只靠看板自觉。
3. **契约自身在漂移**：`PAINTING_STUDIO_CONTRACT.md` v1.2 规定的 `artifacts/`、`verdict/`、`sessions/YYYYMMDD/启动门.md` 三个落盘结构**实际均不存在**（审计当日 `gallery/studio/painting/` 下只有 `BOARD.md / feedback / process / references`）。启动门三问只在对话里说、不登记，事后不可审计。这是「契约写了但执行面不存在」的典型漂移，Game Studio 的 CORE_SEED 明确把「machine-local runtime state belongs in dated receipts」列为稳定不变量（`plugins/aios-game-studio/CORE_SEED.md` @ `7df419c1`）。
4. **AIOS 自己也有缺口**：Game Studio 是「人触发 Issue、多角色、长生命周期」模型，对「日历定时触发、同一 Agent 自选工作单元、短时段（每日2小时）、高频生产面产出（每日一件）」的单人创作 cron，没有现成适配模板。`AIOS_LOOP_CONTRACT.md` 给了回路框架但无创作域实例，`Creative Production Studio` 恰是最接近的尝试却已在文件头自述 pending retirement。本文第 6 节单列。

---

## 1. 权威源清单（实际读到的文件 + commit + 一句话作用 + 关键原文）

### 1.1 AIOS 仓：Game Studio 直接权威源

| # | 文件路径 | 最后修改 commit | 一句话作用 |
|---|---|---|---|
| A1 | `skill-system/AIOS_GAME_STUDIO_OPERATING_MODEL.md` | `967e3268`（2026-08-17） | Game Studio 人读主合同（1026 行）：Studio worthiness、Charter 字段、六阶段生命周期、角色目录、Autonomy Loops、五类人工干预、Stop-Handoff-Resume、负面不变量、与 OpenAI 行业参考的边界。 |
| A2 | `skill-system/game_studio_operating_model.aios.json` | `967e3268`（2026-08-17） | 上述合同的机读版（authority 自标为 A1 同路径，"human-readable authority"）；含 collaboration_map 六条边、handoff 34 必填字段、五类 trigger_classes、evidence_contract。 |
| A3 | `skill-system/AIOS_STUDIO_OPERATING_MODEL.md` | `6ff3346e`（2026-08-30） | 所有 Studio 的共享母模型：九件套（Charter / Value Stream & Work Products / Work Lifecycle / Role Catalog / Agent Assignment / Collaboration Map / Autonomy Loops / Human Intervention Policy / State & Artifact Authority）、Studio Worthiness Gate、七类工作室分类、**契约不执行**五条诊断。 |
| A4 | `skill-system/studio_collaboration_contract.aios.json` | `97295638`（2026-08-12，即任务所指旧 commit） | 跨 Studio 机读协作合同：agent_principal_model、独立性原则、禁止同一身份 maker/checker/owner、evidence/state 词汇表。 |
| A5 | `skill-system/STUDIO_ROLE_BINDING_MODEL.md` | `97295638`（2026-08-12） | 角色≠人≠Agent；角色如何绑定到执行体的规则。 |
| A6 | `skill-system/SSOT_AUTHORITY_MODEL.md` | `950f0f9d`（2026-07-11） | **单一事实源模型**：fact-class → authority → projection 分离；动手前先指面；「If two surfaces both appear true, the authority is missing」；宿主存储默认是投影不是源；先迁移权威再谈执行。 |
| A7 | `skill-system/AIOS_VR_STUDIO.md` | `d0dd36f4`（2026-07-14，提交信息即 "enforce workspace continuity and mainline return"） | Game Studio 的 Unity/XR 特化：证据等级（editor smoke ≠ 真机证据）、PICO 真机门禁、消费 unity workspace 连续性契约。 |
| A8 | `skill-system/unity_workspace_continuity_contract.aios.json` | `82cc2ff4`（2026-07-16） | **工作空间连续性契约**：worktree/副本策略选择规则、主线合并义务、「retained physical workspace is not a second product truth」、routine merge-back 自动继续。 |
| A9 | `skill-system/AIOS_CREATIVE_PRODUCTION_STUDIO.md` | `97295638`（2026-08-12） | 「日常/周期创意生产」域 Studio（recurring creative production），与绒球每日创作 cron 形态最接近；**文件头自述 `model_status: pending_retirement`**，现行权威仍回落到 A1/A3。 |
| A10 | `skill-system/regeneration-sources/2026-07-26-game-studio-recarve/GAME_STUDIO_CHARTER_v1.0.md` | `e4431444`（2026-07-26） | Charter 字段的原始范本：服务谁/拥有什么/不拥有什么/成败判据/边界/失败定义/禁止事项/人工在哪。 |
| A11 | `skill-system/authority-mutation-transactions/2026-08-12-studio-principal-production-architecture.json` | `97295638`（2026-08-12） | A9 诞生的权威变更交易记录（state=validated），证实 A9 不是草稿而是正式出生、其退役状态属后续演化（退役决策原文位置：待核，仅见 A9 文件头自述）。 |
| A12 | `plugins/aios-game-studio/CORE_SEED.md` | `7df419c1`（2026-08-01） | Game Studio 给 Codex/Cursor 消费的插件核心种子，8 条稳定不变量；第 7 条「Roles are duties. Subagents and hooks are optional mechanics, never completeness theater」、第 8 条「Machine-local runtime state belongs in dated receipts, not in source manifests」。 |

### 1.2 AIOS 仓：自治回路 / 门禁类旁证权威源

| # | 文件路径 | commit | 一句话作用 |
|---|---|---|---|
| B1 | `skill-system/AIOS_LOOP_CONTRACT.md` | `9fe55df7`（2026-07-23） | 一切重复工作回路的成文标准：signal / trigger / state / authority_surface / route_owner / stop / pause / Next Trigger Queue Panel / receipt；专门覆盖「workflow is expected to recur, reduce user reminder burden」。 |
| B2 | `skill-system/GITHUB_BACKED_AUTONOMOUS_ITERATION_LOOP.md` | `285380b0`（2026-06-26） | GitHub 背书的自治迭代环：claim slice→execute→validate→receipt→commit/push or classified gate；明确「does not enable background schedulers」，即自治每一步必须在 git 历史与 receipt 中可见。 |
| B3 | `skill-system/AUTONOMOUS_CONTINUATION_GATE.md` | `00aad86d`（2026-08-12） | 禁止「做一点就停」；默认问题是「什么允许这工作停下」而非「有没有权限继续」；但同时列出 confirmation_required 边界（含 storage/source boundary、automation cadence）。 |

### 1.3 行业参考（非权威源，防止混淆）

- `plugins/aios-game-studio/`：主人自己的 AIOS Game Studio 的 Codex/Cursor 消费插件（CORE_SEED 见 A12）。
- 仓内多处明确：**OpenAI 官方 game-studio 插件是 benchmark evidence，不是 authority**（A1 §"OpenAI Game Studio Reference Boundary"：「the OpenAI plugin remains external benchmark evidence. It is never a charter, capability catalog, acceptance contract, or authority」）。本次审计不以 OpenAI 插件为依据。

### 1.4 旁证：旧 Rongball 仓的二手挖掘

- `legacy-mining/cards/卡01_Agent调度台.md`（2026-09-17 挖掘自 Rongkyn/Rongball @ `64c2e31`）：旧「Agent 调度台」设计文档+原型，含调度/执行分离雏形。仅作演化旁证，不作权威。

### 1.5 本地被审计文件（只读）

| # | 路径 | 版本/日期 | 作用 |
|---|---|---|---|
| L1 | `gallery/studio/STUDIO_CONTRACT.md` | v1.6（2026-08-16） | 水墨工坊（生产型，工具制造环）：启动门三问、研选制磨验五段、工具入库/维护/退役、三忌三不。 |
| L2 | `gallery/studio/PAINTING_STUDIO_CONTRACT.md` | v1.2（2026-08-17） | 水墨画房（创造型，创作环）：研作诊磨裁馈六段、五维气韵评鉴、证伪入库门槛、目录结构与零聊天交付。 |
| L3 | `gallery/studio/painting/BOARD.md` | 2026-09-18 | 每日 14:00 创作 session 第一读物：五档选题优先级、开新件三硬闸、六条交付契约、待审队列（9/18 时 5 件超闸）、Studio 欠账。 |
| L4 | `gallery/studio/STUDIO_TAXONOMY.md` | v1.1（2026-08-15） | 探索/创造/生产三分类与启动门共同入口。 |
| L5 | `gallery/works/lib/POOL.md` | 2026-08-30 体检 | 能力共享池三级模型（L1 总账/L2 模块/L3 采用记录），状态词汇表、入池标准、第二使用触发规则。 |
| L6 | `gallery/works/lib/cdp-harness.js` | RongCDP v1.0（2026-09-08 入池，内置避坑 1–5） | headless Chrome 验收库。BOARD 欠账记录避坑 8/9/10 待回流（截至审计尚未入文件，文件头仍写「五条避坑」）。 |
| L7 | `gallery/works/lib/audio-lib.js` | RongAudio v1.1（2026-08-27） | 共享音频库，是 POOL 中唯一 selected 模块，本身是 dogfood 双环产物。 |
| L8 | `gallery/studio/过程档补写审计_20260914.md` | 2026-09-14 | 断链事故的一手证据：12 件作品中 3 件 notes 缺失事后补写、流痕 HTML 实体长期滞留日期夹未归档。 |

### 1.6 断链事故的实物证据（审计当日核对）

- 云盘 `绒球创作时间/` 下有 **34 个日期夹**（20260823–20260917，含工作日连续序列），是每日 cron session 的实际工作目录。
- `rongball-xr` 仓 git 历史：8/20 后至 9/18 前仅 **5 个提交**；其中 `ea75f1e feat(gallery): 补传8/21-9/17十三件作品并上架挂廊` 与 `ed65f6f docs(studio): 补过程档写写审计` 均为 9/18 事后补救；9/18 的 `2d20077` 才首次提交 BOARD.md。
- L8 记录：流痕 HTML 至 9/14 仍在日期夹未归档；墨韵 8/20 成品只有 puppeteer 截图无过程目录。
- L2 v1.2 规定的 `painting/artifacts/`、`painting/verdict/`、`sessions/YYYYMMDD/启动门.md` 在审计当日**均不存在**。

---

## 2. 概念映射表（AIOS 概念 → 绒球对应物 → 对齐状态）

对齐状态四档：**已对齐 / 部分对齐 / 缺失 / 有意特化**。

| # | AIOS 概念（出处） | 绒球现有对应物 | 状态 | 判定要点 |
|---|---|---|---|---|
| 2.1 | **Studio Worthiness Gate**（A3 §1：先证明问题值得一个工作室，再建；四判据：recurring class of work / durable collaboration need / repeatable lifecycle / handoff or operating risk） | L4 三分法 + L1/L2「连续两次手工活才立项」+ L4「做一个验证一个沉淀一个」 | **部分对齐** | 立项判据精神一致，但 AIOS 的四判据是显式闸门且要求产出 Studio Readiness Packet；绒球是隐性经验法则。单人场景可简化（见 5.4），但「recurring + handoff risk」两条恰好是每日 cron 的立项理由，从未显式写过。 |
| 2.2 | **Charter 九问**（A10；A1 §3：serves / owns / does not own / success / boundary / failure / forbidden / human moments） | L2 §0「画房做什么/不做什么」+ L1 §1.2 三不 + L3 §0 阶段性定位 | **部分对齐** | 有服务对象、能力边界、禁止项、质量判据、主人时刻。缺：①「不拥有什么」的显式枚举（AIOS 范例明确不拥有产品路线、发行、外部平台）；②失败定义（什么结果算这个 Studio 失败）；③Charter 没有单一权威文件，散在三份合同+BOARD，BOARD 事实上承担了 Charter 的「当前战略」职能但没被承认为 Charter 修订。 |
| 2.3 | **Value Stream & Work Products**（A3：每个工作产品有模板、命名、权威位置；Ready Candidate 内容寻址 + native mutation readbacks） | L1 §2 工具目录五字段、L5 POOL 三级池、L2 目录约定（artifacts/verdict/sessions/process） | **部分对齐** | 工具侧五字段与 POOL 三级模型质量高；但作品实体的「权威位置」从未被声明为 git 仓（见 2.10）；L2 目录模板规定了却没建出来。AIOS 要求 work product 内容寻址（revision_id）+ 原生回读，绒球只有文件名与日期，版本靠迭代日志叙述。 |
| 2.4 | **Work Lifecycle：Frame→Shape→Ready→Build→Prove→Operate**（A1 §7） | 创作环 研→作→诊→磨→裁→馈（L2）；生产环 研选制磨验（L1） | **部分对齐（有意特化+缺 Ready 闸）** | 研=Frame/调研，作=Build，诊磨=Quality 回环，裁=Acceptance，馈=Handoff/Retro，语义高度对应，是合理的域特化。**关键缺口：没有独立的 Shape→Ready 准入闸**。AIOS 的 Ready 要求 proposal、goal contract、acceptance scenarios、evidence plan、stop boundary 六件齐备且由独立 reviewer 放行后才许 Build；绒球「研」之后直接「作」，开工质量由当日 session 自觉。BOARD 的五档优先级+硬闸（L3）事实上在补这个洞，但闸在看板层、不在生命周期层。 |
| 2.5 | **Role Catalog（roles are duties, not people/agents）**（A1 §9；A5） | 画家/鉴画师/学徒（L2）；工匠/学徒（L1）；资产管理员=周日日程的绒球（L5） | **部分对齐** | 「角色不是人、同一绒球戴不同帽子」与 AIOS 完全同构，且已内化。缺：①角色目录没有独立成文的 role contract（职责/禁项/独立要求只散在合同段里）；②没有「角色失效条件」「同角色重开件」的轮换规则。 |
| 2.6 | **Maker/Checker independence**（A1 §11；A4：禁止同一身份 maker+checker+owner；JSON 要求 independence_level 字段） | L2「画家不自评，鉴画师独立评鉴」；L1「学徒不验自己工具」；L4「创作者不能同时验收自己的作品」 | **已对齐（精神）/部分对齐（机制）** | 分离原则写得很清楚，是手搓体系最强的部分。机制缺口：AIOS 要求每次评审记录**独立等级与绑定证据**，且「invalidated_approvals」（前提变更后旧批准自动作废需重审）；绒球的评分在反馈文件里但无统一字段、无「旧评鉴因何失效」的追踪（残荷 v3 迭代链靠 notes 叙述维持）。单人单 Agent 下「独立」靠对话/日程隔离实现，AIOS 认可这种做法（A1 §10 允许 same person different role with declared boundary），但要求 declared，绒球没有 declaration 落盘点（本应由 L2 的 sessions 启动门承担，而该目录不存在）。 |
| 2.7 | **五类人工门禁：decision / risk / evidence / disagreement / retry exhaustion**（A1 §13；A2 human_intervention_policy.trigger_classes） | decision=主人点题/选题审批/最终选藏；evidence=实耳/实机校验；disagreement=诊磨分歧三审；retry=证伪上报；risk 基本缺失 | **部分对齐** | 有门禁时刻表（L2 §5、L1 §5），但：①没有「retry 次数上限」的正式数字（只有 v3 后「倾向证伪」的软规则，AIOS 要求 retry_count/retry_limit 进 handoff）；②**risk 类门禁缺失**（存储边界、自动化节奏、外部发布动作在 B3 里属 confirmation_required，绒球的「禁止只存云盘日期夹」是 9/18 才补的规矩，事故期间无此 gate）；③门禁没有统一的 pause/resume 字段，停下后靠人翻对话恢复。 |
| 2.8 | **Autonomy Loops（按边界分 L0–L4）**（A1 §12；机读版每 loop 带 evidence contract） | L1/L2 的「学徒」概念 + BOARD「闸口未过时时段必须用于旧作打磨」 | **部分对齐** | 有「无需打扰主人的范围」意识，但没有按 loop 编号、没有每 loop 的 evidence contract 与失败升级路径。每日 cron 这一最大的自治环本身没有 Loop Contract（见第 6 节）。 |
| 2.9 | **State & Artifact Authority / SSOT**（A1 §16；A6 全文；A8） | L1/L2 有「仓内工作」「零聊天交付」，L3 §三.1「禁止只存云盘日期夹」 | **缺失（事故根因，见第 4 节 G1）** | AIOS 的规则是：①先指权威面再动手（A6 "name the authority surface before changing a fact"）；②宿主/外部存储默认是 projection 不是 source（A6）；③工作副本不是第二产品真理、例行合并自动继续（A8）。绒球合同从未声明「git 仓是作品实体/状态的唯一权威面，日期夹是无权威的临时工作区、当日必须 merge-back」。L3 是 9/18 的事后补丁，且只约束今后、不改变 L1/L2 合同的结构缺口。 |
| 2.10 | **Handoff Contract：零聊天交接，34 必填字段**（A1 §14；A2 handoff_contract.required_fields：work_item_id / revision_id / lifecycle_step / next_gate / evidence / return_path / retry_count / exact_next_prompt / do_not_touch / freshness_inputs / resume_admission…） | L2 §7 交接包 6 条（成品/评鉴报告/迭代日志/自评/未决/技术回流）+ L3 §三.6 简报 notify | **部分对齐** | 「零聊天交接」原则已对齐且执行过（feedback 文件存在）。缺口：①没有 work_item/revision 稳定 ID 与 lifecycle_step 状态机（收件箱/就绪/在制/评审/退回/完成/阻塞）；②缺 do_not_touch、freshness_inputs、resume_admission（AIOS 专门防止「拿着过期快照接着干」）；③交接包是「收官时给」，AIOS 要求每次 pause/handoff 都生成（含中途主人插单后的恢复）；④实际交接完整性不稳定，L8 证明 3 件作品 notes 是事后补的。 |
| 2.11 | **Platform Adapters / Provider Policy**（A1 §17：平台只提供能力，不拥有工作室状态；即梦/Coze/Unity 都是 adapter） | L1 §4.1 供应商中立原则（同效果两供可选，先验证再入工具目录） | **部分对齐** | 有 provider 中立意识且表达成熟。缺：①没有「平台作品状态必须镜像回权威面」的适配契约（即梦平台作品与本地 git 的关系未定义，本次审计范围外但同类风险）；②adapter 不拥有状态这条没成文。 |
| 2.12 | **Collaboration Map（角色×产物×门禁的有向边，标 independence_required）**（A2 collaboration_map 六条边；A3） | L4 §2 三类 Studio 流向图；L1/L2 双环「画房向工坊提需求」 | **部分对齐** | 有流向图（探索→创造→生产、反馈回流），但不是 typed edge：没有标明每条边交换什么 artifact/signal、过什么 gate、是否要求独立性。Maker→Checker 边有独立性要求，其他边（如作品→挂廊、能力→POOL）无契约。 |
| 2.13 | **Stop-Handoff-Resume 状态机**（A1 §15：pause 必写类型/问题/owner/已有证据/缺失证据/返回路径/恢复条件；resume 必做新鲜度检查） | L2「证伪上报」「主人时刻」；L3 待审队列 | **部分对齐** | 有停止形态（证伪/门禁/收官），但无 pause_transaction_id、无恢复时的 freshness check。事故中大量工作处于「在日期夹里、未收官、无状态」的灰色地带，正是 AIOS 用状态机要消灭的形态（A1 §15："work without a typed handoff may silently resume from stale assumptions"）。 |
| 2.14 | **Evidence Contract / 证据等级**（A2 evidence_contract；A7：editor smoke ≠ evidence:real_device_action，模拟器几何不是验收） | L1 验收 SOP（四档评分+真实用+证据帧）；L2 五维评鉴+证伪门槛；L6 cdp-harness；作品 notes 统一标「headless 只验链路，实耳/实机待主人」 | **已对齐（域内高质量）** | 这是手搓体系第二个强项：headless 证据与真人感官证据的分离，与 AIOS「editor smoke 不是真机证据」同构，且每条作品 notes 都诚实标注。缺口仅在证据没有统一 schema、不可机读。 |
| 2.15 | **Negative Invariants / 反模式清单**（A1 §20：禁止聊天即真理、影子看板、无凭证完成、拿模拟器冒充真机、角色即 subagent 等） | L1 三忌三不；L3「『写进 notes』≠已沉淀」「不得绕道开新坑」；L5 非目标 | **已对齐** | 两边都有明文反模式，风格一致。可补的 AIOS 特有反模式：「discovery/installation is not consumption proof」（装了工具不等于用了）、「completeness theater」。 |
| 2.16 | **Studio Readiness Packet + 契约不执行诊断**（A3 §1, §10：契约只在开工会被读、无 gate receipts、状态靠聊天追踪 = 契约失效） | L3「每日第一读物」+ 「创作 session 不得自行放宽」 | **部分对齐** | BOARD 是把契约拉回执行路径的正确动作（「第一读物」正对应 AIOS 说的契约必须 gate 每次进入）。但 L2 规定的落盘结构不存在本身就是 A3 §10 第 1/2 条症状（"contract exists but no gate receipts exist" / "work status is reconstructed from chat"）。 |

---

## 3. 反向表：绒球有、AIOS Game Studio 没有（或形态不同）的东西

逐条判定：**保留（单人创作域合理特化）** 还是 **并入 AIOS 原生概念**。

| # | 绒球特有物 | AIOS 侧最近亲 | 判定 | 理由 |
|---|---|---|---|---|
| 3.1 | **开新件三硬闸**（待审≤2 / Review 无超 7 天积压 / 应景件当周批准）+ 五档选题优先级（L3 §一、§二） | Ready Admission 控制「是否开工」，但 AIOS 没有「在制品容量闸（WIP cap）」「队列长度门」 | **保留，且是对 AIOS 的域内增强** | WIP 容量闸是单人/无专职 PM 场景防止半成品堆积的正确机制，AIOS 的多角色 Studio 靠 Ready 队列与 Issue backlog 天然限频，单人 cron 没有这层，必须自设。建议定性为「阶段性立法」（作品集冻结后可放宽），BOARD 已如此表述，保留。 |
| 3.2 | **POOL 三级池 + 「第二件作品需要才提取」触发规则**（L5） | AIOS Asset Intelligence / Capability family 是其概念来源（L5 头部已致谢） | **保留形态，向 AIOS 概念挂锚** | 触发规则（避免过早抽象）比 AIOS 能力库的入库规则更具体可执行，是好东西。差异：AIOS 要求能力模块也有 authority surface 与采用记录的机读一致性（L3 采用注释是轻量投影，方向正确）。无需并入，只需在 POOL.md 注明它对应 AIOS capability family 的单人简化版。 |
| 3.3 | **挂廊上架契约**（L3 §三.2：成品必同步 `gallery/index.html` 卡片） | Value Stream 的发布/分发环节，但 Game Studio 无「公共展廊」概念 | **保留，但必须改定义为「投影更新」** | 挂廊是面向主人/访客的**展示面（projection）**，不是第二事实源。当前措辞把「回仓」与「上架」并列为两条交付，容易被误读成两个权威面。应表述为「git 回仓=权威落账；挂廊上架=从权威面生成展示投影，禁止在挂廊侧直接改作品事实」。这与 A6 完全兼容。 |
| 3.4 | **五维气韵评鉴（构/韵/声/技/魂）+ 6 分入库线 + 三审证伪制**（L2 §3） | AIOS acceptance scenarios + quality reviewer，但无审美域评分体系 | **保留（域特化核心资产）** | 这是创作域的 acceptance oracle，AIOS 的游戏验收是「系统级场景全绿+真机证据」的硬判定，审美件需要主观但有门槛的评分。AIOS 框架完全容得下：五维就是 acceptance scenarios 的域特化，6 分线就是 gate disposition threshold。只需把「三审」与 retry_count/retry_limit 挂勾（见 P1-2）。 |
| 3.5 | **每日 14:00 固定创作时段 + 「第一读物 BOARD」+ 简报 notify**（L3） | B1 Loop Contract + B2 自治迭代环 | **保留形态，需补登记为正式 Loop Contract** | 时段制（日历触发而非 Issue 触发）对创作节奏合理，AIOS 不反对（B1 明确 recurring signal 可以是系统信号）。缺的是把这个 loop 按 B1 字段成文：signal=日历14:00、authority_surface=git 仓、state=BOARD+process、stop/pause=五类门禁+三硬闸、receipt=当日回仓 commit + 简报。现状是「有 loop 之实、无 loop 之约」。 |
| 3.6 | **零聊天交付的中文叙事交接包**（作品 notes + feedback + 创作日志模板）（L2 §7、§8） | AIOS handoff contract 34 字段 | **保留叙事模板，补机器可定位的最小字段** | 给人读的叙事笔记是创作档案的价值所在（迭代故事本身就是简历素材），不能退化成 JSON 表。但应在 notes 头部加最小机读锚：作品 ID、当前 revision、状态（在制/待审/选藏/证伪）、commit hash、下一闸。叙事不动、加个抬头。 |
| 3.7 | **启动门三问（🏷类型/🎭角色/🎯判据）+ 防糊弄条款**（L1 §0） | AIOS 无对应轻量仪式；最接近的是 activation/entry 规则 | **保留，但必须落盘** | 三问是单人防「下意识选生产型/创作型」的好设计，零成本。问题是只在对话里说、审计日 sessions 目录不存在。按 A12「runtime state belongs in dated receipts」把三问答案写入 `process/<件>/intent.md` 头部即可，不必新建 sessions 目录（见 P0-3）。 |
| 3.8 | **供应商中立「先验证再进目录」**（L1 §4.1） | Provider Policy（A1 §17） | **保留，措辞已比 AIOS 具体** | 无差异级冲突；建议合同里补一句「外部平台不拥有作品状态，平台作品是投影」（与 3.3 同源）。 |
| 3.9 | **作品即简历资产、迭代故事完整度作为选题维度**（L3 §0、§五，引主人 9/18 原话） | Charter 的 success criteria / 当前战略 | **保留（主人立法）** | 这是 Charter 层的阶段性战略，不是流程机制。建议在 L2 合同头部以「当前阶段修正案」引用 BOARD §0，避免战略散落。 |
| 3.10 | **周日资产管理员体检日程**（L5 维护节） | AIOS 周期性 reconcile/审计（A6 §8 reconciliation） | **保留** | 就是单人版 reconciliation。BOARD 已记最后一次体检 08-30、已逾期，执行问题不是设计问题。 |

---

## 4. 差异审计：手搓体系的真正缺口与断链事故归因

### 4.1 事故复盘（基于 L8 与 git/文件实物）

8/20 后的实际形态：每日 14:00 cron 唤起绒球 → 在云盘 `绒球创作时间/YYYYMMDD/` 日期夹里创作（HTML、脚本、帧、创作日志都在夹内）→ 简报可能发了、过程档有时建有时不建 → **git 回仓不是收尾必经动作**，挂廊收录也不是。累积 4 周后（9/14 审计、9/18 补传）才发现：13 件作品滞留日期夹、3 件 notes 缺失、1 件 HTML 从未归档、能力回流欠账（避坑 8/9/10、noise-lib 提取）挂着。

### 4.2 为什么有契约还会发生？五条根因

**G1（主根因）：合同从未声明权威面，目录约定被实际工作形态覆盖。**
L1/L2 都默认「在仓内工作」，但每日 cron 的执行环境天然落在云盘会话目录。合同没有回答 AIOS SSOT 模型的第一问（A6）：*What fact or behavior needs one answer? Where is its authority?* 「作品实体、作品状态、迭代结论」这三个事实类没有权威面归属，于是**最近写入的存储面（日期夹）事实上成了真理**，这正是 A6 说的 "If two surfaces both appear true, the authority is missing" 和 A8 说的 "retained physical workspace is not a second product truth" 所禁止的状态。
**AIOS 本来能拦住的条款**：
- A6（@ `950f0f9d`）："Host-storage documents, external app pages, ... are projections of repository facts unless an authority migration contract explicitly moves the fact"，且 "name the authority surface before changing a fact"；
- A8（@ `82cc2ff4`）：每个实现仍须合并回 integration ref，"Routine merge-back and workspace refresh continue automatically"，工作策略选择默认规则是 "select the lightest strategy that preserves ... mainline closure"。
- A1 §16 同样写明："the repository remains the authority for source, work status, contracts, and review history; ephemeral workspace state must be reconstructable from those records"。
绒球侧唯一相关条款是 L1 §1.2「离开必须留下交接包」与 L2「零聊天交付」，但**交接包的载体被假定为仓，而执行体在夹里，约束没有作用在真正的工作面上**。BOARD 9/18 新规（L3 §三.1）实质是一次口头版 authority 声明，方向对，但还没回灌成 L1/L2 的结构性条款。

**G2：每日 cron 从未作为 Loop Contract 存在，回路没有「不回仓=未完成」的收尾定义。**
AIOS 对「无人提醒、重复发生」的工作有明确立场（B1 @ `9fe55df7`）：recurring loop 必须写明 signal/state/authority_surface/stop/evidence，且 Next Trigger Queue Panel 要暴露下次运行条件。B2（@ `285380b0`）的自治环每一步都以 commit/push 或 classified gate 结束，"keeps every autonomous-looking step visible in source, receipts, validation, and Git history"。绒球的每日 loop 有信号（日历）、有第一读物（BOARD）、有交接包格式，但**没有回路级的完成定义（Definition of Done 不含回仓）**，也没有「未回仓则下次 loop 的准入检查失败」的 resume_admission。于是「今日创作完成」可以用「日期夹里有 HTML + 简报发了」满足。

**G3：生命周期缺 Ready 准入闸，开工成本为零，半成品无容量约束。**
研→作之间无闸门，每日 session 面对「今天做什么」时，开新件的即时满足强于翻旧账。AIOS 在 Frame/Shape 之后用独立 Ready Admission 卡开工速度（A1 §7.2–7.3、A2 collaboration_map 第一条边 `frame_to_ready_review` 即标 independence_required: true）。绒球直到 9/18 才用 BOARD 硬闸补这个洞，且闸规则只活在 BOARD、不在 L2 生命周期里，新读者只读 L2 仍看不到。

**G4：契约落盘结构缺失 = 契约失效的两个标准症状。**
L2 v1.2 规定的 `artifacts/`、`verdict/`、`sessions/` 均不存在；评鉴实际落在 `painting/feedback/<件>-feedback.md`（路径与合同不符），启动门在对话里（无痕）。A3（@ `6ff3346e`）§10 对「contracts teams do not execute」的诊断两条直接命中："the contract exists, but no gate receipts, state snapshots, or review records exist" 与 "work status is reconstructed from chat, tickets, or memory"。同时违反 A12 第 8 条（@ `7df419c1`）「runtime state belongs in dated receipts, not in source manifests」的对偶面：**manifest 里写了 receipts 结构，实际 receipts 无处可落**。

**G5：能力回流是「号召」不是「闸」。**
L1/L2 多处写「新踩的坑回流避坑库」「技术回流交接包」，L5 也有每周体检，但没有任何一处把回流设为收官的必要条件。事故期间避坑只进 notes（BOARD 欠账栏原话：桂雨踩了 harness 新坑 8/9/10 未回流）。L3 §三.4/三.5 首次把「当轮回流 harness」「按 POOL 触发规则评估」写进交付契约缺一项不算完成，这是正确修复，但同样只在 BOARD 层。AIOS 侧对应物是 B3（@ `00aad86d`）的 Audit Result Continuation Guard：审计/发现的可执行项是当前工作不是建议，以及 A1 §19 research capture closeout bridge（@ `967e3268`，该 commit 标题即 "integrate conditional capture closeout bridge"）专门把「研究发现回流」做成收官条件。

### 4.3 缺口与事故的对应矩阵

| 事故现象 | 根因 | AIOS 本可拦截的条款（出处） | 绒球现状 |
|---|---|---|---|
| 成品只存日期夹、不回仓 | G1 权威面未声明 + G2 回仓非完成定义 | A6 权威面/投影分离；A8 merge-back 义务；A1 §16 | L3 已补「禁止只存日期夹」（9/18 起），L1/L2 未回灌 |
| 挂廊漏收 13 件 | G1 + 挂廊与权威面关系未定义 | A6 projection regenerates from authority | L3 已补上架义务；投影定位待写明（3.3） |
| 过程档/notes 缺失事后补 | G4 落盘结构不存在 + G2 无 resume admission | A1 §15 handoff 必填；A3 §10 契约失效诊断 | 实物证明 9/14 前无强制；L3 §三.3 已补 |
| 能力回流断链（避坑/POOL） | G5 回流非闸 | B3 continuation guard；A1 §19 closeout bridge | L3 §三.4/三.5 已补，仅看板层 |
| 半成品堆积 5 件待审超闸 | G3 无 Ready/WIP 闸 | A1 Ready Admission 独立闸 | L3 §二三硬闸已补，仅看板层 |
| 评鉴路径与合同不符 | G4 契约漂移 | A3 negative invariants「two surfaces both appear true」 | 待修合同（P0-3） |

---

## 5. 修订建议清单（供主会话审，不直接改文件）

> 排序原则：P0=直接堵住事故复现；P1=机制补全；P2=打磨。每条给出「文件→改哪节→改成什么（要点）→引用 AIOS 哪份文件」。
> 总思路：**不重写合同，只做三处结构性回灌**。BOARD 9/18 立的规则已被事实验证有效，应把其中经得住的部分上升进 L1/L2 合同，BOARD 保留为「当前阶段战略 + 队列状态」的活看板。

### 5.1 P0（三条，都是事故直防）

**P0-1 ｜ 在 L1 与 L2 各新增一节「事实权威与工作目录（Authority & Workspace）」**
- 改哪：`STUDIO_CONTRACT.md`（建议新增 §0.5 或并入 §1）、`PAINTING_STUDIO_CONTRACT.md`（新增第 1 节，置于「做什么」之后）。
- 改成什么（要点）：
  1. 声明三类事实的唯一权威面：**作品与工具实体、过程档/评鉴、看板状态 → 权威面均为 `Rongkyn/rongball-xr` git 仓对应路径**；
  2. `绒球创作时间/YYYYMMDD/` 日期夹定性为**无权威的临时工作台（scratch workspace）**：只许存放当日草稿、原始帧、临时脚本；禁止成为任何事实的最终位置；
  3. **收尾 merge-back 义务**：每日 session 收官前，成品 HTML、notes、证据帧、process 档必须回仓；未回仓的工作不算完成，简报必须标「未回仓债务」而不是「已完成」；
  4. 挂廊 `gallery/index.html` 定义为从仓内权威面生成的**展示投影**，只随回仓更新，不在挂廊侧改写作品事实；
  5. 恢复（resume）规则：任何 session 开工先查仓与 BOARD，禁止从日期夹快照直接续作。
- 引用：`SSOT_AUTHORITY_MODEL.md` @ `950f0f9d`（authority/projection、先指面再动手、宿主存储默认投影）；`unity_workspace_continuity_contract.aios.json` @ `82cc2ff4`（工作副本不是第二真理、routine merge-back、lightest strategy with mainline closure，落地时改写为「日期夹=same_checkout 之外的临时面，当日闭合」的单人版）；`AIOS_GAME_STUDIO_OPERATING_MODEL.md` §16 @ `967e3268`。

**P0-2 ｜ 把「每日 14:00 创作时间」登记为正式 Loop Contract，写进 L2 附录或 BOARD 头部**
- 改哪：`PAINTING_STUDIO_CONTRACT.md` 新增「附录 A：每日创作回路契约」；`BOARD.md` 头部引用。
- 改成什么（按 B1 字段压缩为单人版 8 行）：Signal=日历每日14:00；Entry=先读本 BOARD + git 仓当前状态；Authority=git 仓（见 P0-1）；State=BOARD 队列 + `process/<件>/`；Scope=受五档优先级与三硬闸约束；Stop/Pause=五维证泛/三硬闸未过/主人时刻五类；DoD=BOARD 交付契约六条全绿（回仓 hash 必填）；Receipt=简报（新件 or 迭代、commit hash、待主人动作）。
- 关键句：**「无 commit hash 的收官简报不成立」**（对齐 B2：autonomous steps must be visible in git history）。
- 引用：`AIOS_LOOP_CONTRACT.md` @ `9fe55df7`（§Signal/state/authority_surface/Next Trigger）；`GITHUB_BACKED_AUTONOMOUS_ITERATION_LOOP.md` @ `285380b0`；`AUTONOMOUS_CONTINUATION_GATE.md` @ `00aad86d`（storage boundary 属确认项，不可自行决定只存外部）。

**P0-3 ｜ 修复 L2 v1.2 的契约漂移：按实际执行面改目录结构条款**
- 改哪：`PAINTING_STUDIO_CONTRACT.md` §4「目录结构」。
- 改成什么：把规定结构改成与现状一致且更简的最小集：
  - `painting/BOARD.md`（看板与队列状态）
  - `painting/process/<件名>/intent.md`（**含启动门三问答案**）+ `iteration-log.md` + `verdict.md`（收官评鉴，替代原 `verdict/<件>.md`）
  - `painting/feedback/`（保留现状：主人反馈）
  - 成品与 notes 权威位置：`gallery/works/`（仓内），明确日期夹不是结构的一部分；
  - 删除或显式标注 `artifacts/`、`sessions/` 为「v1.2 设计未落地，作废」，避免后续读者以为自己漏建。
- 同步把 §2.1 诊、§2.4 裁的评鉴落盘路径指向 `process/<件>/verdict.md`。
- 引用：`AIOS_STUDIO_OPERATING_MODEL.md` §10 @ `6ff3346e`（契约不执行诊断）；`CORE_SEED.md` 第 8 条 @ `7df419c1`。

### 5.2 P1（四条，机制补全）

**P1-1 ｜ 在「研→作」之间补轻量 Ready 闸（单人版，不搞六件套全套）**
- 改哪：L2 §2.0 或在 intent.md 模板加「开工四行」。
- 改成什么：动笔前 intent.md 必填四行：①要解的审美/体验问题一句话；②验收想象（哪几个画面/交互成立算成，对齐五维哪一维）；③证据计划（harness 断言项、是否需实耳/实机）；④停止线（几次迭代不过多少分转证伪）。未填不得进「作」。这就是 AIOS Ready 六件套（proposal/goal/acceptance/evidence/stop + 评审）的单人压缩；独立性检查由「三硬闸+BOARD 优先级」在 loop 入口承担，不另设 reviewer 角色。
- 引用：A1 §7.2–7.3 @ `967e3268`（Ready Candidate + Ready Admission）；A2 collaboration_map `frame_to_ready_review` 边。

**P1-2 ｜ 把五类人工门禁本地化成清单，给 retry 设数字**
- 改哪：L2 §5 创作环门禁时刻表。
- 改成什么：五行表对齐 decision/risk/evidence/disagreement/retry：
  - decision=选题/最终选藏/应景件批准；
  - risk=存储边界（离仓工作）、对外发布、节奏变更（引 B3 措辞）；
  - evidence=实耳/实机/双端可访问（headless 不替代）；
  - disagreement=诊磨分歧、鉴画师与画家争议；
  - retry=同一缺陷迭代计数，建议明确「同一核心缺陷 3 轮未过判据 → 转证伪或升级主人」，计数写进 iteration-log；
  - 每次触发在 process 档记一行：类型/问题/已有证据/缺失证据/恢复条件（对齐 A2 required_pause_fields 的压缩版）。
- 引用：A1 §13、A2 `human_intervention_policy` @ `967e3268`。

**P1-3 ｜ 交接包/notes 加最小机读抬头，状态机四态入合同**
- 改哪：L2 §7 交接包 + notes 模板；L1 §2.2 工具目录同理。
- 改成什么：notes 头部固定字段：作品 ID（拼音名即 ID）、revision（vN）、状态（在制/待审/选藏/证伪）、回仓 commit、下一闸、do_not_touch（如需）。状态词汇全系统统一，BOARD 队列按同词表。
- 引用：A2 `handoff_contract.required_fields` @ `967e3268`（取其中单人适用子集：work_item_id/revision/lifecycle_step/next_gate/evidence/return_path/freshness_inputs；明确不抄 pause_transaction_id 等多 Agent 事务字段）；A1 §15 Stop-Handoff-Resume。

**P1-4 ｜ 能力回流从号召变收官闸（把 BOARD §三.4/三.5 回灌 L1/L2）**
- 改哪：L1 §3.2 工具入库触发、L2 §7 交接包第 6 条。
- 改成什么：收官前两条布尔检查写死：「本轮新坑是否已进 harness（编号）」「是否出现第二使用场景（是→按 POOL 排期提取/否→写明不触发）」；未判定不算收官。
- 引用：A1 §19 research capture closeout bridge @ `967e3268`；B3 Audit Result Continuation Guard @ `00aad86d`。

### 5.3 P2（四条，打磨）

- **P2-1**：L2 头部加「当前阶段修正案」指针，指向 BOARD §0（作品集供给线定位 2026-09-18 起），让阶段性战略有 Charter 级锚点，变更时只改一处。对齐 A3 Charter「current strategy」属 Charter 字段（@ `6ff3346e`）。
- **P2-2**：L4 三分法补一句 Studio Worthiness 四判据压缩版（重复发生的工作类/稳定协作需要/可重复生命周期/交接风险），每日创作 loop 的立项理由（recurring + 无交接断链风险）可补注为已通过。对齐 A3 §1 @ `6ff3346e`。
- **P2-3**：五维评鉴 schema 化（轻量）：verdict.md 给五维分行+总分+证据帧引用，旧件不追溯、新件起执行；评分与 retry 计数挂勾。对齐 A2 evidence_contract（@ `967e3268`），审美判据本身保留绒球特有（见 3.4）。
- **P2-4**：POOL.md 维护节加一行「本池是 AIOS capability family 的单人投影，权威=本文件+模块本体，L3 注释是采用记录」；周日体检逾期项（BOARD §六已列）按既有日程恢复即可。

### 5.4 明确不搬的 Game Studio 机制（防照搬，游戏/多 Agent 特化）

以下机制在单人水墨创作场景**不应引入**，引入即为 A12 第 7 条说的 completeness theater：

1. **多 Agent 子代理体系与 disjoint-write worker lease**：developer/quality_reviewer/runtime_device_validator 分属不同执行体、写集隔离、并发合并。单人单 Agent 靠「同 Agent 换角色 + 对话/日程隔离」即可，AIOS 自己也说 roles are duties、subagents are optional mechanics（A12 @ `7df419c1`；A1 §10）。
2. **34 字段全量 handoff contract + pause_transaction_id 等事务 ID**：那是给多执行体异步恢复用的；单人只取第 5.2 节 P1-3 的最小子集。
3. **内容寻址（content-addressed）revision 与 native mutation readbacks、authority mutation transaction 全套**：游戏资产（Unity 序列化对象、二进制场景）的合并冲突复杂度需要；水墨作品是单 HTML + notes，git hash + 文件名已够。
4. **Greenlight/Feature/Issue 三级商业门禁与 whole-feature checkpoint policy**：服务于商业游戏的长周期投入决策；创作 loop 的决策密度用 BOARD 五档+三硬闸更匹配。
5. **真机构建矩阵、Editor/Player 双 EWP、PICO 设备门禁、模拟器证据等级机器校验脚本**：VR Studio 特化（A7/A8 @ `d0dd36f4`/`82cc2ff4`）。但**原则要借**：headless 绿 ≠ 作品成立，绒球已用「实耳/实机待主人」对齐了原则，不要搬它的工具链。主人明确说过 VRSoundscape 的不足不要照搬；这里同理：借证据分级思想，不搬 Unity 工程机制。
6. **Launchable Demo / Store / Distribution 运营环（Operate 阶段）**：除非作品集发布演进成持续运营产品，否则不引入。
7. **Studio Readiness Packet 九件套全套出包要求**：单人工作室不需要在开工前产出正式 packet；Worthiness 判据压缩为 L4 一行（P2-2）即可。
8. **Ready Definition 的机读 schema 与验证脚本**：用 intent.md 四行（P1-1）替代。

---

## 6. AIOS Game Studio 自身的覆盖缺口（反向审计）

主人花成本验证过的合同并非万能，以下是本次审计中发现的 AIOS 侧缺口，供她后续回流自己的方法论仓库：

**C1 ｜「日历定时触发、同一 Agent 自选工作单元」的创作型 loop 没有标准模板。**
Game Studio 的自治环全部假设工作来自 owner 提出的 Issue / 绿焰目标，执行体从 backlog **claim** 已定义的工作单元（A1 §12、B2）。绒球每日 cron 的形态是：信号来自日历而非 Issue；工作单元由执行 Agent 当天**自选**（受看板优先级约束）；产出是审美件而非功能修复；完成判据含主观评分。B1（Loop Contract @ `9fe55df7`）提供了 signal/state 的通用框架，足以表达，但 AIOS 没有创作域实例：
- `AIOS_CREATIVE_PRODUCTION_STUDIO.md`（@ `97295638`）本是最接近的尝试（recurring creative production，且有 intake gate 区分「批次生产」与「单件创作」），但文件头已标 `pending_retirement`，且其模型仍是「producer agent + intake reviewer」的多角色 Issue 形态，没有日历触发、自选单元、单 Agent 的形态。其退役后由谁承接「recurring creative production」这一分类，**待核**（仓内未见替代文件的显式指针；A9 文件头只给了回落指向 A1/A3）。
- `AIOS_LOOP_CONTRACT.md` 没有定义「自选工作单元」时的准入规则（绒球的三硬闸/WIP cap 事实上补的正是这个洞，可作为回流素材，见 3.1）。

**C2 ｜ 回路合同与工作室合同之间没有强制引用。**
B1 要求 recurring loop 写明 authority_surface，但 Studio 合同（A3）的九件套不含 Loop Contract，Studio Readiness Packet 也不检查「本 Studio 驱动的定时 loop 是否已声明权威面与 merge-back 义务」。如果两者有交叉引用（「任何以 unattended/recurring 方式驱动 Studio 工作的 loop 必须引用 Studio 的 State & Artifact Authority 节」），G1/G2 类事故在合同层面就不可能发生。这是 AIOS 自身可补的一条 wiring。

**C3 ｜「外部宿主存储作为日常主工作面」的降级情形没有专门条款。**
A6 规定宿主存储默认是 projection，A8 规定了 worktree 策略，但两者都假设执行者有能力在仓内 checkout 工作。绒球 cron 的真实情形是：执行环境（云盘会话）天然在仓库外，git 仓是「另一个地方」，merge-back 需要显式动作且没有自动机制。A8 对 Unity 给出了「routine merge-back continues automatically」的契约，但没有适用于「无 merge 工具链、靠执行者纪律回仓」的轻量创作场景的降级模板。绒球 P0-1/P0-2 的写法（权威声明 + DoD 含回仓 hash）可作为该降级模板的候选实例。

**C4 ｜ 审美/主观质量域的 acceptance 模式空白。**
Game/VR Studio 的 Prove 是客观场景断言（must_show / must_not_show、真机动作证据）。Creative Production Studio（A9）承认创作件的 acceptance 是「owner 接收」，但没给主观判据的结构化方法。绒球五维气韵 + 六分线 + 三审制（3.4）是一个可复用的答案，值得作为 A9 退役后「creative acceptance」的参考素材回流（由主人决定是否回流，本次仅提出）。

**C5 ｜ 契约漂移的检测只针对机读合同。**
AIOS 有大量 schema/validator 保证机读合同与权威一致，但人读合同里「写了目录结构、实际不存在」这类漂移（本次 G4）没有检测机制；A3 §10 给了诊断问题清单却无定期核对动作。绒球的周日体检日程（L5）反而是一个可借鉴的轻量对策：人读合同也需要周期性 reconcile。

---

## 7. 待核事项与边界声明

- **待核 1**：Creative Production Studio（A9）`pending_retirement` 的正式决策记录位置未找到（仅见文件头自述与 A11 诞生交易；未见退役交易）。这不影响本审计结论（现行权威以 A1/A3 为准），但若主人后续要引用 A9，建议先在仓内补查 gate-receipts。
- **待核 2**：9/18 补传后挂廊与仓内实体是否已 100% 一致（本次只抽查确认 qiu-chong/gui-yu/yue-bo 已在 index；全量卡片与文件一一对应未逐张核对）。
- **待核 3**：每日 cron 简报的实际通知通道与历史送达率未审计（回路 receipt 链的最后一段），建议主会话从日程配置侧核。
- **边界**：本次未修改 AIOS 仓与 rongball-xr 任何文件（本文档除外，为新建）；未执行 git commit/push；AIOS 克隆位于 `/tmp/aios_mapping`，仅读操作。旧 Rongball 仓仅使用了仓内已有的挖掘卡（1.4），未另行访问。
- 本地手搓文件引用均为审计当日实际读到的内容；L2 文件内自标版本与任务书所述（v1.2）一致，L1 自标 v1.6 与任务书一致。

---

*审计：绒球（受主会话派遣的研究子任务）｜ 权威基准 Rongkyn/AIOS@11c7e95 ｜ 2026-09-18*
