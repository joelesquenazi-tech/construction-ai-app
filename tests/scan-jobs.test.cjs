const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../scan-jobs.js'),'utf8');
const scope={sheet_id:'A102',project_id:'project',room_id:'room'};
const source={...scope,sha256:'original',raster_sha256:'raster',page:2,revision:null,width_px:600,height_px:400,filename:'do not journal'};
function setup(){
 const store=new Map(),timers=new Map();
 let now=0,sequence=0,locked=false;
 const globals={window:{},AbortController,crypto:{randomUUID:()=>String(++sequence)},
  performance:{now:()=>now},setTimeout(fn,ms){const id=++sequence;timers.set(id,{fn,at:now+ms});return id},clearTimeout:id=>timers.delete(id),
  localStorage:{getItem:key=>store.get(key)??null,setItem:(key,v)=>store.set(key,v)},
  navigator:{locks:{async request(_key,_opts,fn){if(locked)return fn(null);locked=true;try{return await fn({})}finally{locked=false}}}}};
 vm.runInNewContext(code,globals);
 return {jobs:globals.window.ConstructionScanJobs,store,advance(ms,fire=true){
  now+=ms;if(fire)for(const [id,timer] of timers)if(timer.at<=now){timers.delete(id);timer.fn()}
 }};
}
test('cancel releases a blocked stage and prevents late results reaching the caller',async()=>{
 const {jobs}=setup();
 await jobs.exclusive(async()=>{
  const job=jobs.create(scope);job.source(source);
  let resolve;
  const pending=job.wait(()=>new Promise(r=>{resolve=r}));
  job.abort('cancelled','Scan cancelled');resolve('late result');
  await assert.rejects(pending,{code:'cancelled'});
  job.finish('cancelled');
 });
 assert.equal(jobs.latest(scope).state,'cancelled');
 assert.equal(jobs.latest(scope).source.filename,undefined);
});
test('processing deadline covers suspended timers and excludes the review prompt',async()=>{
 const {jobs,advance}=setup();
 const job=jobs.create(scope);
 advance(100000);job.review(()=>advance(180000));
 advance(19999);assert.equal(await job.wait(()=>42),42);
 advance(1,false);assert.throws(()=>job.stage('saving'),{code:'timed_out'});
 job.finish('timed_out');assert.equal(jobs.latest(scope).state,'timed_out');
});
test('only a free lock can recover a running journal and retry matches exact source version',async()=>{
 const {jobs}=setup();
 await jobs.exclusive(async()=>{
  const job=jobs.create(scope);job.source(source);
  assert.equal(await jobs.exclusive(()=>assert.fail('must not start a second scan')),false);
  assert.equal(jobs.latest(scope).state,'running');
  // Deliberately leave running state behind to simulate abrupt process loss.
 });
 await jobs.exclusive(()=>{});
 const old=jobs.latest(scope);
 assert.equal(old.state,'interrupted');assert.equal(jobs.matchesSource(old,source),true);
 assert.equal(jobs.matchesSource(old,{...source,raster_sha256:'replacement'}),false);
 assert.equal(jobs.matchesSource(old,{...source,room_id:'other room'}),false);
 assert.equal(jobs.matchesSource({...old,version:0},source),false);
});
test('data reset prevents late writes from restoring cleared scan history',async()=>{
 const {jobs,store}=setup();
 const job=jobs.create(scope);job.source(source);
 store.delete(jobs.key);store.set('construction-ai-data-generation-v1','reset');
 assert.throws(()=>job.stage('saving'),{code:'stale_source'});
 job.finish('stale');
 assert.equal(jobs.latest(scope),undefined);
});
