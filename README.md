# 🧶 绒球 XR 实验室

> WebXR / A-Frame / 空间音频 / VR 原型探索
>
> 为 **VR Soundscape** 毕设提供快速原型验证

## 🌐 在线体验

- **XR 实验室首页**：https://rongkyn.github.io/rongball-xr/
- **绒球水墨集（互动作品集）**：https://rongkyn.github.io/rongball-xr/gallery/

---

## 🖌️ 绒球水墨集 · Rongball Ink Studio

以代码为笔，以屏幕为纸——东方美学 × 程序生成的互动作品集。

📜 画廊入口：[`gallery/index.html`](gallery/index.html)

| 作品 | 路径 | 类型 | 说明 |
|------|------|------|------|
| 水墨流韵 | [ink-particles.html](gallery/works/ink-particles.html) | 粒子交互 | 鼠标挥毫，四色墨韵，晕染扩散 |
| 山水间 | [living-landscape.html](gallery/works/living-landscape.html) | 沉浸视觉 | 多层山脉流场、四季切换、王维题诗 |
| 水墨 2048 | [ink-2048.html](gallery/works/ink-2048.html) | 益智游戏 | 宣纸风格 2048，墨韵计分、悔棋、触屏 |
| 弈 · 水墨五子棋 | [ink-gomoku.html](gallery/works/ink-gomoku.html) | 策略游戏 | 评分式 AI、人机/人人、落子水墨晕染 |
| 墨音 | [ink-sound.html](gallery/works/ink-sound.html) | 互动音画 | 以山为琴，五声音阶、卷积混响、录制回放 |

---

## 🥽 XR 实验室项目列表

| 项目 | 路径 | 说明 |
|------|------|------|
| 听雨 ⭐ | [rain-listening.html](xr/rain-listening.html) | 水墨雨景 · 四声道程序化雨声混音 · 东方美学 |
| 涌 ⭐ | [emergence.html](xr/emergence.html) | 粒子生命模拟 · 涌现行为 · 吸引矩阵可视化 |
| 墨 · Ink Flow ⭐ | [ink-flow.html](xr/ink-flow.html) | 流体水墨模拟 · 五色运墨 · 宣纸质感 |
| 鱼乐 | [koi-pond.html](xr/koi-pond.html) | Boids鱼群AI · 锦鲤 · 涟漪互动 · 日夜切换 |
| 星野 | [starry-night.html](xr/starry-night.html) | 东方星官 · 银河粒子 · 月相变化 · 流星雨 |
| 枯山水 | [zen-garden.html](xr/zen-garden.html) | 禅意互动庭园 · 沙纹绘制 · 四季流转 |
| 声源山水 | [source-landscape.html](xr/source-landscape.html) | 音频可视化编辑器 · 拖拽声源 · 实时混音 |
| VR 空间搭建 | [vr-space-builder.html](xr/vr-space-builder.html) | 环境搭建 · 导航练习 · VR交互 |
| 禅意声景 | [zen-soundscape.html](xr/zen-soundscape.html) | 交互式空间音频 · 点击山水触发音效 |
| 水墨山水 | [ink-landscape.html](xr/ink-landscape.html) | 东方美学沉浸式3D空间 · 留白意境 |
| 程序化音效 | [procedural-audio-tonejs.html](xr/procedural-audio-tonejs.html) | Tone.js 13种音效实时合成 |
| Hello World | [hello-world.html](xr/hello-world.html) | 基础 3D 场景 |
| 自定义组件练习 | [exercise-components.html](xr/exercise-components.html) | 6 个组件实验 |
| 社区组件综合场景 | [exercise-community.html](xr/exercise-community.html) | 粒子/海洋/多光源/雾效 |

## 🎮 交互方式

- **桌面端**：鼠标点击 / WASD 移动
- **VR 端**：手柄射线指向 + 扳机交互（支持 Pico / Quest 等）

## 🛠 技术栈

- [A-Frame 1.8.0](https://aframe.io) — WebXR 框架
- [aframe-particle-system](https://github.com/c-frame/aframe-particle-system-component) — 粒子系统
- [aframe-environment-component](https://github.com/c-frame/aframe-environment-component) — 环境生成
- [aframe-extras](https://github.com/c-frame/aframe-extras) — 扩展工具集
- Web Audio API + HRTF — 空间音频

## 📁 结构

```
rongball-xr/
├── index.html              # XR 实验室首页（项目导航）
├── gallery/
│   ├── index.html          # 绒球水墨集 · 画廊首页
│   ├── images/
│   └── works/              # 水墨互动作品（均为自包含 HTML）
│       ├── ink-particles.html   # 水墨流韵
│       ├── living-landscape.html # 山水间
│       ├── ink-2048.html         # 水墨2048
│       ├── ink-gomoku.html       # 弈·水墨五子棋
│       └── ink-sound.html        # 墨音
├── xr/                     # WebXR 原型
│   ├── soundscape-demo.html
│   ├── ink-landscape.html
│   └── ...
├── 创作日志/
└── README.md
```

---

Made with 🧶 by [绒球](https://rongkyn.github.io/rongball-room/)
