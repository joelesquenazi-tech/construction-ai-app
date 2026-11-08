(()=>{'use strict';
const $=id=>document.getElementById(id),KEY='construction-ai-scan-history-v1';
const jobs=window.ConstructionScanJobs;
const perf=window.ConstructionPerformance,timed=(trace,name,fn)=>perf.measure(trace,name,fn);
const dimension=/\d+\s*['′″"]|\d+\s*\/\s*\d+|\b(?:AFF|TYP|EQ)\b/i;
const sheetRef=/\b(?:A|S|M|E|P|ID)[- ]?\d{2,4}(?:\.\d+)?\b/i;
const room=/\b(?:ROOM|BEDROOM|BATHROOM|KITCHEN|CORRIDOR|OFFICE|DINING|CLOSET|LOBBY|GARAGE|LIVING|MECHANICAL|LAUNDRY|GYM)\b/i;
const type=t=>window.ConstructionDimensionEvidence.parseMeasurement(t)||dimension.test(t)?'dimension':sheetRef.test(t)?'sheet-reference':room.test(t)?'room-label':'text';
let busy=false,active=null;
const scope=()=>({sheet_id:$('sheetSelector').value,project_id:window.constructionAIProjects.current().projectId,room_id:window.constructionAIProjects.current().roomId});
const currentScope=()=>JSON.stringify(scope());
function matches(text){let rules=[];try{rules=JSON.parse(localStorage.getItem('construction-ai-knowledge-v1')||'[]')}catch{};return(Array.isArray(rules)?rules:[]).filter(r=>r.status==='verified'&&String(r.title||'').split(/\s+/).filter(w=>w.length>3).some(w=>text.toLowerCase().includes(w.toLowerCase()))).slice(0,5).map(r=>({id:r.id,title:r.title,value:r.value,scope:r.scope,source:r.source||'',status:'suggestion-only'}))}
function remember(id,items,engine='tesseract.js 5.1.1'){try{const all=JSON.parse(localStorage.getItem(KEY)||'{}');all[id]={scannedAt:new Date().toISOString(),count:items.length,engine,types:items.reduce((a,x)=>(a[x.kind]=(a[x.kind]||0)+1,a),{})};localStorage.setItem(KEY,JSON.stringify(all))}catch{}}
function showRecovery(){
 let record;
 try{record=jobs.latest(scope())}catch{}
 const retry=record?.source&&['interrupted','failed','timed_out'].includes(record.state);
 $('scanRecovery').hidden=busy||!retry;
 if(retry)$('scanRecoveryStatus').textContent=record.state==='interrupted'
  ?'A scan was interrupted. Restart from the beginning on this drawing version.'
  :'The last scan did not finish. Restart on this drawing version.';
}
async function refreshRecovery(){
 if(busy)return;
 try{if(jobs.latest(scope())?.state==='running')await jobs.exclusive(()=>{})}catch{}
 showRecovery();
}
async function start(retry=false){
 if(busy||!scope().sheet_id)return;
 const selected=scope(),id=selected.sheet_id,scopeKey=JSON.stringify(selected);
 busy=true;$('scanDrawing').disabled=true;showRecovery();
 try{
  const result=await jobs.exclusive(async()=>{
   const prior=retry?jobs.latest(selected):null;
   if(retry&&(!prior?.source||!['interrupted','failed','timed_out'].includes(prior.state)))return;
   if(currentScope()!==scopeKey)return;
   const job=jobs.create(selected);active={job,scopeKey};
   await scan(id,job,prior,()=>currentScope()===scopeKey);
  });
  if(result===false)$('scanStatus').textContent='A drawing scan is running in another tab. Wait for it to finish or cancel it there.';
 }catch(error){$('scanStatus').textContent='Could not start or record this scan: '+error.message}
 finally{active=null;busy=false;$('scanDrawing').disabled=false;$('cancelDrawingScan').hidden=true;showRecovery()}
}
async function scan(id,job,prior,stillHere){
 const status=$('scanStatus'),cancel=$('cancelDrawingScan');
 cancel.hidden=false;
 const run=(name,fn)=>timed(trace,name,()=>job.wait(fn));
 const trace=perf.start('scan');let outcome='failed',saving=false;
 let worker=null;
 const assertCurrent=async snapshot=>{
  const current=stillHere()&&await run('source_validation',()=>window.ConstructionDimensionScan.stillCurrent(snapshot));
  if(!current||!stillHere())
   throw Object.assign(Error('Drawing source or room changed during analysis. Run Scan again'),{code:'stale_source'});
 };
 try{
  const saved=window.constructionAIReadSavedFindings(id);
  const assertReviews=()=>{if(window.constructionAIReadSavedFindings(id)!==saved)throw Object.assign(Error('Saved reviews changed during this scan. Run Scan again'),{code:'stale_source'})};
  status.textContent='Checking the selected local source…';
  void trace?.paint('acknowledgement');
  const snapshot=await run('source_capture',()=>window.ConstructionDimensionScan.capture(id));
  if(prior&&!jobs.matchesSource(prior,snapshot.source))
   throw Object.assign(Error('The drawing or scan version has changed. Use Scan drawing to start fresh'),{code:'stale_source'});
  job.source(snapshot.source);
  trace?.metadata({source_type:window.constructionAIPdf.isPdf(snapshot.ref.original)?'pdf':'raster',
   input_bytes:snapshot.ref.original.size,raster_bytes:snapshot.ref.blob.size,
   width_px:snapshot.source.width_px,height_px:snapshot.source.height_px,page_count:1});
  await assertCurrent(snapshot);
  let items=[],native=false;
  if(window.constructionAIPdf.isPdf(snapshot.ref.original)){
   job.stage('pdf_text');
   status.textContent='Checking this PDF for locally embedded text (no OCR or upload)…';
   const raw=await run('pdf_text',()=>window.constructionAIPdf.extractText(snapshot.ref.original,snapshot.ref.page,
    {width:snapshot.source.width_px,height:snapshot.source.height_px},job.signal));
   await assertCurrent(snapshot);
   items=timed(trace,'findings_normalize',()=>window.ConstructionPDFText.nativeFindings(raw,id,2500));
   native=items.length>0;
  }
  if(!native){
   status.textContent='Preparing bundled local English image text recognition…';
   job.stage('ocr_setup');
   worker=await run('ocr_worker_init',()=>window.ConstructionScanOCR.open(job.signal,m=>{
    if(!job.signal.aborted&&m.status)status.textContent='Image OCR: '+m.status+(typeof m.progress==='number'?' '+Math.round(m.progress*100)+'%':'');
   }));
   job.stage('ocr');
   const result=await run('ocr_recognize',()=>worker.recognize(snapshot.ref.blob)),data=result.data||{},
    words=Array.isArray(data.words)?data.words:[],lines=Array.isArray(data.lines)?data.lines:[];
   const source=lines.length?lines:words;
   items=timed(trace,'findings_normalize',()=>source.slice(0,2500).map((w,i)=>{
    const text=String(w.text||'').trim(),bbox=window.ConstructionDimensionEvidence.ocrBox(w.bbox);
    if(!text||!bbox)return null;
    const knowledgeMatches=matches(text);
    return {id:id+'-ocr-'+String(i+1).padStart(4,'0'),text:text.slice(0,500),x:bbox.x,y:bbox.y,bbox,
     confidence:Math.max(0,Math.min(100,Number(w.confidence)||0)),suggestion:'',
     reason:'Image OCR (Tesseract) · '+type(text)+(knowledgeMatches.length?' · Knowledge suggestions available':''),
     kind:type(text),source_kind:'raster_ocr',knowledgeMatches,status:'pending',correction:'',note:''};
   }).filter(Boolean));
  }
  trace?.metadata({route:native?'pdf_embedded_text':'raster_ocr',finding_count:items.length});
  await assertCurrent(snapshot);
  if(!items.length){outcome='no_findings';status.textContent='Image OCR completed but found no readable text. Existing findings preserved.';return}
  job.stage('dimensions');
  status.textContent='Locating explicit measurements and possible dimension spans locally…';
  items=await job.wait(()=>window.ConstructionDimensionScan.enrich(items,snapshot,trace,job.signal));
  await assertCurrent(snapshot);
  assertReviews();job.stage('review');
  const method=native?'embedded PDF text':'image OCR';
  trace?.mark('ready_for_review');
  if(!timed(trace,'review_wait',()=>job.review(()=>confirm('Found '+items.length+' unverified '+method+' findings for '+id+
   '. Replace saved findings? This loses their review decisions unless exported first.')))){
   outcome='discarded';
   status.textContent='Text preview discarded; existing findings unchanged.';return;
  }
  await assertCurrent(snapshot);
  assertReviews();job.stage('saving');cancel.hidden=true;saving=true;
  if(timed(trace,'findings_save_and_dom',()=>window.constructionAIImportFindings(id,items))!==true)throw Error('Unable to save review findings');
  window.constructionAIDimensionSource=snapshot.source;
  window.dispatchEvent(new Event('construction-dimension-source-ready'));
  remember(id,items,native?'pdfjs-embedded-text':'tesseract.js 5.1.1');
  const evidence=items.filter(f=>f.dimension_evidence),associated=evidence.filter(f=>f.dimension_evidence.association_status==='candidate_unverified');
  trace?.metadata({measurement_count:evidence.length,span_count:associated.length});
  status.textContent=items.length+(native?' native PDF text items saved for review.':' unverified image OCR findings saved.')+
   ' '+evidence.length+' explicit measurement reading(s), '+associated.length+' possible dimension span(s). Scale and geometry remain unverified.';
  outcome='complete';
  await timed(trace,'result_render',()=>trace?.paint('first_usable'));
 }catch(e){
  const code=job.signal.aborted?job.signal.reason.code:e?.code;
  outcome=code==='stale_source'?'stale':['cancelled','timed_out','interrupted'].includes(code)?code:'failed';
  status.textContent=outcome==='cancelled'?'Scan cancelled. Existing findings preserved.':
   (job.signal.aborted?job.signal.reason.message:e?.message||'Scan failed')+(saving?'. Check saved findings before trying again.':'. Existing findings preserved.');
 }finally{
  cancel.hidden=true;
  if(worker)try{await timed(trace,'ocr_cleanup',()=>worker.terminate())}catch{}
  try{job.finish(outcome)}catch{status.textContent+=' Scan recovery status could not be saved.'}
  await trace?.paint('outcome_visible');trace?.finish(outcome);
 }
}
$('scanDrawing').onclick=()=>start();
$('retryDrawingScan').onclick=()=>start(true);
$('cancelDrawingScan').onclick=()=>active?.job.abort('cancelled','Scan cancelled');
const workspaceChanged=()=>{
 if(active&&currentScope()!==active.scopeKey)active.job.abort('stale_source','Drawing source or room changed during analysis. Run Scan again');
 void refreshRecovery();
};
for(const event of ['construction-library-ready','construction-drawing-selected','construction-room-change','pageshow','focus'])
 window.addEventListener(event,workspaceChanged);
window.addEventListener('storage',event=>{if(event.key===jobs.key)showRecovery()});
window.addEventListener('pagehide',()=>active?.job.abort('interrupted','Scan interrupted'));
void refreshRecovery();
})();
