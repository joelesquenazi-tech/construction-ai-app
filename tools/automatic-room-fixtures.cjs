// Public synthetic architectural fixtures; no private project data.
function pdf(stream){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let text='%PDF-1.4\n',offsets=[];
 for(const [i,o]of objects.entries()){offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${o}\nendobj\n`}
 const start=Buffer.byteLength(text);text+='xref\n0 6\n0000000000 65535 f \n';for(const n of offsets)text+=String(n).padStart(10,'0')+' 00000 n \n';
 return Buffer.from(text+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
}
function floor(){return pdf(`.25 w 140 60 340 276 re S 150 70 320 256 re S
150 40 m 470 40 l S 150 35 m 150 45 l S 470 35 m 470 45 l S
110 70 m 110 326 l S 100 70 m 120 70 l S 100 326 m 120 326 l S
BT /F1 5 Tf 285 44 Td (10 FEET) Tj ET
BT /F1 5 Tf 0 1 -1 0 106 180 Tm (8 FEET) Tj ET
BT /F1 8 Tf 240 200 Td (TREATMENT) Tj ET`)}
function elevation(height=9){return pdf(`BT /F1 10 Tf 40 330 Td (TREATMENT ELEVATION) Tj ET BT /F1 10 Tf 40 290 Td (CEILING HEIGHT ${height} FEET) Tj ET`)}
module.exports={floor,elevation};
