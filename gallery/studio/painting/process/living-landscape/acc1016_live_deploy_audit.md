# acc1016 · 线上 Pages 部署审计 + living-landscape retina 修复

- 日期：2026-10-16
- 类型：旧作深磨（优先级②冻结前打磨 + P13 公开链接部署审计）
- 件：全廊 21 件（主改 living-landscape）
- 硬闸：待审 5 件 >2、无当周点题 → 不开新件，磨旧作
- 简历相关性：高。招聘方点开的是 HTTPS 线上链接，此前所有验收都在 file://，线上从未系统审过

## 起因

P13 公开访问已具备（GitHub Pages 已启用），但 21 件只在 file:// 验收过。
file:// 与 https:// 的差异面（网络 404、混合内容、部署版本漂移、协议相关行为）从未覆盖。
冻结前必须有一次线上环境的全量证据。

## 发现

### 坑#21（新·低危·全站）favicon.ico 404
- 现象：每个页面 console 固定 2 条 `Failed to load resource: 404`，根因是浏览器默认请求
  `https://rongkyn.github.io/favicon.ico`（站点根，仓库放不到该路径），且页面无任何 favicon link。
- 对招聘方：打开作品 F12 第一眼就是红错，观感扣分（不影响功能）。
- 修：新增 `gallery/favicon.svg`（墨点+朱印，64×64 内联 SVG），21 件 + gallery 首页
  head 加 `<link rel="icon" type="image/svg+xml" href="…/favicon.svg">`。
  显式声明后浏览器不再请求根 favicon.ico。
- 文件修复优先于占位 404：零字节 favicon 是掩盖，图标是真实资产。

### 坑#20 同型复发（中危·代表作）living-landscape 移动 retina backing=css×1
- 现象：移动 390×844 dpr=3 视口，mainCanvas/uiCanvas backing=390×844（css×1），
  整个画面在 retina 屏按 1/2 分辨率渲染后拉伸，**手机上整幅山水是糊的**。
- 根因：`resize()` 直接 `canvas.width = window.innerWidth`，从未乘 dpr，也无 setTransform。
  历史遗留（1015 父版本 9538b53 已如此），非 noise-lib 重构回归——1013 移动清单未含本件，漏网至今。
- 为什么重要：living-landscape 是 gallery 第一行招牌件、简历首页。
- 修法：backing = round(css × min(dpr,2))，两 canvas 同步，`setTransform(dpr,0,0,dpr,0,0)`；
  W/H 保持 CSS 像素，33 处绘制坐标零改动；dpr 封顶 2 控移动 fill-rate（作品族既定模式）。
- 安全核查：全件无绘制代码直接读 canvas.width/height（坐标只用 W/H），双 canvas backing 一致。

## 验收（复用 lib/cdp-harness.js）

脚本（acc1016/）：
- http_scan_1016.js：HTTP 层，gallery 21 卡 href + 7 封面 + 4 lib → **30/30 200**
- live_audit_1016.js：线上运行时，桌面 21 + 移动 8 代表作
  - 修复前：桌面 21/21 PASS；移动 7/8（living-landscape backing 降级）
- verify_ll_fix.js（本地）：移动 back 390→780（dpr2 封顶）、桌面 1280×581 不变、
  双 canvas backing 一致、主画面非空（21585 采样点）、零真错误 → PASS
- verify_ll_interact.js（本地移动真触摸）：tap 涟漪生成（点击链路坐标未被 transform 破坏）→ PASS

## 待 push 后线上复验
- 线上 living-landscape 移动 backing=780 宽
- 全站 console 无 favicon 404

## POOL 评估
- 新增可复用模式：「线上部署审计」脚本骨架（Network 域抓失败/4xx/混合内容 + 协议断言 +
  file→https 双环境）。候选入 POOL「部署/Pages」类；待线上复验绿后正式入池。
- retina backing 模式与坑#20 同源，不入新池，在坑表注明 living-landscape 曾漏网。
