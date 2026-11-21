/* Unverified measurement readings and conservative raster line associations.
 * No calibration, construction geometry, or review decisions are changed here.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ConstructionDimensionEvidence=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const ANALYSIS_LIMITS=Object.freeze({maxSide:2400,maxPixels:4200000});
function analysisSize(width,height){
 if(![width,height].every(n=>Number.isSafeInteger(n)&&n>0&&n<=200000))throw Error('Invalid source image dimensions.');
 const scale=Math.min(1,ANALYSIS_LIMITS.maxSide/Math.max(width,height),Math.sqrt(ANALYSIS_LIMITS.maxPixels/(width*height)));
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
const fractions={'¼':'1/4','½':'1/2','¾':'3/4','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8'};
const amount='(?:\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|\\d+(?:\\.\\d+)?)';
function number(s){
 if(!s)return 0;
 const m=s.trim().match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/);
 if(!m)return Number(s);
 const denominator=Number(m[3]),numerator=Number(m[2]);
 if(![2,4,8,16,32,64].includes(denominator)||numerator>=denominator)return NaN;
 return Number(m[1]||0)+numerator/denominator;
}
function parseMeasurement(label){
 if(typeof label!=='string'||label.length>120)return null;
 const text=label.trim().replace(/[′’]/g,"'").replace(/[″“”]/g,'"')
  .replace(/[¼½¾⅛⅜⅝⅞]/g,(f,offset,s)=>(offset&&/\d/.test(s[offset-1])?' ':'')+fractions[f]);
 let metres,system;
 const metric=text.match(/^(\d+(?:\.\d+)?)\s*(mm|cm|m)$/i);
 const feet=text.match(new RegExp('^(\\d+(?:\\.\\d+)?)\\s*(?:\'|ft|feet|foot)(?:\\s*-?\\s*('+amount+')\\s*(?:"|in|inch|inches))?$','i'));
 const inches=text.match(new RegExp('^('+amount+')\\s*(?:"|in|inch|inches)$','i'));
 if(metric){metres=Number(metric[1])*({mm:.001,cm:.01,m:1})[metric[2].toLowerCase()];system='metric'}
 else if(feet){
  const ft=Number(feet[1]),inch=number(feet[2]);
  if(inch>=12||(feet[2]&&!Number.isInteger(ft)))return null;
  metres=(ft*12+inch)*.0254;system='imperial';
 }else if(inches){metres=number(inches[1])*.0254;system='imperial'}
 else return null;
 if(!finite(metres)||metres<=0||metres>1000)return null;
 return {label:label.trim(),metres:Number(metres.toFixed(10)),system,reading_status:'unverified'};
}
function validBox(b,w,h){
 return !!b&&[b.x,b.y,b.width,b.height].every(finite)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=w+.01&&b.y+b.height<=h+.01;
}
function ocrBox(b){
 if(!b||![b.x0,b.y0,b.x1,b.y1].every(finite)||b.x0<0||b.y0<0||b.x1<=b.x0||b.y1<=b.y0)return null;
 return {x:b.x0,y:b.y0,width:b.x1-b.x0,height:b.y1-b.y0};
}
function sameSource(a,b){
 return !!a&&!!b&&['sha256','raster_sha256','filename','sheet_id','page','revision','project_id','room_id','width_px','height_px']
  .every(k=>a[k]!==undefined&&a[k]===b[k]);
}
function segments(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>ANALYSIS_LIMITS.maxSide||!rows[0]?.length||rows[0].length>ANALYSIS_LIMITS.maxSide||rows.length*rows[0].length>ANALYSIS_LIMITS.maxPixels||rows.some(r=>!r||r.length!==rows[0].length))throw Error('Expected a bounded rectangular binary raster.');
 const w=rows[0].length,h=rows.length,lines=[];
 for(const axis of ['h','v']){
  const major=axis==='h'?h:w,minor=axis==='h'?w:h;
  for(let fixed=0;fixed<major;fixed++){
   let start=-1,last=-1,gap=0;
   for(let p=0;p<=minor+1;p++){
    const ink=p<minor&&(axis==='h'?rows[fixed][p]:rows[p][fixed]);
    if(ink){if(start<0)start=p;last=p;gap=0}
    else if(start>=0&&++gap>1){
     if(last-start>=7)lines.push({axis,fixed,start,end:last});
     start=-1;last=-1;gap=0;
    }
   }
   if(lines.length>12000)return {lines:[],issue:'dense_linework'};
  }
 }
 const merged=[];
 for(const line of lines){
  // Group neighboring pixels of the same stroke, preserving its center.
  let previous;
  for(let j=merged.length-1;j>=0;j--){
   const q=merged[j];
   if(q.axis!==line.axis||line.fixed-q.last>2)break;
   if(Math.abs(q.start-line.start)<=3&&Math.abs(q.end-line.end)<=3){previous=q;break}
  }
  if(previous){previous.fixed=(previous.fixed*previous.count+line.fixed)/(previous.count+1);previous.count++;previous.last=line.fixed;previous.start=Math.max(previous.start,line.start);previous.end=Math.min(previous.end,line.end)}
  else merged.push({...line,count:1,last:line.fixed});
 }
 return merged.length>3000?{lines:[],issue:'dense_linework'}:{lines:merged,issue:null};
}
function pointOn(axis,along,across){return axis==='h'?[along,across]:[across,along]}
function clusterMarkers(markers){
 const groups=[];
 for(const marker of markers.sort((a,b)=>a.along-b.along)){
  const group=groups.at(-1);
  if(group&&marker.along-group.at(-1).along<=2)group.push(marker);else groups.push([marker]);
 }
 return groups.map(group=>{
  const ticks=group.filter(m=>m.kind==='diagonal_tick'),preferred=ticks.length?ticks:group;
  const ordered=preferred.map(m=>m.along).sort((a,b)=>a-b),mid=(ordered.length-1)/2;
  return {along:(ordered[Math.floor(mid)]+ordered[Math.ceil(mid)])/2,
   kinds:[...new Set(group.map(m=>m.kind))],orientations:[...new Set(ticks.map(m=>m.orientation))],
   resolution:ticks.length?(ticks.every(m=>m.compact)?'compact_pixel_mark':'multi_pixel_diagonal'):'witness_intersection'};
 });
}
function terminalMarkers(span,context){
 const {lines,rows,boxes,cache,budget}=context;
 const key=[span.axis,span.fixed,span.start,span.end,span.count||1].join(':');
 if(cache.has(key))return cache.get(key);
 const perpendicular=lines.filter(q=>q.axis!==span.axis),markers=[];
 const crosses=(q,p)=>Math.abs(q.fixed-p)<=3&&q.start<=span.fixed-3&&q.end>=span.fixed+3&&q.end-q.start>=11;
 for(const end of [span.start,span.end]){
  const crossing=perpendicular.filter(q=>crosses(q,end)).sort((a,b)=>Math.abs(a.fixed-end)-Math.abs(b.fixed-end))[0];
  if(crossing)markers.push({along:crossing.fixed,kind:'witness_intersection'});
 }
 if(rows){
  const horizontal=span.axis==='h',length=horizontal?rows[0].length:rows.length;
  const ink=(along,across)=>horizontal?!!rows[Math.round(across)]?.[Math.round(along)]:!!rows[Math.round(along)]?.[Math.round(across)];
  const textMask=new Uint8Array(length),crossWidths=new Uint16Array(length);
  for(const b of boxes){
   const low=horizontal?b.y:b.x,high=low+(horizontal?b.height:b.width);
   if(span.fixed<low-.5||span.fixed>high+.5)continue;
   const begin=(horizontal?b.x:b.y)-.5,end=begin+(horizontal?b.width:b.height)+1;
   textMask.fill(1,Math.max(0,Math.ceil(begin)),Math.min(length,Math.floor(end)+1));
  }
  for(const q of perpendicular)if(q.start<span.fixed&&q.end>span.fixed)
   for(let p=Math.max(0,Math.ceil(q.fixed-2));p<=Math.min(length-1,Math.floor(q.fixed+2));p++)crossWidths[p]=Math.max(crossWidths[p],q.count||1);
  for(let p=Math.max(0,Math.floor(span.start)-2);p<=span.end+2;p++){
   if(++budget.used>1000000){budget.exhausted=true;return []}
   if(textMask[p])continue;
   // Probe beyond both the baseline and any perpendicular stroke width. A
   // rectangular crossing alone must not masquerade as a diagonal slash.
   const crossingWidth=crossWidths[p]||0;
   const offset=Math.max(2,Math.ceil((span.count||1)/2)+1,Math.ceil(crossingWidth/2)+1);
   let positive=false,negative=false;
   for(const orientation of [1,-1])for(const ratio of [1,.5,2]){
    const delta=Math.max(Math.round(ratio*offset),Math.ceil(crossingWidth/2)+1);
    const far=ink(p-delta,span.fixed-orientation*offset)&&ink(p+delta,span.fixed+orientation*offset);
    if(!far)continue;
    const middle=Math.max(1,offset-1),step=Math.max(1,Math.round(ratio*middle));
    if(!ink(p-step,span.fixed-orientation*middle)||!ink(p+step,span.fixed+orientation*middle))continue;
    // Long diagonal hatch strokes are not local endpoint ticks.
    const beyond=Math.max(10,offset*3),reach=Math.round(ratio*beyond);
    if(ink(p-reach,span.fixed-orientation*beyond)||ink(p+reach,span.fixed+orientation*beyond))continue;
    if(orientation===1)positive=true;else negative=true;
   }
   let compact=false;
   if(!positive&&!negative&&(span.count||1)===1&&crossingWidth<=1){
    // Tiny source marks may resolve to only one off-baseline pixel per side.
    // Keep this weaker support explicit; it never verifies scale or geometry.
    positive=ink(p-1,span.fixed-1)&&ink(p+1,span.fixed+1)&&!ink(p-5,span.fixed-5)&&!ink(p+5,span.fixed+5);
    negative=ink(p-1,span.fixed+1)&&ink(p+1,span.fixed-1)&&!ink(p-5,span.fixed+5)&&!ink(p+5,span.fixed-5);
    compact=positive!==negative;
   }
   if(positive!==negative)markers.push({along:p,kind:'diagonal_tick',orientation:positive?1:-1,compact});
  }
 }
 const result=clusterMarkers(markers);
 cache.set(key,result);return result;
}
function associations(box,lines,context={lines,rows:null,boxes:[],measurements:[],cache:new Map(),budget:{used:0,exhausted:false}}){
 const out=[];
 for(const axis of ['h','v']){
  const start=axis==='h'?box.x:box.y,end=start+(axis==='h'?box.width:box.height);
  const low=axis==='h'?box.y:box.x,high=low+(axis==='h'?box.height:box.width);
  const distance=Math.min(40,Math.max(12,(high-low)*2.5)),labelMargin=Math.max(.75,Math.min(3,(end-start)*.15));
  const near=lines.filter(q=>q.axis===axis&&q.fixed>=low-distance&&q.fixed<=high+distance);
  const spans=near.filter(q=>q.start<start-labelMargin&&q.end>end+labelMargin);
  const margin=Math.max(4,Math.min(12,(high-low)*.7));
  const left=near.filter(q=>q.start<start-labelMargin&&q.end>=start-margin&&q.end<=(start+end)/2).slice(0,40);
  const right=near.filter(q=>q.end>end+labelMargin&&q.start<=end+margin&&q.start>=(start+end)/2).slice(0,40);
  for(const a of left)for(const b of right)if(Math.abs(a.fixed-b.fixed)<=2&&b.start>a.end)
   spans.push({axis,fixed:(a.fixed+b.fixed)/2,start:a.start,end:b.end,count:Math.max(a.count||1,b.count||1)});
  for(const span of spans){
   const markers=terminalMarkers(span,context);if(context.budget.exhausted)return [];
   const tickCount=markers.filter(m=>m.kinds.includes('diagonal_tick')).length;
   if(tickCount>=6){
    const supporting=context.measurements.filter(b=>{
     const from=axis==='h'?b.x:b.y,to=from+(axis==='h'?b.width:b.height),across=axis==='h'?b.y:b.x;
     return from>=span.start&&to<=span.end&&Math.abs(across-span.fixed)<=40;
    }).length;
    if(supporting<Math.ceil((tickCount-1)/2))continue;
   }
   // Only consecutive supported endpoints may delimit a chain member. Never
   // stretch a short member onto the entire baseline across internal ticks.
   for(let i=0;i<markers.length-1;i++){
    const a=markers[i],b=markers[i+1],ticks=a.kinds.includes('diagonal_tick')&&b.kinds.includes('diagonal_tick');
    if(a.along>=start-labelMargin||b.along<=end+labelMargin||b.along-a.along<(ticks?5:24))continue;
    if(ticks&&!a.orientations.some(sign=>b.orientations.includes(sign)))continue;
    const pts=[pointOn(axis,a.along,span.fixed),pointOn(axis,b.along,span.fixed)];
    if(out.some(q=>q.axis===axis&&q.points_px.every((p,j)=>Math.hypot(p[0]-pts[j][0],p[1]-pts[j][1])<=2)))continue;
    out.push({axis,points_px:pts,endpoint_evidence:[a,b].map((m,j)=>({kinds:m.kinds,resolution:m.resolution,point_px:pts[j]}))});
    if(out.length>=6)return out;
   }
  }
 }
 return out;
}
function enrich(findings,rows,source){
 if(!Array.isArray(findings)||findings.length>10000||!source||!Number.isSafeInteger(source.width_px)||!Number.isSafeInteger(source.height_px)||source.width_px<1||source.height_px<1)throw Error('Invalid dimension evidence input.');
 const found=segments(rows),sx=source.width_px/rows[0].length,sy=source.height_px/rows.length;
 const scaled=b=>({x:b.x/sx,y:b.y/sy,width:b.width/sx,height:b.height/sy});
 const context={lines:found.lines,rows,boxes:findings.filter(f=>validBox(f.bbox,source.width_px,source.height_px)).map(f=>scaled(f.bbox)),
  measurements:findings.filter(f=>parseMeasurement(f.text)&&validBox(f.bbox,source.width_px,source.height_px)).map(f=>scaled(f.bbox)),
  cache:new Map(),budget:{used:0,exhausted:false}};
 let count=0;
 return findings.map(f=>{
  const copy={...f,source:{...source}},measurement=parseMeasurement(f.text);
  if(!measurement)return copy;
  const evidence={schema:'site-resolved-dimension-evidence-v1',measurement,
   label_box_px:f.bbox||null,association_status:'unassociated',axis:null,points_px:null,
   alternatives:[],endpoint_evidence:[],method:'raster_line_endpoint_markers',algorithm_version:2,
   analysis_raster:{width_px:rows[0].length,height_px:rows.length},geometry_status:'unverified',issues:[]};
  copy.dimension_evidence=evidence;
  if(!validBox(f.bbox,source.width_px,source.height_px)){evidence.issues.push('missing_or_invalid_text_box');return copy}
  if(++count>250){evidence.issues.push('measurement_limit');return copy}
  if(found.issue){evidence.issues.push(found.issue);return copy}
  const box=scaled(f.bbox),original=p=>[Number((p[0]*sx).toFixed(3)),Number((p[1]*sy).toFixed(3))];
  const matches=associations(box,found.lines,context).map(q=>({...q,points_px:q.points_px.map(original),endpoint_evidence:q.endpoint_evidence.map(e=>({...e,point_px:original(e.point_px)}))}));
  if(matches.length===1){evidence.association_status='candidate_unverified';evidence.axis=matches[0].axis;evidence.points_px=matches[0].points_px;evidence.endpoint_evidence=matches[0].endpoint_evidence;if(evidence.endpoint_evidence.some(e=>e.resolution==='compact_pixel_mark'))evidence.issues.push('compact_endpoint_marks_require_review')}
  else if(matches.length>1){evidence.association_status='ambiguous';evidence.alternatives=matches.slice(0,5);evidence.issues.push('multiple_plausible_dimension_spans')}
  else evidence.issues.push(context.budget.exhausted?'endpoint_search_limit':'no_unique_span_with_supported_end_markers');
  return copy;
 });
}
return {ANALYSIS_LIMITS,analysisSize,parseMeasurement,validBox,ocrBox,sameSource,segments,associations,enrich};
});
