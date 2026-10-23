const test=require('node:test');
const assert=require('node:assert/strict');
const {detectWallCandidates}=require('../wall-proposals.js');
function blank(w=260,h=160){return Array.from({length:h},()=>new Uint8Array(w))}
function hline(rows,y,x0,x1){for(let x=x0;x<=x1;x++)rows[y][x]=1}
function vline(rows,x,y0,y1){for(let y=y0;y<=y1;y++)rows[y][x]=1}
test('paired horizontal dark lines produce only unverified candidates',()=>{
 const rows=blank();
 hline(rows,42,20,210);hline(rows,53,20,210);
 const result=detectWallCandidates(rows);
 assert.equal(result.status,'needs_review');
 assert.equal(result.candidates.length,1);
 assert.equal(result.candidates[0].axis,'h');
 assert.deepEqual(result.candidates[0].points_px,[[20,47.5],[210,47.5]]);
 assert.equal(result.candidates[0].apparent_width_px,11);
 assert.equal(result.candidates[0].status,'unverified_linework');
 assert.ok(!Object.hasOwn(result,'metres_per_pixel'));
});
test('paired vertical lines propose a centerline in source raster pixels',()=>{
 const rows=blank();vline(rows,90,15,135);vline(rows,105,15,135);
 const p=detectWallCandidates(rows).candidates;
 assert.equal(p.length,1);assert.equal(p[0].axis,'v');
 assert.deepEqual(p[0].points_px,[[97.5,15],[97.5,135]]);
});
test('a single long line like a dimension is not identified as a wall pair',()=>{
 const rows=blank();hline(rows,30,10,245);
 vline(rows,10,20,41);vline(rows,245,20,41);
 assert.equal(detectWallCandidates(rows).candidates.length,0);
});
test('thick strokes are compressed before matching parallel faces',()=>{
 const rows=blank();
 for(const y of [40,41,42,54,55,56])hline(rows,y,20,225);
 const result=detectWallCandidates(rows);
 assert.equal(result.candidates.length,1);
 assert.deepEqual(result.candidates[0].points_px,[[20,48],[225,48]]);
});
test('very short hatch strokes are not reported as centerline candidates',()=>{
 const rows=blank();
 for(const y of [40,49,58,67])hline(rows,y,20,45);
 assert.equal(detectWallCandidates(rows).candidates.length,0);
});
test('pairs remain review-only even when multiple dimensions agree elsewhere',()=>{
 const rows=blank();
 hline(rows,42,20,210);hline(rows,53,20,210);
 vline(rows,120,15,140);vline(rows,133,15,140);
 const report=detectWallCandidates(rows);
 assert.equal(report.status,'needs_review');
 assert.ok(report.candidates.length>=2);
 assert.ok(report.candidates.every(c=>c.status==='unverified_linework'&&c.origin==='local_image_heuristic'));
});
test('parameter and raster safeguards',()=>{
 assert.throws(()=>detectWallCandidates([]),/raster/i);
 assert.throws(()=>detectWallCandidates([new Uint8Array(20),new Uint8Array(19)]),/dimensions/i);
 assert.throws(()=>detectWallCandidates(blank(),{minSeparation:50,maxSeparation:20}),/parameters/i);
 assert.throws(()=>detectWallCandidates(blank(),{maxCandidates:999}),/parameters/i);
});
