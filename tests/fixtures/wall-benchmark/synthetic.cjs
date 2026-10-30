'use strict';
// Generated geometry only. Never derives fixtures from project drawings.
const {hash}=require('../../../tools/wall-benchmark.cjs');
function fixture(difficult=false){
 const width=360,height=240,pixels=Buffer.alloc(width*height,255);
 const set=(x,y)=>{pixels[y*width+x]=0};
 const h=(y,a,b)=>{for(let x=a;x<=b;x++)set(x,y)};
 const v=(x,a,b)=>{for(let y=a;y<=b;y++)set(x,y)};
 for(const y of [30,40,135,145])h(y,30,225);
 for(const x of [30,40,215,225])v(x,30,145);
 const walls=[
  {id:'north',points_px:[[35,35],[220,35]]},
  {id:'south',points_px:[[35,140],[220,140]]},
  {id:'west',points_px:[[35,35],[35,140]]},
  {id:'east',points_px:[[220,35],[220,140]]}
 ];
 const non_walls=[];
 if(difficult){
  h(180,30,225);h(190,30,225);
  non_walls.push({id:'dimension-pair',points_px:[[30,185],[225,185]],
   reason:'Synthetic parallel dimension-like lines; not a wall'});
  for(let y=35;y<=100;y++){
   const x=270+Math.round((y-35)*55/65);set(x,y);set(x+10,y);
  }
  walls.push({id:'diagonal',points_px:[[275,35],[330,100]]});
 }
 const raster=Buffer.concat([Buffer.from(`P5\n${width} ${height}\n255\n`),pixels]);
 const source={project_id:'synthetic-only',room_id:'room-1',sheet_id:'SYN-1',revision:'fixture-v1',
  view_id:'floor-plan',filename:'generated-room.pgm',page:1,width,height,
  document_sha256:hash(raster),raster_sha256:hash(raster),coordinate_space:'original_image_pixels'};
 const truth={schema:'construction-ai-wall-benchmark-case-v1',case_id:difficult?'known-limitations':'clean-room',
  corpus_kind:'synthetic',coverage:'complete_view',source,
  review:{reviewer:'Synthetic fixture author',independent_reviewer:'Synthetic expectation definition',
   reviewed_at:'2026-10-30T00:00:00Z'},
  tolerances:{endpoint_error_px:6,angle_error_deg:1,
   rationale:'Synthetic corner face overlap extends proposal endpoints by five pixels; not a project tolerance'},
  targets:{min_precision:.95,min_recall:.95,max_non_wall_matches:0},walls,non_walls};
 return {truth,raster};
}
module.exports={fixture};
