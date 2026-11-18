const test=require('node:test'),assert=require('node:assert/strict'),v=require('../drawing-view-regions.js');
const source={sha256:'test',page:1,width_px:400,height_px:200};
function raster(){const r=Array.from({length:100},()=>new Uint8Array(200));for(const [a,b] of [[10,80],[115,190]])for(let y=10;y<90;y++)for(let x=a;x<b;x++)r[y][x]=1;return r}
test('separates two spaced regions and retains source coordinate transforms',()=>{const p=v.propose(raster(),source);assert.equal(p.regions.length,2);assert.deepEqual(p.regions[0].bbox,{x:20,y:20,width:140,height:160});assert.equal(p.regions[1].source.page,1);assert(p.regions.every(r=>r.status==='candidate_unverified'))});
test('dimensions crossing regions are unassigned, never borrowed from nearest view',()=>{const p=v.propose(raster(),source);const a=v.associate(p.regions,[{id:'inside',bbox:{x:30,y:30,width:20,height:10}},{id:'cross',bbox:{x:150,y:30,width:100,height:10}}],source);assert.equal(a[0].region_ids[0],'region-0');assert.equal(a[1].status,'unassigned')});
test('overlapping ownership remains ambiguous and stale sources fail',()=>{const p=v.propose(raster(),source),r=p.regions[0];assert.equal(v.associate([r,{...r,id:'other'}],[{bbox:{x:30,y:30,width:20,height:10}}],source)[0].status,'ambiguous');assert.throws(()=>v.associate([r],[],{...source,sha256:'revised'}))});
test('blank, connected and dense sheets are never declared verified views',()=>{assert.equal(v.propose(Array.from({length:100},()=>new Uint8Array(200)),source).regions.length,0);const r=raster();r[50].fill(1);const p=v.propose(r,source);assert.equal(p.regions.length,1);assert.equal(p.regions[0].type,'unknown');assert(p.issues.length)});
test('labels distinguish RCP, plan and mixed labels without guessing',()=>{assert.equal(v.classify('TREATMENT REFLECTED CEILING PLAN'),'rcp');assert.equal(v.classify('TREATMENT FLOOR PLAN'),'plan');assert.equal(v.classify('PLAN'),'unknown');assert.equal(v.classify('SECTION AND DETAIL'),'unknown')});
test('bounds and resource limits reject invalid input',()=>{assert.throws(()=>v.propose([[1],[1,0]],source));assert.throws(()=>v.propose(raster(),{...source,page:0}));const p=v.propose(raster(),source);assert.equal(v.associate(p.regions,[{bbox:{x:-1,y:3,width:10,height:2}}],source)[0].status,'unassigned')});
test('recognizes separate contained plan and elevation titles without changing geometry eligibility',()=>{
 const findings=[{id:'p',text:'TREATMENT FLOOR PLAN',bbox:{x:30,y:30,width:100,height:10}},{id:'e',text:'TREATMENT ELEVATION',bbox:{x:240,y:30,width:100,height:10}}];
 const before=JSON.stringify(findings),r=v.analyze(raster(),findings,source);
 assert.deepEqual(r.regions.map(x=>x.type),['plan','elevation']);assert.equal(r.geometry_ready,false);assert.equal(r.regions[0].title_evidence[0].finding_id,'p');assert.equal(JSON.stringify(findings),before);
});
test('references, outside labels and multiple same-type titles do not select a view',()=>{
 for(const text of ['SEE FLOOR PLAN','REFER TO SECTION 2','AS SHOWN ON ELEVATION','DIMENSIONS PER FLOOR PLAN'])assert.equal(v.titleType(text),'unknown');
 const findings=[{id:'a',text:'FLOOR PLAN',bbox:{x:30,y:30,width:90,height:10}},{id:'b',text:'FLOOR PLAN',bbox:{x:30,y:60,width:90,height:10}},{id:'c',text:'SECTION',bbox:{x:180,y:30,width:20,height:10}}];
 const r=v.analyze(raster(),findings,source);assert.equal(r.regions[0].type,'unknown');assert.equal(r.regions[0].title_evidence.length,2);assert.equal(r.assignments[2].status,'unassigned');
});
test('actual automatic worker produces diagnostic view evidence on raster fallback',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');let result,closed=false;
 const context=vm.createContext({self:null,postMessage:r=>{result=r},close:()=>{closed=true}});context.self=context;
 context.importScripts=(...files)=>{for(const f of files)vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),context)};
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../automatic-room-worker.js'),'utf8'),context);
 await context.onmessage({data:{rows:raster(),source,findings:[{id:'label',text:'FLOOR PLAN',bbox:{x:30,y:30,width:100,height:10}}]}});
 assert.equal(result.error,undefined);assert.equal(result.viewAnalysis.regions[0].type,'plan');assert.equal(result.viewAnalysis.geometry_ready,false);assert(closed);
});
const region=(id,x=20,y=10,width=160,height=100)=>({id,bbox:{x,y,width,height},source});
const caption=(id='title',x=20,y=115,text='TREATMENT FLOOR PLAN')=>({id,text,bbox:{x,y,width:100,height:10}});
test('links a detached left-aligned title below one graphic with provenance',()=>{
 const regions=[region('plan'),region('caption',20,115,100,10)],findings=[caption()];
 const before=JSON.stringify({regions,findings}),links=v.detachedTitles(regions,findings,source);
 assert.equal(links[0].status,'candidate_unverified');assert.deepEqual(links[0].region_ids,['plan']);assert.equal(links[0].source.sha256,'test');assert.equal(JSON.stringify({regions,findings}),before);
});
test('detached captions do not cross intervening content or attach to distant views',()=>{
 assert.equal(v.detachedTitles([region('plan'),region('block',20,111,100,3)],[caption()],source)[0].status,'unassigned');
 assert.equal(v.detachedTitles([region('plan')],[caption('far',20,160)],source)[0].status,'unassigned');
 assert.equal(v.detachedTitles([region('plan')],[caption('offset',190)],source)[0].status,'unassigned');
});
test('competing detached captions and overlapping graphics stay ambiguous',()=>{
 const links=v.detachedTitles([region('plan')],[caption('a'),caption('b',20,120,'TREATMENT ELEVATION')],source);assert(links.every(x=>x.status==='ambiguous'));
 assert.equal(v.detachedTitles([region('a'),region('b')],[caption()],source)[0].status,'ambiguous');
});
test('contained titles and prose references cannot become detached captions',()=>{
 assert.equal(v.detachedTitles([region('plan')],[caption('inside',20,40)],source).length,0);
 assert.equal(v.detachedTitles([region('plan')],[caption('ref',20,115,'SEE FLOOR PLAN')],source).length,0);
 assert.throws(()=>v.detachedTitles([region('plan')],[caption()],{...source,page:2}));
});
test('raster-to-analysis pipeline links a separately segmented title strip',()=>{
 const rows=Array.from({length:300},()=>new Uint8Array(400));
 for(let y=10;y<160;y++)rows[y].fill(1,10,160);
 for(let y=170;y<180;y++)rows[y].fill(1,10,110);
 const r=v.analyze(rows,[{id:'title',text:'TREATMENT FLOOR PLAN',bbox:{x:20,y:340,width:200,height:20}}],{...source,width_px:800,height_px:600});
 assert.equal(r.regions.length,2);assert.equal(r.detached_title_links[0].status,'candidate_unverified');assert.deepEqual(r.detached_title_links[0].region_ids,['region-0']);assert.equal(r.geometry_ready,false);
});
