# acc1015 · noise-lib 提取与两件山水零漂移重构

日期：2026-10-15｜类型：Studio 能力回流欠账（旧作迭代，非新件）｜硬闸：待审 5 件 >2，新件闸关闭，合规未开新件。

## 做了什么

清偿 BOARD/POOL 双挂账「noise-lib/season-lib 重复实现，触碰山水件时提取」（1014 刚触碰 living-landscape，触发条件成立）。

1. **新建 `gallery/works/lib/noise-lib.js` v1.0**（validated）：经典 Ken Perlin improved noise，`window.PerlinNoise` 全局，file:// 直接 script src 可用。
   - `new PerlinNoise(seed?, opts?)`：数字=Park-Miller LCG 确定性洗牌；函数=自定义随机源；省略=Math.random。
   - `opts.gradMask`（默认 true=经典 `h&3` 掩码；false=不掩码，山居口径）。
2. **山居 mountain-dwelling.html**：删内联 Noise 类 → `new PerlinNoise(42, { gradMask: false })`。
3. **山水间 living-landscape.html**：删内联误名 SimplexNoise 类 → `new PerlinNoise()`（默认掩码）。
4. **season-lib 判定不提取**：两套季节系统非同源复制（白昼浅彩平铺常量/雾浓淡 vs 夜景墨色函数配置/云团参数），详见 POOL §AL。

## 比对实锤的两处真实分叉（不是机械复制）

- **坑#5 洗牌索引**：山居 LCG 走整数直接取模 `j = s % (i+1)`，不是 `floor(s/2147483647*(i+1))`——两者数学不等价，首版库写错导致 873 噪声点漂移。
- **坑#6 grad 口径**：山居不掩码（直接 `h<2`），山水间 `h&3`。一度误判两件相同，接入山水间时读原件 318–323 行才抓到掩码，库改为变体参数。

## 验收（三层）

| 层 | 脚本 | 结果 |
|---|---|---|
| Node 逐位等价 | `parity_noiselib.js` | 7/7 PASS（山居 perm[512] 全等；1290 采样点全等；mulberry32 注入山水间全等；有界/异构/确定性） |
| 真机 CDP 像素回归 | `cdp_regression_1015.js` | 山居 diff=0、山水间 diff=0（1080×675 同帧同随机序列逐像素）；file:// 冒烟切冬/镜头零错误 |
| 生产路径冒烟 | 同上 C 组 | `ctor=PerlinNoise`，gradMask 两件分别 false/true，切季/切镜头无异常 |

### 确定性像素回归范式（回流 cdp-harness 避坑 #32 / POOL §AM）

基线（git show HEAD 单文件）与新版（临时页 `../lib/noise-lib.js`）走同一本地 HTTP server，4 页首脚本位置统一注入：

1. 固定 PRNG（mulberry32 seed=20261015 覆盖 Math.random）——缺它山居纸张纤维/粒子两次加载不同，实测 46% 像素差；
2. 虚拟时钟（performance.now/Date.now + setTimeout/setInterval 入队）；
3. 手动 rAF（`window.__step(n)`，1000/60ms 固定步长，每帧先跑到期 timer 再跑帧回调；山居 setTimeout(300) 预置元素第 19 帧就位）——缺它山水间动画相位漂移 1.4%/maxAbs=107。

data:text/html 内联整页方案废弃：库 JSDoc 最小示例含字面量 `</script>`，会被 HTML 解析器提前闭合脚本块（须转义 `<\/script>`）；file:// 真实引用无此问题。

## 产物

- 脚本：`parity_noiselib.js`、`cdp_regression_1015.js`（纯 JS PNG 解码+逐像素 diff，临时页生成在 works/.reg1015/，测完即删）
- 证据截图 `shots/`：md_base / ll_base（回归基线帧，新版 PNG 与其 MD5 完全相同已去重）、md_smoke_winter_far、ll_smoke_winter（file:// 冒烟）
- 库本体：`gallery/works/lib/noise-lib.js`（头 JSDoc 含坑#5/#6 与用法）
- 文档：POOL §AK–AM、cdp-harness 避坑 #32、BOARD 五·1015

## 待主人

无新增必答项。两件视觉/交互与重构前完全一致（逐像素证明）。待审队列仍 5 件，需实机审阅消化到 ≤2 后新件硬闸才开。
