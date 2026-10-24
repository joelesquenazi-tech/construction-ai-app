const test=require('node:test');
const assert=require('node:assert/strict');
const source=require('../drawing-image-source.js');

test('jpg/png preserved without conversion',async()=>{
 const jpg={name:'A101.jpg',type:'image/jpeg',size:120};
 const result=await source.prepare(jpg);
 assert.equal(result.blob,jpg);
 assert.equal(result.page,1);
 assert.equal(result.converted,false);
});
test('pdf page is rendered using the LOCAL available PDF.js engine',async()=>{
 const old=global.constructionAIPdf;
 global.constructionAIPdf={prepare:async(file,page)=>{
  assert.equal(file.name,'A101.pdf');assert.equal(page,'1');
  return [{blob:{type:'image/png'},width:1400,height:800,page:1,pageCount:3}];
 }};
 try{
  const result=await source.prepare({name:'A101.pdf',type:'application/pdf',size:2000});
  assert.equal(result.converted,true);
  assert.equal(result.sourceName,'A101.pdf');
  assert.equal(result.pageCount,3);
  assert.equal(result.blob.type,'image/png');
 }finally{global.constructionAIPdf=old}
});
test('unsupported drawing does not silently become an image',async()=>{
 await assert.rejects(source.prepare({name:'model.dwg',type:'application/dwg'}),/Supported/);
 await assert.rejects(source.prepare(null),/No floor/);
 await assert.rejects(source.prepare({name:'a.pdf',type:'application/pdf'},{page:0}),/page/);
});
test('title heuristics warn about ceiling and elevation but do not assert classification',()=>{
 assert.match(source.sourceWarning('CGA DSK-023 SPA AREA CEILING HEIGHTS.pdf'),/suggests/);
 assert.match(source.sourceWarning('A-201 SOUTH ELEVATION.pdf'),/elevation/);
 assert.equal(source.sourceWarning('A101 GROUND FLOOR PLAN.pdf'),'');
});
test('unavailable PDF engine causes clear error',async()=>{
 const old=global.constructionAIPdf;delete global.constructionAIPdf;
 try{await assert.rejects(source.prepare({name:'A101.pdf',type:'application/pdf'}),/renderer is unavailable/)}
 finally{global.constructionAIPdf=old}
});