const test=require('node:test'),assert=require('node:assert/strict'),v=require('../drawing-view-lines');
const source={sha256:'x',page:1,width_px:600,height_px:400};
const region=(id,x,type='plan')=>({id,type,source,bbox:{x,y:40,width:200,height:240}});
function fixture(){const rows=Array.from({length:200},()=>new Uint8Array(300));for(const offset of [30,170])for(const y of [50,60])rows[y].fill(1,offset,offset+60);return rows}
test('isolates neighboring views and returns original source coordinates',()=>{
 const rows=fixture(),before=JSON.stringify(rows),r=v.extract(rows,[region('p',40),region('e',320,'elevation')],source);
 assert.equal(r.length,2);assert.deepEqual(r[0].candidates[0].points_px,[[60,110],[178,110]]);
 assert.deepEqual(r[1].candidates[0].points_px,[[340,110],[458,110]]);assert.equal(r[1].candidates[0].view_type,'elevation');assert(r.every(x=>!x.geometry_ready));assert.equal(JSON.stringify(rows),before);
});
test('boundary-clipped linework and unknown views cannot supply candidates',()=>{
 const r=v.extract(fixture(),[region('edge',60),region('unknown',320,'unknown')],source);assert.equal(r.length,1);assert.equal(r[0].candidates.length,0);assert(r[0].boundary_rejected>0);
});
test('stale source and excessive crop work fail before publishing results',()=>{
 assert.throws(()=>v.extract(fixture(),[region('p',40)],{...source,sha256:'changed'}));assert.throws(()=>v.extract([[1],[1,0]],[],source));assert.throws(()=>v.extract(fixture(),Array.from({length:17},(_,i)=>region(String(i),40)),source));
});
