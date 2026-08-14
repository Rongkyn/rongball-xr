const WebSocket = require('/usr/lib/node_modules/@coze/cli/node_modules/ws');
const http = require('http');
const {spawn} = require('child_process');
const fs = require('fs');
const PORT=9222;

const OUT_DIR = process.argv[2] || '/tmp/moyuan-variations';
const COUNT = parseInt(process.argv[3] || '9');
const WAIT_MS = parseInt(process.argv[4] || '35000');

if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, {recursive:true});

// 9种构图方案
const COMPOSITIONS = [
  // 孤松系列——松在不同位置
  [{x:350, y:440, si:1}],
  [{x:500, y:420, si:1}],
  [{x:300, y:460, si:1}],
  // 兰竹双清系列
  [{x:700, y:500, si:4}, {x:880, y:440, si:0}],
  [{x:680, y:480, si:4}, {x:900, y:460, si:0}],
  [{x:720, y:510, si:4}],  // 只兰
  // 松竹系列
  [{x:350, y:440, si:1}, {x:700, y:500, si:0}],
  [{x:400, y:430, si:1}, {x:750, y:480, si:4}],
  // 梅——试试梅花
  [{x:300, y:460, si:3}, {x:700, y:500, si:0}],
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
    console.log('Composition', i+1, '/', COMPOSITIONS.length);
    await send(ws,'Page.navigate',{url});
    await wait(4000);

    for(const c of comp) {
      await send(ws,'Runtime.evaluate',{
        expression: `window.__inkPlant(${c.x}, ${c.y}, ${c.si}); "ok"`,
        returnByValue: true
      });
      console.log('  Planted si='+c.si, 'at', c.x, c.y);
      await wait(2000);
    }

    await wait(WAIT_MS);
    const shot = await send(ws,'Page.captureScreenshot',{format:'png'});
    const outPath = OUT_DIR + '/comp-' + String(i+1).padStart(2,'0') + '.png';
    fs.writeFileSync(outPath, Buffer.from(shot.data,'base64'));
    console.log('  Saved', outPath, fs.statSync(outPath).size);
  }

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e=>{console.log('ERR',e.message);chrome.kill();process.exit(1);});
