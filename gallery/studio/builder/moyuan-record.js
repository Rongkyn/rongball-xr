// 墨园演示视频自动录制（CDP screencast → ffmpeg）
// 用法：先在 gallery/ 下起静态服务（python3 -m http.server 8771），
//   node studio/builder/moyuan-record.js 输出路径.mp4
// 背景：headless=new 的 Chrome 窗口不映射 Xvfb，x11grab 只能录黑屏；
//   录屏必须走 CDP Page.startScreencast，收 jpeg 帧写 image2pipe 喂 ffmpeg。
// 分镜时序与 .ass 字幕需同步修改；驱动接口=window.__inkPlant/__inkClear/__inkSetWind。
// CDP screencast 录屏：Page.startScreencast 收 jpeg 帧 → 按 pts 喂 ffmpeg
const WebSocket=require('/usr/lib/node_modules/@coze/cli/node_modules/ws');
const http=require('http');const {spawn}=require('child_process');const fs=require('fs');
const PORT=9361,W=1920,H=1080,FPS=30;
const OUT=process.argv[2]||'/tmp/cast.mp4';
const chrome=spawn('google-chrome',['--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars','--remote-debugging-port='+PORT,'--window-size='+W+','+H,'about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const t0=Date.now();const log=s=>console.log(`[${((Date.now()-t0)/1000).toFixed(1)}s] ${s}`);
(async()=>{
 await wait(2500);
 const tg=await new Promise((res,rej)=>{http.get('http://localhost:'+PORT+'/json',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej);});
 const ws=new WebSocket(tg.find(x=>x.type==='page').webSocketDebuggerUrl,{maxPayload:200*1024*1024});
 let id=0;const pend={};
 const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','pipe:0','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p',OUT],{stdio:['pipe','ignore','pipe']});
 ff.stderr.on('data',d=>{const s=d.toString();if(/error|Error/i.test(s))process.stderr.write(s.slice(-300));});
 ws.on('message',m=>{
   const msg=JSON.parse(m);
   if(msg.id&&pend[msg.id]){pend[msg.id](msg.result);delete pend[msg.id];}
   if(msg.method==='Page.screencastFrame'){
     const buf=Buffer.from(msg.params.data,'base64');
     // duplicate frame to honor pts metadata timestamp is sessionTime seconds; simpler: write each immediately
     try{ff.stdin.write(buf);}catch(e){}
     ws.send(JSON.stringify({id:++id,method:'Page.screencastFrameAck',params:{sessionId:msg.params.sessionId}}));
   }
 });
 const send=(method,params={})=>new Promise(res=>{const i=++id;pend[i]=res;ws.send(JSON.stringify({id:i,method,params}));});
 const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)log('JSERR '+String(r.exceptionDetails.exception?.description||r.exceptionDetails.text).slice(0,200));return r.result?.value;};
 await new Promise(r=>ws.on('open',r));
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://localhost:8771/works/ink-garden.html?gallery=1&run=cast'});
 await wait(4500);
 await send('Page.startScreencast',{format:'jpeg',quality:80,maxWidth:W,maxHeight:H,everyNthFrame:1});
 await ev('window.__inkClear()'); await wait(2200);
 await ev('window.__inkPlant(860,700,0)'); await wait(7000);
 await ev('window.__inkPlant(1230,815,4)'); await wait(8000);
 await ev('window.__inkPlant(470,780,3)'); await wait(7000);
 await ev('window.__inkPlant(1480,700,1)'); await wait(7000);
 await ev('window.__inkPlant(1700,840,2)'); await wait(7000);
 await ev('window.__inkSetWind({strength:0.5,gust:0.3,direction:-1})'); await wait(6000);
 await ev('window.__inkSetWind({strength:0.06,gust:0,direction:1})'); await wait(1500);
 await ev('window.__inkClear()'); await wait(2000);
 const spots=[[360,760],[600,800],[860,740],[1120,800],[1380,760],[1620,810]];
 for(let k=0;k<spots.length;k++){ await ev(`window.__inkPlant(${spots[k][0]},${spots[k][1]},${k%6})`); await wait(1300); }
 await wait(3000);
 log('closing cast');
 await send('Page.stopScreencast');
 await wait(500);
 ff.stdin.end();
 await new Promise(r=>ff.on('exit',r));
 log('ffmpeg exited');
 ws.close();chrome.kill();process.exit(0);
})().catch(e=>{console.log('ERR',e.message,e.stack?.slice(0,300));chrome.kill();process.exit(1);});
