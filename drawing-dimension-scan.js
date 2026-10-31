/* Browser-only source capture and bounded image processing. Drawing bytes stay
 * in this origin's IndexedDB; only Blob URLs are used for pixel access.
 */
(()=>{
'use strict';
const core=window.ConstructionDimensionEvidence;
async function digest(blob){
 if(!crypto.subtle)throw Error('Source fingerprinting requires HTTPS or localhost.');
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
}
async function capture(id){
 const ref=await window.constructionAIGetDrawingSource(id);
 const sha=await digest(ref.original),rasterSha=ref.original===ref.blob?sha:await digest(ref.blob);
 return {ref,source:{sha256:sha,raster_sha256:rasterSha,filename:ref.filename,
  sheet_id:id,sheet:ref.sheet,page:ref.page,revision:ref.revision,
  project_id:ref.scope.projectId,room_id:ref.scope.roomId,
  width_px:ref.width,height_px:ref.height}};
}
async function stillCurrent(snapshot){
 if(document.getElementById('sheetSelector').value!==snapshot.source.sheet_id)return false;
 const now=await capture(snapshot.source.sheet_id);
 return document.getElementById('sheetSelector').value===snapshot.source.sheet_id&&
  window.constructionAIProjects.current().projectId===snapshot.source.project_id&&
  window.constructionAIProjects.current().roomId===snapshot.source.room_id&&
  core.sameSource(snapshot.source,now.source);
}
async function enrich(findings,snapshot){
 // Skip pixel allocation when there is no explicit measurement reading.
 if(!findings.some(f=>core.parseMeasurement(f.text)))return findings.map(f=>({...f,source:{...snapshot.source}}));
 const url=URL.createObjectURL(snapshot.ref.blob),image=new Image();
 const canvas=document.createElement('canvas');
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Unable to read the local drawing raster.'));image.src=url});
  if(image.naturalWidth!==snapshot.source.width_px||image.naturalHeight!==snapshot.source.height_px)throw Error('Drawing pixel dimensions changed; re-import this source.');
  const scale=Math.min(1,1800/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,rows=[];
  for(let y=0;y<canvas.height;y++){
   const row=new Uint8Array(canvas.width);
   for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4;row[x]=(.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2])<150?1:0}
   rows.push(row);
  }
  return core.enrich(findings,rows,snapshot.source);
 }finally{URL.revokeObjectURL(url);canvas.width=canvas.height=0}
}
window.ConstructionDimensionScan={capture,stillCurrent,enrich};
let cycle=0;
async function refreshSource(){
 const ticket=++cycle;
 window.constructionAIDimensionSource=null;
 window.dispatchEvent(new Event('construction-dimension-source-ready'));
 const id=document.getElementById('sheetSelector').value;if(!id)return;
 try{
  const snapshot=await capture(id);
  if(ticket!==cycle||id!==document.getElementById('sheetSelector').value)return;
  window.constructionAIDimensionSource=snapshot.source;
  window.dispatchEvent(new Event('construction-dimension-source-ready'));
 }catch{/* Old reviews remain accessible, but their geometry overlay stays hidden. */}
}
window.addEventListener('construction-drawing-selected',refreshSource);
window.addEventListener('construction-room-change',refreshSource);
window.addEventListener('construction-library-ready',refreshSource);
refreshSource();
})();
