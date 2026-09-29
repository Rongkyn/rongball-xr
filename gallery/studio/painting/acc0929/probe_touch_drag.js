/**
 * probe_touch_drag.js — 触摸拖动行为探针（0929，移动端 390x844）
 * 在 canvas 上以 pointerType:'touch' 的真 touch 序列拖动，统计：
 *   作品侧 pointermove 真实派发数（探针挂 capture 计数）、拖动后状态字段变化
 * 用于判定 touch-action=auto 时拖动手势是否被浏览器语义影响。
 * 用法：node probe_touch_drag.js
 */
const H = require('../../../works/lib/cdp-harness.js');
const path = require('path');
const WS = '/usr/lib/node_modules/coze-coding-dev-sdk/node_modules/ws';
const OUT = __dirname;

const WORKS = [
  ['can-he', 'can-he.html', '#pond', {down:[195,420], drag:[[180,470],[170,520],[190,570],[210,600]]}, 'rain'],
  ['lu-hua', 'lu-hua.html', '#scene', {down:[195,420], drag:[[230,440],[260,460],[240,500],[200,520]]}, 'gusts'],
  ['gui-yu', 'gui-yu.html', '#scene', {down:[195,300], drag:[[210,360],[170,420],[200,480],[220,520]]}, 'shake'],
  ['yue-bo', 'yue-bo-v0916.html', '#scene', {down:[195,300], drag:[[210,340],[170,380],[200,420],[220,460]]}, 'nRipple'],
  ['qiu-chong', 'qiu-chong-v0915.html', '#scene', {down:[195,500], drag:[[180,540],[170,580],[190,620],[210,650]]}, 'trials'],
];

(async () => {
  let port = 9851;
  for (const [name, file, sel, pathPts, metric] of WORKS) {
    await H.killAll(port);
    const s = await H.launch({ out: OUT, profile: 'p29drag-' + name, wsPath: WS, port,
                               mobile: true, width: 390, height: 844 });
    const full = path.join(__dirname, '..', '..', '..', 'works', file);
    await s.goto('file://' + encodeURI(full) + '?fast=1&cb=' + Date.now());
    await s.waitFor('document.readyState==="complete"', { timeout: 12000 });
    await H.waitMs(400);

    // capture 阶段装 pointer 事件计数器，直接读事件
    const install = `(function(){
      var c=document.querySelector(${JSON.stringify(sel)});
      window.__pm = 0; window.__pd = 0; window.__pu = 0;
      c.addEventListener('pointerdown', function(){window.__pd++;}, true);
      c.addEventListener('pointermove', function(){window.__pm++;}, true);
      window.addEventListener('pointerup', function(){window.__pu++;}, true);
      return true;
    })()`;
    await s.q(install);

    const before = await s.q(`(function(){
      var st=document.getElementById('state').textContent;
      try{ var o=JSON.parse(st); return o; }catch(e){ return {raw:st}; }
    })()`);

    // 用真 touch 序列：touchstart + 多个 touchmove + touchend（配合 pointerType touch）
    const drag = `(async function(){
      var c=document.querySelector(${JSON.stringify(sel)});
      var r=c.getBoundingClientRect();
      var down=${JSON.stringify(pathPts.down)}, mv=${JSON.stringify(pathPts.drag)};
      function firePointer(type,x,y,down2){
        c.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,clientX:r.left+x,clientY:r.top+y,
          pointerId:1,pointerType:'touch',button:0,buttons:down2?1:0}));
      }
      function T(x,y){ return new Touch({identifier:1,target:c,clientX:r.left+x,clientY:r.top+y,pageX:r.left+x,pageY:r.top+y}); }
      firePointer('pointerdown',down[0],down[1],true);
      c.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[T(down[0],down[1])],
        targetTouches:[T(down[0],down[1])],changedTouches:[T(down[0],down[1])]}));
      for(var i=0;i<mv.length;i++){
        firePointer('pointermove',mv[i][0],mv[i][1],true);
        c.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[T(mv[i][0],mv[i][1])],
          targetTouches:[T(mv[i][0],mv[i][1])],changedTouches:[T(mv[i][0],mv[i][1])]}));
        await new Promise(function(res){setTimeout(res,90);});
      }
      firePointer('pointerup',mv[mv.length-1][0],mv[mv.length-1][1],false);
      c.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],
        targetTouches:[],changedTouches:[T(mv[mv.length-1][0],mv[mv.length-1][1])]}));
      return true;
    })()`;
    await s.q(drag);
    await H.waitMs(500);

    const counts = await s.q('({pd:window.__pd,pm:window.__pm,pu:window.__pu})');
    const after = await s.q(`(function(){
      var st=document.getElementById('state').textContent;
      try{ var o=JSON.parse(st); return o; }catch(e){ return {raw:st}; }
    })()`);
    const errs = await s.realErrors();

    const bv = before[metric], av = after[metric];
    console.log('== ' + name + ' (metric=' + metric + ') ==');
    console.log('   touch pointer counts: down=' + counts.pd + ' move=' + counts.pm + ' up=' + counts.pu +
      '  状态 ' + metric + ': ' + JSON.stringify(bv) + ' -> ' + JSON.stringify(av) + ' errs=' + errs.length);
    if (errs.length) console.log('   ERRORS: ' + JSON.stringify(errs.slice(0, 3)));
    await s.kill();
    port++;
  }
  process.exit(0);
})();
