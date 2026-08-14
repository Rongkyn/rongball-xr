const WebSocket = require('/usr/lib/node_modules/@coze/cli/node_modules/ws');
const http = require('http');
const {spawn} = require('child_process');
const fs = require('fs');
const PORT=9222;

const OUT_DIR = process.argv[2] || '/tmp/moyuan-final';
const COUNT = parseInt(process.argv[3] || '10');
const WAIT_MS = parseInt(process.argv[4] || '28000');

if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, {recursive:true});

// v10：基于v9-08最佳构图——单兰居中偏右下，长叶交叉，大留白
// 微调位置+加入少量双株/搭配
const COMPOSITIONS = [
  // 复刻v9-08最佳构图
  [{x:730, y:590, si:4}],
  // 稍左偏一点
  [{x:680, y:600, si:4}],
  // 稍右偏一点
  [{x:780, y:580, si:4}],
  // 更低
  [{x:720, y:620, si:4}],
  // 镜像（左出）
  [{x:270, y:590, si:4}],
  // 镜像稍右
  [{x:320, y:600, si:4}],
  // 兰+细竹远衬
  [{x:720, y:590, si:4}, {x:130, y:220, si:0}],
  // 两丛小兰呼应
  [{x:730, y:600, si:4}, {x:250, y:560, si:4}],
  // 兰+枯枝
  [{x:700, y:580, si:4}, {x:80, y:50, si:5}],
  // 居中偏右
  [{x:650, y:600, si:4}],
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
    console.log('Final comp', i+1);
    await send(ws,'Page.navigate',{url});
    await wait(4000);
    for(const c of comp) {
      await send(ws,'Runtime.evaluate',{expression:`window.__inkPlant(${c.x},${c.y},${c.si});"ok"`,returnByValue:true});
      await wait(2500);
    }
    await wait(WAIT_MS);
    const shot = await send(ws,'Page.captureScreenshot',{format:'png'});
    const p = OUT_DIR+'/final-'+String(i+1).padStart(2,'0')+'.png';
    fs.writeFileSync(p, Buffer.from(shot.data,'base64'));
    console.log('  Saved', p, fs.statSync(p).size);
  }
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e=>{console.log('ERR',e.message);chrome.kill();process.exit(1);});
