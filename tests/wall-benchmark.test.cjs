'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {evaluate,matchLines,compareLines,validateCase,SOURCE_FIELDS}=require('../tools/wall-benchmark-core.cjs');
const {readPGM}=require('../tools/wall-benchmark.cjs');
const {fixture}=require('./fixtures/wall-benchmark/synthetic.cjs');
const {detectWallCandidates}=require('../wall-proposals.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function pair(){
 const c=fixture().truth;
 const run={schema:'construction-ai-wall-benchmark-proposals-v1',run_id:'test-run',method:'synthetic proposals',
  source:copy(c.source),candidates:c.walls.map(x=>({...copy(x),origin:'local_image_heuristic'}))};
 return [c,run];
}
test('actual detector baseline counts clean room and known false-positive/diagonal failures honestly',()=>{
 for(const difficult of [false,true]){
  const {truth,raster}=fixture(difficult),{rows}=readPGM(raster);
  const run={schema:'construction-ai-wall-benchmark-proposals-v1',run_id:'detector',method:'default actual detector',
   source:copy(truth.source),candidates:detectWallCandidates(rows).candidates};
  const r=evaluate(truth,run);
  assert.deepEqual([r.counts.true_positives,r.counts.false_positives,r.counts.false_negatives],
   difficult?[4,1,1]:[4,0,0]);
  assert.equal(r.case_pass,!difficult);
  if(difficult){assert.equal(r.precision,.8);assert.equal(r.recall,.8);
   assert.deepEqual(r.missed_wall_ids,['diagonal']);assert.equal(r.non_wall_matches[0].non_wall_id,'dimension-pair')}
  assert.equal(r.stage_0_complete,false);assert.equal(r.m1_verified,false);assert.equal(r.real_world_acceptance,false);
 }
});
test('duplicate proposals count as false positives, reversed endpoints preserve localization, inputs stay unchanged',()=>{
 const [c,run]=pair();run.candidates.push({...copy(run.candidates[0]),id:'duplicate'});
 run.candidates[0].points_px.reverse();const snapshot=JSON.stringify([c,run]);
 const r=evaluate(c,run);assert.equal(r.counts.true_positives,4);assert.equal(r.counts.false_positives,1);
 assert.equal(r.recall,1);assert.equal(r.precision,.8);assert.equal(JSON.stringify([c,run]),snapshot);
 assert.equal(r.max_matched_endpoint_error_px,0);
});
test('maximum-cardinality matching avoids a nearest-first greedy undercount and is order invariant',()=>{
 const line=(id,y)=>({id,points_px:[[10,y],[100,y]]});
 const truth=[line('t0',10),line('t1',14)],pred=[line('p0',11),line('p1',8)];
 const t={endpoint_error_px:3,angle_error_deg:1};
 const matches=matchLines(pred,truth,t);assert.equal(matches.length,2);
 assert.deepEqual(matchLines(pred.slice().reverse(),truth.slice().reverse(),t),matches);
 assert.equal(matches.find(x=>x.truth_id==='t0').candidate_id,'p1');
});
test('one-to-one matcher cardinality agrees with exhaustive assignment on small generated cases',()=>{
 let seed=37;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32};
 const line=(id,y)=>({id,points_px:[[10,y],[100,y]]});
 for(let trial=0;trial<100;trial++){
  const predicted=Array.from({length:4},(_,i)=>line('p'+i,Math.floor(rand()*20)));
  const truth=Array.from({length:4},(_,i)=>line('t'+i,Math.floor(rand()*20)));
  function exhaustive(i,used){
   if(i===predicted.length)return 0;
   let best=exhaustive(i+1,used);
   truth.forEach((ref,j)=>{
    if(!used.has(j)&&compareLines(predicted[i],ref).endpoint_error_px<=3){
     const next=new Set(used);next.add(j);best=Math.max(best,1+exhaustive(i+1,next));
    }
   });return best;
  }
  assert.equal(matchLines(predicted,truth,{endpoint_error_px:3,angle_error_deg:0}).length,
   exhaustive(0,new Set()));
 }
});
test('long, short, angled and shifted lines cannot earn credit merely by crossing a wall',()=>{
 const [c,run]=pair();const original=copy(run.candidates[0]);
 for(const points of [[[35,35],[100,35]],[[5,35],[350,35]],[[35,37],[220,65]],[[35,42],[220,42]]]){
  run.candidates=[{...original,points_px:points}];const r=evaluate(c,run);
  assert.equal(r.counts.true_positives,0);assert.equal(r.counts.false_positives,1);assert.equal(r.recall,0);
 }
 const d=compareLines({points_px:[[0,0],[10,10]]},{points_px:[[10,10],[0,0]]});
 assert.equal(d.endpoint_error_px,0);assert.ok(d.angle_error_deg<1e-10);
});
test('every source identity field is isolated, including checksum, revision, view, page and coordinates',()=>{
 const [c,run]=pair();
 for(const field of SOURCE_FIELDS){const bad=copy(run);
  bad.source[field]=typeof bad.source[field]==='number'?bad.source[field]+1:
   field.endsWith('sha256')?'a'.repeat(64):field==='coordinate_space'?'rendered_pdf_page_pixels':bad.source[field]+'-other';
  assert.throws(()=>evaluate(c,bad),/Source mismatch/);
 }
});
test('missing truth, partial coverage and contradictory reference labels cannot silently pass',()=>{
 const [c,run]=pair();c.coverage='partial';assert.equal(evaluate(c,run).case_pass,false);
 c.coverage='complete_view';c.non_walls=[{...copy(c.walls[0]),id:'ambiguous',reason:'Conflicting label'}];
 assert.ok(evaluate(c,run).blockers.some(x=>x.includes('Conflicting')));
 c.non_walls=[];c.walls=[];const noTruth=evaluate(c,run);assert.equal(noTruth.recall,null);assert.equal(noTruth.case_pass,false);
 run.candidates=[];assert.equal(evaluate(c,run).precision,null);assert.equal(evaluate(c,run).case_pass,false);
});
test('rejects manual corrections, duplicate IDs, missing tolerances and malformed/out-of-bounds truth',()=>{
 const [c,run]=pair();run.candidates[0].origin='manual_correction';
 assert.throws(()=>evaluate(c,run),/manual corrections/);
 for(const mutate of [x=>delete x.tolerances,x=>x.tolerances.endpoint_error_px=NaN,
  x=>x.targets.min_recall=0,x=>x.review.independent_reviewer=x.review.reviewer,
  x=>x.review.reviewed_at='2026-99-99T00:00:00Z',x=>x.walls[0].points_px[0][0]=-1,
  x=>x.walls[0].points_px[0][0]=x.source.width,x=>x.walls[0].points_px=[[1,1],[1,1]],
  x=>x.walls.push(copy(x.walls[0])),x=>x.source.width=Infinity]){
  const bad=copy(c);mutate(bad);assert.throws(()=>validateCase(bad));
 }
});
test('binary PGM parser preserves whitespace/# raster bytes, validates size, rejects unsupported encodings',()=>{
 for(const newline of ['\n','\r\n']){
  const bytes=Buffer.concat([Buffer.from(`P5${newline}# source${newline}3 1${newline}255${newline}`),Buffer.from([10,35,255])]);
  assert.deepEqual([...readPGM(bytes).rows[0]],[1,1,0]);
 }
 for(const header of ['P2\n2 1\n255\n00','P5\n2601 1\n255\n','P5\n2 1\n65535\n00','P5\n2 1\n255\n0'])
  assert.throws(()=>readPGM(Buffer.from(header)));
});
test('private CLI works offline, verifies bytes, never overwrites inputs, distinguishes failed gate and invalid data',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wall-benchmark-test-'));
 try{
  const {truth,raster}=fixture(),caseFile=path.join(temp,'truth.json'),image=path.join(temp,'room.pgm');
  fs.writeFileSync(caseFile,JSON.stringify(truth));fs.writeFileSync(image,raster);
  const cli=path.resolve(__dirname,'../tools/wall-benchmark.cjs');
  const exec=(extra=[])=>spawnSync(process.execPath,['--require',path.join(temp,'no-network.cjs'),cli,
   '--case',caseFile,'--raster',image,...extra],{encoding:'utf8'});
  fs.writeFileSync(path.join(temp,'no-network.cjs'),
   "const deny=()=>{throw Error('Network forbidden')};global.fetch=deny;for(const m of ['http','https']){require(m).request=deny;require(m).get=deny}const net=require('net');net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;require('tls').connect=deny;for(const k of ['lookup','resolve'])require('dns')[k]=deny;");
  let r=exec();assert.ifError(r.error);assert.equal(r.status,0,r.stderr);const report=JSON.parse(r.stdout);
  assert.deepEqual(report.source_checks,{raster_bytes_verified:true,document_bytes_verified:true});
  assert.match(report.implementation.detector_sha256,/^[a-f0-9]{64}$/);
  const original=fs.readFileSync(caseFile);r=exec(['--output',caseFile]);assert.equal(r.status,2);
  assert.deepEqual(fs.readFileSync(caseFile),original);
  const output=path.join(temp,'report.json');assert.equal(exec(['--output',output]).status,0);
  assert.equal(fs.statSync(output).mode&0o777,0o600);
  const [c,run]=pair();fs.writeFileSync(path.join(temp,'proposals.json'),JSON.stringify(run));
  const supplied=exec(['--proposals',path.join(temp,'proposals.json'),'--document',image]);
  assert.equal(supplied.status,0,supplied.stderr);
  assert.equal(JSON.parse(supplied.stdout).implementation.input_mode,'supplied_raw_proposals');
  fs.writeFileSync(path.join(temp,'wrong-source.pdf'),'Wrong document');
  const wrong=exec(['--document',path.join(temp,'wrong-source.pdf')]);
  assert.equal(wrong.status,2);assert.match(wrong.stderr,/Original document checksum mismatch/);
  const only=spawnSync(process.execPath,[cli,'--case',caseFile,'--proposals',path.join(temp,'proposals.json')],{encoding:'utf8'});
  assert.equal(only.status,1);assert.equal(JSON.parse(only.stdout).case_pass,false);
  const hard=fixture(true);fs.writeFileSync(caseFile,JSON.stringify(hard.truth));fs.writeFileSync(image,hard.raster);
  assert.equal(exec().status,1);fs.appendFileSync(image,'tampered');r=exec();assert.equal(r.status,2);
  assert.match(r.stderr,/byte count|checksum/);assert.equal(r.stdout,'');
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
});
