(()=>{'use strict';
const $=id=>document.getElementById(id),KEY='construction-ai-scan-history-v1';
const clean=s=>String(s||'').trim();
const dimension=/\b\d{1,3}\s*['′-]\s*\d{1,2}\s*(?:["″])?|\b\d+(?:\.\d+)?\s*(?:mm|cm|inches|inch)\b/i;
const sheetRef=/\b(?:A|S|M|E|P|ID)[- ]?\d{2,4}(?:\.\d+)?\b/i;
const room=/\b(?:ROOM|BEDROOM|BATHROOM|KITCHEN|CORRIDOR|OFFICE|DINING|CLOSET|LOBBY|GARAGE|LIVING|MECHANICAL|LAUNDRY|GYM)\b/i;
const ruleType=t=>dimension.test(t)?'dimension':sheetRef.test(t)?'sheet-reference':room.test(t)?'room-label':'text';
function knowledge(text){let rules=[];try{rules=JSON.parse(localStorage.getItem('construction-ai-knowledge-v1')||'[]')}catch{};return(Array.isArray(rules)?rules:[]).filter(r=>r.status==='verified'&&r.title&&text.toLowerCase().includes(r.title.toLowerCase())).map(r=>({id:r.id,title:r.title,value:r.value,scope:r.scope,source:r.source||'',status:'suggestion-only'}))}
function remember(id,items){let all={};try{all=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{};all[id]={scannedAt:new Date().toISOString(),count:items.length,types:items.reduce((a,x)=>(a[x.kind]=(a[x.kind]||0)+1,a),{})};localStorage.setItem(KEY,JSON.stringify(all))}
function rectFor(d){const p=d.boundingBox||d.rect||{};return{x:Number(p.x??p.left??0),y:Number(p.y??p.top??0)}}
async function scan(){const button=$('scanDrawing'),status=$('scanStatus'),sheet=$('sheet'),id=$('sheetSelector').value;if(!sheet?.naturalWidth){status.textContent='Import a drawing image first.';return}if(typeof window.TextDetector!=='function'){status.textContent='On-device OCR is not supported by this browser. No drawing was sent anywhere. You can still import OCR JSON in Library. A bundled offline OCR engine is required for full iPad scanning.';return}if(window.constructionAIHasUnsavedEdits?.()&&!confirm('You have unsaved edits. Save them before scanning and replacing findings. Continue?'))return;
button.disabled=true;status.textContent='Scanning on this device…';try{
const detector=new window.TextDetector();const bitmap=await createImageBitmap(sheet);let results;try{results=await detector.detect(bitmap)}finally{bitmap.close?.()}
const items=(results||[]).map((d,i)=>{const text=clean(d.rawValue||d.text);const point=rectFor(d);const matches=knowledge(text);return{id:id+'-scan-'+String(i+1).padStart(4,'0'),text:text.slice(0,500),x:Math.max(0,Math.min(sheet.naturalWidth,point.x)),y:Math.max(0,Math.min(sheet.naturalHeight,point.y)),confidence:0,suggestion:'',reason:'On-device OCR · '+ruleType(text)+(matches.length?' · '+matches.length+' knowledge suggestion(s) available':''),kind:ruleType(text),knowledgeMatches:matches,status:'pending',correction:'',note:''}}).filter(f=>f.text);
if(!items.length){status.textContent='Scan completed, but no readable text was detected. Existing reviews were not changed.';return}
if(!confirm('Found '+items.length+' unverified text items on '+id+'. Replace the current review queue for this sheet?')){status.textContent='Scan results discarded; existing reviews preserved.';return}
window.constructionAIImportFindings?.(id,items);remember(id,items);status.textContent='Scan complete: '+items.length+' OCR findings saved locally. All require review; no dimensions were verified automatically.'
}catch(e){status.textContent='Scan failed: '+e.message+'. Existing reviews were not changed.'}finally{button.disabled=false}}
$('scanDrawing').onclick=scan;
})();