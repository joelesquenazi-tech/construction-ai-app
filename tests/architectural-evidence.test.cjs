const test=require('node:test'),assert=require('node:assert/strict'),a=require('../architectural-evidence');
const source={sha256:'x',page:1,width_px:400,height_px:300};
const regions=[{id:'left',source,bbox:{x:0,y:0,width:180,height:300}},{id:'right',source,bbox:{x:220,y:0,width:180,height:300}}];
test('recognizes explicit architectural vocabulary and retains mixed assemblies',()=>{
 for(const [text,category] of [['CMU WALL','wall'],['POCKET DOOR','door'],['WINDOW HEAD','window'],['CABINET SHELVING','millwork'],['CEILING SOFFIT','ceiling'],['STONE VENEER','finish']])assert(a.classify(text).categories.includes(category));
 assert.deepEqual(a.classify('STONE COUNTERTOP').categories,['millwork','finish']);assert.equal(a.classify('P-L04').kind,'unknown');
});
test('dimensions and titles do not become architectural elements',()=>{
 assert.equal(a.classify('9 FEET').kind,'dimension_text');assert.equal(a.classify('TREATMENT CEILING PLAN').kind,'architectural_note');assert.equal(a.classify('REFLECTED CEILING PLAN').kind,'view_title');
});
test('references and negative/existing conditions cannot establish element presence',()=>{
 assert(a.classify('SEE DOOR SCHEDULE').reference_only);assert(a.classify('NO SOFFIT').condition_requires_interpretation);assert(a.classify('REMOVE EXISTING CABINET').condition_requires_interpretation);
});
test('ownership stays source scoped; label boxes never become geometry',()=>{
 const f=[{id:'wall',text:'CMU WALL',bbox:{x:10,y:10,width:80,height:10}},{id:'cross',text:'DOOR',bbox:{x:170,y:20,width:60,height:10}}];
 const before=JSON.stringify(f),r=a.analyze(regions,f,source);assert.equal(r.regions[0].category_counts.wall,1);assert.equal(r.regions[1].category_counts.door,undefined);assert.equal(r.evidence[1].ownership,'unassigned');assert(r.evidence.every(e=>e.element_geometry===null));assert.equal(JSON.stringify(f),before);assert.throws(()=>a.analyze(regions,f,{...source,sha256:'new'}));
});
function leaderFixture(){const rows=Array.from({length:150},()=>new Uint8Array(200));rows[25].fill(1,51,76);return {rows,regions:[{id:'view',source,bbox:{x:0,y:0,width:400,height:300}}],findings:[{id:'note',text:'CMU WALL',bbox:{x:20,y:40,width:80,height:20}}]}}
test('raster leader proposal preserves original-page endpoint without assigning an element',()=>{
 const f=leaderFixture(),r=a.leaders(f.rows,f.regions,f.findings,source);assert.equal(r.links[0].status,'candidate_unverified');assert.deepEqual(r.links[0].paths[0].points_px,[[102,50],[150,50]]);assert.equal(r.links[0].target_element_id,null);assert.equal(r.geometry_ready,false);
});
test('crossing text and crossing view boundaries cannot attach leaders',()=>{
 let f=leaderFixture();f.findings.push({id:'other',text:'9 FEET',bbox:{x:120,y:45,width:20,height:10}});assert.equal(a.leaders(f.rows,f.regions,f.findings,source).links[0].status,'unresolved');
 f=leaderFixture();f.regions[0].bbox.width=130;assert.equal(a.leaders(f.rows,f.regions,f.findings,source).links[0].status,'unresolved');
});
test('two strokes or one stroke shared by two notes remain ambiguous',()=>{
 let f=leaderFixture();f.rows[28].fill(1,51,76);assert.equal(a.leaders(f.rows,f.regions,f.findings,source).links[0].status,'ambiguous');
 f=leaderFixture();f.findings.push({id:'right',text:'STONE',bbox:{x:154,y:40,width:50,height:20}});assert(a.leaders(f.rows,f.regions,f.findings,source).links.every(l=>l.status==='ambiguous'));
});
test('missing leaders and reference notes do not fabricate targets',()=>{
 const f=leaderFixture();f.rows[25].fill(0);assert.equal(a.leaders(f.rows,f.regions,f.findings,source).links[0].status,'unresolved');f.findings[0].text='SEE WALL DETAIL';assert.equal(a.leaders(f.rows,f.regions,f.findings,source).links.length,0);
});
