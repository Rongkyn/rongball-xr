# 加载性能 P12 系统验收 · 0927（旧作深磨，非新件）

## 起因
队列 5 件超闸，今日不开新件。优先级②中移动端/叙事已磨，**加载性能（P12）从未系统验收**。
对 7 件作品集候选（墨园/残荷/听墨/芦花/桂雨/月波/秋虫）做双端加载审计，揪出 **3 类 4 个致命加载回归**——
其中最老的从 0923 起潜伏 5 天，此前都被「EXC:Uncaught 像 CDP 假阳性」错误放过。

## 发现与修复

### Bug 1（P0）墨园漏引 resize-debounce.js —— 整作死掉
- 现象：打开只有米色底（body CSS），`#scene`/`#sealCanvas` 停在默认 300×150、全透明。
- 根因：0923 c7aa4eb 改引共享库时，line 4815 `window.resizeDebounce.createResizeDebounce` 被调用，但 html **从未加 `<script src="lib/resize-debounce.js">`**。
  抛 `Cannot read properties of undefined (reading 'createResizeDebounce')`，打断主 IIFE，`requestAnimationFrame(loop)` 未执行。
- 修复：`#scene` 主脚本前补 `<script src="lib/resize-debounce.js"></script>`。
- 验证：零错误、canvas 1280×717、点击栽种暗像素 0→15699，目视竹/梅/石/水正常。

### Bug 2（P0）桂雨 gCols TDZ
- 根因：line 209 `_rd.trigger()` 首次同步 → resize → buildGround 时，`let gCols`（line 454）尚未初始化，
  `Cannot access 'gCols' before initialization`。
- 修复：把 `let gCols,gRows,gDep` 声明移到 createResizeDebounce 之前。
- 验证：零错误，摇树 70 瓣金桂落下，state 正常。

### Bug 3（P0）秋虫 createResizeDebounce 漏 trigger + clumps TDZ
- 根因 a：line 196 创建防抖后**没有 `.trigger()`**。页面加载不派发 resize 事件，
  headless 早期 innerWidth=0 走零尺寸守卫后再无机会，canvas 停 300×150（移动端时序侥幸正常）。
- 修复 a：补 `_qcRD.trigger()`。
- 根因 b：trigger 让 resize 提前执行，line 191 `if (clumps.length)` 在 `const clumps`（line 315）声明前 → TDZ。
- 修复 b：提前声明 `let sceneReady=false`，resize 内改 `if (sceneReady)`，buildClumps 末尾置 true。
- 验证：零错误，桌面满屏渲染（月夜草坡/露滴/阶石），目视优美。

### 系统性根因（回流到 resize-debounce.js v1.1）
模块 v1.0 构造时**只绑 resize 监听、从不自动执行首次**——页面加载本身不派发 resize，
不显式 trigger 就永远不初始化，这是 Bug 3 的模块级根因，也是高复发点。
- 构造末尾自动 `perform()`（零尺寸安全跳过；`opts.autoInit=false` 可关，芦花等自行初始化者用）。
- perform 加零尺寸守卫；fn 抛错不吞（TDZ 由调用方守卫）。
- 状态升 validated；头部补两条坑：漏引 script 标签、TDZ。

## harness 回流（坑#16 认识纠错，最重要教训）
- 原认知：「EXC:Uncaught = CDP 长会话假阳性」——**没有异常详情支撑，连续 3 次放过真错误**。
- 修复：`Runtime.exceptionThrown` 现记为 `EXC[文件名:行号] message`：
  - 真页面错误：exceptionDetails.url 指向作品、带 lineNumber/stack；
  - eval 假阳性：url 为空（标 [eval]）。
- 铁律：**看到带文件名的 EXC 必须用 addScriptToEvaluateOnNewDocument 注入 error 监听抓 stack 定位，
  禁止凭「干净复跑通过了」结案**；只有 url 空的 eval 瞬时错才重试/换端口。
- 经验本体已更新：基础设定/experience/cdp_harness_acceptance.md。

## 最终验收
`acc0927/acceptance_0927.js`：7 件 × 双端 = **42/42 PASS**（complete / 首帧 / 零错误）。
体积（raw / gzip）：墨园 216KB/63KB（纯代码，无嵌入图；唯一外链 Google Fonts，gzip 后可接受），
其余 6 件 21–41KB / 8.5–15KB，全程序化生成、零外链。
file:// 本地资源不进 performance resource timing——体积以本地 stat+gzip 实测。

## 待主人动作
1. **手机实机复验**墨园/桂雨/秋虫（这 3 件此前打开可能就是坏的/黑屏，现已修复）。
2. 认可后可推进冻结；5 件待审队列仍需消化到 ≤2（硬闸）。
