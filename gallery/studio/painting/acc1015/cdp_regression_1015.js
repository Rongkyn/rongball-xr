/**
 * acc1015 · noise-lib 提取的真机 CDP 回归（HTTP 临时页方案）
 *
 * 在 gallery/works/.reg1015/ 下临时生成 4 个变体页（测完即删，不进 git）：
 *   md_base / md_new   山居 HEAD 基线（原内联 Noise） / 工作区新版（引 lib，gradMask:false）
 *   ll_base / ll_new   山水间 HEAD 基线（原内联误名 SimplexNoise） / 工作区新版（引 lib，默认掩码）
 * 山水间两页均在首个脚本前注入同一固定 PRNG（addScriptToEvaluateOnNewDocument 等价），
 * 使洗牌与后续粒子/云雾随机态完全一致，唯一变量=噪声实现。
 * 山居 seed=42 本身确定性，无需注入。
 *
 * 判定：同视口同时刻截图逐像素必须 0 差异；另对两个新版做 file:// 真实路径冒烟（切季/镜头无报错）。
 */
const { spawn, execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const WebSocket = require('/usr/local/lib/node_modules/coze-coding-dev-sdk/node_modules/ws');

const REPO = path.resolve(__dirname, '../../../..');
const WORKS = path.join(REPO, 'gallery/works');
const TMP = path.join(WORKS, '.reg1015');
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const CHROME = '/opt/google/chrome/chrome';
const PORT_HTTP = 8943;
const PORT_CDP = 9315;
const W = 1080, H = 675;
const SETTLE = 4200;

const log = (...a) => console.log('[reg1015]', ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const gitShow = (spec) => new Promise((res, rej) =>
  execFile('git', ['show', spec], { cwd: REPO, maxBuffer: 64 << 20 }, (e, out) => e ? rej(e) : res(out)));

// 确定性垫片（4 页统一注入，插在页面第一个 <script> 前）：
//  1) 固定 mulberry32 PRNG（山水间洗牌/粒子；山居纸张纤维/粒子）
//  2) 虚拟时钟：performance.now / Date.now 返回虚拟毫秒，setTimeout/setInterval 入队随帧推进
//  3) 手动 rAF：页面调用 requestAnimationFrame 只入队；window.__step(n) 推进 n 帧
//     —— 基线与新版在完全相同的虚拟时刻、帧号、随机序列下截图，唯一变量=噪声实现
const STEP_MS = 1000 / 60;
const DET_TAG = `<script>
(function(){
  var s = 20261015>>>0;
  Math.random = function(){
    s|=0; s=(s+0x6D2B79F5)|0;
    var t=Math.imul(s^(s>>>15),1|s);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
  var vt = 0;
  try { Object.defineProperty(performance, 'now', { value: function(){ return vt; }, writable: true, configurable: true }); } catch(e) {}
  try { Date.now = function(){ return vt; }; } catch(e) {}
  var rafs = [], rafId = 1;
  window.requestAnimationFrame = function(cb){ rafs.push({id: rafId, cb: cb}); return rafId++; };
  window.cancelAnimationFrame = function(id){ rafs = rafs.filter(function(f){ return f.id !== id; }); };
  var timers = [], timerId = 1;
  window.setTimeout = function(fn, ms){ timers.push({at: vt + Math.max(0, ms|0), fn: fn, id: timerId++, rep: 0}); return timerId - 1; };
  window.clearTimeout = function(id){ timers = timers.filter(function(t){ return t.id !== id; }); };
  window.setInterval = function(fn, ms){ timers.push({at: vt + Math.max(0, ms|0), fn: fn, id: timerId++, rep: Math.max(1, ms|0)}); return timerId - 1; };
  window.clearInterval = window.clearTimeout;
  window.__step = function(n){
    for (var k = 0; k < n; k++) {
      vt += ${STEP_MS};
      var due = timers.filter(function(t){ return t.at <= vt; });
      timers = timers.filter(function(t){ return t.at > vt; });
      due.forEach(function(t){ if (t.rep) { t.at = vt + t.rep; timers.push(t); } try { t.fn(); } catch(e) {} });
      var cur = rafs; rafs = [];
      cur.forEach(function(f){ try { f.cb(vt); } catch(e) {} });
    }
    return { vt: vt, raf: rafs.length, timers: timers.length };
  };
})();
</script>`;
function injectDet(html) {
  const i = html.search(/<script[\s>]/);
  if (i < 0) throw new Error('no script tag');
  return html.slice(0, i) + DET_TAG + html.slice(i);
}

// ---- 生成四个临时页 ----
function buildPages(mdHead, llHead, mdNew, llNew) {
  // 4 页统一注入确定性垫片（基线/新版同帧同随机序列，唯一变量=噪声实现）
  fs.writeFileSync(path.join(TMP, 'md_base.html'), injectDet(mdHead));
  fs.writeFileSync(path.join(TMP, 'll_base.html'), injectDet(llHead));
  // 新版放在 works/.reg1015/ 下，lib 相对路径改为 ../lib/noise-lib.js
  fs.writeFileSync(path.join(TMP, 'md_new.html'), injectDet(mdNew.replace(/src="lib\/noise-lib\.js"/, 'src="../lib/noise-lib.js"')));
  fs.writeFileSync(path.join(TMP, 'll_new.html'), injectDet(llNew.replace(/src="lib\/noise-lib\.js"/, 'src="../lib/noise-lib.js"')));
}

function startHttp() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const fp = path.join(WORKS, urlPath.replace(/^\/+/, ''));
    if (!fp.startsWith(WORKS)) { res.writeHead(403); return res.end(); }
    fs.readFile(fp, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': types[path.extname(fp)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(res => srv.listen(PORT_HTTP, '127.0.0.1', () => res(srv)));
}

function startChrome() {
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp1015-'));
  return spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT_CDP}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--no-sandbox', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1',
    `--user-data-dir=${udd}`, '--about:blank'
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
}

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${PORT_CDP}/json/list`, r => {
          let b = ''; r.on('data', c => b += c); r.on('end', () => resolve(JSON.parse(b)));
        }).on('error', reject);
      });
      const page = list.find(t => t.type === 'page');
      if (page) return page;
    } catch (_) {}
    await sleep(250);
  }
  throw new Error('CDP 未就绪');
}

let msgId = 0;
function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl, { maxPayload: 256 << 20, perMessageDeflate: false });
  const pending = new Map();
  const events = [];
  ws.on('message', d => {
    const m = JSON.parse(d.toString());
    if (m.id && pending.has(m.id)) {
      const q = pending.get(m.id); pending.delete(m.id);
      m.error ? q.reject(new Error(JSON.stringify(m.error))) : q.resolve(m.result);
    } else if (m.method) events.push(m);
  });
  return new Promise(res => ws.on('open', () => res({
    send(method, params = {}) {
      const id = ++msgId;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    drain: () => events.splice(0, events.length),
    close: () => ws.close()
  })));
}

async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(data, 'base64'));
  return Buffer.from(data, 'base64');
}

// ---- PNG 解码（Chrome 8-bit RGB/RGBA）----
function parsePng(buf) {
  let p = 8, width = 0, height = 0, bd = 0, ct = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'IHDR') { width = buf.readUInt32BE(p + 8); height = buf.readUInt32BE(p + 12); bd = buf[p + 16]; ct = buf[p + 17]; }
    else if (type === 'IDAT') idat.push(buf.slice(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : 0;
  if (bd !== 8 || !ch) throw new Error('unsupported png');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * ch, out = Buffer.alloc(height * stride);
  const prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  let rp = 0;
  const paeth = (a, b, c) => { const pp = a + b - c, x = Math.abs(pp - a), y = Math.abs(pp - b), z = Math.abs(pp - c); return x <= y && x <= z ? a : y <= z ? b : c; };
  for (let y = 0; y < height; y++) {
    const f = raw[rp++];
    raw.copy(cur, 0, rp, rp + stride); rp += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      if (f === 1) cur[i] = (cur[i] + a) & 255;
      else if (f === 2) cur[i] = (cur[i] + b) & 255;
      else if (f === 3) cur[i] = (cur[i] + ((a + b) >> 1)) & 255;
      else if (f === 4) cur[i] = (cur[i] + paeth(a, b, c)) & 255;
    }
    cur.copy(out, y * stride); cur.copy(prev);
  }
  return { width, height, data: out };
}

function diffPixels(b1, b2, label) {
  const a = parsePng(b1), b = parsePng(b2);
  if (a.width !== b.width || a.height !== b.height) return { label, ok: false, reason: '尺寸不同' };
  let diff = 0, maxAbs = 0, sum = 0;
  for (let i = 0; i < a.data.length; i++) {
    const d = Math.abs(a.data[i] - b.data[i]);
    if (d) { diff++; if (d > maxAbs) maxAbs = d; sum += d; }
  }
  const r = { label, ok: diff === 0, diffBytes: diff, diffPct: (diff / a.data.length * 100).toFixed(4) + '%',
    maxAbs, meanOnDiff: diff ? +(sum / diff).toFixed(2) : 0 };
  log(JSON.stringify(r));
  return r;
}

function collectFatal(evs) {
  const out = [];
  for (const e of evs) {
    if (e.method === 'Runtime.exceptionThrown') {
      const d = e.params.exceptionDetails;
      out.push((d.exception && d.exception.description) || d.text);
    } else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
      const t = e.params.entry.text || '';
      if (/favicon|Failed to load resource/i.test(t)) continue; // 良性：无 favicon
      out.push(t);
    }
  }
  return out;
}

(async () => {
  const results = [];
  let srv, chrome, cdp;
  try {
    const [mdHead, llHead] = await Promise.all([
      gitShow('HEAD:gallery/works/mountain-dwelling.html'),
      gitShow('HEAD:gallery/works/living-landscape.html')
    ]);
    const mdNew = fs.readFileSync(path.join(WORKS, 'mountain-dwelling.html'), 'utf8');
    const llNew = fs.readFileSync(path.join(WORKS, 'living-landscape.html'), 'utf8');
    buildPages(mdHead, llHead, mdNew, llNew);
    srv = await startHttp();
    chrome = startChrome();
    const target = await getTarget();
    cdp = await cdpConnect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

    const url = (p) => `http://127.0.0.1:${PORT_HTTP}/.reg1015/${p}`;
    const FRAMES = 90; // 1.5s 虚拟时间：山居 setTimeout(300) 预置元素在第19帧触发
    const open = async (p) => {
      await cdp.send('Page.navigate', { url: url(p) });
      await sleep(1200); // 等解析+外部 lib 拉取（本地 HTTP）
      const r = await cdp.send('Runtime.evaluate', {
        expression: `JSON.stringify(window.__step(${FRAMES}))`, returnByValue: true });
      await sleep(150);
      return r.result.value;
    };

    // A 山居：确定性，基线 vs 新版
    cdp.drain(); await open('md_base.html'); const mdBase = await shot(cdp, 'md_base');
    const eA1 = collectFatal(cdp.drain());
    await open('md_new.html'); const mdNewPng = await shot(cdp, 'md_new');
    const eA2 = collectFatal(cdp.drain());
    const ra = diffPixels(mdBase, mdNewPng, '山居 seed=42 · HEAD基线 vs lib新版');
    ra.ok = ra.ok && !eA1.length && !eA2.length;
    if (eA1.length || eA2.length) ra.errors = [...eA1, ...eA2].slice(0, 5);
    results.push(ra);

    // B 山水间：固定 PRNG，基线 vs 新版
    cdp.drain(); await open('ll_base.html'); const llBase = await shot(cdp, 'll_base');
    const eB1 = collectFatal(cdp.drain());
    await open('ll_new.html'); const llNewPng = await shot(cdp, 'll_new');
    const eB2 = collectFatal(cdp.drain());
    const rb = diffPixels(llBase, llNewPng, '山水间 固定PRNG · HEAD基线 vs lib新版');
    rb.ok = rb.ok && !eB1.length && !eB2.length;
    if (eB1.length || eB2.length) rb.errors = [...eB1, ...eB2].slice(0, 5);
    results.push(rb);

    // C 新版真实文件 file:// 冒烟
    const fileUrl = (rel) => 'file://' + path.join(WORKS, rel).split(path.sep).map(encodeURIComponent).join('/');
    cdp.drain();
    await cdp.send('Page.navigate', { url: fileUrl('living-landscape.html') });
    await sleep(2600);
    const pLl = collectFatal(cdp.drain());
    const probeLl = await cdp.send('Runtime.evaluate', {
      expression: 'JSON.stringify({ctor:noise.constructor.name,gradMask:noise._gradMask,lib:typeof PerlinNoise})', returnByValue: true });
    await cdp.send('Runtime.evaluate', { expression: 'switchSeason(3)' }).catch(() => {});
    await sleep(2600); await shot(cdp, 'll_smoke_winter');
    const pLl2 = collectFatal(cdp.drain());
    log('山水间冒烟:', probeLl.result.value);
    results.push({ label: '山水间 file:// 冒烟（加载+切冬）', ok: !pLl.length && !pLl2.length, probe: probeLl.result.value, errors: [...pLl, ...pLl2].slice(0, 5) });

    cdp.drain();
    await cdp.send('Page.navigate', { url: fileUrl('mountain-dwelling.html') });
    await sleep(2600);
    const pMd = collectFatal(cdp.drain());
    const probeMd = await cdp.send('Runtime.evaluate', {
      expression: 'JSON.stringify({ctor:noise.constructor.name,gradMask:noise._gradMask,lib:typeof PerlinNoise})', returnByValue: true });
    await cdp.send('Runtime.evaluate', { expression: 'switchSeason(3)' }).catch(() => {});
    await cdp.send('Runtime.evaluate', { expression: 'setView(2)' }).catch(() => {});
    await sleep(2600); await shot(cdp, 'md_smoke_winter_far');
    const pMd2 = collectFatal(cdp.drain());
    log('山居冒烟:', probeMd.result.value);
    results.push({ label: '山居 file:// 冒烟（加载+切冬+远景）', ok: !pMd.length && !pMd2.length, probe: probeMd.result.value, errors: [...pMd, ...pMd2].slice(0, 5) });

  } finally {
    cdp && cdp.close();
    chrome && chrome.kill('SIGKILL');
    srv && srv.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  }

  console.log('\n==== 回归汇总 ====');
  for (const r of results) {
    console.log((r.ok ? 'PASS' : 'FAIL') + ' · ' + r.label +
      (r.diffBytes !== undefined ? ` · diff=${r.diffBytes}(${r.diffPct}) maxAbs=${r.maxAbs}` : '') +
      (r.probe ? ' · ' + r.probe : '') +
      (r.errors && r.errors.length ? ' · errors=' + JSON.stringify(r.errors) : '') +
      (r.reason ? ' · ' + r.reason : ''));
  }
  const failed = results.filter(r => !r.ok);
  console.log(failed.length ? '\nREGRESSION FAILED' : '\nALL GREEN');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
