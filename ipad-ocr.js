(()=>{'use strict';
const $=id=>document.getElementById(id),KEY='construction-ai-scan-history-v1';
const OCR_BASE=new URL('./vendor/tesseract/',document.baseURI).href;
const dimension=/\d+\s*['′″"]|\d+\s*\/\s*\d+|\b(?:AFF|TYP|EQ)\b/i;
const sheetRef=/\b(?:A|S|M|E|P|ID)[- ]?\d{2,4}(?:\.\d+)?\b/i;
const room=/\b(?:ROOM|BEDROOM|BATHROOM|KITCHEN|CORRIDOR|OFFICE|DINING|CLOSET|LOBBY|GARAGE|LIVING|MECHANICAL|LAUNDRY|GYM)\b/i;
const type=t=>window.ConstructionDimensionEvidence.parseMeasurement(t)||dimension.test(t)?'dimension':sheetRef.test(t)?'sheet-reference':room.test(t)?'room-label':'text';
let busy=false;
function matches(text){let rules=[];try{rules=JSON.parse(localStorage.getItem('construction-ai-knowledge-v1')||'[]')}catch{};return(Array.isArray(rules)?rules:[]).filter(r=>r.status==='verified'&&String(r.title||'').split(/\s+/).filter(w=>w.length>3).some(w=>text.toLowerCase().includes(w.toLowerCase()))).slice(0,5).map(r=>({id:r.id,title:r.title,value:r.value,scope:r.scope,source:r.source||'',status:'suggestion-only'}))}
function remember(id,items,engine='tesseract.js 5.1.1'){try{const all=JSON.parse(localStorage.getItem(KEY)||'{}');all[id]={scannedAt:new Date().toISOString(),count:items.length,engine,types:items.reduce((a,x)=>(a[x.kind]=(a[x.kind]||0)+1,a),{})};localStorage.setItem(KEY,JSON.stringify(all))}catch{}}
function loadScript(){if(window.Tesseract?.createWorker)return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=OCR_BASE+'tesseract.min.js';s.onload=()=>window.Tesseract?.createWorker?resolve():reject(Error('text recognition software did not initialize'));s.onerror=()=>reject(Error('Local text recognition files unavailable. Finish installing/updating the app while online, then try again'));document.head.append(s)})}
async function scan(){
 if(busy)return;
 const button=$('scanDrawing'),status=$('scanStatus'),id=$('sheetSelector').value;
 if(!id)return;
 const scope=JSON.stringify(window.constructionAIProjects?.current?.()||{});
 busy=true;button.disabled=true;
 let worker=null;
 const stillHere=()=>id===$('sheetSelector').value&&scope===JSON.stringify(window.constructionAIProjects?.current?.()||{});
 const assertCurrent=async snapshot=>{
  const current=stillHere()&&await window.ConstructionDimensionScan.stillCurrent(snapshot);
  if(!current||!stillHere())
   throw Error('Drawing source or room changed during analysis. Run Scan again');
 };
 try{
  status.textContent='Checking the selected local source…';
  const snapshot=await window.ConstructionDimensionScan.capture(id);
  await assertCurrent(snapshot);
  let items=[],native=false;
  if(window.constructionAIPdf.isPdf(snapshot.ref.original)){
   status.textContent='Checking this PDF for locally embedded text (no OCR or upload)…';
   const raw=await window.constructionAIPdf.extractText(snapshot.ref.original,snapshot.ref.page,
    {width:snapshot.source.width_px,height:snapshot.source.height_px});
   await assertCurrent(snapshot);
   items=window.ConstructionPDFText.nativeFindings(raw,id,2500);
   native=items.length>0;
  }
  if(!native){
   status.textContent='Preparing bundled local English image text recognition…';
   await loadScript();
   worker=await window.Tesseract.createWorker('eng',1,{workerPath:OCR_BASE+'worker.min.js',corePath:OCR_BASE+'core/',langPath:OCR_BASE+'lang/',workerBlobURL:false,logger:m=>{
    if(m.status)status.textContent='Image OCR: '+m.status+(typeof m.progress==='number'?' '+Math.round(m.progress*100)+'%':'');
   }});
   const result=await worker.recognize(snapshot.ref.blob),data=result.data||{},
    words=Array.isArray(data.words)?data.words:[],lines=Array.isArray(data.lines)?data.lines:[];
   const source=lines.length?lines:words;
   items=source.slice(0,2500).map((w,i)=>{
    const text=String(w.text||'').trim(),bbox=window.ConstructionDimensionEvidence.ocrBox(w.bbox);
    if(!text||!bbox)return null;
    const knowledgeMatches=matches(text);
    return {id:id+'-ocr-'+String(i+1).padStart(4,'0'),text:text.slice(0,500),x:bbox.x,y:bbox.y,bbox,
     confidence:Math.max(0,Math.min(100,Number(w.confidence)||0)),suggestion:'',
     reason:'Image OCR (Tesseract) · '+type(text)+(knowledgeMatches.length?' · Knowledge suggestions available':''),
     kind:type(text),source_kind:'raster_ocr',knowledgeMatches,status:'pending',correction:'',note:''};
   }).filter(Boolean);
  }
  if(!items.length){status.textContent='Image OCR completed but found no readable text. Existing findings preserved.';return}
  await assertCurrent(snapshot);
  status.textContent='Locating explicit measurements and possible dimension spans locally…';
  items=await window.ConstructionDimensionScan.enrich(items,snapshot);
  await assertCurrent(snapshot);
  const method=native?'embedded PDF text':'image OCR';
  if(!confirm('Found '+items.length+' unverified '+method+' findings for '+id+
   '. Replace saved findings? This loses their review decisions unless exported first.')){
   status.textContent='Text preview discarded; existing findings unchanged.';return;
  }
  await assertCurrent(snapshot);
  if(window.constructionAIImportFindings?.(id,items)===false)throw Error('Unable to save review findings');
  window.constructionAIDimensionSource=snapshot.source;
  window.dispatchEvent(new Event('construction-dimension-source-ready'));
  remember(id,items,native?'pdfjs-embedded-text':'tesseract.js 5.1.1');
  const evidence=items.filter(f=>f.dimension_evidence),associated=evidence.filter(f=>f.dimension_evidence.association_status==='candidate_unverified');
  status.textContent=items.length+(native?' native PDF text items saved for review.':' unverified image OCR findings saved.')+
   ' '+evidence.length+' explicit measurement reading(s), '+associated.length+' possible dimension span(s). Scale and geometry remain unverified.';
 }catch(e){status.textContent='Text analysis unavailable: '+e.message+'. Existing findings were not intentionally replaced.'}
 finally{if(worker)try{await worker.terminate()}catch{}busy=false;button.disabled=false}
}
$('scanDrawing').onclick=scan;
})();
