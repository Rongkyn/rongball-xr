# acc1007｜移动端验收 harness 触模修复（避坑#24 当轮回流）

> 日期：20261007｜类型：Studio 能力回流（本体验收工具本体修复）｜产出：9 件全量 18/18 PASS

## 起因

接 acc1006（全量移动端体检）继续作业时发现：
1. **1006 的成品与看板日志从未回仓**——HEAD 停在 1005，smoke_1006_result.json(18/18)、
   mo-yun / ink-2048 热修、BOARD 1006 行全在工作区未提交，且 .git/index.lock 残留自 1006 03:00
   （commit 卡死的直接原因）。另遗留 321MB 浏览器 profile / 截图 / 探针垃圾。
2. 重跑 1006 验收时，**ink-gomoku mobile 案例在第一次交互处挂死**，套件跑不完。

## 根因（避坑#24）

条件链：
launch({mobile:true}) → Emulation.setEmitTouchEventsForMouse(mobile) → gomoku 页面 touchstart
里 e.preventDefault()。

此时 Input.dispatchMouseEvent(mousePressed) 的 **CDP 响应永不返回**：
- mouseMoved 正常返回，卡点恰在第一次 mousePressed；
- --headless=new Chrome 146 实测；desktop（不开触摸模拟）mousePressed 正常；
- 换成 Input.dispatchTouchEvent(touchStart/touchEnd) 立即返回且正常落子（hash 变化 + 无报错）。

机制：触摸模拟开启后鼠标按下被转译为触摸手势，浏览器等待手势判定结果，页面 preventDefault 改变判定路径，
headless 下该 ack 不回。

## 修复（已回流本体，非外挂补丁）

1. gallery/works/lib/cdp-harness.js trustedClick：**mobile 一律派真实 touch**
   （touchStart + touchEnd），desktop 维持鼠标三事件；并在头部补「避坑#24」文档。
   click 与 touchstart 两种页面监听都收得到，语义不降级。
2. gallery/works/lib/POOL.md 新增 §U，登记条件链 / 判别 / 处方 / 验收。
3. 套件案例间加 500ms 冷却：本机内存紧（7.7GB，连开 Chrome 时 available 曾不足），
   防 launch 阶段 /json ECONNREFUSED flake（属资源抖动，非代码错误）。

## 验收

acc1006/smoke_1006.js 修复后复跑 **18/18 PASS**（9 作品 × mobile+desktop，无挂死），
结果写 acc1006/smoke_1006_result.json。

## 环境卫生

- .gitignore 增补 acc1006 profile / 探针规则；profile 垃圾不进仓。
- 清理 1006 遗留 + 本次重试 profile 共约 420MB（浏览器 user-data-dir，非产物）。
- 删除残留 .git/index.lock（已确认无 git 进程，stale 自 1006 03:00）。

## 对作品集的意义

这是验收工具本体修复：mobile 档从此可稳定做「真实用户输入」级别的交互验收，
且把一个会让任何后续 mobile 套件静默挂死的坑提前拔掉。9 件移动端健康状态维持 18/18。
