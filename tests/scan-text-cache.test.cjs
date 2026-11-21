const test=require('node:test'),assert=require('node:assert/strict');
const create=require('../scan-text-cache.js');
const source={sha256:'original',raster_sha256:'raster',project_id:'p',room_id:'r',sheet_id:'s',page:1,revision:'A',width_px:100,height_px:200};
const data={lines:[{text:'12 FEET',confidence:95,bbox:{x0:1,y0:2,x1:60,y1:22},status:'confirmed',correction:'private correction'}]};
function setup(){const values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};return {values,storage,cache:create(storage)}}
test('raw OCR survives reload without reviews, geometry or mutable references',()=>{
 const {cache,storage}=setup();assert.equal(cache.put(source,data),true);
 const restored=create(storage).get(source);assert.equal(restored.lines[0].text,'12 FEET');
 assert.equal(restored.lines[0].status,undefined);assert.equal(restored.lines[0].correction,undefined);
 restored.lines[0].text='changed';assert.equal(cache.get(source).lines[0].text,'12 FEET');
});
test('every source scope, raster and revision change misses; extraction version changes miss',()=>{
 const {cache,values}=setup();cache.put(source,data);
 for(const field of Object.keys(source))assert.equal(cache.get({...source,[field]:typeof source[field]==='number'?source[field]+1:source[field]+'changed'}),null,field);
 values.set(cache.key,values.get(cache.key).replace(cache.version,'obsolete-version'));
 assert.equal(cache.get(source),null);
});
test('bounded eviction and oversized entries do not consume unbounded storage',()=>{
 const {cache,values}=setup();for(let i=0;i<8;i++)cache.put({...source,sheet_id:'s'+i},data);
 assert.equal(JSON.parse(values.get(cache.key)).length,4);
 assert.equal(cache.get({...source,sheet_id:'s0'}),null);
 assert(cache.get({...source,sheet_id:'s7'}));
 assert.equal(cache.put(source,{lines:Array.from({length:2500},()=>({...data.lines[0],text:'x'.repeat(500)}))}),false);
 assert(values.get(cache.key).length<=256000);
});
test('storage failure, corrupt cache, reset and old-tab writes degrade to uncached scans',()=>{
 const {cache,values}=setup();values.set(cache.key,'{bad');assert.equal(cache.get(source),null);
 assert.equal(cache.put(source,data),true);cache.clear();assert.equal(cache.put(source,data),true);
 values.set('construction-ai-data-reset-v1','running');assert.equal(cache.get(source),null);assert.equal(cache.put(source,data),false);
 values.delete('construction-ai-data-reset-v1');values.set('construction-ai-data-generation-v1','new');
 assert.equal(cache.get(source),null);assert.equal(cache.put(source,data),false);
 const broken=create({getItem(){throw Error('blocked')},setItem(){throw Error('quota')}});
 assert.equal(broken.get(source),null);assert.equal(broken.put(source,data),false);
});
test('malformed boxes and empty output are not reused',()=>{
 const {cache,values}=setup();assert.equal(cache.put(source,{lines:[]}),false);
 assert.equal(cache.put(source,{lines:[{...data.lines[0],bbox:{x0:10,y0:2,x1:1,y1:20}}]}),false);
 cache.put(source,data);const entries=JSON.parse(values.get(cache.key));entries[0].lines[0].bbox.x1='bad';values.set(cache.key,JSON.stringify(entries));assert.equal(cache.get(source),null);
});
