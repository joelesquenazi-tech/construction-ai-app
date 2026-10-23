/* Experimental local-only 2D review of possible walls, not verified geometry.
 * Image content stays in device memory; proposals are never applied to 3D.
 */
(()=>{
'use strict';
const host=document.getElementById('model3d'),core=window.ConstructionWallCandidates;
if(!host||!core||!window.constructionAITraceSource)return;
const section=document.createElement('section');
section.className='wall-candidate-panel';
section.id='wallCandidatePanel';
section.innerHTML='<div class="model-view-head"><b>Automatic wall candidates</b><span>Experimental · unverified 2D linework</span></div>'+
'<p>Find possible straight wall faces directly in your saved floor plan, without tracing. The app looks for paired parallel lines. These might also be millwork, borders or other details. No wall has been verified and this does not build the 3D model yet.</p>'+
'<div class="wall-candidate-actions"><button id="wallCandidateScan" type="button">Find possible wall lines</button><p id="wallCandidateStatus" role="status">No local wall scan yet. Choose Find possible wall lines to inspect the drawing.</p></div>'+
'<div id="wallCandidateResults" hidden><div id="wallCandidateViewport" class="wall-candidate-viewport"><svg id="wallCandidateSvg" role="img" aria-label="Unverified line-pair candidates over floor plan"></svg></div><div id="wallCandidateList" class="wall-candidate-list"></div>'+
'<p class="wall-candidate-disclaimer">All candidates are preliminary. Parallel strokes alone cannot distinguish walls from dimension lines, furniture, cabinetry, or framing. No calibration, wall traces, or 3D geometry have been changed.</p></div>';
const manual=document.getElementById('geometryPreview');
if(manual)manual.insertAdjacentElement('beforebegin',section);
else host.querySelector('.model-workspace')?.insertAdjacentElement('beforebegin',section);
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
let imageURL=null,run=0,report=null,selected=null;
function clear(){
 if(imageURL){URL.revokeObjectURL(imageURL);imageURL=null}
 report=null;selected=null;$('wallCandidateSvg').replaceChildren();
 $('wallCandidateList').replaceChildren();$('wallCandidateResults').hidden=true;
}
const status=$('wallCandidateStatus');
function svgNode(tag,attrs){
 const node=document.createElementNS(NS,tag);
 for(const [key,val] of Object.entries(attrs))node.setAttribute(key,String(val));
 return node;
}
function paint(){
 const svg=$('wallCandidateSvg');svg.replaceChildren();
 if(!report||!imageURL)return;
 const {width,height}=report.stats;
 svg.setAttribute('viewBox','0 0 '+width+' '+height);
 svg.setAttribute('preserveAspectRatio','none');
 svg.style.aspectRatio=width+'/'+height;
 const image=svgNode('image',{x:0,y:0,width,height,'preserveAspectRatio':'none'});
 image.setAttribute('href',imageURL);svg.append(image);
 for(const c of report.candidates){
  const on=c.id===selected;
  const [a,b]=c.points_px;
  svg.append(svgNode('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],
    stroke:on?'#f97316':'#087ef5','stroke-width':on?3.2:1.6,
    'stroke-opacity':on?'1':'.68','stroke-linecap':'round'}));
  if(on)for(const p of [a,b])svg.append(svgNode('circle',{
   cx:p[0],cy:p[1],r:4,fill:'#f97316',stroke:'#fff','stroke-width':1.2
  }));
 }
}
function select(id){
 selected=id;paint();
 for(const b of $('wallCandidateList').querySelectorAll('button[data-proposal]')){
  const on=b.dataset.proposal===id;
  b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
 }
 const c=report?.candidates.find(x=>x.id===id),vp=$('wallCandidateViewport');
 if(!c)return;
 const [a,b]=c.points_px;
 const cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
 const svg=$('wallCandidateSvg');
 const width=svg.getBoundingClientRect().width;
 if(width){
  vp.scrollLeft=Math.max(0,cx*width/report.stats.width-vp.clientWidth/2);
  vp.scrollTop=Math.max(0,cy*width/report.stats.width-vp.clientHeight/2);
 }
}
function render(){
 const list=$('wallCandidateList');list.replaceChildren();
 $('wallCandidateResults').hidden=false;
 for(const c of report.candidates){
  const b=document.createElement('button');
  b.type='button';b.dataset.proposal=c.id;b.setAttribute('aria-pressed','false');
  const title=document.createElement('strong');
  title.textContent=c.id.replace('candidate-','Possible line #');
  const subtitle=document.createElement('span');
  subtitle.textContent=(c.axis==='h'?'Horizontal':'Vertical')+' · apparent gap '+c.apparent_width_px+' scan pixels';
  b.append(title,subtitle);b.addEventListener('click',()=>select(c.id));list.append(b);
 }
 paint();if(report.candidates.length)select(report.candidates[0].id);
}
function loadImage(url){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(Error('Could not decode the local floor plan.'));
  img.src=url;
 });
}
function raster(image){
 const maxSide=1400,maxPixels=1800000;
 const ratio=Math.min(1,maxSide/Math.max(image.naturalWidth,image.naturalHeight),
                        Math.sqrt(maxPixels/(image.naturalWidth*image.naturalHeight)));
 const width=Math.max(1,Math.floor(image.naturalWidth*ratio));
 const height=Math.max(1,Math.floor(image.naturalHeight*ratio));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('This iPad cannot create the local drawing analysis canvas.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
 ctx.drawImage(image,0,0,width,height);
 const pixels=ctx.getImageData(0,0,width,height).data;
 const rows=Array.from({length:height},()=>new Uint8Array(width));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  const brightness=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];
  rows[y][x]=pixels[i+3]>200&&brightness<115?1:0;
 }
 return rows;
}
$('wallCandidateScan').addEventListener('click',async()=>{
 const ticket=++run,button=$('wallCandidateScan');clear();
 button.disabled=true;status.textContent='Reading the saved floor plan and scanning locally…';
 let freshURL=null;
 try{
  const source=await window.constructionAITraceSource();
  if(ticket!==run)return;
  if(!source?.file)throw Error('Upload a floor plan in Drawing setup first.');
  if(!['image/png','image/jpeg'].includes(source.file.type))
   throw Error('This initial offline scanner requires a JPG or PNG floor plan. PDF/TIFF support is planned.');
  freshURL=URL.createObjectURL(source.file);
  const img=await loadImage(freshURL);if(ticket!==run)return;
  const rows=raster(img);
  const found=core.detectWallCandidates(rows);
  if(ticket!==run)return;
  imageURL=freshURL;freshURL=null;report=found;
  render();
  const n=found.candidates.length;
  status.textContent=n
   ?n+' possible straight wall-line pair(s) found on this device. Select one to inspect it. All require source review; no 3D walls were generated.'
   :'No reliable straight line pairs were found. The drawing may have thin, rotated, interrupted or complex walls. Automatic modeling is still in development.';
 }catch(e){if(ticket===run)status.textContent='Could not analyze drawing: '+e.message}
 finally{if(freshURL)URL.revokeObjectURL(freshURL);if(ticket===run)button.disabled=false}
});
function reset(message){
 ++run;clear();$('wallCandidateScan').disabled=false;
 status.textContent=message;
}
window.addEventListener('construction-room-change',()=>reset('Room changed. Find possible wall lines to analyze the selected floor plan.'));
window.addEventListener('construction-scale-source-changed',()=>reset('Floor plan changed. Scan the new drawing to find possible wall lines.'));
})();