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
 if(!Array.isArray(rows)||!rows.length||rows.length>1800||!rows[0]?.length||rows[0].length>1800||rows.some(r=>!r||r.length!==rows[0].length))throw Error('Expected a bounded rectangular binary raster.');
 const w=rows[0].length,h=rows.length,lines=[];
 for(const axis of ['h','v']){
  const major=axis==='h'?h:w,minor=axis==='h'?w:h;
  for(let fixed=0;fixed<major;fixed++){
   let start=-1,last=-1,gap=0;
   for(let p=0;p<=minor+1;p++){
    const ink=p<minor&&(axis==='h'?rows[fixed][p]:rows[p][fixed]);
    if(ink){if(start<0)start=p;last=p;gap=0}
    else if(start>=0&&++gap>1){
     if(last-start>=11)lines.push({axis,fixed,start,end:last});
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
function associations(box,lines){
 const out=[];
 for(const axis of ['h','v']){
  const start=axis==='h'?box.x:box.y,end=start+(axis==='h'?box.width:box.height);
  const low=axis==='h'?box.y:box.x,high=low+(axis==='h'?box.height:box.width);
  const distance=Math.min(40,Math.max(12,(high-low)*2.5));
  const near=lines.filter(q=>q.axis===axis&&q.fixed>=low-distance&&q.fixed<=high+distance);
  const spans=near.filter(q=>q.start<start-3&&q.end>end+3);
  // A dimension line may be interrupted by its label. Join only two pieces
  // on the same baseline whose gap lies within the label plus a small margin.
  const margin=Math.max(4,Math.min(12,(high-low)*.7));
  const left=near.filter(q=>q.start<start-3&&q.end>=start-margin&&q.end<=(start+end)/2).slice(0,40);
  const right=near.filter(q=>q.end>end+3&&q.start<=end+margin&&q.start>=(start+end)/2).slice(0,40);
  for(const a of left)for(const b of right)if(Math.abs(a.fixed-b.fixed)<=2&&b.start>a.end)
   spans.push({axis,fixed:(a.fixed+b.fixed)/2,start:a.start,end:b.end});
  const perpendicular=lines.filter(q=>q.axis!==axis);
  for(const span of spans){
   if(span.end-span.start<24)continue;
   const witness=endpoint=>perpendicular.filter(q=>Math.abs(q.fixed-endpoint)<=3&&q.start<=span.fixed-3&&q.end>=span.fixed+3&&q.end-q.start>=11)
    .sort((a,b)=>Math.abs(a.fixed-endpoint)-Math.abs(b.fixed-endpoint))[0];
   const a=witness(span.start),b=witness(span.end);
   if(!a||!b||a===b)continue;
   const pts=axis==='h'?[[a.fixed,span.fixed],[b.fixed,span.fixed]]:[[span.fixed,a.fixed],[span.fixed,b.fixed]];
   if(out.some(q=>q.axis===axis&&q.points_px.every((p,i)=>Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1])<=4)))continue;
   out.push({axis,points_px:pts});
   if(out.length>=6)return out;
  }
 }
 return out;
}
function enrich(findings,rows,source){
 if(!Array.isArray(findings)||findings.length>10000||!source||!Number.isSafeInteger(source.width_px)||!Number.isSafeInteger(source.height_px)||source.width_px<1||source.height_px<1)throw Error('Invalid dimension evidence input.');
 const found=segments(rows),sx=source.width_px/rows[0].length,sy=source.height_px/rows.length;
 let count=0;
 return findings.map(f=>{
  const copy={...f,source:{...source}},measurement=parseMeasurement(f.text);
  if(!measurement)return copy;
  const evidence={schema:'site-resolved-dimension-evidence-v1',measurement,
   label_box_px:f.bbox||null,association_status:'unassociated',axis:null,points_px:null,
   alternatives:[],method:'raster_line_witness_intersections',algorithm_version:1,
   analysis_raster:{width_px:rows[0].length,height_px:rows.length},geometry_status:'unverified',issues:[]};
  copy.dimension_evidence=evidence;
  if(!validBox(f.bbox,source.width_px,source.height_px)){evidence.issues.push('missing_or_invalid_text_box');return copy}
  if(++count>250){evidence.issues.push('measurement_limit');return copy}
  if(found.issue){evidence.issues.push(found.issue);return copy}
  const box={x:f.bbox.x/sx,y:f.bbox.y/sy,width:f.bbox.width/sx,height:f.bbox.height/sy};
  const matches=associations(box,found.lines).map(q=>({axis:q.axis,points_px:q.points_px.map(p=>[Number((p[0]*sx).toFixed(3)),Number((p[1]*sy).toFixed(3))])}));
  if(matches.length===1){evidence.association_status='candidate_unverified';evidence.axis=matches[0].axis;evidence.points_px=matches[0].points_px}
  else if(matches.length>1){evidence.association_status='ambiguous';evidence.alternatives=matches.slice(0,5);evidence.issues.push('multiple_plausible_dimension_spans')}
  else evidence.issues.push('no_unique_line_with_two_witness_intersections');
  return copy;
 });
}
return {parseMeasurement,validBox,ocrBox,sameSource,segments,associations,enrich};
});
