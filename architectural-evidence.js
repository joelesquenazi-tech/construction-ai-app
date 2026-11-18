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
return {version:1,classify,analyze};
});
