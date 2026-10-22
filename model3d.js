(()=>{'use strict';
const $=id=>document.getElementById(id),DB='construction-ai-model-files-v1',META='construction-ai-model-workspace-v1',TYPES=['image/jpeg','image/png','application/pdf'];
const defaults=()=>({floor:null,elevations:[],length:12,width:10,height:9,yaw:35,issues:[],calibration:null,createdAt:null});
const scope=()=>{const c=window.constructionAIProjects?.current();return !c||c.projectId==='legacy-project'&&c.roomId==='legacy-room'?'':':'+c.projectId+':'+c.roomId};const scopedKey=()=>META+scope();const fileKey=key=>scope()?scope()+':'+key:key;let state=defaults();function loadState(){state=defaults();try{state={...state,...JSON.parse(localStorage.getItem(scopedKey())||'{}')}}catch(e){}}loadState();
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2);
const save=()=>{localStorage.setItem(scopedKey(),JSON.stringify(state))};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function put(key,file){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file,fileKey(key));tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function getFile(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly'),r=tx.objectStore('files').get(fileKey(key));tx.oncomplete=()=>{db.close();resolve(r.result||null)};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function remove(key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(fileKey(key));tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
const ready=()=>Boolean(state.floor&&state.elevations.length);
let saving=false;
function refreshFiles(){const floor=$('modelFloorName'),elev=$('modelElevationNames'),ok=ready();floor.textContent=state.floor?'Saved: '+state.floor.name:'Not uploaded';elev.textContent=state.elevations.length?state.elevations.map(x=>x.name).join(' · '):'Not uploaded';$('modelFloorCard').classList.toggle('uploaded',!!state.floor);$('modelElevationCard').classList.toggle('uploaded',!!state.elevations.length);$('modelFloorBadge').textContent=state.floor?'Uploaded':'Required';$('modelElevationBadge').textContent=state.elevations.length?'Uploaded':'Required';$('modelFileSummary').textContent=(state.floor?'1 floor plan':'No floor plan')+' · '+state.elevations.length+' elevation(s)';$('modelContinue').disabled=!ok||saving;$('modelReady').textContent=ok?'Both required drawings are saved. You can continue.':'The 3D model stays locked until both files are uploaded.';const missing=Number(!state.floor)+Number(!state.elevations.length);$('modelMissingCount').textContent=missing?('Upload '+missing+' required drawing type'+(missing===1?'':'s')+' to continue.'):'Both requirements complete.'}
function openModal(){refreshFiles();const d=$('modelUploadDialog');if(!d.open){if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','')}}
function enter(){if(!ready()){openModal();return false}draw();return true}
window.constructionAI3DEnter=enter;
window.constructionAITraceSource=async()=>({file:await getFile('floor'),calibration:state.calibration?JSON.parse(JSON.stringify(state.calibration)):null,scope:scopedKey(),floorName:state.floor?.name||null,elevations:state.elevations.map(e=>e.name)});
async function syncReferences(){if(!window.constructionAIImportModelReference)return;const items=[...(state.floor?[{key:'floor',kind:'floor'}]:[]),...state.elevations.map(e=>({key:'elev-'+e.id,kind:'elevation'}))];for(const item of items){const file=await getFile(item.key);if(file)await window.constructionAIImportModelReference(file,item.kind,item.key)}}
window.addEventListener('construction-library-ready',()=>syncReferences().catch(e=>console.warn('Drawing sync needs review:',e)));
function issueList(){return state.issues}
function refreshDrawingSetup(){const c=state.calibration,verified=!!c?.verified;$('setupScaleDescription').textContent=verified?'Calibrated: '+c.feet+' feet over '+c.pixels.toFixed(1)+' pixels.':'Scale calibration pending. Select two points on the drawing.';$('setupCalibrate').disabled=!state.floor;$('setupClearScale').hidden=!verified;$('setupOpenElevation').disabled=!state.elevations.length}
function refreshCalibration(){const c=state.calibration;$('modelCalibrationStatus').textContent=c?.verified?'Calibrated manually: '+c.feet+' ft over '+c.pixels+' px ('+(c.feet/c.pixels).toFixed(5)+' ft/pixel). Source: '+(state.floor?.name||'floor plan')+'.':'No verified scale calibration is saved for this floor plan.'}
$('modelCalibrationForm').onsubmit=e=>{e.preventDefault();const feet=Number($('modelKnownFeet').value),pixels=Number($('modelKnownPixels').value);if(!Number.isFinite(feet)||feet<=0||!Number.isFinite(pixels)||pixels<=0){$('modelCalibrationStatus').textContent='Enter positive known distance and pixel span.';return}state.calibration={verified:true,feet,pixels,sourceName:state.floor?.name||'',method:'manual',verifiedAt:new Date().toISOString()};save();draw();refreshCalibration();$('modelIssueDetail').hidden=true};
$('modelClearCalibration').onclick=()=>{state.calibration=null;save();draw();refreshCalibration()};
let rulerPoints=[],rulerURL=null,rulerSize=null;
const ruler=$('scaleRulerDialog'),rulerImage=$('scaleRulerImage'),rulerOverlay=$('scaleRulerOverlay');
function rulerDistance(){return rulerPoints.length===2?Math.hypot(rulerPoints[1].x-rulerPoints[0].x,rulerPoints[1].y-rulerPoints[0].y):0}
let rulerDrag=-1,rulerSnapCanvas=null,rulerSnapContext=null;
// Use the image itself as the single coordinate reference for touch, handles,
// snapping and the loupe. An SVG sized to the scroll viewport can drift from a
// taller floor-plan image, especially on iPad.
function syncRulerOverlay(){
 if(!rulerSize)return;
 const width=rulerImage.clientWidth,height=rulerImage.clientHeight;
 if(!width||!height)return;
 rulerOverlay.style.width=width+'px';
 rulerOverlay.style.height=height+'px';
 rulerOverlay.setAttribute('viewBox','0 0 '+rulerSize.width+' '+rulerSize.height);
}
const rulerCoords=e=>{
 if(!rulerSize)return null;
 const rect=rulerImage.getBoundingClientRect();
 if(!rect.width||!rect.height)return null;
 return {x:Math.max(0,Math.min(rulerSize.width,(e.clientX-rect.left)*rulerSize.width/rect.width)),
         y:Math.max(0,Math.min(rulerSize.height,(e.clientY-rect.top)*rulerSize.height/rect.height))};
};
function rulerRadius(){const rect=rulerImage.getBoundingClientRect();return rect.width?Math.max(3,Math.min(20,11*rulerSize.width/rect.width)):12}
function snapRulerPoint(p){if(!$('scaleRulerSnap').checked||!rulerSnapContext)return p;const radius=Math.max(2,Math.min(24,Math.round(rulerRadius()*1.4)));const cx=Math.round(p.x),cy=Math.round(p.y);const x0=Math.max(0,cx-radius),y0=Math.max(0,cy-radius),w=Math.min(rulerSize.width-x0,2*radius+1),h=Math.min(rulerSize.height-y0,2*radius+1);if(w<=0||h<=0)return p;let pixels;try{pixels=rulerSnapContext.getImageData(x0,y0,w,h).data}catch{return p}let best=null,bestDist=Infinity;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4;const brightness=(pixels[k]+pixels[k+1]+pixels[k+2])/3;if(pixels[k+3]<200||brightness>95)continue;const dx=x0+x-p.x,dy=y0+y-p.y,d=dx*dx+dy*dy;if(d<bestDist){bestDist=d;best={x:x0+x,y:y0+y}}}return best||p}
const rulerLens=$('scaleRulerMagnifier'),rulerLensCanvas=$('scaleRulerMagnifierCanvas'),rulerLensCtx=rulerLensCanvas.getContext('2d');
function hideRulerLens(){rulerLens.hidden=true}
function showRulerLens(p,e,raw=p){
 if(!rulerSize||!rulerImage.complete||!rulerImage.naturalWidth||!rulerLensCtx)return;
 const diameter=180,zoom=4;
 const rect=rulerImage.getBoundingClientRect();
 if(rect.width<=0||rect.height<=0)return;
 // Zoom means 4x the *visible drawing*, not 4x original image pixels.
 // This preserves the finger-to-drawing correspondence at any image scale.
 const sourcePerCssX=rulerSize.width/rect.width;
 const sourcePerCssY=rulerSize.height/rect.height;
 const spanX=diameter*sourcePerCssX/zoom;
 const spanY=diameter*sourcePerCssY/zoom;
 const left=raw.x-spanX/2,top=raw.y-spanY/2;
 const lensX=Math.max(96,Math.min(window.innerWidth-96,e.clientX));
 const lensY=e.clientY>215?e.clientY-18:Math.min(window.innerHeight-8,e.clientY+205);
 rulerLens.style.left=lensX+'px';rulerLens.style.top=lensY+'px';
 rulerLens.style.transform='translate(-50%,-100%)';
 const ctx=rulerLensCtx;
 ctx.clearRect(0,0,diameter,diameter);ctx.fillStyle='#fff';ctx.fillRect(0,0,diameter,diameter);
 const x0=Math.max(0,left),y0=Math.max(0,top);
 const x1=Math.min(rulerSize.width,left+spanX),y1=Math.min(rulerSize.height,top+spanY);
 if(x1>x0&&y1>y0){
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(rulerImage,x0,y0,x1-x0,y1-y0,
   (x0-left)*diameter/spanX,(y0-top)*diameter/spanY,
   (x1-x0)*diameter/spanX,(y1-y0)*diameter/spanY);
 }
 // Crosshair always corresponds to the image pixel directly under the finger.
 ctx.strokeStyle='#e78200';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(90,64);ctx.lineTo(90,116);ctx.moveTo(64,90);ctx.lineTo(116,90);ctx.stroke();
 ctx.beginPath();ctx.arc(90,90,5,0,Math.PI*2);ctx.stroke();
 // Blue ring identifies the snapped/placed endpoint if different from the finger.
 const tx=90+(p.x-raw.x)*diameter/spanX,ty=90+(p.y-raw.y)*diameter/spanY;
 if(Number.isFinite(tx)&&Number.isFinite(ty)){
  ctx.strokeStyle='#087ef5';ctx.fillStyle='#087ef5';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(tx,ty,7,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(tx,ty,2,0,Math.PI*2);ctx.fill();
 }
 rulerLens.hidden=false;
}
const fractionDialog=$('scaleRulerFractionDialog'),fractionNumerator=$('scaleRulerNumerator'),fractionDenominator=$('scaleRulerDenominator');
function fractionGcd(a,b){while(b){const r=a%b;a=b;b=r}return a||1}
function fractionText(n,d){if(!n)return '0';const g=fractionGcd(n,d);return (n/g)+'/'+(d/g)}
function selectedFraction(){
 const n=Number(fractionNumerator.value),d=Number(fractionDenominator.value);
 return Number.isInteger(n)&&Number.isInteger(d)&&d>0&&n>=0&&n<d?{n,d}:null;
}
function rebuildFractionNumerators(){
 const d=Number(fractionDenominator.value),previous=Number(fractionNumerator.value)||0;
 fractionNumerator.replaceChildren();
 for(let n=0;n<d;n++){const option=document.createElement('option');option.value=String(n);option.textContent=String(n);fractionNumerator.append(option)}
 fractionNumerator.value=String(Math.min(previous,d-1));
 updateFractionPreview();
}
function updateFractionPreview(){
 const fraction=selectedFraction();
 $('scaleRulerFractionPreview').textContent=fraction?fractionText(fraction.n,fraction.d)+'″':'Select a valid fraction';
}
function rulerFractionLabel(){
 const n=Number($('scaleRulerFraction').dataset.numerator||0),d=Number($('scaleRulerFraction').dataset.denominator||16);
 return fractionText(n,d);
}
$('scaleRulerFractionOpen').onclick=()=>{
 const n=Number($('scaleRulerFraction').dataset.numerator||0),d=Number($('scaleRulerFraction').dataset.denominator||16);
 fractionDenominator.value=String(d);rebuildFractionNumerators();fractionNumerator.value=String(n);updateFractionPreview();fractionDialog.showModal();
};
fractionDenominator.onchange=rebuildFractionNumerators;
fractionNumerator.onchange=updateFractionPreview;
$('scaleRulerFractionCancel').onclick=()=>fractionDialog.close();
$('scaleRulerFractionClear').onclick=()=>{fractionNumerator.value='0';updateFractionPreview()};
$('scaleRulerFractionApply').onclick=()=>{
 const fraction=selectedFraction();if(!fraction)return;
 const field=$('scaleRulerFraction');field.value=String(fraction.n/fraction.d);
 field.dataset.numerator=String(fraction.n);field.dataset.denominator=String(fraction.d);
 $('scaleRulerFractionOpen').textContent='Fraction: '+fractionText(fraction.n,fraction.d);
 fractionDialog.close();paintRuler();
};
rebuildFractionNumerators();
function rulerKnownDistance(){
 const ft=Number($('scaleRulerFeet').value),inch=Number($('scaleRulerInches').value),fraction=Number($('scaleRulerFraction').value);
 if($('scaleRulerFeet').value===''||$('scaleRulerInches').value===''||!Number.isInteger(ft)||ft<0||!Number.isInteger(inch)||inch<0||inch>11||!Number.isFinite(fraction)||fraction<0||fraction>=1)return null;
 const totalInches=ft*12+inch+fraction;
 return totalInches>0?{feet:totalInches/12,feetPart:ft,inchesPart:inch,fractionPart:fraction}:null;
}
function rulerDistanceLabel(){
 const d=rulerKnownDistance();
 $('scaleRulerDistanceStatus').textContent=d?`${d.feetPart}′-${d.inchesPart}${d.fractionPart?' '+rulerFractionLabel():''}″`:'Enter a valid positive distance (0–11 whole inches).';
}
function paintRuler(){rulerDistanceLabel();syncRulerOverlay();const pts=rulerPoints;const r=rulerSize?rulerRadius():10;const ns='http://www.w3.org/2000/svg';rulerOverlay.replaceChildren();if(pts.length===2){const line=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:pts[0].x,y1:pts[0].y,x2:pts[1].x,y2:pts[1].y,stroke:'#f59e0b','stroke-width':Math.max(2,r*.32)}))line.setAttribute(k,v);rulerOverlay.appendChild(line)}pts.forEach((p,i)=>{const halo=document.createElementNS(ns,'circle');for(const [k,v] of Object.entries({cx:p.x,cy:p.y,r:r*1.6,fill:'#0b76d1','fill-opacity':'.15'}))halo.setAttribute(k,v);rulerOverlay.appendChild(halo);const c=document.createElementNS(ns,'circle');for(const [k,v] of Object.entries({cx:p.x,cy:p.y,r,fill:i===rulerDrag?'#ffb52a':'#087ef5',stroke:'#ffffff','stroke-width':Math.max(2,r*.3)}))c.setAttribute(k,v);rulerOverlay.appendChild(c);const dot=document.createElementNS(ns,'circle');for(const [k,v] of Object.entries({cx:p.x,cy:p.y,r:Math.max(2,r*.22),fill:'#ffffff'}))dot.setAttribute(k,v);rulerOverlay.appendChild(dot)});$('scaleRulerPixels').textContent=pts.length===2?rulerDistance().toFixed(1)+' original-image pixels · drag either point to adjust':pts.length===1?'Point 1 placed · drag to adjust or tap point 2':'Tap the first endpoint';$('scaleRulerSave').disabled=!(rulerDistance()>0&&!!rulerKnownDistance())}
if(typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>{if(rulerSize)paintRuler()}).observe(rulerImage)}
rulerOverlay.addEventListener('pointerdown',e=>{const p=rulerCoords(e);if(!p)return;e.preventDefault();const radius=rulerRadius()*2;let idx=rulerPoints.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<=radius);if(idx<0){if(rulerPoints.length===2)rulerPoints=[];idx=rulerPoints.length;rulerPoints.push(snapRulerPoint(p))}rulerDrag=idx;ruler.classList.add('ruler-is-dragging');window.getSelection?.()?.removeAllRanges();rulerOverlay.setPointerCapture?.(e.pointerId);paintRuler();showRulerLens(rulerPoints[idx],e,p)});
rulerOverlay.addEventListener('pointermove',e=>{if(rulerDrag<0)return;const p=rulerCoords(e);if(!p)return;e.preventDefault();rulerPoints[rulerDrag]=snapRulerPoint(p);paintRuler();showRulerLens(rulerPoints[rulerDrag],e,p)});
function endRulerDrag(e){if(rulerDrag<0)return;rulerDrag=-1;ruler.classList.remove('ruler-is-dragging');hideRulerLens();if(rulerOverlay.hasPointerCapture?.(e.pointerId))rulerOverlay.releasePointerCapture(e.pointerId);paintRuler()}
rulerOverlay.addEventListener('pointerup',endRulerDrag);
rulerOverlay.addEventListener('dragstart',e=>e.preventDefault());
rulerOverlay.addEventListener('selectstart',e=>e.preventDefault());
rulerImage.addEventListener('dragstart',e=>e.preventDefault());
ruler.addEventListener('selectstart',e=>{if(rulerDrag>=0)e.preventDefault()});
rulerOverlay.addEventListener('pointercancel',endRulerDrag);
$('scaleRulerSnap').onchange=()=>{$('scaleRulerSnapNote').textContent=$('scaleRulerSnap').checked?'Snap to nearest dark image pixel (approximate; inspect placement).':'Free placement; snapping off.'};
for(const id of ['scaleRulerFeet','scaleRulerInches','scaleRulerFraction'])$(id).addEventListener('input',paintRuler);
$('scaleRulerReset').onclick=()=>{rulerPoints=[];paintRuler()};
$('scaleRulerClose').onclick=()=>ruler.close();
$('setupCalibrate').onclick=async()=>{const initialScope=scopedKey();rulerPoints=[];rulerSize=null;rulerDrag=-1;ruler.classList.remove('ruler-is-dragging');hideRulerLens();rulerSnapCanvas=null;rulerSnapContext=null;if(rulerURL){URL.revokeObjectURL(rulerURL);rulerURL=null}rulerImage.removeAttribute('src');$('scaleRulerStatus').textContent='Loading floor plan from local storage…';paintRuler();ruler.showModal();try{const file=await getFile('floor');if(initialScope!==scopedKey()||!ruler.open)return;if(!file)throw Error('Floor plan file is missing. Upload it again.');if(!['image/jpeg','image/png'].includes(file.type))throw Error('PDF scale selection is not supported yet. Upload a JPG or PNG floor plan to use the point ruler.');rulerURL=URL.createObjectURL(file);rulerImage.onload=()=>{rulerSize={width:rulerImage.naturalWidth,height:rulerImage.naturalHeight};syncRulerOverlay();rulerOverlay.setAttribute('preserveAspectRatio','none');rulerSnapCanvas=document.createElement('canvas');rulerSnapCanvas.width=rulerSize.width;rulerSnapCanvas.height=rulerSize.height;rulerSnapContext=rulerSnapCanvas.getContext('2d',{willReadFrequently:true});rulerSnapContext?.drawImage(rulerImage,0,0);paintRuler();$('scaleRulerStatus').textContent='Tap both endpoints on the scale bar or known dimension.'};rulerImage.src=rulerURL}catch(err){$('scaleRulerStatus').textContent=err.message}};
$('scaleRulerSave').onclick=()=>{const known=rulerKnownDistance(),pixels=rulerDistance();if(!rulerSize||!known||pixels<=0)return;const feet=known.feet;state.calibration={verified:true,feet,pixels,knownDistance:{feet:known.feetPart,inches:known.inchesPart,fraction:known.fractionPart},points:rulerPoints.map(p=>({...p})),imageSize:rulerSize,sourceName:state.floor?.name||'',method:'two-point-manual',verifiedAt:new Date().toISOString()};save();ruler.close();draw()};
$('setupClearScale').onclick=()=>{if(!confirm('Clear saved scale calibration for this room?'))return;state.calibration=null;save();draw()};
$('setupOpenElevation').onclick=async()=>{if(!state.elevations.length)return;await window.constructionAISelectSourceDrawing?.('elev-'+state.elevations[0].id)};
ruler.addEventListener('close',()=>{if(rulerURL){URL.revokeObjectURL(rulerURL);rulerURL=null}rulerSize=null;rulerSnapCanvas=null;rulerSnapContext=null;ruler.classList.remove('ruler-is-dragging');hideRulerLens()});
function currentIssues(){return issueList().filter(x=>x.status!=='resolved')}
function project(x,y,z,yaw){const a=yaw*Math.PI/180,xx=x*Math.cos(a)-y*Math.sin(a),yy=x*Math.sin(a)+y*Math.cos(a);return [280+xx*18,230+yy*8-z*19]}
function path(points,yaw){return points.map((p,i)=>{const q=project(...p,yaw);return(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join(' ')+' Z'}
function draw(){if(!$('modelScene'))return;refreshDrawingSetup();const l=Number(state.length),w=Number(state.width),h=Number(state.height),yaw=Number(state.yaw);const m=Math.max(l,w,h),scale=11/Math.max(m,1);const L=l*scale,W=w*scale,H=h*scale;const A=[-L/2,-W/2,0],B=[L/2,-W/2,0],C=[L/2,W/2,0],D=[-L/2,W/2,0],E=[-L/2,-W/2,H],F=[L/2,-W/2,H],G=[L/2,W/2,H],I=[-L/2,W/2,H];const polys=[{p:[A,B,C,D],fill:'#24445d',stroke:'#7eafc9'},{p:[A,B,F,E],fill:'#2b5472',stroke:'#80b8d8'},{p:[B,C,G,F],fill:'#193a58',stroke:'#77a9cb'},{p:[D,C,G,I],fill:'#2b5472',stroke:'#80b8d8'},{p:[A,D,I,E],fill:'#193a58',stroke:'#77a9cb'}];const walls=polys.map((v,i)=>'<path d="'+path(v.p,yaw)+'" fill="'+v.fill+'" fill-opacity="'+(i?'.37':'.85')+'" stroke="'+v.stroke+'" stroke-width="1.5" stroke-linejoin="round"/>').join('');const edges=[[E,F],[F,G],[G,I],[I,E]] .map(pair=>'<path d="'+path(pair,yaw).replace(/ Z$/,'')+'" fill="none" stroke="#a8cde3" stroke-width="1.4" stroke-dasharray="4 4"/>').join('');const issues=currentIssues();const coords=[[0,0,H],[L/2,0,H*.65],[0,W/2,H*.5],[-L/2,0,H*.65],[0,-W/2,H*.7]];const circles=issues.slice(0,12).map((v,i)=>{const p=project(...coords[i%coords.length],yaw);return '<g class="model-marker" data-issue="'+esc(v.id)+'" role="button" tabindex="0" aria-label="Review '+esc(v.title)+'" transform="translate('+p[0]+','+p[1]+')"><circle class="model-marker-halo" r="17"/><circle class="model-marker-core" r="8"/><text y="4" text-anchor="middle" font-size="11" font-weight="bold" fill="#0a1626">!</text></g>'}).join('');$('modelScene').innerHTML='<defs><radialGradient id="modelBg"><stop stop-color="#23415c"/><stop offset="1" stop-color="#0c1929"/></radialGradient></defs><rect width="560" height="400" fill="url(#modelBg)"/><g>'+walls+edges+'</g>'+circles+'<text x="16" y="375" fill="#b3cce0" font-size="13">Conceptual room volume · not generated from drawings</text>';$('modelScene').querySelectorAll('[data-issue]').forEach(el=>{const handler=()=>selectIssue(el.getAttribute('data-issue'));el.addEventListener('click',handler);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handler()}})});$('modelIssueCount').textContent=issues.length+' review item(s)';$('modelIssueList').innerHTML=issues.length?issues.map(x=>'<button type="button" class="model-issue-row" data-select="'+esc(x.id)+'"><span class="model-mini-dot"></span>'+esc(x.title)+'</button>').join(''):'<p>No open review items.</p>';$('modelIssueList').querySelectorAll('[data-select]').forEach(el=>el.onclick=()=>selectIssue(el.dataset.select));$('modelYawLabel').textContent=yaw+'°'}
function selectIssue(id){const item=issueList().find(x=>x.id===id);if(!item)return;$('modelGoToDrawing').onclick=async()=>{const key=item.sourceKey||(item.id==='alignment'&&state.elevations.length?'elev-'+state.elevations[0].id:'floor');const found=await window.constructionAISelectSourceDrawing?.(key);if(!found){$('modelIssueSource').textContent='Source drawing unavailable in this room. Open Library to check the uploaded files.';window.constructionAIShowTab?.('library')}};$('modelIssueDetail').hidden=false;$('modelIssueTitle').textContent=item.title;$('modelIssueDescription').textContent=item.detail;$('modelIssueSource').textContent=item.type==='setup'?'Setup check · not an automatically detected conflict':'Manually added review item · location illustrative';$('modelResolve').hidden=item.type==='setup';$('modelCalibrationPanel').hidden=id!=='scale';if(id==='scale')refreshCalibration();$('modelResolve').onclick=()=>{const record=state.issues.find(x=>x.id===id);if(record){record.status='resolved';save();draw();$('modelIssueDetail').hidden=true}}}
async function storeFiles(){if(saving)return;const floor=$('modelFloorFile').files?.[0],elevs=Array.from($('modelElevationFiles').files||[]);if(!floor&&!elevs.length)return;const files=[...(floor?[floor]:[]),...elevs];if(files.some(f=>!TYPES.includes(f.type)||f.size>40*1024*1024)){$('modelUploadStatus').textContent='Choose JPG, PNG or PDF files, up to 40 MB each.';return}saving=true;refreshFiles();$('modelUploadStatus').textContent='Saving drawings on this device…';try{if(floor){await put('floor',floor);state.floor={name:floor.name,size:floor.size,type:floor.type};state.calibration=null;try{await window.constructionAIImportModelReference?.(floor,'floor','floor')}catch(syncError){console.warn('Library copy needs attention:',syncError)}}for(const file of elevs){const id=uid();await put('elev-'+id,file);state.elevations.push({id,name:file.name,size:file.size,type:file.type});try{await window.constructionAIImportModelReference?.(file,'elevation','elev-'+id)}catch(syncError){console.warn('Library copy needs attention:',syncError)}}save();$('modelFloorFile').value='';$('modelElevationFiles').value='';$('modelUploadStatus').textContent='Drawings saved locally. No server upload.';draw()}catch(e){$('modelUploadStatus').textContent='Could not save file: '+e.message}finally{saving=false;refreshFiles()}}
$('modelFloorFile').addEventListener('change',storeFiles);$('modelElevationFiles').addEventListener('change',storeFiles);
$('modelSaveFiles').onclick=storeFiles;
$('modelContinue').onclick=()=>{if(!ready()||saving)return;$('modelUploadDialog').close();window.constructionAIShowTab?.('model3d')};
function cancelSetup(){if($('modelUploadDialog').open)$('modelUploadDialog').close();if(window.constructionAIActiveTab?.()==='model3d'&&!ready())window.constructionAIShowTab?.('drawings')}
$('modelCloseDialog').onclick=cancelSetup;$('modelCloseX').onclick=cancelSetup;
$('modelUploadDialog').addEventListener('cancel',e=>{e.preventDefault();cancelSetup()});
$('modelChangeFiles').onclick=openModal;
$('modelClearElevations').onclick=async()=>{if(!confirm('Remove all saved elevations for this room?'))return;try{for(const e of state.elevations)await remove('elev-'+e.id);state.elevations=[];save();refreshFiles()}catch(e){$('modelUploadStatus').textContent=e.message}};
$('modelYaw').value=state.yaw;$('modelYaw').oninput=e=>{state.yaw=Number(e.target.value);save();draw()};
for(const [id,key] of [['modelLength','length'],['modelWidth','width'],['modelHeight','height']]){$(id).value=state[key];$(id).onchange=e=>{const v=Number(e.target.value);if(!Number.isFinite(v)||v<=0||v>100){e.target.value=state[key];return}state[key]=v;save();draw()}}
$('modelAddIssue').onsubmit=e=>{e.preventDefault();const title=$('modelNewIssueTitle').value.trim(),detail=$('modelNewIssueDetail').value.trim();if(!title)return;state.issues.push({id:uid(),title:title.slice(0,160),detail:detail.slice(0,1500)||'Requires review.',status:'open',type:'manual',createdAt:new Date().toISOString()});save();$('modelAddIssue').reset();draw()};
window.addEventListener('construction-room-change',()=>{loadState();$('modelIssueDetail').hidden=true;$('modelYaw').value=state.yaw;for(const [id,key] of [['modelLength','length'],['modelWidth','width'],['modelHeight','height']])$(id).value=state[key];refreshFiles();draw();syncReferences().catch(e=>console.warn('Drawing sync needs review:',e));if(document.getElementById('model3d')?.classList.contains('active')&&!ready())openModal()});refreshFiles();draw();syncReferences().catch(e=>console.warn('Drawing sync needs review:',e));
})();