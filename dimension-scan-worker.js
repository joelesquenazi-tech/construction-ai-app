/* Local, one-job worker. Drawing pixels never leave this origin. */
'use strict';
importScripts('./dimension-evidence.js');
self.onmessage=async event=>{
 const {blob,findings,source}=event.data;
 let image,canvas;const stages=[];
 const timed=async(name,fn)=>{
  const start=performance.now(),result=await fn();
  stages.push({name,start_epoch_ms:performance.timeOrigin+start,duration_ms:performance.now()-start});return result;
 };
 try{
  if(typeof OffscreenCanvas!=='function'||typeof createImageBitmap!=='function'){
   self.postMessage({unsupported:true});return;
  }
  image=await timed('raster_decode',()=>createImageBitmap(blob));
  if(image.width!==source.width_px||image.height!==source.height_px)throw Error('Drawing pixel dimensions changed; re-import this source.');
  const core=self.ConstructionDimensionEvidence,size=core.analysisSize(image.width,image.height);
  canvas=new OffscreenCanvas(size.width,size.height);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx){self.postMessage({unsupported:true});return}
  const rows=await timed('raster_threshold',()=>{
   ctx.fillStyle='white';ctx.fillRect(0,0,size.width,size.height);ctx.drawImage(image,0,0,size.width,size.height);
   const pixels=ctx.getImageData(0,0,size.width,size.height).data,rows=[];
   for(let y=0;y<size.height;y++){
    const row=new Uint8Array(size.width);
    for(let x=0;x<size.width;x++){const i=(y*size.width+x)*4;row[x]=(.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2])<150?1:0}
    rows.push(row);
   }
   return rows;
  });
  const result=await timed('line_association',()=>core.enrich(findings,rows,source));
  self.postMessage({findings:result,stages});
 }catch(error){self.postMessage({error:String(error.message||'Local dimension processing failed')})}
 finally{image?.close();if(canvas)canvas.width=canvas.height=0;self.close()}
};
