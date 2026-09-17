const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
let ws;
try { ws = require('/Coze/Drive/绒球/所有对话/主对话/绒球创作时间/20260827/node_modules/ws'); }
catch(e) { execSync('npm install ws --no-save 2>/dev/null', {stdio:'inherit'}); ws = require('ws'); }

const TAG = process.argv[2] || 'v1';
const URL_Q = process.argv[3] || '';
const HTML = 'file://' + __dirname + '/ta-xue.html' + URL_Q;

(async () => {
  const chrome = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=9334',
    '--window-size=1280,900',
    HTML
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 2500));
  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9334/json', res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d)));
    }).on('error', reject);
  });
  const page = targets.find(t=>t.type==='page');
  if(!page){ console.log('no page'); process.exit(1); }
  console.log('connected:', page.url);

  const client = new ws(page.webSocketDebuggerUrl);
  let msgId=0; const pending=new Map(); const errors=[];
  client.on('message', d=>{
    const m=JSON.parse(d);
    if(m.id && pending.has(m.id)){ pending.get(m.id)(m.result); pending.delete(m.id); }
    if(m.method==='Runtime.exceptionThrown') errors.push(JSON.stringify({text:m.params.exceptionDetails.text, desc:m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description, line:m.params.exceptionDetails.lineNumber}));
    if(m.method==='Runtime.consoleAPICalled' && m.params.type==='error') errors.push('console.error: '+JSON.stringify(m.params.args));
  });
  const send=(method,params={})=>new Promise(res=>{const id=++msgId;pending.set(id,res);client.send(JSON.stringify({id,method,params}));});
  await new Promise(r=>client.on('open',r));
  await send('Runtime.enable'); await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Page.navigate',{url:HTML + (URL_Q?'&':'?') + 'cb=' + Date.now()});
  await new Promise(r=>setTimeout(r,1500));

  const shot = async name=>{
    const r = await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(__dirname+'/'+name, Buffer.from(r.data,'base64'));
    console.log('saved', name);
  };
  const stats = async()=>{
    const r = await send('Runtime.evaluate',{expression:'JSON.stringify(window.__stats())',returnByValue:true});
    console.log('stats:', r.result.value);
  };

  await new Promise(r=>setTimeout(r,2000));
  await shot(TAG+'_02s.png');
  await stats();

  // 快进到积雪：fast 模式下等 15s
  await new Promise(r=>setTimeout(r,15000));
  await shot(TAG+'_17s.png');
  await stats();

  // 点开所有花苞
  await send('Runtime.evaluate',{expression:'window.__buds.forEach((b,i)=>window.__bloom(i))'});
  await new Promise(r=>setTimeout(r,2000));
  await shot(TAG+'_bloom.png');
  await stats();

  console.log('errors:', errors.length ? errors.slice(0,5) : 'none');
  chrome.kill();
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
