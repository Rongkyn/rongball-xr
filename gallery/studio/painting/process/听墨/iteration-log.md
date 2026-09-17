# 听墨 · 迭代日志（2026-08-27）

> 当日立项当日闭环。研→作→诊→磨→裁全程约2.5小时。

## v1（14:00 前后）作·初版
- 做了什么：墨洇 v10 全量复制为 ting-mo.html，加声音层（五声+开关+探针）；lib v1.0→v1.1 加 out()（dogfood 发现的总线缺口，先于作品验证修复）
- CDP 结果：plops/grains/grinds/零错误 PASS；**whisper=1 全程饱和**；**toggle off FAIL**

## 诊（v1 后）
- P0①：whisper 饱和无动态——归一化 /600 太小，frontAcc 实测 11.6k-18k+
- P0②：toggle FAIL——先怀疑作品代码，debug-toggle.js 独立验证作品开关**完全正常**（on/off/suspend/resume 全对）
- 根因定位：测试脚本 stage4 的 Runtime.evaluate 顶层裸 `return` 语法错误 → 点击从未执行；且此前并行 edit_file 同文件导致修复被吞（0825 已有此教训，再犯）
- P2：SND.ac 探针字段只在 init 时快照，会 stale

## 磨（v1→v2）
- 只改标定：frontAcc 原始值探针实测（3s=11.6k/6s=14.0k/16s=17.4k/24s=18.1k），除数 600→24000，曲线 0.48→0.75 有呼吸有余量
- 修测试脚本 IIFE 包裹；SND.ac 改为 suspend/resume 的 .then() 里更新
- v2 结果：whisper 曲线成立（0.55→0.75→0.02）；toggle 仍 FAIL——复查发现 stage4 第一个 evaluate 仍是旧文（并行编辑丢失实锤），acState 呈"慢半拍"假象；声音关状态下 dblclick 导致 grinds FAIL、干燥全程静音导致 bells FAIL（连锁假象，非作品缺陷）

## 磨（v2→v3）
- 串行重写 stage4-6：双 IIFE 点击+复合状态断言；stage5 前确保声音开；stage6a 铃接线单元验证 + stage6b 干燥 e2e（400s 上限）
- v3 全量 PASS：五声事件计数/AC 状态机/耳语曲线/单滴 rad14 ≈400s 全干 bells==1 与「水尽墨定」同帧/零 JS 错误
- works/ 部署位冒烟（真实 lib 相对路径）：lib 加载、out() 存在、plop/whisper 触发、零错误

## 裁
- 定格 v3 即交付版。自评：大众7.5/专家7.0/综合7.2（降级验收，部署可见性待主会话）
- contribution 五项见 ting-mo-notes.md

## 馈（回流）
- **lib**：v1.1 out() 已入库；液体声组按"第二件作品复用时才提取"惯例暂留作品内，README 路线图记录
- **研究课题**（水墨谱系）：frontAcc 标定曲线+「声音作为过程监测仪器」候选 case，材料在 ting-mo-notes.md 技术档案节
- **教训入库**：
  1. edit_file 同文件禁并行（再犯，这次抓到实锤：第一个修复被第二个并行编辑覆盖）
  2. CDP Runtime.evaluate 表达式顶层禁裸 return，必须 IIFE；evaluate 的 exceptionDetails 在响应里不回抛，不回看就会"静默没执行"
  3. 探针字段要区分快照与实时（SND.ac 教训）：状态类探针要么实时读，要么在转换回调里更新
