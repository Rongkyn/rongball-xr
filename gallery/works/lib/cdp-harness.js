/**
 * cdp-harness.js — RongCDP v1.0（2026-09-08 提取入池）
 *
 * 用途：Canvas 互动作品的 headless Chrome 验收 harness（Node 端）。
 * 来源：天灯 17/17 独立验收（2026-09-05）+ 苔痕 15 轮视觉迭代（2026-09-07）实锤。
 * 依赖：google-chrome 在 PATH；ws 模块（路径由 wsPath 指定，默认就近 node_modules）。
 *
 * ★ 五条避坑已内置（踩过的坑不踩第二遍）：
 *  1. 坐标：tap/drag 一律取运行时 getBoundingClientRect() 真实位置派发；
 *     window.innerHeight 视口 ≠ --window-size（headless 有滚动条/UI 差），勿用窗口尺寸算坐标。
 *  2. 时序：物理断言用 waitFor(predicate) 轮询，禁固定 sleep；功能旅程配合作品侧 ?fast=1 加速钩子。
 *  3. 顶层 let/const 是词法全局、不挂 window：q() 里用裸名（let 也可），勿写 window.xxx。
 *  4. Page.navigate 后上下文复用不稳：本模块 goto() 每次重新拉 target 建连。
 *  5. 每个场景独立 user-data-dir：脏 localStorage / 脏状态会污染「空初始」断言。
 *
 * 最小示例：
 *   const H = require('./cdp-harness.js');
 *   const s = await H.launch({out: __dirname, profile: 'acc', port: 9500});
 *   await s.goto('file:///path/to/work.html?fast=1&cb=' + Date.now());
 *   await s.tap('#c', 400, 300);                 // CSS 像素，相对画布元素
 *   const cov = await s.waitFor('coverRatio > 0.01', {timeout: 20000});
 *   await s.shot('after_tap');
 *   console.log(s.errors);                        // 全程 JS 错误
 *   await s.kill();
 *
 * 作品侧约定（推荐）：
 *  - 提供隐藏 #state 元素，每帧镜像 JSON 状态（mirror()），harness 用 s.state() 读取
 *  - URL 钩子：?fast=1 加速物理 / ?auto=N 自动操作 / ?cb= 破缓存
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const waitMs = ms => new Promise(r => setTimeout(r, ms));

/** 拉 page target（避坑#4 的重连子过程） */
async function getPageTarget(port) {
  return new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${port}/json`, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => {
        const targets = JSON.parse(d);
        res(targets.find(t => t.type === 'page'));
      });
    }).on('error', rej);
  });
}

/**
 * 启动 headless Chrome 并建立 CDP 连接。
 * @param {object} o
 * @param {string} o.out        截图/profile 输出目录
 * @param {string} o.profile    profile 目录名（每场景独立！）
 * @param {number} o.port       remote-debugging 端口
 * @param {number} [o.width]    窗口宽 CSS px，默认 1280
 * @param {number} [o.height]   窗口高 CSS px，默认 860
 * @param {string} [o.wsPath]   ws 模块路径，默认 out 上溯找 node_modules/ws
 * @param {string[]} [o.extraFlags] 追加 chrome flags
 * @param {boolean} [o.mobile]  移动端模拟（390x844 dpr2 经 CDP 模拟，非 flag）
 */
async function launch(o) {
  const out = o.out;
  fs.mkdirSync(path.join(out, o.profile), { recursive: true });
  const WsMod = require(o.wsPath || path.join(out, '..', '20260827', 'node_modules', 'ws'));

  const flags = [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${o.port}`,
    `--window-size=${o.width || 1280},${o.height || 860}`,
    `--user-data-dir=${path.join(out, o.profile)}`,
    '--autoplay-policy=no-user-gesture-required',
  ].concat(o.extraFlags || []);
  const chrome = spawn('google-chrome', [...flags, 'about:blank'], { stdio: 'ignore' });

  let pageTarget = null;
  for (let i = 0; i < 25; i++) {
    await waitMs(700);
    try {
      const targets = await new Promise((res, rej) => {
        http.get(`http://127.0.0.1:${o.port}/json`, r => {
          let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
        }).on('error', rej);
      });
      pageTarget = targets.find(t => t.type === 'page');
      if (pageTarget) break;
    } catch (e) { /* 重试 */ }
  }
  if (!pageTarget) throw new Error('chrome launch fail (port ' + o.port + ')');

  const errors = [];
  let client = null;
  let msgId = 0;
  let pending = new Map();
  let send = null, q = null, shot = null;

  async function connect(target) {
    client = new WsMod(target.webSocketDebuggerUrl);
    msgId = 0;
    pending = new Map();
    client.on('message', d => {
      const m = JSON.parse(d);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')
        errors.push(m.params.entry.text.slice(0, 300));
      if (m.method === 'Runtime.exceptionThrown')
        errors.push('EXC:' + (m.params.exceptionDetails && m.params.exceptionDetails.text || JSON.stringify(m.params.exceptionDetails || {}).slice(0, 200)));
    });
    send = (m, p = {}) => new Promise(res => {
      const id = ++msgId; pending.set(id, res);
      client.send(JSON.stringify({ id, method: m, params: p }));
    });
    await new Promise(r => client.on('open', r));
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');

    if (o.mobile) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
      });
    }

    q = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r && r.exceptionDetails) return { __evalError: r.exceptionDetails.text || 'eval error' };
      return r ? r.result && r.result.value : undefined;
    };
    shot = async name => {
      const s = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(s.data, 'base64'));
    };
  }
  await connect(pageTarget);

  /** 导航后重新拉 target 建连（避坑#4：navigate 后旧 execution context 不稳，eval 会静默失效） */
  const goto = async url => {
    await send('Page.navigate', { url });
    await waitMs(2000);
    const t = await getPageTarget(o.port);
    await connect(t);
  };
  /**
   * 在元素上派发点击（pointerdown→up），坐标为相对该元素 rect 的 CSS 像素。
   * 坑#1：rect 运行时取，不用窗口尺寸。
   */
  const tap = async (sel, x, y, holdMs = 60) => q(`(async function(){
    var c=document.querySelector(${JSON.stringify(sel)});
    var r=c.getBoundingClientRect();
    var cx=r.left+${x}, cy=r.top+${y};
    c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,clientX:cx,clientY:cy,pointerId:1,pointerType:'mouse',button:0}));
    await new Promise(function(res){setTimeout(res,${holdMs});});
    c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,clientX:cx,clientY:cy,pointerId:1,pointerType:'mouse',button:0}));
    return [r.left,r.top,r.width,r.height];
  })()`);
  /** 拖动：点序列（CSS 像素，相对元素），自动按 70ms 间隔派 pointermove。 */
  const drag = async (sel, pts) => q(`(function(){
    var c=document.querySelector(${JSON.stringify(sel)});
    var r=c.getBoundingClientRect();
    var pts=${JSON.stringify(pts)};
    pts.forEach(function(p,i){
      var type = i===0?'pointerdown':'pointermove';
      c.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,clientX:r.left+p[0],clientY:r.top+p[1],pointerId:1,pointerType:'mouse',button:0,buttons:1}));
    });
    var last=pts[pts.length-1];
    c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,clientX:r.left+last[0],clientY:r.top+last[1],pointerId:1,pointerType:'mouse',button:0}));
    return 'dragged'+pts.length;
  })()`);
  /** 轮询等待断言（坑#2：禁固定 sleep 断言物理）。predExpr 为 JS 表达式，真值即通过。 */
  const waitFor = async (predExpr, opts = {}) => {
    const timeout = opts.timeout || 15000;
    const t0 = Date.now();
    let last;
    while (Date.now() - t0 < timeout) {
      last = await q(predExpr);
      if (last && last.__evalError) throw new Error('waitFor eval: ' + last.__evalError);
      if (last) return last;
      await waitMs(300);
    }
    throw new Error('waitFor timeout (' + (opts.label || predExpr.slice(0, 60)) + ') last=' + JSON.stringify(last));
  };
  /** 读作品隐藏 #state 镜像（JSON）。作品侧每帧 document.getElementById('state').textContent = JSON.stringify(...) */
  const state = async () => {
    const t = await q(`document.getElementById('state') ? document.getElementById('state').textContent : 'null'`);
    return JSON.parse(t);
  };
  /** 统计画布上满足颜色判定的像素占比（抽样）。judgeExpr 内可用 r,g,b（0-255）。 */
  const pixelRatio = async (sel, judgeExpr, stepPx = 4) => q(`(function(){
    var c=document.querySelector(${JSON.stringify(sel)});
    var x=c.getContext('2d');
    var d=x.getImageData(0,0,c.width,c.height).data;
    var hit=0,tot=0;
    for(var i=0;i<d.length;i+=${stepPx}*4){
      var r=d[i],g=d[i+1],b=d[i+2]; tot++;
      if(${judgeExpr}) hit++;
    }
    return hit/tot;
  })()`);
  const kill = async () => { try { chrome.kill(); } catch (e) {} };

  return { send, q, shot, goto, tap, drag, waitFor, state, pixelRatio,
           get errors() { return errors; }, kill, chrome };
}

module.exports = { launch, waitMs };
