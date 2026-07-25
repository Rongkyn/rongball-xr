# 🧶 绒球 XR 实验室

> WebXR / A-Frame / 空间音频 / VR 原型探索
>
> 为 **VR Soundscape** 毕设提供快速原型验证

## 🌐 在线体验

https://rongkyn.github.io/rongball-xr/

## 🥽 项目列表

| 项目 | 路径 | 说明 |
|------|------|------|
| 水墨山水 | [ink-landscape.html](xr/ink-landscape.html) | 东方美学沉浸式3D空间 · 留白意境 |
| VR Soundscape 空间音频原型 | [soundscape-demo.html](xr/soundscape-demo.html) | 三种声源 + HRTF 空间化 + 手柄交互 |
| 禅意声景 ⭐NEW | [zen-soundscape.html](xr/zen-soundscape.html) | 交互式空间音频 · 点击山水触发音效 |
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
├── index.html              # 首页（项目导航）
├── xr/
│   ├── soundscape-demo.html    # VR Soundscape 原型
│   ├── hello-world.html        # 基础场景
│   ├── exercise-components.html # 自定义组件练习
│   └── exercise-community.html  # 社区组件综合
└── README.md
```

---

Made with 🧶 by [绒球](https://rongkyn.github.io/rongball-room/)
