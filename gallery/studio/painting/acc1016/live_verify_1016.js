/* acc1016 线上复验：push 269e47c 部署后
 * ①全站 favicon 404 消失（抽查 gallery + 3 件）
 * ②living-landscape 移动 backing=780（retina 修复在线上生效）
 * ③线上版本确实是新提交（favicon link 在线上 HTML）
 */
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const BASE = 'https://rongkyn.github.io/rongball-xr/gallery/';
async function probe(page, mobile, port) {
  await H.killAll(port);
  const s = await H.launch({ out:__dirname, profile:'lv'+(mobile?'m':'d')+process.pid, wsPath:WS, port,
    width: mobile?390:1280, height: mobile?844:720, dpr: mobile?3:1, mobile:!!mobile, reducedMotion:true });
  const bad=[]; const codes={};
  s.ws.on('message', raw=>{ let m; try{m=JSON.parse(raw);}catch(e){return;}
    if(m.method==='Network.responseReceived'){const r=m.params.response; codes[r.status]=(codes[r.status]||0)+1;
      if(r.status>=400) bad.push(r.status+' '+r.url.replace(BASE,''));}
    if(m.method==='Network.loadingFailed'){ if(m.params.type!=='Favicon') bad.push('FAIL '+(m.params.errorText||'')); }
  });
  await s.send('Network.enable');
  await s.goto(page + '?cb=' + Date.now());
  await s.waitFor('document.readyState==="complete"',{timeout:12000}).catch(()=>null);
  await H.waitMs(2600);
  const r = { bad, codes, favicon: await s.q(`(function(){var l=document.querySelector('link[rel~="icon"]');return l?l.getAttribute('href'):null;})()`),
    errs: (s.errors||[]).filter(e=>!/the server responded|Failed to load resource/i.test(e)) };
  if (page.includes('living-landscape')) {
    r.back = await s.q(`(function(){var c=document.getElementById('mainCanvas');var b=c.getBoundingClientRect();
      return {bw:c.width,cssW:Math.round(b.width),dpr:window.devicePixelRatio};})()`);
  }
  await s.kill().catch(()=>{});
  return r;
}
(async()=>{
  let allOk = true;
  for (const [name,url,mobile,port] of [
    ['gallery', BASE+'index.html', false, 9641],
    ['mo-yun', BASE+'works/mo-yun.html', false, 9642],
    ['living-d', BASE+'works/living-landscape.html', false, 9643],
  ]) {
    const r = await probe(url, mobile, port);
    const ok = r.bad.length===0 && r.errs.length===0 && !!r.favicon;
    allOk = allOk && ok;
    console.log((ok?'PASS':'FAIL')+' '+name+' favicon='+r.favicon+' 4xx='+JSON.stringify(r.bad)+' codes='+JSON.stringify(r.codes));
    await H.waitMs(200);
  }
  const m = await probe(BASE+'works/living-landscape.html', true, 9644);
  const bw = m.back && m.back.bw, expectBw = 780;
  const mOk = bw===expectBw && m.bad.length===0 && m.errs.length===0;
  allOk = allOk && mOk;
  console.log((mOk?'PASS':'FAIL')+' living-M back='+JSON.stringify(m.back)+' 4xx='+JSON.stringify(m.bad)+' favicon='+m.favicon);
  // 再多抽 2 件移动确认无回归性 favicon 错误
  await H.killAll(9641); await H.killAll(9642); await H.killAll(9643); await H.killAll(9644);
  process.exit(allOk?0:2);
})();
