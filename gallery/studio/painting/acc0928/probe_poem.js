const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const READ = `(function(){
  var p=document.getElementById('poem'); var c=getComputedStyle(p);
  return {right:c.right,top:c.top,fontSize:c.fontSize};
})()`;
(async()=>{
  let port=9730;
  for(const [name,file] of [['gui-yu','gui-yu.html'],['yue-bo','yue-bo-v0916.html']]){
    const full=path.join(__dirname,'..','..','..','works',file);
    await H.killAll(port);
    const s=await H.launch({out:__dirname,profile:'poem-'+port,wsPath:WS,port,mobile:true,width:390,height:844});
    await s.goto('file://'+encodeURI(full)+'?cb='+Date.now());
    await s.waitFor('document.readyState==="complete"',{timeout:10000});
    await H.waitMs(200);
    const r=await s.q(READ);
    console.log(name, '390x844', JSON.stringify(r));
    await s.kill(); port++;
  }
  process.exit(0);
})();
