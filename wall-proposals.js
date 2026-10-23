/* Conservative, entirely local raster proposal of possible horizontal/vertical
 * wall centerlines. Paired dark lines are NOT proof of a wall; double dimension
 * lines, frames, cabinets and hatch marks can resemble walls.
 * No scale, height, source verification or 3D solids inferred here.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ConstructionWallCandidates=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function finite(n){return typeof n==='number'&&Number.isFinite(n)}
function runs(rows,minLength,maxGap){
 const h=rows.length,w=rows[0].length,result=[];
 function scan(axis){
  const major=axis==='h'?h:w,minor=axis==='h'?w:h;
  for(let fixed=0;fixed<major;fixed++){
   let start=-1,lastInk=-1,gap=0;
   for(let pos=0;pos<=minor;pos++){
    const ink=pos<minor&&!!(axis==='h'?rows[fixed][pos]:rows[pos][fixed]);
    if(ink){
     if(start<0)start=pos;
     lastInk=pos;gap=0;
    }else if(start>=0){
     gap++;
     if(gap>maxGap||pos===minor){
      if(lastInk-start+1>=minLength)
       result.push({axis,fixed,start,end:lastInk});
      start=-1;lastInk=-1;gap=0;
     }
    }
   }
  }
 }
 scan('h');scan('v');
 return result;
}
function compress(lines){
 const output=[];
 for(const axis of ['h','v']){
  const sorted=lines.filter(x=>x.axis===axis).sort((a,b)=>a.fixed-b.fixed||a.start-b.start);
  for(const line of sorted){
   let found=null;
   for(let j=output.length-1;j>=0;j--){
    const group=output[j];
    if(group.axis!==axis)continue;
    if(line.fixed-group.lastFixed>2)break;
    const intersection=Math.min(line.end,group.end)-Math.max(line.start,group.start)+1;
    const least=Math.min(line.end-line.start+1,group.end-group.start+1);
    if(intersection/least>=.84&&Math.abs(line.start-group.start)<=8
      &&Math.abs(line.end-group.end)<=8){found=group;break}
   }
   if(found){
    found.fixed=(found.fixed*found.count+line.fixed)/(found.count+1);
    found.lastFixed=line.fixed;
    found.start=Math.max(found.start,line.start);
    found.end=Math.min(found.end,line.end);
    found.count++;
   }else output.push({...line,lastFixed:line.fixed,count:1});
  }
 }
 return output;
}
function detectWallCandidates(rows,options={}){
 if(!Array.isArray(rows)||!rows.length||!rows[0]||!rows[0].length)
  throw Error('A nonempty binary drawing raster is required.');
 const width=rows[0].length,height=rows.length;
 if(width>2600||height>2600||rows.some(row=>!row||row.length!==width))
  throw Error('Raster dimensions must be consistent and <=2600 pixels per side.');
 const minRun=options.minRun??38,maxGap=options.maxGap??1;
 const minSep=options.minSeparation??4,maxSep=options.maxSeparation??30;
 const maxCandidates=options.maxCandidates??36;
 if(![minRun,maxGap,minSep,maxSep,maxCandidates].every(n=>Number.isSafeInteger(n))
    ||minRun<12||maxGap<0||maxGap>3||minSep<2||maxSep<=minSep
    ||maxSep>65||maxCandidates<1||maxCandidates>100)
  throw Error('Invalid detection parameters.');
 const raw=runs(rows,minRun,maxGap);
 // Dense hatchwork needs a separate semantic detector; refuse overfilled pages.
 if(raw.length>15000)return {status:'needs_review',candidates:[],
  evidence:'image_only_parallel_line_proposals',
  reason:'Excessive linework. Need localized drawing review.',stats:{width,height,rawRuns:raw.length}};
 const lines=compress(raw);
 let pairs=[];
 for(const axis of ['h','v']){
  const same=lines.filter(x=>x.axis===axis).sort((a,b)=>a.fixed-b.fixed);
  for(let i=0;i<same.length;i++){
   const a=same[i];
   for(let j=i+1;j<same.length;j++){
    const b=same[j],sep=b.fixed-a.fixed;
    if(sep>maxSep)break;
    if(sep<minSep)continue;
    const first=Math.max(a.start,b.start),last=Math.min(a.end,b.end);
    const overlap=last-first+1;
    const shorter=Math.min(a.end-a.start+1,b.end-b.start+1);
    if(overlap<minRun||overlap/shorter<.72)continue;
    // Stronger pair: similar parallel lengths with meaningful overlap.
    pairs.push({axis,start:first,end:last,center:(a.fixed+b.fixed)/2,
      apparentWidthPx:sep,rank:overlap*(overlap/shorter)});
   }
  }
 }
 pairs.sort((a,b)=>b.rank-a.rank);
 const candidates=[];
 for(const item of pairs){
  if(candidates.length>=maxCandidates)break;
  const dup=candidates.some(c=>c.axis===item.axis
     &&Math.abs(c.fixed-item.center)<=3
     &&Math.abs(c.start-item.start)<=10&&Math.abs(c.end-item.end)<=10);
  if(dup)continue;
  const start=item.axis==='h'?[item.start,item.center]:[item.center,item.start];
  const end=item.axis==='h'?[item.end,item.center]:[item.center,item.end];
  candidates.push({
   id:'candidate-'+(candidates.length+1),axis:item.axis,
   points_px:[start,end],apparent_width_px:Math.round(item.apparentWidthPx*10)/10,
   status:'unverified_linework',origin:'local_image_heuristic',
   evidence:'parallel_dark_line_pair',fixed:item.center,start:item.start,end:item.end,
  });
 }
 return {status:'needs_review',reason:'Parallel linework can represent walls or non-wall details.',
  candidates,evidence:'image_only_parallel_line_proposals',
  stats:{width,height,rawRuns:raw.length,mergedRuns:lines.length,
   possiblePairs:pairs.length,displayedCandidates:candidates.length}};
}
return {detectWallCandidates};
});