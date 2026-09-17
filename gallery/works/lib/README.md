# lib/ — 绒球共享资产库

## audio-lib.js — RongAudio v1.1（v1.0 2026-08-25 沉淀 / v1.1 2026-08-27）

从「墨韵」「风铎」两件作品提取的可复用 Web Audio 资产，零依赖单文件。

### 资产
| 资产 | 来源 | API | 特征 |
|------|------|-----|------|
| KS古琴拨弦 | 墨韵 | `RongAudio.pluck(freq, vel, {pan})` | 长延音、高频阻尼快、vel>0.45自动叠加八度泛音 |
| 加法铃音 | 风铎 | `RongAudio.strikeBell(freq, vel, {pan, partials})` | 5分音非谐列（hum 0.5/tierce 1.19/2.76/5.40），分音独立衰减+微失谐 |
| 总线出声口（v1.1） | 听墨 dogfood | `RongAudio.out(pan)` → GainNode | 作品自定义声部接入同一 master 总线（压缩/混响），解决 v1.0 只暴露 ctx() 导致新声部只能旁路 destination 的缺口 |

总线：voice → master → compressor → destination；master → convolver(生成IR) → wet → destination。
初始化参数可配：`RongAudio.init({master, reverb, reverbDur, reverbDecay, wet, compressor})`。

### 路线图
- **液体/纸面声组**（落墨噗/行笔颗粒/锋线耳语/研墨刮擦）：2026-08-27 在「听墨」作品内验证通过（参数与标定曲线见 works/ting-mo-notes.md）。按 lib 惯例（第二件作品复用时才提取），暂留 ting-mo.html，待第二件液体声作品出现时提取为第三资产。

### 参考锚点（研阶段文献值，勿删）
- 金属条泛音比：1 / 2.76 / 5.40 / 8.93
- 钟类分音：hum 0.5 / prime 1.0 / tierce 1.19~1.2 / quint 1.5 / nominal 2.0

### 验证
`audio-test.html` + `audio-test.js`（CDP）：10音触发、泛音分支、自定义分音列、AC running、零JS错误（2026-08-25 通过）。注意测试需 `--autoplay-policy=no-user-gesture-required`。

### 使用约束
- 必须在用户手势回调中首次 `init()`（浏览器自动播放策略）
- 新作品直接 `<script src="lib/audio-lib.js">`（相对 works/ 目录）
