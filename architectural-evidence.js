/* Text-supported architectural categories. Label locations are not element extents. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./drawing-view-regions.js'),require('./dimension-evidence.js'));else root.ConstructionArchitecturalEvidence=factory(root.ConstructionDrawingViews,root.ConstructionDimensionEvidence);})(typeof globalThis!=='undefined'?globalThis:this,(views,dimensions)=>{
'use strict';
const rules=[
 ['wall',/\b(?:WALLS?|PARTITIONS?|CMU|DRYWALL)\b/],
 ['door',/\bDOORS?\b/],['window',/\bWINDOWS?\b/],
 ['millwork',/\b(?:MILLWORK|CABINETS?|CABINETRY|COUNTERTOPS?|SHELVES|SHELVING|VANIT(?:Y|IES))\b/],
 ['ceiling',/\b(?:CEILINGS?|SOFFITS?|COVES?|BULKHEADS?)\b/],
 ['finish',/\b(?:FINISH(?:ES)?|PAINT|STONE|MARBLE|TILE|VENEER|WALLPAPER)\b/]
];
function classify(text){
 const t=String(text||'').trim().toUpperCase();
 if(!t||t.length>1000)return {categories:[],kind:'unknown'};
 if(dimensions.parseMeasurement(t))return {categories:['dimension'],kind:'dimension_text'};
 if(views.titleType(t)!=='unknown')return {categories:['view_title'],kind:'view_title'};
 const categories=rules.filter(([,re])=>re.test(t)).map(([name])=>name);
 const reference=/\b(?:SEE|REFER TO|PER DETAIL|PER SCHEDULE)\b/.test(t);
 const negative=/\b(?:NO|NOT|OMIT|REMOVE|EXISTING|DEMOLISH)\b/.test(t);
 return {categories,kind:categories.length?'architectural_note':'unknown',reference_only:reference,condition_requires_interpretation:negative};
}
function analyze(regions,findings,source){
 const assignments=views.associate(regions,findings,source);
 const evidence=findings.map((f,i)=>({finding_id:f.id,...classify(f.text),source:{...source},label_bbox:f.bbox?{...f.bbox}:null,
  region_ids:assignments[i].region_ids,ownership:assignments[i].status,status:'unverified_text_evidence',element_geometry:null}));
 return {version:1,evidence,regions:regions.map(r=>{
  const items=evidence.filter(e=>e.ownership==='candidate_unverified'&&e.region_ids[0]===r.id);
  const category_counts={};for(const e of items)for(const c of e.categories)category_counts[c]=(category_counts[c]||0)+1;
  return {region_id:r.id,category_counts,unknown_text_count:items.filter(e=>e.kind==='unknown').length,geometry_ready:false};
 }),geometry_ready:false};
}
function leaders(rows,regions,findings,source){
 const report=analyze(regions,findings,source),segments=dimensions.segments(rows);
 const notes=report.evidence.filter(e=>e.kind==='architectural_note'&&e.ownership==='candidate_unverified'&&!e.reference_only&&!e.condition_requires_interpretation);
 if(segments.issue||segments.lines.length>12000||notes.length>256)return {links:[],limited:true,geometry_ready:false};
 const sx=source.width_px/rows[0].length,sy=source.height_px/rows.length;
 const inside=(p,b)=>p[0]>=b.x&&p[0]<=b.x+b.width&&p[1]>=b.y&&p[1]<=b.y+b.height;
 const links=notes.map(note=>{
  const box=note.label_bbox,region=regions.find(r=>r.id===note.region_ids[0]),paths=[];
  segments.lines.forEach((line,i)=>{
   if(line.end-line.start<20)return;
   const a=line.axis==='h'?[line.start*sx,line.fixed*sy]:[line.fixed*sx,line.start*sy];
   const b=line.axis==='h'?[line.end*sx,line.fixed*sy]:[line.fixed*sx,line.end*sy];
   if(!inside(a,region.bbox)||!inside(b,region.bbox))return;
   let near,far;
   if(line.axis==='h'&&a[1]>=box.y&&a[1]<=box.y+box.height){
    if(a[0]>=box.x+box.width&&a[0]-(box.x+box.width)<=6*sx){near=a;far=b}
    else if(b[0]<=box.x&&box.x-b[0]<=6*sx){near=b;far=a}
   }else if(line.axis==='v'&&a[0]>=box.x&&a[0]<=box.x+box.width){
    if(a[1]>=box.y+box.height&&a[1]-(box.y+box.height)<=6*sy){near=a;far=b}
    else if(b[1]<=box.y&&box.y-b[1]<=6*sy){near=b;far=a}
   }
   if(!near)return;
   // Crossing another text box cannot establish a leader attachment.
   const blocked=findings.some(f=>f.id!==note.finding_id&&dimensions.validBox(f.bbox,source.width_px,source.height_px)&&
    (line.axis==='h'?a[1]>=f.bbox.y&&a[1]<=f.bbox.y+f.bbox.height&&b[0]>=f.bbox.x&&a[0]<=f.bbox.x+f.bbox.width:
     a[0]>=f.bbox.x&&a[0]<=f.bbox.x+f.bbox.width&&b[1]>=f.bbox.y&&a[1]<=f.bbox.y+f.bbox.height));
   if(!blocked)paths.push({segment_id:'stroke-'+i,points_px:[near,far],endpoint_px:far});
  });
  return {finding_id:note.finding_id,region_id:region.id,source:{...source},paths,
   status:paths.length===1?'candidate_unverified':paths.length?'ambiguous':'unresolved',target_element_id:null};
 });
 for(const link of links)if(link.paths.some(p=>links.some(other=>other!==link&&other.paths.some(q=>q.segment_id===p.segment_id))))link.status='ambiguous';
 return {links,limited:false,geometry_ready:false,limitations:['Straight horizontal/vertical strokes only; arrowheads, bent leaders and target elements are not resolved.']};
}
return {version:2,classify,analyze,leaders};
});
