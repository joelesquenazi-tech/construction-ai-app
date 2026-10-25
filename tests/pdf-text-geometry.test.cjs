const test=require('node:test');
const assert=require('node:assert/strict');
const pdf=require('../pdf-text-geometry.js');
const review=require('../finding-review.js');
const viewport=[1,0,0,-1,0,500];
const item=(str='19′-0″')=>({
 str,transform:[12,0,0,12,100,400],width:54,height:12
});
const input=(items=[item()])=>({items,transform:viewport,width:800,height:500});

test('local PDF text uses the rendered page pixel coordinates',()=>{
 const out=pdf.nativeFindings(input(),'A101');
 assert.equal(out.length,1);
 assert.equal(out[0].text,'19′-0″');
 assert.deepEqual(out[0].bbox,{x:100,y:88,width:54,height:12});
 assert.equal(out[0].x,100);
 assert.equal(out[0].y,88);
 assert.equal(out[0].source_kind,'pdf_embedded_text');
 assert.equal(out[0].confidence,null);
 assert.equal(out[0].status,'pending');
});
test('text positions scale exactly with rendered PDF viewport',()=>{
 const small=pdf.textBox(item(),viewport,800,500);
 const doubled=pdf.textBox(item(),[2,0,0,-2,0,1000],1600,1000);
 assert.deepEqual(doubled,{x:small.x*2,y:small.y*2,width:small.width*2,height:small.height*2});
});
test('rotated PDF text remains inside a bounded source rectangle',()=>{
 const rotated={...item('ROOM'),transform:[0,12,-12,0,100,400],width:30,height:12};
 assert.deepEqual(pdf.textBox(rotated,viewport,800,500),{x:88,y:70,width:12,height:30});
});
test('coordinates are clipped at image edges and never NaN',()=>{
 const clipped={...item('NOTE'),transform:[12,0,0,12,-5,495],width:30,height:12};
 assert.deepEqual(pdf.textBox(clipped,viewport,800,500),{x:0,y:0,width:25,height:5});
 assert.equal(pdf.textBox({...item(),width:NaN},viewport,800,500),null);
 assert.equal(pdf.textBox({...item(),transform:[0,0,0,0,0,0]},viewport,800,500),null);
});
test('empty PDF text and whitespace are skipped',()=>{
 const result=pdf.nativeFindings(input([{...item('   ')}, {...item('Valid')}]),'A101');
 assert.equal(result.length,1);
 assert.equal(result[0].text,'Valid');
});
test('native PDF text is review-only, with no fake OCR confidence',()=>{
 assert.equal(review.confidence(null),'Not measured');
 assert.equal(review.confidence(undefined),'Not measured');
 assert.equal(review.confidence(''),'Not measured');
 assert.equal(review.needsCare(null),false);
 assert.equal(review.needsCare(undefined),false);
 assert.equal(review.confidence(24.348),'24.3%');
 assert.equal(review.needsCare(24.348),true);
});
test('wrong viewport or missing source metadata is rejected',()=>{
 assert.throws(()=>pdf.multiply([1,0,0,1,0],[1,0,0,1,0,0]),/transform/i);
 assert.throws(()=>pdf.nativeFindings({items:[],transform:viewport,width:0,height:500},'A101'),/result/i);
 assert.throws(()=>pdf.nativeFindings(input(),''),/result/i);
});
test('native findings stop at safe limit on very dense PDF text',()=>{
 const items=Array.from({length:300},()=>item('TEXT'));
 const found=pdf.nativeFindings(input(items),'A101',100);
 assert.equal(found.length,100);
 assert.ok(found.every(x=>x.source_kind==='pdf_embedded_text'));
 assert.equal(new Set(found.map(x=>x.id)).size,100);
});
