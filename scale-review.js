/* Local-only visual review for provisional engine scale evidence. */
(()=>{
'use strict';
const SCHEMA='site-resolv3d-scale-evidence-v1';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const xy=(p,w,h)=>Array.isArray(p)&&p.length===2&&finite(p[0])&&finite(p[1])&&p[0]>=0&&p[1]>=0&&p[0]<=w&&p[1]<=h;
const text=s=>typeof s==='string'&&s.trim().length>0;
function validateScaleReview(data,filename){
 if(!data||data.schema!==SCHEMA||!['provisional','needs_review'].includes(data.status)
   ||data.automatic_confirmation!==false||data.ready_for_verified_3d!==false)
  throw Error('Expected an unverified SITE RESOLV3D source-evidence-v1 file.');
 const s=data.source;
 if(!s||!text(s.filename)||!text(s.sheet)||!text(s.revision)
  ||s.filename!==filename||s.page!==1||!Number.isSafeInteger(s.width_px)
  ||!Number.isSafeInteger(s.height_px)||s.width_px<1||s.height_px<1
  ||s.width_px>200000||s.height_px>200000)
  throw Error('Drawing filename or source page information does not match this floor plan.');
 const scale=data.metres_per_original_image_pixel;
 if((data.status==='provisional'&&(!finite(scale)||scale<=0))
   ||(data.status==='needs_review'&&scale!==null))
  throw Error('Inconsistent provisional scale proposal.');
 if(!Array.isArray(data.observations)||data.observations.length>250
   ||!Array.isArray(data.issues)||data.issues.length>500)
  throw Error('Invalid dimension candidate or review issue list.');
 const ids=new Set(),w=s.width_px,h=s.height_px;
 for(const c of data.observations){
  const box=c?.label_box_px,pts=c?.points_px;
  if(!text(c?.id)||ids.has(c.id)||!text(c.label)||c.label.length>160
    ||c.association_status!=='candidate_unverified'||!['h','v'].includes(c.axis)
    ||!finite(c.ocr_confidence)||c.ocr_confidence<0||c.ocr_confidence>100
    ||!Array.isArray(pts)||pts.length!==2||!xy(pts[0],w,h)||!xy(pts[1],w,h)
    ||Math.hypot(pts[0][0]-pts[1][0],pts[0][1]-pts[1][1])<1
    ||!Array.isArray(box)||box.length!==4||box.some(x=>!finite(x))
    ||box[0]<0||box[1]<0||box[2]<=0||box[3]<=0
    ||box[0]+box[2]>w||box[1]+box[3]>h)
   throw Error('Invalid, duplicate or out-of-bounds dimension candidate.');
  ids.add(c.id);
 }
 return data;
}
function candidateBounds(c){
 const [a,b]=c.points_px;
 return {x:(a[0]+b[0])/2,y:(a[1]+b[1])/2};
}
const core={validateScaleReview,candidateBounds,SCHEMA};
if(typeof module!=='undefined'&&module.exports)module.exports=core;
if(typeof document==='undefined')return;

const $=id=>document.getElementById(id);
const store=window.constructionAI3DScaleEvidenceStore;
if(!store||!$('scaleReviewFile'))return;
const dialog=$('scaleReviewDialog'),img=$('scaleReviewImage'),svg=$('scaleReviewOverlay');
const viewport=$('scaleReviewViewport'),status=$('scaleReviewStatus');
let packet=null,imgURL=null,selected=null,cycle=0;
function cleanupImage(){if(imgURL){URL.revokeObjectURL(imgURL);imgURL=null}img.removeAttribute('src');svg.replaceChildren()}
function close(){if(dialog.open)dialog.close();cleanupImage()}
dialog.addEventListener('close',cleanupImage);
$('scaleReviewClose').onclick=close;
function message(s){
 status.textContent=s;
 $('scaleReviewOpen').disabled=!packet;
 $('scaleReviewRemove').hidden=!packet;
}
async function current(){
 const ref=await window.constructionAITraceSource?.();
 return ref?.file&&ref.floorName&&ref.scope===store.scope()?ref:null;
}
async function refresh(){
 const ticket=++cycle;packet=null;close();message('Checking locally saved scale evidence…');
 try{
  const ref=await current();if(ticket!==cycle)return;
  if(!ref){message('Upload a floor plan to review scale evidence.');return}
  const saved=await store.read();if(ticket!==cycle)return;
  if(!saved){message('No scale analysis loaded. Manual calibration remains available.');return}
  if(saved.size>2*1024*1024)throw Error('File exceeds the 2 MB review limit.');
  const result=validateScaleReview(JSON.parse(await saved.text()),ref.floorName);
  if(ticket!==cycle)return;
  packet=result;
  message((result.status==='provisional'?'Provisional proposal':'Needs review')+
    ' · '+result.observations.length+' dimension(s) · '+result.issues.length+
    ' issue(s). Not applied to calibration.');
 }catch(e){if(ticket===cycle)message('Saved evidence needs attention: '+e.message)}
}
$('scaleReviewFile').onchange=async()=>{
 const file=$('scaleReviewFile').files?.[0];if(!file)return;
 const ticket=++cycle;packet=null;message('Checking imported evidence locally…');
 try{
  if(file.size>2*1024*1024)throw Error('Choose a JSON file smaller than 2 MB.');
  const ref=await current();if(!ref)throw Error('Upload the matching floor plan first.');
  const result=validateScaleReview(JSON.parse(await file.text()),ref.floorName);
  if(ticket!==cycle||ref.scope!==store.scope())return;
  await store.write(new Blob([JSON.stringify(result)],{type:'application/json'}));
  if(ticket!==cycle)return;
  packet=result;
  message((result.status==='provisional'?'Provisional proposal':'Needs review')+
   ' · '+result.observations.length+' dimension candidate(s). Nothing applied.');
 }catch(e){if(ticket===cycle)message('Cannot import scale analysis: '+e.message)}
 finally{$('scaleReviewFile').value=''}
};
$('scaleReviewRemove').onclick=async()=>{
 ++cycle;
 try{await store.clear();packet=null;close();message('Local analysis removed. Manual calibration unchanged.')}
 catch(e){message('Unable to remove local evidence: '+e.message)}
};
const ns='http://www.w3.org/2000/svg';
function element(name,attr){
 const n=document.createElementNS(ns,name);
 for(const [key,value] of Object.entries(attr))n.setAttribute(key,String(value));
 return n;
}
function draw(){
 if(!packet)return;
 svg.replaceChildren();
 const s=packet.source;
 svg.setAttribute('viewBox','0 0 '+s.width_px+' '+s.height_px);
 svg.setAttribute('preserveAspectRatio','none');
 for(const c of packet.observations){
  const active=c.id===selected,group=element('g',{'data-evidence-id':c.id});
  const [a,b]=c.points_px,[x,y,w,h]=c.label_box_px;
  group.append(element('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],
    stroke:active?'#ee7c13':'#ef9b42','stroke-width':active?4:2,
    'stroke-dasharray':active?'none':'7 5'}));
  group.append(element('rect',{x,y,width:w,height:h,fill:'none',
    stroke:active?'#087ef5':'#6c95b7','stroke-width':active?3:1.5}));
  for(const p of [a,b])group.append(element('circle',{cx:p[0],cy:p[1],r:active?7:5,
    fill:active?'#087ef5':'#f59e0b',stroke:'#fff','stroke-width':2}));
  svg.append(group);
 }
}
function choose(id){
 selected=id;draw();
 for(const b of $('scaleReviewCandidates').querySelectorAll('button[data-id]')){
  const active=b.dataset.id===id;
  b.setAttribute('aria-pressed',String(active));b.classList.toggle('active',active);
 }
 const item=packet.observations.find(x=>x.id===id);
 if(!item||!img.clientWidth)return;
 const center=candidateBounds(item),s=packet.source;
 viewport.scrollLeft=Math.max(0,center.x*img.clientWidth/s.width_px-viewport.clientWidth/2);
 viewport.scrollTop=Math.max(0,center.y*img.clientHeight/s.height_px-viewport.clientHeight/2);
}
function listCandidates(){
 const list=$('scaleReviewCandidates');list.replaceChildren();
 if(!packet.observations.length){
  const p=document.createElement('p');
  p.textContent='No confident dimension associations. Inspect issues or use manual calibration.';
  list.append(p);return;
 }
 for(const c of packet.observations){
  const b=document.createElement('button');b.type='button';
  b.className='scale-review-candidate';b.dataset.id=c.id;
  b.setAttribute('aria-pressed','false');
  const name=document.createElement('strong');name.textContent=c.label;
  const detail=document.createElement('span');
  detail.textContent='OCR '+Math.round(c.ocr_confidence)+'% · '+(c.axis==='h'?'horizontal':'vertical')+' proposal';
  b.append(name,detail);b.onclick=()=>choose(c.id);list.append(b);
 }
}
$('scaleReviewOpen').onclick=async()=>{
 if(!packet)return;
 const ticket=++cycle;cleanupImage();message('Opening stored floor plan locally…');
 try{
  const ref=await current();
  if(!ref||ref.floorName!==packet.source.filename)throw Error('Floor plan does not match the analysis file.');
  if(!['image/jpeg','image/png'].includes(ref.file.type))
   throw Error('This viewer supports JPG/PNG. TIFF and PDF preview are not yet available.');
  imgURL=URL.createObjectURL(ref.file);
  await new Promise((resolve,reject)=>{
   img.onload=resolve;img.onerror=()=>reject(Error('Could not load the local drawing.'));
   img.src=imgURL;
  });
  if(ticket!==cycle||ref.scope!==store.scope())return;
  const s=packet.source;
  if(img.naturalWidth!==s.width_px||img.naturalHeight!==s.height_px)
   throw Error('Original image pixel dimensions do not match the analysis file.');
  $('scaleReviewSource').textContent=s.sheet+' · Rev '+s.revision+' · '+s.filename+
    ' · Page '+s.page+' (identity supplied by the evidence file)';
  $('scaleReviewSummary').textContent=packet.status==='provisional'
   ?packet.observations.length+' candidate(s). Proposed '+(packet.metres_per_original_image_pixel/0.3048).toPrecision(5)+
     ' feet/original pixel. Not automatically confirmed.'
   :packet.issues.length+' flagged issue(s). No reliable scale proposed.';
  selected=null;listCandidates();draw();dialog.showModal();
  if(packet.observations.length)choose(packet.observations[0].id);
  message('Evidence opened for inspection. Calibration has not changed.');
 }catch(e){cleanupImage();message('Cannot preview: '+e.message)}
};
window.addEventListener('construction-room-change',refresh);
window.addEventListener('construction-scale-source-changed',refresh);
refresh();
})();