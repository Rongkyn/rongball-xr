const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const ws = require('ws');

const HTML = 'file://' + __dirname + '/audio-test.html';
(async () => {
  const chrome = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=9340',
    '--window-size=1280,800',
    HTML
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 2500));
  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9340/json', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
  const page = targets.find(t => t.type === 'page');
  const client = new ws(page.webSocketDebuggerUrl);
  let msgId = 0;
  const pending = new Map();
  const errors = [];
  client.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify({desc: m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description, line: m.params.exceptionDetails.lineNumber}));
  });
  function send(method, params = {}) {
    return new Promise(resolve => {
      const id = ++msgId; pending.set(id, resolve);
      client.send(JSON.stringify({ id, method, params }));
    });
  }
  await new Promise(r => client.on('open', r));
  await send('Runtime.enable');

  async function ev(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r.result ? r.result.value : undefined;
  }

  // 页面加载后检查 RongAudio 存在
  console.log('RongAudio typeof:', await ev('typeof RongAudio'));
  console.log('BELL_PARTIALS len:', await ev('RongAudio.BELL_PARTIALS.length'));

  // 触发五声弦+五声铃
  for (let i = 0; i < 5; i++) {
    await ev(`__test.hitPluck(${i})`);
    await new Promise(r => setTimeout(r, 300));
  }
  for (let i = 0; i < 5; i++) {
    await ev(`__test.hitBell(${i})`);
    await new Promise(r => setTimeout(r, 300));
  }
  await new Promise(r => setTimeout(r, 2000));

  console.log('AC state:', await ev('__test.state()'));
  console.log('sampleRate:', await ev('RongAudio.ctx().sampleRate'));

  // 重弹（velocity>0.45 泛音分支）与自定义分音列分支
  await ev('RongAudio.pluck(110, 0.95, {pan: -0.5})');
  await ev('RongAudio.strikeBell(880, 0.9, {pan: 0.5, partials: [[1,1,2],[2.0,0.5,1]]})');
  await new Promise(r => setTimeout(r, 1000));

  const s = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('audio-test-shot.png', Buffer.from(s.data, 'base64'));
  console.log('screenshot saved');
  console.log('JS errors:', errors.length ? errors : 'none');
  client.close();
  chrome.kill();
  process.exit(0);
})();
