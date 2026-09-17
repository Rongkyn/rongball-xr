/* ============================================================
 * RongAudio — 绒球共享音频资产库 v1.1
 * 提取自：墨韵 mo-yun.html（KS古琴拨弦）、风铎 feng-duo.html（加法合成铃音）
 * 零依赖，单文件，直接 <script src="audio-lib.js"> 引入
 * v1.1（2026-08-27）：新增 out(pan) 共享总线出声口——听墨 dogfood 发现
 *   v1.0 只暴露 ctx()，作品自定义声部无法接入 master 总线（压缩/混响），
 *   只能直连 destination 旁路总线。out() 返回已接好 pan→master 的 GainNode。
 *
 * 用法：
 *   // 首次用户手势时：
 *   RongAudio.init();
 *   // 拨弦（古琴）
 *   RongAudio.pluck(220, 0.8, { pan: -0.4 });
 *   // 敲铃（铜铃/风铃）
 *   RongAudio.strikeBell(440, 0.7, { pan: 0.3 });
 *
 * 总线结构：voice → master → compressor → destination
 *                  master → convolver(生成IR) → wetGain → destination
 * ============================================================ */
(function () {
  'use strict';

  let AC = null;
  let masterGain = null;
  let convolver = null;
  let wetGain = null;
  let comp = null;
  let opts = null;

  const DEFAULTS = {
    master: 0.7,        // 主增益
    reverb: true,       // 是否启用混响
    reverbDur: 2.4,     // IR 时长（秒）
    reverbDecay: 2.8,   // IR 指数衰减（越大尾越短）
    wet: 0.42,          // 混响湿声增益
    compressor: true,   // 防削波
  };

  /* 生成立体声指数衰减噪声 IR（两把刷子共用） */
  function makeIR(dur, decay) {
    const rate = AC.sampleRate, len = Math.floor(rate * dur);
    const buf = AC.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  /* 初始化。必须在用户手势回调里调用（浏览器自动播放策略）。幂等。 */
  function init(o) {
    if (AC) return AC;
    opts = Object.assign({}, DEFAULTS, o || {});
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = AC.createGain();
    masterGain.gain.value = opts.master;

    let tail = AC.destination;
    if (opts.compressor) {
      comp = AC.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      masterGain.connect(comp);
      comp.connect(tail);
    } else {
      masterGain.connect(tail);
    }

    if (opts.reverb) {
      convolver = AC.createConvolver();
      convolver.buffer = makeIR(opts.reverbDur, opts.reverbDecay);
      wetGain = AC.createGain();
      wetGain.gain.value = opts.wet;
      masterGain.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(tail);
    }
    return AC;
  }

  function ctx() { return AC; }

  /* pan: -1..1，无 StereoPanner 环境降级为直连 */
  function connectWithPan(node, pan) {
    if (pan && AC.createStereoPanner) {
      const p = AC.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      p.connect(masterGain);
    } else {
      node.connect(masterGain);
    }
  }

  /* v1.1 共享总线出声口：返回一个已连到 master 总线（含 pan）的 GainNode。
     作品自定义声部 connect 到返回值即可走同一压缩/混响链路。 */
  function out(pan) {
    if (!AC) return null;
    const g = AC.createGain();
    connectWithPan(g, pan || 0);
    return g;
  }

  /* ============================================================
   * 资产一：Karplus-Strong 古琴拨弦（源自墨韵）
   * freq: Hz；velocity: 0..1（>0.45 自动叠加八度泛音）
   * ============================================================ */
  function pluckBuffer(freq, velocity) {
    const sr = AC.sampleRate;
    // 古琴：长延音，低音更长
    const dur = Math.min(5.0, 2.0 + (150 / freq) * 2.0);
    const totalSamples = Math.floor(sr * dur);
    const buffer = AC.createBuffer(1, totalSamples, sr);
    const data = buffer.getChannelData(0);

    const N = Math.floor(sr / freq);
    const delayLine = new Float32Array(N);

    // 激励：近岳山拨弦 = 亮而微金属的触弦；三角化噪声比白噪声柔和
    const attackLen = Math.floor(N * 0.3);
    for (let i = 0; i < N; i++) {
      if (i < attackLen) {
        const u1 = Math.random(), u2 = Math.random();
        const noise = Math.cos(2 * Math.PI * u2) * Math.sqrt(-2 * Math.log(u1));
        delayLine[i] = noise * (1 - i / attackLen * 0.3);
      } else {
        delayLine[i] = (Math.random() * 2 - 1) * 0.05;
      }
    }

    // 阻尼：高频衰减快（古琴特征）
    const damping = 0.9985 - (freq / 2000) * 0.003;
    const actualDamping = Math.max(0.995, Math.min(0.9995, damping));

    let idx = 0;
    for (let i = 0; i < totalSamples; i++) {
      const next = (idx + 1) % N;
      const val = delayLine[idx];
      const filtered = 0.5 * (val + delayLine[next]) * actualDamping;
      delayLine[idx] = filtered;
      data[i] = filtered;
      idx = next;
    }

    // 包络：瞬时触弦 + 自然指数余韵
    const attackSamples = Math.floor(sr * 0.003);
    for (let i = 0; i < totalSamples; i++) {
      let env;
      if (i < attackSamples) {
        env = i / attackSamples;
      } else {
        const t = (i - attackSamples) / (totalSamples - attackSamples);
        env = Math.exp(-t * 2.8);
      }
      data[i] *= env * velocity * 0.45;
    }

    // 泛音（fan yin）：重弹时叠加八度
    if (velocity > 0.45) {
      const harmBuffer = AC.createBuffer(1, totalSamples, sr);
      const hd = harmBuffer.getChannelData(0);
      const N2 = Math.floor(sr / (freq * 2));
      const dl2 = new Float32Array(N2);
      for (let i = 0; i < N2; i++) {
        dl2[i] = (Math.random() * 2 - 1) * 0.25;
      }
      let idx2 = 0;
      for (let i = 0; i < totalSamples; i++) {
        const next2 = (idx2 + 1) % N2;
        const val2 = dl2[idx2];
        hd[i] = 0.5 * (val2 + dl2[next2]) * 0.996;
        dl2[idx2] = hd[i];
        idx2 = next2;
      }
      const harmMix = 0.06 * velocity;
      for (let i = 0; i < totalSamples; i++) {
        const t = i / totalSamples;
        data[i] += hd[i] * harmMix * Math.exp(-t * 4);
      }
    }

    return buffer;
  }

  /* 拨弦并播放。pan: -1..1 */
  function pluck(freq, velocity, o) {
    if (!AC) return null;
    const p = (o && o.pan !== undefined) ? o.pan : 0;
    const buffer = pluckBuffer(freq, velocity);
    const src = AC.createBufferSource();
    src.buffer = buffer;
    const g = AC.createGain();
    g.gain.value = 1.0;
    src.connect(g);
    connectWithPan(g, p);
    src.start();
    return src;
  }

  /* ============================================================
   * 资产二：加法合成非谐泛音铃音（源自风铎）
   * 分音列比率锚点：金属条泛音 1/2.76/5.40/8.93；钟类 hum 0.5 / tierce 1.19
   * freq: Hz（基音 prime）；vel: 0..1；o.partials 可换自定义分音列
   * ============================================================ */
  const BELL_PARTIALS = [
    /* [比率, 相对幅度, 衰减秒] */
    [0.50, 0.30, 6.5],   // hum：温暖长尾巴
    [1.00, 1.00, 4.2],   // prime：主体
    [1.19, 0.28, 3.0],   // tierce：钟味
    [2.76, 0.38, 1.3],   // 敲击亮感
    [5.40, 0.16, 0.55],  // 高频瞬态
  ];

  function strikeBell(freq, vel, o) {
    if (!AC) return;
    const partials = (o && o.partials) || BELL_PARTIALS;
    const pan = (o && o.pan !== undefined) ? o.pan : 0;
    const t0 = AC.currentTime;
    const amp = Math.min(0.16 + vel * 0.55, 0.85);

    let out = masterGain;
    if (AC.createStereoPanner) {
      const p = AC.createStereoPanner();
      p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
      p.connect(masterGain);
      out = p;
    }

    for (let i = 0; i < partials.length; i++) {
      const ratio = partials[i][0], pa = partials[i][1], dec = partials[i][2];
      const osc = AC.createOscillator();
      osc.type = 'sine';
      // 分音随机微失谐 ±0.2% 增加真实感
      osc.frequency.value = freq * ratio * (1 + (Math.random() - 0.5) * 0.004);
      const g = AC.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(amp * pa, t0 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dec * (0.7 + vel * 0.6));
      osc.connect(g);
      g.connect(out);
      osc.start(t0);
      osc.stop(t0 + dec * 2 + 0.1);
    }
  }

  window.RongAudio = {
    init: init,
    ctx: ctx,
    out: out,
    pluck: pluck,
    pluckBuffer: pluckBuffer,
    strikeBell: strikeBell,
    BELL_PARTIALS: BELL_PARTIALS,
  };
})();
