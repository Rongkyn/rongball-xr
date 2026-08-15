# Bootstrapping Route Receipt — 墨园竹子P4构图

- **Defect / observation**: 竹子P4构图经5轮迭代(fix1→fix5)始终不通过，核心问题：三竿无穿插、右侧空洞、辅竹过矮。fix5大幅调整欹势后，主辅竿顶仍差307-358px无法交汇。
- **Producing generator**: `composeLayout` + 竹高计算逻辑（ink-garden.html 约1390-1458行）
- **Route**: **generator defect**
- **Reason (reproducibility across inputs)**: 代码第1457行`hScale = isMain ? 1.0 : (0.60 + rand*0.15)`对所有非主竹统一额外缩减60-75%，与构图层curHMul形成双重缩减。4个seed(42/7/123/2024)全部复现：辅竹实际length仅221-284px，为主竹(602-653px)的35-45%，与设计规格(70-85%)严重不符。任何参数调整无法绕过此硬编码缩减。
- **Existing instance reused**: AIOS `AIOS_BOOTSTRAPPING_DOUBLE_LOOP.md` 路由问题 + Receipt格式；`VISUAL_GENERATION_CONTINUITY_SYSTEM.md` 诊断了"unstructured visual iteration state → repeated recalibration and regression"
- **Governing variable changed**: 构图生成器的高度计算逻辑——compose模式下hScale从独立缩减改为1.0，让curHMul独占高度比例控制。同时新增skeleton预检模式（B-level：增加了构图验证工具）
- **Output re-produced (Prove)**: ✅ 完成——fix6 修生成器后经 fix6b/fix7/fix8/fix9/fix10 共 5 轮 output 调参，fix10 终审通过（大众 7.1 / 专家 7.24 / P0=0）。双轨评审+skeleton预检贯穿全程。
- **Exercised by**: CodeAct session 7674091919521087779（fix6 生成器修复+skeleton工具）；后续 fix6b-fix10 由主 Agent 单环调参
- **Level**: B（改生成器/工具，非A-level产出修复，非C-level准入规则变更）
- **闭环日期**: 2026-08-15

## 5轮单环失败复盘

| 版本 | 做了什么 | 为什么是单环 |
|------|---------|-------------|
| fix1 | 修lean死变量+叶量保底+远竹出画 | 改产出参数，未质疑生成器 |
| fix2 | 加大欹势+枝长 | 继续调参 |
| fix3 | leanAngleBoost 0.40 | 继续调参 |
| fix4 | 右移mainDX+缩小gap（参数联动错误，竹丛变窄） | 继续调参，未验算净效果 |
| fix5 | 大幅欹势+大间距（竿顶交汇策略因hScale失败） | 继续调参，未发现hScale根因 |

**双环教训**：5轮都是"改行动策略"（调参数），从未"质疑指导行动的假设"（生成器高度计算是否正确）。专家评审反复建议"先以极简线稿确定三竿位置"正是需要骨架预检工具的信号，但被忽略了。

## 防复发
1. skeleton预检模式：构图调整前先看几何线框+指标，30秒判断
2. 任何构图参数调整前，先CDP实测_lastComposeLayout确认实际物理量，不凭代码推断
3. 参数联动验算：多参数同时改时必须计算净效果
