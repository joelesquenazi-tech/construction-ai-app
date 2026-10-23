const test=require('node:test');
const assert=require('node:assert/strict');
const {pointAt,samplingWindow,snapNearestPixel}=require('../drawing-point-tools.js');

const size={width:4480,height:3051};
const rect={left:48,top:215,width:1120,height:762.75};

test('calibration and tracing map same iPad touch into original pixels',()=>{
 assert.deepEqual(pointAt(608,596.375,rect,size),{x:2240,y:1525.5});
 assert.deepEqual(pointAt(48,215,rect,size),{x:0,y:0});
 assert.deepEqual(pointAt(1168,977.75,rect,size),{x:size.width,y:size.height});
});

test('position updates accurately when drawing scrolls or moves on screen',()=>{
 const before=pointAt(408,415,rect,size);
 const after=pointAt(408,365,{...rect,top:165},size);
 assert.deepEqual(before,after);
});

test('coordinates clamp beyond edge consistently with existing calibration',()=>{
 assert.deepEqual(pointAt(-500,-300,rect,size),{x:0,y:0});
 assert.deepEqual(pointAt(4000,3000,rect,size),{x:size.width,y:size.height});
});

test('invalid drawing rect cannot create misleading coordinates',()=>{
 assert.equal(pointAt(2,3,{left:0,top:0,width:0,height:800},size),null);
 assert.equal(pointAt(2,3,rect,{width:0,height:10}),null);
});

test('4x magnifies displayed image, not raw original pixels',()=>{
 const p=pointAt(608,596.375,rect,size);
 const win=samplingWindow(p,rect,size);
 assert.ok(win);
 assert.equal(win.spanX,180*4480/(1120*4));
 assert.equal(win.spanY,180*3051/(762.75*4));
 assert.equal(win.left+win.spanX/2,p.x);
 assert.equal(win.top+win.spanY/2,p.y);
});

test('edge cropping retains precise center for loupe',()=>{
 const p={x:4,y:9};
 const win=samplingWindow(p,rect,size);
 assert.equal(win.x0,0);
 assert.equal(win.y0,0);
 assert.ok(win.left<0);
 assert.ok(win.top<0);
 assert.equal(win.x1-win.x0,p.x+win.spanX/2);
});

test('same original point uses different sample crop when displayed zoom changes',()=>{
 const p={x:144,y:200};
 const a=samplingWindow(p,rect,size);
 const b=samplingWindow(p,{...rect,width:2240,height:1525.5},size);
 assert.equal(a.spanX,2*b.spanX);
 assert.equal(a.spanY,2*b.spanY);
});

test('snapping remains optional and never changes free placement',()=>{
 const p={x:80.5,y:40.25};
 assert.equal(snapNearestPixel(p,{width:200,height:100},false,null,null),p);
 assert.equal(snapNearestPixel(p,{width:200,height:100},true,null,null),p);
});

test('snap searches only bounded source crop and nearest dark pixel',()=>{
 const image={complete:true,naturalWidth:200,
  getBoundingClientRect:()=>({width:200,height:100})};
 const canvas={width:0,height:0};
 const context={canvas,clearRect:()=>{},drawImage:()=>{},
  getImageData:(_x,_y,w,h)=>{
   const data=new Uint8ClampedArray(w*h*4);
   data.fill(255);
   const i=(Math.floor(h/2)*w+Math.floor(w/2))*4;
   data[i]=0;data[i+1]=0;data[i+2]=0;data[i+3]=255;
   return {data};
  }};
 const point={x:80,y:40};
 const snapped=snapNearestPixel(point,{width:200,height:100},true,image,context);
 assert.deepEqual(snapped,point);
 assert.ok(canvas.width<=49&&canvas.height<=49);
});

test('no snap if reading the crop is restricted or canvas unavailable',()=>{
 const image={complete:true,naturalWidth:200,
  getBoundingClientRect:()=>({width:200,height:100})};
 const p={x:40,y:60};
 assert.equal(snapNearestPixel(p,{width:200,height:100},true,image,null),p);
 const bad={canvas:{},clearRect:()=>{},drawImage:()=>{throw Error('blocked')}};
 assert.equal(snapNearestPixel(p,{width:200,height:100},true,image,bad),p);
});