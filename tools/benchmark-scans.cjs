/* Repeatable RP-1 baseline. Runs actual offline PDF/OCR code, not a model mock.
 * Full: node tools/benchmark-scans.cjs --output /absolute/report.json
 * CI:   node tools/benchmark-scans.cjs --smoke
 */
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {distribution}=require('../scan-performance.js'),{importFixture}=require('./scan-performance-fixtures.cjs');
const root=path.resolve(__dirname,'..'),smoke=process.argv.includes('--smoke');
const warm=smoke?2:20,fresh=smoke?1:3,outputIndex=process.argv.indexOf('--output');
const output=outputIndex>=0?process.argv[outputIndex+1]:null;
if(outputIndex>=0&&!output)throw Error('--output requires a path');
const routeIndex=process.argv.indexOf('--route'),routes=routeIndex<0?['pdf_embedded_text','raster_ocr']:[process.argv[routeIndex+1]];
if(routes.some(r=>!['pdf_embedded_text','raster_ocr'].includes(r)))throw Error('--route must be pdf_embedded_text or raster_ocr');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.html':'text/html','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=path.resolve(root,url.pathname==='/'?'index.html':'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep))return res.writeHead(404).end();
 try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}
});
const runs=[],installs=[],inputs=[],idleInputs=[],checks=[],external=[],errors=[];
function summarize(records){
 const ok=records.filter(r=>r.outcome==='complete'),stages={};
 for(const name of new Set(ok.flatMap(r=>r.stages.map(s=>s.name))))
  stages[name]=distribution(ok.map(r=>r.stages.filter(s=>s.name===name).reduce((n,s)=>n+s.duration_ms,0)));
 return {attempts:records.length,outcomes:records.reduce((a,r)=>(a[r.outcome]=(a[r.outcome]||0)+1,a),{}),
  total:distribution(ok.map(r=>r.total_ms)),processing:distribution(ok.map(r=>r.processing_ms)),
  first_usable_paint_opportunity:distribution(ok.map(r=>r.marks_ms.first_usable)),
  acknowledgement_paint_opportunity:distribution(ok.map(r=>r.marks_ms.acknowledgement)),stages,
  long_tasks:{supported:ok.every(r=>r.diagnostics.long_tasks_supported),
   count:ok.reduce((n,r)=>n+r.diagnostics.long_tasks.length,0),
   duration:distribution(ok.flatMap(r=>r.diagnostics.long_tasks.map(t=>t.duration_ms)))},
  sampled_js_heap_max_bytes:Math.max(0,...ok.map(r=>r.diagnostics.sampled_js_heap_max_bytes||0))||null};
}
async function setup(browser,route){
 const context=await browser.newContext({viewport:{width:1180,height:900},hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))external.push(r.url())});
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 const install=await page.evaluate(async()=>{
  const start=performance.now();await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));
  return performance.now()-start;
 });installs.push({route,local_app_shell_install_ms:install});
 await context.setOffline(true);await page.reload();
 await page.waitForFunction(()=>window.constructionAIUploadDrawing&&document.getElementById('sheetSelector').options.length);
 assert.equal(await page.evaluate(()=>window.ConstructionPerformance.enabled()),false);
 await page.evaluate(()=>{
  window.ConstructionPerformance.setEnabled(true);
  window.__perfTaps=[];let down;
  document.addEventListener('pointerdown',event=>{
   if(event.target.closest('#zoomIn,#zoomOut'))down={start_ms:event.timeStamp,handler_ms:performance.now(),
    before:document.getElementById('drawingStage').style.transform,trusted:event.isTrusted};
  },true);
  document.addEventListener('click',event=>{
   if(!event.target.closest('#zoomIn,#zoomOut')||!down)return;
   const sample={...down,changed:down.before!==document.getElementById('drawingStage').style.transform};down=null;
   requestAnimationFrame(()=>setTimeout(()=>{sample.feedback_ms=performance.now()-sample.start_ms;
    sample.input_delay_ms=sample.handler_ms-sample.start_ms;window.__perfTaps.push(sample)},0));
  });
 });
 await importFixture(page,route);
 return {context,page};
}
async function scan(page,route,phase){
 const id=await page.evaluate(()=>window.ConstructionPerformance.report().operations.at(-1)?.id||0);
 const buttons=await Promise.all(['#zoomIn','#zoomOut'].map(s=>page.locator(s).boundingBox()));
 const start=await page.evaluate(()=>{const start=performance.now();document.getElementById('scanDrawing').click();return start});
 let n=0,record;
 do{
  const b=buttons[n++%2];await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);
  await page.waitForTimeout(35);
  record=await page.evaluate(id=>window.ConstructionPerformance.report().operations.find(r=>r.kind==='scan'&&r.id>id),id);
  if(n>1200)throw Error('Scan did not finish within benchmark bounds');
 }while(!record);
 assert.equal(record.outcome,'complete',JSON.stringify(record));assert.equal(record.metadata.route,route);
 assert(['worker','main_fallback'].includes(record.metadata.dimension_execution),'Dimension execution route must be recorded');
 assert(record.total_ms>=record.processing_ms);assert(record.marks_ms.first_usable<=record.total_ms);
 for(const stage of record.stages){assert.equal(stage.status,'complete');assert(stage.duration_ms>=0)}
 const quality=await page.evaluate(()=>{
  const sheet=document.getElementById('sheetSelector').value;
  const f=JSON.parse(localStorage.getItem('construction-ai-sheet-findings-v1'))[sheet];
  return {count:f.length,pending:f.every(f=>f.status==='pending'),unverified:f.filter(f=>f.dimension_evidence).every(f=>f.dimension_evidence.geometry_status==='unverified'),
   measurements:f.filter(f=>f.dimension_evidence).map(f=>({metres:f.dimension_evidence.measurement.metres,status:f.dimension_evidence.association_status,points:f.dimension_evidence.points_px}))};
 });
 assert(quality.pending&&quality.unverified);
 if(route==='pdf_embedded_text'){
  assert.equal(quality.count,2);const long=quality.measurements.find(f=>f.metres===3.6576),short=quality.measurements.find(f=>f.metres===.1524);
  assert(long&&short);assert.equal(long.status,'candidate_unverified');assert.equal(short.status,'candidate_unverified');
  for(const [measurement,expected]of [[long,[[200,520],[2000,520]]],[short,[[2000,520],[2016,520]]]])
   for(let i=0;i<2;i++)assert(Math.hypot(measurement.points[i][0]-expected[i][0],measurement.points[i][1]-expected[i][1])<=3);
 }else{
  const d=quality.measurements.find(f=>f.metres===3.6576);assert(d);assert.equal(d.status,'candidate_unverified');
  assert(Math.abs(d.points[0][0]-200)<3&&Math.abs(d.points[1][0]-1200)<3&&Math.abs(d.points[0][1]-310)<3);
 }
 const taps=await page.evaluate(({start,end})=>window.__perfTaps.filter(t=>t.start_ms>=start&&t.start_ms<=end),{start,end:start+record.total_ms});
 for(const t of taps){assert(t.trusted&&t.changed);inputs.push({route,phase,feedback_ms:t.feedback_ms,input_delay_ms:t.input_delay_ms})}
 runs.push({phase,...record});
 return record;
}
async function fallbackParity(page,route){
 const before=await page.evaluate(()=>localStorage.getItem('construction-ai-sheet-findings-v1'));
 await page.evaluate(()=>{window.__realOffscreen=window.OffscreenCanvas;window.OffscreenCanvas=undefined});
 try{
  const record=await scan(page,route,'fallback_parity_only');assert.equal(record.metadata.dimension_execution,'main_fallback');
  assert.equal(await page.evaluate(()=>localStorage.getItem('construction-ai-sheet-findings-v1')),before);
 }finally{await page.evaluate(()=>{window.OffscreenCanvas=window.__realOffscreen;delete window.__realOffscreen})}
 checks.push(route+': worker/main fallback findings are exactly identical');
}
async function idleBaseline(page,route){
 const boxes=await Promise.all(['#zoomIn','#zoomOut'].map(s=>page.locator(s).boundingBox()));
 const start=await page.evaluate(()=>performance.now());
 for(let i=0;i<(smoke?3:20);i++){
  const b=boxes[i%2];await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(35);
 }
 const taps=await page.evaluate(start=>window.__perfTaps.filter(t=>t.start_ms>=start),start);
 for(const t of taps){assert(t.trusted&&t.changed);idleInputs.push({route,feedback_ms:t.feedback_ms,input_delay_ms:t.input_delay_ms})}
}
async function negativeChecks(page){
 // Outcome accounting must preserve existing data and must not claim usable findings.
 const before=await page.evaluate(()=>localStorage.getItem('construction-ai-sheet-findings-v1'));
 page.removeAllListeners('dialog');page.on('dialog',d=>d.dismiss());
 let id=await page.evaluate(()=>window.ConstructionPerformance.report().operations.at(-1).id);
 await page.evaluate(()=>document.getElementById('scanDrawing').click());
 await page.waitForFunction(id=>window.ConstructionPerformance.report().operations.some(r=>r.id>id&&r.kind==='scan'),id,{timeout:120000});
 let report=await page.evaluate(()=>window.ConstructionPerformance.report().operations.at(-1));
 assert.equal(report.outcome,'discarded');assert.equal(report.marks_ms.first_usable,undefined);
 assert.equal(await page.evaluate(()=>localStorage.getItem('construction-ai-sheet-findings-v1')),before);checks.push('discarded preview preserves findings');
 page.removeAllListeners('dialog');page.on('dialog',d=>d.accept());
 id=report.id;
 await page.evaluate(()=>{window.__realCapture=window.ConstructionDimensionScan.capture;window.ConstructionDimensionScan.capture=async()=>{throw Error('PRIVATE failure text')};document.getElementById('scanDrawing').click()});
 await page.waitForFunction(id=>window.ConstructionPerformance.report().operations.some(r=>r.id>id),id);
 report=await page.evaluate(()=>window.ConstructionPerformance.report().operations.at(-1));
 assert.equal(report.outcome,'failed');assert(!JSON.stringify(report).includes('PRIVATE'));assert.equal(report.marks_ms.first_usable,undefined);
 await page.evaluate(()=>{window.ConstructionDimensionScan.capture=window.__realCapture;delete window.__realCapture});
 checks.push('failed scan recorded without error text');
 id=report.id;
 await page.evaluate(()=>{window.__realCurrent=window.ConstructionDimensionScan.stillCurrent;window.ConstructionDimensionScan.stillCurrent=async()=>false;document.getElementById('scanDrawing').click()});
 await page.waitForFunction(id=>window.ConstructionPerformance.report().operations.some(r=>r.id>id),id);
 report=await page.evaluate(()=>window.ConstructionPerformance.report().operations.at(-1));assert.equal(report.outcome,'stale');assert.equal(report.marks_ms.first_usable,undefined);
 await page.evaluate(()=>{window.ConstructionDimensionScan.stillCurrent=window.__realCurrent;delete window.__realCurrent});
 checks.push('stale-source outcome never claims usable findings');
 id=report.id;
 await page.evaluate(()=>{
  window.__realText=window.constructionAIPdf.extractText;window.__realOCR=window.ConstructionScanOCR;
  window.constructionAIPdf.extractText=async(...args)=>({...await window.__realText(...args),items:[]});
  window.ConstructionScanOCR={open:async()=>({recognize:async()=>({data:{lines:[],words:[]}}),terminate:async()=>{}})};
  document.getElementById('scanDrawing').click();
 });
 await page.waitForFunction(id=>window.ConstructionPerformance.report().operations.some(r=>r.id>id),id);
 report=await page.evaluate(()=>window.ConstructionPerformance.report().operations.at(-1));assert.equal(report.outcome,'no_findings');assert.equal(report.marks_ms.first_usable,undefined);
 assert.equal(await page.evaluate(()=>localStorage.getItem('construction-ai-sheet-findings-v1')),before);
 await page.evaluate(()=>{window.constructionAIPdf.extractText=window.__realText;window.ConstructionScanOCR=window.__realOCR;delete window.__realText;delete window.__realOCR});
 checks.push('empty OCR outcome preserves findings; mock used only in this separate accounting check');
 // Calibrate long-task observation separately; this is not a product timing sample.
 const probe=await page.evaluate(async()=>{
  window.ConstructionPerformance.clear();const trace=window.ConstructionPerformance.start('scan');
  trace.measure('raster_threshold',()=>{const stop=performance.now()+100;while(performance.now()<stop){}});
  await new Promise(r=>setTimeout(r,30));trace.finish('complete');return window.ConstructionPerformance.report().operations[0];
 });
 if(probe.diagnostics.long_tasks_supported)assert(probe.diagnostics.long_tasks.some(t=>t.duration_ms>=50));
 checks.push('separate synthetic long-task calibration');
 await page.evaluate(()=>{window.constructionAIPreviewStartup('return');document.getElementById('settingsToggle').click()});
 await page.click('#settingsPanel details summary');
 const download=page.waitForEvent('download');await page.click('#performanceExport');const downloaded=await download;
 const exported=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));assert.equal(exported.schema,'site-resolved-performance-v1');
 assert(!JSON.stringify(exported).includes('synthetic-chain.pdf'));assert(!JSON.stringify(exported).includes('PRIVATE'));
 await page.click('#performanceToggle');assert.equal(await page.evaluate(()=>window.ConstructionPerformance.enabled()),false);
 await page.click('#performanceClear');assert.equal(await page.evaluate(()=>window.ConstructionPerformance.report().retained_operations),0);
 checks.push('offline Settings export, stop and clear');
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const deadline=setTimeout(()=>{console.error('Benchmark exceeded 8 minutes');process.exit(1)},480000);
 try{
  browser=await chromium.launch();
  for(const route of routes){
   let last;
   for(let i=0;i<fresh;i++){
    const session=await setup(browser,route);last=session;
    const imported=await session.page.evaluate(()=>window.ConstructionPerformance.report().operations.find(r=>r.kind==='import'));
    assert.equal(imported.outcome,'complete');runs.push({phase:'fresh_context_after_install',...imported});
    await scan(session.page,route,'first_scan_after_import');
    if(i<fresh-1)await session.context.close();
   }
   await idleBaseline(last.page,route);
   for(let i=0;i<warm;i++){
    await importFixture(last.page,route);
    const imported=await last.page.evaluate(()=>window.ConstructionPerformance.report().operations.filter(r=>r.kind==='import').at(-1));
    runs.push({phase:'repeated_page',...imported});await scan(last.page,route,'repeated_page');
   }
   if(smoke)await fallbackParity(last.page,route);
   if(smoke&&route==='pdf_embedded_text')await negativeChecks(last.page);
   await last.context.close();console.log('Measured '+route+': '+fresh+' fresh-context + '+warm+' repeated import/scan pairs');
  }
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert(inputs.length>0,'Need actual touch feedback samples during scans');
  checks.push('all timed scans passed reading/span coordinate checks with pending, unverified geometry');
  checks.push('trusted touch controls changed drawing transforms during scans; no external requests or page errors');
  const summary=[];
  for(const route of routes)for(const phase of ['fresh_context_after_install','first_scan_after_import','repeated_page'])
   for(const kind of ['import','scan']){
    const records=runs.filter(r=>r.kind===kind&&r.phase===phase&&(r.metadata.route===route||kind==='import'&&r.metadata.source_type===(route==='pdf_embedded_text'?'pdf':'raster')));
    if(!records.length)continue;
    const touch=kind==='scan'?inputs.filter(t=>t.route===route&&t.phase===phase):[];
    summary.push({route,phase,kind,...summarize(records),touch_feedback:distribution(touch.map(t=>t.feedback_ms)),touch_input_delay:distribution(touch.map(t=>t.input_delay_ms))});
   }
  const report={schema:'site-resolved-scan-benchmark-v1',generated_at:new Date().toISOString(),mode:smoke?'smoke_not_percentile_evidence':'reference_baseline',
   implementation_sha256:Object.fromEntries(['scan-performance.js','ipad-ocr.js','drawing-dimension-scan.js','dimension-scan-worker.js','dimension-evidence.js','library.js','pdf-import.js','tools/benchmark-scans.cjs','tools/scan-performance-fixtures.cjs'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')])),
   environment:{platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,logical_cpus:os.cpus().length,
    host_memory_bytes:os.totalmem(),node:process.version,playwright:require('playwright/package.json').version,chromium:browser.version(),
    viewport:{width:1180,height:900,device_scale_factor:1,touch_enabled:true},device:'shared Linux host; no CPU throttling; not physical iPad/Pi'},
   workload:{concurrency:1,routes,pdf:{pages:1,input_bytes:require('./scan-performance-fixtures.cjs').nativePdf().length,rendered_width:2400,rendered_height:1600,labels:2,spans:2},
    raster:{pages:1,width:1400,height:450,labels:2,spans:1},cold_contexts_per_route:fresh,repeated_pairs_per_route:warm,
    ocr:'bundled Tesseract.js 5.1.1 English; worker initialized and terminated every scan',
    network:'app assets installed from localhost, then browser offline; no model/remote calls',
    review:'confirmation automatically accepted; waiting stage included and also reported separately'},
   limits:['No full vision inference/reconstruction, representative room set or real-device evidence.',
    'Fresh PDF scan follows import, which already loads PDF.js. Fresh OCR scan is first OCR initialization in that context.',
    'Repeated scans still initialize a new OCR worker; no inference result cache. Installation/download is outside scan timings.',
    'p50/p95 use nearest rank; small samples are descriptive, not a reliability guarantee.',
    'Touch timings are trusted toolbar pointerdown to next paint opportunity; not physical display latency or pan/edit acceptance.',
    'Long tasks are operation-window observations, not exclusive attribution. Heap samples exclude whole-process/WASM/worker/GPU/device peak.',
    'Shared host and diagnostics overhead affect results. Synthetic fixtures do not establish real-sheet accuracy or performance.'],
   availability:runs.length?{heavy_vision:'not_implemented',queue_upload_inference:'not_implemented',cached_reopen:'not_instrumented',peak_device_memory:'not_measured',operating_cost:'not_measured'}:{},
   idle_touch_summary:routes.map(route=>({route,
    feedback:distribution(idleInputs.filter(t=>t.route===route).map(t=>t.feedback_ms)),
    input_delay:distribution(idleInputs.filter(t=>t.route===route).map(t=>t.input_delay_ms))})),
   installation:installs,summary,correctness_checks:checks,external_request_count:external.length,page_error_count:errors.length,runs,touch_samples:inputs,idle_touch_samples:idleInputs};
  if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report)+'\n')}
  console.log(JSON.stringify({summary,correctness_checks:checks,external_requests:external.length,page_errors:errors.length},null,2));
 }finally{clearTimeout(deadline);await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
