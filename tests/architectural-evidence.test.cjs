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
