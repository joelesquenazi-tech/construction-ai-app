const {test}=require('node:test'),assert=require('node:assert/strict');
const {safeMetadata,distribution,createRecorder,createSession}=require('../scan-performance.js');
test('timing metadata rejects source content, identities, URLs and non-finite values',()=>{
 assert.deepEqual(safeMetadata({filename:'PRIVATE.pdf',text:'secret',sha256:'abcdef',project_id:'private',
  width_px:2400,height_px:NaN,input_bytes:-1,page_count:1,route:'https://private',source_type:'pdf'}),
  {width_px:2400,page_count:1,source_type:'pdf'});
});
test('sync and async stages retain values, failures and separate review wait',async()=>{
 let time=0;const r=createRecorder('scan',{},()=>time);
 assert.equal(r.measure('source_capture',()=>{time+=5;return 42}),42);
 assert.equal(await r.measure('pdf_text',async()=>{time+=7;return 'text'}),'text');
 r.mark('ready_for_review');r.measure('review_wait',()=>{time+=1000});
 assert.throws(()=>r.measure('findings_save_and_dom',()=>{time+=3;throw Error('private details')}));
 await assert.rejects(r.measure('ocr_cleanup',async()=>{time+=2;throw Error('private details')}));
 const report=r.finish('failed');assert.equal(report.total_ms,1017);assert.equal(report.processing_ms,17);
 assert.equal(report.marks_ms.ready_for_review,12);assert.equal(report.stages[2].duration_ms,1000);
 assert.equal(report.stages.at(-1).status,'failed');assert(!JSON.stringify(report).includes('private'));
 time+=20;assert.strictEqual(r.finish('complete'),report);
});
test('percentiles use nearest rank and expose sample count, including empty sets',()=>{
 assert.deepEqual(distribution([]),{count:0,p50_ms:null,p95_ms:null,max_ms:null});
 assert.deepEqual(distribution(Array.from({length:20},(_,i)=>i+1)),{count:20,p50_ms:10,p95_ms:19,max_ms:20});
});
function host(){let time=0;return {performance:{now:()=>++time},Event:class{},dispatchEvent(){},document:{visibilityState:'hidden'}}}
test('capture is off by default, bounded, copy-safe and never persists',()=>{
 const h=host(),s=createSession(h);assert.equal(s.start('scan'),null);s.setEnabled(true);
 for(let i=0;i<55;i++){const r=s.start('scan',{filename:'secret'});r.finish(i===54?'discarded':'complete')}
 const report=s.report();assert.equal(report.retained_operations,50);assert.equal(report.dropped_records_or_entries,5);
 assert.equal(report.operations.at(-1).outcome,'discarded');assert.equal(report.operations[0].metadata.run_position,'repeat_in_page');
 assert.equal(report.operations[0].diagnostics.long_tasks_supported,false);
 report.operations[0].metadata.filename='private';assert(!JSON.stringify(s.report()).includes('private'));
 assert.equal(s.report().availability.heavy_vision_inference,'not_implemented');
});
test('stop or clear invalidates active captures and clears observers without affecting work',()=>{
 const s=createSession(host());s.setEnabled(true);const first=s.start('scan');
 s.clear();assert.equal(first.measure('pdf_text',()=>17),17);first.finish('complete');assert.equal(s.report().retained_operations,0);
 const second=s.start('import');s.setEnabled(false);s.setEnabled(true);second.finish('complete');
 assert.equal(s.report().retained_operations,0);s.start('scan').finish('stale');assert.equal(s.report().operations[0].outcome,'stale');
});
test('stage and operation caps do not silently accept arbitrary stage names',()=>{
 let time=0;const r=createRecorder('scan',{},()=>time++);
 for(let i=0;i<110;i++)r.measure('source_validation',()=>{});
 assert.throws(()=>r.measure('private filename',()=>{}));
 const report=r.finish('invalid outcome');assert.equal(report.outcome,'failed');assert.equal(report.stages.length,100);assert.equal(report.dropped_stages,10);
});
test('worker timings accept only bounded numeric stages and retain their execution context',()=>{
 let time=0;const r=createRecorder('scan',{},()=>time);
 r.workerStage('raster_threshold',5,12);r.workerStage('private filename',1,20);
 r.workerStage('line_association',-1,2);r.workerStage('raster_decode',0,NaN);
 time=30;const report=r.finish('complete');assert.equal(report.stages.length,1);
 assert.deepEqual(report.stages[0],{name:'raster_threshold',start_ms:5,duration_ms:12,status:'complete',execution:'worker'});
});
