const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../dimension-check-state.js');
const source={sha256:'a'.repeat(64),raster_sha256:'b'.repeat(64),filename:'synthetic.png',sheet_id:'A101',sheet:'A101',page:1,revision:null,project_id:'p',room_id:'r',width_px:800,height_px:500};
const add=(s,action)=>c.transact(s,action);
function ready(){
 let s=c.createSession(source);
 s=add(s,{type:'region',box:{x:20,y:20,width:700,height:160}});
 s=add(s,{type:'settings',dataset_kind:'synthetic',label_tolerance_px:5,endpoint_tolerance_px:3});
 return s;
}
const annotation=()=>({id:'independent-1',...c.manualMeasurement({system:'imperial',feet:12,inches:0,numerator:0,denominator:16}),label_box_px:{x:300,y:40,width:60,height:14},axis:'h',points_px:[[50,80],[700,80]]});
test('source-only checks begin without inferred measurements, coverage or tolerances',()=>{
 const s=c.createSession(source);assert.deepEqual(s.dimensions,[]);assert.equal(s.confirmed,false);assert.equal(s.label_tolerance_px,null);
 assert.throws(()=>c.score(s,[]),/Confirm/);assert.throws(()=>c.createSession({...source,sha256:'unknown'}),/source/);
});
test('manual structured feet/inches conversion is independent of the detector text parser',()=>{
 const value=c.manualMeasurement({system:'imperial',feet:6,inches:7,numerator:1,denominator:2});
 assert.equal(value.label,'6′-7 1/2″');assert.equal(value.metres,2.0193);
 assert.equal(c.manualMeasurement({system:'metric',value:1200,unit:'mm'}).metres,1.2);
 for(const input of [{system:'imperial',feet:1,inches:12,numerator:0,denominator:16},{system:'imperial',feet:0,inches:1,numerator:2,denominator:2},{system:'metric',value:0,unit:'m'},{system:'metric',value:1,unit:'unknown'}])assert.throws(()=>c.manualMeasurement(input));
});
test('source bounds and explicit region coverage protect independent annotations',()=>{
 const s=ready(),before=JSON.stringify(s);
 assert.throws(()=>add(s,{type:'add',annotation:{...annotation(),label_box_px:{x:760,y:40,width:60,height:14}}}),/area/);
 const out=add(s,{type:'add',annotation:annotation()});assert.equal(JSON.stringify(s),before);assert.equal(out.dimensions.length,1);
 assert.throws(()=>add(out,{type:'add',annotation:annotation()}),/duplicate/);
 assert.throws(()=>add(out,{type:'region',box:{x:0,y:0,width:100,height:100}}),/area/);
});
test('an explicitly confirmed empty negative area is valid; absent predictions do not become perfect recall',()=>{
 let s=ready();assert.throws(()=>add(s,{type:'confirm',exhaustive:true,independent:false}),/both/);
 s=add(s,{type:'confirm',exhaustive:true,independent:true});
 assert.equal(c.score(s,[]).text_readings.recall,null);
});
test('scoring uses original rejected predictions, and never creates missing predictions',()=>{
 let s=add(ready(),{type:'add',annotation:annotation()});s=add(s,{type:'confirm',exhaustive:true,independent:true});
 assert.equal(c.score(s,[]).text_readings.false_negative,1);
 const f={source,text:'13 FEET',correction:'12 FEET',status:'rejected',bbox:annotation().label_box_px};
 assert.equal(c.score(s,[f]).text_readings.true_positive,0);assert.equal(c.score(s,[f]).text_readings.false_positive,1);
 assert.throws(()=>c.score(s,[{...f,source:{...source,sha256:'c'.repeat(64)}}]),/different|unknown/);
});
test('saved actions invalidate confirmation; undo restores annotations and confirmation',()=>{
 let s=add(ready(),{type:'add',annotation:annotation()});s=add(s,{type:'confirm',exhaustive:true,independent:true});
 const changed=add(s,{type:'remove',id:'independent-1'});assert.equal(changed.confirmed,false);assert.equal(changed.dimensions.length,0);
 const restored=add(changed,{type:'undo'});assert.equal(restored.confirmed,true);assert.equal(restored.dimensions[0].id,'independent-1');
 assert.equal(restored.source.revision,null);assert.equal(s.dimensions.length,1);
});
test('same-sized changed drawing and corrupted history cannot reuse an accuracy check',()=>{
 const s=ready();assert.throws(()=>c.validateSession(s,{...source,sha256:'c'.repeat(64)}),/match/);
 s.history[0].source.room_id='other';assert.throws(()=>c.validateSession(s,source),/History/);
});
test('bounded history and an explicit annotation limit keep local checks small',()=>{
 let s=ready();for(let i=0;i<12;i++)s=add(s,{type:'add',annotation:{...annotation(),id:'d'+i}});
 assert.equal(s.history.length,10);
 for(let i=12;i<100;i++)s=add(s,{type:'add',annotation:{...annotation(),id:'d'+i}});
 assert.throws(()=>add(s,{type:'add',annotation:{...annotation(),id:'d100'}}),/settings/);
});
