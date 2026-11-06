const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate}=require('../tools/evaluate-dimensions.cjs');
const source={sha256:'a'.repeat(64),raster_sha256:'b'.repeat(64),filename:'synthetic.png',sheet_id:'A101',page:1,revision:null,project_id:'p',room_id:'r',width_px:800,height_px:500};
function fixture(){
 const label_box_px={x:300,y:40,width:60,height:14},points_px=[[50,80],[700,80]];
 const truth={schema:'site-resolved-dimension-truth-v1',dataset_kind:'synthetic',source,
  coverage:{type:'full_page',exhaustively_annotated:true},label_tolerance_px:5,endpoint_tolerance_px:3,
  dimensions:[{id:'truth-1',metres:3.6576,label_box_px,points_px,axis:'h'}]};
 const prediction={id:'p1',text:'12 FEET',bbox:label_box_px,source,status:'pending',
  dimension_evidence:{association_status:'candidate_unverified',axis:'h',points_px}};
 return {truth,packet:{source,findings:[prediction]}};
}
test('independent source-pixel tolerances measure reading and endpoint accuracy',()=>{
 const {truth,packet}=fixture(),report=evaluate(packet,truth);
 assert.deepEqual(report.dimension_spans,{true_positive:1,false_positive:0,false_negative:0,precision:1,recall:1});
 assert.equal(report.matched_endpoint_max_error_px,0);assert.equal(report.ready_for_verified_3d,false);assert.equal(report.dataset_kind,'synthetic');
});
test('duplicate predictions cannot inflate recall; reversed endpoints are equivalent',()=>{
 const {truth,packet}=fixture();packet.findings.push(structuredClone(packet.findings[0]));
 packet.findings[0].dimension_evidence.points_px.reverse();
 const report=evaluate(packet,truth);
 assert.equal(report.dimension_spans.true_positive,1);assert.equal(report.dimension_spans.false_positive,1);assert.equal(report.dimension_spans.recall,1);
});
test('wrong endpoint proposals count as a false positive and a missed true span',()=>{
 const {truth,packet}=fixture();packet.findings[0].dimension_evidence.points_px=[[50,80],[690,80]];
 const report=evaluate(packet,truth);
 assert.equal(report.text_readings.true_positive,1);assert.equal(report.dimension_spans.true_positive,0);
 assert.equal(report.dimension_spans.false_positive,1);assert.equal(report.dimension_spans.false_negative,1);
});
test('empty predictions report omissions; undefined precision is not perfect precision',()=>{
 const {truth,packet}=fixture();packet.findings=[];
 const report=evaluate(packet,truth);assert.equal(report.text_readings.precision,null);assert.equal(report.text_readings.recall,0);
});
test('human correction and rejection cannot improve the original automatic reading score',()=>{
 const {truth,packet}=fixture();packet.findings[0].text='13 FEET';packet.findings[0].correction='12 FEET';packet.findings[0].status='rejected';
 const report=evaluate(packet,truth);assert.equal(report.text_readings.true_positive,0);assert.equal(report.text_readings.false_positive,1);
});
test('only exhaustively annotated areas are scored and outside predictions are counted',()=>{
 const {truth,packet}=fixture();truth.coverage={type:'regions',exhaustively_annotated:true,boxes:[{x:290,y:30,width:100,height:30}]};
 packet.findings.push({...packet.findings[0],id:'outside',bbox:{x:500,y:40,width:60,height:14}});
 const report=evaluate(packet,truth);assert.equal(report.ignored_predictions_outside_coverage,1);assert.equal(report.text_readings.true_positive,1);
 truth.coverage.exhaustively_annotated=false;assert.throws(()=>evaluate(packet,truth),/exhaustive/);
});
test('same-sized revised drawings and mixed page predictions cannot be evaluated as this source',()=>{
 const {truth,packet}=fixture();packet.findings[0].source={...source,sha256:'c'.repeat(64)};
 assert.throws(()=>evaluate(packet,truth),/source/);
});
