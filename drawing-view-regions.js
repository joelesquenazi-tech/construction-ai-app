/* Proposed view regions only: whitespace does not prove architectural ownership. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ConstructionDrawingViews=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const valid=(b,w,h)=>b&&[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=w&&b.y+b.height<=h;
const contains=(a,b)=>b.x>=a.x&&b.y>=a.y&&b.x+b.width<=a.x+a.width&&b.y+b.height<=a.y+a.height;
function classify(text){
 const t=String(text||'').toUpperCase(),types=[];
 for(const [type,re] of [['rcp',/\b(?:RCP|REFLECTED CEILING PLAN)\b/],['plan',/\bFLOOR PLAN\b/],['elevation',/\bELEVATIONS?\b/],['section',/\bSECTION\b/],['detail',/\bDETAIL\b/],['schedule',/\bSCHEDULE\b/]])if(re.test(t))types.push(type);
 return types.length===1?types[0]:'unknown';
}
function propose(rows,source){
 const h=rows?.length,w=rows?.[0]?.length;
 if(!Array.isArray(rows)||!w||!h||w>2400||h>2400||w*h>4200000||rows.some(r=>r.length!==w))throw Error('Expected bounded rectangular raster');
 if(!source||typeof source.sha256!=='string'||!source.sha256||!Number.isInteger(source.page)||source.page<1||!Number.isFinite(source.width_px)||!Number.isFinite(source.height_px)||source.width_px<=0||source.height_px<=0)throw Error('Source identity and dimensions required');
 // Suppress only thin, almost page-spanning margin lines in a private copy.
 // Original pixels remain available to wall/dimension extraction.
 const original=rows,copy=rows.map(r=>Uint8Array.from(r)),suppressed=[];
 for(const axis of ['x','y']){
  const major=axis==='x'?w:h,minor=axis==='x'?h:w,eligible=[];
  for(let k=0;k<major;k++){
   if(k>major*.08&&k<major*.8)continue;
   let count=0;for(let j=0;j<minor;j++)if(original[axis==='x'?j:k][axis==='x'?k:j])count++;
   if(count>=minor*.85)eligible.push(k);
  }
  for(let i=0;i<eligible.length;){let end=i+1;while(end<eligible.length&&eligible[end]===eligible[end-1]+1)end++;
   if(end-i<=4)for(let n=i;n<end;n++){const k=eligible[n];suppressed.push({axis,index:k});for(let j=0;j<minor;j++)copy[axis==='x'?j:k][axis==='x'?k:j]=0}
   i=end;
  }
 }
 rows=copy;
 const regions=[],minGap=Math.max(8,Math.ceil(Math.min(w,h)*.015));
 function split(b,depth){
  let x0=b.x+b.width,y0=b.y+b.height,x1=-1,y1=-1;
  for(let y=b.y;y<b.y+b.height;y++)for(let x=b.x;x<b.x+b.width;x++)if(rows[y][x]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
  if(x1<0)return;
  b={x:x0,y:y0,width:x1-x0+1,height:y1-y0+1};
  if(depth<4){
   let best=null;
   for(const axis of ['x','y']){
    const length=axis==='x'?b.width:b.height;let start=-1;
    for(let i=0;i<=length;i++){
     let ink=false;
     if(i<length)for(let j=0;j<(axis==='x'?b.height:b.width);j++)if(rows[b.y+(axis==='y'?i:j)][b.x+(axis==='x'?i:j)]){ink=true;break}
     if(!ink&&i<length){if(start<0)start=i;continue}
     if(start>=0){const gap=i-start;
      if(gap>=minGap&&start>=(axis==='y'?4:24)&&length-i>=(axis==='y'?4:24)&&(!best||gap>best.gap))best={axis,start,end:i,gap};start=-1;
     }
    }
   }
   if(best){const a={...b},c={...b};if(best.axis==='x'){a.width=best.start;c.x+=best.end;c.width-=best.end}else{a.height=best.start;c.y+=best.end;c.height-=best.end}split(a,depth+1);split(c,depth+1);return}
  }
  const sx=source.width_px/w,sy=source.height_px/h;
  regions.push({id:'region-'+regions.length,bbox:{x:b.x*sx,y:b.y*sy,width:b.width*sx,height:b.height*sy},source:{...source},status:'candidate_unverified',method:'whitespace',type:'unknown'});
 }
 split({x:0,y:0,width:w,height:h},0);
 return {version:2,regions,segmentation_only_suppressed_lines:suppressed,issues:['Whitespace regions may split one view or combine multiple views; semantic validation is required before geometry.']};
}
function associate(regions,findings,source){
 if(!Array.isArray(regions)||regions.length>64||!Array.isArray(findings)||findings.length>2500)throw Error('View evidence limit exceeded');
 for(const r of regions)if(!valid(r.bbox,source.width_px,source.height_px)||!r.source||['sha256','page','width_px','height_px'].some(k=>r.source[k]!==source[k]))throw Error('Invalid or stale view region');
 return findings.map(f=>{
  const matches=valid(f.bbox,source.width_px,source.height_px)?regions.filter(r=>contains(r.bbox,f.bbox)):[];
  return {finding_id:f.id,region_ids:matches.map(r=>r.id),status:matches.length===1?'candidate_unverified':matches.length?'ambiguous':'unassigned',title_type:classify(f.text)};
 });
}
// Only complete title-shaped labels qualify. References in prose are not titles.
function titleType(text){
 const t=String(text||'').trim().toUpperCase().replace(/\s+/g,' ');
 if(t.length>100||/\b(?:SEE|REFER|PER|MATCH|TYPICAL|SHOWN|ON|BY)\b/.test(t))return 'unknown';
 if(!/^(?:[A-Z0-9][A-Z0-9 '&/().-]* )?(?:REFLECTED CEILING PLAN|FLOOR PLAN|RCP|ELEVATIONS?|SECTION|DETAIL|SCHEDULE)(?: [A-Z0-9.-]+)?$/.test(t))return 'unknown';
 return classify(t);
}
// Detached title links are layout proposals, not proof of view ownership.
function detachedTitles(regions,findings,source){
 const assignments=associate(regions,findings,source),links=[];
 findings.forEach((f,index)=>{
  const type=titleType(f.text),t=f.bbox,a=assignments[index];
  if(type==='unknown'||!valid(t,source.width_px,source.height_px)||a.status==='ambiguous')return;
  const own=regions.find(r=>r.id===a.region_ids[0]);
  // A short text strip may be split from its graphic. A title already inside
  // a substantial graphic region does not need a detached association.
  if(own&&own.bbox.height>t.height*3)return;
  const matches=regions.filter(r=>{
   const b=r.bbox,gap=t.y-(b.y+b.height);
   if(r===own||b.height<t.height*4||b.width<t.width||gap<0||gap>Math.min(source.height_px*.06,t.height*6))return false;
   if(t.x<b.x||t.x+t.width>b.x+b.width)return false;
   const aligned=Math.abs(t.x-b.x)<=t.height*2||Math.abs(t.x+t.width/2-(b.x+b.width/2))<=t.height*2;
   if(!aligned)return false;
   // Do not leap over another region between the graphic and its caption.
   return !regions.some(o=>o!==r&&o!==own&&o.bbox.y<t.y&&o.bbox.y+o.bbox.height>b.y+b.height&&o.bbox.x<t.x+t.width&&o.bbox.x+o.bbox.width>t.x);
  });
  links.push({finding_id:f.id,type,bbox:{...t},region_ids:matches.map(r=>r.id),status:matches.length===1?'candidate_unverified':matches.length?'ambiguous':'unassigned',method:'below_aligned_title',source:{...source}});
 });
 // Multiple candidate captions for a graphic cannot establish its identity.
 for(const link of links)if(link.status==='candidate_unverified'&&links.some(other=>other!==link&&other.region_ids.includes(link.region_ids[0])))link.status='ambiguous';
 return links;
}
function analyze(rows,findings,source){
 const proposal=propose(rows,source),assignments=associate(proposal.regions,findings,source);
 const regions=proposal.regions.map(region=>{
  const titles=[];
  assignments.forEach((a,i)=>{
   if(a.status==='candidate_unverified'&&a.region_ids[0]===region.id){
    const type=titleType(findings[i].text);
    if(type!=='unknown')titles.push({finding_id:findings[i].id,type,bbox:{...findings[i].bbox}});
   }
  });
  // Two labels of the same type can still be two views in one region.
  return {...region,type:titles.length===1?titles[0].type:'unknown',title_evidence:titles,
   issues:titles.length===1?['Region boundaries require semantic validation']:titles.length?['Multiple view titles in one region']:['No unambiguous contained view title']};
 });
 return {...proposal,regions,assignments,detached_title_links:detachedTitles(regions,findings,source),geometry_ready:false};
}
return {version:4,propose,associate,classify,titleType,detachedTitles,analyze};
});
