/* Shared 4x magnifier and optional experimental dark-pixel snap for drawing
 * calibration and manual wall tracing. All coordinates are original image pixels.
 * No inference or verification is performed by snapping to a dark pixel.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ConstructionDrawingPointTools=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DIAMETER=180,ZOOM=4;
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
function pointAt(clientX,clientY,rect,size){
 if(!rect||!size||!(rect.width>0&&rect.height>0&&size.width>0&&size.height>0)
  ||!Number.isFinite(clientX)||!Number.isFinite(clientY))return null;
 return {x:clamp((clientX-rect.left)*size.width/rect.width,0,size.width),
         y:clamp((clientY-rect.top)*size.height/rect.height,0,size.height)};
}
function samplingWindow(raw,rect,size,diameter=DIAMETER,zoom=ZOOM){
 if(!raw||!rect||!size||!(rect.width>0&&rect.height>0&&size.width>0&&size.height>0)
     ||!(diameter>0&&zoom>0))return null;
 const spanX=diameter*size.width/(rect.width*zoom);
 const spanY=diameter*size.height/(rect.height*zoom);
 const left=raw.x-spanX/2,top=raw.y-spanY/2;
 const x0=clamp(left,0,size.width),y0=clamp(top,0,size.height);
 const x1=clamp(left+spanX,0,size.width),y1=clamp(top+spanY,0,size.height);
 return {left,top,spanX,spanY,x0,y0,x1,y1,diameter,zoom};
}
function snapNearestPixel(point,size,enabled,image,context){
 if(!enabled||!image||!image.complete||!image.naturalWidth||!context||!point||!size)return point;
 const rect=image.getBoundingClientRect();
 if(!rect.width)return point;
 const radius=clamp(Math.round(11*size.width/rect.width*1.4),2,24);
 const cx=Math.round(point.x),cy=Math.round(point.y);
 const x0=Math.max(0,cx-radius),y0=Math.max(0,cy-radius);
 const width=Math.min(size.width-x0,2*radius+1),height=Math.min(size.height-y0,2*radius+1);
 if(width<=0||height<=0)return point;
 let pixels;
 try{
  context.canvas.width=width;
  context.canvas.height=height;
  context.clearRect(0,0,width,height);
  context.drawImage(image,x0,y0,width,height,0,0,width,height);
  pixels=context.getImageData(0,0,width,height).data;
 }catch{return point}
 let best=null,bestDistance=Infinity;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,brightness=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
  if(pixels[i+3]<200||brightness>95)continue;
  const dx=x0+x-point.x,dy=y0+y-point.y,d=dx*dx+dy*dy;
  if(d<bestDistance){bestDistance=d;best={x:x0+x,y:y0+y}}
 }
 return best||point;
}
function create({image,overlay,lens,canvas,getSize,isSnapEnabled}){
 if(!image||!overlay||!lens||!canvas||typeof getSize!=='function')
  throw Error('Drawing point tool requires image, SVG overlay, lens, canvas and image dimensions.');
 const ctx=canvas.getContext('2d'),scratch=typeof document!=='undefined'?document.createElement('canvas'):null;
 const snapCtx=scratch?.getContext('2d',{willReadFrequently:true});
 function point(event){
  return pointAt(event.clientX,event.clientY,image.getBoundingClientRect(),getSize());
 }
 function radius(){
  const size=getSize(),rect=image.getBoundingClientRect();
  return size&&rect.width?clamp(11*size.width/rect.width,3,20):12;
 }
 function sync(){
  const size=getSize();
  if(!size)return;
  const width=image.clientWidth,height=image.clientHeight;
  if(!width||!height)return;
  overlay.style.width=width+'px';
  overlay.style.height=height+'px';
  overlay.setAttribute('viewBox','0 0 '+size.width+' '+size.height);
  overlay.setAttribute('preserveAspectRatio','none');
 }
 function snap(p){
  return snapNearestPixel(p,getSize(),!!isSnapEnabled?.(),image,snapCtx);
 }
 function show(target,event,raw=target){
  const size=getSize();
  if(!size||!image.complete||!image.naturalWidth||!ctx)return;
  const windowRect=samplingWindow(raw,image.getBoundingClientRect(),size);
  if(!windowRect)return;
  const {left,top,spanX,spanY,x0,y0,x1,y1}=windowRect;
  const lensX=clamp(event.clientX,96,Math.max(96,window.innerWidth-96));
  const lensY=event.clientY>215?event.clientY-18:Math.min(window.innerHeight-8,event.clientY+205);
  lens.style.left=lensX+'px';lens.style.top=lensY+'px';
  lens.style.transform='translate(-50%,-100%)';
  ctx.clearRect(0,0,DIAMETER,DIAMETER);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,DIAMETER,DIAMETER);
  if(x1>x0&&y1>y0){
   ctx.imageSmoothingEnabled=true;
   ctx.imageSmoothingQuality='high';
   ctx.drawImage(image,x0,y0,x1-x0,y1-y0,
    (x0-left)*DIAMETER/spanX,(y0-top)*DIAMETER/spanY,
    (x1-x0)*DIAMETER/spanX,(y1-y0)*DIAMETER/spanY);
  }
  // Orange crosshair = original image location beneath finger.
  ctx.strokeStyle='#e78200';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(90,64);ctx.lineTo(90,116);
  ctx.moveTo(64,90);ctx.lineTo(116,90);ctx.stroke();
  ctx.beginPath();ctx.arc(90,90,5,0,Math.PI*2);ctx.stroke();
  // Blue ring = snapped endpoint (may differ from orange crosshair).
  const tx=90+(target.x-raw.x)*DIAMETER/spanX;
  const ty=90+(target.y-raw.y)*DIAMETER/spanY;
  if(Number.isFinite(tx)&&Number.isFinite(ty)){
   ctx.strokeStyle='#087ef5';ctx.fillStyle='#087ef5';ctx.lineWidth=2.5;
   ctx.beginPath();ctx.arc(tx,ty,7,0,Math.PI*2);ctx.stroke();
   ctx.beginPath();ctx.arc(tx,ty,2,0,Math.PI*2);ctx.fill();
  }
  lens.hidden=false;
 }
 function hide(){lens.hidden=true}
 return {point,radius,sync,snap,show,hide};
}
return {create,pointAt,samplingWindow,snapNearestPixel};
});