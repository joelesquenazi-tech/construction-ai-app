'use strict';
// Stage 0 evaluation only. Never writes application data or verifies 3D geometry.
const SOURCE_FIELDS=['project_id','room_id','sheet_id','revision','view_id','filename',
 'document_sha256','raster_sha256','page','width','height','coordinate_space'];
const finite=n=>typeof n==='number'&&Number.isFinite(n);
function requireThat(ok,message){if(!ok)throw Error(message)}
function text(s){return typeof s==='string'&&s.trim().length>0&&s.length<=500}
function validateSource(s){
 requireThat(s&&SOURCE_FIELDS.every(k=>Object.hasOwn(s,k)),'Complete source identity required');
 for(const k of ['project_id','room_id','sheet_id','revision','view_id','filename'])
  requireThat(text(s[k]),'Source '+k+' required');
 for(const k of ['document_sha256','raster_sha256'])
  requireThat(typeof s[k]==='string'&&/^[a-f0-9]{64}$/.test(s[k]),'Source '+k+' must be SHA-256');
 requireThat(Number.isSafeInteger(s.page)&&s.page>0,'Source page must be one-based');
 requireThat([s.width,s.height].every(n=>Number.isSafeInteger(n)&&n>0&&n<=100000),
  'Invalid source pixel dimensions');
 requireThat(['original_image_pixels','rendered_pdf_page_pixels'].includes(s.coordinate_space),
  'Unsupported source coordinate space');
}
function validateLines(lines,source,label){
 requireThat(Array.isArray(lines)&&lines.length<=200,label+' must contain at most 200 lines');
 const ids=new Set();
 for(const l of lines){
  requireThat(l&&text(l.id)&&!ids.has(l.id),label+' IDs must be unique');ids.add(l.id);
  const p=l.points_px;
  requireThat(Array.isArray(p)&&p.length===2&&p.every(q=>Array.isArray(q)&&q.length===2&&
   q.every(finite)&&q[0]>=0&&q[0]<source.width&&q[1]>=0&&q[1]<source.height),
   label+' endpoints must be original source pixels inside the image');
  requireThat(Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1])>=1,label+' line is degenerate');
 }
}
function validateCase(c){
 requireThat(c&&c.schema==='construction-ai-wall-benchmark-case-v1'&&text(c.case_id),
  'Unsupported benchmark case schema');
 validateSource(c.source);
 requireThat(['synthetic','private_project'].includes(c.corpus_kind),'Unknown corpus kind');
 requireThat(['complete_view','partial'].includes(c.coverage),'Explicit truth coverage required');
 requireThat(text(c.review?.reviewer)&&text(c.review?.independent_reviewer)&&
  c.review.reviewer.trim()!==c.review.independent_reviewer.trim()&&
  /^\d{4}-\d{2}-\d{2}T/.test(c.review.reviewed_at)&&Number.isFinite(Date.parse(c.review.reviewed_at)),
  'Two distinct reviewers and an ISO review date required');
 validateLines(c.walls,c.source,'Truth walls');validateLines(c.non_walls,c.source,'Truth non-walls');
 requireThat(new Set([...c.walls,...c.non_walls].map(x=>x.id)).size===c.walls.length+c.non_walls.length,
  'Truth IDs must be unique across walls and non-walls');
 requireThat(c.non_walls.every(x=>text(x.reason)),'Non-wall reference reason required');
 const t=c.tolerances;
 requireThat(t&&text(t.rationale)&&finite(t.endpoint_error_px)&&t.endpoint_error_px>0&&
  t.endpoint_error_px<=Math.hypot(c.source.width,c.source.height)&&
  finite(t.angle_error_deg)&&t.angle_error_deg>=0&&t.angle_error_deg<90,
  'Explicit source-specific localization tolerances and rationale required');
 const g=c.targets;
 requireThat(g&&[g.min_precision,g.min_recall].every(n=>finite(n)&&n>0&&n<=1)&&
  Number.isSafeInteger(g.max_non_wall_matches)&&g.max_non_wall_matches>=0,
  'Explicit precision, recall and non-wall targets required');
}
function compareLines(a,b){
 const dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
 const x=a.points_px,y=b.points_px;
 const error=Math.min(Math.max(dist(x[0],y[0]),dist(x[1],y[1])),
  Math.max(dist(x[0],y[1]),dist(x[1],y[0])));
 const dx=x[1][0]-x[0][0],dy=x[1][1]-x[0][1],ex=y[1][0]-y[0][0],ey=y[1][1]-y[0][1];
 return {endpoint_error_px:error,
  angle_error_deg:Math.atan2(Math.abs(dx*ey-dy*ex),Math.abs(dx*ex+dy*ey))*180/Math.PI};
}
function eligible(a,b,t){
 const d=compareLines(a,b);
 return d.endpoint_error_px<=t.endpoint_error_px&&d.angle_error_deg<=t.angle_error_deg;
}
// Maximum-cardinality one-to-one matching: duplicates cannot inflate recall.
// Stable ID order and distance-first adjacency give reproducible ties. This does
// not claim to minimize total error among all maximum-cardinality assignments.
function matchLines(predicted,truth,t){
 const ordered=predicted.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 const refs=truth.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 const adjacent=ordered.map(p=>refs.map((r,i)=>({i,d:compareLines(p,r)}))
  .filter(x=>x.d.endpoint_error_px<=t.endpoint_error_px&&x.d.angle_error_deg<=t.angle_error_deg)
  .sort((a,b)=>a.d.endpoint_error_px-b.d.endpoint_error_px||a.i-b.i).map(x=>x.i));
 const owners=new Map();
 function visit(pi,seen){
  for(const ri of adjacent[pi]){
   if(seen.has(ri))continue;seen.add(ri);
   if(!owners.has(ri)||visit(owners.get(ri),seen)){owners.set(ri,pi);return true}
  }
  return false;
 }
 ordered.forEach((_,i)=>visit(i,new Set()));
 return [...owners].map(([ri,pi])=>({candidate_id:ordered[pi].id,truth_id:refs[ri].id,
  ...compareLines(ordered[pi],refs[ri])})).sort((a,b)=>a.truth_id<b.truth_id?-1:1);
}
function evaluate(c,run){
 validateCase(c);
 requireThat(run&&run.schema==='construction-ai-wall-benchmark-proposals-v1'&&text(run.run_id)&&
  text(run.method),'Unsupported proposal schema or missing run identity');
 validateSource(run.source);
 requireThat(SOURCE_FIELDS.every(k=>run.source[k]===c.source[k]),
  'Source mismatch: do not compare another project, room, sheet, revision, page, view or raster');
 validateLines(run.candidates,c.source,'Automatic candidates');
 requireThat(run.candidates.every(x=>x.origin==='local_image_heuristic'),
  'Benchmark raw automatic output only; manual corrections and reviews must be scored separately');
 const matched=matchLines(run.candidates,c.walls,c.tolerances);
 const hitP=new Set(matched.map(x=>x.candidate_id)),hitT=new Set(matched.map(x=>x.truth_id));
 const falsePositives=run.candidates.filter(x=>!hitP.has(x.id)).map(x=>x.id).sort();
 const missedWalls=c.walls.filter(x=>!hitT.has(x.id)).map(x=>x.id).sort();
 const nonWallMatches=[];
 for(const p of run.candidates)for(const n of c.non_walls)if(eligible(p,n,c.tolerances))
  nonWallMatches.push({candidate_id:p.id,non_wall_id:n.id,reason:n.reason});
 nonWallMatches.sort((a,b)=>(a.candidate_id+'\0'+a.non_wall_id)<(b.candidate_id+'\0'+b.non_wall_id)?-1:1);
 const precision=run.candidates.length?matched.length/run.candidates.length:null;
 const recall=c.walls.length?matched.length/c.walls.length:null;
 const nonWallCount=new Set(nonWallMatches.map(x=>x.candidate_id)).size;
 const conflicts=nonWallMatches.filter(x=>hitP.has(x.candidate_id));
 const targetChecks={precision:precision!==null&&precision>=c.targets.min_precision,
  recall:recall!==null&&recall>=c.targets.min_recall,
  non_walls:nonWallCount<=c.targets.max_non_wall_matches};
 const blockers=[];
 if(c.coverage!=='complete_view')blockers.push('Partial truth cannot establish full-view accuracy');
 if(!c.walls.length)blockers.push('No positive wall truth; recall is undefined');
 if(!run.candidates.length)blockers.push('No automatic candidates; precision is undefined');
 if(conflicts.length)blockers.push('Conflicting wall and non-wall references match the same proposal');
 return {schema:'construction-ai-wall-benchmark-report-v1',case_id:c.case_id,run_id:run.run_id,
  method:run.method,corpus_kind:c.corpus_kind,source:{...c.source},coverage:c.coverage,
  review:{...c.review},tolerances:{...c.tolerances},targets:{...c.targets},
  counts:{truth_walls:c.walls.length,automatic_candidates:run.candidates.length,
   true_positives:matched.length,false_positives:falsePositives.length,false_negatives:missedWalls.length,
   non_wall_candidates:nonWallCount},precision,recall,matches:matched,
  false_positive_ids:falsePositives,missed_wall_ids:missedWalls,non_wall_matches:nonWallMatches,
  max_matched_endpoint_error_px:matched.length?Math.max(...matched.map(x=>x.endpoint_error_px)):null,
  target_checks:targetChecks,blockers,case_pass:blockers.length===0&&Object.values(targetChecks).every(Boolean),
  scope:'2D centerline detection only; no scale, openings, height or model verification',
  stage_0_complete:false,m1_verified:false,real_world_acceptance:false};
}
module.exports={SOURCE_FIELDS,validateSource,validateCase,compareLines,matchLines,evaluate};
