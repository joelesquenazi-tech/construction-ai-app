/* Region-local line proposals. Never promotes view labels to verified geometry. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./wall-proposals.js'),require('./drawing-view-regions.js'));else root.ConstructionViewLines=factory(root.ConstructionWallCandidates,root.ConstructionDrawingViews);})(typeof globalThis!=='undefined'?globalThis:this,(walls,views)=>{
'use strict';
function extract(rows,regions,source){
 views.associate(regions,[],source);
 const h=rows?.length,w=rows?.[0]?.length;
 if(!Array.isArray(rows)||!h||!w||h>2400||w>2400||h*w>4200000||rows.some(r=>!r||r.length!==w)||regions.length>16)throw Error('Invalid region raster limits');
 const sx=source.width_px/w,sy=source.height_px/h,output=[];let pixels=0;
 for(const region of regions){
  if(!['plan','rcp','elevation','section','detail'].includes(region.type))continue;
  const b=region.bbox,x0=Math.ceil(b.x/sx),y0=Math.ceil(b.y/sy),x1=Math.floor((b.x+b.width)/sx),y1=Math.floor((b.y+b.height)/sy);
  const width=x1-x0,height=y1-y0;
  pixels+=width*height;if(pixels>4200000)throw Error('Region analysis budget exceeded');
  if(width<12||height<12)continue;
  const crop=rows.slice(y0,y1).map(r=>r.slice(x0,x1));
  const report=walls.detectWallCandidates(crop,{maxSeparation:65});
  const limited=!Number.isFinite(report.stats.possiblePairs)||report.stats.possiblePairs>36;
  let boundaryRejected=0;
  const candidates=limited?[]:report.candidates.flatMap(c=>{
   if(c.points_px.some(([x,y])=>x<=2||y<=2||x>=width-3||y>=height-3)){boundaryRejected++;return []}
   return [{id:region.id+'/'+c.id,region_id:region.id,view_type:region.type,source:{...source},axis:c.axis,
    points_px:c.points_px.map(([x,y])=>[(x+x0)*sx,(y+y0)*sy]),apparent_width_px:c.apparent_width_px*(c.axis==='h'?sy:sx),
    status:'unverified_linework',origin:'local_image_heuristic',evidence:c.evidence}];
  });
  output.push({region_id:region.id,view_type:region.type,geometry_ready:false,candidates,limited,boundary_rejected:boundaryRejected});
 }
 return output;
}
return {version:1,extract};
});
