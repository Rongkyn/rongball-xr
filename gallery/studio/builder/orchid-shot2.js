const WebSocket = require('/usr/lib/node_modules/@coze/cli/node_modules/ws');
const http = require('http');
const {spawn} = require('child_process');
const fs = require('fs');
const PORT=9228;
const W=1200, H=800;
const chrome = spawn('google-chrome', ['--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars','--remote-debugging-port='+PORT,'--window-size='+W+','+H,'about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(2500);
  const targets = await new Promise((res,rej)=>{http.get('http://localhost:'+PORT+'/json',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej);});
  const t = targets.find(x=>x.type==='page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id=0; const pend={};
  ws.on('message',m=>{const msg=JSON.parse(m);if(msg.id&&pend[msg.id]){pend[msg.id](msg.result);delete pend[msg.id];}});
  const send=(method,params={})=>new Promise(res=>{const i=++id;pend[i]=res;ws.send(JSON.stringify({id:i,method,params}));});
  await new Promise(r=>ws.on('open',r));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:2,mobile:false});
  await send('Page.navigate',{url:'http://localhost:8765/gallery/works/ink-garden.html?v=orchid'+Date.now()});
  await wait(6000);
  // Clear existing plants and plant orchids
  await send('Runtime.evaluate',{expression: `
    (function(){
      plants.length = 0;
      selectedSpecies = 4; // orchid
      // Update UI
      document.querySelectorAll('.pbtn').forEach(b=>b.classList.remove('active'));
      var ob = document.querySelector('[data-plant="4"]');
      if(ob) ob.classList.add('active');
      return 'cleared';
    })();
  `});
  await wait(500);
  // Plant orchids at various positions
  const positions = [[200,550],[450,500],[700,550],[900,480],[350,600]];
  for (const [x,y] of positions) {
    await send('Runtime.evaluate',{expression: `plantAt(${x}, ${y}); 'planted';`});
    await wait(3000);
  }
  await wait(8000);
  const shot=await send('Page.captureScreenshot',{format:'png'});
  const out = process.argv[2] || '/tmp/orchid-test.png';
  fs.writeFileSync(out,Buffer.from(shot.data,'base64'));
  console.log('SAVED',out,fs.statSync(out).size);
  ws.close();chrome.kill();process.exit(0);
})().catch(e=>{console.log('ERR',e.message);chrome.kill();process.exit(1);});
