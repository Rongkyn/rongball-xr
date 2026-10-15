/* acc1016 living-landscape retina 修复验证：本地 file://，移动 dpr=3 + 桌面 dpr=1 */
const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const FILE = path.resolve(__dirname, '../../../works/living-landscape.html');

async function nonBlank(s, sel) {
  return s.q(`(function(){
    var c=document.querySelector(${JSON.stringify(sel)}); var x=c.getContext('2d');
    var d=x.getImageData(0,0,c.width,c.height).data; var n=0,rs=0,gs=0,bs=0;
    for(var i=0;i<d.length;i+=4*61){ if(d[i+3]>5){n++; rs+=d[i];gs+=d[i+1];bs+=d[i+2];} }
    return n>30 ? {samples:n,r:Math.round(rs/n),g:Math.round(gs/n),b:Math.round(bs/n)} : {samples:n};
  })()`);
}

async function run(mobile, port) {
  await H.killAll(port);
  const s = await H.launch({
    out: __dirname, profile: 'vll-' + (mobile?'m':'d'), wsPath: WS, port,
    width: mobile?390:1280, height: mobile?844:720, dpr: mobile?3:1, mobile:!!mobile, reducedMotion:true,
  });
  const r = { mobile, pass:true, issues:[] };
  try {
    await s.goto('file://' + encodeURI(FILE) + '?cb=' + Date.now());
    await H.waitMs(2800);
    const m = await s.q(`(function(){var c=document.getElementById('mainCanvas');var r=c.getBoundingClientRect();
      return {bw:c.width,bh:c.height,cssW:Math.round(r.width),cssH:Math.round(r.height),
        hostW:window.innerWidth,dpr:window.devicePixelRatio};})()`);
    r.m = m;
    const expectW = Math.round(m.cssW * Math.min(m.dpr,2));
    if (Math.abs(m.bw - expectW) > 4) { r.pass=false; r.issues.push('backing='+m.bw+' 期望≈'+expectW); }
    if (m.bw === m.cssW && m.dpr > 1) { r.pass=false; r.issues.push('仍为css×1降级'); }
    const nb = await nonBlank(s, '#mainCanvas');
    r.nonBlank = nb;
    if (!nb.samples || nb.samples < 30) { r.pass=false; r.issues.push('主画面空白'); }
    const errs = (s.errors||[]).filter(e=>!/favicon|the server responded|Failed to load resource/i.test(e));
    if (errs.length) { r.pass=false; r.issues.push('ERR:'+errs.slice(0,2).join('|')); }
    // 双 canvas backing 必须一致
    const ui = await s.q(`(function(){var c=document.getElementById('uiCanvas');return c.width+'x'+c.height;})()`);
    r.uiBack = ui;
    if (ui !== m.bw+'x'+m.bh) { r.pass=false; r.issues.push('ui backing不一致 '+ui); }
  } finally { await s.kill().catch(()=>{}); }
  console.log((r.pass?'PASS':'FAIL')+' '+(mobile?'M ':'D ')+'living-landscape back='+r.m.bw+'x'+r.m.bh+
    ' css='+r.m.cssW+'x'+r.m.cssH+' dpr='+r.m.dpr+' ui='+r.uiBack+' rgb='+JSON.stringify(r.nonBlank)+
    (r.issues.length?'  ⚠ '+r.issues.join(' ; '):''));
  return r;
}
(async()=>{
  const a = await run(true, 9635);
  await H.waitMs(300);
  const b = await run(false, 9636);
  await H.killAll(9635); await H.killAll(9636);
  process.exit(a.pass && b.pass ? 0 : 2);
})();
