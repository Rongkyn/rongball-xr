import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CONFIG, MATERIALS, eventTable, rng, scaled, metrics, maxError, wav, decodeWav} from './render.mjs';
test('two schedules preserve all non-time synthesis parameters',()=>{
 for(const m of MATERIALS){const a=eventTable('T1',m),b=eventTable('T2',m);
  assert.equal(a.length,8); assert.notDeepEqual(a.map(e=>e.time),b.map(e=>e.time));
  assert.deepEqual(a.map(({time,...e})=>e),b.map(({time,...e})=>e));
  for(const row of [a,b]) for(let i=0;i<row.length;i++){
   assert.ok(row[i].time+row[i].stopSeconds<CONFIG.seconds);
   if(i)assert.ok(row[i].time>row[i-1].time+row[i-1].stopSeconds);
  }
 }
});
test('xorshift32 known vector and reset',()=>{
 const random=rng(1);assert.deepEqual([random(),random(),random()].map(x=>x*4294967296),[270369,67634689,2647435461]);
 assert.equal(rng(123)(),rng(123)());assert.throws(()=>rng(0));
});
test('float WAV byte layout, signed channels and exact decode',()=>{
 const channels=[new Float32Array([-.25,0,.5]),new Float32Array([.75,-.5,0])];
 const bytes=wav(channels);assert.equal(bytes.length,68);
 assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');
 assert.equal(new DataView(bytes.buffer).getUint16(20,true),3);
 assert.equal(new DataView(bytes.buffer).getUint32(24,true),48000);
 assert.equal(maxError(channels,decodeWav(bytes)),0);
 const pcm=decodeWav(wav(channels,true));assert.ok(maxError(channels,pcm)<=1/32768);
 const fixture=wav([new Float32Array([0]),new Float32Array([0])],true);
 const view=new DataView(fixture.buffer);view.setInt16(44,16384,true);view.setInt16(46,-32768,true);
 assert.deepEqual(decodeWav(fixture).map(ch=>ch[0]),[.5,-1]);
});
test('bad export fails, and metrics expose nonfinite/clipped samples',()=>{
 for(const bad of [NaN,Infinity,1,-1,1.1])assert.throws(()=>wav([new Float32Array([bad]),new Float32Array([0])]));
 const m=metrics([new Float32Array([NaN,1,-1]),new Float32Array([0,0,0])]);
 assert.equal(m[0].nonfinite,1);assert.equal(m[0].samplesAtOrBeyondFullScale,2);
});
test('ratio checker catches wrong gain and changed drop samples',()=>{
 const a=[new Float32Array([.1,.5,-.7]),new Float32Array([.25,0,-.2])];
 assert.ok(maxError(a,scaled(a,CONFIG.bedB),CONFIG.bedB)<1e-7);
 assert.ok(maxError(a,scaled(a,.5),CONFIG.bedB)>1e-5);
 const b=a.map(x=>x.slice());b[0][1]+=.01;assert.ok(maxError(a,b)>0);
});
