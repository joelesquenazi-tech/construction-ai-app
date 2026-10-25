/* Pure local OCR review selection logic. OCR text and confidence are not
 * validated construction evidence just because someone rejected a finding.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ConstructionFindingReview=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function nextPending(findings,id){
 if(!Array.isArray(findings))return null;
 const index=findings.findIndex(x=>x.id===id);
 for(let step=1;step<=findings.length;step++){
  const item=findings[(Math.max(index,0)+step)%findings.length];
  if(item&&item.status==='pending'&&item.id!==id)return item.id;
 }
 return null;
}
function confidence(value){
 if(value===null||value===undefined||value==='')return 'Not measured';
 const n=Number(value);
 return Number.isFinite(n)?Math.max(0,Math.min(100,n)).toFixed(1)+'%':'Unknown';
}
function needsCare(value){
 if(value===null||value===undefined||value==='')return true;
 return !Number.isFinite(Number(value))||Number(value)<60;
}
return {nextPending,confidence,needsCare};
});