/* Extract embedded PDF text positions into LOCAL drawing review candidates.
 * Coordinates are aligned to the same locally rendered PDF page (not to paper
 * dimensions or architectural scale). A PDF text layer is unverified source
 * content, not OCR confidence or a confirmed design dimension.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ConstructionPDFText=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function multiply(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==6||b.length!==6||
    [...a,...b].some(x=>!finite(x)))throw Error('Invalid PDF viewport or text transform');
 return [
  a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],
  a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],
  a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]
 ];
}
function textBox(item,viewport,width,height){
 if(!item||typeof item.str!=='string'||!item.str.trim()||
    !Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
    !finite(item.width)||!finite(item.height)||item.width<0||item.height<0)
  return null;
 let m;
 try{m=multiply(viewport,item.transform)}catch{return null}
 const baseline=Math.hypot(m[0],m[1]),up=Math.hypot(m[2],m[3]);
 if(baseline<1e-6||up<1e-6)return null;
 // PDF.js text item width/height are in PDF user coordinates. The viewport's
 // linear scale maps those lengths onto the pixels used to render the same page.
 const factor=Math.hypot(viewport[0],viewport[1]);
 const run=Math.max(1,item.width*factor),rise=Math.max(1,item.height*factor);
 const ux=m[0]/baseline,uy=m[1]/baseline,vx=m[2]/up,vy=m[3]/up;
 const p=[[m[4],m[5]],[m[4]+ux*run,m[5]+uy*run],
          [m[4]+vx*rise,m[5]+vy*rise],
          [m[4]+ux*run+vx*rise,m[5]+uy*run+vy*rise]];
 const minx=Math.max(0,Math.min(...p.map(q=>q[0]))),
       miny=Math.max(0,Math.min(...p.map(q=>q[1]))),
       maxx=Math.min(width,Math.max(...p.map(q=>q[0]))),
       maxy=Math.min(height,Math.max(...p.map(q=>q[1])));
 if(![minx,miny,maxx,maxy].every(finite)||maxx-minx<.4||maxy-miny<.4)return null;
 return {x:Number(minx.toFixed(2)),y:Number(miny.toFixed(2)),
         width:Number((maxx-minx).toFixed(2)),height:Number((maxy-miny).toFixed(2))};
}
function nativeFindings(raw,sheetId,limit=3000){
 if(!raw||!Array.isArray(raw.items)||!Array.isArray(raw.transform)||
    !Number.isSafeInteger(raw.width)||raw.width<1||!Number.isSafeInteger(raw.height)||raw.height<1||
    typeof sheetId!=='string'||!sheetId||
    !Number.isSafeInteger(limit)||limit<1||limit>10000)
  throw Error('Invalid PDF text extraction result');
 const out=[];
 for(const [index,item] of raw.items.entries()){
  const str=String(item?.str||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
  if(!str)continue;
  const bbox=textBox(item,raw.transform,raw.width,raw.height);
  if(!bbox)continue;
  out.push({
   id:sheetId+'-pdf-'+String(index+1).padStart(5,'0'),
   text:str.slice(0,500),x:bbox.x,y:bbox.y,
   bbox,confidence:null,suggestion:'',
   reason:'Embedded PDF text · location approximate · source verification required',
   kind:'pdf-native-text',source_kind:'pdf_embedded_text',
   status:'pending',correction:'',note:''
  });
  if(out.length>=limit)break;
 }
 return out;
}
return {multiply,textBox,nativeFindings};
});