# acc1013 · 余量 12 件真触摸回归 + 3 处作品缺陷修复（2026-10-13）

## 为什么做这件
避坑 #26（drag 零事件假阳性）1009 才修复，但修复后只用修好的 drag 重验过 1012 的 **8 件代表作**；
1005（绒线/踏雪/天灯）与 1006（9 件全量基线）共 **12 件**的历史 PASS，都是在「drag 实际不派事件 /
不派 TouchEvent」的旧 harness 下得出的。凡靠拖动手势的件，其 PASS 可能被自运动 + 宽松断言放过。
这批又都在「待主人圈选冻结」队列里，简历挂廊前必须用修复后的 harness 兜底回归。

今日硬闸：待审 5 件 > 2，不得开新件；无主人点题 → 按优先级②磨旧作（移动端/交互手感缺口）。

## 做法
`freeze_gate_1013.js`：12 件 × 双视口（mobile 390×844 + desktop 1280×581）= 24 场景。
- 统一六闸：backing / 入屏 / 无溢出 / canvas 本体 touch-action:none / 零真错误 / **权威交互信号**。
- 交互断言锚定各件权威钩子，不看像素自运动：
  - 文字件 → `#state` JSON 镜像计数（苔痕/天灯）、DOM（2048 落子/分数、五子棋 #status）
  - 绘制件（粒子/听声）→ 注入只读帧级 arc 计数器，对比「静默帧均值 vs 手势帧峰值」
  - 踏雪 → 滑杆 input 真值
- mobile 拖动一律用新 `s.touchDrag`（CDP 真触摸序列，见下），desktop 用 drag(mouse)。

## 发现与修复（24/24 PASS，含 3 处作品真缺陷 + 1 处 harness 缺口）

| 件 | 问题 | 性质 | 修复 |
|----|------|------|------|
| ink-particles | 只挂 canvas `mousemove/click`，移动端触摸拖动画墨**零响应**（hint 却承诺） | 真缺陷 | 抽 emitTrail/emitBurst，补 touchstart/move/end/cancel；短按=晕染、拖动=墨迹 |
| ta-xue | ①390×844 被高度系数卡成 525px，横溢 135px；②固定 704 内容把 headless layout viewport 撑宽，innerWidth 读到伪值 547 | 真缺陷 | 竖屏宽度优先入屏；改用 visualViewport/clientWidth 真实可视宽 |
| feng-duo | 移动模拟补发 resize 时瞬时 dpr=1，retina backing 780×1688 被降成 390×844（发糊，坑#20 同类） | 真缺陷 | 缓存最大 DPR（上限2），backing 只升不降 |
| harness | drag(pointerType:'touch') 只派 PointerEvent 不派 TouchEvent，只听 touch 的件被**假阴性**误判（ink-sound 实测 42→42，真触摸 9131） | 能力缺口 | 新增 `s.touchDrag()`（dispatchTouchEvent），避坑#29 回流 |
| tian-deng | 初版脚本点天空空处只读 released，桌面误 FAIL | 脚本口径 | 改走真实链路：点地面灯→面板→点灯放飞，waitFor released+1（探针证实作品双端健康） |

ink-sound 本体零改动（真触摸 gesPeak 9131 vs 静默 42，健康）；其余 8 件全部一次通过。

## 结论
- 12 件 × 双视口 **24/24 PASS**（连续复跑稳定；脚本/作品两侧坑均已闭环）。
- 新坑当轮回流本体：cdp-harness.js 避坑#29 + touchDrag 原语；POOL.md AC–AG 五节。
- 产物：freeze_gate_1013.js / freeze_gate_1013_result.json / probes/（6 个定性探针，require 路径已适配）。
- 未动 gallery 卡片（无新件、无视觉改版，纯移动端正确性/清晰度修复）。
