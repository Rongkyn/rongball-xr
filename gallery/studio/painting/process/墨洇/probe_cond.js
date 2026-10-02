const H=require('../../../../works/lib/cdp-harness.js');
const WS='/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE='file://'+encodeURI('/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/works/mo-yin.html');
const PRE=`(function(){window.__seq=[];document.addEventListener('DOMContentLoaded',function(){
var el=document.getElementById('stateLabel');function rec(){window.__seq.push(el.textContent);}rec();
new MutationObserver(rec).observe(el,{childList:true,characterData:true,subtree:true});});})();`;
(async()=>{
  await H.killAll(9661);
  const s=await H.launch({out:__dirname,profile:'probe',port:9661,wsPath:WS});
  await s.send('Page.addScriptToEvaluateOnNewDocument',{source:PRE});
  await s.goto(FILE+'?fast=1&cb='+Date.now());
  await s.waitFor(`JSON.parse(document.getElementById('state').textContent).dried===true`);
  await H.waitMs(300);
  const r=await s.q(`(function(){
    var seq=window.__seq; var uniq=[]; seq.forEach(l=>{if(uniq[uniq.length-1]!==l)uniq.push(l);});
    return {raw:seq, uniq:uniq,
      c0: uniq[0]==='洇散中…',
      incChen: uniq.includes('墨色沉定…'),
      last: uniq[uniq.length-1],
      lastOk: uniq[uniq.length-1]==='水尽墨定…',
      iChen: uniq.indexOf('墨色沉定…'),
      iHe: uniq.indexOf('水尽墨定…')};
  })()`);
  console.log(JSON.stringify(r,null,1));
  await s.kill();process.exit(0);
})().catch(e=>{console.error(e);process.exit(2);});
