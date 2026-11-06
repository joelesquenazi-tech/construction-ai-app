// Synthetic PDF page identity, stale-source guards and offline read-only review.
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.html':'text/html','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,pathname==='/'?'index.html':'.'+pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(404).end();
 try{res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}
});
function syntheticPDF(){
 const stream=text=>`1 w 50 270 m 550 270 l S 50 235 m 50 285 l S 550 235 m 550 285 l S BT /F1 18 Tf 250 280 Td (${text}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
  `<< /Length ${stream('12 FEET').length} >>\nstream\n${stream('12 FEET')}\nendstream`,
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
  `<< /Length ${stream('1200 mm').length} >>\nstream\n${stream('1200 mm')}\nendstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let pdf='%PDF-1.4\n',offsets=[0];
 objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});
 const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
 for(const offset of offsets.slice(1))pdf+=String(offset).padStart(10,'0')+' 00000 n \n';
 return Buffer.from(pdf+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}
async function replaceRaster(page,shade){
 await page.evaluate(async shade=>{
  const c=document.createElement('canvas');c.width=2400;c.height=1600;
  const ctx=c.getContext('2d');ctx.fillStyle=shade;ctx.fillRect(0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r)),files=new DataTransfer();
  files.items.add(new File([blob],'same-name.png',{type:'image/png',lastModified:1}));
  const input=document.getElementById('drawingImport');input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  await window.constructionAIWaitForDrawingSave();
 },shade);
 await page.waitForFunction(()=>!!window.constructionAIDimensionSource);
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const watchdog=setTimeout(()=>{console.error('Dimension source test exceeded 120 seconds');process.exit(1)},120000);
 try{
  browser=await chromium.launch();const context=await browser.newContext(),page=await context.newPage(),external=[],errors=[];
  page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))external.push(r.url())});
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}))});
  await context.setOffline(true);await page.reload();
  await page.waitForFunction(()=>window.constructionAIUploadDrawing&&document.getElementById('sheetSelector').options.length);
  await page.evaluate(async bytes=>{
   window.constructionAIPreviewStartup('return');
   await window.constructionAIUploadDrawing(new File([Uint8Array.from(bytes)],'synthetic-two-page.pdf',{type:'application/pdf'}),{drawingType:'floor-plan',pages:'2'});
   window.constructionAIShowTab('drawings');
   window.Tesseract={createWorker:async()=>{throw Error('Native PDF must not use image OCR')}};
  },Array.from(syntheticPDF()));
  const geometryBefore=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:wall|scale|3d|geometry)/i.test(k)).map(k=>[k,localStorage.getItem(k)])));
  await page.click('#scanDrawing');
  await page.waitForFunction(()=>document.getElementById('scanStatus').textContent.includes('native PDF text items saved for review'));
  const findings=await page.evaluate(()=>JSON.parse(localStorage.getItem('construction-ai-sheet-findings-v1'))[document.getElementById('sheetSelector').value]);
  assert.equal(findings.length,1);const f=findings[0];
  assert.equal(f.text,'1200 mm');assert.equal(f.source.page,2);assert.equal(f.confidence,null);assert.equal(f.source_kind,'pdf_embedded_text');
  assert.equal(f.source.filename,'synthetic-two-page.pdf');assert.equal(f.dimension_evidence.measurement.metres,1.2);
  assert.equal(f.dimension_evidence.association_status,'candidate_unverified');
  const geometryAfter=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:wall|scale|3d|geometry)/i.test(k)).map(k=>[k,localStorage.getItem(k)])));
  assert.deepEqual(geometryAfter,geometryBefore);
  await page.getByRole('button',{name:'Review 1200 mm',exact:true}).click({force:true});
  await page.waitForSelector('.dimension-evidence-overlay line',{state:'attached'});
  const original=await page.evaluate(()=>window.ConstructionDimensionScan.capture(document.getElementById('sheetSelector').value));
  await replaceRaster(page,'white');
  await page.getByRole('button',{name:'Review 1200 mm',exact:true}).click({force:true});
  assert.equal(await page.locator('.dimension-evidence-overlay').count(),0,'A replacement must hide old source geometry');
  assert.match(await page.locator('#dimensionEvidenceDetails').innerText(),/source has changed/);
  const previous=await page.evaluate(()=>localStorage.getItem('construction-ai-sheet-findings-v1'));
  await page.evaluate(()=>{
   window.Tesseract={createWorker:async()=>({recognize:()=>new Promise(resolve=>{window.finishSyntheticOCR=resolve}),terminate:async()=>{}})};
  });
  await page.click('#scanDrawing');await page.waitForFunction(()=>!!window.finishSyntheticOCR);
  const snapshot=await page.evaluate(()=>window.ConstructionDimensionScan.capture(document.getElementById('sheetSelector').value));
  await replaceRaster(page,'#eeeeee'); // Exact same name, lastModified and dimensions.
  const replaced=await page.evaluate(()=>window.ConstructionDimensionScan.capture(document.getElementById('sheetSelector').value));
  assert.notEqual(snapshot.source.sha256,replaced.source.sha256);
  assert.equal(snapshot.source.filename,replaced.source.filename);assert.equal(snapshot.source.width_px,replaced.source.width_px);
  assert.notEqual(original.source.sha256,replaced.source.sha256);
  await page.evaluate(()=>window.finishSyntheticOCR({data:{lines:[{text:'12 FEET',confidence:95,bbox:{x0:100,y0:100,x1:200,y1:130}}]}}));
  await page.waitForFunction(()=>document.getElementById('scanStatus').textContent.includes('source or room changed'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('construction-ai-sheet-findings-v1')),previous);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log('PASS: offline native PDF page 2, source-linked spans, unchanged calibration/walls, replaced-source overlay hidden, same-name/same-size late OCR discarded, saved reviews retained.');
 }finally{clearTimeout(watchdog);await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
