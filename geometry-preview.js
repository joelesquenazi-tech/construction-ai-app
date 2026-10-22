/* Batch 3.4: read-only 3D preview of manually traced, calibrated wall solids.
 * This independent browser renderer is NOT the Python geometry kernel and is NOT source verification. */
(()=>{'use strict';
const root=document.getElementById('model3d');if(!root||!window.constructionAITraceSource)return;
const KEY='construction-ai-traced-walls-v1:',NS='http://www.w3.org/2000/svg',FT=.3048;
const section=document.createElement('section');section.id='geometryPreview';section.className='geometry-preview';
section.innerHTML='<div class="model-view-head"><b>Traced geometry preview</b><span>Unverified · manual wall traces</span></div><p>This separate preview uses your saved wall centerlines and assumed wall thickness/height. It is not the conceptual room, the Python OBJ, or an elevation-verified model.</p><button id="geometryPreviewRefresh" type="button">Generate preview from saved traces</button><p id="geometryPreviewStatus" role="status">No geometry preview generated.</p><svg id="geometryPreviewScene" role="img" aria-label="Three-dimensional preview of manually traced wall geometry" viewBox="0 0 700 450"></svg><div id="geometryPreviewLegend"></div>';
const workspace=root.querySelector('.model-workspace');workspace?.insertAdjacentElement('beforebegin',section);
const $=id=>document.getElementById(id),finite=n=>typeof n==='number'&&Number.isFinite(n);
function validate(src,rec){
 if(!src.file||!src.elevations?.length)throw Error('Floor plan and elevations are required.');
 if(!rec||rec.floor_name!==src.floorName||!rec.walls?.length)throw Error('No wall traces for the current floor plan.');
 const c=src.calibration,cc=rec.crossCheck;
 if(!c||c.method!=='two-point-manual'||c.points?.length!==2||!(c.feet>0))throw Error('Two-point primary calibration required.');
 if(!cc||cc.points_px?.length!==2||!(cc.distance>0))throw Error('Independent scale check required.');
 const a=c.points.map(p=>[p.x,p.y]),b=cc.points_px;
 if([...a.flat(),...b.flat()].some(n=>!finite(n)))throw Error('Calibration contains invalid points.');
 const p=Math.hypot(a[1][0]-a[0][0],a[1][1]-a[0][1]),q=Math.hypot(b[1][0]-b[0][0],b[1][1]-b[0][1]);
 if(!(p>0&&q>0)||Math.abs(q*c.feet/p-cc.distance)/cc.distance>0.02)throw Error('Independent scale check failed (2% provisional threshold).');
 if(JSON.stringify(rec.calibration)!==JSON.stringify(c))throw Error('Traces were saved under a different calibration. Reopen tracing and recheck.');
 return c.feet*FT/p;
}
function solids(src,rec,scale){
 const all=[];
 for(const w of rec.walls){
  if(!w.id||w.verification!=='assumption'||!w.evidence_id||!rec.drawing?.sheet||!rec.drawing?.revision)throw Error('Wall is missing ID, source evidence or assumption status.');
  const a=w.start_px,b=w.end_px;
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==2||b.length!==2||[...a,...b].some(n=>!finite(n)))throw Error('Invalid wall coordinates.');
  const dx=(b[0]-a[0])*scale,dy=(b[1]-a[1])*scale;
  const len=Math.hypot(dx,dy),thickness=w.thickness*FT,height=w.height*FT;
  if(!(len>0&&thickness>0&&height>0)||![thickness,height].every(finite))throw Error('Invalid wall dimensions.');
  if(Math.min(Math.abs(dx),Math.abs(dy))>1e-6)throw Error('Diagonal wall '+w.id+' not yet supported by Python engine. No partial preview generated.');
  const x0=a[0]*scale,y0=a[1]*scale,x1=b[0]*scale,y1=b[1]*scale;
  let minX,maxX,minY,maxY;
  if(Math.abs(dy)<1e-6){minX=Math.min(x0,x1);maxX=Math.max(x0,x1);minY=y0-thickness/2;maxY=y0+thickness/2}
  else{minX=x0-thickness/2;maxX=x0+thickness/2;minY=Math.min(y0,y1);maxY=Math.max(y0,y1)}
  const openings=(w.openings||[]).map(o=>({along_m:o.along*FT,width_m:o.width*FT,sill_m:o.sill*FT,height_m:o.height*FT}));const horizontal=Math.abs(dy)<1e-6,direction=horizontal?Math.sign(dx):Math.sign(dy);const base={id:w.id,bounds:[minX,minY,0,maxX,maxY,height],length:len,height,openings,horizontal,direction};const pieces=window.ConstructionWallGeometry.partition(base);all.push({id:w.id,bounds:base.bounds,solids:pieces,sheet:rec.drawing.sheet,revision:rec.drawing.revision,evidence:w.evidence_id,length:len,openingCount:openings.length});
 }
 return all;
}
function polygon(svg,pts,fill,stroke){const p=document.createElementNS(NS,'polygon');p.setAttribute('points',pts.map(x=>x.join(',')).join(' '));p.setAttribute('fill',fill);p.setAttribute('stroke',stroke);p.setAttribute('stroke-width','1.1');svg.appendChild(p)}
function render(items){
 const svg=$('geometryPreviewScene');svg.replaceChildren();
 const xs=items.flatMap(i=>[i.bounds[0],i.bounds[3]]),ys=items.flatMap(i=>[i.bounds[1],i.bounds[4]]),zs=items.map(i=>i.bounds[5]);
 const center=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2],span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys),Math.max(...zs),.1);
 const unit=290/span,project=(x,y,z)=>[350+((x-center[0])-(y-center[1]))*.76*unit,290+((x-center[0])+(y-center[1]))*.36*unit-z*.72*unit];
 const faces=[];
 for(const item of items)for(const solid of item.solids){const [x0,y0,z0,x1,y1,z1]=solid;
 const corners=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
 for(const [indices,color] of [[[0,1,5,4],'#aec5da'],[[1,2,6,5],'#9bb5cb'],[[2,3,7,6],'#c5d6e6'],[[3,0,4,7],'#b6cce0'],[[4,5,6,7],'#e3ecf4']]){
 const depth=indices.reduce((sum,j)=>sum+corners[j][0]+corners[j][1]+corners[j][2]*.01,0)/indices.length;
 faces.push({depth,points:indices.map(j=>project(...corners[j])),color});
 }}
 faces.sort((a,b)=>a.depth-b.depth);
 for(const f of faces)polygon(svg,f.points,f.color,'#4e7595');
 const label=$('geometryPreviewLegend');label.replaceChildren();
 for(const item of items){const row=document.createElement('p');row.textContent=item.id+' · '+(item.length/FT).toFixed(2)+' ft centerline · '+item.sheet+' / '+item.revision+' · '+item.openingCount+' opening(s) · assumption';label.appendChild(row)}
}
async function refresh(){
 const svg=$('geometryPreviewScene');svg.replaceChildren();$('geometryPreviewLegend').replaceChildren();
 try{const src=await window.constructionAITraceSource(),rec=JSON.parse(localStorage.getItem(KEY+src.scope)||'null');const scale=validate(src,rec),items=solids(src,rec,scale);render(items);$('geometryPreviewStatus').textContent=items.length+' traced wall(s) rendered locally from calibrated dimensions. Unverified assumptions; rectangular openings shown, but no ceilings or elevations reconciled.'}
 catch(e){$('geometryPreviewStatus').textContent='Preview unavailable: '+e.message}
}
$('geometryPreviewRefresh').addEventListener('click',refresh);
window.addEventListener('construction-room-change',()=>{$('geometryPreviewScene').replaceChildren();$('geometryPreviewLegend').replaceChildren();$('geometryPreviewStatus').textContent='Room changed. Generate a new preview for this room.'});
})();