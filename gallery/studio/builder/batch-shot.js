const WebSocket = require('/usr/lib/node_modules/@coze/cli/node_modules/ws');
const http = require('http');
const {spawn} = require('child_process');
const fs = require('fs');
const PORT=9222;

const OUT_DIR = process.argv[2] || '/tmp/moyuan-creations';
const COUNT = parseInt(process.argv[3] || '8');
const WAIT_MS = parseInt(process.argv[4] || '30000');
const GALLERY = process.argv[5] !== '0'; // default gallery mode on

if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, {recursive:true});

const chrome = spawn('google-chrome', [
  '--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars',
  '--remote-debugging-port='+PORT,'--window-size=1000,680','about:blank'
],{stdio:'ignore'});

const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(2500);
  const targets = await new Promise((res,rej)=>{
    http.get('http://localhost:'+PORT+'/json',r=>{
      let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));
    }).on('error',rej);
  });
  const t = targets.find(x=>x.type==='page');
  if(!t){console.log('no target');process.exit(1);}
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id=0; const pend={};
  ws.on('message',m=>{const msg=JSON.parse(m);if(msg.id&&pend[msg.id]){pend[msg.id](msg.result);delete pend[msg.id];}});
  const send=(method,params={})=>new Promise(res=>{const i=++id;pend[i]=res;ws.send(JSON.stringify({id:i,method,params}));});
  await new Promise(r=>ws.on('open',r));
  await send('Page.enable');

  for(let i=0;i<COUNT;i++){
    const sep = GALLERY ? '&' : '?';
    const prefix = GALLERY ? '?gallery=1' : '?';
    const url = 'http://localhost:8765/gallery/works/ink-garden.html' + prefix + '&v=' + Date.now() + '-' + i;
    console.log('Rendering', i+1, '/', COUNT, '...');
    await send('Page.navigate',{url});
    await wait(WAIT_MS);
    const shot = await send('Page.captureScreenshot',{format:'png'});
    const outPath = OUT_DIR + '/painting-' + String(i+1).padStart(2,'0') + '.png';
    fs.writeFileSync(outPath, Buffer.from(shot.data,'base64'));
    console.log('Saved', outPath, fs.statSync(outPath).size);
  }

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e=>{console.log('ERR',e.message);chrome.kill();process.exit(1);});
