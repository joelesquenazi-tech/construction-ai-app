(()=>{'use strict';
const $=id=>document.getElementById(id);
const DB='construction-ai-private-drawings',STORE='images',META='construction-ai-sheet-library-v1';
const categories=['Architectural','Structural','Mechanical','Electrical','Plumbing','Interiors','Other'];
const drawingType=item=>['','floor-plan','elevation','other'].includes(item?.drawingType)?item.drawingType:(item?.modelKind==='floor'?'floor-plan':item?.modelKind==='elevation'?'elevation':'');
const typeLabel=value=>({'floor-plan':'Floor plan',elevation:'Elevation',other:'Other'})[value]||'Not labeled';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sheets=[],active='A102',objectURL=null;const projects=()=>window.constructionAIProjects;const visible=()=>sheets.filter(x=>projects()?.belongs(x));const displayId=x=>x.sheetId||x.id;const internalId=(sheet,scope)=>scope.projectId+'__'+scope.roomId+'__'+sheet;
const load=()=>{try{return JSON.parse(localStorage.getItem(META)||'[]')}catch{return []}};
function persist(){localStorage.setItem(META,JSON.stringify(sheets))}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)}})}
async function transaction(mode,fn){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),req=fn(tx.objectStore(STORE));tx.oncomplete=()=>{db.close();resolve(req.result)};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Storage transaction aborted'))})}
function dims(blob){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(blob),img=new Image();img.onload=()=>{URL.revokeObjectURL(u);resolve({width:img.naturalWidth,height:img.naturalHeight})};img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Cannot read image'))};img.src=u})}
function render(){const list=$('sheetLibrary');const term=($('sheetSearch')?.value||'').trim().toLowerCase(),chosen=$('sheetFilter')?.value||'all',kind=$('drawingTypeFilter')?.value??'all';list.innerHTML=categories.filter(category=>chosen==='all'||chosen===category).map(category=>{const group=visible().filter(x=>x.category===category&&(kind==='all'||drawingType(x)===kind)&&(!term||[displayId(x),x.name,x.category,typeLabel(drawingType(x)),(x.references||[]).join(' ')].join(' ').toLowerCase().includes(term)));return group.length?'<div class="sheet-group"><b>'+safe(category)+'</b>'+group.map(s=>'<button type="button" class="sheet-item '+(s.id===active?'active':'')+'" data-sheet="'+safe(s.id)+'"><strong>'+safe(displayId(s))+'</strong><span class="drawing-type-badge">'+safe(typeLabel(drawingType(s)))+'</span><small>'+safe(s.name||'Untitled sheet')+'</small></button>').join('')+'</div>':''}).join('');list.querySelectorAll('[data-sheet]').forEach(b=>b.onclick=()=>select(b.dataset.sheet));$('sheetCount').textContent=String(visible().length);$('sheetSelector').innerHTML=visible().map(s=>'<option value="'+safe(s.id)+'">'+safe(displayId(s))+' — '+safe(s.name||'Untitled')+' · '+safe(typeLabel(drawingType(s)))+'</option>').join('');$('sheetSelector').value=active;const typeInput=$('selectedDrawingType'),item=sheets.find(x=>x.id===active);if(typeInput){typeInput.value=drawingType(item);typeInput.disabled=!item}}
async function select(id){window.constructionAIDimensionSource=null;const item=sheets.find(s=>s.id===id);if(!item||!projects()?.belongs(item))return;active=id;const img=$('sheet');if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null}const stored=await transaction('readonly',s=>s.get(id));let blob=stored,renderedDimensions=null;if(blob&&window.constructionAIPdf.isPdf(blob)){try{renderedDimensions=(await window.constructionAIPdf.prepare(blob,'1'))[0];blob=renderedDimensions.blob}catch(error){$('drawingStatus').textContent='Could not render PDF: '+error.message;return}}if(blob){objectURL=URL.createObjectURL(blob);img.src=objectURL;img.hidden=false;$('drawingStatus').textContent=displayId(item)+' loaded from private device storage. Dimensions and recognized text require verification.'}else{img.removeAttribute('src');img.hidden=true;$('drawingStatus').textContent=blob?.type==='application/pdf'?'PDF saved locally. Use Open PDF below to view the original.':'No image for '+id+'. Import one below.'}window.constructionAIActiveDimensions={width:renderedDimensions?.width||item.width||4480,height:renderedDimensions?.height||item.height||3051};window.constructionAISetSheet?.(id);$('sheetTitle').textContent=displayId(item)+' — '+(item.name||'Drawing');$('sheetSubtitle').textContent=typeLabel(drawingType(item))+' • Drawing preview • recognized text are not automatically verified';let openPdf=$('openSourcePdf');if(openPdf){openPdf.hidden=!item.pdfSourceKey&&!window.constructionAIPdf.isPdf(stored);openPdf.onclick=async()=>{const source=item.pdfSourceKey?await transaction('readonly',s=>s.get(item.pdfSourceKey)):stored;if(!source)return;const u=URL.createObjectURL(source);const a=document.createElement('a');a.href=u;a.download=(item.name||'drawing')+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(u),60000)}}$('drawingImport').value='';$('referenceList').textContent=(item.references||[]).join(', ')||'None linked';render();window.dispatchEvent(new Event('construction-drawing-selected'))}
function nameFromFile(file){return file.name.replace(/\.[^.]+$/,'').slice(0,80)}
function importOptions(options={}){
 return {sheetId:String(options.sheetId??$('newSheetId').value).trim().toUpperCase(),name:options.name??$('newSheetName').value.trim(),category:options.category??$('newSheetCategory').value,drawingType:options.drawingType??$('newSheetType')?.value??'',pages:options.pages??$('pdfPages').value,scope:options.scope??projects().current()};
}
function validateOptions(options){
 if(!/^[A-Z0-9][A-Z0-9._-]{0,30}$/.test(options.sheetId))throw Error('Enter a valid sheet number, e.g. A101');
 if(!['','floor-plan','elevation','other'].includes(options.drawingType))throw Error('Choose Floor plan, Elevation or Other.');
}
function normalizeFile(file){
 if(file.type||window.constructionAIPdf.isPdf(file))return file;
 const type=/\.jpe?g$/i.test(file.name)?'image/jpeg':/\.png$/i.test(file.name)?'image/png':'';
 return type?new File([file],file.name,{type,lastModified:file.lastModified}):file;
}
async function add(file,options={}){
 file=normalizeFile(file);const values=importOptions(options);validateOptions(values);
 if(file.size>40*1024*1024)throw Error('Choose a drawing up to 40 MB.');
 if(window.constructionAIPdf.isPdf(file))return addPdf(file,values);
 if(!['image/jpeg','image/png'].includes(file.type))throw Error('Choose a JPG, PNG or PDF drawing.');
 const {sheetId,scope,category}=values;
 const existing=sheets.find(x=>x.projectId===scope.projectId&&x.roomId===scope.roomId&&displayId(x)===sheetId);
 const id=existing?.id||internalId(sheetId,scope);
 if(existing&&!confirm('Replace the stored image for '+sheetId+'? Reviews will be retained.'))return;
 const size=await dims(file);
 if(JSON.stringify(scope)!==JSON.stringify(projects().current()))throw Error('Room changed during import. Choose the drawing again.');
 await transaction('readwrite',store=>store.put(file,id));
 const metadata={width:size.width,height:size.height,pdfSourceKey:null,pdfPage:null,pdfPageCount:null,name:values.name||existing?.name||nameFromFile(file),category,drawingType:values.drawingType||drawingType(existing)};
 if(existing)Object.assign(existing,metadata);
 else sheets.push({id,sheetId,projectId:scope.projectId,roomId:scope.roomId,...metadata,references:[]});
 persist();await select(id);$('libraryStatus').textContent=sheetId+' saved locally ('+size.width+' × '+size.height+').';
 return {ids:[id],count:1};
}

async function addPdf(file,values){
 const base=values.sheetId;
 if(!/^[A-Z0-9][A-Z0-9._-]{0,30}$/.test(base))throw Error('Enter a valid sheet number, e.g. A101');
 const scope=values.scope,category=values.category,name=values.name||nameFromFile(file);
 const pages=await window.constructionAIPdf.prepare(file,values.pages,text=>$('libraryStatus').textContent=text);
 if(JSON.stringify(scope)!==JSON.stringify(projects().current()))throw Error('Room changed during import. Choose the PDF again.');
 const entries=pages.map(page=>{const sheetId=page.pageCount>1?base.slice(0,24)+'-P'+page.page:base;const previous=sheets.find(x=>projects().belongs(x)&&displayId(x)===sheetId);return{...page,sheetId,previous,id:previous?.id||internalId(sheetId,scope)}});
 if(entries.some(x=>x.previous)&&!confirm('Replace '+entries.filter(x=>x.previous).length+' existing sheet(s)? Saved reviews will be retained; check their alignment against the new PDF.'))return;
 const sourceKey='pdf-source-'+crypto.randomUUID();
 const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);store.put(file,sourceKey);for(const item of entries)store.put(item.blob,item.id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||Error('PDF storage failed'))}});
 for(const item of entries){const metadata={id:item.id,sheetId:item.sheetId,projectId:scope.projectId,roomId:scope.roomId,name:name+(item.pageCount>1?' — page '+item.page:''),category,drawingType:values.drawingType||drawingType(item.previous),width:item.width,height:item.height,pdfSourceKey:sourceKey,pdfPage:item.page,pdfPageCount:item.pageCount};if(item.previous)Object.assign(item.previous,metadata);else sheets.push({...metadata,references:[]})}
 persist();await select(entries[0].id);$('libraryStatus').textContent=entries.length+' PDF page(s) saved locally as separate sheets. Original PDF retained. Rendered previews are unverified.';
 return {ids:entries.map(item=>item.id),count:entries.length};
}

let pendingSave=Promise.resolve();let importing=false;
function queueSave(operation){if(importing)return Promise.reject(Error('An import is already in progress. Please wait.'));importing=true;pendingSave=Promise.resolve().then(operation).finally(()=>{importing=false});return pendingSave}
$('drawingImport').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;const item=sheets.find(s=>s.id===active);$('newSheetId').value=item?displayId(item):'';$('newSheetName').value=item?.name||nameFromFile(file);$('newSheetCategory').value=item?.category||'Architectural';$('newSheetType').value=drawingType(item);try{await queueSave(()=>add(file))}catch(err){$('drawingStatus').textContent=err.message}});
$('addSheetForm').addEventListener('submit',async e=>{e.preventDefault();const file=$('newSheetFile').files?.[0];if(!file){$('libraryStatus').textContent='Choose a JPG, PNG or PDF first.';return}try{await queueSave(()=>add(file));$('newSheetFile').value=''}catch(err){$('libraryStatus').textContent=err.message}});
$('sheetSelector').onchange=e=>select(e.target.value);
$('saveReferences').onclick=()=>{const item=sheets.find(s=>s.id===active);if(!item)return;const refs=$('referenceInput').value.toUpperCase().split(',').map(x=>x.trim()).filter(Boolean);item.references=[...new Set(refs.filter(x=>x!==active))];persist();$('referenceList').textContent=item.references.join(', ')||'None linked';$('libraryStatus').textContent='References saved locally.'};
$('ocrImport').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const obj=JSON.parse(await file.text());const list=Array.isArray(obj)?obj:obj.findings;if(!Array.isArray(list)||list.length>10000)throw Error('Expected JSON array or {findings: [...]} (max 10,000)');const findings=list.map((f,i)=>{if(typeof f.text!=='string'||!Number.isFinite(Number(f.x))||!Number.isFinite(Number(f.y)))throw Error('Each finding requires text, x, and y');return{id:active+'-ocr-'+String(i+1).padStart(3,'0'),text:f.text.slice(0,500),x:Number(f.x),y:Number(f.y),confidence:Number(f.confidence)||0,suggestion:String(f.suggestion||''),reason:String(f.reason||'Imported text recognition — unverified'),status:'pending',correction:'',note:''}});if(!confirm('Import '+findings.length+' unverified recognized text for '+active+'? Existing findings for this sheet will be replaced.'))return;window.constructionAIImportFindings?.(active,findings);$('libraryStatus').textContent=findings.length+' recognized text items imported. None are verified.'}catch(err){$('libraryStatus').textContent='text import failed: '+err.message}finally{e.target.value=''}});
function nextSheetId(type,scope){const prefix=type==='floor'||type==='floor-plan'?'FP':type==='elevation'?'EL':'DR';let n=1;while(sheets.some(x=>x.projectId===scope.projectId&&x.roomId===scope.roomId&&(displayId(x)===prefix+String(n).padStart(3,'0')||displayId(x).startsWith(prefix+String(n).padStart(3,'0')+'-P'))))n++;return prefix+String(n).padStart(3,'0')}
window.constructionAIUploadDrawing=(file,options={})=>queueSave(()=>{const scope=projects().current();return add(file,{...options,scope,sheetId:nextSheetId(options.drawingType,scope),category:'Architectural'})});

async function importModelReference(file,kind,sourceKey){if(!file||!['image/jpeg','image/png','application/pdf'].includes(file.type))throw Error('Unsupported drawing format');const scope=projects().current();let item=sheets.find(x=>projects().belongs(x)&&x.modelSourceKey===sourceKey);const id=item?.id||internalId(nextSheetId(kind,scope),scope);const pdf=window.constructionAIPdf.isPdf(file)?(await window.constructionAIPdf.prepare(file,'1'))[0]:null;const preview=pdf?.blob||file;const size=pdf||await dims(file);await transaction('readwrite',store=>store.put(preview,id));let pdfSourceKey;if(pdf){pdfSourceKey=id+'__source_pdf';await transaction('readwrite',store=>store.put(file,pdfSourceKey))}if(item){Object.assign(item,{width:size.width,height:size.height,pdfSourceKey,name:nameFromFile(file),category:'Architectural',drawingType:item.drawingType??(kind==='floor'?'floor-plan':'elevation')})}else{sheets.push({id,sheetId:id.split('__').at(-1),projectId:scope.projectId,roomId:scope.roomId,name:nameFromFile(file),category:'Architectural',width:size.width,height:size.height,references:[],pdfSourceKey,pdfPage:pdf?1:undefined,pdfPageCount:pdf?.pageCount,drawingType:kind==='floor'?'floor-plan':'elevation',modelSourceKey:sourceKey,modelKind:kind})}persist();if(!active||active==='__empty__'||!visible().some(x=>x.id===active))await select(id);else render();return id}
window.constructionAIImportModelReference=(...args)=>queueSave(()=>importModelReference(...args));
window.constructionAISelectSourceDrawing=async(sourceKey)=>{const item=sheets.find(x=>projects().belongs(x)&&x.modelSourceKey===sourceKey);if(!item)return false;await select(item.id);window.constructionAIShowTab?.('drawings');return true};
async function activateRoom(){const items=visible();if(!items.length){active='';if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null}const img=$('sheet');img.removeAttribute('src');img.hidden=true;$('sheetTitle').textContent='No drawing selected';$('drawingStatus').textContent='Add a drawing to this room.';$('referenceList').textContent='None linked';window.constructionAISetSheet?.('__empty__');render();return}await select(items[0].id)}
$('deleteSheet').onclick=async()=>{const item=sheets.find(x=>x.id===active);if(!item)return;if(!confirm('Remove '+displayId(item)+' from this room? This action cannot be undone.'))return;try{await transaction('readwrite',store=>store.delete(item.id));sheets=sheets.filter(x=>x.id!==item.id);persist();await activateRoom();$('libraryStatus').textContent='Drawing removed from this device.'}catch(e){$('libraryStatus').textContent='Could not remove drawing: '+e.message}};
window.addEventListener('construction-room-change',()=>activateRoom().catch(e=>$('libraryStatus').textContent=e.message));
(async()=>{sheets=load();let changed=false;for(const item of sheets){if(!item.projectId){item.projectId='legacy-project';item.roomId='legacy-room';item.sheetId=item.id;changed=true}}if(!localStorage.getItem('construction-ai-library-migrated-v1')&&!sheets.some(s=>s.id==='A102')){sheets.unshift({id:'A102',sheetId:'A102',projectId:'legacy-project',roomId:'legacy-room',name:'Floor plan (legacy)',category:'Architectural',width:4480,height:3051,references:[]});changed=true}if(changed)persist();localStorage.setItem('construction-ai-library-migrated-v1','yes');try{await activateRoom();window.dispatchEvent(new Event('construction-library-ready'))}catch(err){$('libraryStatus').textContent='Local drawing storage unavailable: '+err.message;render()}})();
$('drawingTypeFilter')?.addEventListener('change',render);
$('selectedDrawingType')?.addEventListener('change',event=>{const item=sheets.find(x=>x.id===active);if(!item)return;const previous=item.drawingType;try{item.drawingType=event.target.value;persist();render();$('sheetSubtitle').textContent=typeLabel(drawingType(item))+' • Drawing preview • recognized text are not automatically verified';$('libraryStatus').textContent='Drawing labeled '+typeLabel(drawingType(item))+'.'}catch(error){item.drawingType=previous;render();$('libraryStatus').textContent='Could not save label: '+error.message}});
$('sheetSearch')?.addEventListener('input',render);$('sheetFilter')?.addEventListener('change',render);
window.constructionAIGetPdfTextSource=async sheetId=>{
 const item=sheets.find(x=>x.id===sheetId&&projects()?.belongs(x));
 if(!item||!item.pdfSourceKey)return null;
 const original=await transaction('readonly',store=>store.get(item.pdfSourceKey));
 if(!original||!window.constructionAIPdf.isPdf(original))
  throw Error('Original PDF not available in local storage. Re-import this PDF sheet.');
 if(!Number.isSafeInteger(item.width)||!Number.isSafeInteger(item.height)||
    !Number.isSafeInteger(item.pdfPage)||item.pdfPage<1)
  throw Error('PDF preview page/dimensions are missing. Re-import the drawing.');
 return {
  file:original,page:item.pdfPage,expectedPixels:{width:item.width,height:item.height},
  scope:{projectId:item.projectId,roomId:item.roomId},
  sheetId:item.id
 };
};
// Snapshot the exact selected page and original bytes for source-linked analysis.
window.constructionAIGetDrawingSource=async sheetId=>{
 const item=sheets.find(x=>x.id===sheetId&&projects()?.belongs(x));
 if(!item)throw Error('Drawing is no longer in the current room.');
 const metadata={...item},scope={projectId:item.projectId,roomId:item.roomId};
 const stored=await transaction('readonly',store=>store.get(sheetId));
 if(!stored)throw Error('Import a JPG, PNG or PDF drawing first.');
 const original=metadata.pdfSourceKey?await transaction('readonly',store=>store.get(metadata.pdfSourceKey)):stored;
 if(!original)throw Error('Original source is unavailable. Re-import this drawing.');
 let blob=stored,width=metadata.width,height=metadata.height;
 const page=metadata.pdfPage||1;
 if(window.constructionAIPdf.isPdf(blob)){
  const rendered=(await window.constructionAIPdf.prepare(blob,String(page)))[0];
  blob=rendered.blob;width=rendered.width;height=rendered.height;
 }
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)
  throw Error('Drawing pixel dimensions are missing. Re-import the source.');
 if(JSON.stringify(scope)!==JSON.stringify(projects().current()))throw Error('Room changed during source capture.');
 return {blob,original,width,height,page,scope,sheet:displayId(metadata),
  filename:original.name||metadata.name||'drawing',revision:metadata.revision??null};
};
window.constructionAIWaitForDrawingSave=()=>pendingSave;
})();