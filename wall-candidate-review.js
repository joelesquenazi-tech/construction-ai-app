/* Source-linked, device-local REVIEW of straight wall-line proposals.
 * Confirmations are user-reviewed 2D linework, NOT verified 3D walls.
 */
(()=>{
'use strict';
const host=document.getElementById('model3d');
const detector=window.ConstructionWallCandidates;
const reviews=window.ConstructionWallReviewState;
const pointCore=window.ConstructionDrawingPointTools;
if(!host||!detector||!reviews||!pointCore||!window.constructionAITraceSource)return;

const section=document.createElement('section');
section.className='wall-candidate-panel';
section.id='wallCandidatePanel';
section.innerHTML=
 '<div class="model-view-head"><b>Review possible wall lines</b><span>Local 2D review · not verified 3D</span></div>'+
 '<p>The drawing is checked locally for paired straight lines. Dimension strings and architectural details may also appear. Confirm actual wall lines, reject others, or mark a missing line. Your decisions are retained for this project and drawing.</p>'+
 '<div class="wall-candidate-actions"><button id="wallCandidateScan" type="button">Rescan floor plan</button><p id="wallCandidateStatus" role="status">Automatic scan will start when you enter the 3D workspace.</p></div>'+
 '<div id="wallCandidateResults" hidden><div id="wallCandidateViewport" class="wall-candidate-viewport"><div id="wallCandidateStage" class="wall-candidate-stage"><img id="wallCandidateImage" alt="Floor plan with proposed wall-line review overlays" draggable="false"><svg id="wallCandidateSvg" role="img" aria-label="Proposed and manually marked wall centerlines"></svg></div></div>'+
 '<div id="wallMissingControls" class="wall-missing-controls" hidden><label><input id="wallMissingSnap" type="checkbox"> Snap to nearby dark pixels (experimental)</label><span id="wallMissingHelp">Tap the first endpoint. Drag to fine-tune.</span><button id="wallMissingSave" type="button" disabled>Save missing line</button><button id="wallMissingCancel" type="button">Cancel</button></div>'+
 '<div id="wallCandidateCounts" class="wall-candidate-counts" role="status"></div><label class="wall-review-toggle"><input id="wallHideRejected" type="checkbox" checked> Hide rejected lines</label><div id="wallCandidateList" class="wall-candidate-list"></div>'+
 '<div class="wall-review-toolbar"><button id="wallConfirm" type="button" disabled>Confirm wall line</button><button id="wallReject" type="button" disabled>Not a wall</button><button id="wallMissing" type="button" disabled>Add missing line</button><button id="wallUndo" type="button" disabled>Undo</button></div>'+
 '<div id="wallReviewInstructions" class="wall-review-instructions" role="status">Select a proposed line below to confirm or reject it. Confirmed lines are still preliminary 2D source annotations.</div>'+
 '<p class="wall-candidate-disclaimer">Confirming a line saves your 2D decision only. It does not establish scale, wall thickness, elevation alignment, or verified 3D geometry. Rejected lines are excluded from the active candidate overlay, not used for model generation.</p></div>'+
 '<div id="wallCandidateMagnifier" class="scale-ruler-magnifier" hidden aria-hidden="true"><canvas id="wallCandidateMagnifierCanvas" width="180" height="180"></canvas><span class="scale-ruler-magnifier-label">4× detail</span></div>';

const manual=document.getElementById('geometryPreview');
if(manual)manual.insertAdjacentElement('beforebegin',section);
else host.querySelector('.model-workspace')?.insertAdjacentElement('beforebegin',section);

const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const img=$('wallCandidateImage'),svg=$('wallCandidateSvg'),viewport=$('wallCandidateViewport');
const status=$('wallCandidateStatus'),HELP=$('wallReviewInstructions');
const STORE='construction-ai-wall-candidate-review-v1:';
let imageURL=null,scanCycle=0,report=null,selected=null,review=null;
let signature=null,scope=null,drawingSize=null,sourceFile=null;
let adding=false,draft=[],drag=-1,dragPointer=null,lastAutoSignature='';
const tools=pointCore.create({
 image:img,overlay:svg,lens:$('wallCandidateMagnifier'),
 canvas:$('wallCandidateMagnifierCanvas'),
 getSize:()=>drawingSize,
 isSnapEnabled:()=>$('wallMissingSnap').checked
});
function el(tag,attrs){
 const node=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));
 return node;
}
function cleanup(){
 if(imageURL){URL.revokeObjectURL(imageURL);imageURL=null}
 img.removeAttribute('src');
 tools.hide();
 report=null;selected=null;review=null;signature=null;scope=null;drawingSize=null;sourceFile=null;
 adding=false;draft=[];drag=-1;dragPointer=null;
 svg.replaceChildren();$('wallCandidateList').replaceChildren();
 $('wallCandidateResults').hidden=true;
 $('wallCandidateMagnifier').hidden=true;
 setEditing(false);
}
function setEditing(on){
 adding=on;
 $('wallMissingControls').hidden=!on;
 svg.classList.toggle('wall-is-editing',on);
 $('wallMissing').textContent=on?'Placing missing line…':'Add missing line';
 $('wallMissingSave').disabled=!on||draft.length!==2;
 if(on)updateDraftText();
 updateButtons();updateManualControl();
}
function updateDraftText(){
 const message=draft.length===0?'Tap first endpoint':draft.length===1?'Tap second endpoint':'Both endpoints selected · drag either point to fine-tune';
 $('wallMissingHelp').textContent=message;
 $('wallMissingSave').disabled=draft.length!==2;
}
function key(){return STORE+scope}
function loadSaved(){
 let stored=null;
 try{stored=JSON.parse(localStorage.getItem(key())||'null')}catch{}
 review=reviews.validateReview(stored,signature,drawingSize.width,drawingSize.height)
  ?stored:reviews.createReview(signature);
}
function updateButtons(){
 const auto=selected?.startsWith('auto:')?report?.candidates.find(c=>c.id===selected):null;
 $('wallConfirm').disabled=!auto||adding;
 $('wallReject').disabled=!auto||adding;
 $('wallMissing').disabled=!report||adding;
 $('wallUndo').disabled=!review?.history?.length||adding;
 $('wallConfirm').classList.toggle('active',!!auto&&review?.decisions[auto.id]==='user_confirmed_2d');
 $('wallReject').classList.toggle('active',!!auto&&review?.decisions[auto.id]==='rejected_non_wall');
 if(selected?.startsWith('manual:')){
  $('wallConfirm').disabled=true;
  $('wallReject').disabled=true;
 }
}
function persist(next){
 if(!drawingSize||!reviews.validateReview(next,signature,drawingSize.width,drawingSize.height))
  throw Error('Refusing to save invalid or mismatched source annotations.');
 localStorage.setItem(key(),JSON.stringify(next));
 review=next;
}
function change(action){
 try{
  persist(reviews.transact(review,action,drawingSize.width,drawingSize.height));
  if(action.type==='add')selected=action.id;
  if(action.type==='remove')selected=null;
  if(action.type==='undo'&&selected?.startsWith('manual:')&&!review.manual.some(x=>x.id===selected))selected=null;
  repaint();
  HELP.textContent=action.type==='decision'
   ?(action.value==='user_confirmed_2d'?'Wall line confirmed by you in 2D. Not automatically added to 3D.':
      action.value==='rejected_non_wall'?'Line marked Not a wall; saved for this drawing.':'Candidate moved back to review.')
   :action.type==='add'?'Missing line saved as your own 2D annotation; not a verified wall.':
    action.type==='remove'?'Manually marked line removed.':'Last review decision undone.';
  return true;
 }catch(e){HELP.textContent='Could not save local correction: '+e.message;return false}
}
function candidateStatus(item){
 return item.id.startsWith('manual:')?'user_confirmed_2d':review?.decisions[item.id]||'unreviewed';
}
function labelStatus(s){
 return s==='user_confirmed_2d'?'Confirmed (2D)':s==='rejected_non_wall'?'Not a wall':'Needs review';
}
function allItems(){return [...(report?.candidates||[]),...(review?.manual||[])];}
function paint(){
 svg.replaceChildren();
 if(!report||!drawingSize)return;
 tools.sync();
 for(const c of allItems()){
  const state=candidateStatus(c),active=c.id===selected,isManual=c.id.startsWith('manual:');
  if(state==='rejected_non_wall'&&$('wallHideRejected').checked)continue;
  const [a,b]=c.points_px;
  const stroke=state==='rejected_non_wall'?'#94a3b8':
   active?'#f97316':isManual?'#7c3aed':
   state==='user_confirmed_2d'?'#16a34a':'#087ef5';
  svg.append(el('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],
    stroke,'stroke-width':active?Math.max(2,tools.radius()*.4):2,
    'stroke-opacity':state==='rejected_non_wall'?.55:.85,
    'stroke-dasharray':state==='unreviewed'?'7 4':state==='rejected_non_wall'?'3 7':'none'}));
  if(active)for(const p of [a,b])svg.append(el('circle',{
   cx:p[0],cy:p[1],r:Math.max(4,tools.radius()*.6),
   fill:stroke,stroke:'#fff','stroke-width':1.7
  }));
 }
 if(adding){
  if(draft.length===2)svg.append(el('line',{x1:draft[0][0],y1:draft[0][1],
   x2:draft[1][0],y2:draft[1][1],stroke:'#f97316','stroke-width':3}));
  for(const [i,p] of draft.entries()){
   const radius=tools.radius();
   svg.append(el('circle',{cx:p[0],cy:p[1],r:radius*1.6,
     fill:'#0b76d1','fill-opacity':'.17'}));
   svg.append(el('circle',{cx:p[0],cy:p[1],r:radius,
     fill:i===drag?'#ffb52a':'#087ef5',stroke:'#fff',
     'stroke-width':Math.max(2,radius*.3)}));
  }
 }
}
function renderList(){
 const list=$('wallCandidateList');const scrollPosition=list.scrollLeft;list.replaceChildren();
 for(const c of allItems()){
  const state=candidateStatus(c);
  if(state==='rejected_non_wall'&&$('wallHideRejected').checked)continue;
  const button=document.createElement('button');
  button.type='button';button.dataset.proposal=c.id;
  button.className='wall-review-item';button.setAttribute('aria-pressed',String(c.id===selected));
  if(c.id===selected)button.classList.add('active');
  const title=document.createElement('strong');
  title.textContent=c.id.startsWith('manual:')?'Manually added line':
   'Possible line #'+(report.candidates.findIndex(x=>x.id===c.id)+1);
  const desc=document.createElement('span');
  desc.textContent=labelStatus(state)+' · '+(c.axis==='h'?'horizontal':c.axis==='v'?'vertical':'marked')+' source line';
  button.append(title,desc);
  if(c.id.startsWith('manual:')){
   const remove=document.createElement('span');
   remove.textContent='Select to remove or review';
   button.append(remove);
  }
  button.onclick=()=>choose(c.id);
  list.append(button);
 }
 if(!list.children.length){
  const text=document.createElement('p');
  text.textContent='No active candidates. Use Add missing line to mark an overlooked wall.';
  list.append(text);
 }
 list.scrollLeft=scrollPosition;
}
function updateCount(){
 const c=reviews.counts(review,report.candidates);
 $('wallCandidateCounts').textContent=
  c.confirmed+' confirmed in 2D · '+c.rejected+' rejected · '+c.pending+' awaiting review · '+c.manuallyAdded+' added manually';
}
function repaint(){
 paint();renderList();updateCount();updateButtons();updateManualControl();
}
function choose(id,{recenter=true}={}){
 if(adding)return;
 selected=id;repaint();
 const c=allItems().find(x=>x.id===id);
 if(!c||!img.clientWidth||!recenter)return;
 const [a,b]=c.points_px;
 viewport.scrollLeft=Math.max(0,((a[0]+b[0])/2)*img.clientWidth/drawingSize.width-viewport.clientWidth/2);
 viewport.scrollTop=Math.max(0,((a[1]+b[1])/2)*img.clientHeight/drawingSize.height-viewport.clientHeight/2);
 if(id.startsWith('manual:'))HELP.textContent='Manually added 2D line. Use Remove selected manual line below to delete, or Undo.';
}
// Tapping directly on a proposal selects it; scrolling the drawing remains
// a native gesture because the non-edit SVG layer does not capture pointers.
viewport.addEventListener('click',event=>{
 if(adding||!report||!drawingSize||!img.clientWidth)return;
 const rect=img.getBoundingClientRect();
 if(event.clientX<rect.left||event.clientX>rect.right||
    event.clientY<rect.top||event.clientY>rect.bottom)return;
 const pixel=pointCore.pointAt(event.clientX,event.clientY,rect,drawingSize);
 if(!pixel)return;
 const candidates=allItems().filter(c=>candidateStatus(c)!=='rejected_non_wall'||!$('wallHideRejected').checked);
 const threshold=16*drawingSize.width/rect.width;
 const id=reviews.pickNearestLine([pixel.x,pixel.y],candidates,threshold);
 if(id){choose(id,{recenter:false});HELP.textContent='Selected a line on the drawing. Confirm it if it is a wall, or mark Not a wall.'}
});
function updateManualControl(){
 const id='wallRemoveManual';
 let button=$(id);
 if(!button){
  button=document.createElement('button');button.type='button';button.id=id;
  button.textContent='Remove selected manual line';
  button.onclick=()=>{if(!adding&&selected?.startsWith('manual:'))change({type:'remove',id:selected})};
  $('wallCandidateCounts').insertAdjacentElement('afterend',button);
 }
 button.hidden=!selected?.startsWith('manual:');button.disabled=adding;
}

function loadImage(url){
 return new Promise((resolve,reject)=>{
  const load=new Image();
  load.onload=()=>resolve(load);
  load.onerror=()=>reject(Error('Could not decode local floor plan.'));
  load.src=url;
 });
}
function raster(image){
 const maxSide=1400,maxPixels=1800000;
 const ratio=Math.min(1,maxSide/Math.max(image.naturalWidth,image.naturalHeight),
  Math.sqrt(maxPixels/(image.naturalWidth*image.naturalHeight)));
 const width=Math.max(1,Math.floor(image.naturalWidth*ratio));
 const height=Math.max(1,Math.floor(image.naturalHeight*ratio));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Cannot create local drawing analysis canvas.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
 ctx.drawImage(image,0,0,width,height);
 const pixels=ctx.getImageData(0,0,width,height).data;
 const rows=Array.from({length:height},()=>new Uint8Array(width));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  rows[y][x]=pixels[i+3]>200&&
   (.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])<115?1:0;
 }
 return rows;
}
$('wallCandidateScan').onclick=async()=>{
 const ticket=++scanCycle,button=$('wallCandidateScan');
 cleanup();
 button.disabled=true;status.textContent='Scanning saved floor plan locally…';
 let freshURL=null;
 try{
  const src=await window.constructionAITraceSource();if(ticket!==scanCycle)return;
  if(!src?.file)throw Error('Upload a floor plan in Drawing setup first.');
  if(!['image/png','image/jpeg'].includes(src.file.type))
   throw Error('This initial local scan requires JPG/PNG. PDF/TIFF recognition remains planned.');
  freshURL=URL.createObjectURL(src.file);
  const localImage=await loadImage(freshURL);if(ticket!==scanCycle)return;
  const rows=raster(localImage),found=detector.detectWallCandidates(rows);
  const originalWidth=localImage.naturalWidth,originalHeight=localImage.naturalHeight;
  const candidates=found.candidates.map(c=>reviews.toSourceCandidate(
    c,found.stats.width,found.stats.height,originalWidth,originalHeight));
  const freshSig=reviews.sourceSignature(src,originalWidth,originalHeight);
  if(ticket!==scanCycle)return;
  scope=src.scope;signature=freshSig;sourceFile=src.file;
  drawingSize={width:originalWidth,height:originalHeight};
  report={...found,candidates};
  loadSaved();
  imageURL=freshURL;freshURL=null;
  img.onload=()=>{if(ticket===scanCycle)paint()};
  img.src=imageURL;
  $('wallCandidateResults').hidden=false;
  selected=candidates.find(c=>review.decisions[c.id]!=='rejected_non_wall')?.id||
    review.manual[0]?.id||null;
  repaint();
  status.textContent=candidates.length+' possible line pair(s) found. Review and confirm actual walls, reject dimension lines, or add missing walls. Saved reviews remain on this device.';
 }catch(e){if(ticket===scanCycle)status.textContent='Cannot scan drawing: '+e.message}
 finally{if(freshURL)URL.revokeObjectURL(freshURL);if(ticket===scanCycle)button.disabled=false}
};
$('wallConfirm').onclick=()=>{if(!adding&&selected?.startsWith('auto:'))change({
 type:'decision',id:selected,value:'user_confirmed_2d'})};
$('wallReject').onclick=()=>{
 if(!adding&&selected?.startsWith('auto:')){
  const id=selected;
  if(change({type:'decision',id,value:'rejected_non_wall'})&&$('wallHideRejected').checked){
   selected=report.candidates.find(c=>(review.decisions[c.id]||'unreviewed')==='unreviewed')?.id||
     report.candidates.find(c=>review.decisions[c.id]==='user_confirmed_2d')?.id||
     review.manual[0]?.id||null;
   repaint();
  }
 }
};
$('wallUndo').onclick=()=>{if(!adding)change({type:'undo'})};
$('wallMissing').onclick=()=>{
 if(!report)return;
 draft=[];drag=-1;dragPointer=null;
 setEditing(true);paint();
 HELP.textContent='Tap near the beginning and end of a missing wall centerline. Use the 4× magnifier and drag the two handles to position them.';
};
$('wallMissingCancel').onclick=()=>{
 setEditing(false);draft=[];drag=-1;dragPointer=null;tools.hide();paint();
 HELP.textContent='Missing-line placement cancelled.';
};
$('wallMissingSave').onclick=()=>{
 if(draft.length!==2||!drawingSize)return;
 const id='manual:'+(typeof crypto!=='undefined'&&crypto.randomUUID?
  crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));
 const pixels=draft.map(x=>x.slice());
 setEditing(false);draft=[];drag=-1;tools.hide();
 change({type:'add',id,points_px:pixels,created_at:new Date().toISOString()});
};
$('wallHideRejected').onchange=()=>{if(report)repaint()};
$('wallMissingSnap').onchange=()=>{
 $('wallMissingHelp').textContent=$('wallMissingSnap').checked
  ?'Optional dark-pixel snap may select text or dimension lines; inspect the blue point.'
  :'Snap off: select two endpoints freely.';
};
svg.addEventListener('pointerdown',event=>{
 if(!adding||!drawingSize||drag>=0)return;
 const point=tools.point(event);if(!point)return;
 event.preventDefault();
 const threshold=tools.radius()*2;
 let index=draft.findIndex(p=>Math.hypot(p[0]-point.x,p[1]-point.y)<=threshold);
 if(index<0){
  if(draft.length===2)return; // Require explicit save/reset, do not lose placed points.
  const target=tools.snap(point);
  index=draft.length;draft.push([target.x,target.y]);
 }
 drag=index;dragPointer=event.pointerId;
 svg.setPointerCapture?.(event.pointerId);
 window.getSelection?.()?.removeAllRanges();
 paint();updateDraftText();
 tools.show({x:draft[index][0],y:draft[index][1]},event,point);
});
svg.addEventListener('pointermove',event=>{
 if(drag<0||event.pointerId!==dragPointer)return;
 const point=tools.point(event);if(!point)return;
 event.preventDefault();
 const target=tools.snap(point);
 draft[drag]=[target.x,target.y];
 paint();tools.show(target,event,point);
});
function stopDrag(event){
 if(drag<0||event.pointerId!==dragPointer)return;
 drag=-1;dragPointer=null;
 tools.hide();
 if(svg.hasPointerCapture?.(event.pointerId))svg.releasePointerCapture(event.pointerId);
 paint();updateDraftText();
}
svg.addEventListener('pointerup',stopDrag);
svg.addEventListener('pointercancel',stopDrag);
svg.addEventListener('selectstart',event=>event.preventDefault());
svg.addEventListener('dragstart',event=>event.preventDefault());
img.addEventListener('dragstart',event=>event.preventDefault());
if(typeof ResizeObserver!=='undefined'){
 new ResizeObserver(()=>{if(report&&img.complete)paint()}).observe(img);
}
let lastSignature='';
async function autoScanOnce(){
 try{
  const src=await window.constructionAITraceSource();
  if(!src?.file||!['image/png','image/jpeg'].includes(src.file.type))return;
  const fingerprint=JSON.stringify([src.scope,src.floorName,src.file.size,src.file.lastModified]);
  if(fingerprint===lastSignature||$('wallCandidateScan').disabled)return;
  lastSignature=fingerprint;
  $('wallCandidateScan').click();
 }catch(e){status.textContent='Use Rescan floor plan to start local wall review: '+e.message}
}
window.addEventListener('construction-3d-enter',autoScanOnce);
function reset(message){
 ++scanCycle;lastSignature='';
 cleanup();$('wallCandidateScan').disabled=false;
 status.textContent=message;
}
window.addEventListener('construction-room-change',()=>{
 reset('Room changed. Reopen 3D to review possible wall lines for the new room.');
 if(host.classList.contains('active'))requestAnimationFrame(autoScanOnce);
});
window.addEventListener('construction-scale-source-changed',()=>{
 reset('Floor plan replaced. This drawing will be rescanned and reviewed separately.');
 if(host.classList.contains('active'))requestAnimationFrame(autoScanOnce);
});
if(host.classList.contains('active'))requestAnimationFrame(autoScanOnce);
})();