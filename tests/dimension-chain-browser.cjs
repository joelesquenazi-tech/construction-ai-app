// Native PDF text plus actual raster pixels for a long/short tick-ended chain.
// No private drawings, truth coordinates or model output are included.
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),{evaluate}=require('../dimension-evaluation.js');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.html':'text/html','.json':'application/json'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,url.pathname==='/'?'index.html':'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))return res.writeHead(404).end();try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}});
function pdf(){
 const marks=[50,500,504],tick=p=>`${p-.7} 269.3 m ${p+.7} 270.7 l S`;
 const stream=`.25 w 50 270 m 504 270 l S ${marks.map(tick).join(' ')} BT /F1 2.5 Tf 250 275 Td (12 FEET) Tj ET BT /F1 1.2 Tf 501.4 271.6 Td (6") Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let text='%PDF-1.4\n',offsets=[];for(const [i,o]of objects.entries()){offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${o}\nendobj\n`}
 const start=Buffer.byteLength(text);text+=`xref\n0 6\n0000000000 65535 f \n`;for(const n of offsets)text+=String(n).padStart(10,'0')+' 00000 n \n';
 return Buffer.from(text+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const deadline=setTimeout(()=>{console.error('Dimension-chain test exceeded 120 seconds');process.exit(1)},120000);
 try{
  browser=await chromium.launch();const context=await browser.newContext(),page=await context.newPage(),external=[],errors=[];page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))external.push(r.url())});
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}))});
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.constructionAIUploadDrawing&&document.getElementById('sheetSelector').options.length);
  await page.evaluate(async bytes=>{
   window.constructionAIPreviewStartup('return');await window.constructionAIUploadDrawing(new File([Uint8Array.from(bytes)],'synthetic-dimension-chain.pdf',{type:'application/pdf'}),{drawingType:'elevation'});window.constructionAIShowTab('drawings');
   window.Tesseract={createWorker:async()=>{throw Error('Embedded PDF text must not use image OCR')}};
  },Array.from(pdf()));
  const before=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:wall|scale|3d|geometry)/i.test(k)).map(k=>[k,localStorage.getItem(k)])));
  await page.click('#scanDrawing');await page.waitForFunction(()=>document.getElementById('scanStatus').textContent.includes('native PDF text items saved for review'));
  const findings=await page.evaluate(()=>JSON.parse(localStorage.getItem('construction-ai-sheet-findings-v1'))[document.getElementById('sheetSelector').value]);
  assert.equal(findings.length,2);assert(findings.every(f=>f.status==='pending'&&f.source_kind==='pdf_embedded_text'&&f.confidence===null));
  const source=findings[0].source;assert.equal(source.width_px,2400);assert.equal(source.height_px,1600);
  const truth={schema:'site-resolved-dimension-truth-v1',dataset_kind:'synthetic',source,coverage:{type:'full_page',exhaustively_annotated:true},label_tolerance_px:5,endpoint_tolerance_px:3,dimensions:[
   {id:'long-span',metres:3.6576,label_box_px:{x:1000,y:490,width:42,height:10},axis:'h',points_px:[[200,520],[2000,520]]},
   {id:'short-span',metres:.1524,label_box_px:{x:2005.6,y:508.8,width:4.5,height:4.8},axis:'h',points_px:[[2000,520],[2016,520]]}
  ]};
  const result=evaluate({source,findings},truth);assert.equal(result.dimension_spans.true_positive,2,JSON.stringify({result,evidence:findings.map(f=>f.dimension_evidence)}));assert.equal(result.dimension_spans.false_positive,0);assert.equal(result.dimension_spans.false_negative,0);
  for(const f of findings){const e=f.dimension_evidence;assert.equal(e.algorithm_version,2);assert.equal(e.geometry_status,'unverified');assert.deepEqual(e.analysis_raster,{width_px:2400,height_px:1600});assert.equal(e.endpoint_evidence.length,2);assert(e.endpoint_evidence.every(p=>p.kinds.includes('diagonal_tick')))}
  const short=findings.find(f=>f.dimension_evidence.measurement.metres===.1524);assert(short.dimension_evidence.points_px[1][0]-short.dimension_evidence.points_px[0][0]<20,'Short member must not stretch onto the whole chain');
  await page.getByRole('button',{name:'Review '+short.text,exact:true}).click({force:true});await page.waitForSelector('.dimension-evidence-overlay line',{state:'attached'});assert.match(await page.locator('#dimensionEvidenceDetails').innerText(),/endpoint markers/);
  const after=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/(?:wall|scale|3d|geometry)/i.test(k)).map(k=>[k,localStorage.getItem(k)])));
  assert.deepEqual(after,before);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.equal(result.ready_for_verified_3d,false);
  console.log('PASS: offline real PDF rendering/text, tick-ended long and short chain members matched, original-pixel support retained, no external requests, calibration/walls unchanged; all geometry unverified.');
 }finally{clearTimeout(deadline);await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
