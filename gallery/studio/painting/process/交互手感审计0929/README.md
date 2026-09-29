# 交互手感系统审计与修复 · 2026-09-29

## 定位
作品集此前已系统验收：移动端布局（acc0927）、加载性能（acc0928）、四段式叙事（acc0927）。
**「交互手感」是唯一从未系统验收的维度。** 队列 5 件超闸、无主人点题，按 BOARD 五档优先级②，
今日不做新件，做交互手感系统审计与深磨。

## 核心发现（旧坑新形态：声明写了但没作用到交互元素）
6 件 canvas 的**实际 touch-action = auto**，虽然源码都声明了 `touch-action: none`：

- can-he / lu-hua / gui-yu / yue-bo / qiu-chong：把 `touch-action:none` 写在 `html, body {}` 上。
- ink-garden：写在 body 上。
- **`touch-action` 不是可继承属性**，挂在 body 上对 canvas 无效。用 CDP 读 `getComputedStyle(canvas).touchAction`
  实测 6 件均为 `auto`（仅 ting-mo 一开始就写对在 `canvas#ink` 上，为 `none`）。
- 6 件的 pointermove 处理器也都没有 `preventDefault`。

**真机后果**：canvas 上的拖动手势（can-he 持续搅雨、lu-hua 扫风、gui-yu 摇树、yue-bo 碎月·拨云、
qiu-chong 轻扫觅虫、ink-garden 长按/点按）会被浏览器的滚动/缩放手势仲裁**先于页面**抢走，pointermove
被打断。合成事件测试无法复现这一层（JS 层派发 4/4 正常），故必须以标准 + computed 值判定。

## 修复（标准正解，最小改动）
给 canvas **本体**补声明；并顺带补桌面 `cursor: crosshair`（此前 5 件桌面 cursor=auto，无可点暗示）：

```css
/* can-he / lu-hua / gui-yu / yue-bo / qiu-chong */
canvas { display:block; position:fixed; top:0; left:0; touch-action:none; cursor:crosshair; }
/* ink-garden（多行格式）*/
canvas#scene { … touch-action:none; cursor:crosshair }
```

各 1 处，共 6 件 6 处。ting-mo 本就正确，未改。

## 验收 acc0929（12/12 PASS）
- 脚本：`studio/painting/acc0929/acceptance_0929.js`；结果：`acceptance_0929_result.json`。
- 探针：`probe_feel_baseline.js`（计算样式/坐标映射基线）、`probe_touch_drag.js`（合成触摸派发计数）。
- 覆盖 6 件 × 移动 390x844@2 + 桌面 1280x720@1。
- 断言：canvas computed `touch-action:none`、桌面 `cursor:crosshair`、canvas 完整入屏、
  backing/CSS 尺寸坐标映射与 dpr 一致、手势命中热区后状态变化、realErrors 为 0。

### 各件交互模型（验收中核实，记录备查）
| 件 | 交互 | 命中热区 | 观测指标 |
|---|---|---|---|
| ink-garden | 点按**种兰**（非自由画笔）；tap=pointer+mouse，移动 touch | 空区任意 | 落点区墨色像素净增 |
| can-he | 持续搅雨（down/move 增 rainLevel） | 叶/池区 y≈0.55 | rain |
| lu-hua | 横向拖动扫风 | 芦苇区 y≈0.60 | gusts |
| gui-yu | 摇树（命中树冠冠区） | y≈0.30（HUBS 0.24–0.40） | shake |
| yue-bo | 水面碎月（y>HORIZON）/天上 tapSky | 水面 y≈0.75 | nRipple |
| qiu-chong | 轻扫惊虫（近虫即静） | 草地带 y≈0.72（GROUND 0.74H） | hushes |

### 过程教训
1. 初版手势点位用统一 y=0.55，gui-yu（树冠在上方）、yue-bo（水面在下方）、qiu-chong（草地带 0.72H）
   都漏了热区 → 假阴性。**手感验收必须先读各件触发条件、按真实热区选点**（与 harness 坑#10 一致）。
2. ink-garden 初被当自由画笔、查 `#btnClear`，实际是点按种兰、按钮 `#btn-clear`。**先读交互模型再写断言**。
3. boot 后 innerWidth 未稳定时 canvas 短暂为默认 300x150；健康探针必须等 backing 与视口尺寸一致（waitFor）。
4. 连续快速 launch 12 个 headless 会端口/会话串台（harness 坑#8/#16）：端口大幅错开 + kill 后冷却 +
   不健康换 profile 重开。

## 待主人动作
6 件为**行为标准修复**，仍建议在 Pico/手机浏览器实机复验一次拖动是否顺滑（此前 0927/0928 多件也待实机复验）。
