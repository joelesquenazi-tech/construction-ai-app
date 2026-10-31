const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../dimension-evidence.js');
const source=(width=400,height=240)=>({sha256:'a'.repeat(64),raster_sha256:'b'.repeat(64),filename:'synthetic.png',sheet_id:'room__A101',sheet:'A101',page:1,revision:null,project_id:'p',room_id:'r',width_px:width,height_px:height});
function raster(w=400,h=240){return Array.from({length:h},()=>new Uint8Array(w))}
function line(rows,a,b){
 for(let y=Math.min(a[1],b[1]);y<=Math.max(a[1],b[1]);y++)for(let x=Math.min(a[0],b[0]);x<=Math.max(a[0],b[0]);x++)rows[y][x]=1;
}
function fixture(){
 const rows=raster();
 line(rows,[50,90],[350,90]);line(rows,[50,78],[50,130]);line(rows,[350,78],[350,130]);
 return {rows,findings:[{id:'d1',text:'19′-0″',bbox:{x:150,y:55,width:70,height:16},confidence:94,status:'pending',correction:''}]};
}
test('explicit imperial and metric labels retain canonical measurements and unverified status',()=>{
 const cases=[["19'-0\"",5.7912],['6′-7 1/2″',2.0193],['6′-7½″',2.0193],['½″',.0127],['1/64 in',.000396875],['12 FEET',3.6576],['2.5 ft',.762],['1200 mm',1.2],['120 cm',1.2],['1.2 m',1.2]];
 for(const [s,m]of cases){const out=core.parseMeasurement(s);assert(out,s);assert(Math.abs(out.metres-m)<1e-9,s);assert.equal(out.reading_status,'unverified')}
});
test('scale ratios, implicit units, notes, datums and invalid fractions are not linear dimensions',()=>{
 for(const s of ['1/4" = 1\'-0"','1200','NTS','12 FEET AFF','PRIMARY BEDROOM 12 FEET','+10\'-0"','Ø 6"','R 6"','2 × 4"','19\'-12"','1 3/2"','1/0"','0 mm','9000000 m','3/5"','1.5\'-2"'])assert.equal(core.parseMeasurement(s),null,s);
});
test('a labeled span with two perpendicular witness crossings is a proposal only',()=>{
 const f=fixture(),before=JSON.stringify(f.findings),out=core.enrich(f.findings,f.rows,source());
 assert.equal(JSON.stringify(f.findings),before);
 const e=out[0].dimension_evidence;
 assert.equal(e.association_status,'candidate_unverified');assert.equal(e.geometry_status,'unverified');
 assert.deepEqual(e.points_px,[[50,90],[350,90]]);assert.equal(out[0].status,'pending');
 assert.equal(out[0].source.revision,null);assert.equal(out[0].source.sha256,'a'.repeat(64));
 assert.equal(out[0].scale,undefined);assert.equal(e.metres_per_original_image_pixel,undefined);
});
test('ordinary isolated lines and one witness cannot establish dimension endpoints',()=>{
 const f=fixture();for(const row of f.rows)row[350]=0;
 const e=core.enrich(f.findings,f.rows,source())[0].dimension_evidence;
 assert.equal(e.association_status,'unassociated');assert.equal(e.points_px,null);
});
test('several plausible nearby spans remain ambiguous without choosing the nearest',()=>{
 const f=fixture();line(f.rows,[50,96],[350,96]);
 const e=core.enrich(f.findings,f.rows,source())[0].dimension_evidence;
 assert.equal(e.association_status,'ambiguous');assert.equal(e.points_px,null);assert.equal(e.alternatives.length,2);
});
test('an interrupted dimension baseline may bridge its own source label',()=>{
 const f=fixture();f.rows=raster();
 line(f.rows,[50,64],[145,64]);line(f.rows,[225,64],[350,64]);
 line(f.rows,[50,50],[50,100]);line(f.rows,[350,50],[350,100]);
 assert.deepEqual(core.enrich(f.findings,f.rows,source())[0].dimension_evidence.points_px,[[50,64],[350,64]]);
});
test('vertical associations preserve the same coordinate convention',()=>{
 const rows=raster(240,400);line(rows,[90,50],[90,350]);line(rows,[78,50],[130,50]);line(rows,[78,350],[130,350]);
 const findings=[{text:'1200 mm',bbox:{x:55,y:150,width:16,height:70}}];
 const e=core.enrich(findings,rows,source(240,400))[0].dimension_evidence;
 assert.equal(e.axis,'v');assert.deepEqual(e.points_px,[[90,50],[90,350]]);
});
test('resizing maps endpoints back to original pixels independently in each axis',()=>{
 const f=fixture();f.findings[0].bbox={x:300,y:165,width:140,height:48};
 const e=core.enrich(f.findings,f.rows,source(800,720))[0].dimension_evidence;
 assert.deepEqual(e.points_px,[[100,270],[700,270]]);assert.deepEqual(e.label_box_px,f.findings[0].bbox);
});
test('missing or clipped OCR boxes remain reading-only evidence',()=>{
 for(const bbox of [null,{x:390,y:55,width:70,height:16},{x:NaN,y:55,width:70,height:16}]){
  const f=fixture();f.findings[0].bbox=bbox;
  const e=core.enrich(f.findings,f.rows,source())[0].dimension_evidence;
  assert.equal(e.points_px,null);assert.deepEqual(e.issues,['missing_or_invalid_text_box']);
 }
 assert.deepEqual(core.ocrBox({x0:10,y0:20,x1:50,y1:35}),{x:10,y:20,width:40,height:15});
 assert.equal(core.ocrBox({x0:10,y0:20,x1:5,y1:35}),null);
});
test('a changed revision, page, same-size image, project or room invalidates source equality',()=>{
 const original=source();assert(core.sameSource(original,{...original}));
 for(const key of ['sha256','raster_sha256','filename','sheet_id','page','revision','project_id','room_id','width_px','height_px'])assert(!core.sameSource(original,{...original,[key]:'changed'}),key);
 assert(!core.sameSource({},{}));
});
test('unrelated text preserves review decisions and obtains provenance without dimension claims',()=>{
 const f=fixture();f.findings[0].text='PRIMARY BEDROOM';f.findings[0].status='rejected';
 const out=core.enrich(f.findings,f.rows,source())[0];
 assert.equal(out.status,'rejected');assert.equal(out.dimension_evidence,undefined);assert.equal(out.source.page,1);
});
test('unbounded and malformed rasters are rejected',()=>{
 assert.throws(()=>core.segments([]),/bounded/);assert.throws(()=>core.segments([new Uint8Array(1801)]),/bounded/);
 assert.throws(()=>core.segments([new Uint8Array(20),new Uint8Array(19)]),/bounded/);
});
