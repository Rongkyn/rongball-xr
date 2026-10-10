/**
 * asset_audit_1010.js — 资产管理员体检（清偿 BOARD 欠账：最后一次 08-30）
 * 口径：纯静态对账，不启动浏览器。
 *  A. gallery/index.html 卡片 href ↔ works/*.html 实物（双向：无死链、无无卡作品）
 *  B. works 里 <script src>/<link href> 本地引用 ↔ lib/ 实物（含根相对/相对路径两种）
 *  C. 作品体积登记（HTML 成品，gzip 口径近似）
 *  D. 根 index.html 与 gallery/index.html 自身引用健康
 */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT='/Coze/Drive/绒球/所有对话/主对话/rongball-xr';
const WORKS=path.join(ROOT,'gallery/works');
let problems=0; const findings=[];
function bad(m){problems++;findings.push('✗ '+m);}
function ok(m){findings.push('✓ '+m);}

/* ---- A. 挂廊卡片对账 ---- */
const galleryHtml=fs.readFileSync(path.join(ROOT,'gallery/index.html'),'utf8');
const cardHrefs=[...galleryHtml.matchAll(/<a[^>]*class="card[^"]*"[^>]*>/g)]
  .map(m=>(m[0].match(/href="([^"]+)"/)||[])[1]).filter(Boolean);
const htmlWorks=fs.readdirSync(WORKS).filter(f=>f.endsWith('.html')).sort();
const TEST_FILES=new Set(['brush-test.html','brush-tremor-test.html','orchid-test.html']);
const formalWorks=htmlWorks.filter(f=>!TEST_FILES.has(f));
console.log('卡片数='+cardHrefs.length+' 正式作品='+formalWorks.length+' 测试件='+TEST_FILES.size);

cardHrefs.forEach(h=>{
  const p=path.join(ROOT,'gallery',h.split('?')[0]);
  if(!fs.existsSync(p)) bad('卡片死链: '+h);
});
if([...new Set(cardHrefs)].length===cardHrefs.length) ok('卡片无重复链接');
else bad('存在重复卡片链接');

formalWorks.forEach(w=>{
  if(!cardHrefs.includes('works/'+w)) bad('正式作品无挂廊卡片: works/'+w);
});
if(cardHrefs.length===formalWorks.length && !findings.some(f=>f.startsWith('✗')))
  ok('卡片数='+cardHrefs.length+' 与正式作品一一对应（'+formalWorks.length+'件）');

/* ---- B. 本地引用对账（全部 HTML） ---- */
function checkRefs(htmlPath){
  const rel=path.relative(ROOT,htmlPath);
  const html=fs.readFileSync(htmlPath,'utf8');
  const refs=[
    ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]),
    ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m=>m[1]),
  ];
  refs.forEach(r=>{
    if(/^https?:|^data:|^#/.test(r)) return;             // 外链/锚点跳过
    const target=r.startsWith('/')
      ? path.join(ROOT,r)
      : path.join(path.dirname(htmlPath),r.split('?')[0]);
    if(!fs.existsSync(target)) bad(rel+' 本地引用缺失: '+r);
  });
  return refs.filter(r=>!/^https?:|^data:|^#/.test(r)).length;
}
let refTotal=0;
[path.join(ROOT,'gallery/index.html'),path.join(ROOT,'index.html'),
 ...htmlWorks.map(f=>path.join(WORKS,f))].forEach(f=>{
  if(fs.existsSync(f)) refTotal+=checkRefs(f);
});
if(!findings.some(f=>f.startsWith('✗')&&f.includes('引用'))) ok('全部本地 script/link 引用存在（'+refTotal+'条）');

/* ---- C. 作品体积 ---- */
const sizes=formalWorks.map(w=>{
  const buf=fs.readFileSync(path.join(WORKS,w));
  return {w,raw:buf.length,gzip:zlib.gzipSync(buf,{level:9}).length};
});
sizes.sort((a,b)=>b.raw-a.raw);
console.log('\n体积 TOP5（raw/gzip KB）:');
sizes.slice(0,5).forEach(s=>console.log('  '+s.w+': '+(s.raw/1024).toFixed(1)+' / '+(s.gzip/1024).toFixed(1)));
const totalRaw=sizes.reduce((a,s)=>a+s.raw,0);
ok('正式作品总体积 '+(totalRaw/1024).toFixed(0)+'KB，单件最大 '+(sizes[0].raw/1024).toFixed(0)+'KB');
const big=sizes.filter(s=>s.raw>256*1024);
if(big.length) bad('超 256KB 作品: '+big.map(s=>s.w).join(',')); else ok('无超 256KB 单文件作品');

/* ---- D. 根 index.html ---- */
const rootHtml=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
[...rootHtml.matchAll(/href="([^"]+\.html[^"]*)"/g)].map(m=>m[1]).forEach(r=>{
  if(/^https?:/.test(r))return;
  const p=path.join(ROOT,r.split('?')[0]);
  if(!fs.existsSync(p)) bad('根 index 死链: '+r);
});
if(!findings.some(f=>f.includes('根 index 死链'))) ok('根 index.html 链接健康');

/* ---- 报告 ---- */
console.log('\n======== 资产体检结果 ========');
findings.forEach(f=>console.log(f));
console.log('\n问题数: '+problems);
fs.writeFileSync(path.join(__dirname,'asset_audit_1010_result.json'),
  JSON.stringify({problems,checked:{cards:cardHrefs.length,formalWorks:formalWorks.length,localRefs:refTotal}},null,2));
process.exit(problems?1:0);
