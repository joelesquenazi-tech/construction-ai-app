const test=require('node:test');
const assert=require('node:assert/strict');
const {nextPending,confidence,needsCare}=require('../finding-review.js');
test('rejecting first OCR finding advances to the next pending, not a rejected one',()=>{
 const records=[
  {id:'a',status:'rejected'},
  {id:'b',status:'confirmed'},
  {id:'c',status:'pending'},
  {id:'d',status:'pending'},
 ];
 assert.equal(nextPending(records,'a'),'c');
 assert.equal(nextPending(records,'c'),'d');
 assert.equal(nextPending(records,'d'),'c');
});
test('does not invent a next review when all other items decided',()=>{
 assert.equal(nextPending([{id:'a',status:'rejected'},{id:'b',status:'confirmed'}],'a'),null);
 assert.equal(nextPending([{id:'a',status:'pending'}],'a'),null);
});
test('OCR confidence is numeric and bounded, including percent formatting',()=>{
 assert.equal(confidence(45.17494201660156),'45.2%');
 assert.equal(confidence(24.348698),'24.3%');
 assert.equal(confidence(400),'100.0%');
 assert.equal(confidence('N/A'),'Unknown');
});
test('low-confidence text is clearly eligible for caution rather than confirmation',()=>{
 assert.equal(needsCare(24.34),true);
 assert.equal(needsCare(45.17),true);
 assert.equal(needsCare(82),false);
 assert.equal(needsCare(null),true);
});