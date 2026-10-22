/* Deterministic wall partitioning; metres. Mirrors Python wall_mesh grid logic. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ConstructionWallGeometry=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function positive(v,label){if(typeof v!=='number'||!Number.isFinite(v)||v<=0)throw Error('Invalid '+label);return v}
function partition(w){
 const {id,bounds,length,height,openings=[]}=w;
 if(!id||!Array.isArray(bounds)||bounds.length!==6||bounds.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw Error('Invalid wall bounds');
 positive(length,'length');positive(height,'height');
 const [x0,y0,z0,x1,y1,z1]=bounds;
 if(!(x1>x0&&y1>y0&&z1>z0))throw Error('Invalid bounds');
 const horizontal=w.horizontal;
 if(typeof horizontal!=='boolean'||![1,-1].includes(w.direction))throw Error('Invalid wall direction');
 const ranges=openings.map(o=>{const start=o.along_m,sill=o.sill_m,width=positive(o.width_m,'opening width'),h=positive(o.height_m,'opening height');
 if(![start,sill].every(n=>typeof n==='number'&&Number.isFinite(n))||!(start>=0&&sill>=0&&start+width<=length+1e-9&&sill+h<=height+1e-9))throw Error('Opening outside wall');
 return [start,start+width,sill,sill+h]});
 for(let i=0;i<ranges.length;i++)for(let j=i+1;j<ranges.length;j++){const [a,b,c,d]=ranges[i],[p,q,r,s]=ranges[j];if(Math.max(a,p)<Math.min(b,q)-1e-9&&Math.max(c,r)<Math.min(d,s)-1e-9)throw Error('Overlapping openings')}
 const xs=[...new Set([0,length,...ranges.flatMap(r=>[r[0],r[1]])])].sort((a,b)=>a-b);
 const zs=[...new Set([0,height,...ranges.flatMap(r=>[r[2],r[3]])])].sort((a,b)=>a-b);
 const solids=[];
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
 const mid=(xs[i]+xs[i+1])/2,zm=(zs[j]+zs[j+1])/2;
 if(ranges.some(([a,b,c,d])=>a<mid&&mid<b&&c<zm&&zm<d))continue;
 const origin=horizontal?(w.direction===1?x0:x1):(w.direction===1?y0:y1);
 const a=origin+w.direction*xs[i],b=origin+w.direction*xs[i+1],bottom=z0+zs[j],top=z0+zs[j+1];
 const bb=horizontal?[Math.min(a,b),y0,bottom,Math.max(a,b),y1,top]:[x0,Math.min(a,b),bottom,x1,Math.max(a,b),top];
 if(bb[3]>bb[0]&&bb[4]>bb[1]&&bb[5]>bb[2])solids.push(bb)
 }
 return solids
}
return {partition};
});