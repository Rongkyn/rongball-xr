// 探针：验证 gui-yu/yue-bo 竖屏手机(390x844) seal.bottom 与横屏(844x390) 实际计算值
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;
const WORKS = [['gui-yu','gui-yu.html'],['yue-bo','yue-bo-v0916.html']];

const READ = `(function(){
  var seal=document.getElementById('seal');
  var hint=document.querySelector('.hint');
  var cs=getComputedStyle(seal), ch=getComputedStyle(hint);
  return {sealBottom:cs.bottom, sealW:cs.width, sealH:cs.height, sealFs:cs.fontSize,
          hintBottom:ch.bottom,
          m480:matchMedia('(max-width:480px)').matches,
          mh430:matchMedia('(max-height:430px)').matches};
})()`;

(async()=>{
  let port=9720;
  for(const [name,file] of WORKS){
    const full=path.join(__dirname,'..','..','..','works',file);
    for(const mob of [{w:390,h:844,t:'portrait390x844'},{w:844,h:390,t:'landscape844x390'}]){
      await H.killAll(port);
      const s=await H.launch({out:OUT,profile:'probe-'+name+'-'+port,wsPath:WS,port,mobile:true,width:mob.w,height:mob.h});
      await s.goto('file://'+encodeURI(full)+'?cb='+Date.now());
      await s.waitFor('document.readyState==="complete"',{timeout:10000});
      await H.waitMs(300);
      const r=await s.q(READ);
      console.log(name, mob.t, JSON.stringify(r));
      await s.kill(); port++;
    }
  }
  process.exit(0);
})();
