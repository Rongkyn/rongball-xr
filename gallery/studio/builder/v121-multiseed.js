const WebSocket = require('/usr/lib/node_modules/@coze/cli/node_modules/ws');
const http = require('http');
const {spawn} = require('child_process');
const fs = require('fs');
const PORT=9222;
const chrome = spawn('google-chrome', ['--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars','--remote-debugging-port='+PORT,'--window-size=1000,680','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const seeds = [42, 7, 123, 2024];
(async()=>{
  await wait(2500);
  const targets = await new Promise((res,rej)=>{http.get('http://localhost:'+PORT+'/json',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej);});
  const t = targets.find(x=>x.type==='page');
  if(!t){console.log('no target');process.exit(1);}
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id=0; const pend={};
  ws.on('message',m=>{const msg=JSON.parse(m);if(msg.id&&pend[msg.id]){pend[msg.id](msg.result);delete pend[msg.id];}});
  const send=(method,params={})=>new Promise(res=>{const i=++id;pend[i]=res;ws.send(JSON.stringify({id:i,method,params}));});
  await new Promise(r=>ws.on('open',r));
  await send('Page.enable');
  await send('Runtime.enable');

  for (const seed of seeds) {
    await send('Page.navigate',{url:'http://localhost:8765/gallery/works/ink-garden.html?v=v121p_'+seed+'_'+Date.now()});
    await wait(3500);
    // clear then plant bamboo (si=0) center-left, orchid (si=4) bottom-left
    await send('Runtime.evaluate',{expression: `
      window.__inkClear();
      window.__inkSetWind({strength:0.15, gust:0.1, direction:0});
      var s=${seed};
      // simple seeded random
      var _s=s; function rnd(){_s=(_s*16807)%2147483647;return(_s-1)/2147483646;}
      // bamboo (si=0) at center
      window.__inkPlant(500, 520, 0, {seed:s});
      // orchid (si=4) at lower left
      window.__inkPlant(200, 600, 4, {seed:s+100});
    `});
    await wait(2500);
    const shot=await send('Page.captureScreenshot',{format:'png'});
    const outPath='/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/works/v121_polish_seed'+seed+'.png';
    fs.writeFileSync(outPath,Buffer.from(shot.data,'base64'));
    console.log('SAVED seed'+seed, fs.statSync(outPath).size);
  }
  ws.close();chrome.kill();process.exit(0);
})().catch(e=>{console.log('ERR',e.message);chrome.kill();process.exit(1);});
