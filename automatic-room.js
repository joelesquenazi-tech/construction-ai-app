/* Narrow automatic room reconstruction. Paired lines alone never establish walls.
 * Requires one labeled, closed orthogonal room, matching clear-inside dimensions
 * in two axes, and a consistent explicit room/ceiling height on named elevations.
 * Produces an UNVERIFIED shell, not complete architectural geometry. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./dimension-evidence.js'):root.ConstructionDimensionEvidence);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.ConstructionAutomaticRoom=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(dim){
 'use strict';
 const version=1,normal=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 const finite=Number.isFinite,near=(a,b,t=3)=>Math.abs(a-b)<=t;
 const unresolved=(code,message)=>({version,status:'unresolved',walls:[],issues:[{code,message}]});
 function validLine(c){return ['h','v'].includes(c?.axis)&&c.points_px?.length===2&&c.points_px.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite))&&finite(c.apparent_width_px)&&c.apparent_width_px>=3&&c.apparent_width_px<=100}
 function line(c){const [a,b]=c.points_px;return {...c,fixed:c.axis==='h'?a[1]:a[0],lo:Math.min(...[a,b].map(p=>p[c.axis==='h'?0:1])),hi:Math.max(...[a,b].map(p=>p[c.axis==='h'?0:1]))}}
 function rectangles(candidates){
  const all=candidates.filter(validLine).map(line),h=all.filter(c=>c.axis==='h'),v=all.filter(c=>c.axis==='v'),out=[];
  for(let i=0;i<h.length;i++)for(let j=i+1;j<h.length;j++)for(let k=0;k<v.length;k++)for(let l=k+1;l<v.length;l++){
   const [top,bottom]=[h[i],h[j]].sort((a,b)=>a.fixed-b.fixed),[left,right]=[v[k],v[l]].sort((a,b)=>a.fixed-b.fixed);
   if(right.fixed-left.fixed<60||bottom.fixed-top.fixed<60)continue;
   if(![top,bottom].every(w=>near(w.lo,left.fixed,left.apparent_width_px+3)&&near(w.hi,right.fixed,right.apparent_width_px+3))||
      ![left,right].every(w=>near(w.lo,top.fixed,top.apparent_width_px+3)&&near(w.hi,bottom.fixed,bottom.apparent_width_px+3)))continue;
   const inner=[left.fixed+left.apparent_width_px/2,top.fixed+top.apparent_width_px/2,right.fixed-right.apparent_width_px/2,bottom.fixed-bottom.apparent_width_px/2];
   const selected=[top,right,bottom,left];
   if(all.some(c=>!selected.includes(c)&&c.points_px.every(([x,y])=>x>inner[0]+3&&x<inner[2]-3&&y>inner[1]+3&&y<inner[3]-3)))continue;
   out.push({top,bottom,left,right,inner,selected});
  }
  return out;
 }
 function inside(box,r){return box&&[box.x,box.y,box.width,box.height].every(finite)&&box.width>0&&box.height>0&&box.x>r[0]&&box.y>r[1]&&box.x+box.width<r[2]&&box.y+box.height<r[3]}
 function scaleFor(rect,findings){
  const [x0,y0,x1,y1]=rect.inner,scales=[];
  for(const f of findings){
   const e=f.dimension_evidence,m=dim.parseMeasurement(f.text);
   if(!m||e?.association_status!=='candidate_unverified'||e.issues?.length||e.points_px?.length!==2||e.endpoint_evidence?.length!==2)continue;
   const [a,b]=e.points_px;if(![a,b].every(p=>Array.isArray(p)&&p.length===2&&p.every(finite)))continue;
   const axis=e.axis,index=axis==='h'?0:1,low=Math.min(a[index],b[index]),high=Math.max(a[index],b[index]);
   let accepted=false;
   if(axis==='h')accepted=near(low,x0)&&near(high,x1)&&near(a[1],b[1])&&Math.min(Math.abs(a[1]-y0),Math.abs(a[1]-y1))<.35*(y1-y0);
   if(axis==='v')accepted=near(low,y0)&&near(high,y1)&&near(a[0],b[0])&&Math.min(Math.abs(a[0]-x0),Math.abs(a[0]-x1))<.35*(x1-x0);
   if(accepted)scales.push({axis,metres_per_pixel:m.metres/(high-low),finding_id:f.id,points_px:e.points_px,metres:m.metres});
  }
  if(!['h','v'].every(axis=>scales.some(s=>s.axis===axis)))return null;
  const mean=scales.reduce((n,s)=>n+s.metres_per_pixel,0)/scales.length;
  if(!(mean>.00002&&mean<.1)||scales.some(s=>Math.abs(s.metres_per_pixel/mean-1)>.02))return {conflict:true};
  return {metres_per_pixel:mean,evidence:scales,verification:'unverified',check:'orthogonal_dimension_agreement',tolerance:.02};
 }
 function heightFor(label,elevations){
  const notes=[];
  for(const page of elevations){
   if(!page.findings.some(f=>normal(f.text)===label||normal(f.text)===label+' ELEVATION'))return {error:'Elevation room labels do not uniquely match the floor-plan room.'};
   for(const f of page.findings){
    const match=String(f.text).trim().match(/^(?:CEILING HEIGHT|ROOM HEIGHT)\s*[:=]?\s*(.+?)(?:\s+AFF)?$/i);
    if(!match)continue;
    const m=dim.parseMeasurement(match[1]);
    if(!m||m.metres<1.8||m.metres>8)return {error:'An explicit height note is outside this first supported range or cannot be read.'};
    notes.push({metres:m.metres,finding_id:f.id,source:page.source,box_px:f.bbox});
   }
  }
  if(!notes.length)return {error:'No explicit room or ceiling-height note was found on the matching elevations.'};
  if(notes.some(n=>Math.abs(n.metres-notes[0].metres)>.003))return {error:'The elevation height notes disagree. No uniform-height shell was generated.'};
  return {metres:notes[0].metres,evidence:notes,verification:'unverified'};
 }
 function build({floor,elevations,roomName='',hasCorrections=false}){
  if(hasCorrections)return unresolved('corrections','Saved wall corrections require reconciliation before automatic geometry can be regenerated. They have been kept.');
  if(!floor?.source||!Array.isArray(floor.findings)||!Array.isArray(floor.candidates)||!elevations?.length)return unresolved('sources','A floor plan and matching elevations are needed for automatic reconstruction.');
  if(floor.candidates.length>36||floor.findings.length>2500||elevations.length>8)return unresolved('scope_limit','This drawing set exceeds the first automatic room-analysis limits.');
  const labels=floor.findings.filter(f=>normal(f.text)===normal(roomName)||/\b(?:ROOM|BEDROOM|BATHROOM|BATH|KITCHEN|OFFICE|TREATMENT|GYM|LOBBY|DINING|LIVING|CLOSET|GARAGE|LAUNDRY)\b/.test(normal(f.text)));
  const rooms=[];let conflicts=false;
  for(const rect of rectangles(floor.candidates)){
   const names=labels.filter(f=>inside(f.bbox,rect.inner));if(names.length!==1)continue;
   const scale=scaleFor(rect,floor.findings);if(scale?.conflict){conflicts=true;continue}if(!scale)continue;
   rooms.push({rect,scale,label:normal(names[0].text),labelEvidence:names[0].id});
  }
  if(conflicts)return unresolved('scale_conflict','Dimensions associated with the room disagree in scale. No geometry was generated.');
  if(rooms.length!==1)return unresolved(rooms.length?'multiple_rooms':'unsupported_footprint',rooms.length?'More than one dimensioned room fits this sheet. Room/view ownership is unresolved.':'The engine could not establish one closed rectangular room with matching inside dimensions in both directions. Automatic support for this layout is still incomplete.');
  const {rect,scale,label,labelEvidence}=rooms[0],height=heightFor(label,elevations);
  if(height.error)return unresolved('height',height.error);
  const m=scale.metres_per_pixel,[ix,iy,ax,ay]=rect.inner;
  const thicknesses=rect.selected.map(w=>w.apparent_width_px*m);
  if(thicknesses.some(t=>t<.06||t>.65))return unresolved('wall_width','Detected parallel-line spacing is outside the supported wall-width range.');
  const walls=rect.selected.map((w,i)=>{
   const [p,q]=w.points_px,t=w.apparent_width_px/2;
   const bounds=w.axis==='h'?[rect.left.fixed, w.fixed-t,0,rect.right.fixed,w.fixed+t,height.metres/m]:[w.fixed-t,rect.top.fixed,0,w.fixed+t,rect.bottom.fixed,height.metres/m];
   return {id:'auto-wall-'+i,origin:'automatic',verification:'unverified',bounds_m:bounds.map(n=>n*m),
    evidence:{source:floor.source,points_px:[p,q],width_px:w.apparent_width_px,room_label:labelEvidence,scale:scale.evidence,height:height.evidence}};
  });
  return {version,status:'preliminary',room:label,source:floor.source,scale,height,walls,
   clear_dimensions_m:{length:(ax-ix)*m,width:(ay-iy)*m,height:height.metres},
   issues:[{code:'shell_only',message:'Preliminary wall shell only. Doors, windows, ceiling details and finishes have not been reconstructed.'},
    {code:'assumption',message:'Wall identity and continuation to the stated room/ceiling height are provisional interpretations. This model is not verified for construction.'}]};
 }
 return {version,build};
});
