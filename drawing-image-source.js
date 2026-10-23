/* Convert supported source drawings to a local, ephemeral JPG/PNG preview.
 * PDF source bytes remain unchanged in IndexedDB. This does not establish scale.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ConstructionDrawingImageSource=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const isRaster=file=>file&&(['image/png','image/jpeg'].includes(file.type)||/\.(png|jpe?g)$/i.test(file.name||''));
const isPDF=file=>!!file&&(file.type==='application/pdf'||/\.pdf$/i.test(file.name||''));
function sourceWarning(name){
 const text=String(name||'').toUpperCase().replace(/[_-]+/g,' ');
 const suggested=
  /\b(RCP|REFLECTED CEILING|CEILING HEIGHT|CEILING PLAN)\b/.test(text)?'ceiling plan or ceiling-height reference':
  /\b(ELEVATION|SECTION|DETAIL|INTERIOR ELEV)\b/.test(text)?'elevation, section or detail':'';
 return suggested?'This source filename suggests a '+suggested+
  ', not a floor plan. Check the drawing title, selected view and known horizontal dimension before calibrating. A general drawing scale does not verify a room dimension.':'';
}
async function prepare(file,{page=1}={}){
 if(!file)throw Error('No floor-plan drawing saved in this room.');
 if(!Number.isSafeInteger(page)||page<1)throw Error('Invalid PDF page number.');
 if(isRaster(file)){
  return {blob:file,sourceName:file.name||'drawing',sourceType:'raster',
   page:1,pageCount:1,converted:false};
 }
 if(!isPDF(file))throw Error('Supported drawing formats: JPG, PNG and PDF.');
 if(!root.constructionAIPdf?.prepare)throw Error('Local PDF renderer is unavailable. Refresh the app.');
 const result=(await root.constructionAIPdf.prepare(file,String(page)))[0];
 if(!result?.blob||result.blob.type!=='image/png')
  throw Error('Could not create a local PDF page preview.');
 return {blob:result.blob,sourceName:file.name||'drawing.pdf',
  sourceType:'pdf',page:result.page,pageCount:result.pageCount,converted:true,
  width:result.width,height:result.height};
}
return {prepare,sourceWarning,isPDF,isRaster};
});