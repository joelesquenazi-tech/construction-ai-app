/* Private job journal. No drawing bytes, findings or error text are stored here. */
(()=>{
'use strict';
const key='construction-ai-scan-jobs-v1',lock='construction-ai-scan-v1',version=1;
const fields=['sha256','raster_sha256','sheet_id','page','revision','project_id','room_id','width_px','height_px'];
const scopeFields=['sheet_id','project_id','room_id'];
const same=(a,b,keys)=>!!a&&!!b&&keys.every(k=>a[k]!==undefined&&a[k]===b[k]);
const read=()=>{const data=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(data))throw Error('Scan history is unavailable');return data};
function write(record){
 const previous=read();
 const rest=previous.filter(r=>!same(r.scope,record.scope,scopeFields));
 localStorage.setItem(key,JSON.stringify([record,...rest].slice(0,20)));
}
function recover(){
 const records=read();
 if(records.some(r=>r.state==='running'))
  localStorage.setItem(key,JSON.stringify(records.map(r=>r.state==='running'?{...r,state:'interrupted'}:r)));
}
const abortError=(code,message)=>Object.assign(Error(message),{code});
function check(signal){if(signal?.aborted)throw signal.reason}
function wait(value,signal){
 if(!signal)return Promise.resolve(value);
 return new Promise((resolve,reject)=>{
  const stop=()=>reject(signal.reason);
  signal.addEventListener('abort',stop,{once:true});
  Promise.resolve(value).then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop));
  if(signal.aborted)stop();
 });
}
function create(scope){
 const controller=new AbortController(),signal=controller.signal;
 const generation=localStorage.getItem('construction-ai-data-generation-v1');
 const record={version,id:crypto.randomUUID(),scope,state:'running',stage:'source',source:null};
 const budget=120000;
 let timer,deadline,remaining=budget,closed=false;
 const abort=(code,message)=>{if(!closed&&!signal.aborted)controller.abort(abortError(code,message))};
 const timeout=()=>abort('timed_out','Scan took too long. Try again or use a smaller drawing');
 function arm(){deadline=performance.now()+remaining;timer=setTimeout(timeout,remaining)}
 function assert(){
  if(timer&&performance.now()>=deadline)timeout();
  check(signal);
  if(generation!==localStorage.getItem('construction-ai-data-generation-v1')||localStorage.getItem('construction-ai-data-reset-v1'))
   throw abortError('stale_source','Drawing data changed during analysis. Run Scan again');
 }
 write(record);arm();
 return {signal,abort,assert,wait:async fn=>{assert();const result=await wait(fn(),signal);assert();return result},
  stage(stage){assert();record.stage=stage;write(record)},
  source(source){assert();record.source=Object.fromEntries(fields.map(k=>[k,source[k]]));write(record)},
  review(fn){
   assert();remaining=Math.max(0,deadline-performance.now());clearTimeout(timer);timer=null;
   try{return fn()}finally{arm()}
  },
  finish(state){
   closed=true;clearTimeout(timer);
   if(generation===localStorage.getItem('construction-ai-data-generation-v1')&&!localStorage.getItem('construction-ai-data-reset-v1')){
    record.state=state;write(record);
   }
  }};
}
window.ConstructionScanJobs={key,wait,check,create,
 matchesSource:(record,source)=>record?.version===version&&same(record.source,source,fields),
 latest:scope=>read().find(r=>same(r.scope,scope,scopeFields)),
 exclusive:fn=>{
  if(!navigator.locks?.request)throw Error('This browser cannot safely coordinate drawing scans. Try an updated browser.');
  return navigator.locks.request(lock,{ifAvailable:true},lease=>{
   if(!lease)return false;
   if(localStorage.getItem('construction-ai-data-reset-v1'))throw Error('Drawing data is being cleared');
   recover();return fn();
  });
 }};
})();
