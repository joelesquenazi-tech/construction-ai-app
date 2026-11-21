/* Lossless fallback for browsers unable to serialize Blob/File values into IndexedDB. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ConstructionDrawingStorage=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 let useBytes=false;
 async function pack(blob){
  if(!(blob instanceof Blob))throw Error('Expected drawing file bytes');
  return {drawing_bytes_version:1,bytes:await blob.arrayBuffer(),type:blob.type,
   name:typeof blob.name==='string'?blob.name:null,lastModified:blob.lastModified??null};
 }
 function unpack(value){
  if(!value||value.drawing_bytes_version!==1)return value;
  if(!(value.bytes instanceof ArrayBuffer)||typeof value.type!=='string')throw Error('Invalid saved drawing bytes');
  return typeof value.name==='string'?new File([value.bytes],value.name,{type:value.type,lastModified:value.lastModified??0}):new Blob([value.bytes],{type:value.type});
 }
 function batch(db,store,entries){return new Promise((resolve,reject)=>{
  let tx,error;
  try{
   tx=db.transaction(store,'readwrite');
   tx.onerror=event=>{error=event.target?.error||tx.error||error};
   tx.onabort=()=>reject(error||tx.error||Error('Drawing storage aborted'));
   tx.oncomplete=()=>resolve();
   for(const [key,value]of entries)tx.objectStore(store).put(value,key);
  }catch(e){if(tx)try{tx.abort()}catch{};reject(e)}
 })}
 async function write(db,store,entries){
  try{
   if(!useBytes){
    try{await batch(db,store,entries);return}
    catch(error){
     if(error?.name!=='UnknownError'||!/blob|file data/i.test(error.message||''))throw error;
     useBytes=true;
    }
   }
   const encoded=[];
   for(const [key,value]of entries)encoded.push([key,await pack(value)]);
   await batch(db,store,encoded);
  }finally{db.close()}
 }
 return {pack,unpack,write};
});
