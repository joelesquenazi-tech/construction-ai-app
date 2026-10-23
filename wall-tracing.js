(()=>{'use strict';
const $=id=>document.getElementById(id),KEY='construction-ai-traced-walls-v1',SCHEMA='construction-ai-drawing-annotations-v0.1';
const host=$('model3d');if(!host||!window.constructionAITraceSource)return;
const section=document.createElement('section');section.className='drawing-setup';section.id='traceWallSection';
section.innerHTML='<h2>Trace a wall from the floor plan</h2><p>Experimental: manually identify a wall centerline on your local JPG/PNG. This does not recognize walls automatically or verify wall thickness.</p><button type="button" id="traceOpen">Open wall tracing</button><p id="traceSummary" role="status">No traced walls loaded.</p>';
const setup=host.querySelector('.drawing-setup');setup?.insertAdjacentElement('afterend',section);
const dialog=document.createElement('dialog');dialog.id='traceDialog';dialog.className='model-setup-dialog';
dialog.innerHTML='<div class="trace-wrap"><h2>Wall tracing · source coordinates</h2><p id="traceStatus" role="status">Open a local floor plan.</p><div id="traceCanvas" class="trace-canvas"><div class="trace-stage"><img id="traceImage" alt="Floor plan for wall tracing" draggable="false"><svg id="traceSvg" aria-label="Select and drag two wall centerline or independent dimension endpoints"></svg></div></div><div id="traceMagnifier" class="scale-ruler-magnifier" hidden aria-hidden="true"><canvas id="traceMagnifierCanvas" width="180" height="180"></canvas><span class="scale-ruler-magnifier-label">4× detail</span></div><label class="trace-snap-label"><input id="traceSnap" type="checkbox"> Snap to nearby dark drawing pixels (experimental)</label><p id="traceSnapNote">Free placement; snapping off.</p><p id="tracePoints">Select the first endpoint. Drag either point to adjust.</p><div class="trace-fields"><label>Second known dimension (ft)<input id="traceCheckFeet" type="number" min="0.01" step="any" placeholder="e.g. 12"></label><button type="button" id="traceCheckStart">Select independent dimension</button><button type="button" id="traceCheckSave">Check and save scale</button></div><p id="traceCheckResult" role="status">A second known dimension is required before geometry export.</p><div class="trace-fields"><label>Sheet number<input id="traceSheet" maxlength="60" placeholder="A101"></label><label>Revision<input id="traceRevision" maxlength="60" placeholder="Revision identifier"></label><label>Wall ID<input id="traceId" maxlength="60" placeholder="W1"></label><label>Wall thickness (ft)<input id="traceThickness" type="number" min="0.01" step="any" value="0.5"></label><label>Wall height (ft)<input id="traceHeight" type="number" min="0.01" step="any" value="9"></label></div><p>Wall thickness and height are provisional user entries. No elevations are reconciled.</p><div class="trace-fields"><label>Opening wall<select id="traceOpeningWall"></select></label><label>Opening ID<input id="traceOpeningId" placeholder="D1"></label><label>Offset from wall start (ft)<input id="traceOpeningAlong" type="number" min="0" step="any"></label><label>Opening width (ft)<input id="traceOpeningWidth" type="number" min="0.01" step="any"></label><label>Sill above floor (ft)<input id="traceOpeningSill" type="number" min="0" step="any" value="0"></label><label>Opening height (ft)<input id="traceOpeningHeight" type="number" min="0.01" step="any"></label></div><button type="button" id="traceOpeningAdd">Add provisional door/window opening</button><p id="traceOpeningList" role="status">No openings.</p><div class="trace-actions"><button type="button" id="traceReset">Reset points</button><button type="button" id="traceAdd">Save traced wall</button><button type="button" id="traceExport">Export engine JSON</button><button type="button" id="traceClose">Close</button></div><p id="traceCount"></p></div>';
document.body.appendChild(dialog);
let points=[],size=null,url=null,roomKey='',record=null,checkMode=false;
let traceDrag=-1,tracePointer=null;
const traceImage=$('traceImage'),traceSvg=$('traceSvg');
const pointTools=window.ConstructionDrawingPointTools.create({
 image:traceImage,overlay:traceSvg,
 lens:$('traceMagnifier'),canvas:$('traceMagnifierCanvas'),
 getSize:()=>size,isSnapEnabled:()=>$('traceSnap').checked
});
const fields=['traceSheet','traceRevision','traceId','traceThickness','traceHeight'];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function clean(){
 pointTools.hide();traceDrag=-1;tracePointer=null;
 dialog.classList.remove('trace-is-dragging');
 if(url)URL.revokeObjectURL(url);
 url=null;size=null;points=[];checkMode=false;
 traceImage.removeAttribute('src');
 traceSvg.replaceChildren();
}
function key(scope){return KEY+':'+scope}
function load(scope){try{return JSON.parse(localStorage.getItem(key(scope))||'null')}catch{return null}}
function refreshOpenings(){const select=$('traceOpeningWall');select.replaceChildren();for(const w of record?.walls||[]){const option=document.createElement('option');option.value=w.id;option.textContent=w.id;select.appendChild(option)}$('traceOpeningList').textContent=(record?.walls||[]).flatMap(w=>(w.openings||[]).map(o=>w.id+' / '+o.id+' ('+o.width+' ft wide)')).join(' · ')||'No openings.'}
function count(){refreshOpenings();const n=record?.walls?.length||0;$('traceCount').textContent=n+' wall(s) traced for this room.';$('traceSummary').textContent=n+' wall(s) saved locally. Manual traces only; not verified geometry.'}
function checkCalibration(){const c=record?.calibration,cc=record?.crossCheck;if(!c||c.method!=='two-point-manual'||c.points?.length!==2||!(c.feet>0)||!size||c.imageSize?.width!==size.width||c.imageSize?.height!==size.height)return {ok:false,reason:'Matching two-point primary calibration required.'};if(!cc||cc.points_px?.length!==2||!(cc.distance>0))return {ok:false,reason:'Independent dimension missing.'};const [a,b]=c.points.map(p=>[p.x,p.y]);const primary=Math.hypot(b[0]-a[0],b[1]-a[1]);const [p,q]=cc.points_px;const secondary=Math.hypot(q[0]-p[0],q[1]-p[1]);if(!(primary>0&&secondary>0))return {ok:false,reason:'Zero-length calibration.'};const inferred=secondary*c.feet/primary;const error=Math.abs(inferred-cc.distance)/cc.distance;return {ok:error<=0.02,error,reason:error<=0.02?'Independent scale check passed.':'Scale mismatch exceeds 2% provisional threshold.'}}
function updateCheck(){const result=checkCalibration();$('traceCheckResult').textContent=result.reason+(Number.isFinite(result.error)?' Difference: '+(result.error*100).toFixed(2)+'%.':'');return result}
function paint(){if(!size)return;const svg=traceSvg;svg.replaceChildren();pointTools.sync();const ns='http://www.w3.org/2000/svg';

for(const wall of record?.walls||[]){const line=document.createElementNS(ns,'line');line.setAttribute('x1',wall.start_px[0]);line.setAttribute('y1',wall.start_px[1]);line.setAttribute('x2',wall.end_px[0]);line.setAttribute('y2',wall.end_px[1]);line.setAttribute('stroke','#12a879');line.setAttribute('stroke-width',Math.max(2,size.width/500));svg.appendChild(line)}
if(points.length===2){const line=document.createElementNS(ns,'line');for(const [attr,value] of Object.entries({x1:points[0][0],y1:points[0][1],x2:points[1][0],y2:points[1][1],stroke:'#ffb000','stroke-width':Math.max(2,size.width/500)}))line.setAttribute(attr,value);svg.appendChild(line)}
if(record?.crossCheck?.points_px?.length===2){const [a,b]=record.crossCheck.points_px;const line=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#2774dd','stroke-width':Math.max(2,size.width/500)}))line.setAttribute(k,v);svg.appendChild(line)}
const radius=pointTools.radius();
for(const [idx,p] of points.entries()){
 const halo=document.createElementNS(ns,'circle');
 for(const [k,v] of Object.entries({cx:p[0],cy:p[1],r:radius*1.6,fill:'#087ef5','fill-opacity':'.15'}))halo.setAttribute(k,v);
 svg.appendChild(halo);
 const c=document.createElementNS(ns,'circle');
 for(const [k,v] of Object.entries({cx:p[0],cy:p[1],r:radius,fill:idx===traceDrag?'#ffb52a':'#087ef5',stroke:'#fff','stroke-width':Math.max(2,radius*.3)}))c.setAttribute(k,v);
 svg.appendChild(c);
 const dot=document.createElementNS(ns,'circle');
 for(const [k,v] of Object.entries({cx:p[0],cy:p[1],r:Math.max(2,radius*.22),fill:'#fff'}))dot.setAttribute(k,v);
 svg.appendChild(dot)
}
$('tracePoints').textContent=points.length===2?'Both endpoints selected · '+Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1]).toFixed(1)+' px':points.length===1?'Select the second endpoint.':'Select the first endpoint.'}
// Same pointer mapping, loupe and optional dark-pixel snapping as calibration.
traceSvg.addEventListener('pointerdown',e=>{
 if(!size||!url||traceDrag>=0)return;
 const p=pointTools.point(e);
 if(!p)return;
 e.preventDefault();
 const radius=pointTools.radius()*2;
 let idx=points.findIndex(q=>Math.hypot(q[0]-p.x,q[1]-p.y)<=radius);
 if(idx<0){
  if(points.length===2)points=[];
  idx=points.length;
  const target=pointTools.snap(p);
  points.push([target.x,target.y]);
 }
 traceDrag=idx;tracePointer=e.pointerId;
 dialog.classList.add('trace-is-dragging');
 window.getSelection?.()?.removeAllRanges();
 traceSvg.setPointerCapture?.(e.pointerId);
 paint();
 pointTools.show({x:points[idx][0],y:points[idx][1]},e,p);
});
traceSvg.addEventListener('pointermove',e=>{
 if(traceDrag<0||e.pointerId!==tracePointer)return;
 const p=pointTools.point(e);if(!p)return;
 e.preventDefault();
 const target=pointTools.snap(p);
 points[traceDrag]=[target.x,target.y];
 paint();
 pointTools.show(target,e,p);
});
function endTraceDrag(e){
 if(traceDrag<0||e.pointerId!==tracePointer)return;
 traceDrag=-1;tracePointer=null;dialog.classList.remove('trace-is-dragging');
 pointTools.hide();
 if(traceSvg.hasPointerCapture?.(e.pointerId))traceSvg.releasePointerCapture(e.pointerId);
 paint();
}
traceSvg.addEventListener('pointerup',endTraceDrag);
traceSvg.addEventListener('pointercancel',endTraceDrag);
traceSvg.addEventListener('selectstart',e=>e.preventDefault());
traceSvg.addEventListener('dragstart',e=>e.preventDefault());
traceImage.addEventListener('dragstart',e=>e.preventDefault());
dialog.addEventListener('selectstart',e=>{if(traceDrag>=0)e.preventDefault()});
$('traceSnap').addEventListener('change',()=>{
 $('traceSnapNote').textContent=$('traceSnap').checked
  ?'Snapping to nearby dark image pixels only; may select text or other linework.'
  :'Free placement; snapping off.';
});
if(typeof ResizeObserver!=='undefined'){
 new ResizeObserver(()=>{if(size&&dialog.open)paint()}).observe(traceImage);
}
$('traceOpeningAdd').onclick=()=>{const id=$('traceOpeningWall').value,wall=record?.walls?.find(w=>w.id===id),openingId=$('traceOpeningId').value.trim();if(!wall||!openingId){$('traceStatus').textContent='Choose a wall and opening ID.';return}const along=Number($('traceOpeningAlong').value),width=Number($('traceOpeningWidth').value),sill=Number($('traceOpeningSill').value),height=Number($('traceOpeningHeight').value);const length=Math.hypot(wall.end_px[0]-wall.start_px[0],wall.end_px[1]-wall.start_px[1])*record.calibration?.feet/record.calibration?.pixels;if(![along,width,sill,height,length].every(Number.isFinite)||!(along>=0&&width>0&&sill>=0&&height>0&&along+width<=length+1e-6&&sill+height<=wall.height+1e-6)){$('traceStatus').textContent='Opening must fit within wall length and height.';return}wall.openings ||= [];if(wall.openings.some(o=>o.id===openingId||Math.max(along,o.along)<Math.min(along+width,o.along+o.width)-1e-9&&Math.max(sill,o.sill)<Math.min(sill+height,o.sill+o.height)-1e-9)){$('traceStatus').textContent='Duplicate or overlapping opening.';return}wall.openings.push({id:openingId,along,width,sill,height,evidence_id:'manual-opening-'+openingId});try{localStorage.setItem(key(roomKey),JSON.stringify(record))}catch(e){wall.openings.pop();$('traceStatus').textContent='Save failed: '+e.message;return}refreshOpenings();$('traceStatus').textContent='Provisional opening saved; no elevation verification.'};
$('traceReset').onclick=()=>{points=[];paint()};
$('traceCheckStart').onclick=()=>{checkMode=true;points=[];paint();$('traceStatus').textContent='Select two endpoints of a different known dimension.'};
$('traceCheckSave').onclick=()=>{if(!checkMode||points.length!==2){$('traceStatus').textContent='Select both independent dimension endpoints first.';return}const feet=Number($('traceCheckFeet').value);if(!(feet>0&&Number.isFinite(feet))){$('traceStatus').textContent='Enter a positive known distance in feet.';return}const previous=record.crossCheck;record.crossCheck={points_px:points.map(p=>p.slice()),distance:feet};const result=updateCheck();if(!result.ok){record.crossCheck=previous;updateCheck();$('traceStatus').textContent='Independent dimension rejected: '+result.reason;return}try{localStorage.setItem(key(roomKey),JSON.stringify(record))}catch(e){record.crossCheck=previous;$('traceStatus').textContent='Save failed: '+e.message;return}points=[];checkMode=false;paint();updateCheck();$('traceStatus').textContent='Independent dimension saved; scale is provisionally consistent.'};
$('traceClose').onclick=()=>dialog.close();
dialog.addEventListener('close',clean);
$('traceOpen').onclick=async()=>{clean();const src=await window.constructionAITraceSource();if(!src.file||!['image/jpeg','image/png'].includes(src.file.type)){$('traceSummary').textContent='A locally saved JPG or PNG floor plan is required. PDF tracing is not supported yet.';return}
roomKey=src.scope;record=load(roomKey);if(!record||record.floor_name!==src.floorName)record={schema:SCHEMA,room_id:roomKey,drawing:{sheet:'',revision:''},units:'ft',floor_name:src.floorName,walls:[],calibration:null};
const oldCalibration=JSON.stringify(record.calibration);record.calibration=src.calibration;if(oldCalibration!==JSON.stringify(src.calibration))record.crossCheck=null;const c=record.calibration;
$('traceSheet').value=record.drawing.sheet||'';$('traceRevision').value=record.drawing.revision||'';$('traceId').value='W'+(record.walls.length+1);
url=URL.createObjectURL(src.file);dialog.showModal();$('traceCheckFeet').value=record.crossCheck?.distance||'';updateCheck();traceImage.onload=()=>{size={width:traceImage.naturalWidth,height:traceImage.naturalHeight};paint();$('traceStatus').textContent=c?.points?.length===2&&c?.imageSize?.width===size.width&&c?.imageSize?.height===size.height?'Floor plan loaded. Two-point source calibration available; confirm an independent dimension before export.':'Floor plan loaded. Primary two-point calibration still needs review before export.'};traceImage.onerror=()=>{$('traceStatus').textContent='Could not display floor plan.'};traceImage.src=url;count();updateCheck()};
$('traceAdd').onclick=()=>{if(!size||points.length!==2){$('traceStatus').textContent='Select two endpoints.';return}const [sheet,revision,id]=['traceSheet','traceRevision','traceId'].map(x=>$(x).value.trim());const thick=Number($('traceThickness').value),height=Number($('traceHeight').value);if(!sheet||!revision||!id||!Number.isFinite(thick)||thick<=0||!Number.isFinite(height)||height<=0){$('traceStatus').textContent='Sheet, revision, ID, thickness and height are required.';return}
if(record.walls.some(w=>w.id===id)){$('traceStatus').textContent='Wall ID already exists. Choose another.';return}
if(Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1])<2){$('traceStatus').textContent='Endpoints are too close.';return}
if(record.walls.length&&(record.drawing.sheet!==sheet||record.drawing.revision!==revision)){$('traceStatus').textContent='Existing traces use a different sheet/revision. Export first or keep the original reference.';return}
record.drawing={sheet,revision};record.walls.push({id,start_px:points[0],end_px:points[1],thickness:thick,height,verification:'assumption',evidence_id:'manual-trace-'+id});try{localStorage.setItem(key(roomKey),JSON.stringify(record))}catch(e){record.walls.pop();$('traceStatus').textContent='Save failed: '+e.message;return}points=[];$('traceId').value='W'+(record.walls.length+1);paint();count();$('traceStatus').textContent='Wall saved locally as an assumption.'};
$('traceExport').onclick=()=>{if(!record?.walls.length){$('traceStatus').textContent='Trace a wall first.';return}const verification=updateCheck();if(!verification.ok){$('traceStatus').textContent='Export blocked: '+verification.reason;return}const c=record.calibration;if(!c||c.method!=='two-point-manual'||c.points?.length!==2||!(c.feet>0)||!size||c.imageSize?.width!==size.width||c.imageSize?.height!==size.height){$('traceStatus').textContent='Export requires a matching two-point image calibration. Use Drawing setup → Calibrate scale.';return}
const payload={schema:SCHEMA,room_id:roomKey,units:'ft',drawing:record.drawing,calibration:{origin_px:[0,0],y_axis:'down',primary:{points_px:c.points.map(p=>[p.x,p.y]),distance:c.feet},cross_check:{points_px:record.crossCheck.points_px,distance:record.crossCheck.distance}},walls:record.walls.map(w=>({...w,openings:(w.openings||[]).map(o=>({along:o.along,width:o.width,sill:o.sill,height:o.height,evidence_id:o.evidence_id}))}))};
const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),link=document.createElement('a'),download=URL.createObjectURL(blob);link.href=download;link.download='construction-ai-traced-walls.json';link.click();setTimeout(()=>URL.revokeObjectURL(download),2000);$('traceStatus').textContent='Exported traced walls. No AI recognition or model verification performed.'};
window.addEventListener('construction-room-change',()=>{record=null;roomKey='';if(dialog.open)dialog.close();$('traceSummary').textContent='Open tracing to load walls for this room.'});
})();