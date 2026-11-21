/* Automatic path is primary. Manual tracing/calibration remain optional advanced tools. */
(()=>{'use strict';
const host=document.getElementById('model3d'),jobs=window.ConstructionScanJobs,pipeline=window.ConstructionAutomaticPipeline;
if(!host||!pipeline)return;
const panel=document.createElement('section');panel.id='automaticRoom';panel.className='geometry-preview';
panel.innerHTML='<h2>Automatic drawing model</h2><p>Saved floor plans and elevations are analyzed locally. No routine tracing, scale entry or room-dimension entry is required.</p><p id="automaticRoomStatus" role="status" aria-live="polite">Upload the floor plan and matching elevations to start.</p><button id="automaticRoomRetry" type="button">Analyze saved drawings again</button> <button id="automaticRoomCancel" type="button" hidden>Cancel analysis</button><svg id="automaticRoomScene" viewBox="0 0 700 450" role="img" aria-label="Preliminary wall shell reconstructed from drawing evidence" hidden></svg><label id="automaticRoomRotation" hidden>Rotate preview<input id="automaticRoomYaw" type="range" min="0" max="360" value="35"></label><p id="automaticRoomDimensions"></p><ul id="automaticRoomIssues"></ul><details><summary>Current automatic support</summary><p>First supported case: one clearly labeled rectangular room, two agreeing inside dimensions, and an explicit matching room/ceiling height. One page per file. Openings and architectural details remain unresolved. Complex layouts and cross-view interpretation still need engine development.</p></details>';
host.querySelector('.model-topbar').insertAdjacentElement('afterend',panel);
const advanced=document.createElement('details');advanced.id='manualModelTools';advanced.className='geometry-preview';
const summary=document.createElement('summary');summary.textContent='Optional manual tools and conceptual demo';advanced.append(summary);host.append(advanced);
for(const selector of ['.drawing-setup','#wallCandidatePanel','#geometryPreview','.model-workspace']){const item=host.querySelector(selector);if(item)advanced.append(item)}
host.querySelector('.section-head p').textContent='Automatic analysis builds supported preliminary geometry and lists unresolved information. Generated geometry is not yet verified for construction.';
host.querySelector('.model-source-note').textContent='Drawings stay on this device · automatic results remain preliminary';
const $=id=>document.getElementById(id),status=$('automaticRoomStatus'),key=room=>'construction-ai-automatic-room-v1:'+room.projectId+':'+room.roomId;
let active=null,starting=false,cycle=0,last='',result=null,scheduled;
function clear(){result=null;$('automaticRoomScene').replaceChildren();$('automaticRoomScene').hidden=true;$('automaticRoomRotation').hidden=true;$('automaticRoomDimensions').textContent='';$('automaticRoomIssues').replaceChildren()}
function render(report){
 clear();result=report;
 for(const issue of report.issues||[]){const li=document.createElement('li');li.textContent=issue.message;$('automaticRoomIssues').append(li)}
 if(report.status!=='preliminary'){status.textContent='Automatic analysis finished with unresolved information. No 3D geometry was generated.';return}
 status.textContent='Preliminary wall shell generated automatically from the saved drawings. Unverified and incomplete.';
 const d=report.clear_dimensions_m;$('automaticRoomDimensions').textContent='Drawing-derived clear dimensions: '+[d.length,d.width,d.height].map(n=>(n/.3048).toFixed(2)+' ft').join(' × ')+' (length × width × height).';
 $('automaticRoomScene').hidden=false;$('automaticRoomRotation').hidden=false;paint();
}
function paint(){
 if(result?.status!=='preliminary')return;
 const svg=$('automaticRoomScene'),ns='http://www.w3.org/2000/svg',faces=[],angle=Number($('automaticRoomYaw').value)*Math.PI/180;
 svg.replaceChildren();
 const boxes=result.walls.map(w=>w.bounds_m),cx=(Math.min(...boxes.map(b=>b[0]))+Math.max(...boxes.map(b=>b[3])))/2,cy=(Math.min(...boxes.map(b=>b[1]))+Math.max(...boxes.map(b=>b[4])))/2;
 const project=([x,y,z])=>{x-=cx;y-=cy;return [(x*Math.cos(angle)-y*Math.sin(angle)),(x*Math.sin(angle)+y*Math.cos(angle))*.4-z*.85]};
 for(const b of boxes){const [x0,y0,z0,x1,y1,z1]=b,c=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
  for(const ids of [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]])faces.push(ids.map(i=>project(c[i])));
 }
 const points=faces.flat(),x0=Math.min(...points.map(p=>p[0])),x1=Math.max(...points.map(p=>p[0])),y0=Math.min(...points.map(p=>p[1])),y1=Math.max(...points.map(p=>p[1])),scale=Math.min(620/(x1-x0),370/(y1-y0));
 for(const points of faces){const polygon=document.createElementNS(ns,'polygon');polygon.setAttribute('points',points.map(([x,y])=>[350+(x-(x0+x1)/2)*scale,225+(y-(y0+y1)/2)*scale].join(',')).join(' '));polygon.setAttribute('fill','#7aa7cf');polygon.setAttribute('fill-opacity','.25');polygon.setAttribute('stroke','#315c82');svg.append(polygon)}
}
$('automaticRoomYaw').oninput=paint;
async function start(force=false){
 if(starting)return;
 starting=true;
 const ticket=cycle;let job;
 $('automaticRoomRetry').disabled=true;status.textContent='Checking saved drawing sources…';
 try{
  const input=await pipeline.capture();if(ticket!==cycle)return;
  if(!input.sources.some(s=>s.kind==='floor')||!input.sources.some(s=>s.kind==='elevation')){clear();status.textContent='Upload the floor plan and matching elevations to start automatic analysis.';return}
  if(!force&&input.fingerprint===last){if(result)render(result);return}
  if(!force){
   let saved;try{saved=JSON.parse(localStorage.getItem(key(input.room))||'null')}catch{}
   if(saved?.fingerprint===input.fingerprint&&saved.report?.version===window.ConstructionAutomaticRoom.version&&saved.report?.status==='preliminary'&&saved.report.walls?.length===4){last=input.fingerprint;render(saved.report);return}
  }
  const accepted=await jobs.exclusive(async()=>{
   if(ticket!==cycle)return;
   job=jobs.create({...input.room,project_id:input.room.projectId,room_id:input.room.roomId,sheet_id:'__automatic_model__'});active=job;
   clear();$('automaticRoomCancel').hidden=false;
   try{
    const report=await job.wait(()=>pipeline.run(input,job,message=>{status.textContent=message}));
    const now=await job.wait(()=>pipeline.capture());
    if(ticket!==cycle||now.fingerprint!==input.fingerprint)throw Error('Drawing sources changed during analysis; the outdated result was discarded.');
    job.assert();render(report);last=input.fingerprint;
    try{localStorage.setItem(key(input.room),JSON.stringify({fingerprint:input.fingerprint,report}))}catch{status.textContent+=' This result could not be saved locally.'}
    job.finish('complete');
   }catch(error){
    job.finish(job.signal.aborted?'cancelled':'failed');
    if(ticket===cycle){clear();status.textContent=job.signal.aborted?'Automatic analysis stopped. Saved corrections remain unchanged.':'Automatic analysis could not complete: '+(error.message||'unknown error');last=''}
   }
  });
  if(accepted===false&&ticket===cycle)status.textContent='Another drawing analysis is running. Automatic room analysis can be retried when it finishes.';
 }catch(e){if(ticket===cycle){clear();status.textContent='Automatic analysis could not start: '+e.message}}
 finally{starting=false;if(active===job)active=null;if(ticket!==cycle){clearTimeout(scheduled);scheduled=setTimeout(()=>void start(),0)}if(ticket===cycle){$('automaticRoomRetry').disabled=false;$('automaticRoomCancel').hidden=true}}
}
$('automaticRoomRetry').onclick=()=>void start(true);
$('automaticRoomCancel').onclick=()=>active?.abort('cancelled','Analysis cancelled');
function changed(){
 ++cycle;last='';clear();active?.abort('stale_source','Drawing sources changed');
 status.textContent='Saved drawings changed. Checking the current room…';$('automaticRoomRetry').disabled=false;$('automaticRoomCancel').hidden=true;
 clearTimeout(scheduled);scheduled=setTimeout(()=>{if(!active)void start()},300);
}
window.addEventListener('construction-3d-enter',()=>void start());
window.addEventListener('construction-model-sources-changed',changed);
window.addEventListener('construction-wall-corrections-changed',changed);
window.addEventListener('storage',event=>{if(event.key?.startsWith('construction-ai-model-workspace-v1')||event.key?.startsWith('construction-ai-wall-candidate-review-v1:')||event.key?.startsWith('construction-ai-traced-walls-v1:')||event.key==='construction-ai-sheet-findings-v1')changed()});
window.addEventListener('construction-room-change',()=>{changed()});
window.addEventListener('construction-scale-source-changed',()=>{++cycle;last='';clear();active?.abort('stale_source','Floor plan changed')});
window.addEventListener('pagehide',()=>active?.abort('interrupted','Page closed'));
if(host.classList.contains('active'))void start();
})();
