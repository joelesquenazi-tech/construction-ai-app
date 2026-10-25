(()=>{'use strict';
const $=id=>document.getElementById(id),KEY='construction-ai-scan-history-v1';
const CDN='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const dimension=/\d+\s*['′″"]|\d+\s*\/\s*\d+|\b(?:AFF|TYP|EQ)\b/i;
const sheetRef=/\b(?:A|S|M|E|P|ID)[- ]?\d{2,4}(?:\.\d+)?\b/i;
const room=/\b(?:ROOM|BEDROOM|BATHROOM|KITCHEN|CORRIDOR|OFFICE|DINING|CLOSET|LOBBY|GARAGE|LIVING|MECHANICAL|LAUNDRY|GYM)\b/i;
const type=t=>dimension.test(t)?'dimension':sheetRef.test(t)?'sheet-reference':room.test(t)?'room-label':'text';
let busy=false;
function matches(text){let rules=[];try{rules=JSON.parse(localStorage.getItem('construction-ai-knowledge-v1')||'[]')}catch{};return(Array.isArray(rules)?rules:[]).filter(r=>r.status==='verified'&&String(r.title||'').split(/\s+/).filter(w=>w.length>3).some(w=>text.toLowerCase().includes(w.toLowerCase()))).slice(0,5).map(r=>({id:r.id,title:r.title,value:r.value,scope:r.scope,source:r.source||'',status:'suggestion-only'}))}
function remember(id,items){try{const all=JSON.parse(localStorage.getItem(KEY)||'{}');all[id]={scannedAt:new Date().toISOString(),count:items.length,engine:'tesseract.js 5.1.1',types:items.reduce((a,x)=>(a[x.kind]=(a[x.kind]||0)+1,a),{})};localStorage.setItem(KEY,JSON.stringify(all))}catch{}}
function loadScript(){if(window.Tesseract?.createWorker)return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=CDN;s.onload=()=>window.Tesseract?.createWorker?resolve():reject(Error('text recognition software did not initialize'));s.onerror=()=>reject(Error('text recognition software download failed; connect to internet to initialize OCR'));document.head.append(s)})}
function imageBlob(id){return new Promise((resolve,reject)=>{const req=indexedDB.open('construction-ai-private-drawings',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('images','readonly'),get=tx.objectStore('images').get(id);get.onsuccess=()=>{db.close();resolve(get.result)};get.onerror=()=>{db.close();reject(get.error)}}})}
async function scan(){
 if(busy)return;
 const button=$('scanDrawing'),status=$('scanStatus'),id=$('sheetSelector').value;
 if(!id)return;
 const scope=JSON.stringify(window.constructionAIProjects?.current?.()||{});
 busy=true;button.disabled=true;
 let worker=null;
 const stillHere=()=>id===$('sheetSelector').value&&
  scope===JSON.stringify(window.constructionAIProjects?.current?.()||{});
 try{
  // A source PDF may already contain selectable text. Extracting it using
  // local PDF.js is usually more faithful than OCR of the rendered pixels.
  const pdfSource=await window.constructionAIGetPdfTextSource?.(id);
  if(!stillHere())throw Error('Drawing or room changed during analysis. Run Scan again.');
  if(pdfSource){
   status.textContent='Checking this PDF for locally embedded text (no OCR or upload)…';
   const raw=await window.constructionAIPdf.extractText(
     pdfSource.file,pdfSource.page,pdfSource.expectedPixels);
   if(!stillHere())throw Error('Drawing or room changed during analysis. Run Scan again.');
   const items=window.ConstructionPDFText.nativeFindings(raw,id,2500);
   if(items.length){
    status.textContent=items.length+
     ' selectable PDF text item(s) found locally. This is not AI/OCR verification.';
    if(!confirm('Found '+items.length+' unverified embedded PDF text items for '+
      id+'. Replace existing findings for this sheet? Previously saved review decisions will be lost; export them first if needed.')){
      status.textContent='Native PDF text preview discarded; saved findings unchanged.';
      return;
    }
    if(!stillHere())throw Error('Drawing or room changed; existing findings retained.');
    window.constructionAIImportFindings?.(id,items);
    remember(id,items);
    status.textContent=items.length+
      ' native PDF text items saved for review. No OCR download or image upload was needed. Text position and meaning are unverified.';
    return;
   }
   status.textContent='No usable selectable text in this PDF page. Image OCR is optional and currently needs downloaded software.';
  }
  // Raster-only page (or a scanned PDF without an embedded text layer).
  // First-run Tesseract.js assets are currently loaded from a third-party CDN.
  // The *drawing* is still processed locally but completely offline OCR has
  // NOT been implemented; do not silently imply otherwise.
  if(!confirm('This drawing requires image OCR. Current Tesseract.js OCR may download software and English language data from the internet; drawing pixels are processed on this device. Continue?')){
   status.textContent='Image OCR cancelled. Existing findings are unchanged.';
   return;
  }
  let blob=await imageBlob(id);
  if(window.constructionAIPdf.isPdf(blob))
   blob=(await window.constructionAIPdf.prepare(blob,'1'))[0].blob;
  if(!blob){status.textContent='Import a JPG, PNG or PDF drawing for '+id+' first.';return}
  if(!stillHere())throw Error('Drawing or room changed during analysis. Run Scan again.');
  status.textContent='Preparing Tesseract image OCR. First run may download recognition components…';
  await loadScript();
  worker=await window.Tesseract.createWorker('eng',1,{logger:m=>{
   if(m.status)status.textContent='Image OCR: '+m.status+
    (typeof m.progress==='number'?' '+Math.round(m.progress*100)+'%':'');
  }});
  const result=await worker.recognize(blob),data=result.data||{},
   words=Array.isArray(data.words)?data.words:[],
   lines=Array.isArray(data.lines)?data.lines:[];
  const source=lines.length?lines:words;
  const items=source.map((w,i)=>{
   const text=String(w.text||'').trim(),b=w.bbox||{},x=Number(b.x0),y=Number(b.y0);
   if(!text||!Number.isFinite(x)||!Number.isFinite(y))return null;
   const knowledgeMatches=matches(text);
   return {
    id:id+'-ocr-'+String(i+1).padStart(4,'0'),text:text.slice(0,500),x,y,
    confidence:Math.max(0,Math.min(100,Number(w.confidence)||0)),suggestion:'',
    reason:'Image OCR (Tesseract) · '+type(text)+
      (knowledgeMatches.length?' · Knowledge suggestions available':''),
    kind:type(text),source_kind:'raster_ocr',knowledgeMatches,
    status:'pending',correction:'',note:''
   };
  }).filter(Boolean);
  if(!items.length){
   status.textContent='Image OCR completed but found no readable text. Existing findings preserved.';
   return;
  }
  status.textContent=items.length+' unverified image OCR findings ready for review.';
  if(!confirm('Found '+items.length+' unverified image OCR findings for '+id+
    '. Replace saved findings? This loses their review decisions unless exported first.')){
   status.textContent='Image OCR preview discarded; existing findings unchanged.';
   return;
  }
  if(!stillHere())throw Error('Drawing or room changed. Existing findings preserved.');
  window.constructionAIImportFindings?.(id,items);
  remember(id,items);
  status.textContent=items.length+
    ' unverified image OCR findings saved. Open Review queue to inspect.';
 }catch(e){
  status.textContent='Text analysis unavailable: '+e.message+
   '. Existing findings were not intentionally replaced.';
 }finally{
  if(worker)try{await worker.terminate()}catch{}
  busy=false;button.disabled=false;
 }
}
$('scanDrawing').onclick=scan;
})();