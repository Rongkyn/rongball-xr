const H=require('../../../../works/lib/cdp-harness.js');
const WS='/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE='file://'+encodeURI('/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/works/mo-yin.html');
(async()=>{
  await H.killAll(9625);
  const s=await H.launch({out:__dirname,profile:'twprobe',port:9625,wsPath:WS});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`JSON.parse(document.getElementById('state').textContent).drops>=1`);
  const t0=Date.now();
  const rows=[];
  while(true){
    const st=await s.state();
    rows.push({t:Date.now()-t0, tw:st.tw, dried:st.dried, label:await s.q(`document.getElementById('stateLabel').textContent`)});
    if(st.dried) break;
    if(Date.now()-t0>30000) break;
    await H.waitMs(400);
  }
  rows.forEach(r=>console.log('t='+String(r.t).padStart(5)+' tw='+String(r.tw).padStart(8)+' dried='+r.dried+' label='+r.label));
  await s.kill(); process.exit(0);
})().catch(e=>{console.error(e);process.exit(2);});
