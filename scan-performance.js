/* Optional, bounded, in-memory timings. Never accepts drawing identifiers/text. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ConstructionPerformance=api.createSession(root);
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const STAGES=new Set(['source_capture','source_validation','pdf_text','ocr_script','ocr_worker_init',
  'ocr_recognize','findings_normalize','raster_decode','raster_threshold','line_association',
  'review_wait','findings_save_and_dom','result_render','ocr_cleanup','import_decode',
  'pdf_render','import_storage','import_metadata','import_select','dimension_worker']);
 const MARKS=new Set(['acknowledgement','ready_for_review','first_usable','outcome_visible']);
 const OUTCOMES=new Set(['complete','no_findings','discarded','stale','failed','cancelled','timed_out','interrupted']);
 const NUMBERS=new Set(['input_bytes','raster_bytes','width_px','height_px','page_count',
  'finding_count','measurement_count','span_count']);
 const ENUMS={source_type:['pdf','raster'],route:['pdf_embedded_text','raster_ocr'],
  dimension_execution:['worker','main_fallback','not_needed'],
  run_position:['first_in_page','repeat_in_page']};
 const round=n=>Math.round(Math.max(0,n)*1000)/1000;
 function safeMetadata(value){
  const result={};
  for(const [key,v]of Object.entries(value||{})){
   if(NUMBERS.has(key)&&Number.isSafeInteger(v)&&v>=0)result[key]=v;
   else if(ENUMS[key]?.includes(v))result[key]=v;
  }
  return result;
 }
 function distribution(values){
  const a=values.filter(Number.isFinite).sort((a,b)=>a-b);
  return {count:a.length,p50_ms:a.length?a[Math.ceil(a.length*.5)-1]:null,
   p95_ms:a.length?a[Math.ceil(a.length*.95)-1]:null,max_ms:a.length?a.at(-1):null};
 }
 function createRecorder(kind,metadata,now){
  if(!['scan','import'].includes(kind))throw Error('Unknown timing operation');
  const start=now(),spans=[],marks={},meta=safeMetadata(metadata);
  let finished=null,dropped=0;
  const elapsed=()=>round(now()-start);
  function measure(name,fn){
   if(!STAGES.has(name))throw Error('Unknown timing stage');
   if(finished)return fn();
   const span={name,start_ms:elapsed(),duration_ms:null,status:'running',execution:'main'};
   if(spans.length<100)spans.push(span);else dropped++;
   const end=status=>{span.duration_ms=round(elapsed()-span.start_ms);span.status=status;};
   try{
    const value=fn();
    if(value&&typeof value.then==='function')return Promise.resolve(value).then(v=>{end('complete');return v},e=>{end('failed');throw e});
    end('complete');return value;
   }catch(e){end('failed');throw e}
  }
  return {start,measure,
   workerStage(name,startMs,durationMs){
    if(finished||!['raster_decode','raster_threshold','line_association'].includes(name)||
     !Number.isFinite(startMs)||!Number.isFinite(durationMs)||startMs<0||durationMs<0)return;
    if(spans.length>=100){dropped++;return}
    spans.push({name,start_ms:round(startMs),duration_ms:round(durationMs),status:'complete',execution:'worker'});
   },metadata:value=>{if(!finished)Object.assign(meta,safeMetadata(value))},
   mark:name=>{if(!finished&&MARKS.has(name)&&marks[name]===undefined)marks[name]=elapsed()},
   finish(outcome){
    if(finished)return finished;
    const duration=elapsed(),wait=spans.filter(s=>s.name==='review_wait').reduce((n,s)=>n+(s.duration_ms||0),0);
    finished={kind,metadata:{...meta},outcome:OUTCOMES.has(outcome)?outcome:'failed',
     total_ms:duration,review_wait_ms:round(wait),processing_ms:round(duration-wait),
     marks_ms:{...marks},stages:spans.map(s=>({...s})),dropped_stages:dropped};
    return finished;
   }};
 }
 // rAF followed by a task is a paint opportunity, not proof of physical display.
 function paintOpportunity(host){
  if(host.document?.visibilityState!=='visible'||!host.requestAnimationFrame)return Promise.resolve(false);
  return new Promise(resolve=>{
   let done=false,frame,timer,task;
   const end=ok=>{if(done)return;done=true;host.clearTimeout(timer);host.clearTimeout(task);host.cancelAnimationFrame(frame);resolve(ok)};
   timer=host.setTimeout(()=>end(false),250);
   frame=host.requestAnimationFrame(()=>{task=host.setTimeout(()=>end(host.document.visibilityState==='visible'),0)});
  });
 }
 function createSession(host){
  let enabled=false,generation=0,sequence=0,records=[],dropped=0;
  const active=new Set(),seen=new Set();
  const emit=()=>host.dispatchEvent?.(new host.Event('construction-performance-change'));
  function start(kind,metadata){
   if(!enabled)return null;
   const position=seen.has(kind)?'repeat_in_page':'first_in_page';seen.add(kind);
   const recorder=createRecorder(kind,{...metadata,run_position:position},()=>host.performance.now());
   const ticket=generation,id=++sequence,longTasks=[],events=[];
   let closed=false,observer=null,eventObserver=null,maxHeap=null;
   const sampleHeap=()=>{
    const n=host.performance.memory?.usedJSHeapSize;
    if(Number.isFinite(n))maxHeap=Math.max(maxHeap||0,n);
   };
   const collect=(entries,target)=>{
    for(const e of entries){
     if(e.startTime+e.duration<recorder.start)continue;
     // Names, targets, attribution URLs and arbitrary entry fields are omitted.
     if(target.length<200)target.push({start_ms:round(e.startTime-recorder.start),duration_ms:round(e.duration-Math.max(0,recorder.start-e.startTime)),
      ...(target===events?{input_delay_ms:round(e.processingStart-e.startTime)}:{})});
     else dropped++;
    }
   };
   try{if(host.PerformanceObserver.supportedEntryTypes.includes('longtask')){observer=new host.PerformanceObserver(list=>collect(list.getEntries(),longTasks));observer.observe({type:'longtask',buffered:false})}}catch{observer=null}
   try{if(host.PerformanceObserver.supportedEntryTypes.includes('event')){eventObserver=new host.PerformanceObserver(list=>collect(list.getEntries(),events));eventObserver.observe({type:'event',buffered:false,durationThreshold:16})}}catch{eventObserver=null}
   sampleHeap();
   const stop=()=>{observer?.disconnect();eventObserver?.disconnect();active.delete(stop);closed=true};
   active.add(stop);
   return {
    measure(name,fn){return recorder.measure(name,()=>{sampleHeap();const value=fn();
     if(value&&typeof value.then==='function')return Promise.resolve(value).finally(sampleHeap);
     sampleHeap();return value})},
    metadata:recorder.metadata,mark:recorder.mark,
    workerStages(stages){
     for(const stage of (Array.isArray(stages)?stages:[]).slice(0,3))
      recorder.workerStage(stage.name,stage.start_epoch_ms-(host.performance.timeOrigin+recorder.start),stage.duration_ms);
    },
    async paint(name){if(!closed&&await paintOpportunity(host))recorder.mark(name)},
    finish(outcome){
     if(closed)return;
     if(observer)collect(observer.takeRecords(),longTasks);
     if(eventObserver)collect(eventObserver.takeRecords(),events);
     const record=recorder.finish(outcome);sampleHeap();stop();
     if(!enabled||ticket!==generation)return;
     records.push({...record,id,diagnostics:{long_tasks_supported:!!observer,long_tasks:longTasks,
      event_timing_supported:!!eventObserver,event_duration_floor_ms:16,event_timings:events,
      sampled_js_heap_max_bytes:maxHeap}});
     if(records.length>50){records.shift();dropped++}emit();
    }
   };
  }
  return {start,enabled:()=>enabled,
   measure:(trace,name,fn)=>trace?trace.measure(name,fn):fn(),
   paint:()=>paintOpportunity(host),
   setEnabled(value){enabled=!!value;if(!enabled){for(const stop of [...active])stop();generation++}emit()},
   clear(){for(const stop of [...active])stop();generation++;records=[];dropped=0;emit()},
   report:()=>({schema:'site-resolved-performance-v1',clock:'performance.now',
    capture_enabled:enabled,retained_operations:records.length,dropped_records_or_entries:dropped,
    limits:{operations:50,stages_per_operation:100,entries_per_observer:200},
    availability:{heavy_vision_inference:'not_implemented',queue_upload_download:'not_implemented',
     reconstruction:'not_implemented',cached_result_reopen:'not_instrumented',
     peak_process_device_memory:'not_measured',operating_cost:'not_measured',
     input_events:'thresholded browser Event Timing; not all inputs',
     heap:'coarse JS heap samples at stage boundaries; excludes worker/WASM/GPU/device peak',
     rendering:'next paint opportunity; not measured screen presentation'},
    operations:JSON.parse(JSON.stringify(records))})};
 }
 return {safeMetadata,distribution,createRecorder,createSession};
});
