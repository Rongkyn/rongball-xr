# Brief #008 · 墨园 v4.0 — 渲染层重写：从矢量描边到 Brush Stamp

## 目标
把墨园所有"叶/针/细枝"笔触从 Canvas 矢量描边（lineTo+stroke）替换为 Brush Stamp 铺贴，获得毛笔在宣纸上的真实质感（起笔/收笔/飞白/浓淡）。**保留所有植物生长算法、构图、风、UI、撤销逻辑不动。**

## 背景
v3.0-v3.3 三轮迭代证明：矢量描边能画出"水墨的形状"但画不出"水墨的质感"。已通过技术验证页 `brush-test.html` 确认 brush stamp 方案可行（兰叶钉头鼠尾效果决定性优于矢量）。

## 技术参考
验证页代码：`gallery/works/brush-test.html`，其中三个函数直接复用：
- `createBrushStamp(size, opts)` — 生成带飞白的圆形毛笔触图片
- `sampleBezier(p0,p1,p2,p3,segments)` — 贝塞尔采样（已存在类似逻辑）
- `brushPath(ctx, pts, stamp, pressureFn, opts)` — 沿路径铺贴 stamp

关键参数（验证通过）：
- stamp: `createBrushStamp(64, {elongation:1, feather:0.45, dryness:0.2})`（浓笔）
- dryStamp: `createBrushStamp(64, {elongation:1, feather:0.55, dryness:0.45})`（干笔/飞白）
- stamp铺贴间距：`step = width * 0.18`（像素），每段之间插值
- 单stamp绘制尺寸：`width * 1.5`
- 单stamp不透明度：0.4-0.6（靠叠加密集度形成浓度）
- **不要使用 globalCompositeOperation='multiply'**，它在浅宣纸上会让笔触发灰；用正常 source-over 配合低 opacity 叠加

## 需要替换的笔触（按优先级）

### P0 — 视觉收益最大
1. **`drawOrchidLeaf`（行1275附近）**：整个函数重写
   - 当前用多段 lineTo+stroke 模拟 lineWidth 变化，但视觉仍是矢量弧线
   - 改为：收集叶片路径点 → `brushPath` 用 orchidLeafPressure 压力曲线
   - 压力曲线（从 brush-test.html 复制）：
     - 0-5%: 0→maxW 落笔
     - 5-15%: 0.95-1.0 maxW 按笔
     - 15-60%: 0.95→0.5 maxW 行笔
     - 60-90%: 0.5→0.2 maxW 提锋
     - 90-100%: 0.2→0.08 maxW 鼠尾
   - 老叶用 stamp（浓），新叶用 dryStamp（淡+飞白）
   - 根部钉头点：ellipse 5×3px 焦墨
   - 叶尖回锋点：1px 浓墨点

2. **`drawBambooLeaves`（行875附近）**：叶片从 stroke 改为 brushPath
   - 每片竹叶是一条贝塞尔/二次曲线，用 bambooLeafPressure：
     - 0-15%: 0→8px 起笔
     - 15-70%: 8→5px 行笔
     - 70-100%: 5→0.5px 收笔
   - 同组叶同色（已有 leafTone 逻辑），浓叶用 stamp、淡叶用 dryStamp
   - 个字/人字/介字分组逻辑保留

3. **`drawPineNeedles`（行906附近）**：松针
   - 当前每根针是一条 lineTo+stroke（lineWidth=0.5）
   - 改为：每根针用 brushPath，pressureFn 为恒定细宽度（0.8-1.2px），但起笔略重收笔略轻
   - 因为针很细，stamp 铺贴要更密（step = width*0.12），stamp size 可以小一些（32px）
   - 性能注意：一丛松可能有200+针，需要测试帧率。如果卡，松针可以保留矢量（松针本身细，质感差异小），优先保证竹叶/兰叶/柳条

### P1 — 重要但次要
4. **柳树 drooping twigs 叶片**：同竹叶逻辑，用 brushPath
5. **梅花花瓣勾勒/花萼**：小笔触用 stamp
6. **梅花枝干皴法**：现有 drawPineBranch 的飞白逻辑如果已经是手工像素效果可保留；如果仍是矢量 stroke，替换为 dryStamp + 干笔 pressure

### P2 — 不动
- 竹竿/松干/梅干等粗枝干：现有 quadraticCurveTo + lineWidth 渐变效果可接受，暂不替换
- 远山：fill + gradient 不动
- 地面、印章、UI：不动
- 风动画、撤销、生长动画：不动

## 性能要求
- 3株植物完整生长后，稳定状态帧率 ≥ 30fps（桌面浏览器）
- 风动画循环中不重新生成 stamp（stamp 在初始化时生成一次，全局缓存）
- 叶片顶点数据已在 build 阶段算好，渲染时只做 stamp 铺贴
- 如果 P0 全部替换后帧率不达标，优先保留兰叶+竹叶为 stamp，松针回退矢量

## 文件约束
- 文件大小 ≤ 90KB（从75KB放宽，因为新增 stamp 函数和压力曲线）
- 版本注释改为 v4.0 "笔落宣纸 · brush stamp渲染"
- 保持单文件 HTML，不引入外部图片资源（stamp 用 canvas 像素生成）
- 保留 brush-test.html 不删，作为技术存档

## 验收标准
1. 兰叶：有明显的起笔钉头、行笔粗细变化、收笔鼠尾，边缘有毛糙感，不再是几何弧线
2. 竹叶：起收笔有锋，叶片边缘不光滑，能看出毛笔触感
3. 松针（若替换）：细而不弱，有浓淡
4. 整体：第一眼有"这是画在宣纸上的"感觉，而不是"矢量水墨风格"
5. 无运行时报错
6. 风动画、撤销、生长流程正常
7. 文件 ≤ 90KB，node --check 通过
8. 帧率 ≥ 30fps

## 执行要求
- 先在代码顶部新增 brush engine 区块（createBrushStamp/brushPath/压力曲线），stamp 全局缓存
- 逐个替换绘制函数，每替换一个自查语法
- 完成后运行 node --check
- 报告：文件大小、改动函数清单、性能自评
