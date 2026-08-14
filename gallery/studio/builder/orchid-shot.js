const WebSocket = require('/usr/lib/node_modules/@coze/cli/node_modules/ws');
const http = require('http');
const {spawn} = require('child_process');
const fs = require('fs');
const PORT=9227;
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
  await send('Page.navigate',{url:'http://localhost:8765/gallery/works/ink-garden.html?v=feibai2'+Date.now()});
  await wait(8000);
  // Click the orchid button (data-plant="4") multiple times to plant orchids
  await send('Runtime.evaluate',{expression: `
    (function(){
      // Select orchid
      var btn = document.querySelector('[data-plant="4"]');
      if(btn) btn.click();
      return 'selected';
    })();
  `});
  await wait(1000);
  // Plant orchids at several positions
  for (var i = 0; i < 4; i++) {
    await send('Runtime.evaluate',{expression: `
      (function(){
        var canvas = document.getElementById('scene');
        var rect = canvas.getBoundingClientRect();
        var x = [200, 400, 600, 800][${i}];
        var y = 500 + (${i}%2)*80;
        var evt = new MouseEvent('click', {clientX:x, clientY:y, bubbles:true});
        canvas.dispatchEvent(evt);
        return 'planted '+${i};
      })();
    `});
    await wait(2000);
  }
  await wait(5000);
  const shot=await send('Page.captureScreenshot',{format:'png'});
  const out = process.argv[2] || '/tmp/moyuan-orchid.png';
  fs.writeFileSync(out,Buffer.from(shot.data,'base64'));
  console.log('SAVED',out,fs.statSync(out).size);
  ws.close();chrome.kill();process.exit(0);
})().catch(e=>{console.log('ERR',e.message);chrome.kill();process.exit(1);});
