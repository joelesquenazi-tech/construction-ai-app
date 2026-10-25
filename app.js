(()=>{'use strict';
const KEY='construction-ai-batch1-v1';let W=4480,H=3051;let activeSheet='A102';const SHEET_KEY='construction-ai-sheet-findings-v1';let perSheet={};try{perSheet=JSON.parse(localStorage.getItem(SHEET_KEY)||'{}')}catch{}
const initial=()=>({findings:structuredClone(window.INITIAL_FINDINGS),records:{}});
let state;try{const saved=JSON.parse(localStorage.getItem(KEY));state=saved&&Array.isArray(saved.findings)?saved:initial()}catch{state=initial()}
const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({...state,findings:activeSheet==='A102'?state.findings:(JSON.parse(localStorage.getItem(KEY)||'null')?.findings||structuredClone(window.INITIAL_FINDINGS))}));return true}catch(e){alert('Local saving failed. Export a backup instead. '+e.message);return false}};
let selected=null,filter='all',scale=1,tx=0,ty=0;
let lastReviewAction=null;
const reviewLogic=window.ConstructionFindingReview;const saveSheet=()=>{if(activeSheet==='A102')return save();const before=perSheet[activeSheet];perSheet[activeSheet]=state.findings;try{localStorage.setItem(SHEET_KEY,JSON.stringify(perSheet));return true}catch(e){if(before===undefined)delete perSheet[activeSheet];else perSheet[activeSheet]=before;alert('Review save failed: '+e.message);return false}};
function counts(){$('total').textContent=state.findings.length;$('pending').textContent=state.findings.filter(f=>f.status==='pending').length;$('confirmed').textContent=state.findings.filter(f=>f.status==='confirmed').length}
function markers(){const host=$('markers');host.innerHTML='';for(const f of state.findings){if(f.status==='rejected'&&f.id!==selected&&!$('showRejectedMarkers').checked)continue;const b=document.createElement('button');b.className='marker '+f.status+(f.id===selected?' active':'');b.style.left=f.x+'px';b.style.top=f.y+'px';b.textContent='?';b.title=`${f.text} — ${f.status}`;b.setAttribute('aria-label',`Review ${f.text}`);b.addEventListener('click',e=>{e.stopPropagation();select(f.id,false)});host.append(b)}}

function showFindingFeedback(message,undo=false){
 const box=$('findingFeedback');
 box.replaceChildren();
 box.hidden=!message;
 if(!message)return;
 const text=document.createElement('span');text.textContent=message;box.append(text);
 if(undo&&lastReviewAction){
  const button=document.createElement('button');button.type='button';
  button.textContent='Undo last review';
  button.onclick=()=>{
   const action=lastReviewAction;
   if(!action||action.sheet!==activeSheet)return;
   const record=state.findings.find(x=>x.id===action.id);
   if(!record){showFindingFeedback('Previous finding is no longer available.');return}
   const current={status:record.status,correction:record.correction,note:record.note};
   Object.assign(record,action.previous);
   if(!saveSheet()){Object.assign(record,current);showFindingFeedback('Could not restore the previous review.');return}
   lastReviewAction=null;selected=record.id;render();
   showFindingFeedback('Previous review decision restored.');
  };
  box.append(button);
 }
}
function detail(){const f=state.findings.find(x=>x.id===selected);$('findingIndex').textContent=f?f.id:'Select a marker';if(!f){$('detail').innerHTML='<div class="empty">Select a blue marker on the drawing or an item in the review queue.</div>';return}
const possibleScale=f.text.includes('=');
const fromPdf=f.source_kind==='pdf_embedded_text';
const sourceName=fromPdf?'Embedded PDF text — not verified':'Original image OCR text (unchanged)';
const confidenceLabel=fromPdf?'PDF text layer · confidence not measured':reviewLogic.confidence(f.confidence);
const reliability=!fromPdf&&reviewLogic.needsCare(f.confidence)?'<p class="finding-confidence-note">Low OCR confidence. Compare the text with the actual drawing before confirming.</p>':'';$('detail').innerHTML=`<div class="finding-current-decision">Review status: <strong>${esc(f.status||"pending")}</strong></div><div class="field"><small>${esc(sourceName)}</small><div class="original">${esc(f.text)}</div></div><div class="field"><small>Rule suggestion — NOT verified</small><b>${esc(f.suggestion||'No reliable interpretation')}</b></div><div class="field"><small>Source method / pixel location</small><b>${esc(confidenceLabel)} · (${f.x}, ${f.y})</b></div>${reliability}<p class="warning">${possibleScale?'May be a drawing scale rather than a measurement. ':''}${esc(f.reason||'Candidate text; still requires human review.')}</p>${Array.isArray(f.knowledgeMatches)&&f.knowledgeMatches.length?'<div class="field"><small>Relevant verified knowledge (suggestions only)</small>'+f.knowledgeMatches.map(k=>'<p><b>'+esc(k.title)+'</b>: '+esc(k.value)+' · '+esc(k.scope)+'</p>').join('')+'</div>':''}<div class="field"><label>Corrected reading<input id="correction" placeholder="Enter only what you can verify" value="${esc(f.correction)}"></label><label>Review notes<textarea id="reviewNote" rows="3" placeholder="Reference related plan/detail">${esc(f.note)}</textarea></label></div><div class="action-grid"><button class="success" id="confirm">Confirm</button><button class="danger" id="reject">Reject</button><button id="saveReview">Save as pending</button><button id="clearReview">Clear decision</button></div><p class="notice">Confirmation records your review; it does not validate the drawing scale or create geometry.</p>`;
const persist=status=>{
 const previous={status:f.status,correction:f.correction,note:f.note};
 f.correction=$('correction').value.trim();f.note=$('reviewNote').value.trim();
 f.status=status;
 if(!saveSheet()){Object.assign(f,previous);render();showFindingFeedback('Could not save this review. No decision was changed.');return}
 lastReviewAction={sheet:activeSheet,id:f.id,previous};
 const next=(status==='rejected'||status==='confirmed')?reviewLogic.nextPending(state.findings,f.id):null;
 if(next)selected=next;
 render();
 const phrase=status==='rejected'?'OCR finding rejected and saved. Its marker will be hidden when you leave this item unless rejected markers are enabled.':
  status==='confirmed'?'Human-confirmed reading saved. This does not verify drawing geometry.':
  'Review saved as pending.';
 showFindingFeedback(phrase+(next?' Next pending finding selected.':''),true);
};
$('confirm').onclick=()=>{if(!($('correction').value.trim())){showFindingFeedback('Enter a source-verified reading before confirming.');return}persist('confirmed')};
$('reject').onclick=()=>persist('rejected');
$('saveReview').onclick=()=>persist('pending');
$('clearReview').onclick=()=>{const previous={status:f.status,correction:f.correction,note:f.note};f.correction='';f.note='';f.status='pending';if(!saveSheet()){Object.assign(f,previous);showFindingFeedback('Could not clear review.');return}lastReviewAction={sheet:activeSheet,id:f.id,previous};render();showFindingFeedback('Review reset to pending.',true)};
}function queue(){const list=state.findings.filter(f=>filter==='all'||f.status===filter);$('queue').innerHTML=list.map(f=>`<button class="queue-item" data-id="${esc(f.id)}"><span><b>${esc(f.text)}</b><small>${esc(f.id)} · ${f.source_kind==='pdf_embedded_text'?'embedded PDF text':('image OCR '+esc(reviewLogic.confidence(f.confidence)))} · ${esc(f.reason||'candidate')}</small></span><span class="status">${esc(f.status)}</span></button>`).join('')||'<p>No findings in this category.</p>';$('queue').querySelectorAll('button[data-id]').forEach(b=>b.onclick=()=>{showTab('drawings');select(b.dataset.id,true)})}
function render(){counts();markers();detail();queue()}
function select(id,center){selected=id;render();if(center){const f=state.findings.find(x=>x.id===id);if(f){const rect=$('viewport').getBoundingClientRect();tx=rect.width/2-f.x*scale;ty=rect.height/2-f.y*scale;clamp();apply()}}}
function showTab(name){if(name==='model3d'&&window.constructionAI3DEnter&&!window.constructionAI3DEnter())return;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===name));if(name==='drawings')requestAnimationFrame(fit)}
window.constructionAIShowTab=showTab;window.constructionAIActiveTab=()=>document.querySelector('.page.active')?.id||'drawings';document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));$('showRejectedMarkers').onchange=markers;
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));queue()});
function apply(){$('drawingStage').style.transform=`translate(${tx}px,${ty}px) scale(${scale})`}
function clamp(){const r=$('viewport').getBoundingClientRect(),sw=W*scale,sh=H*scale;tx=sw<=r.width?(r.width-sw)/2:Math.min(0,Math.max(r.width-sw,tx));ty=sh<=r.height?(r.height-sh)/2:Math.min(0,Math.max(r.height-sh,ty))}
function fit(){const r=$('viewport').getBoundingClientRect();if(!r.width)return;scale=Math.min(r.width/W,r.height/H);tx=(r.width-W*scale)/2;ty=(r.height-H*scale)/2;apply()}
function zoom(factor,x,y){const r=$('viewport').getBoundingClientRect();x??=r.width/2;y??=r.height/2;const next=Math.max(Math.min(r.width/W,r.height/H)*.8,Math.min(2,scale*factor));tx=x-(x-tx)*next/scale;ty=y-(y-ty)*next/scale;scale=next;clamp();apply()}
$('zoomIn').onclick=()=>zoom(1.5);$('zoomOut').onclick=()=>zoom(1/1.5);$('zoomReset').onclick=fit;
const vp=$('viewport');vp.addEventListener('wheel',e=>{e.preventDefault();const r=vp.getBoundingClientRect();zoom(e.deltaY<0?1.18:1/1.18,e.clientX-r.left,e.clientY-r.top)},{passive:false});
const touches=new Map();let lastDist=null;vp.addEventListener('pointerdown',e=>{if(e.target.closest('.marker'))return;vp.setPointerCapture(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY})});vp.addEventListener('pointermove',e=>{if(!touches.has(e.pointerId))return;const old=touches.get(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=[...touches.values()];if(a.length===1){tx+=e.clientX-old.x;ty+=e.clientY-old.y;clamp();apply()}else if(a.length===2){const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(lastDist){const r=vp.getBoundingClientRect();zoom(d/lastDist,(a[0].x+a[1].x)/2-r.left,(a[0].y+a[1].y)/2-r.top)}lastDist=d}});function release(e){touches.delete(e.pointerId);lastDist=null}vp.addEventListener('pointerup',release);vp.addEventListener('pointercancel',release);
window.constructionAISetSheet=id=>{activeSheet=id;const d=window.constructionAIActiveDimensions||{};W=d.width||4480;H=d.height||3051;const stage=$('drawingStage');stage.style.width=W+'px';stage.style.height=H+'px';const sheet=$('sheet');sheet.style.width=W+'px';sheet.style.height=H+'px';state.findings=id==='A102'?(JSON.parse(localStorage.getItem(KEY)||'null')?.findings||structuredClone(window.INITIAL_FINDINGS)):((perSheet=JSON.parse(localStorage.getItem(SHEET_KEY)||'{}'))[id]||[]);selected=null;lastReviewAction=null;showFindingFeedback('');render();requestAnimationFrame(fit)};
window.constructionAIImportFindings=(id,findings)=>{if(id==='A102'){state.findings=findings;save()}else{perSheet[id]=findings;localStorage.setItem(SHEET_KEY,JSON.stringify(perSheet));if(id===activeSheet)state.findings=findings}selected=null;lastReviewAction=null;showFindingFeedback('');render()};
const form=$('recordForm');for(const [k,v] of Object.entries(state.records||{})){if(form.elements.namedItem(k))form.elements.namedItem(k).value=v}form.onsubmit=e=>{e.preventDefault();state.records=Object.fromEntries(new FormData(form).entries());if(save())$('saveMessage').textContent='Saved on this device'};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({schema:'construction-ai-batch1',exportedAt:new Date().toISOString(),drawing:'A102',...state,findings:activeSheet==='A102'?state.findings:(JSON.parse(localStorage.getItem(KEY)||'null')?.findings||structuredClone(window.INITIAL_FINDINGS)),otherSheetFindings:perSheet},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='construction-ai-A102-review-backup.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('import').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(obj.schema!=='construction-ai-batch1'||!Array.isArray(obj.findings)||obj.findings.some(f=>typeof f.id!=='string'||typeof f.x!=='number'||typeof f.y!=='number'||!['pending','confirmed','rejected'].includes(f.status)))throw Error('Invalid backup format');if(!confirm('Replace reviews and records on this device with this backup?'))return;state={findings:obj.findings,records:obj.records&&typeof obj.records==='object'?obj.records:{}};if(obj.otherSheetFindings&&typeof obj.otherSheetFindings==='object'&&!Array.isArray(obj.otherSheetFindings)){perSheet=obj.otherSheetFindings;localStorage.setItem(SHEET_KEY,JSON.stringify(perSheet))}save();location.reload()}catch(err){alert('Import failed: '+err.message)}};
$('resetData').onclick=()=>{if(confirm('Erase all locally saved reviews and records for this prototype?')){localStorage.removeItem(KEY);location.reload()}};
// Compare editable fields with persisted values; never write or migrate storage here.
window.constructionAIHasUnsavedEdits=()=>{
 let saved;try{saved=JSON.parse(localStorage.getItem(KEY))||initial()}catch{return true}
 if(activeSheet==='A102'&&JSON.stringify(state.findings)!==JSON.stringify(saved.findings))return true;
 const f=state.findings.find(x=>x.id===selected);
 if(f&&$('correction')&&($('correction').value!==(f.correction||'')||$('reviewNote').value!==(f.note||'')))return true;
 return [...new FormData(form)].some(([key,value])=>value!==String(saved.records?.[key]??''));
};
render();requestAnimationFrame(fit);window.addEventListener('resize',()=>{if(document.getElementById('drawings').classList.contains('active'))fit()});
})();
