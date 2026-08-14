#!/usr/bin/env python3
"""Apply Brief #006 changes to ink-garden.html v3.1 -> v3.2"""
import re

SRC = '/Coze/Drive/绒球/所有对话/主对话/rongball-xr/gallery/works/ink-garden.html'

with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

original_len = len(html)
replacements = []

def rep(old, new, label):
    global html
    if old not in html:
        print(f"ERROR: Could not find block for '{label}'")
        # Print first 80 chars of old for debugging
        print(f"  Looking for: {repr(old[:120])}")
        return False
    html = html.replace(old, new, 1)
    replacements.append(label)
    print(f"  OK: {label}")
    return True

# ── 1. Version comment ──
rep(
    '<!-- 墨园 v3.0 · 水墨语言重铸 · 墨分五色 骨法用笔 宋画笔墨 -->',
    '<!-- 墨园 v3.2 · 密度与垂帘 · 墨分五色 骨法用笔 宋画笔墨 -->',
    'version-comment'
)

# ── 2. Species parameters ──
# 竹: baseWidth 6 -> 6.5
rep(
    "{ name:'竹', maxDepth:5, branchAngle:0.28, angleVariance:0.12, lengthRatio:0.55,\n      baseLen:105, baseWidth:6, widthRatio:0.55, branchChance:0.85, doubleBranchChance:0.2,\n      curve:0.006, color:INK.nong, leafColor:INK.zhong, leafSize:1.0, leafDensity:0.9,\n      segments:5, growSpeed:1.8, midBranchChance:0.3 },",
    "{ name:'竹', maxDepth:5, branchAngle:0.28, angleVariance:0.12, lengthRatio:0.55,\n      baseLen:105, baseWidth:6.5, widthRatio:0.55, branchChance:0.85, doubleBranchChance:0.2,\n      curve:0.006, color:INK.nong, leafColor:INK.zhong, leafSize:1.0, leafDensity:0.9,\n      segments:5, growSpeed:1.8, midBranchChance:0.3 },",
    'species-bamboo'
)

# 松: baseWidth 13->14, branchChance 0.9->0.95, midBranchChance 0.35->0.45,
#     doubleBranchChance 0.5->0.6, curve 0.025->0.035
rep(
    "{ name:'松', maxDepth:5, branchAngle:0.75, angleVariance:0.3, lengthRatio:0.68,\n      baseLen:78, baseWidth:13, widthRatio:0.6, branchChance:0.9, doubleBranchChance:0.5,\n      curve:0.025, color:INK.jiao, leafColor:INK.nong, leafSize:1.0, leafDensity:0.95,\n      segments:5, growSpeed:1.3, midBranchChance:0.35 },",
    "{ name:'松', maxDepth:5, branchAngle:0.75, angleVariance:0.3, lengthRatio:0.68,\n      baseLen:78, baseWidth:14, widthRatio:0.6, branchChance:0.95, doubleBranchChance:0.6,\n      curve:0.035, color:INK.jiao, leafColor:INK.nong, leafSize:1.0, leafDensity:0.95,\n      segments:5, growSpeed:1.3, midBranchChance:0.45 },",
    'species-pine'
)

# 梅: baseWidth 9->10, branchAngle 0.7->0.8, angleVariance 0.35->0.45,
#     lengthRatio 0.62->0.58, curve 0.02->0.035, branchChance 0.92->0.95,
#     doubleBranchChance 0.55->0.6, segments 4->5
rep(
    "{ name:'梅', maxDepth:5, branchAngle:0.7, angleVariance:0.35, lengthRatio:0.62,\n      baseLen:65, baseWidth:9, widthRatio:0.55, branchChance:0.92, doubleBranchChance:0.55,\n      curve:0.02, color:INK.jiao, blossomColor:INK.qing, rouge:INK.rouge,\n      leafSize:0.85, leafDensity:0.45, segments:4, growSpeed:1.5, midBranchChance:0.25 },",
    "{ name:'梅', maxDepth:5, branchAngle:0.8, angleVariance:0.45, lengthRatio:0.58,\n      baseLen:65, baseWidth:10, widthRatio:0.55, branchChance:0.95, doubleBranchChance:0.6,\n      curve:0.035, color:INK.jiao, blossomColor:INK.qing, rouge:INK.rouge,\n      leafSize:0.85, leafDensity:0.55, segments:5, growSpeed:1.5, midBranchChance:0.35 },",
    'species-plum'
)

# 兰: baseLen 140->190 (for 160-220px leaves), baseWidth 3.6->3.5
rep(
    "{ name:'兰', maxDepth:4, branchAngle:0.25, angleVariance:0.4, lengthRatio:0.6,\n      baseLen:140, baseWidth:3.6, widthRatio:0.4, branchChance:0.3, doubleBranchChance:0.05,\n      curve:0.06, color:INK.zhong, leafColor:null, leafSize:1.0, leafDensity:0,\n      segments:16, growSpeed:2.0 },",
    "{ name:'兰', maxDepth:4, branchAngle:0.25, angleVariance:0.4, lengthRatio:0.6,\n      baseLen:190, baseWidth:3.5, widthRatio:0.4, branchChance:0.3, doubleBranchChance:0.05,\n      curve:0.06, color:INK.zhong, leafColor:null, leafSize:1.0, leafDensity:0,\n      segments:16, growSpeed:2.0 },",
    'species-orchid'
)

# ── 3. buildBamboo ──
old_bamboo = '''    buildBamboo() {
      const sp = this.species;
      const stalkCount = 2 + (this.rand(2) > 0.4 ? 1 : 0) + (this.rand(3) > 0.7 ? 1 : 0);
      for (let s = 0; s < stalkCount; s++) {
        const off = (s - (stalkCount-1)/2) * (5 + this.rand(s*3)*7);
        const angle = -Math.PI/2 + (this.rand(s*7)-0.5)*0.1;
        const len = sp.baseLen*(0.8+this.rand(s*5)*0.35);
        const w = sp.baseWidth*(0.7+this.rand(s*9)*0.4);
        const segs = 5 + Math.floor(this.rand(s*11)*2);
        const pts = [{x:this.x+off, y:this.y}];
        let cx = this.x+off, cy = this.y, ca = angle;
        const segL = len/segs;
        const nodes = [];
        for (let i = 0; i < segs; i++) {
          ca += sp.curve*(0.5+this.rand(s*200+i)*0.6);
          cx += Math.cos(ca)*segL; cy += Math.sin(ca)*segL;
          pts.push({x:cx, y:cy});
          if (i < segs-1) nodes.push(pts.length-1);
        }
        const id = this.branches.length;
        this.branches.push({
          id, kind:'stalk', points:pts, angle:ca, length:len, width:w,
          depth:0, children:[], hasLeaf:false, nodes,
          segLen: segL, baseAngle: angle,
        });
        for (let ni = 0; ni < nodes.length; ni++) {
          if (this.rand(s*50+ni) < 0.6) {
            const np = pts[nodes[ni]];
            const side = this.rand(s*60+ni) > 0.5 ? 1 : -1;
            const twigAngle = ca + side*(0.6+this.rand(s*70+ni)*0.4);
            const twigLen = 14 + this.rand(s*80+ni)*18;
            const tpts = this.calcTwig(np.x, np.y, twigAngle, twigLen, 3, s*90+ni);
            const cid = this.branches.length;
            this.branches.push({
              id:cid, kind:'twig', points:tpts, angle:twigAngle, length:twigLen,
              width:1.2+this.rand(s*85+ni)*0.8, depth:2, children:[],
              hasLeaf:true, leafAngle:twigAngle, leafGroup:this.pickLeafGroup(s*100+ni),
            });
          }
        }
        const tip = pts[pts.length-1];
        const topAngle = ca + (this.rand(s*95)-0.5)*0.5;
        const tpts = this.calcTwig(tip.x, tip.y, topAngle, 16, 2, s*120);
        this.branches.push({
          id:this.branches.length, kind:'twig', points:tpts, angle:topAngle,
          length:16, width:1, depth:2, children:[], hasLeaf:true,
          leafAngle:topAngle, leafGroup:'ge',
        });
      }
    }'''

new_bamboo = '''    buildBamboo() {
      const sp = this.species;
      const stalkCount = 2 + (this.rand(2) > 0.4 ? 1 : 0) + (this.rand(3) > 0.7 ? 1 : 0);
      for (let s = 0; s < stalkCount; s++) {
        const off = (s - (stalkCount-1)/2) * (5 + this.rand(s*3)*7);
        const angle = -Math.PI/2 + (this.rand(s*7)-0.5)*0.1;
        const len = sp.baseLen*(0.8+this.rand(s*5)*0.35);
        const w = sp.baseWidth*(0.7+this.rand(s*9)*0.4);
        const segs = 7 + Math.floor(this.rand(s*11)*2);
        const pts = [{x:this.x+off, y:this.y}];
        let cx = this.x+off, cy = this.y, ca = angle;
        const segL = len/segs;
        const nodes = [];
        for (let i = 0; i < segs; i++) {
          ca += sp.curve*(0.5+this.rand(s*200+i)*0.6);
          cx += Math.cos(ca)*segL; cy += Math.sin(ca)*segL;
          pts.push({x:cx, y:cy});
          if (i < segs-1) nodes.push(pts.length-1);
        }
        const id = this.branches.length;
        this.branches.push({
          id, kind:'stalk', points:pts, angle:ca, length:len, width:w,
          depth:0, children:[], hasLeaf:false, nodes,
          segLen: segL, baseAngle: angle,
        });
        for (let ni = 0; ni < nodes.length; ni++) {
          if (this.rand(s*50+ni) < 0.85) {
            const np = pts[nodes[ni]];
            const sides = [1];
            if (this.rand(s*55+ni) < 0.5) sides.push(-1);
            for (let si2 = 0; si2 < sides.length; si2++) {
              const side = sides[si2];
              const twigAngle = ca + side*(0.6+this.rand(s*70+ni+si2)*0.4);
              const twigLen = 25 + this.rand(s*80+ni+si2)*25;
              const tpts = this.calcTwig(np.x, np.y, twigAngle, twigLen, 4, s*90+ni+si2);
              this.branches.push({
                id:this.branches.length, kind:'twig', points:tpts, angle:twigAngle, length:twigLen,
                width:1.2+this.rand(s*85+ni)*0.8, depth:2, children:[],
                hasLeaf:true, leafAngle:twigAngle, leafGroup:this.pickLeafGroup(s*100+ni+si2),
              });
              const subCount = 3 + Math.floor(this.rand(s*95+ni+si2)*2);
              for (let sb = 0; sb < subCount; sb++) {
                const subIdx = 1 + Math.floor(this.rand(s*97+ni+sb*3)*Math.max(1,tpts.length-2));
                const sp2 = tpts[Math.min(subIdx, tpts.length-1)];
                const subAngle = twigAngle + (this.rand(s*98+ni+sb)-0.5)*0.8 + side*0.3;
                const subLen = 12 + this.rand(s*99+ni+sb)*15;
                const spts = this.calcTwig(sp2.x, sp2.y, subAngle, subLen, 2, s*110+ni+sb);
                this.branches.push({
                  id:this.branches.length, kind:'twig', points:spts, angle:subAngle,
                  length:subLen, width:0.9, depth:3, children:[],
                  hasLeaf:true, leafAngle:subAngle, leafGroup:this.pickLeafGroup(s*120+ni+sb),
                });
              }
            }
          }
        }
        const tip = pts[pts.length-1];
        const topAngle = ca + (this.rand(s*95)-0.5)*0.5;
        const tpts = this.calcTwig(tip.x, tip.y, topAngle, 20, 2, s*120);
        this.branches.push({
          id:this.branches.length, kind:'twig', points:tpts, angle:topAngle,
          length:20, width:1, depth:2, children:[], hasLeaf:true,
          leafAngle:topAngle, leafGroup:'ge',
        });
      }
    }'''

rep(old_bamboo, new_bamboo, 'buildBamboo')

# ── 4. buildWillow ──
old_willow = '''    buildWillow() {
      // Willow: a short thick trunk rises a bit, forks into 2-3 main branches
      // that sweep up and outward, then from each node hang long drooping twigs.
      const sp = this.species;
      const trunkH = sp.baseLen * 0.35;
      const trunkW = sp.baseWidth * 0.9;
      // main trunk (vertical, slight curve)
      const trunkPts = [{x:this.x, y:this.y}];
      let cx=this.x, cy=this.y, ca=-Math.PI/2 + (this.rand(1)-0.5)*0.15;
      const trunkSegs = 4;
      for (let i=0;i<trunkSegs;i++){
        ca += 0.02*(this.rand(10+i)-0.5);
        cx += Math.cos(ca)*trunkH/trunkSegs;
        cy += Math.sin(ca)*trunkH/trunkSegs;
        trunkPts.push({x:cx,y:cy});
      }
      this.branches.push({
        id:this.branches.length, kind:'stalk', points:trunkPts,
        angle:ca, length:trunkH, width:trunkW, depth:0,
        children:[], hasLeaf:false,
      });
      const forkCount = 2 + (this.rand(3)>0.5?1:0);
      for (let f=0; f<forkCount; f++){
        const side = (f-(forkCount-1)/2);
        // main branch sweeps up-and-out, then arches over to downward
        const brAngle = -Math.PI/2 + side*0.55 + (this.rand(f*7)-0.5)*0.15;
        const brLen = sp.baseLen*(0.5+this.rand(f*9)*0.25);
        const bpts = [{x:cx,y:cy}];
        let bx=cx, by=cy, ba=brAngle;
        const bSegs = 5;
        for (let i=0;i<bSegs;i++){
          // arch: angle progressively rotates toward vertical-down
          const arch = (i/bSegs);
          const targetA = (-Math.PI/2) + side*0.2 + arch*(Math.PI/2 + side*0.35);
          ba = ba + (targetA-ba)*0.35 + (this.rand(f*30+i)-0.5)*0.05;
          bx += Math.cos(ba)*brLen/bSegs;
          by += Math.sin(ba)*brLen/bSegs;
          bpts.push({x:bx,y:by});
        }
        const bid = this.branches.length;
        this.branches.push({
          id:bid, kind:'stalk', points:bpts, angle:ba, length:brLen,
          width:trunkW*0.55, depth:1, children:[], hasLeaf:false,
        });
        // drooping twigs hang from nodes along the arching branch
        for (let k=1;k<bpts.length;k++){
          if (this.rand(f*50+k) < 0.55) {
            const node = bpts[k];
            const droopLen = 45 + this.rand(f*60+k)*55;
            const dpts = [{x:node.x, y:node.y}];
            let dx=node.x, dy=node.y, da=Math.PI/2 + (this.rand(f*70+k)-0.5)*0.35;
            const dSegs = 7;
            for (let i=0;i<dSegs;i++){
              da += (this.rand(f*80+k+i)-0.5)*0.06;
              dx += Math.cos(da)*droopLen/dSegs;
              dy += Math.sin(da)*droopLen/dSegs;
              dpts.push({x:dx,y:dy});
            }
            this.branches.push({
              id:this.branches.length, kind:'droop', points:dpts,
              angle:da, length:droopLen, width:1.1+this.rand(f*90+k)*0.5,
              depth:3, children:[], hasLeaf:true, leafAngle:da,
            });
          }
        }
      }
    }'''

new_willow = '''    buildWillow() {
      const trunkH = 20 + this.rand(1)*10;
      const trunkW = 8 + this.rand(2)*2;
      const trunkPts = [{x:this.x, y:this.y}];
      let cx=this.x, cy=this.y, ca=-Math.PI/2 + (this.rand(3)-0.5)*0.1;
      for (let i=0;i<3;i++){
        cx += Math.cos(ca)*trunkH/3;
        cy += Math.sin(ca)*trunkH/3;
        ca += (this.rand(4+i)-0.5)*0.03;
        trunkPts.push({x:cx,y:cy});
      }
      this.branches.push({
        id:this.branches.length, kind:'stalk', points:trunkPts,
        angle:ca, length:trunkH, width:trunkW, depth:0,
        children:[], hasLeaf:false,
      });
      const cascadeCount = 3 + (this.rand(5)>0.5?1:0);
      for (let f=0; f<cascadeCount; f++){
        const side = f - (cascadeCount-1)/2;
        const startAngle = -Math.PI/2 + side*0.5 + (this.rand(f*7)-0.5)*0.2;
        const archUp = 30 + this.rand(f*9)*20;
        const archDown = 45 + this.rand(f*11)*40;
        const cw = 3 + this.rand(f*13)*2;
        const cpts = [{x:cx,y:cy}];
        let bx=cx, by=cy, ba=startAngle;
        for (let i=0;i<5;i++){
          const t=i/5;
          ba = startAngle + t*0.35*side + (this.rand(f*20+i)-0.5)*0.04;
          bx += Math.cos(ba)*archUp/5;
          by += Math.sin(ba)*archUp/5;
          cpts.push({x:bx,y:by});
        }
        for (let i=0;i<7;i++){
          const targetA = Math.PI/2 + side*0.15;
          ba = ba + (targetA-ba)*0.22 + (this.rand(f*30+i)-0.5)*0.04;
          bx += Math.cos(ba)*archDown/7;
          by += Math.sin(ba)*archDown/7;
          cpts.push({x:bx,y:by});
        }
        this.branches.push({
          id:this.branches.length, kind:'cascade', points:cpts, angle:ba,
          length:archUp+archDown, width:cw, depth:1, children:[], hasLeaf:false,
        });
        for (let k=1;k<cpts.length;k++){
          const node = cpts[k];
          const isNearCrown = k < 4;
          const droopLen = isNearCrown ? (60+this.rand(f*50+k)*30) : (90+this.rand(f*60+k)*50);
          const dpts = [{x:node.x, y:node.y}];
          let dx=node.x, dy=node.y;
          let da = Math.PI/2 + (this.rand(f*70+k)-0.5)*0.18;
          for (let i=0;i<8;i++){
            da += (this.rand(f*80+k+i)-0.5)*0.035;
            dx += Math.cos(da)*droopLen/8;
            dy += Math.sin(da)*droopLen/8;
            dpts.push({x:dx,y:dy});
          }
          this.branches.push({
            id:this.branches.length, kind:'droop', points:dpts,
            angle:da, length:droopLen, width:0.8+this.rand(f*90+k)*0.7,
            depth:3, children:[], hasLeaf:true, leafAngle:da,
          });
        }
      }
    }'''

rep(old_willow, new_willow, 'buildWillow')

# ── 5. buildOrchid ──
old_orchid = '''    buildOrchid() {
      const sp = this.species;
      const leafCount = 3 + Math.floor(this.rand(1)*3);
      for (let s = 0; s < leafCount; s++) {
        const isLong = s === 0;
        const baseAngle = -Math.PI/2 + (this.rand(s*5)-0.5)*1.5;
        const leafLen = sp.baseLen*(isLong?1.0:(0.45+this.rand(s*7)*0.4));
        const leafW = sp.baseWidth*(isLong?1.1:(0.7+this.rand(s*11)*0.4));
        const segCount = 16;
        const pts = [{x:this.x, y:this.y}];
        let cx = this.x, cy = this.y, ca = baseAngle;
        const curveDir = (this.rand(s*9)-0.5);
        for (let i = 0; i < segCount; i++) {
          const t = i/segCount;
          const bend = curveDir * 0.012 * t;
          ca += bend + (this.rand(s*200+i)-0.5)*0.008;
          const sl = leafLen/segCount;
          cx += Math.cos(ca)*sl; cy += Math.sin(ca)*sl;
          pts.push({x:cx, y:cy});
        }
        this.branches.push({
          id:s, kind:'leaf', points:pts, angle:ca, length:leafLen,
          width:leafW, depth:0, children:[], hasLeaf:false,
        });
      }
    }'''

new_orchid = '''    buildOrchid() {
      const sp = this.species;
      const leafCount = 5 + Math.floor(this.rand(1)*3);
      const lenRatios = [1.0, 0.72, 0.58, 0.46, 0.38, 0.33, 0.3];
      for (let s = 0; s < leafCount; s++) {
        const ratio = lenRatios[s] || 0.3;
        const baseAngle = -Math.PI/2 + (this.rand(s*5)-0.5)*1.8;
        const leafLen = sp.baseLen * ratio;
        const leafW = 2 + this.rand(s*11)*2;
        const isOld = s < 2;
        const segCount = 16;
        const pts = [{x:this.x, y:this.y}];
        let cx = this.x, cy = this.y, ca = baseAngle;
        const curveDir = (this.rand(s*9)-0.5);
        for (let i = 0; i < segCount; i++) {
          const t = i/segCount;
          const bend = curveDir * 0.014 * t;
          ca += bend + (this.rand(s*200+i)-0.5)*0.008;
          const sl = leafLen/segCount;
          cx += Math.cos(ca)*sl; cy += Math.sin(ca)*sl;
          pts.push({x:cx, y:cy});
        }
        this.branches.push({
          id:s, kind:'leaf', points:pts, angle:ca, length:leafLen,
          width:leafW, depth:0, children:[], hasLeaf:false,
          leafTone: isOld ? 'nong' : 'zhong',
        });
      }
    }'''

rep(old_orchid, new_orchid, 'buildOrchid')

# ── 6. drawBambooLeaves ──
old_bamboo_leaves = '''    drawBambooLeaves(ctx, b, lx, ly, sway, leafAlpha) {
      const grp = b.leafGroup || 'ge3';
      const baseLen = 14 + this.rand(b.id*3)*8;
      const baseAng = b.angle || 0;
      let strokes;
      if (grp === 'ren') strokes = 2;
      else if (grp === 'ge3') strokes = 3;
      else strokes = 4 + (this.rand(b.id*5) > 0.5 ? 1 : 0);
      ctx.strokeStyle = INK.nong;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let n = 0; n < strokes; n++) {
        let na;
        if (grp === 'ren') {
          na = baseAng + (n===0?-0.5:0.5) + (this.rand(b.id+n*3)-0.5)*0.15;
        } else if (grp === 'ge3') {
          const offs = [-0.55, 0.05, 0.6];
          na = baseAng + offs[n] + (this.rand(b.id+n*3)-0.5)*0.12;
        } else {
          const offs = [-0.7, -0.25, 0.2, 0.65, 0.0][n] || 0;
          na = baseAng + offs + (this.rand(b.id+n*3)-0.5)*0.1;
        }
        const len = baseLen*(0.75+this.rand(b.id+n*5)*0.4);
        const w = 1.6 + this.rand(b.id+n*9)*0.8;
        const a = (0.6+this.rand(b.id+n*11)*0.3)*leafAlpha;
        this.wedgeLeaf(ctx, lx, ly, na+sway*0.3, len, w, a);
      }
      if (this.rand(b.id*13) > 0.5) {
        ctx.strokeStyle = INK.dan;
        const na = baseAng + (this.rand(b.id*17)-0.5)*0.8;
        this.wedgeLeaf(ctx, lx, ly, na+sway*0.3, baseLen*0.8, 1.0, 0.25*leafAlpha);
      }
      ctx.globalAlpha = 1;
    }'''

new_bamboo_leaves = '''    drawBambooLeaves(ctx, b, lx, ly, sway, leafAlpha) {
      const baseAng = b.angle || 0;
      const strokes = 5 + Math.floor(this.rand(b.id*5)*3);
      const offs = [-0.7, -0.4, -0.1, 0.2, 0.5, 0.75, 0.15];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let n = 0; n < strokes; n++) {
        const na = baseAng + offs[n] + (this.rand(b.id+n*3)-0.5)*0.12;
        const len = 14 + this.rand(b.id+n*5)*8;
        const w = 1.5 + this.rand(b.id+n*9)*1.5;
        const isDark = this.rand(b.id+n*13) < 0.7;
        ctx.strokeStyle = isDark ? INK.nong : INK.zhong;
        const a = (0.55+this.rand(b.id+n*11)*0.35)*leafAlpha;
        this.wedgeLeaf(ctx, lx, ly, na+sway*0.3, len, w, a);
      }
      ctx.globalAlpha = 1;
    }'''

rep(old_bamboo_leaves, new_bamboo_leaves, 'drawBambooLeaves')

# ── 7. drawPineNeedles ──
old_pine_needles = '''    drawPineNeedles(ctx, b, lx, ly, sway, leafAlpha) {
      const clusters = 1 + Math.floor(this.rand(b.id*3)*2);
      let len = 14;
      for (let c = 0; c < clusters; c++) {
        const cx = lx + (this.rand(b.id+c*7)-0.5)*5;
        const cy = ly + (this.rand(b.id+c*9)-0.5)*5;
        const count = 8 + Math.floor(this.rand(b.id+c*11)*5);
        len = 10 + this.rand(b.id+c*13)*8;
        const spread = 0.9 + this.rand(b.id+c*17)*0.3;
        const baseDir = b.angle + (c-0.5)*0.3;
        ctx.strokeStyle = INK.nong;
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.5;
        for (let n = 0; n < count; n++) {
          const t = count === 1 ? 0.5 : n/(count-1);
          const na = baseDir - spread/2 + t*spread + (this.rand(b.id+c*20+n)-0.5)*0.08;
          const nl = len*(0.75+this.rand(b.id+c*30+n)*0.35);
          ctx.globalAlpha = (0.55+this.rand(b.id+c*40+n)*0.3)*leafAlpha;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx+Math.cos(na)*nl, cy+Math.sin(na)*nl);
          ctx.stroke();
        }
      }
      if (this.rand(b.id*23) > 0.4) {
        ctx.strokeStyle = INK.dan;
        ctx.lineWidth = 0.4;
        for (let n = 0; n < 4; n++) {
          const na = b.angle + (this.rand(b.id*25+n)-0.5)*1.4;
          ctx.globalAlpha = 0.3*leafAlpha;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx+Math.cos(na)*len*0.8, ly+Math.sin(na)*len*0.8);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }'''

new_pine_needles = '''    drawPineNeedles(ctx, b, lx, ly, sway, leafAlpha, scaleMul) {
      const sm = scaleMul || 1;
      const clusters = 1 + Math.floor(this.rand(b.id*3)*2);
      let nlen = 20;
      for (let c = 0; c < clusters; c++) {
        const cx = lx + (this.rand(b.id+c*7)-0.5)*5;
        const cy = ly + (this.rand(b.id+c*9)-0.5)*5;
        const count = 10 + Math.floor(this.rand(b.id+c*11)*5);
        nlen = (18 + this.rand(b.id+c*13)*8) * sm;
        const spread = 0.9 + this.rand(b.id+c*17)*0.3;
        const baseDir = b.angle + (c-0.5)*0.3;
        ctx.strokeStyle = INK.nong;
        ctx.lineCap = 'round';
        ctx.lineWidth = 0.5;
        for (let n = 0; n < count; n++) {
          const t = count === 1 ? 0.5 : n/(count-1);
          const na = baseDir - spread/2 + t*spread + (this.rand(b.id+c*20+n)-0.5)*0.08;
          const nl = nlen*(0.75+this.rand(b.id+c*30+n)*0.35);
          ctx.globalAlpha = (0.55+this.rand(b.id+c*40+n)*0.3)*leafAlpha;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx+Math.cos(na)*nl, cy+Math.sin(na)*nl);
          ctx.stroke();
        }
      }
      if (this.rand(b.id*23) > 0.4) {
        ctx.strokeStyle = INK.dan;
        ctx.lineWidth = 0.4;
        for (let n = 0; n < 4; n++) {
          const na = b.angle + (this.rand(b.id*25+n)-0.5)*1.4;
          ctx.globalAlpha = 0.3*leafAlpha;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx+Math.cos(na)*nlen*0.8, ly+Math.sin(na)*nlen*0.8);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }'''

rep(old_pine_needles, new_pine_needles, 'drawPineNeedles')

# ── 8. drawPlumBlossom ──
old_plum = '''    drawPlumBlossom(ctx, b, lx, ly, sway, leafAlpha) {
      const isRed = b.id === this.redBlossomId;
      const isBud = this.rand(b.id*17) < 0.35;
      const sz = 2.2 + this.rand(b.id*3)*1.3;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(sway*0.2);
      if (isBud) {
        ctx.fillStyle = isRed ? INK.rouge : INK.dan;
        ctx.globalAlpha = (isRed?0.7:0.5)*leafAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, sz*0.6, 0, Math.PI*2);
        ctx.fill();
      } else {
        const dist = sz*1.1;
        for (let p = 0; p < 5; p++) {
          const pa = (p/5)*Math.PI*2 - Math.PI/2;
          const px = Math.cos(pa)*dist, py = Math.sin(pa)*dist;
          if (isRed) {
            ctx.fillStyle = INK.rouge;
            ctx.globalAlpha = 0.65*leafAlpha;
            ctx.beginPath();
            ctx.arc(px, py, sz*0.75, 0, Math.PI*2);
            ctx.fill();
          } else {
            const roll = this.rand(b.id*20+p);
            if (roll < 0.7) {
              ctx.strokeStyle = INK.qing;
              ctx.globalAlpha = 0.35*leafAlpha;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.arc(px, py, sz*0.75, 0, Math.PI*2);
              ctx.stroke();
            } else {
              ctx.fillStyle = INK.dan;
              ctx.globalAlpha = 0.3*leafAlpha;
              ctx.beginPath();
              ctx.arc(px, py, sz*0.75, 0, Math.PI*2);
              ctx.fill();
            }
          }
        }
        ctx.fillStyle = INK.jiao;
        ctx.globalAlpha = 0.7*leafAlpha;
        for (let s = 0; s < 5; s++) {
          const sa = (s/5)*Math.PI*2;
          ctx.beginPath();
          ctx.arc(Math.cos(sa)*sz*0.3, Math.sin(sa)*sz*0.3, 0.6, 0, Math.PI*2);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }'''

new_plum = '''    drawPlumBlossom(ctx, b, lx, ly, sway, leafAlpha) {
      const isRed = b.id === this.redBlossomId;
      const isBud = this.rand(b.id*17) < 0.25;
      const sz = 1.5 + this.rand(b.id*3)*1.0;
      const toneRoll = this.rand(b.id*21);
      let petalStyle;
      if (isRed) petalStyle = 'rouge';
      else if (toneRoll < 0.25) petalStyle = 'nong';
      else petalStyle = 'qing';
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(sway*0.2);
      if (isBud) {
        ctx.fillStyle = isRed ? INK.rouge : (petalStyle==='nong'?INK.nong:INK.dan);
        ctx.globalAlpha = (isRed?0.7:0.5)*leafAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, sz*0.7, 0, Math.PI*2);
        ctx.fill();
      } else {
        const dist = sz*1.1;
        for (let p = 0; p < 5; p++) {
          const pa = (p/5)*Math.PI*2 - Math.PI/2;
          const px = Math.cos(pa)*dist, py = Math.sin(pa)*dist;
          if (petalStyle === 'rouge') {
            ctx.fillStyle = INK.rouge;
            ctx.globalAlpha = 0.65*leafAlpha;
            ctx.beginPath();
            ctx.arc(px, py, sz*0.75, 0, Math.PI*2);
            ctx.fill();
          } else if (petalStyle === 'nong') {
            ctx.fillStyle = INK.nong;
            ctx.globalAlpha = 0.45*leafAlpha;
            ctx.beginPath();
            ctx.arc(px, py, sz*0.75, 0, Math.PI*2);
            ctx.fill();
          } else {
            const roll = this.rand(b.id*20+p);
            if (roll < 0.6) {
              ctx.strokeStyle = INK.qing;
              ctx.globalAlpha = 0.4*leafAlpha;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.arc(px, py, sz*0.75, 0, Math.PI*2);
              ctx.stroke();
            } else {
              ctx.fillStyle = INK.dan;
              ctx.globalAlpha = 0.3*leafAlpha;
              ctx.beginPath();
              ctx.arc(px, py, sz*0.75, 0, Math.PI*2);
              ctx.fill();
            }
          }
        }
        ctx.fillStyle = INK.jiao;
        ctx.globalAlpha = 0.7*leafAlpha;
        for (let s = 0; s < 5; s++) {
          const sa = (s/5)*Math.PI*2;
          ctx.beginPath();
          ctx.arc(Math.cos(sa)*sz*0.3, Math.sin(sa)*sz*0.3, 0.5, 0, Math.PI*2);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }'''

rep(old_plum, new_plum, 'drawPlumBlossom')

# ── 9. drawWillowBranch ──
old_willow_draw = '''    drawWillowBranch(ctx, b, dpts, strokeColor, alpha, layer, time, windX, windY, swayFactor, fade) {
      const pw = Math.max(0.5, b.width*0.5*layer.scale);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = pw;
      ctx.beginPath();
      ctx.moveTo(dpts[0].x, dpts[0].y);
      if (dpts.length > 2) {
        for (let k = 1; k < dpts.length-1; k++) {
          const xc = (dpts[k].x+dpts[k+1].x)/2, yc = (dpts[k].y+dpts[k+1].y)/2;
          ctx.quadraticCurveTo(dpts[k].x, dpts[k].y, xc, yc);
        }
        ctx.lineTo(dpts[dpts.length-1].x, dpts[dpts.length-1].y);
      } else {
        ctx.lineTo(dpts[1].x, dpts[1].y);
      }
      ctx.stroke();
      if (layer.detail && dpts.length >= 4) {
        ctx.strokeStyle = 'rgba(107,94,76,'+(0.55*fade)+')';
        ctx.lineWidth = 0.5;
        ctx.lineCap = 'round';
        const step = 3;
        for (let k = 1; k < dpts.length-1; k += step) {
          if (this.rand(b.id*30+k) > 0.5) continue;
          const p = dpts[k], next = dpts[k+1];
          const tang = Math.atan2(next.y-p.y, next.x-p.x);
          const side = (k%2===0)?1:-1;
          const la = tang + side*0.9;
          const llen = 1.5 + this.rand(b.id*40+k)*1.5;
          const sway2 = Math.sin(time*0.003+b.id+k)*0.1*swayFactor;
          ctx.globalAlpha = (0.4+this.rand(b.id*50+k)*0.3)*fade;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x+Math.cos(la+sway2)*llen, p.y+Math.sin(la+sway2)*llen);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }'''

new_willow_draw = '''    drawWillowBranch(ctx, b, dpts, strokeColor, alpha, layer, time, windX, windY, swayFactor, fade) {
      const pw = Math.max(0.5, b.width*0.5*layer.scale);
      if (b.kind === 'droop') {
        ctx.strokeStyle = strokeColor;
        ctx.lineCap = 'round';
        const total = dpts.length - 1;
        for (let k = 0; k < total; k++) {
          const t = k / total;
          const w = Math.max(0.3, pw * (1 - t*0.35));
          ctx.lineWidth = w;
          ctx.globalAlpha = alpha * (0.7 + (1-t)*0.3);
          ctx.beginPath();
          ctx.moveTo(dpts[k].x, dpts[k].y);
          ctx.lineTo(dpts[k+1].x, dpts[k+1].y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (layer.detail && dpts.length >= 4) {
          ctx.fillStyle = 'rgba(107,94,76,'+(0.5*fade)+')';
          for (let k = 2; k < dpts.length-1; k += 2) {
            if (this.rand(b.id*30+k) > 0.6) continue;
            const p = dpts[k];
            const lsz = 1.5 + this.rand(b.id*40+k)*1.0;
            const ox = (this.rand(b.id*50+k)-0.5)*3;
            const oy = (this.rand(b.id*60+k)-0.5)*2;
            ctx.globalAlpha = (0.35+this.rand(b.id*70+k)*0.3)*fade;
            ctx.beginPath();
            ctx.ellipse(p.x+ox, p.y+oy, lsz*0.6, lsz, 0, 0, Math.PI*2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      } else {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = pw;
        ctx.beginPath();
        ctx.moveTo(dpts[0].x, dpts[0].y);
        if (dpts.length > 2) {
          for (let k = 1; k < dpts.length-1; k++) {
            const xc = (dpts[k].x+dpts[k+1].x)/2, yc = (dpts[k].y+dpts[k+1].y)/2;
            ctx.quadraticCurveTo(dpts[k].x, dpts[k].y, xc, yc);
          }
          ctx.lineTo(dpts[dpts.length-1].x, dpts[dpts.length-1].y);
        } else {
          ctx.lineTo(dpts[1].x, dpts[1].y);
        }
        ctx.stroke();
        if (b.width >= 3 && layer.detail) {
          ctx.strokeStyle = 'rgba(26,22,18,'+(0.25*alpha)+')';
          ctx.lineWidth = Math.max(0.4, pw*0.15);
          for (let k = 1; k < dpts.length-1; k++) {
            if (this.rand(b.id*80+k) > 0.5) continue;
            const p = dpts[k], prev = dpts[k-1], next = dpts[k+1];
            const dx = next.x-prev.x, dy = next.y-prev.y;
            const ln = Math.hypot(dx,dy)||1;
            const nx = -dy/ln, ny = dx/ln;
            const sz = pw*(0.4+this.rand(b.id*85+k)*0.4);
            ctx.beginPath();
            ctx.moveTo(p.x-nx*sz, p.y-ny*sz);
            ctx.quadraticCurveTo(p.x, p.y, p.x+nx*sz, p.y+ny*sz);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }'''

rep(old_willow_draw, new_willow_draw, 'drawWillowBranch')

# ── 10. drawOrchidLeaf ──
old_orchid_leaf = '''    drawOrchidLeaf(ctx, b, dpts, strokeColor, alpha) {
      if (dpts.length < 2) return;
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = 'round';
      const total = dpts.length-1;
      for (let k = 0; k < total; k++) {
        const t = k/total;
        let w;
        if (t < 0.12) w = b.width*(0.85 + (0.12-t)/0.12*0.15);
        else w = b.width*(1 - t*0.92);
        w = Math.max(0.3, w);
        ctx.lineWidth = w;
        ctx.globalAlpha = alpha*(0.55 + (1-t)*0.45);
        ctx.beginPath();
        ctx.moveTo(dpts[k].x, dpts[k].y);
        ctx.lineTo(dpts[k+1].x, dpts[k+1].y);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha*0.9;
      ctx.fillStyle = INK.nong;
      ctx.beginPath();
      ctx.arc(dpts[0].x, dpts[0].y, b.width*0.45, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }'''

new_orchid_leaf = '''    drawOrchidLeaf(ctx, b, dpts, strokeColor, alpha) {
      if (dpts.length < 2) return;
      const leafColor = b.leafTone === 'nong' ? INK.nong : INK.zhong;
      ctx.strokeStyle = leafColor;
      ctx.lineCap = 'round';
      const total = dpts.length-1;
      for (let k = 0; k < total; k++) {
        const t = k/total;
        let w;
        if (t < 0.1) {
          w = b.width * (0.9 + (0.1-t)/0.1*0.1);
        } else if (t < 0.2) {
          w = b.width * (1.0 - (t-0.1)/0.1*0.4);
        } else {
          w = b.width * (0.6 - (t-0.2)*0.55);
        }
        w = Math.max(0.3, w);
        ctx.lineWidth = w;
        ctx.globalAlpha = alpha*(0.5 + (1-t)*0.5);
        ctx.beginPath();
        ctx.moveTo(dpts[k].x, dpts[k].y);
        ctx.lineTo(dpts[k+1].x, dpts[k+1].y);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha*0.85;
      ctx.fillStyle = leafColor;
      ctx.beginPath();
      ctx.arc(dpts[0].x, dpts[0].y, b.width*0.5, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }'''

rep(old_orchid_leaf, new_orchid_leaf, 'drawOrchidLeaf')

# ── 11. drawOrchidFlowers ──
old_orchid_flowers = '''    drawOrchidFlowers(ctx, time, alpha) {
      let best = null, bestLen = 0;
      for (const b of this.branches) {
        if (b.kind === 'leaf' && b.length > bestLen) { bestLen = b.length; best = b; }
      }
      if (!best || best.points.length < 4) return;
      const positions = [Math.floor(best.points.length*0.45)];
      if (this.rand(55) > 0.5) positions.push(Math.floor(best.points.length*0.6));
      for (const idx of positions) {
        const p = best.points[idx];
        const sway = Math.sin(time*0.002+idx)*0.08;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(sway);
        ctx.fillStyle = INK.dan;
        for (let pet = 0; pet < 5; pet++) {
          const pa = (pet/5)*Math.PI*2;
          ctx.globalAlpha = 0.4*alpha;
          ctx.beginPath();
          ctx.ellipse(Math.cos(pa)*2, Math.sin(pa)*2, 1.6, 0.9, pa, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.fillStyle = INK.jiao;
        ctx.globalAlpha = 0.6*alpha;
        ctx.beginPath();
        ctx.arc(0, 0, 0.7, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }'''

new_orchid_flowers = '''    drawOrchidFlowers(ctx, time, alpha) {
      const leaves = this.branches.filter(function(b){ return b.kind === 'leaf'; });
      if (leaves.length < 2) return;
      leaves.sort(function(a,b){ return b.length - a.length; });
      const flowerCount = 2 + (this.rand(55) > 0.5 ? 1 : 0);
      for (let fi = 0; fi < flowerCount; fi++) {
        const leaf = leaves[fi % leaves.length];
        if (!leaf || leaf.points.length < 5) continue;
        const idx = Math.floor(leaf.points.length * (0.35 + this.rand(56+fi)*0.3));
        const p = leaf.points[idx];
        const sway = Math.sin(time*0.002+idx+fi)*0.08;
        const fsz = 2.5 + this.rand(57+fi)*1.0;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(sway);
        for (let pet = 0; pet < 5; pet++) {
          const pa = (pet/5)*Math.PI*2;
          ctx.fillStyle = fi === 0 ? INK.qing : INK.dan;
          ctx.globalAlpha = 0.35*alpha;
          ctx.beginPath();
          ctx.ellipse(Math.cos(pa)*fsz, Math.sin(pa)*fsz*0.7, fsz*0.55, fsz*0.35, pa, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.fillStyle = INK.jiao;
        ctx.globalAlpha = 0.5*alpha;
        ctx.beginPath();
        ctx.arc(0, 0, 0.6, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }'''

rep(old_orchid_flowers, new_orchid_flowers, 'drawOrchidFlowers')

# ── 12. drawGenericBranch — add fei bai texture ──
old_generic = '''    drawGenericBranch(ctx, b, dpts, strokeColor, alpha, layer, sp, pts, partial) {
      const pw = Math.max(0.5, b.width*0.5*layer.scale);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = pw;
      ctx.beginPath();
      ctx.moveTo(dpts[0].x, dpts[0].y);
      for (let k = 1; k < dpts.length; k++) ctx.lineTo(dpts[k].x, dpts[k].y);
      ctx.stroke();'''

new_generic = '''    drawGenericBranch(ctx, b, dpts, strokeColor, alpha, layer, sp, pts, partial) {
      const pw = Math.max(0.5, b.width*0.5*layer.scale);
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = 'round';
      const total = dpts.length - 1;
      for (let k = 0; k < total; k++) {
        const t = k / total;
        const w = Math.max(0.3, pw * (1 - t*0.35));
        ctx.lineWidth = w;
        ctx.globalAlpha = alpha * (0.85 + (1-t)*0.15);
        ctx.beginPath();
        ctx.moveTo(dpts[k].x, dpts[k].y);
        ctx.lineTo(dpts[k+1].x, dpts[k+1].y);
        ctx.stroke();
        if (this.rand(b.id*7+k*13) < 0.15 && total > 2) {
          ctx.globalAlpha = alpha * (0.25 + this.rand(b.id*8+k*17)*0.35);
          ctx.lineWidth = w * 0.35;
          const mx = (dpts[k].x+dpts[k+1].x)/2;
          const my = (dpts[k].y+dpts[k+1].y)/2;
          ctx.beginPath();
          ctx.moveTo(dpts[k].x, dpts[k].y);
          ctx.lineTo(mx, my);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = alpha;'''

rep(old_generic, new_generic, 'drawGenericBranch-texture')

# ── 13. drawPineBranch — add fei bai + moss density ──
old_pine_branch_start = '''    drawPineBranch(ctx, b, dpts, strokeColor, alpha, layer, pts, partial) {
      const pw = Math.max(0.6, b.width*0.5*layer.scale);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = pw;
      ctx.beginPath();
      ctx.moveTo(dpts[0].x, dpts[0].y);
      for (let k = 1; k < dpts.length; k++) ctx.lineTo(dpts[k].x, dpts[k].y);
      ctx.stroke();'''

new_pine_branch_start = '''    drawPineBranch(ctx, b, dpts, strokeColor, alpha, layer, pts, partial) {
      const pw = Math.max(0.6, b.width*0.5*layer.scale);
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = 'round';
      const total = dpts.length - 1;
      for (let k = 0; k < total; k++) {
        const t = k / total;
        const w = Math.max(0.4, pw * (1 - t*0.3));
        ctx.lineWidth = w;
        ctx.globalAlpha = alpha * (0.85 + (1-t)*0.15);
        ctx.beginPath();
        ctx.moveTo(dpts[k].x, dpts[k].y);
        ctx.lineTo(dpts[k+1].x, dpts[k+1].y);
        ctx.stroke();
        if (this.rand(b.id*7+k*13) < 0.15 && total > 2) {
          ctx.globalAlpha = alpha * (0.25 + this.rand(b.id*8+k*17)*0.35);
          ctx.lineWidth = w * 0.35;
          const mx = (dpts[k].x+dpts[k+1].x)/2;
          const my = (dpts[k].y+dpts[k+1].y)/2;
          ctx.beginPath();
          ctx.moveTo(dpts[k].x, dpts[k].y);
          ctx.lineTo(mx, my);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = alpha;'''

rep(old_pine_branch_start, new_pine_branch_start, 'drawPineBranch-texture')

# Increase moss density for pine (change 0.55 skip to 0.45)
rep(
    "if (this.rand(b.id*50+k) > 0.55) continue;",
    "if (this.rand(b.id*50+k) > 0.4) continue;",
    'pine-moss-density'
)

# Increase moss dot density (change 0.3 to 0.2)
rep(
    "if (this.rand(b.id*70+k) > 0.3) continue;",
    "if (this.rand(b.id*70+k) > 0.2) continue;",
    'pine-moss-dots'
)

# ── 14. draw() method — add mid-branch pine needles, plum blossoms, willow leaf dots ──
# Replace the leaf/blossom drawing section in draw()
old_leaf_section = '''        if (b.hasLeaf && partial >= 0.8 && layer.detailAlpha > 0.05
            && !(sp.name === '柳' && b.kind !== 'droop')) {
          const tip = dpts[dpts.length-1];
          const lx = tip.x, ly = tip.y;
          const sway = Math.sin(time*0.002+b.id+this.seed)*0.15;
          const leafAlpha = this.fade * layer.detailAlpha;
          if (sp.name === '松') {
            this.drawPineNeedles(ctx, b, lx, ly, sway, leafAlpha);
          } else if (sp.name === '竹') {
            this.drawBambooLeaves(ctx, b, lx, ly, sway, leafAlpha);
          } else if (sp.name === '梅') {
            this.drawPlumBlossom(ctx, b, lx, ly, sway, leafAlpha);
          }
        }'''

new_leaf_section = '''        if (b.hasLeaf && partial >= 0.8 && layer.detailAlpha > 0.05
            && !(sp.name === '柳' && b.kind !== 'droop')) {
          const tip = dpts[dpts.length-1];
          const lx = tip.x, ly = tip.y;
          const sway = Math.sin(time*0.002+b.id+this.seed)*0.15;
          const leafAlpha = this.fade * layer.detailAlpha;
          if (sp.name === '松') {
            this.drawPineNeedles(ctx, b, lx, ly, sway, leafAlpha);
            if (b.depth <= 2 && dpts.length >= 5) {
              for (let mi = 2; mi < dpts.length-2; mi += 2) {
                if (this.rand(b.id*100+mi) > 0.45) continue;
                const mp = dpts[mi];
                this.drawPineNeedles(ctx, b, mp.x, mp.y, sway, leafAlpha*0.8, 0.65);
              }
            }
          } else if (sp.name === '竹') {
            this.drawBambooLeaves(ctx, b, lx, ly, sway, leafAlpha);
          } else if (sp.name === '梅') {
            this.drawPlumBlossom(ctx, b, lx, ly, sway, leafAlpha);
            if (b.depth <= 3 && dpts.length >= 4) {
              let lastBx = lx, lastBy = ly;
              for (let mi = 1; mi < dpts.length-1; mi += 2) {
                if (this.rand(b.id*100+mi) > 0.35) continue;
                const mp = dpts[mi];
                const ddx = mp.x-lastBx, ddy = mp.y-lastBy;
                if (Math.sqrt(ddx*ddx+ddy*ddy) < 20) continue;
                this.drawPlumBlossom(ctx, b, mp.x, mp.y, sway, leafAlpha*0.85);
                lastBx = mp.x; lastBy = mp.y;
              }
            }
          }
        }'''

rep(old_leaf_section, new_leaf_section, 'draw-midbranch-decorations')

# ── 15. Starters ──
old_starters = '''    const starters = [
      { x:0.20, yRatio:0.72, si:0 },  // 竹 左中
      { x:0.72, yRatio:0.60, si:1 },  // 松 右中
      { x:0.55, yRatio:0.32, si:2 },  // 柳 中上
      { x:0.30, yRatio:0.30, si:3 },  // 梅 左上
      { x:0.82, yRatio:0.32, si:3 },  // 梅 右上
      { x:0.12, yRatio:0.78, si:4 },  // 兰 左下
    ];'''

new_starters = '''    const starters = [
      { x:0.72, yRatio:0.58, si:1 },
      { x:0.22, yRatio:0.72, si:0 },
      { x:0.12, yRatio:0.80, si:4 },
    ];'''

rep(old_starters, new_starters, 'starters')

# ── Write output ──
with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)

new_len = len(html)
print(f"\nOriginal: {original_len} bytes")
print(f"New: {new_len} bytes")
print(f"Delta: {new_len - original_len:+d} bytes")
print(f"Under 75KB: {new_len <= 75*1024}")
print(f"\nApplied {len(replacements)} replacements:")
for r in replacements:
    print(f"  - {r}")
