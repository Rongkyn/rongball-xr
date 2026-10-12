# 可复现水声实验制作台

这是 [试点规程](../pilot.md) 的离线实验实现候选。制作台会显示条件映射，**不直接用它盲听**。
没有试听结论、没有替任何接收者签署验收，也不修改线上作品。

## 运行与检查

需要现代浏览器支持 OfflineAudioContext；不安装依赖，不请求外部资源。
在本仓根目录启动 `python -m http.server 8766 --bind 127.0.0.1`，访问
`http://127.0.0.1:8766/research/water-audio-comparison/experiment/`，点击“生成并检查”。
操作不会自动播放、上传或部署。可下载各音轨及 `measurement.json`，放在同一个新目录。

```sh
node --test research/water-audio-comparison/experiment/test-render.mjs
python -m unittest discover -s research/water-audio-comparison/experiment -p "test_*.py" -v
python research/water-audio-comparison/experiment/verify_export.py /path/to/export
```

浏览器数值检查与独立 Python 字节检查都要通过。后者重新读取文件、核对 SHA-256、
长度/格式、各声道峰值/RMS、滴声逐样本一致、床振幅比例与混音重建误差，不仅比较报告中的两个数字。
修改 WAV、种子、事件表或配置后需重新生成、复核；报告不自动覆盖新版本。

## 产物与路由

- 48 kHz、立体声、每段 10 秒；3 类滴声 × 2 张事件表 × 2 条件，共 12 个最终混音。
- 共 44 个 WAV：8 个单床 A/B stem；每个试次另含滴声、全床和混音。
  stem 为 IEEE float32，混音为 PCM16；编码乘 32768 四舍五入（正端上限 32767），解码除 32768。
  PCM16 误差容限为 `1/32768`，床比例容限为 `1e-7`。
- 事件、频率/包络、所有 PRNG 种子和 LFO 初相进入报告。T1/T2 只改变事件时刻；
  每张表独立生成 A/B，每个计数段只有一种离散滴声，但保留全部四路连续床。
- 每路声源单独用 OfflineAudioContext 渲染。竹叶床和竹滴分别拥有相同初相的 0.25 Hz LFO，
  depth 为 0.08；床衰减在源 stem 渲染后施加，因此不会影响滴声调制。
- 实际节点创建与 connect 调用导出为 `routes`。最终线性组合为
  `A = (全部床 + 目标滴声) × 0.5 × 0.5`，
  `B = (全部床 × 10^(-6/20) + 目标滴声) × 0.5 × 0.5`。
  后一个 0.5 是事先固定的共同安全衰减，不根据峰值或条件调整。
- 没有混响、限幅、压缩或单段归一化。重复渲染源 stem 检查 RNG/LFO 复位；
  导出前拒绝非有限值或达到满幅的采样。未测 true peak，不声称已排除重建峰值。

## 来源与解释边界

由 Codex 为本仓任务实现，仅沿用本仓
[听雨固定源码](https://github.com/Rongkyn/rongball-xr/blob/9141f500f3eb51b3a07e6bcdc62cfab92ea1cc4b/xr/rain-listening.html)
的 Web Audio 声源参数；保留绒球原作归属。不含录音素材、外部 Water Ball 源码或第三方库，
不为既有作品另授许可证。随机噪声由 xorshift32 生成，本版不称为粉红噪声。

这是实验重建：固定事件、采样率、随机种子与开始相位，分拆原共享增益，并额外施加共同安全衰减。
没有原作的画面、鼠标/雨滴交互时序和随机运行状态。它不证明原作品音频逐字节一致，
也不代表 WebXR Water Ball 与听雨的跨作品盲测。浏览器实现可能改变渲染字节，报告记录引擎；
同引擎重复可检验，不承诺跨浏览器完全一致。

## 下一步真实试听

检查通过后，由安排者按 pilot 的组 1/组 2 顺序制作匿名副本，条件映射与事件表单独保管。
每段至少休息 15 秒，固定设备舒适音量，不临时等响或改增益。真实听者记录目标材质的总数与四项评分，
允许无法判断；总数误差不等于逐事件命中/虚警。制作台和本技术报告不能代替该环节。
产物后的外部只读检查、参与者来源确认以及真人试听仍分别留在 Issue #2 跟进。
