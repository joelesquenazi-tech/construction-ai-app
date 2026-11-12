const test=require('node:test'),assert=require('node:assert/strict'),{build}=require('../automatic-room.js');
const source={sha256:'original',raster_sha256:'raster',sheet_id:'floor',page:1};
const wall=(id,axis,points_px)=>({id,axis,points_px,apparent_width_px:10});
const measure=(id,text,axis,points_px)=>({id,text,dimension_evidence:{association_status:'candidate_unverified',axis,points_px,issues:[],endpoint_evidence:[{kinds:['witness_intersection']},{kinds:['witness_intersection']}]}});
function fixture(){return {floor:{source,candidates:[wall('t','h',[[145,65],[475,65]]),wall('b','h',[[145,331],[475,331]]),wall('l','v',[[145,65],[145,331]]),wall('r','v',[[475,65],[475,331]])],findings:[{id:'label',text:'TREATMENT',bbox:{x:240,y:160,width:60,height:12}},measure('length','10 FEET','h',[[150,350],[470,350]]),measure('width','8 FEET','v',[[110,70],[110,326]])]},elevations:[{source:{...source,sheet_id:'elevation'},findings:[{id:'e-label',text:'TREATMENT ELEVATION'},{id:'height',text:'CEILING HEIGHT 9 FEET'}]}]}}
test('automatically builds actual source-positioned shell without manual calibration or wall traces',()=>{
 const input=fixture(),r=build(input);assert.equal(r.status,'preliminary');assert.equal(r.walls.length,4);
 assert(Math.abs(r.clear_dimensions_m.length-3.048)<1e-9);assert(Math.abs(r.clear_dimensions_m.width-2.4384)<1e-9);assert(Math.abs(r.height.metres-2.7432)<1e-9);
 assert(r.walls.every(w=>w.origin==='automatic'&&w.verification==='unverified'&&w.evidence.source===source&&w.bounds_m.every(Number.isFinite)));
 assert.equal(r.scale.evidence.length,2);assert(r.issues.some(i=>i.code==='shell_only'));
});
test('parallel lines without a label or independent dimensions cannot become geometry',()=>{
 for(const missing of ['label','length','width']){const f=fixture();f.floor.findings=f.floor.findings.filter(x=>x.id!==missing);assert.equal(build(f).walls.length,0,missing)}
});
test('same-axis, ambiguous, unsupported or contradictory dimension evidence stays unresolved',()=>{
 for(const mutate of [f=>f.floor.findings[2].dimension_evidence.axis='h',f=>f.floor.findings[1].dimension_evidence.association_status='ambiguous',f=>f.floor.findings[1].dimension_evidence.issues=['compact_endpoint_marks_require_review'],f=>f.floor.findings[2].text='12 FEET']){
  const f=fixture();mutate(f);assert.equal(build(f).status,'unresolved');
 }
});
test('no guessed height, ceiling datum conversion, elevation ownership or conflict resolution',()=>{
 for(const notes of [[{text:'TREATMENT ELEVATION'}],[{text:'BEDROOM ELEVATION'},{text:'CEILING HEIGHT 9 FEET'}],[{text:'TREATMENT'},{text:'TOP OF WALL 109 FEET'}],[{text:'TREATMENT'},{text:'CEILING HEIGHT 9 FEET'},{text:'CEILING HEIGHT 10 FEET'}]]){
  const f=fixture();f.elevations[0].findings=notes;assert.equal(build(f).walls.length,0);
 }
});
test('broken walls, internal wall proposals and existing corrections block reconstruction',()=>{
 let f=fixture();f.floor.candidates[0].points_px[1][0]=360;assert.equal(build(f).walls.length,0);
 f=fixture();f.floor.candidates.push(wall('interior','h',[[200,220],[400,220]]));assert.equal(build(f).walls.length,0);
 f=fixture();f.hasCorrections=true;assert.equal(build(f).issues[0].code,'corrections');
});
test('two dimensioned rooms cannot be silently reduced to the first room',()=>{
 const f=fixture(),copy=fixture();
 for(const c of copy.floor.candidates){c.id+='2';c.points_px=c.points_px.map(p=>[p[0]+600,p[1]])}
 for(const n of copy.floor.findings){n.id+='2';if(n.bbox)n.bbox.x+=600;if(n.dimension_evidence)n.dimension_evidence.points_px=n.dimension_evidence.points_px.map(p=>[p[0]+600,p[1]])}
 f.floor.candidates.push(...copy.floor.candidates);f.floor.findings.push(...copy.floor.findings);
 assert.equal(build(f).issues[0].code,'multiple_rooms');
});

test('diagonal mislabeled boundaries and multiple elevation room labels are refused',()=>{
 let f=fixture();f.floor.candidates[0].points_px[1][1]+=20;assert.equal(build(f).status,'unresolved');
 f=fixture();f.elevations[0].findings.push({text:'BEDROOM ELEVATION'});assert.equal(build(f).status,'unresolved');
});
