// Experimental reconstruction of this repository's rain-listening synthesis.
// No external samples, libraries, network requests, or changes to the artwork.
export const CONFIG = Object.freeze({
  version: 1, sampleRate: 48000, seconds: 10, noiseSeed: 78123,
  eventSeed: 19481, noiseLoopSeconds: 4, master: 0.5, safetyGain: 0.5,
  bedB: 10 ** (-6 / 20), lfoHz: 0.25, lfoDepth: 0.08, lfoPhase: 0,
  source: '9141f500f3eb51b3a07e6bcdc62cfab92ea1cc4b',
  protocol: '6b16b92aa7122904ec476824c9713115735150d7',
});
export const MATERIALS = ['bamboo', 'stone', 'water'];
const VOLUME = {bamboo: 0.7, stone: 0.5, water: 0.6, distant: 0.4};
const TIMES = {T1: [0.7, 1.8, 3.0, 4.1, 5.3, 6.5, 7.6, 8.8],
  T2: [0.9, 2.0, 2.8, 4.4, 5.6, 6.3, 7.9, 8.6]};

export function rng(seed) {
  let s = seed >>> 0;
  if (!s) throw new Error('Seed must be nonzero');
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
export function eventTable(table, material) {
  if (!TIMES[table] || !MATERIALS.includes(material)) throw new Error('Unknown table/material');
  const random = rng(CONFIG.eventSeed + MATERIALS.indexOf(material));
  return TIMES[table].map((time, i) => ({id: `${material}-${i + 1}`, material, time,
    pan: [-0.75, 0.25, 0.75, -0.25, 0, 0.5, -0.5, 0][i],
    frequency: material === 'bamboo' ? 1100 + random() * 800 :
      material === 'stone' ? 2200 + random() * 1200 : 250 + random() * 100,
    frequency2: material === 'stone' ? 3800 + random() * 600 : null,
    endFrequency: material === 'water' ? 60 : null,
    sweepSeconds: material === 'water' ? 0.2 : null,
    amplitude: {bamboo: 0.1, stone: 0.06, water: 0.08}[material],
    endAmplitude: 0.001, decaySeconds: {bamboo: 0.06, stone: 0.12, water: 0.25}[material],
    stopSeconds: {bamboo: 0.08, stone: 0.15, water: 0.3}[material]}));
}

// All node creation/connections pass here; the exported routes describe actual calls.
class Graph {
  constructor(context) { this.context = context; this.nodes = []; this.edges = []; this.ids = new Map(); }
  add(id, type, parameters = {}) {
    const node = this.context[`create${type}`]();
    for (const [key, value] of Object.entries(parameters)) {
      if (node[key] && 'value' in Object(node[key])) node[key].value = value;
      else node[key] = value;
    }
    this.nodes.push({id, type, parameters}); this.ids.set(node, id); return node;
  }
  connect(from, to, param) {
    from.connect(param ? to[param] : to);
    this.edges.push({from: this.ids.get(from), to: this.ids.get(to) || 'destination', param: param || null});
  }
}
function context() { return new OfflineAudioContext(2, CONFIG.sampleRate * CONFIG.seconds, CONFIG.sampleRate); }
function filter(graph, id, type, frequency, q = 1) {
  return graph.add(id, 'BiquadFilter', {type, frequency, Q: q});
}
function channelGain(graph, material) {
  const gain = graph.add('channel', 'Gain', {gain: VOLUME[material]});
  graph.connect(gain, graph.context.destination);
  if (material === 'bamboo') {
    const lfo = graph.add('lfo', 'Oscillator', {type: 'sine', frequency: CONFIG.lfoHz});
    const depth = graph.add('lfo-depth', 'Gain', {gain: CONFIG.lfoDepth});
    graph.connect(lfo, depth); graph.connect(depth, gain, 'gain'); lfo.start(0);
  }
  return gain;
}
async function finish(graph) {
  const buffer = await graph.context.startRendering();
  return {samples: [buffer.getChannelData(0).slice(), buffer.getChannelData(1).slice()],
    route: {nodes: graph.nodes, edges: graph.edges}};
}
async function renderBed(material) {
  const ctx = context(), graph = new Graph(ctx), gain = channelGain(graph, material);
  const source = graph.add('noise', 'BufferSource', {loop: true});
  const noise = ctx.createBuffer(2, CONFIG.sampleRate * CONFIG.noiseLoopSeconds, CONFIG.sampleRate);
  const random = rng(CONFIG.noiseSeed);
  for (let ch = 0; ch < 2; ch++) {
    const data = noise.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
  }
  source.buffer = noise;
  let tail = source;
  const addFilter = (id, type, hz, q = 1) => {
    const node = filter(graph, id, type, hz, q); graph.connect(tail, node); tail = node;
  };
  if (material === 'bamboo') addFilter('bamboo-bp', 'bandpass', 2800, 0.7);
  if (material === 'water') addFilter('water-lp', 'lowpass', 400);
  if (material === 'distant') { addFilter('distant-hp', 'highpass', 80); addFilter('distant-lp', 'lowpass', 700); }
  if (material === 'stone') {
    addFilter('stone-hp', 'highpass', 1500);
    const scale = graph.add('stone-scale', 'Gain', {gain: 0.3}); graph.connect(tail, scale); tail = scale;
  }
  graph.connect(tail, gain); source.start(0); return finish(graph);
}
async function renderDrops(table, material) {
  const graph = new Graph(context()), gain = channelGain(graph, material);
  for (const e of eventTable(table, material)) {
    const osc = graph.add(`${e.id}-osc`, 'Oscillator', {type: material === 'stone' ? 'triangle' : 'sine', frequency: e.frequency});
    if (material === 'water') {
      osc.frequency.setValueAtTime(e.frequency, e.time);
      osc.frequency.exponentialRampToValueAtTime(e.endFrequency, e.time + e.sweepSeconds);
    }
    const env = graph.add(`${e.id}-env`, 'Gain', {gain: 0});
    env.gain.setValueAtTime(e.amplitude, e.time);
    env.gain.exponentialRampToValueAtTime(e.endAmplitude, e.time + e.decaySeconds);
    const pan = graph.add(`${e.id}-pan`, 'StereoPanner', {pan: e.pan});
    graph.connect(osc, env);
    if (material === 'water') {
      const lp = filter(graph, `${e.id}-lp`, 'lowpass', 500); graph.connect(env, lp); graph.connect(lp, pan);
    } else graph.connect(env, pan);
    graph.connect(pan, gain); osc.start(e.time); osc.stop(e.time + e.stopSeconds);
    if (material === 'stone') {
      const second = graph.add(`${e.id}-osc2`, 'Oscillator', {type: 'sine', frequency: e.frequency2});
      graph.connect(second, env); second.start(e.time); second.stop(e.time + e.stopSeconds);
    }
  }
  return finish(graph);
}
export function scaled(channels, gain) { return channels.map(ch => Float32Array.from(ch, x => x * gain)); }
export function sum(parts) {
  return [0, 1].map(ch => Float32Array.from(parts[0][ch], (_, i) => parts.reduce((s, p) => s + p[ch][i], 0)));
}
export function metrics(channels) {
  return channels.map(data => {
    let peak = 0, squares = 0, nonfinite = 0, clipped = 0;
    for (const x of data) { if (!Number.isFinite(x)) { nonfinite++; continue; }
      peak = Math.max(peak, Math.abs(x)); squares += x * x; if (Math.abs(x) >= 1) clipped++; }
    return {samplePeak: peak, rms: Math.sqrt(squares / data.length), nonfinite, samplesAtOrBeyondFullScale: clipped};
  });
}
export function maxError(a, b, factor = 1) {
  let error = 0;
  for (let ch = 0; ch < 2; ch++) for (let i = 0; i < a[ch].length; i++) error = Math.max(error, Math.abs(a[ch][i] * factor - b[ch][i]));
  return error;
}
export function wav(channels, pcm16 = false) {
  const bytes = pcm16 ? 2 : 4, length = channels[0].length;
  const out = new Uint8Array(44 + length * 2 * bytes), view = new DataView(out.buffer);
  const text = (at, str) => [...str].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, out.length - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, pcm16 ? 1 : 3, true); view.setUint16(22, 2, true);
  view.setUint32(24, CONFIG.sampleRate, true); view.setUint32(28, CONFIG.sampleRate * 2 * bytes, true);
  view.setUint16(32, 2 * bytes, true); view.setUint16(34, bytes * 8, true); text(36, 'data');
  view.setUint32(40, out.length - 44, true);
  for (let i = 0; i < length; i++) for (let ch = 0; ch < 2; ch++) {
    const x = channels[ch][i], at = 44 + (i * 2 + ch) * bytes;
    if (!Number.isFinite(x) || Math.abs(x) >= 1) throw new Error('Nonfinite or full-scale sample: export rejected');
    if (pcm16) view.setInt16(at, Math.min(32767, Math.round(x * 32768)), true); else view.setFloat32(at, x, true);
  }
  return out;
}
export function decodeWav(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), pcm16 = view.getUint16(20, true) === 1;
  const width = pcm16 ? 2 : 4, frames = (bytes.length - 44) / (2 * width);
  return [0, 1].map(ch => Float32Array.from({length: frames}, (_, i) => pcm16 ?
    view.getInt16(44 + (i * 2 + ch) * width, true) / 32768 : view.getFloat32(44 + (i * 2 + ch) * width, true)));
}
async function hash(bytes) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join(''); }

export async function renderSuite(progress = () => {}) {
  const files = new Map(), report = {config: CONFIG, engine: navigator.userAgent, files: {}, checks: [], routes: {}, events: {},
    limitations: ['Synthetic experimental reconstruction, not original interactive playback.', 'No listening or true-peak measurement.',
      'Exact repeatability only checked within the recorded engine; cross-browser equality is not claimed.',
      'All beds remain present; each trial contains drops of one target material only. No reverb/limiter/normalization.'],
    mixing: {A: '(sum(bed stems) + target drops) * master * safetyGain', B: '(sum(bed stems) * bedB + target drops) * master * safetyGain',
      precision: 'float32 stems, float32 sums; final PCM16; gains fixed before rendering, no per-condition normalization'}};
  const save = async (name, samples, pcm16 = false) => {
    const bytes = wav(samples, pcm16), decoded = decodeWav(bytes);
    files.set(name, bytes); report.files[name] = {sha256: await hash(bytes), bytes: bytes.length,
      encoding: pcm16 ? 'PCM16' : 'IEEE_FLOAT32', channels: metrics(decoded)}; return decoded;
  };
  const beds = [];
  for (const material of [...MATERIALS, 'distant']) {
    progress(`底床 ${material}`); const result = await renderBed(material); beds.push(result.samples);
    report.routes[`bed-${material}`] = result.route;
    for (const [condition, factor] of [['A', 1], ['B', CONFIG.bedB]]) await save(`bed-${material}-${condition}.wav`, scaled(result.samples, factor));
  }
  const allBeds = sum(beds);
  for (const material of MATERIALS) for (const table of ['T1', 'T2']) {
    progress(`${material} ${table}`); const drop = await renderDrops(table, material);
    const repeated = await renderDrops(table, material);
    report.events[`${material}-${table}`] = eventTable(table, material);
    report.routes[`drops-${material}-${table}`] = drop.route;
    const exported = {};
    for (const [condition, factor] of [['A', 1], ['B', CONFIG.bedB]]) {
      const prefix = `${material}-${table}-${condition}`;
      exported[`${condition}drop`] = await save(`${prefix}-drops.wav`, drop.samples);
      exported[`${condition}bed`] = await save(`${prefix}-bed.wav`, scaled(allBeds, factor));
      const mixed = scaled(sum([scaled(allBeds, factor), drop.samples]), CONFIG.master * CONFIG.safetyGain);
      const decoded = await save(`${prefix}-mix.wav`, mixed, true);
      report.checks.push({name: `${prefix}-PCM16-error`, error: maxError(mixed, decoded), tolerance: 1 / 32768});
    }
    report.checks.push({name: `${material}-${table}-repeat-drops`, error: maxError(drop.samples, repeated.samples), tolerance: 0},
      {name: `${material}-${table}-exported-drops-identical`, error: maxError(exported.Adrop, exported.Bdrop), tolerance: 0},
      {name: `${material}-${table}-exported-bed-ratio`, error: maxError(exported.Abed, exported.Bbed, CONFIG.bedB), tolerance: 1e-7});
  }
  // A second full render of each bed exercises the RNG, buffer and LFO reset.
  for (let i = 0; i < beds.length; i++) {
    const material = [...MATERIALS, 'distant'][i], again = await renderBed(material);
    report.checks.push({name: `bed-${material}-repeat`, error: maxError(beds[i], again.samples), tolerance: 0});
  }
  report.pass = report.checks.every(x => Number.isFinite(x.error) && x.error <= x.tolerance) &&
    Object.values(report.files).every(f => f.channels.every(c => !c.nonfinite && !c.samplesAtOrBeyondFullScale && c.rms > 1e-9));
  if (!report.pass) throw new Error('Render invariant failed');
  return {files, report};
}
