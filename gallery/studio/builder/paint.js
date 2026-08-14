const WebSocket = require('/usr/lib/node_modules/@coze/cli/node_modules/ws');
const http = require('http');
const {spawn} = require('child_process');
const fs = require('fs');
const PORT=9222;

const OUT = process.argv[2] || '/tmp/painting.png';
const WAIT_AFTER_PLANT = parseInt(process.argv[3] || '35000');

// 构图：兰竹双清，马远边角式
// 画布1000x680, groundY≈558
const CLICKS = [
  // 主兰丛——右下，地面之上
  {x:660, y:525, si:4},
  // 细竹——右边缘，半出画外，比兰略后（y更高=更远）
  {x:870, y:490, si:0},
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

  await send(ws,'Page.navigate',{url:'http://localhost:8765/gallery/works/ink-garden.html?gallery=1&compose=1&v='+Date.now()});
  await wait(4000);

  for(const c of CLICKS) {
    await send(ws,'Runtime.evaluate',{
      expression: `window.__inkPlant(${c.x}, ${c.y}, ${c.si}); "planted"`,
      returnByValue: true
    });
    console.log('Planted si='+c.si, 'at', c.x, c.y);
    await wait(2000);
  }

  console.log('Waiting', WAIT_AFTER_PLANT, 'ms for growth...');
  await wait(WAIT_AFTER_PLANT);

  const shot = await send(ws,'Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(OUT, Buffer.from(shot.data,'base64'));
  console.log('Saved', OUT, fs.statSync(OUT).size);
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e=>{console.log('ERR',e.message);chrome.kill();process.exit(1);});
