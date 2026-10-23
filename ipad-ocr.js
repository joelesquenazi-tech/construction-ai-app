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
async function scan(){if(busy)return;const button=$('scanDrawing'),status=$('scanStatus'),id=$('sheetSelector').value;if(!id)return;busy=true;button.disabled=true;let worker=null;try{
let blob=await imageBlob(id);if(window.constructionAIPdf.isPdf(blob))blob=(await window.constructionAIPdf.prepare(blob,'1'))[0].blob;if(!blob){status.textContent='Import a JPG or PNG drawing for '+id+' first.';return}
status.textContent='Preparing local text recognition engine (first run downloads text recognition components)…';await loadScript();
worker=await window.Tesseract.createWorker('eng',1,{logger:m=>{if(m.status)status.textContent='Text recognition: '+m.status+(typeof m.progress==='number'?' '+Math.round(m.progress*100)+'%':'')}});
const result=await worker.recognize(blob),data=result.data||{},words=Array.isArray(data.words)?data.words:[],lines=Array.isArray(data.lines)?data.lines:[];
const source=lines.length?lines:words;
const items=source.map((w,i)=>{const text=String(w.text||'').trim(),b=w.bbox||{},x=Number(b.x0),y=Number(b.y0);if(!text||!Number.isFinite(x)||!Number.isFinite(y))return null;const knowledgeMatches=matches(text);return{id:id+'-ocr-'+String(i+1).padStart(4,'0'),text:text.slice(0,500),x,y,confidence:Math.max(0,Math.min(100,Number(w.confidence)||0)),suggestion:'',reason:'Tesseract Text recognition · '+type(text)+(knowledgeMatches.length?' · Knowledge suggestions available':''),kind:type(text),knowledgeMatches,status:'pending',correction:'',note:''}}).filter(Boolean);
if(!items.length){status.textContent='Scan finished: no readable text. Existing findings were preserved.';return}
status.textContent=items.length+' recognized text items found. Awaiting review decision.';
if(!confirm('Found '+items.length+' unverified recognized text items for '+id+'. Replace existing findings for this sheet? Existing review decisions will be lost; export reviews first if needed.')){status.textContent='text recognition preview discarded. Existing findings unchanged.';return}
window.constructionAIImportFindings?.(id,items);remember(id,items);status.textContent=items.length+' unverified recognized text saved. Open Review queue to verify them.';
}catch(e){status.textContent='text recognition unavailable: '+e.message+'. No existing findings were changed.'}finally{if(worker)try{await worker.terminate()}catch{}busy=false;button.disabled=false}}
$('scanDrawing').onclick=scan;
})();