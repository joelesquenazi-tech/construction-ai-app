const {test}=require('node:test');
const assert=require('node:assert/strict');
const vision=require('../vision-proposals.js');
const source=()=>({projectId:'project',roomId:'room',sheetId:'A101',page:2,revision:'R1',imageSha256:'a'.repeat(64),originalWidth:4480,originalHeight:3051,crop:{x:1000,y:500,width:2000,height:1000}});
const response=()=>({schema:'site-resolved-vision-v1',model:'qwen3-vl:4b-instruct',result:{drawingType:'floor_plan',summary:'Synthetic fixture',warnings:[],proposals:[{kind:'wall',label:'Possible wall',bbox:[100,200,300,400],evidenceText:'',uncertainties:['Thickness unknown']}]}});

test('model boxes map through crop to original drawing pixels, independent of displayed size',()=>{
  const s=source(), run=vision.buildRun(response(),s,'run');
  assert.deepEqual(run.proposals[0].bbox,{x:1200,y:700,width:400,height:200});
  s.crop.x=0; assert.equal(run.source.crop.x,1000);
  assert.equal(run.proposals[0].geometryState,'not_modeled');
  assert.equal(run.proposals[0].validationState,'unverified');
});
test('unknown revisions remain unknown and source keys isolate project, page, revision and exact image',()=>{
  const a=source(), key=vision.sourceKey(a);
  for(const [field,value] of [['projectId','other'],['roomId','other'],['sheetId','other'],['page',3],['revision',null],['imageSha256','b'.repeat(64)]]) assert.notEqual(vision.sourceKey({...a,[field]:value}),key);
});
test('out-of-range, inverted, NaN, zero size or fabricated geometry fields reject the result',()=>{
  for(const box of [[-1,0,20,20],[0,0,1001,20],[20,0,0,20],[1,1,1,2],[0,0,NaN,20]]){
    const r=response();r.result.proposals[0].bbox=box;assert.throws(()=>vision.buildRun(r,source(),'run'));
  }
  const r=response();r.result.proposals[0].verified=true;assert.throws(()=>vision.buildRun(r,source(),'run'));
  assert.throws(()=>vision.sourceKey({...source(),crop:{x:4000,y:0,width:2000,height:1000}}));
});
test('keep/reject/reset persist interpretation choices without promoting AI to verified geometry',()=>{
  const run=vision.buildRun(response(),source(),'run');
  for(const decision of ['kept_for_review','rejected','unreviewed']){
    const next=vision.review(run,'run-0',decision);
    assert.equal(next.proposals[0].reviewState,decision);
    assert.equal(next.proposals[0].geometryState,'not_modeled');
    assert.equal(next.proposals[0].validationState,'unverified');
  }
  assert.equal(run.proposals[0].reviewState,'unreviewed');
  assert.throws(()=>vision.review(run,'run-0','verified'));
});
test('empty proposals are valid and never establish absence',()=>{
  const r=response();r.result.proposals=[];
  assert.deepEqual(vision.buildRun(r,source(),'run').proposals,[]);
});
