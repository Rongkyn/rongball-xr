const path = require('path');
const H = require('../../../works/lib/cdp-harness.js');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function touchDrag(s, sel, pts, holdMs = 26) {
  const r = await s.q(`(function(){var b=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return{x:b.left,y:b.top};})()`);
  const P = pts.map(p => ({ x: Math.round(r.x + p[0]), y: Math.round(r.y + p[1]) }));
  await s.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [P[0]] });
  for (let i = 1; i < P.length; i++) {
    await sleep(holdMs);
    await s.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [P[i]] });
  }
  await sleep(holdMs);
  await s.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function probe(file, port, prof) {
  const full = path.resolve(__dirname, '../../../works/' + file);
  const s = await H.launch({ out: __dirname, profile: prof, wsPath: WS, port, mobile: true, width: 390, height: 844 });
  await s.goto('file://' + encodeURI(full) + '?cb=' + Date.now());
  await sleep(1600);
  // 帧级 arc 探针
  await s.q(`(function(){
    if(!CanvasRenderingContext2D.prototype.__w1013){
      var of=CanvasRenderingContext2D.prototype.arc;
      CanvasRenderingContext2D.prototype.arc=function(){ window.__a1013=(window.__a1013||0)+1; return of.apply(this,arguments); };
      CanvasRenderingContext2D.prototype.__w1013=true;
    }
  })()`);
  const sample = n => s.q(`new Promise(function(res){
    var frames=[]; var v0=window.__a1013||0;
    (function tick(){requestAnimationFrame(function(){
      var v=window.__a1013||0; frames.push(v); window.__a1013=0;
      if(frames.length<${n}) tick(); else res(frames);
    });})();
  })`);
  const idle = await sample(14);
  await s.q(`window.__a1013=0`);
  const g = await s.q(`(function(){var b=document.querySelector('canvas').getBoundingClientRect();return{w:b.width,h:b.height};})()`);
  const pts = [];
  for (let i = 0; i <= 12; i++) pts.push([g.w*0.2 + (g.w*0.55)*i/12, g.h*0.35 + (g.h*0.3)*i/12]);
  await touchDrag(s, 'canvas', pts, 30);
  const ges = await sample(14);
  console.log(file, 'idleAvg=', (idle.reduce((a,b)=>a+b,0)/idle.length).toFixed(1),
    'gesPeak=', Math.max.apply(null, ges), 'gesFrames=', JSON.stringify(ges.slice(0,10)));
  await H.killAll(port);
}
(async () => {
  await probe('ink-sound.html', 9341, 'probeTS1');
  await probe('ink-particles.html', 9342, 'probeTS2');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
