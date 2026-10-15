/**
 * acc1016 · P13 线上 Pages 审计 — HTTP 层资源可达性扫描
 * 基线：历史所有验收走 file://，线上 HTTPS 首次系统审计
 * 覆盖：21 正式作品 + 4 lib + gallery/root index；静态资源 404/重定向链
 */
const https = require('https');

const BASE = 'https://rongkyn.github.io/rongball-xr/';
const WORKS = [
  'ink-particles','living-landscape','ink-2048','ink-gomoku','ink-sound',
  'mountain-dwelling','ink-garden','feng-duo','floss-threads','mo-yun',
  'mo-yin','ting-mo','ta-xue','tian-deng','hou','tai-hen','can-he',
  'lu-hua','qiu-chong-v0915','yue-bo-v0916','gui-yu'
];
const LIBS = [
  'gallery/works/lib/audio-lib.js','gallery/works/lib/noise-lib.js',
  'gallery/works/lib/resize-debounce.js','gallery/works/lib/ui-floating-stack.css',
  'gallery/works/lib/cdp-harness.js','gallery/works/lib/canvas-backing.js'
];
const PAGES = ['', 'gallery/index.html', 'index.html'];

function head(url, method='GET') {
  return new Promise(res => {
    const req = https.request(url, { method, headers: {'User-Agent':'acc1016'} }, r => {
      r.destroy();
      res({ status: r.statusCode, ctype: r.headers['content-type']||'', len: r.headers['content-length']||null });
    });
    req.on('error', e => res({ status: 'ERR:'+e.code }));
    req.setTimeout(15000, () => { req.destroy(); res({status:'TIMEOUT'}); });
    req.end();
  });
}

(async () => {
  const rows = [];
  for (const w of WORKS) {
    const p = BASE + 'gallery/works/' + w + '.html';
    const r = await head(p);
    rows.push({ kind: 'work', name: w, ...r, ok: r.status === 200 });
  }
  for (const l of LIBS) {
    const r = await head(BASE + l);
    rows.push({ kind: 'lib', name: l.split('/').pop(), ...r, ok: r.status === 200 });
  }
  for (const p of PAGES) {
    const r = await head(BASE + p);
    rows.push({ kind: 'page', name: p || '(root)', ...r, ok: r.status === 200 });
  }
  let fails = 0;
  for (const r of rows) {
    const tag = r.ok ? 'OK ' : 'FAIL';
    if (!r.ok) fails++;
    console.log(`${tag} ${r.status} ${r.kind.padEnd(5)} ${r.name.padEnd(22)} ${r.ctype.split(';')[0]}`);
  }
  console.log(`\n${rows.length - fails}/${rows.length} reachable, fails=${fails}`);
  require('fs').writeFileSync(__dirname + '/http_scan_result.json', JSON.stringify(rows, null, 2));
})();
