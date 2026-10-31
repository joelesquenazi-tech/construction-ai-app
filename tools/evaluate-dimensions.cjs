/* Private/local ground-truth evaluation. Reads review JSON, never drawing bytes.
 * Usage: node tools/evaluate-dimensions.cjs review.json truth.json > report.json
 */
const core=require('../dimension-evidence.js');
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const inside=(a,b)=>a.x>=b.x&&a.y>=b.y&&a.x+a.width<=b.x+b.width&&a.y+a.height<=b.y+b.height;
function endpointError(a,b){return Math.min(Math.max(distance(a[0],b[0]),distance(a[1],b[1])),Math.max(distance(a[0],b[1]),distance(a[1],b[0])))}
function matches(predicted,expected,compatible){
 // Maximum one-to-one matching; duplicate predictions cannot inflate recall.
 const owner=new Map();
 function visit(p,seen){
  for(let t=0;t<expected.length;t++){
   if(seen.has(t)||!compatible(predicted[p],expected[t]))continue;
   seen.add(t);
   if(!owner.has(t)||visit(owner.get(t),seen)){owner.set(t,p);return true}
  }
  return false;
 }
 for(let p=0;p<predicted.length;p++)visit(p,new Set());
 return Array.from(owner,([truth,prediction])=>({prediction,truth}));
}
function metrics(predicted,expected,pairs){
 const tp=pairs.length;
 return {true_positive:tp,false_positive:predicted.length-tp,false_negative:expected.length-tp,
  precision:predicted.length?tp/predicted.length:null,recall:expected.length?tp/expected.length:null};
}
function evaluate(packet,truth){
 const s=truth?.source,w=s?.width_px,h=s?.height_px;
 if(truth?.schema!=='site-resolved-dimension-truth-v1'||!['synthetic','permissioned_real'].includes(truth.dataset_kind)||
  !s||!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1||w>200000||h>200000||
  !/^[a-f0-9]{64}$/.test(s.sha256)||!/^[a-f0-9]{64}$/.test(s.raster_sha256)||
  !Number.isSafeInteger(s.page)||s.page<1||!core.sameSource(s,s)||
  !['filename','sheet_id','project_id','room_id'].every(k=>typeof s[k]==='string'&&s[k].trim())||
  !(s.revision===null||typeof s.revision==='string'))throw Error('Invalid ground truth or exact source identity.');
 const coverage=truth.coverage;
 if(!coverage||!['full_page','regions'].includes(coverage.type)||coverage.exhaustively_annotated!==true)
  throw Error('Declare exhaustive full-page or region annotation coverage.');
 const regions=coverage.type==='full_page'?[{x:0,y:0,width:w,height:h}]:coverage.boxes;
 if(!Array.isArray(regions)||!regions.length||regions.length>100||regions.some(b=>!core.validBox(b,w,h)))throw Error('Invalid annotated regions.');
 const labelTolerance=truth.label_tolerance_px,endpointTolerance=truth.endpoint_tolerance_px;
 if(!finite(labelTolerance)||labelTolerance<=0||!finite(endpointTolerance)||endpointTolerance<=0||
  labelTolerance>Math.max(w,h)||endpointTolerance>Math.max(w,h))throw Error('Set explicit source-pixel label and endpoint tolerances.');
 const inCoverage=b=>regions.some(r=>inside(b,r));
 const points=p=>Array.isArray(p)&&p.length===2&&p.every(q=>Array.isArray(q)&&q.length===2&&q.every(finite)&&q[0]>=0&&q[0]<=w&&q[1]>=0&&q[1]<=h)&&distance(p[0],p[1])>0;
 const annotations=truth.dimensions;
 if(!Array.isArray(annotations)||annotations.length>500)throw Error('Invalid truth dimension list.');
 const ids=new Set();
 for(const a of annotations){
  if(!a||typeof a.id!=='string'||!a.id||ids.has(a.id)||!finite(a.metres)||a.metres<=0||
   !core.validBox(a.label_box_px,w,h)||!inCoverage(a.label_box_px)||
   !(a.points_px===null||(points(a.points_px)&&['h','v'].includes(a.axis))))throw Error('Invalid, duplicate, or uncovered truth dimension.');
  ids.add(a.id);
 }
 if(!Array.isArray(packet?.findings)||packet.findings.length>10000||!core.sameSource(packet.source,s))throw Error('Review source does not match the independently annotated page.');
 const readings=[];let ignored=0;
 for(const f of packet.findings){
  if(!core.sameSource(f.source,s))throw Error('Stale or mixed drawing source in review findings. Rescan the current source.');
  // Measure original automatic readings, including human-rejected proposals.
  // Corrections and human decisions must not improve the reported detector score.
  const measurement=core.parseMeasurement(f.text);if(!measurement)continue;
  if(!core.validBox(f.bbox,w,h))throw Error('Measurement prediction has no valid source box.');
  if(!inCoverage(f.bbox)){ignored++;continue}
  readings.push({id:f.id,metres:measurement.metres,label_box_px:f.bbox,evidence:f.dimension_evidence});
 }
 const center=b=>[b.x+b.width/2,b.y+b.height/2];
 const compatible=(a,b)=>Math.abs(a.metres-b.metres)<=1e-7&&distance(center(a.label_box_px),center(b.label_box_px))<=labelTolerance;
 const readingPairs=matches(readings,annotations,compatible);
 const associated=readings.filter(x=>x.evidence?.association_status==='candidate_unverified');
 for(const p of associated)if(!points(p.evidence.points_px)||!['h','v'].includes(p.evidence.axis))throw Error('Invalid predicted dimension span.');
 const spans=annotations.filter(a=>a.points_px!==null);
 const spanPairs=matches(associated,spans,(a,b)=>compatible(a,b)&&a.evidence.axis===b.axis&&endpointError(a.evidence.points_px,b.points_px)<=endpointTolerance);
 const errors=spanPairs.map(m=>endpointError(associated[m.prediction].evidence.points_px,spans[m.truth].points_px));
 return {schema:'site-resolved-dimension-evaluation-v1',dataset_kind:truth.dataset_kind,source:s,coverage,
  label_tolerance_px:labelTolerance,endpoint_tolerance_px:endpointTolerance,
  text_readings:metrics(readings,annotations,readingPairs),dimension_spans:metrics(associated,spans,spanPairs),
  matched_endpoint_max_error_px:errors.length?Math.max(...errors):null,
  ignored_predictions_outside_coverage:ignored,automatic_scale_verified:false,ready_for_verified_3d:false};
}
module.exports={evaluate};
if(require.main===module){
 try{
  const fs=require('fs'),args=process.argv.slice(2);
  if(args.length!==2)throw Error('Usage: node tools/evaluate-dimensions.cjs review.json truth.json');
  for(const file of args)if(fs.statSync(file).size>20*1024*1024)throw Error('JSON inputs must be no larger than 20 MB.');
  const review=JSON.parse(fs.readFileSync(args[0],'utf8')),truth=JSON.parse(fs.readFileSync(args[1],'utf8'));
  let packet=review;
  if(review.schema==='construction-ai-batch1'){
   const findings=[...(review.findings||[]),...Object.values(review.otherSheetFindings||{}).flat()]
    .filter(f=>f.source?.sheet_id===truth.source?.sheet_id);
   if(!findings.length)throw Error('No source-linked scan of this sheet exists in the review backup.');
   packet={source:findings[0].source,findings};
  }
  process.stdout.write(JSON.stringify(evaluate(packet,truth),null,2)+'\n');
 }catch(e){process.stderr.write('Evaluation failed: '+e.message+'\n');process.exitCode=1}
}
