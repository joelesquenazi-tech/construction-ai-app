#!/usr/bin/env node
'use strict';
// Local filesystem only. No network, telemetry, application storage, or uploads.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {detectWallCandidates}=require('../wall-proposals.js');
const {evaluate,validateCase}=require('./wall-benchmark-core.cjs');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function readLimited(file,max){
 const fd=fs.openSync(file,'r');
 try{
  const size=fs.fstatSync(fd).size;
  if(size>max)throw Error('Input exceeds supported size: '+file);
  const bytes=Buffer.alloc(size);let read=0;
  while(read<size){const n=fs.readSync(fd,bytes,read,size-read,null);if(!n)throw Error('Input changed while reading');read+=n}
  return bytes;
 }finally{fs.closeSync(fd)}
}
function readPGM(bytes){
 let offset=0;
 const white=n=>[9,10,13,32].includes(n);
 function token(){
  while(offset<bytes.length){
   if(white(bytes[offset])){offset++;continue}
   if(bytes[offset]===35){while(offset<bytes.length&&bytes[offset]!==10)offset++;continue}
   break;
  }
  const start=offset;
  while(offset<bytes.length&&!white(bytes[offset])&&bytes[offset]!==35)offset++;
  if(start===offset)throw Error('Invalid PGM header');
  return bytes.subarray(start,offset).toString('ascii');
 }
 const magic=token(),w=token(),h=token(),max=token();
 if(magic!=='P5'||!/^\d+$/.test(w)||!/^\d+$/.test(h)||max!=='255')
  throw Error('Use binary P5 PGM with max value 255');
 const width=Number(w),height=Number(h);
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>2600||height>2600)
  throw Error('Benchmark raster must be 1..2600 pixels per side; no silent resizing');
 if(!white(bytes[offset]))throw Error('Missing PGM raster separator');
 // Exactly one separator (CRLF counted as one). Raster bytes may themselves be
 // whitespace or # and must NEVER be consumed as further header whitespace.
 if(bytes[offset]===13&&bytes[offset+1]===10)offset+=2;else offset++;
 if(bytes.length-offset!==width*height)throw Error('PGM raster byte count does not match dimensions');
 const rows=Array.from({length:height},(_,y)=>Uint8Array.from(
  bytes.subarray(offset+y*width,offset+(y+1)*width),v=>v<192?1:0));
 return {width,height,rows};
}
function runBenchmark(args){
 const allowed=new Set(['--case','--raster','--proposals','--document','--output']);
 const opts={};
 for(let i=0;i<args.length;i+=2){
  const key=args[i];
  if(!allowed.has(key)||!args[i+1]||args[i+1].startsWith('--')||Object.hasOwn(opts,key))
   throw Error('Usage: node tools/wall-benchmark.cjs --case truth.json [--raster drawing.pgm] [--proposals raw.json] [--document original.pdf] [--output report.json]');
  opts[key]=args[i+1];
 }
 if(!opts['--case']||(!opts['--raster']&&!opts['--proposals']))
  throw Error('Provide --case and --raster and/or --proposals');
 const c=JSON.parse(readLimited(opts['--case'],1024*1024).toString('utf8'));validateCase(c);
 let proposals,sourceChecks={raster_bytes_verified:false,document_bytes_verified:false};
 if(opts['--raster']){
  const bytes=readLimited(opts['--raster'],8*1024*1024),pgm=readPGM(bytes);
  if(hash(bytes)!==c.source.raster_sha256||pgm.width!==c.source.width||pgm.height!==c.source.height)
   throw Error('Raster checksum/dimensions mismatch: stale or wrong drawing');
  sourceChecks.raster_bytes_verified=true;
  if(c.source.document_sha256===hash(bytes))sourceChecks.document_bytes_verified=true;
  if(!opts['--proposals']){
   const result=detectWallCandidates(pgm.rows);
   proposals={schema:'construction-ai-wall-benchmark-proposals-v1',run_id:'local-raster:'+hash(bytes),
    method:'wall-proposals.js default parameters; grayscale <192; no resizing',
    source:{...c.source},candidates:result.candidates};
  }
 }
 if(opts['--proposals'])proposals=JSON.parse(readLimited(opts['--proposals'],1024*1024).toString('utf8'));
 if(opts['--document']){
  if(hash(readLimited(opts['--document'],40*1024*1024))!==c.source.document_sha256)
   throw Error('Original document checksum mismatch');
  sourceChecks.document_bytes_verified=true;
 }
 const report=evaluate(c,proposals);
 report.source_checks=sourceChecks;
 report.implementation={
  evaluator_sha256:hash(fs.readFileSync(require.resolve('./wall-benchmark-core.cjs'))),
  runner_sha256:hash(fs.readFileSync(__filename)),
  detector_sha256:opts['--proposals']?null:hash(fs.readFileSync(require.resolve('../wall-proposals.js'))),
  input_mode:opts['--proposals']?'supplied_raw_proposals':'local_raster_detector'
 };
 // JSON-only supplied proposals carry declared source identities, not proven bytes.
 if(!sourceChecks.raster_bytes_verified||!sourceChecks.document_bytes_verified){
  report.blockers.push('Original document and raster bytes have not both been verified by this run');
  report.case_pass=false;
 }
 const output=JSON.stringify(report,null,2)+'\n';
 // Exclusive create prevents overwriting originals, ground truth or prior reports.
 if(opts['--output'])fs.writeFileSync(opts['--output'],output,{flag:'wx',mode:0o600});
 else process.stdout.write(output);
 return report.case_pass?0:1;
}
if(require.main===module){
 try{process.exitCode=runBenchmark(process.argv.slice(2))}
 catch(e){console.error('Benchmark error: '+e.message);process.exitCode=2}
}
module.exports={hash,readPGM,runBenchmark};
