// Generic synthetic linework, not copied drawing crops or private coordinates.
const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../dimension-evidence.js');
const source=(w,h)=>({sha256:'a'.repeat(64),raster_sha256:'b'.repeat(64),filename:'synthetic.png',sheet_id:'A101',sheet:'A101',page:1,revision:null,project_id:'p',room_id:'r',width_px:w,height_px:h});
function raster(w,h){return Array.from({length:h},()=>new Uint8Array(w))}
function line(rows,a,b,width=1){
 let [x,y]=a;const dx=Math.abs(b[0]-x),sx=x<b[0]?1:-1,dy=-Math.abs(b[1]-y),sy=y<b[1]?1:-1;let error=dx+dy;
 for(;;){
  const radius=Math.floor(width/2);for(let yy=y-radius;yy<=y+radius;yy++)for(let xx=x-radius;xx<=x+radius;xx++)if(rows[yy]&&xx>=0&&xx<rows[0].length)rows[yy][xx]=1;
  if(x===b[0]&&y===b[1])break;const twice=2*error;if(twice>=dy){error+=dy;x+=sx}if(twice<=dx){error+=dx;y+=sy}
 }
}
function chain({axis='h',sign=1,width=1,marks=[40,300,316],witness=false}={}){
 const rows=raster(axis==='h'?400:220,axis==='h'?220:400),point=(along,across)=>axis==='h'?[along,across]:[across,along],fixed=96;
 line(rows,point(marks[0],fixed),point(marks.at(-1),fixed),width);
 for(const p of marks){line(rows,point(p-4, fixed-sign*4),point(p+4,fixed+sign*4),width);if(witness)line(rows,point(p,78),point(p,120),width)}
 const box=(start,length)=>axis==='h'?{x:start,y:76,width:length,height:12}:{x:76,y:start,width:12,height:length};
 return {rows,point,marks,fixed,findings:[{id:'long',text:'12 FEET',bbox:box(140,70),status:'pending'},{id:'short',text:'6"',bbox:box(305,6),status:'pending'}]};
}
function run(f){return c.enrich(f.findings,f.rows,source(f.rows[0].length,f.rows.length))}
function near(actual,expected,tolerance=1.5){assert(actual,'No span proposed');assert.equal(actual.length,2);actual.forEach((p,i)=>assert(Math.hypot(p[0]-expected[i][0],p[1]-expected[i][1])<=tolerance,JSON.stringify({actual,expected})))}
for(const axis of ['h','v'])for(const sign of [1,-1])test(axis+' chain uses adjacent '+(sign===1?'positive':'negative')+' slash ticks, including a short final span',()=>{
 const f=chain({axis,sign}),out=run(f);for(const e of out.map(x=>x.dimension_evidence)){assert.equal(e.association_status,'candidate_unverified');assert.equal(e.geometry_status,'unverified');assert.equal(e.algorithm_version,2)}
 near(out[0].dimension_evidence.points_px,[f.point(40,96),f.point(300,96)]);near(out[1].dimension_evidence.points_px,[f.point(300,96),f.point(316,96)]);
 assert(out.every(f=>f.status==='pending'&&f.scale===undefined));
});
test('tick markers accompanied by extension lines retain their own spans',()=>{
 const f=chain({axis:'v',witness:true}),out=run(f);
 near(out[0].dimension_evidence.points_px,[[96,40],[96,300]]);near(out[1].dimension_evidence.points_px,[[96,300],[96,316]]);
 assert(out[0].dimension_evidence.endpoint_evidence.every(e=>e.kinds.includes('diagonal_tick')));
});
test('thicker raster strokes do not create duplicate neighboring tick spans',()=>{
 const f=chain({width:3}),out=run(f);assert.equal(out[0].dimension_evidence.association_status,'candidate_unverified');near(out[0].dimension_evidence.points_px,[[40,96],[300,96]],2);
});
test('two possible dimension baselines remain ambiguous',()=>{
 const f=chain();for(const p of [40,300])line(f.rows,[p,104],[p,130]);line(f.rows,[40,116],[300,116]);
 const e=run(f)[0].dimension_evidence;assert.equal(e.association_status,'ambiguous');assert.equal(e.points_px,null);
});
test('bare lines, one tick and one-sided diagonal spurs are insufficient',()=>{
 for(const kind of ['bare','one','spurs']){
  const f=chain();f.rows=raster(400,220);f.findings=f.findings.slice(0,1);line(f.rows,[40,96],[300,96]);
  if(kind==='one')line(f.rows,[36,92],[44,100]);
  if(kind==='spurs')for(const p of [40,300])line(f.rows,[p,96],[p+6,102]);
  const e=run(f)[0].dimension_evidence;assert.equal(e.points_px,null,kind);
 }
});
test('dense repeated hatching without supporting measurement labels is not a dimension chain',()=>{
 const f=chain({marks:Array.from({length:16},(_,i)=>24+i*16)});f.findings=[{id:'nearby-text',text:'6"',bbox:{x:142,y:76,width:6,height:12},status:'pending'}];
 assert.notEqual(run(f)[0].dimension_evidence.association_status,'candidate_unverified');
});
test('a longer fully labeled chain remains usable',()=>{
 const marks=[30,80,130,180,230,280,330],f=chain({marks});f.findings=marks.slice(0,-1).map((p,i)=>({id:'d'+i,text:'2 FEET',bbox:{x:p+17,y:76,width:16,height:12},status:'pending'}));
 const out=run(f);assert.equal(out.filter(x=>x.dimension_evidence.association_status==='candidate_unverified').length,6);
 out.forEach((x,i)=>near(x.dimension_evidence.points_px,[[marks[i],96],[marks[i+1],96]]));
});
test('cross-shaped decorations and continuing diagonal hatch lines do not become tick endpoints',()=>{
 for(const kind of ['cross','long']){
  const f=chain();f.findings=f.findings.slice(0,1);
  if(kind==='cross')for(const p of [40,300])line(f.rows,[p-4,100],[p+4,92]);
  else for(const p of [40,300])line(f.rows,[p-20,76],[p+20,116]);
  assert.notEqual(run(f)[0].dimension_evidence.association_status,'candidate_unverified',kind);
 }
});
test('ticks inside text boxes are excluded and labels crossing an endpoint are not stretched',()=>{
 const f=chain();f.findings[0].bbox={x:290,y:76,width:22,height:12};
 assert.equal(run(f)[0].dimension_evidence.points_px,null);
 const g=chain();g.findings.push({id:'mask',text:'NOTE',bbox:{x:25,y:86,width:30,height:20},status:'pending'});assert.equal(run(g)[0].dimension_evidence.points_px,null);
});
test('axis-specific scale factors map tick endpoints and their support back to the original page',()=>{
 const f=chain({axis:'v'}),s=source(660,800);f.findings=f.findings.map(x=>({...x,bbox:{x:x.bbox.x*3,y:x.bbox.y*2,width:x.bbox.width*3,height:x.bbox.height*2}}));
 const out=c.enrich(f.findings,f.rows,s);near(out[1].dimension_evidence.points_px,[[288,600],[288,632]],3);
});
for(const axis of ['h','v'])test(axis+' compact off-baseline pixel pairs stay explicit review-only evidence',()=>{
 const f=chain({axis});f.rows=raster(f.rows[0].length,f.rows.length);line(f.rows,f.point(40,96),f.point(316,96));
 for(const p of f.marks)line(f.rows,f.point(p-1,95),f.point(p+1,97));
 const out=run(f);near(out[1].dimension_evidence.points_px,[f.point(300,96),f.point(316,96)]);
 assert(out[1].dimension_evidence.endpoint_evidence.every(e=>e.resolution==='compact_pixel_mark'));
 assert(out[1].dimension_evidence.issues.includes('compact_endpoint_marks_require_review'));
 assert.equal(out[1].dimension_evidence.geometry_status,'unverified');
});
test('analysis preserves bounded native PDF detail and respects both side and area limits',()=>{
 assert.deepEqual(c.analysisSize(2300,1700),{width:2300,height:1700});
 for(const [w,h]of [[10000,10000],[10000,1000],[1,200000],[2400,2400]]){
  const s=c.analysisSize(w,h);assert(s.width<=2400&&s.height<=2400);assert(s.width*s.height<=4200000);assert(s.width>0&&s.height>0);
 }
 assert.throws(()=>c.analysisSize(NaN,10),/dimensions/);
 const row=new Uint8Array(2300);assert.throws(()=>c.segments(Array.from({length:2300},()=>row)),/bounded/);
});
