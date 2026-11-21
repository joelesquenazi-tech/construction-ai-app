/* Own the Tesseract worker from initialization onward so cancellation can
   terminate the entire job, even before Tesseract returns its public handle. */
'use strict';
let engine;
self.onmessage=async ({data})=>{
 try{
  if(data.action==='open'){
   const base=new URL('./vendor/tesseract/',self.location.href);
   importScripts(new URL('tesseract.min.js',base).href);
   engine=await self.Tesseract.createWorker('eng',1,{
    workerPath:new URL('worker.min.js',base).href,corePath:new URL('core/',base).href,
    langPath:new URL('lang/',base).href,workerBlobURL:false,
    logger:({status,progress})=>self.postMessage({progress:{status,progress}}),
    errorHandler:()=>self.postMessage({error:true})
   });
   self.postMessage({ready:true});
  }else if(data.action==='recognize'){
   const {data:result}=await engine.recognize(data.blob);
   const lines=Array.isArray(result?.lines)?result.lines:[],words=Array.isArray(result?.words)?result.words:[];
   self.postMessage({data:{lines:(lines.length?lines:words).slice(0,2500).map(({text,bbox,confidence})=>({text,bbox,confidence}))}});
  }
 }catch{self.postMessage({error:true})}
};
