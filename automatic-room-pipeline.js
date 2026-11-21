/* Local automatic analysis; never writes scan reviews, calibration or manual geometry. */
(()=>{'use strict';
const jobs=window.ConstructionScanJobs,dim=window.ConstructionDimensionEvidence;
const digest=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');
async function capture(){
 const input=await window.constructionAIAutomaticSources();
 const hashes=[];for(const item of input.sources)hashes.push([item.key,await digest(item.file)]);
 return {...input,fingerprint:JSON.stringify([window.ConstructionAutomaticRoom.version,input.room,input.label,input.hasCorrections,hashes])};
}
function worker(data,signal){return new Promise((resolve,reject)=>{
 const w=new Worker(new URL('./automatic-room-worker.js',document.baseURI));
 const end=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);w.terminate()};
 const abort=()=>{end();reject(signal.reason)};
 const timer=setTimeout(()=>{end();reject(Error('Automatic line analysis timed out'))},30000);
 signal.addEventListener('abort',abort,{once:true});
 w.onmessage=e=>{end();e.data.error?reject(Error(e.data.error)):resolve(e.data)};
 w.onerror=w.onmessageerror=()=>{end();reject(Error('Automatic analysis worker is unavailable'))};
 if(signal.aborted){abort();return}w.postMessage(data);
})}
async function fallbackRows(blob,source,signal){
 const url=URL.createObjectURL(blob),image=new Image(),canvas=document.createElement('canvas');
 try{
  await jobs.wait(new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Drawing image could not be read'));image.src=url}),signal);
  const size=dim.analysisSize(source.width_px,source.height_px);canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,size.width,size.height);ctx.drawImage(image,0,0,size.width,size.height);
  const pixels=ctx.getImageData(0,0,size.width,size.height).data,rows=[];
  for(let y=0;y<size.height;y++){
   if(y%64===0){await new Promise(r=>setTimeout(r,0));jobs.check(signal)}
   rows.push(Uint8Array.from({length:size.width},(_,x)=>{const i=(y*size.width+x)*4;return .299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2]<150?1:0}));
  }
  return rows;
 }finally{URL.revokeObjectURL(url);image.removeAttribute('src');canvas.width=canvas.height=0}
}
async function page(item,input,job,progress){
 progress('Reading '+(item.kind==='floor'?'floor plan':'elevation')+' locally…');
 const prepared=await job.wait(()=>window.ConstructionDrawingImageSource.prepare(item.file));
 // Multiple views/pages require view ownership; do not silently use only page 1.
 if(prepared.pageCount!==1)throw Error('Automatic reconstruction of multi-page drawing files is not supported yet. Saved files remain intact.');
 let width=prepared.width,height=prepared.height;
 if(!width){
  const url=URL.createObjectURL(prepared.blob),image=new Image();
  try{await job.wait(()=>new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Drawing image could not be read'));image.src=url}));width=image.naturalWidth;height=image.naturalHeight}finally{URL.revokeObjectURL(url);image.removeAttribute('src')}
 }
 const source={sha256:await job.wait(()=>digest(item.file)),raster_sha256:await job.wait(()=>digest(prepared.blob)),sheet_id:item.key,
  page:1,revision:null,project_id:input.room.projectId,room_id:input.room.roomId,width_px:width,height_px:height,filename:item.name};
 let findings=[];
 if(window.constructionAIPdf.isPdf(item.file)){
  const raw=await job.wait(()=>window.constructionAIPdf.extractText(item.file,1,{width,height},job.signal));
  findings=window.ConstructionPDFText.nativeFindings(raw,item.key,2500);
 }
 if(!findings.length){
  let data=window.ConstructionTextCache.get(source);
  if(!data){
   let ocr;
   try{ocr=await job.wait(()=>window.ConstructionScanOCR.open(job.signal,()=>{}));data=(await job.wait(()=>ocr.recognize(prepared.blob))).data||{};job.assert();window.ConstructionTextCache.put(source,data)}
   finally{if(ocr)await ocr.terminate()}
  }
  const rows=data.lines?.length?data.lines:data.words||[];
  findings=rows.slice(0,2500).map((r,i)=>({id:item.key+'-auto-'+i,text:String(r.text||'').trim(),bbox:dim.ocrBox(r.bbox)})).filter(f=>f.text&&f.bbox);
 }
 if(item.kind!=='floor')return {source,findings};
 progress('Associating dimensions and checking room boundaries…');
 let result=await job.wait(()=>worker({blob:prepared.blob,source,findings},job.signal));
 if(result.unsupported){const rows=await job.wait(()=>fallbackRows(prepared.blob,source,job.signal));result=await job.wait(()=>worker({rows,source,findings},job.signal))}
 if(result.limited)throw Error('This sheet has more linework than the current automatic room detector can reliably separate.');
 return {source,...result};
}
async function run(input,job,progress){
 const floors=input.sources.filter(s=>s.kind==='floor'),elevations=input.sources.filter(s=>s.kind==='elevation');
 if(floors.length!==1||!elevations.length||elevations.length>8)throw Error('Automatic reconstruction needs one floor plan and one to eight matching elevations.');
 const floor=await page(floors[0],input,job,progress),pages=[];
 for(const elevation of elevations)pages.push(await page(elevation,input,job,progress));
 job.assert();progress('Checking dimensions and building supported geometry…');
 return window.ConstructionAutomaticRoom.build({floor,elevations:pages,roomName:input.label,hasCorrections:input.hasCorrections});
}
window.ConstructionAutomaticPipeline={capture,run};
})();
