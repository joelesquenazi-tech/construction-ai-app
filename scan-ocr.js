(()=>{
'use strict';
async function open(signal,progress){
 const jobs=window.ConstructionScanJobs;
 jobs.check(signal);
 const worker=new Worker(new URL('./scan-ocr-worker.js',document.baseURI));
 let pending,closed=false;
 function close(reason=Error('Local text recognition stopped')){
  if(closed)return;
  closed=true;signal?.removeEventListener('abort',abort);
  worker.terminate();pending?.reject(reason);pending=null;
 }
 const abort=()=>close(signal.reason);
 signal?.addEventListener('abort',abort,{once:true});
 worker.onerror=worker.onmessageerror=()=>close(Error('Local text recognition could not load. Refresh the app while online.'));
 worker.onmessage=({data})=>{
  if(closed)return;
  if(data?.progress){progress(data.progress);return}
  if(data?.error){close(Error('Local text recognition failed'));return}
  const request=pending;pending=null;request?.resolve(data);
 };
 function send(message){
  return new Promise((resolve,reject)=>{
   if(closed||pending){reject(Error('Local text recognition is unavailable'));return}
   pending={resolve,reject};
   try{worker.postMessage(message)}catch(error){close(error)}
  });
 }
 try{
  const result=await send({action:'open'});
  if(!result?.ready)throw Error('Local text recognition did not initialize');
  return {recognize:blob=>send({action:'recognize',blob}),terminate:()=>close()};
 }catch(error){close();throw error}
}
window.ConstructionScanOCR={open};
})();
