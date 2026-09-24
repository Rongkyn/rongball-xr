/**
 * cdp-harness.js — RongCDP v1.0（2026-09-08 提取入池）
 *
 * 用途：Canvas 互动作品的 headless Chrome 验收 harness（Node 端）。
 * 来源：天灯 17/17 独立验收（2026-09-05）+ 苔痕 15 轮视觉迭代（2026-09-07）实锤。
 * 依赖：google-chrome 在 PATH；ws 模块（路径由 wsPath 指定，默认就近 node_modules）。
 *
 * ★ 避坑清单（踩过的坑不踩第二遍；1-5 首批，8-12 为 0917/0918 回流）：
 *  1. 坐标：tap/drag 一律取运行时 getBoundingClientRect() 真实位置派发；
 *     window.innerHeight 视口 ≠ --window-size（headless 有滚动条/UI 差），勿用窗口尺寸算坐标。
 *  2. 时序：物理断言用 waitFor(predicate) 轮询，禁固定 sleep；功能旅程配合作品侧 ?fast=1 加速钩子。
 *  3. 顶层 let/const 是词法全局、不挂 window：q() 里用裸名（let 也可），勿写 window.xxx。
 *  4. Page.navigate 后上下文复用不稳：本模块 goto() 每次重新拉 target 建连。
 *  5. 每个场景独立 user-data-dir：脏 localStorage / 脏状态会污染「空初始」断言。
 *  8. 僵尸 Chrome 占调试端口 → eval 串台（0917 桂雨）：残留 headless 仍占 remote-debugging-port，
 *     新连接抓到旧 about:blank target，表现为探针 undefined / getElementById null / __evalError:'Uncaught'，
 *     但截图是对的——极易误判作品坏。对策见 killAll(port)：验收前清僵尸；boot 后先验作品探针/关键节点，
 *     不满足就换端口+新 profile 重开。严禁 .catch(()=>null) 吞掉串台错误空转返回坏会话。
 *  9. headless 无音频硬件良性噪声（0917 桂雨）：'AudioContext encountered an error from the audio
 *     device / WebAudio renderer' 是容器告警非代码错，跑得越久越易冒。用 realErrors() 取过滤后的
 *     错误断言，errors 仍保留全量供排查。
 * 10. 测试点位先核对作品判区（0917 桂雨）：热区可能经 inflate 外扩到视觉边界之外，点错会触发别的
 *     交互；先在页面实跑作品侧命中函数选点。动画有淡入时固定 sleep 会读到 0，用 waitFor 轮询。
 * 11. 移动端视口口径（0918 听墨）：mobile override 后若页面内容比屏宽更宽（如固定 704px 画框），
 *     window.innerWidth 会被撑大成「布局视口」宽（实测 390 屏 innerWidth=548），scrollWidth 也跟着
 *     变大，二者比较永远「无横向溢出」假阴性。真可见宽用 visualViewport.width；判溢出/元素是否完整
 *     入屏一律以 visualViewport 为准（见 viewport()）。
 * 12. pixelRatio() 只向 judgeExpr 暴露 r,g,b（0918 听墨）：判透明会把 a=0 的黑底误算成墨（空纸
 *     覆盖率 100% 假阳性）。需判 alpha 或更复杂条件时用 pixels(probeFn, stepPx)，见方法文档。
 * 13. mobile 不只视口（0918 听墨）：setDeviceMetricsOverride 不影响 @media (pointer:coarse)/hover，
 *     launch({mobile:true}) 内部已补 setTouchEmulationEnabled，触屏专属 UI 断言前确认已走该分支。
 * 15. tap 早期作品（0919 墨园）：旧 canvas 只监听 mousedown/touchstart，单派 pointer 事件静默，
 *     tap() 默认 pointer+mouse 双派，opts.touch 追加 touch，opts.mouse=false 只派 pointer。
 * 16. goto 重连不关旧 ws + CDP 长会话偶发（0920 墨园实锤）：表现为间歇
 *     __evalError:'Uncaught'（概率随在途请求增多升高，单条短表达式常复现不了），截图正常极似
 *     作品 bug。两道对策已落地：connect() 先关旧连接+removeAllListeners+释放旧 pending；q() 对
 *     'Uncaught' 自动重试最多 3 次（断言均为幂等只读探测）。验收遇无规律 'Uncaught' 先怀疑本坑，
 *     换端口重开验证，勿误判作品。
 *
 * 18. IIFE 闭包变量 q 不可见 + 媒体查询被后置同特异性规则覆盖（0922 桂雨/月波深磨实锤）：
 *     (a) 作品整体包在 (function(){...})() 里时，let/const 是函数内闭包变量，q() 里裸名也
 *     ReferenceError——不要怀疑 harness 串台，验收只走 #state 镜像（必要时让作品侧补镜像字段）；
 *     (b) @media 块若写在同选择器基础规则【之前】，同特异性下源码后者胜，media 声明静默失效
 *     （matchMedia 报 true、getComputedStyle 仍是基础值）。响应式覆盖块必须置于基础规则之后，
 *     或提升特异性。排查口径：matchMedia(...).matches===true 但 computed 值没变 → 先看源码顺序。
 *     另：移动端 touch 验收若用合成事件，pointerType 写 'touch'；tap() 的 mouse 双派在部分
 *     touch-only 路由的旧作上不等价真机。
 *
 * 19. goto/navigate 不返回 != CDP 挂（0924 秋虫实锤）：页面解析早期 innerWidth/innerHeight
 *     可能为 0，作品脚本里 `for(x=0;x<=W;x+=W/k)` 步长 0/k=0 → 同步死循环，readyState
 *     恒 'loading'，Page.navigate 其实已正常返回。误判成 harness/端口问题会白做一堆对照。
 *     排查：navigate 返回后轮询 document.readyState，恒 loading 即去查同步脚本的「除法步长」
 *     循环；处方见 POOL.md §D2（resize 零尺寸守卫 + 步长 Math.max(1,…)）。
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
    // 避坑#16（0920 墨园）：goto 重连时若不关旧 ws，两个连接并存——旧 ws 仍在分发
    //  Chrome 广播（Log.entryAdded 等），且新旧连接共用本闭包 msgId/pending：旧连接在途请求的
    //  响应可能落到新连接 pending 上（反之亦然），表现为间歇 __evalError:'Uncaught' 与错误重复入栈，
    //  截图却正常，极难定位。重连前必须关旧连接并释放其在途请求。
    if (client) {
      try { client.removeAllListeners(); client.close(); } catch (e) {}
      for (const res of pending.values()) res({ __staleConnection: true });
      pending.clear();
      client = null;
    }
    client = new WsMod(target.webSocketDebuggerUrl);
    msgId = 0;
    pending = new Map();
    client.on('message', d => {
      const m = JSON.parse(d);
      if (m.id) {
        if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
      }
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
      // 避坑#13（0918 听墨）：setDeviceMetricsOverride 只改视口，不改 pointer/hover 媒体特性，
      // @media (pointer:coarse) 仍判为 fine，导致触屏专属 UI（长按提示等）不出现。
      // 必须显式开触摸模拟；setEmitTouchEventsForMouse 让合成鼠标事件同时派 touch 事件。
      try {
        await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
      } catch (e) { /* 老版本协议无此方法时不阻塞 */ }
    }

    const evaluateOnce = expr => send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    q = async expr => {
      // 避坑#16：CDP 长会话偶发 __evalError:'Uncaught'（多进程/重连时序，干净复现极难），
      // 但断言表达式都是幂等只读探测，立即重试通常即 PASS。最多 3 次，仍失败才如实返回错误。
      let r;
      for (let attempt = 0; attempt < 3; attempt++) {
        r = await evaluateOnce(expr);
        if (r && r.exceptionDetails) {
          if (attempt < 2) { await new Promise(res => setTimeout(res, 120 * (attempt + 1))); continue; }
          return { __evalError: r.exceptionDetails.text || 'eval error' };
        }
        break;
      }
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
   * 在元素上派发点击，坐标为相对该元素 rect 的 CSS 像素。
   * 坑#1：rect 运行时取，不用窗口尺寸。
   * 坑#15（墨园v0919）：早期作品 canvas 只监听 mousedown/touchstart，仅派 pointer 事件静默无反应，
   *        故默认 pointer+mouse 双派；opts.touch=true 追加 touch 事件，opts.mouse=false 只派 pointer。
   * 兼容：第4参可传数字（holdMs 旧签名）或对象 {holdMs,mouse,touch}。
   */
  const tap = async (sel, x, y, opts = 60) => {
    const o = typeof opts === 'number' ? { holdMs: opts } : opts;
    const holdMs = o.holdMs != null ? o.holdMs : 60;
    const useMouse = o.mouse !== false;
    const useTouch = !!o.touch;
    return q(`(async function(){
    var c=document.querySelector(${JSON.stringify(sel)});
    var r=c.getBoundingClientRect();
    var cx=r.left+${x}, cy=r.top+${y};
    var pe=function(type,down){c.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,clientX:cx,clientY:cy,pointerId:1,pointerType:'mouse',button:0,buttons:down?1:0}));};
    var me=function(type,down){c.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:cx,clientY:cy,button:0,buttons:down?1:0}));};
    var tt=function(){var T=function(){return new Touch({identifier:1,target:c,clientX:cx,clientY:cy,pageX:cx,pageY:cy});};
      c.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[T()],targetTouches:[T()],changedTouches:[T()]}));};
    var te=function(){var T=function(){return new Touch({identifier:1,target:c,clientX:cx,clientY:cy,pageX:cx,pageY:cy});};
      c.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],targetTouches:[],changedTouches:[T()]}));};
    pe('pointerdown',true);
    ${useMouse ? "me('mousedown',true);" : ''}
    ${useTouch ? 'tt();' : ''}
    await new Promise(function(res){setTimeout(res,${holdMs});});
    pe('pointerup',false);
    ${useMouse ? "me('mouseup',false);" : ''}
    ${useTouch ? 'te();' : ''}
    return [r.left,r.top,r.width,r.height];
  })()`);
  };
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
  /**
   * 通用像素探针（避坑#12）：probeExpr 为表达式，作用域内有 r,g,b,a（0-255）。
   * 对抽样像素求和 probeExpr 的真/数值结果；想取占比就写布尔表达式。
   *   pixels('#c','a>40 && r<120', 2)            // 不透明黑像素计数（步长2px，更密）
   */
  const pixels = async (sel, probeExpr, stepPx = 4) => q(`(function(){
    var c=document.querySelector(${JSON.stringify(sel)});
    var x=c.getContext('2d');
    var d=x.getImageData(0,0,c.width,c.height).data;
    var hit=0;
    for(var i=0;i<d.length;i+=${stepPx}*4){
      var r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
      if(${probeExpr}) hit++;
    }
    return hit;
  })()`);
  /**
   * 真视口（避坑#11）：移动端且页面被宽内容撑大时，innerWidth 是布局视口、不可信；
   * 返回 {w,h,dpr} 优先取 visualViewport（视觉视口），用于判横向溢出 / 元素完整入屏。
   */
  const viewport = async () => q(`(function(){
    return {
      w: visualViewport ? Math.round(visualViewport.width) : window.innerWidth,
      h: visualViewport ? Math.round(visualViewport.height) : window.innerHeight,
      innerW: window.innerWidth, innerH: window.innerHeight, dpr: window.devicePixelRatio||1
    };
  })()`);
  /**
   * 过滤良性噪声后的错误（避坑#9）：剔除 headless 无音频硬件告警；
   * errors 仍保留全量。作品断言用 (await s.realErrors()).length===0。
   */
  const realErrors = async () => errors.filter(e => !/AudioContext encountered an error from the audio device|WebAudio renderer/i.test(e));
  const kill = async () => { try { chrome.kill(); } catch (e) {} };

  return { send, q, shot, goto, tap, drag, waitFor, state, pixelRatio, pixels, viewport, realErrors,
           get errors() { return errors; }, kill, chrome };
}

/**
 * 清掉占用某调试端口的僵尸 Chrome（避坑#8，0917 桂雨实锤）。
 * 每轮验收前调用：残留 headless 会让新连接抓到旧 about:blank target 串台。
 * @param {number} port remote-debugging-port
 * @returns {Promise<number>} 被清理的进程数
 */
async function killAll(port) {
  // 用 pgrep -f 精确匹配该端口的 chrome 启动参数，不经 shell 拼接，避免引号地狱
  try {
    const { execFileSync } = require('child_process');
    let out = '';
    try {
      out = execFileSync('pgrep', ['-f', 'remote-debugging-port=' + port], { encoding: 'utf8' });
    } catch (e) { return 0; }   // pgrep 无匹配时退出码 1
    const pids = out.trim().split(/\s+/).filter(Boolean);
    pids.forEach(pid => { try { process.kill(Number(pid), 'SIGKILL'); } catch (e) {} });
    return pids.length;
  } catch (e) { return 0; }
}

// v0921 避坑增补（残荷移动端基线首跑踩实）：
// file:// URL 含【未编码中文路径】时 Page.navigate 静默失败——不抛错、不触发 error，
// 页面停在 about:blank，viewport 显示假宽 980（移动模拟默认布局宽）、state 全 null。
// 处方：传 file:// 前必须 'file://' + encodeURI(绝对路径)，再拼 query。
// 症状识别：goto 后读 location.href === 'about:blank' / innerWidth 出现 980。

module.exports = { launch, waitMs, killAll };
