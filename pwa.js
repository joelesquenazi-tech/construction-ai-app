(()=>{'use strict';
if('serviceWorker' in navigator&&location.protocol==='https:'){
navigator.serviceWorker.register('./sw.js').then(reg=>{
reg.addEventListener('updatefound',()=>{
const worker=reg.installing;
worker?.addEventListener('statechange',()=>{
if(worker.state==='installed'&&navigator.serviceWorker.controller){const b=document.getElementById('updateNotice');if(b)b.hidden=false}
});
});
}).catch(e=>console.warn('Offline installation unavailable:',e));
}
})();