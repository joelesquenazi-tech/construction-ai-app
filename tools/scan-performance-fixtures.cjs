// Synthetic public fixtures. No private drawing bytes or annotations.
function nativePdf(){
 const marks=[50,500,504],tick=p=>`${p-.7} 269.3 m ${p+.7} 270.7 l S`;
 const stream=`.25 w 50 270 m 504 270 l S ${marks.map(tick).join(' ')} BT /F1 2.5 Tf 250 275 Td (12 FEET) Tj ET BT /F1 1.2 Tf 501.4 271.6 Td (6") Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let text='%PDF-1.4\n',offsets=[];
 for(const [i,o]of objects.entries()){offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${o}\nendobj\n`}
 const start=Buffer.byteLength(text);text+='xref\n0 6\n0000000000 65535 f \n';
 for(const n of offsets)text+=String(n).padStart(10,'0')+' 00000 n \n';
 return Buffer.from(text+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
}
async function importFixture(page,route){
 await page.evaluate(async({route,bytes})=>{
  let file;
  if(route==='pdf_embedded_text')file=new File([Uint8Array.from(bytes)],'synthetic-chain.pdf',{type:'application/pdf'});
  else{
   const c=document.createElement('canvas');c.width=1400;c.height=450;
   const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,1400,450);x.fillStyle='black';
   x.font='bold 64px Arial';x.fillText('PRIMARY BEDROOM',40,110);x.fillText('12 FEET',550,270);
   x.strokeStyle='black';x.lineWidth=2;x.beginPath();x.moveTo(200,310);x.lineTo(1200,310);
   x.moveTo(200,285);x.lineTo(200,365);x.moveTo(1200,285);x.lineTo(1200,365);x.stroke();
   file=new File([await new Promise(r=>c.toBlob(r))],'synthetic-text.png',{type:'image/png'});
  }
  await window.constructionAIUploadDrawing(file,{drawingType:'elevation'});
  window.constructionAIPreviewStartup('return');window.constructionAIShowTab('drawings');
 },{route,bytes:route==='pdf_embedded_text'?Array.from(nativePdf()):[]});
 await page.waitForFunction(()=>window.constructionAIDimensionSource?.sheet_id===document.getElementById('sheetSelector').value);
}
module.exports={nativePdf,importFixture};
