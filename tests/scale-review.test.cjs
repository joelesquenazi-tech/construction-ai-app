const test=require('node:test');
const assert=require('node:assert/strict');
const {validateScaleReview,candidateBounds,SCHEMA}=require('../scale-review.js');

function fixture(){
 return {
  schema:SCHEMA,status:'provisional',automatic_confirmation:false,
  ready_for_verified_3d:false,metres_per_original_image_pixel:0.01,
  source:{filename:'A101.png',sheet:'A101',revision:'R1',page:1,
   width_px:800,height_px:500},
  observations:[{
   id:'A101:R1:p1:ocr1',label:'19\'-0"',axis:'h',
   points_px:[[60,70],[630,70]],label_box_px:[300,45,54,12],
   ocr_confidence:96,association_status:'candidate_unverified'
  }],issues:[]
 };
}
function clone(v){return JSON.parse(JSON.stringify(v))}
test('valid unverified source evidence may be inspected',()=>{
 const x=fixture();
 assert.equal(validateScaleReview(x,'A101.png'),x);
 assert.deepEqual(candidateBounds(x.observations[0]),{x:345,y:70});
});
test('wrong drawing filename is rejected',()=>{
 assert.throws(()=>validateScaleReview(fixture(),'A102.png'),/filename|source/i);
});
test('wrong page or invalid size rejected',()=>{
 const x=fixture();x.source.page=2;
 assert.throws(()=>validateScaleReview(x,'A101.png'),/source/i);
 const y=fixture();y.source.width_px=0;
 assert.throws(()=>validateScaleReview(y,'A101.png'),/source/i);
});
test('verified or auto confirmed results are never accepted',()=>{
 for(const [key,value] of [
  ['automatic_confirmation',true],['ready_for_verified_3d',true],
  ['status','verified_against_available_evidence']]){
  const x=fixture();x[key]=value;
  assert.throws(()=>validateScaleReview(x,'A101.png'),/unverified|evidence/i);
 }
});
test('inconsistent needs-review scale is rejected',()=>{
 const x=fixture();x.status='needs_review';
 assert.throws(()=>validateScaleReview(x,'A101.png'),/scale/i);
 x.metres_per_original_image_pixel=null;
 assert.equal(validateScaleReview(x,'A101.png'),x);
});
test('pixel endpoints must fit exact original drawing',()=>{
 const x=fixture();x.observations[0].points_px[0][0]=801;
 assert.throws(()=>validateScaleReview(x,'A101.png'),/candidate/i);
});
test('zero span and invalid rectangle rejected',()=>{
 const x=fixture();x.observations[0].points_px=[[60,70],[60,70]];
 assert.throws(()=>validateScaleReview(x,'A101.png'),/candidate/i);
 const y=fixture();y.observations[0].label_box_px=[780,40,54,12];
 assert.throws(()=>validateScaleReview(y,'A101.png'),/candidate/i);
});
test('duplicates and excessive counts rejected',()=>{
 const x=fixture();x.observations.push(clone(x.observations[0]));
 assert.throws(()=>validateScaleReview(x,'A101.png'),/duplicate/i);
 const y=fixture();y.observations=Array.from({length:251},()=>clone(y.observations[0]));
 assert.throws(()=>validateScaleReview(y,'A101.png'),/list/i);
});
test('numeric confidence must be in range',()=>{
 const x=fixture();x.observations[0].ocr_confidence=101;
 assert.throws(()=>validateScaleReview(x,'A101.png'),/candidate/i);
});
test('malicious-looking text stays ordinary review data',()=>{
 const x=fixture();x.observations[0].label='<script>alert(1)</script>';
 assert.equal(validateScaleReview(x,'A101.png'),x);
});
