/* On-device review state for possible wall lines. Reviews are 2D human annotations,
 * not semantic AI verification, dimensional agreement, or approved 3D geometry.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ConstructionWallReviewState=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SCHEMA='site-resolv3d-wall-line-review-v1',MAX_UNDO=15;
const number=n=>typeof n==='number'&&Number.isFinite(n);
function sourceSignature(ref,width,height){
 if(!ref||!ref.file||typeof ref.scope!=='string'||typeof ref.floorName!=='string'
  ||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)
  throw Error('Drawing identity and original pixel dimensions required.');
 return JSON.stringify([ref.scope,ref.floorName,ref.file.size,ref.file.lastModified||0,width,height]);
}
function createReview(signature){
 if(typeof signature!=='string'||!signature)throw Error('Drawing signature required');
 return {schema:SCHEMA,source_signature:signature,decisions:{},manual:[],history:[]};
}
function validateReview(state,signature,width,height){
 if(!state||state.schema!==SCHEMA||state.source_signature!==signature
  ||!state.decisions||Array.isArray(state.decisions)||typeof state.decisions!=='object'
  ||!Array.isArray(state.manual)||state.manual.length>400||!Array.isArray(state.history)
  ||state.history.length>MAX_UNDO)return false;
 if(Object.keys(state.decisions).length>2000)return false;
 if(!Object.values(state.decisions).every(x=>x==='user_confirmed_2d'||x==='rejected_non_wall'))return false;
 return state.manual.every(item=>item&&typeof item.id==='string'&&item.id.length>0
  &&item.origin==='manual_correction'&&item.status==='user_confirmed_2d'
  &&validPoints(item.points_px,width,height));
}
function validPoints(points,width,height){
 if(!Array.isArray(points)||points.length!==2)return false;
 if(!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(number)
  &&p[0]>=0&&p[0]<=width&&p[1]>=0&&p[1]<=height))return false;
 return Math.hypot(points[0][0]-points[1][0],points[0][1]-points[1][1])>=2;
}
function toSourceCandidate(candidate,scanWidth,scanHeight,width,height){
 if(!candidate||!Number.isSafeInteger(scanWidth)||scanWidth<1||!Number.isSafeInteger(scanHeight)||scanHeight<1
  ||!Number.isSafeInteger(width)||width<1||!Number.isSafeInteger(height)||height<1
  ||!Array.isArray(candidate.points_px)||candidate.points_px.length!==2
  ||!candidate.points_px.every(p=>Array.isArray(p)&&p.length===2&&p.every(number)))
  throw Error('Invalid scan line or pixel dimensions');
 const points=candidate.points_px.map(p=>[p[0]*width/scanWidth,p[1]*height/scanHeight]);
 if(!validPoints(points,width,height))throw Error('Candidate outside image or too short');
 const id='auto:'+candidate.axis+':'+points.flat().map(v=>Math.round(v*10)/10).join(':');
 return {...candidate,id,points_px:points,source:'local_raster',
  review:'unreviewed',source_pixel_dimensions:[width,height]};
}
function transact(state,action,width,height){
 if(!validateReview(state,state.source_signature,width,height))
  throw Error('Local wall review data invalid or from another source');
 if(!action||typeof action!=='object')throw Error('Wall review action required');
 const next={...state,decisions:{...state.decisions},manual:state.manual.map(x=>({...x,
  points_px:x.points_px.map(p=>p.slice())})),history:state.history.slice()};
 if(action.type==='undo'){
  if(!next.history.length)return state;
  const prev=next.history.pop();
  next.decisions=prev.decisions;
  next.manual=prev.manual;
  return next;
 }
 const previous={decisions:{...next.decisions},manual:next.manual.map(x=>({...x,
  points_px:x.points_px.map(p=>p.slice())}))};
 if(action.type==='decision'){
  if(typeof action.id!=='string'||!action.id.startsWith('auto:')
    ||!['user_confirmed_2d','rejected_non_wall','unreviewed'].includes(action.value))
   throw Error('Invalid wall candidate decision');
  if(action.value==='unreviewed')delete next.decisions[action.id];
  else next.decisions[action.id]=action.value;
 }else if(action.type==='add'){
  const id=action.id,points=action.points_px;
  if(typeof id!=='string'||!id.startsWith('manual:')||id.length>130
   ||next.manual.some(x=>x.id===id)||!validPoints(points,width,height))
   throw Error('Missing wall line has invalid source coordinates');
  next.manual.push({id,points_px:points.map(p=>p.slice()),status:'user_confirmed_2d',
   origin:'manual_correction',created_at:action.created_at||''});
 }else if(action.type==='remove'){
  if(typeof action.id!=='string'||!next.manual.some(x=>x.id===action.id))
   throw Error('Manual line does not exist');
  next.manual=next.manual.filter(x=>x.id!==action.id);
 }else throw Error('Unknown wall review action');
 next.history.push(previous);
 next.history=next.history.slice(-MAX_UNDO);
 return next;
}
function counts(state,candidates=[]){
 const values=candidates.map(x=>state.decisions[x.id]||'unreviewed');
 return {pending:values.filter(x=>x==='unreviewed').length,
  confirmed:values.filter(x=>x==='user_confirmed_2d').length+state.manual.length,
  rejected:values.filter(x=>x==='rejected_non_wall').length,manuallyAdded:state.manual.length};
}
return {SCHEMA,sourceSignature,createReview,validateReview,validPoints,toSourceCandidate,transact,counts};
});