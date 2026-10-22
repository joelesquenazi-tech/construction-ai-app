(()=>{'use strict';
const $=id=>document.getElementById(id);
const settings=$('settingsPanel'),layers=$('layersPanel');
const settingsButton=$('settingsToggle'),layersButton=$('layersToggle');
const KEY='construction-ai-ui-preferences-v1';
let prefs={drawing:true,markers:true};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}
function toggle(panel,button){const opening=panel.hidden;settings.hidden=true;layers.hidden=true;settingsButton.setAttribute('aria-expanded','false');layersButton.setAttribute('aria-expanded','false');panel.hidden=!opening;button.setAttribute('aria-expanded',String(opening));}
settingsButton.addEventListener('click',()=>toggle(settings,settingsButton));
layersButton.addEventListener('click',()=>toggle(layers,layersButton));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){settings.hidden=true;layers.hidden=true;settingsButton.setAttribute('aria-expanded','false');layersButton.setAttribute('aria-expanded','false');}});
function apply(){const sheet=$('sheet'),markers=$('markers');if(sheet)sheet.style.visibility=prefs.drawing?'visible':'hidden';if(markers)markers.style.visibility=prefs.markers?'visible':'hidden';$('layerDrawing').checked=!!prefs.drawing;$('layerMarkers').checked=!!prefs.markers;}
for(const [id,key] of [['layerDrawing','drawing'],['layerMarkers','markers']]){$(id).addEventListener('change',e=>{prefs[key]=e.target.checked;try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{}apply()})}
apply();
$('settingsRefresh').addEventListener('click',async()=>{
const button=$('settingsRefresh'),status=$('refreshStatus');button.disabled=true;status.textContent='Checking for the latest app version…';
try{
if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.getRegistration();if(reg){await reg.update();}}
status.textContent='Reloading app. Saved local data will be retained.';
window.location.reload();
}catch(err){status.textContent='Could not check for updates: '+err.message;button.disabled=false;}
});
for(const [id,mode] of [['devSimRestart','restart'],['devSimFirstLaunch','first']]){
const button=$(id);if(button)button.addEventListener('click',()=>{
if(typeof window.constructionAIPreviewStartup!=='function'){ $('devPreviewStatus').textContent='Startup preview is not ready. Refresh and try again.';return}
window.constructionAIPreviewStartup(mode);
});
}
})();