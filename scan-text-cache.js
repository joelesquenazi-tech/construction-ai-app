/* Private, bounded raw OCR cache. Reviews, geometry and knowledge are never cached. */
(function(root,factory){
 'use strict';
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.ConstructionTextCache=factory(root.localStorage);
})(typeof window==='object'?window:globalThis,function(storage){
 'use strict';
 const key='construction-ai-ocr-cache-v1',generationKey='construction-ai-data-generation-v1';
 const version='tesseract-5.1.1-eng-bundled-raw-v1';
 const fields=['sha256','raster_sha256','project_id','room_id','sheet_id','page','revision','width_px','height_px'];
 const MAX_ENTRY=128000,MAX_TOTAL=256000,MAX_ENTRIES=4;
 let generation;
 try{generation=storage.getItem(generationKey)}catch{}
 function available(){return storage.getItem(generationKey)===generation&&!storage.getItem('construction-ai-data-reset-v1')}
 function identity(source){
  if(!source||!source.sha256||!source.raster_sha256||!source.sheet_id||!source.project_id||!source.room_id||
    !Number.isFinite(source.width_px)||!Number.isFinite(source.height_px))return null;
  return JSON.stringify([version,...fields.map(f=>source[f]??null)]);
 }
 function rows(data){
  const input=Array.isArray(data?.lines)&&data.lines.length?data.lines:data?.words;
  if(!Array.isArray(input)||input.length>2500)return null;
  const result=[];
  for(const row of input){
   const b=row?.bbox;
   if(typeof row?.text!=='string'||row.text.length>500||!Number.isFinite(row.confidence)||
     !b||!['x0','y0','x1','y1'].every(k=>Number.isFinite(b[k]))||b.x1<b.x0||b.y1<b.y0)return null;
   result.push({text:row.text,confidence:row.confidence,bbox:{x0:b.x0,y0:b.y0,x1:b.x1,y1:b.y1}});
  }
  return result;
 }
 function entries(){
  const raw=storage.getItem(key);
  if(!raw||raw.length>MAX_TOTAL)return [];
  let data;try{data=JSON.parse(raw)}catch{return []}
  return Array.isArray(data)&&data.length<=MAX_ENTRIES?data:[];
 }
 return {key,version,
  get(source){try{
   const id=identity(source);if(!id||!available())return null;
   const entry=entries().find(e=>e?.id===id);
   if(!entry||JSON.stringify(entry).length>MAX_ENTRY)return null;
   const lines=rows({lines:entry.lines});
   return lines?.length?{lines,words:[]}:null;
  }catch{return null}},
  put(source,data){try{
   const id=identity(source),lines=rows(data);
   if(!id||!lines?.length||!available())return false;
   const entry={id,lines};if(JSON.stringify(entry).length>MAX_ENTRY)return false;
   const list=[entry,...entries().filter(e=>e?.id!==id)].slice(0,MAX_ENTRIES);
   while(JSON.stringify(list).length>MAX_TOTAL)list.pop();
   storage.setItem(key,JSON.stringify(list));return true;
  }catch{return false}},
  clear(){try{storage.removeItem(key)}catch{}}
 };
});
