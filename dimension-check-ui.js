/* Advanced source-only annotation and scoring. Automatic findings are never
 * drawn in this dialog or copied into the independent annotation store.
 */
(()=>{
'use strict';
const state=window.ConstructionDimensionCheck,sourceTools=window.ConstructionDimensionScan,points=window.ConstructionDrawingPointTools;
if(!state||!sourceTools||!points)return;
const intake=document.createElement('details');intake.className='dimension-check-intake';
intake.innerHTML='<summary>Advanced: check recognition accuracy</summary><p>Mark a small test area and independently check its dimensions. This is an optional development test; it does not calibrate the drawing or build the model.</p><button id="dimensionCheckOpen" type="button">Open accuracy check</button>';
document.querySelector('#drawings .viewer-panel').append(intake);
const dialog=document.createElement('dialog');dialog.id='dimensionCheckDialog';dialog.className='dimension-check-dialog';
dialog.setAttribute('aria-labelledby','dimensionCheckTitle');
dialog.innerHTML=`
 <div class="dimension-check-heading"><div><h2 id="dimensionCheckTitle">Recognition accuracy check</h2><p id="dimensionCheckSource"></p></div><button id="dimensionCheckClose" type="button">Done</button></div>
 <p>Detector marks are hidden here. Read the drawing and mark every applicable linear measurement in one small area, including measurements the scanner missed. Your annotations and results stay on this device.</p>
 <p id="dimensionCheckStatus" role="status" aria-live="polite"></p>
 <div class="dimension-check-actions"><button id="dimensionCheckRegion" type="button">Mark test area</button><button id="dimensionCheckAdd" type="button">Add independent dimension</button><button id="dimensionCheckUndo" type="button">Undo saved action</button><span id="dimensionCheckCount"></span></div>
 <div class="dimension-check-zoom"><button id="dimensionCheckZoomOut" type="button" aria-label="Zoom out test drawing">−</button><button id="dimensionCheckFit" type="button">Fit</button><button id="dimensionCheckZoomIn" type="button" aria-label="Zoom in test drawing">+</button><span>Scroll to pan. Use the buttons to zoom; drag placement handles to refine them.</span></div>
 <div id="dimensionCheckViewport" class="dimension-check-viewport"><div id="dimensionCheckStage" class="dimension-check-stage"><img id="dimensionCheckImage" alt="Source drawing for independent accuracy annotations" draggable="false"><svg id="dimensionCheckOverlay" role="img" aria-label="Independent annotations only; automatic predictions hidden"></svg></div></div>
 <div id="dimensionCheckPlacement" hidden><p id="dimensionCheckHelp"></p><button id="dimensionCheckUseRegion" type="button" hidden>Use marked test area</button><button id="dimensionCheckCancelPlacement" type="button">Clear placement</button></div>
 <div id="dimensionCheckEditor" class="dimension-check-editor" hidden>
  <h3>Independent measurement</h3><p>Mark the printed label box, then its dimension-line endpoints. Enter only what you read in the source.</p>
  <div class="dimension-check-actions"><button id="dimensionCheckLabel" type="button">Mark label box</button><button id="dimensionCheckSpan" type="button">Mark span endpoints</button></div>
  <label>Span<select id="dimensionCheckAxis"><option value="h">Horizontal</option><option value="v">Vertical</option><option value="none">No identifiable span</option></select></label>
  <label>Units<select id="dimensionCheckUnits"><option value="imperial">Feet and inches</option><option value="metric">Metric</option></select></label>
  <div id="dimensionCheckImperial" class="dimension-check-fields"><label>Feet<input id="dimensionCheckFeet" type="number" min="0" step="1" inputmode="numeric" value="0"></label><label>Inches<input id="dimensionCheckInches" type="number" min="0" max="11" step="1" inputmode="numeric" value="0"></label><label>Fraction numerator<select id="dimensionCheckNumerator"></select></label><label>Denominator<select id="dimensionCheckDenominator"><option>2</option><option>4</option><option>8</option><option selected>16</option><option>32</option><option>64</option></select></label></div>
  <div id="dimensionCheckMetric" class="dimension-check-fields" hidden><label>Value<input id="dimensionCheckMetricValue" type="number" step="any" inputmode="decimal"></label><label>Unit<select id="dimensionCheckMetricUnit"><option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option></select></label></div>
  <div class="dimension-check-actions"><button id="dimensionCheckSaveReading" type="button">Save independent dimension</button><button id="dimensionCheckCancelReading" type="button">Cancel dimension</button></div>
 </div>
 <div id="dimensionCheckDimensions" class="dimension-check-dimensions"></div>
 <fieldset id="dimensionCheckSettings"><legend>Test scope and tolerances</legend><p>Choose pixel tolerances for this source before scoring. These are test settings, not construction tolerances or scale verification.</p>
  <div class="dimension-check-fields"><label>Drawing kind<select id="dimensionCheckKind"><option value="">Choose…</option><option value="permissioned_real">Permitted project drawing</option><option value="synthetic">Synthetic test drawing</option></select></label><label>Label tolerance (source pixels)<input id="dimensionCheckLabelTolerance" type="number" min="0.1" step="any" inputmode="decimal"></label><label>Endpoint tolerance (source pixels)<input id="dimensionCheckEndpointTolerance" type="number" min="0.1" step="any" inputmode="decimal"></label></div>
  <label><input id="dimensionCheckExhaustive" type="checkbox"> Every applicable measurement label in this area has been annotated, including missed readings. An empty area has no applicable dimensions.</label>
  <label><input id="dimensionCheckIndependent" type="checkbox"> I checked the values and locations against the source drawing without copying detector proposals.</label>
  <button id="dimensionCheckConfirm" type="button">Save settings and confirm annotations</button>
 </fieldset>
 <div class="dimension-check-actions"><button id="dimensionCheckRun" type="button">Measure recognition accuracy</button><button id="dimensionCheckExport" type="button" disabled>Export private test bundle</button></div>
 <div id="dimensionCheckResults" class="dimension-check-results" aria-live="polite"></div>
 <div id="dimensionCheckLens" class="scale-ruler-magnifier" hidden aria-hidden="true"><canvas id="dimensionCheckLensCanvas" width="180" height="180"></canvas><span class="scale-ruler-magnifier-label">4× source detail</span></div>`;
document.body.append(dialog);
const $=name=>document.getElementById('dimensionCheck'+name),img=$('Image'),svg=$('Overlay'),DB='construction-ai-dimension-checks-v1';
let snapshot=null,session=null,imageURL=null,cycle=0,busy=false,zoom=1,mode='',editing=false,draft={},drag=-1,pointer=null,bundle=null;
const pointTools=points.create({image:img,overlay:svg,lens:$('Lens'),canvas:$('LensCanvas'),getSize:()=>snapshot?{width:snapshot.source.width_px,height:snapshot.source.height_px}:null,isSnapEnabled:()=>false});
const key=s=>JSON.stringify([s.project_id,s.room_id,s.sheet_id,s.page,s.revision,s.sha256,s.raster_sha256]);
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('sessions');r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result)})}
async function load(source){
 const db=await openDB();
 return new Promise((resolve,reject)=>{const tx=db.transaction('sessions'),r=tx.objectStore('sessions').get(key(source));tx.oncomplete=()=>{db.close();try{resolve(r.result?state.validateSession(r.result,source):state.createSession(source))}catch(e){reject(e)}};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||Error('Unable to read saved annotations.'))}});
}
async function save(next){
 const source=JSON.parse(JSON.stringify(snapshot.source)),expected=session.revision;
 state.validateSession(next,source);
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('sessions','readwrite'),store=tx.objectStore('sessions'),r=store.get(key(source));let error;
  r.onsuccess=()=>{if((r.result?.revision||0)!==expected){error=Error('This check changed in another tab. Close and reopen it before saving.');tx.abort();return}next.revision=expected+1;store.put(next,key(source))};
  tx.oncomplete=()=>{db.close();resolve(next)};tx.onerror=tx.onabort=()=>{db.close();reject(error||tx.error||Error('Annotation save failed.'))};
 });
}
function say(text){$('Status').textContent=text}
function setBusy(value){busy=value;controls()}
function cleanup(){cycle++;snapshot=null;session=null;bundle=null;mode='';editing=false;draft={};pointer=null;drag=-1;pointTools.hide();if(imageURL)URL.revokeObjectURL(imageURL);imageURL=null;img.removeAttribute('src');svg.replaceChildren();$('Dimensions').replaceChildren();$('Results').replaceChildren();$('Source').textContent='';$('Count').textContent='';$('Editor').hidden=$('Placement').hidden=true}
dialog.addEventListener('close',cleanup);
$('Close').onclick=()=>dialog.close();
async function assertSource(){if(!snapshot||!await sourceTools.stillCurrent(snapshot))throw Error('Drawing or room changed. Reopen the check for the current source.')}
function settings(){return {type:'settings',dataset_kind:$('Kind').value||null,label_tolerance_px:$('LabelTolerance').value===''?null:Number($('LabelTolerance').value),endpoint_tolerance_px:$('EndpointTolerance').value===''?null:Number($('EndpointTolerance').value)}}
function dirty(){const values=settings();return !session||['dataset_kind','label_tolerance_px','endpoint_tolerance_px'].some(k=>values[k]!==session[k])}
function controls(){
 const available=!!session&&!busy;
 for(const input of $('Editor').querySelectorAll('input,select,button'))input.disabled=!available;
 for(const n of ['Region','Add','Undo','Confirm','Run','Export','SaveReading','UseRegion'])$(n).disabled=!available;
 $('Region').disabled=!available||editing;$('Add').disabled=!available||!session?.region||editing;
 $('Undo').disabled=!available||!session?.history.length||editing||!!mode;
 $('Run').disabled=!available||!session?.confirmed||dirty()||editing||!!mode;
 $('Export').disabled=!available||!bundle||dirty()||editing||!!mode;
 $('UseRegion').disabled=!available||draft.region?.length!==2;
 $('Span').disabled=!available||$('Axis').value==='none';
 $('Settings').disabled=!available||editing||!!mode;
}
function updateSettings(){
 $('Kind').value=session.dataset_kind||'';$('LabelTolerance').value=session.label_tolerance_px??'';$('EndpointTolerance').value=session.endpoint_tolerance_px??'';
 $('Exhaustive').checked=$('Independent').checked=session.confirmed;
}
const NS='http://www.w3.org/2000/svg';
function shape(tag,attributes){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attributes))n.setAttribute(k,String(v));n.setAttribute('vector-effect','non-scaling-stroke');svg.append(n)}
function rect(p){return {x:Math.min(p[0][0],p[1][0]),y:Math.min(p[0][1],p[1][1]),width:Math.abs(p[1][0]-p[0][0]),height:Math.abs(p[1][1]-p[0][1])}}
function rectangle(b,color,fill='none'){shape('rect',{x:b.x,y:b.y,width:b.width,height:b.height,stroke:color,'stroke-width':2,fill,'fill-opacity':.08})}
function span(p,color){shape('line',{x1:p[0][0],y1:p[0][1],x2:p[1][0],y2:p[1][1],stroke:color,'stroke-width':2})}
function paint(){
 svg.replaceChildren();if(!snapshot||!session)return;pointTools.sync();
 if(session.region)rectangle(session.region,'#15803d','#22c55e');
 for(const a of session.dimensions){rectangle(a.label_box_px,'#15803d');if(a.points_px)span(a.points_px,'#15803d')}
 for(const part of ['region','label','span']){
  const p=draft[part];if(p?.length===2){if(part==='span')span(p,'#dc6b0a');else rectangle(rect(p),'#dc6b0a')}
  if(part===mode)for(const q of p||[])shape('circle',{cx:q[0],cy:q[1],r:pointTools.radius(),fill:'#087ef5',stroke:'white','stroke-width':2});
 }
 svg.style.pointerEvents=mode?'auto':'none';svg.style.touchAction=mode?'none':'auto';
}
function setMode(next){if(next){bundle=null;$('Results').replaceChildren()}mode=next;drag=-1;pointer=null;pointTools.hide();$('Placement').hidden=!mode;$('UseRegion').hidden=mode!=='region';$('Help').textContent=mode==='region'?'Mark two opposite corners around one test area.':mode==='label'?'Mark two opposite corners of the printed measurement label.':'Mark the two actual dimension endpoints on the source drawing.';paint();controls()}
function resetEditor(){editing=false;draft={};$('Editor').hidden=true;setMode('')}
function render(){
 $('Count').textContent=(session.region?'1 test area':'No test area')+' · '+session.dimensions.length+' independent dimension(s)';
 const list=$('Dimensions');list.replaceChildren();
 for(const a of session.dimensions){const row=document.createElement('div'),text=document.createElement('span'),remove=document.createElement('button');text.textContent=a.label+' · '+(a.points_px?(a.axis==='h'?'horizontal':'vertical')+' span':'reading only');remove.type='button';remove.textContent='Remove '+a.label;remove.onclick=()=>change({type:'remove',id:a.id});remove.disabled=busy||editing;row.append(text,remove);list.append(row)}
 paint();controls();
}
async function change(action){
 if(busy||!session)return false;const ticket=cycle;setBusy(true);
 try{await assertSource();if(ticket!==cycle)return false;const next=state.transact(session,action),saved=await save(next);if(ticket!==cycle)return false;session=saved;bundle=null;$('Results').replaceChildren();updateSettings();render();say('Independent annotations saved on this device.');return true}
 catch(e){if(ticket===cycle)say(e.message);return false}
 finally{if(ticket===cycle){setBusy(false);render()}}
}
$('Open').onclick=async()=>{
 cleanup();const ticket=cycle;busy=true;dialog.showModal();say('Opening the selected source drawing…');controls();
 try{
  const id=document.getElementById('sheetSelector').value;if(!id)throw Error('Select a drawing first.');
  const captured=await sourceTools.capture(id);if(ticket!==cycle)return;
  const saved=await load(captured.source);if(ticket!==cycle)return;
  if(!await sourceTools.stillCurrent(captured))throw Error('Drawing or room changed while opening the check.');if(ticket!==cycle)return;
  snapshot=captured;session=saved;
  const s=captured.source;$('Source').textContent=s.sheet+' · page '+s.page+' · revision '+(s.revision??'unknown');
  imageURL=URL.createObjectURL(captured.ref.blob);
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Source preview unavailable.'));img.src=imageURL});
  if(ticket!==cycle)return;
  if(img.naturalWidth!==s.width_px||img.naturalHeight!==s.height_px)throw Error('Source image size changed. Re-import this drawing.');
  zoom=1;$('Stage').style.width='100%';$('Editor').hidden=true;$('Placement').hidden=true;$('Results').replaceChildren();
  updateSettings();say('Automatic findings are hidden. Mark a test area, then independently annotate its dimensions.');
 }catch(e){if(ticket===cycle){say(e.message);session=null}}
 finally{if(ticket===cycle){busy=false;if(session)render();else controls()}}
};
$('Region').onclick=()=>{draft={region:[]};setMode('region')};
$('UseRegion').onclick=async()=>{if(draft.region?.length===2&&await change({type:'region',box:rect(draft.region)})){draft={};setMode('')}};
$('Add').onclick=()=>{editing=true;draft={label:[],span:[]};$('Editor').hidden=false;$('Feet').value=$('Inches').value='0';$('MetricValue').value='';$('Numerator').value='0';setMode('label')};
$('Label').onclick=()=>setMode('label');$('Span').onclick=()=>setMode('span');
$('CancelPlacement').onclick=()=>{if(mode)draft[mode]=[];if(!editing){draft={};setMode('')}else paint();controls()};
$('CancelReading').onclick=resetEditor;
$('Axis').onchange=()=>{if($('Axis').value==='none'){draft.span=[];if(mode==='span')setMode('label')}controls();paint()};
$('Units').onchange=()=>{$('Imperial').hidden=$('Units').value!=='imperial';$('Metric').hidden=$('Units').value!=='metric'};
function fractions(){const previous=Number($('Numerator').value)||0,den=Number($('Denominator').value);$('Numerator').replaceChildren();for(let i=0;i<den;i++){const option=document.createElement('option');option.value=String(i);option.textContent=String(i);$('Numerator').append(option)}$('Numerator').value=String(previous<den?previous:0)}
$('Denominator').onchange=fractions;fractions();
$('SaveReading').onclick=async()=>{
 try{
  if(draft.label?.length!==2)throw Error('Mark both label-box corners.');
  const axis=$('Axis').value;if(axis!=='none'&&draft.span?.length!==2)throw Error('Mark both span endpoints, or choose No identifiable span.');
  const measurement=state.manualMeasurement($('Units').value==='metric'?{system:'metric',value:$('MetricValue').value===''?NaN:Number($('MetricValue').value),unit:$('MetricUnit').value}:{system:'imperial',feet:Number($('Feet').value),inches:Number($('Inches').value),numerator:Number($('Numerator').value),denominator:Number($('Denominator').value)});
  const annotation={id:crypto.randomUUID(),...measurement,label_box_px:rect(draft.label),axis:axis==='none'?null:axis,points_px:axis==='none'?null:draft.span};
  if(await change({type:'add',annotation}))resetEditor();
 }catch(e){say(e.message)}
};
$('Undo').onclick=()=>change({type:'undo'});
$('Confirm').onclick=async()=>{
 if(busy||!session)return;const ticket=cycle;setBusy(true);
 try{
  await assertSource();if(ticket!==cycle)return;let next=state.transact(session,settings());
  next=state.transact(next,{type:'confirm',exhaustive:$('Exhaustive').checked,independent:$('Independent').checked});
  next=await save(next);if(ticket!==cycle)return;session=next;bundle=null;updateSettings();say('Independent annotation coverage confirmed for this area. You can now measure recognition accuracy.');
 }catch(e){if(ticket===cycle)say(e.message)}finally{if(ticket===cycle){setBusy(false);render()}}
};
for(const n of ['Kind','LabelTolerance','EndpointTolerance'])$(n).addEventListener('input',()=>{bundle=null;$('Results').replaceChildren();$('Exhaustive').checked=$('Independent').checked=false;say('Settings changed. Confirm independent annotations before scoring.');controls()});
svg.addEventListener('pointerdown',event=>{
 if(!mode||busy||pointer!==null)return;const p=pointTools.point(event);if(!p)return;
 const current=draft[mode]||(draft[mode]=[]),point=[p.x,p.y];let index=current.findIndex(q=>Math.hypot(q[0]-p.x,q[1]-p.y)<pointTools.radius()*1.8);
 if(index<0){if(current.length===2)return;index=current.length;current.push(point)}
 pointer=event.pointerId;drag=index;svg.setPointerCapture(pointer);current[index]=point;pointTools.show(p,event,p);event.preventDefault();paint();controls();
});
svg.addEventListener('pointermove',event=>{if(event.pointerId!==pointer||drag<0)return;const p=pointTools.point(event);if(!p)return;draft[mode][drag]=[p.x,p.y];pointTools.show(p,event,p);paint();event.preventDefault()});
function release(event){if(event.pointerId!==pointer)return;pointer=null;drag=-1;pointTools.hide();paint();controls()}
svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);svg.addEventListener('lostpointercapture',release);
function resize(){pointTools.sync();paint()}
for(const [name,factor]of [['ZoomIn',1.5],['ZoomOut',1/1.5],['Fit',0]])$(name).onclick=()=>{zoom=factor?Math.min(8,Math.max(1,zoom*factor)):1;$('Stage').style.width=zoom*100+'%';requestAnimationFrame(resize)};
new ResizeObserver(()=>{if(dialog.open)resize()}).observe(img);
function readFindings(){const id=snapshot.source.sheet_id;const data=JSON.parse(localStorage.getItem(id==='A102'?'construction-ai-batch1-v1':'construction-ai-sheet-findings-v1')||'{}');const findings=id==='A102'?data.findings:data[id];if(!Array.isArray(findings))throw Error('Close this check and Scan drawing first. Saved independent annotations will remain.');return findings}
$('Run').onclick=async()=>{
 if(busy||!session||dirty())return;const ticket=cycle;setBusy(true);
 try{
  await assertSource();const findings=readFindings(),report=state.score(session,findings);await assertSource();if(ticket!==cycle)return;
  bundle={schema:'site-resolved-dimension-check-bundle-v1',created_at:new Date().toISOString(),check_revision:session.revision,truth:state.truth(session),prediction_packet:state.packet(findings,snapshot.source),report};
  const result=$('Results');result.replaceChildren();
  for(const [title,metric]of [['Measurement readings',report.text_readings],['Dimension spans',report.dimension_spans]]){
   const p=document.createElement('p');p.textContent=title+': '+metric.true_positive+' matched · '+metric.false_negative+' missed · '+metric.false_positive+' extra · precision '+(metric.precision===null?'not measurable':(metric.precision*100).toFixed(1)+'%')+' · recall '+(metric.recall===null?'not measurable':(metric.recall*100).toFixed(1)+'%');result.append(p);
  }
  const note=document.createElement('p');note.textContent='Only the marked area was scored. '+report.ignored_predictions_outside_coverage+' reading(s) were outside coverage. Scale and 3D verification remain unresolved.';result.append(note);
  say('Accuracy measured locally. Export the bundle to retain this exact set of annotations, predictions and results.');
 }catch(e){if(ticket===cycle){bundle=null;say(e.message)}}finally{if(ticket===cycle)setBusy(false)}
};
$('Export').onclick=async()=>{
 if(!bundle||busy||dirty())return;const ticket=cycle;setBusy(true);
 try{await assertSource();if(ticket!==cycle)return;const url=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='private-dimension-accuracy-check.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){if(ticket===cycle)say(e.message)}finally{if(ticket===cycle)setBusy(false)}
};
for(const event of ['construction-room-change','construction-drawing-selected'])window.addEventListener(event,()=>{if(dialog.open)dialog.close()});
})();
