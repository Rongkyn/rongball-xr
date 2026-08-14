const WebSocket = require('/usr/lib/node_modules/@coze/cli/node_modules/ws');
const http = require('http');
const {spawn} = require('child_process');
const fs = require('fs');
const PORT=9222;

const OUT_DIR = process.argv[2] || '/tmp/moyuan-orchids';
const COUNT = parseInt(process.argv[3] || '8');
const WAIT_MS = parseInt(process.argv[4] || '30000');

if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, {recursive:true});

// v8: 折枝兰——叶基在画面中下部偏侧，长叶大弧横扫画面
// 画布1000x680
const COMPOSITIONS = [
  // 1. 右下偏中，主叶向左上大弧
  [{x:750, y:580, si:4}],
  // 2. 左下偏中，主叶向右上大弧
  [{x:250, y:580, si:4}],
  // 3. 右中——经典
  [{x:700, y:600, si:4}],
  // 4. 左中
  [{x:300, y:600, si:4}],
  // 5. 兰+远竹
  [{x:700, y:580, si:4}, {x:150, y:240, si:0}],
  // 6. 两丛兰——主大辅小
  [{x:720, y:580, si:4}, {x:250, y:560, si:4}],
  // 7. 兰+枯枝
  [{x:680, y:580, si:4}, {x:100, y:60, si:5}],
  // 8. 单兰——居右下偏中
  [{x:730, y:590, si:4}],
];

const chrome = spawn('google-chrome', [
  '--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars',
  '--remote-debugging-port='+PORT,'--window-size=1000,680','about:blank'
],{stdio:'ignore'});

const wait=ms=>new Promise(r=>setTimeout(r,ms));
let _id=0;
function send(ws,method,params={}){return new Promise(resolve=>{const id=++_id;const h=m=>{const msg=JSON.parse(m);if(msg.id===id){ws.off('message',h);resolve(msg.result);}};ws.on('message',h);ws.send(JSON.stringify({id,method,params}));});}

(async()=>{
  await wait(2500);
  const targets = await new Promise((res,rej)=>{http.get('http://localhost:'+PORT+'/json',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej);});
  const t = targets.find(x=>x.type==='page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r=>ws.on('open',r));
  await send(ws,'Page.enable');
  await send(ws,'Runtime.enable');

  for(let i=0; i<COMPOSITIONS.length && i<COUNT; i++){
    const comp = COMPOSITIONS[i];
    const url = 'http://localhost:8765/gallery/works/ink-garden.html?gallery=1&compose=1&v='+Date.now()+'-'+i;
    console.log('Orchid comp', i+1);
    await send(ws,'Page.navigate',{url});
    await wait(4000);
    for(const c of comp) {
      await send(ws,'Runtime.evaluate',{expression:`window.__inkPlant(${c.x},${c.y},${c.si});"ok"`,returnByValue:true});
      console.log('  Planted', c.si, c.x, c.y);
      await wait(2500);
    }
    await wait(WAIT_MS);
    const shot = await send(ws,'Page.captureScreenshot',{format:'png'});
    const p = OUT_DIR+'/orchid-'+String(i+1).padStart(2,'0')+'.png';
    fs.writeFileSync(p, Buffer.from(shot.data,'base64'));
    console.log('  Saved', p, fs.statSync(p).size);
  }
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e=>{console.log('ERR',e.message);chrome.kill();process.exit(1);});
