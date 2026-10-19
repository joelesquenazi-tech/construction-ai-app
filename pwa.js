(()=>{'use strict';
const input=document.getElementById('drawingImport'),status=document.getElementById('drawingStatus'),img=document.getElementById('sheet');
const DB='construction-ai-private-drawings',STORE='images';let objectUrl;
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function transact(mode,operation){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);const req=operation(tx.objectStore(STORE));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()})}
async function show(blob){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(blob);img.onload=()=>{const iw=img.naturalWidth,ih=img.naturalHeight;
const expectedRatio=4480/3051, actualRatio=iw/ih;
const difference=Math.abs(actualRatio/expectedRatio-1);
if(difference>0.01){status.textContent=`Image ${iw}×${ih}: proportions differ from OCR source by ${(difference*100).toFixed(1)}%. Check for cropping before using markers. All findings remain unverified.`}
else if(iw!==4480||ih!==3051){status.textContent=`Image ${iw}×${ih}: scaled to the original 4480×3051 OCR coordinate space. Check marker alignment visually; all findings remain unverified.`}
else{status.textContent='A102 drawing loaded at original OCR resolution. Findings remain unverified.'}};img.src=objectUrl;img.hidden=false}
input.addEventListener('change',async()=>{const f=input.files?.[0];if(!f)return;if(!['image/jpeg','image/png'].includes(f.type)){status.textContent='Choose a JPG or PNG image.';return}try{await transact('readwrite',s=>s.put(f,'A102'));await show(f)}catch(e){status.textContent='Could not save drawing locally: '+e.message}});
(async()=>{try{const blob=await transact('readonly',s=>s.get('A102'));if(blob)await show(blob)}catch(e){status.textContent='Local drawing storage unavailable: '+e.message}})();
if('serviceWorker' in navigator&&location.protocol==='https:'){
 navigator.serviceWorker.register('./sw.js').then(reg=>{
  reg.addEventListener('updatefound',()=>{
   const worker=reg.installing;
   worker?.addEventListener('statechange',()=>{
    if(worker.state==='installed'&&navigator.serviceWorker.controller){
     const b=document.getElementById('updateNotice');if(b)b.hidden=false;
    }
   });
  });
 }).catch(e=>console.warn('Offline installation unavailable:',e));
}
const refresh=document.getElementById('refreshApp');
if(refresh)refresh.onclick=()=>location.reload();
})();