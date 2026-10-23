const test=require('node:test');
const assert=require('node:assert/strict');
const review=require('../wall-review-state.js');
const source={scope:'project-x:room-y',floorName:'A101.png',
 file:{size:1234,lastModified:1723000000}};
const width=4480,height=3051;
const signature=review.sourceSignature(source,width,height);
const start=()=>review.createReview(signature);
const candidate={axis:'h',points_px:[[15,30],[100,30]],apparent_width_px:8};
test('source identity preserves per-room drawing and original source geometry',()=>{
 assert.equal(review.sourceSignature(source,width,height),signature);
 assert.notEqual(review.sourceSignature({...source,scope:'another-room'},width,height),signature);
 assert.notEqual(review.sourceSignature(source,width,height+1),signature);
 assert.notEqual(review.sourceSignature({...source,file:{size:1235,lastModified:1723000000}},width,height),signature);
 assert.ok(review.validateReview(start(),signature,width,height));
 assert.equal(review.validateReview(start(),'different-plan',width,height),false);
});
test('proposals remap reduced raster coordinates to original drawing pixels',()=>{
 const c=review.toSourceCandidate(candidate,280,190,width,3040);
 assert.deepEqual(c.points_px,[[240,480],[1600,480]]);
 assert.equal(c.status,undefined); // source candidate not promoted to human confirmed
 assert.equal(c.review,'unreviewed');
 assert.ok(c.id.startsWith('auto:h:'));
 const d=review.toSourceCandidate(candidate,280,190,width,3040);
 assert.equal(c.id,d.id);
});
test('confirm and reject persisted as independent 2D choices with counts',()=>{
 const a=review.toSourceCandidate(candidate,280,190,width,3040);
 const b=review.toSourceCandidate({...candidate,axis:'v',points_px:[[25,20],[25,95]]},280,190,width,3040);
 let st=start();
 st=review.transact(st,{type:'decision',id:a.id,value:'user_confirmed_2d'},width,height);
 st=review.transact(st,{type:'decision',id:b.id,value:'rejected_non_wall'},width,height);
 assert.equal(st.decisions[a.id],'user_confirmed_2d');
 assert.equal(st.decisions[b.id],'rejected_non_wall');
 assert.deepEqual(review.counts(st,[a,b]),{pending:0,confirmed:1,rejected:1,manuallyAdded:0});
 assert.ok(review.validateReview(JSON.parse(JSON.stringify(st)),signature,width,height));
});
test('undo of wall decisions restores previous status without deleting other work',()=>{
 const a=review.toSourceCandidate(candidate,280,190,width,3040);
 let st=start();
 st=review.transact(st,{type:'decision',id:a.id,value:'rejected_non_wall'},width,height);
 st=review.transact(st,{type:'decision',id:a.id,value:'user_confirmed_2d'},width,height);
 st=review.transact(st,{type:'undo'},width,height);
 assert.equal(st.decisions[a.id],'rejected_non_wall');
 st=review.transact(st,{type:'undo'},width,height);
 assert.equal(st.decisions[a.id],undefined);
});
test('manually added diagonal source line retained without 3D wall fabrication',()=>{
 let st=start();
 st=review.transact(st,{type:'add',id:'manual:a1',points_px:[[100.5,200],[900,350.25]],created_at:'local-test'},width,height);
 assert.equal(st.manual[0].origin,'manual_correction');
 assert.equal(st.manual[0].status,'user_confirmed_2d');
 assert.deepEqual(st.manual[0].points_px,[[100.5,200],[900,350.25]]);
 assert.equal(review.counts(st,[]).confirmed,1);
 st=review.transact(st,{type:'remove',id:'manual:a1'},width,height);
 assert.equal(st.manual.length,0);
 st=review.transact(st,{type:'undo'},width,height);
 assert.equal(st.manual.length,1);
});
test('invalid or zero-length added lines rejected rather than saved',()=>{
 for(const points of [[[10,10],[10,10]],[[-1,10],[100,10]],[[0,0],[width+1,0]],[[NaN,10],[200,100]]]){
  assert.throws(()=>review.transact(start(),{type:'add',id:'manual:test',points_px:points},width,height),/invalid/i);
 }
});
test('cannot store rejections as user confirmed verified geometry',()=>{
 const bad=start();bad.decisions['auto:h:1']='verified_against_available_evidence';
 assert.equal(review.validateReview(bad,signature,width,height),false);
 assert.throws(()=>review.transact(start(),{type:'decision',id:'auto:h:1',value:'verified_against_available_evidence'},width,height));
});
test('multi-step undo history remains bounded for local device storage',()=>{
 let state=start();
 for(let i=0;i<40;i++)state=review.transact(state,{type:'decision',id:'auto:h:'+i,value:'rejected_non_wall'},width,height);
 assert.equal(state.history.length,15);
 assert.ok(review.validateReview(state,signature,width,height));
});
test('rejected no-wall dimensions remain excluded from confirmed count',()=>{
 const a=review.toSourceCandidate(candidate,280,190,width,3040);
 let st=review.transact(start(),{type:'decision',id:a.id,value:'rejected_non_wall'},width,height);
 assert.equal(review.counts(st,[a]).confirmed,0);
 st=review.transact(st,{type:'decision',id:a.id,value:'unreviewed'},width,height);
 assert.equal(review.counts(st,[a]).pending,1);
});
