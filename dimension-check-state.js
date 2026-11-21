/* Independent source annotations for local accuracy measurement. This store is
 * separate from detector findings, reading corrections, scale and geometry.
 */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./dimension-evidence.js'),require('./dimension-evaluation.js'));
 else root.ConstructionDimensionCheck=factory(root.ConstructionDimensionEvidence,root.ConstructionDimensionEvaluation);
})(typeof globalThis!=='undefined'?globalThis:this,function(core,evaluator){
'use strict';
const SCHEMA='site-resolved-dimension-check-v1';
const clone=v=>JSON.parse(JSON.stringify(v));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const contents=s=>({source:s.source,dataset_kind:s.dataset_kind,region:s.region,
 label_tolerance_px:s.label_tolerance_px,endpoint_tolerance_px:s.endpoint_tolerance_px,
 dimensions:s.dimensions,confirmed:s.confirmed});
function sourceOK(s){
 return !!s&&core.sameSource(s,s)&&/^[a-f0-9]{64}$/.test(s.sha256)&&/^[a-f0-9]{64}$/.test(s.raster_sha256)&&
  ['filename','sheet_id','project_id','room_id'].every(k=>typeof s[k]==='string'&&s[k].trim())&&
  Number.isSafeInteger(s.page)&&s.page>0&&(s.revision===null||typeof s.revision==='string')&&
  [s.width_px,s.height_px].every(n=>Number.isSafeInteger(n)&&n>0&&n<=200000);
}
function createSession(source){
 if(!sourceOK(source))throw Error('Exact drawing source information is required.');
 return {schema:SCHEMA,source:clone(source),revision:0,dataset_kind:null,region:null,
  label_tolerance_px:null,endpoint_tolerance_px:null,dimensions:[],confirmed:false,history:[]};
}
function truth(session){
 if(!session.confirmed)throw Error('Confirm independent, exhaustive annotations before scoring.');
 return {schema:'site-resolved-dimension-truth-v1',dataset_kind:session.dataset_kind,source:clone(session.source),
  coverage:{type:'regions',exhaustively_annotated:true,boxes:[clone(session.region)]},
  annotation_method:'manual_source_only',label_tolerance_px:session.label_tolerance_px,
  endpoint_tolerance_px:session.endpoint_tolerance_px,dimensions:clone(session.dimensions)};
}
function validContent(s){
 const w=s.source.width_px,h=s.source.height_px,inside=(a,b)=>a.x>=b.x&&a.y>=b.y&&a.x+a.width<=b.x+b.width&&a.y+a.height<=b.y+b.height;
 if(![null,'synthetic','permissioned_real'].includes(s.dataset_kind)||typeof s.confirmed!=='boolean'||
  !(s.region===null||core.validBox(s.region,w,h))||
  ![s.label_tolerance_px,s.endpoint_tolerance_px].every(n=>n===null||(finite(n)&&n>0&&n<=Math.max(w,h)))||
  !Array.isArray(s.dimensions)||s.dimensions.length>100)throw Error('Invalid accuracy-check settings.');
 const ids=new Set(),point=p=>Array.isArray(p)&&p.length===2&&p.every(finite)&&p[0]>=0&&p[0]<=w&&p[1]>=0&&p[1]<=h;
 for(const a of s.dimensions){
  if(!a||typeof a.id!=='string'||!a.id||ids.has(a.id)||typeof a.label!=='string'||!a.label||a.label.length>120||
   !finite(a.metres)||a.metres<=0||a.metres>1000||!core.validBox(a.label_box_px,w,h)||!s.region||!inside(a.label_box_px,s.region)||
   !(a.points_px===null||(Array.isArray(a.points_px)&&a.points_px.length===2&&a.points_px.every(point)&&
    Math.hypot(a.points_px[0][0]-a.points_px[1][0],a.points_px[0][1]-a.points_px[1][1])>0&&['h','v'].includes(a.axis))))
   throw Error('Invalid, duplicate, or out-of-area independent dimension.');
  ids.add(a.id);
 }
 if(s.confirmed){
  if(!s.region||s.dataset_kind===null||s.label_tolerance_px===null||s.endpoint_tolerance_px===null)throw Error('Set the test area, drawing kind and both tolerances first.');
  evaluator.evaluate({source:s.source,findings:[]},truth(s));
 }
}
function validateSession(s,source){
 if(!s||s.schema!==SCHEMA||!sourceOK(s.source)||!core.sameSource(s.source,source)||!Number.isSafeInteger(s.revision)||s.revision<0||
  !Array.isArray(s.history)||s.history.length>10)throw Error('Saved accuracy check does not match this exact drawing.');
 validContent(s);
 for(const previous of s.history){if(!core.sameSource(previous?.source,source))throw Error('History source mismatch.');validContent(previous)}
 return s;
}
function transact(session,action){
 validateSession(session,session.source);
 const next=clone(session),before=clone(contents(session));
 next.confirmed=false;
 if(action.type==='region'){next.region=clone(action.box)}
 else if(action.type==='add')next.dimensions.push(clone(action.annotation));
 else if(action.type==='remove'){
  if(!next.dimensions.some(d=>d.id===action.id))throw Error('Independent dimension is no longer available.');
  next.dimensions=next.dimensions.filter(d=>d.id!==action.id);
 }else if(action.type==='settings'){
  for(const k of ['dataset_kind','label_tolerance_px','endpoint_tolerance_px'])next[k]=action[k];
 }else if(action.type==='confirm'){
  if(action.exhaustive!==true||action.independent!==true)throw Error('Confirm both independent checking and exhaustive coverage.');
  next.confirmed=true;
 }else if(action.type==='undo'){
  const previous=next.history.pop();if(!previous)throw Error('No saved accuracy-check action to undo.');
  Object.assign(next,previous);validateSession(next,session.source);return next;
 }else throw Error('Unsupported accuracy-check action.');
 validContent(next);
 next.history.push(before);next.history=next.history.slice(-10);
 return next;
}
function manualMeasurement(input){
 if(input.system==='metric'){
  const factor={mm:.001,cm:.01,m:1}[input.unit];
  const metres=input.value*factor;
  if(!factor||!finite(input.value)||!finite(metres)||metres<=0||metres>1000)throw Error('Enter a positive metric measurement with its unit.');
  return {label:input.value+' '+input.unit,metres:Number(metres.toFixed(10))};
 }
 const {feet,inches,numerator,denominator}=input;
 if(input.system!=='imperial'||![feet,inches,numerator,denominator].every(Number.isSafeInteger)||feet<0||inches<0||inches>11||
  numerator<0||numerator>=denominator||![2,4,8,16,32,64].includes(denominator))throw Error('Enter feet, inches and a valid inch fraction.');
 const metres=(feet*12+inches+numerator/denominator)*.0254;
 if(!finite(metres)||metres<=0||metres>1000)throw Error('Enter a positive measurement.');
 return {label:feet+'′-'+inches+(numerator?' '+numerator+'/'+denominator:'')+'″',metres:Number(metres.toFixed(10))};
}
function packet(findings,source){
 if(!Array.isArray(findings)||findings.length>10000)throw Error('Scan this drawing before running an accuracy check.');
 // Legacy unbound records cannot be silently excluded to improve a score.
 if(findings.some(f=>!core.sameSource(f?.source,source)))throw Error('Scan the current drawing again; saved readings belong to a different or unknown source.');
 return {source:clone(source),findings:clone(findings)};
}
function score(session,findings){validateSession(session,session.source);return evaluator.evaluate(packet(findings,session.source),truth(session))}
return {SCHEMA,createSession,validateSession,transact,truth,manualMeasurement,packet,score};
});
