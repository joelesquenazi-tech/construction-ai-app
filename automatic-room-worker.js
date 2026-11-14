'use strict';
importScripts('./dimension-evidence.js','./wall-proposals.js');
self.onmessage=async({data})=>{
 let image,canvas;
 try{
  const {blob,source,findings}=data,core=self.ConstructionDimensionEvidence;
  let rows=data.rows;
  if(!rows){
   if(typeof OffscreenCanvas!=='function'||typeof createImageBitmap!=='function'){self.postMessage({unsupported:true});return}
   image=await createImageBitmap(blob);
   if(image.width!==source.width_px||image.height!==source.height_px)throw Error('Drawing dimensions changed');
   const size=core.analysisSize(image.width,image.height);canvas=new OffscreenCanvas(size.width,size.height);
   const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx){self.postMessage({unsupported:true});return}
   ctx.fillStyle='white';ctx.fillRect(0,0,size.width,size.height);ctx.drawImage(image,0,0,size.width,size.height);
   const pixels=ctx.getImageData(0,0,size.width,size.height).data;
   rows=Array.from({length:size.height},(_,y)=>Uint8Array.from({length:size.width},(_,x)=>{
    const i=(y*size.width+x)*4;return .299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2]<150?1:0;
   }));
  }
  const report=self.ConstructionWallCandidates.detectWallCandidates(rows,{maxSeparation:65});
  // A truncated proposal set cannot prove there is only one room.
  if(report.stats.possiblePairs>36){self.postMessage({findings:[],candidates:[],limited:true});return}
  const sx=source.width_px/rows[0].length,sy=source.height_px/rows.length;
  self.postMessage({findings:core.enrich(findings,rows,source),candidates:report.candidates.map(c=>({...c,
   points_px:c.points_px.map(p=>[p[0]*sx,p[1]*sy]),apparent_width_px:c.apparent_width_px*(c.axis==='h'?sy:sx)}))});
 }catch(e){self.postMessage({error:e.message||'Automatic room analysis failed'})}
 finally{image?.close();if(canvas)canvas.width=canvas.height=0;self.close()}
};
