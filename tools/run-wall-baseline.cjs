#!/usr/bin/env node
'use strict';
// Reproducible synthetic regression baseline; temporary inputs are removed.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {fixture}=require('../tests/fixtures/wall-benchmark/synthetic.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'construction-ai-baseline-'));
try{
 for(const difficult of [false,true]){
  const {truth,raster}=fixture(difficult),base=path.join(temp,truth.case_id);
  fs.writeFileSync(base+'.json',JSON.stringify(truth));fs.writeFileSync(base+'.pgm',raster);
  const run=spawnSync(process.execPath,[path.join(__dirname,'wall-benchmark.cjs'),
   '--case',base+'.json','--raster',base+'.pgm'],{encoding:'utf8',maxBuffer:1024*1024});
  if(run.error)throw run.error;
  if(run.status!==Number(difficult))throw Error(run.stderr||'Unexpected benchmark exit: '+run.status);
  const report=JSON.parse(run.stdout);
  const expected=difficult?[4,1,1]:[4,0,0];
  const actual=[report.counts.true_positives,report.counts.false_positives,report.counts.false_negatives];
  if(JSON.stringify(actual)!==JSON.stringify(expected))
   throw Error('Baseline changed; review localization/semantic differences: '+JSON.stringify(actual));
  console.log(JSON.stringify(report));
 }
}finally{fs.rmSync(temp,{recursive:true,force:true})}
