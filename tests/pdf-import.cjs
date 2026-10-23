// node tests/pdf-import.cjs; needs Playwright, Chromium, Python reportlab and OpenSSL.
// Creates synthetic PDFs at runtime. No drawing files are checked in or uploaded.
const {chromium,devices}=require('playwright');
const fs=require('fs'),https=require('https'),path=require('path'),os=require('os'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'construction-pdf-'));
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',temp+'/key','-out',temp+'/cert','-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
execFileSync('python',['-c',`from reportlab.pdfgen import canvas
from reportlab.lib.pdfencrypt import StandardEncryption
import sys
p=sys.argv[1]
c=canvas.Canvas(p+'/two.pdf',pagesize=(600,400))
for text in ['SYNTHETIC FIRST PAGE','SYNTHETIC SECOND PAGE']:
 c.setFont('Helvetica',22);c.drawString(50,240,text);c.rect(50,50,300,100);c.showPage()
c.save()
c=canvas.Canvas(p+'/locked.pdf',encrypt=StandardEncryption('test-only'));c.drawString(20,20,'synthetic');c.save()
`,temp]);
const types={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.wasm':'application/wasm','.png':'image/png'};
const server=https.createServer({key:fs.readFileSync(temp+'/key'),cert:fs.readFileSync(temp+'/cert')},(req,res)=>{let f=new URL(req.url,'https://localhost').pathname.replace(/^\/construction-ai-app\//,'');if(f.startsWith('/')||f.includes('..'))return res.writeHead(404).end();if(!f)f='index.html';try{const b=fs.readFileSync(path.join(root,f));res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(b)}catch{res.writeHead(404).end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--ignore-certificate-errors']});try{
 const context=await browser.newContext({...devices['iPad (gen 7)'],ignoreHTTPSErrors:true});
 const page=await context.newPage(),errors=[],external=[];page.setDefaultTimeout(15000);page.on('console',m=>{if(m.type()==='error')console.log('browser error:',m.text())});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('https://127.0.0.1')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))external.push(r.url())});
 await page.addInitScript(()=>{localStorage.setItem('construction-ai-workspace-confirmed-v1','yes')});
 const url=`https://127.0.0.1:${server.address().port}/construction-ai-app/`;await page.goto(url);console.log('loaded');await page.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('worker not ready')),15000))]));console.log('worker ready');await page.waitForFunction(()=>navigator.serviceWorker.controller);
 if(await page.locator('#workspaceContinue').isVisible())await page.click('#workspaceContinue');
 await page.waitForFunction(()=>document.querySelector('#sheetCount').textContent==='1');console.log('library ready');
 // Seed saved reviews/records to prove the import does not reset them.
 await page.evaluate(async()=>{const blob=await(await fetch('./icons/icon-192.png')).blob();await new Promise((resolve,reject)=>{const req=indexedDB.open('construction-ai-private-drawings',1);req.onsuccess=()=>{const db=req.result,tx=db.transaction('images','readwrite');tx.objectStore('images').put(blob,'A102');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})});
 const saved=await page.evaluate(()=>{const data={findings:window.INITIAL_FINDINGS,records:{stoneThickness:'1.25',projectNotes:'synthetic retained record'}};data.findings[0].status='confirmed';data.findings[0].correction='synthetic decision';localStorage.setItem('construction-ai-batch1-v1',JSON.stringify(data));return JSON.stringify(data)});
 await page.evaluate(()=>window.constructionAIShowTab('library'));
 await page.fill('#newSheetId','PDFTEST');await page.fill('#newSheetName','Synthetic test PDF');await page.locator('#newSheetFile').setInputFiles(temp+'/two.pdf');await page.click('#addSheetForm button[type=submit]');
 await page.waitForFunction(()=>document.querySelector('#libraryStatus').textContent.includes('2 PDF page(s) saved'));console.log('PDF rendered');
 await page.waitForFunction(()=>document.querySelector('#sheet').naturalWidth>0);
 const meta=await page.evaluate(()=>JSON.parse(localStorage.getItem('construction-ai-sheet-library-v1')));const pages=meta.filter(x=>x.sheetId.startsWith('PDFTEST'));assert.equal(pages.length,2);assert.deepEqual(pages.map(x=>x.pdfPage),[1,2]);assert.equal(pages[0].width,2400);assert.equal(pages[0].height,1600);assert.equal(pages[0].pdfSourceKey,pages[1].pdfSourceKey);
 assert.equal(await page.evaluate(()=>localStorage.getItem('construction-ai-batch1-v1')),saved);
 const source=await page.evaluate(async key=>{const r=indexedDB.open('construction-ai-private-drawings',1);return await new Promise(resolve=>r.onsuccess=()=>{const db=r.result,req=db.transaction('images').objectStore('images').get(key);req.onsuccess=async()=>{resolve({type:req.result.type,text:(await req.result.text()).slice(0,4)});db.close()}})},pages[0].pdfSourceKey);assert.equal(source.text,'%PDF');
 await page.selectOption('#sheetSelector',pages[1].id);await page.waitForFunction(id=>document.querySelector('#sheetSelector').value===id&&document.querySelector('#sheetTitle').textContent.includes('P2'),pages[1].id);
 const before=await page.evaluate(()=>localStorage.getItem('construction-ai-sheet-library-v1'));
 await page.fill('#newSheetId','BADPDF');await page.locator('#newSheetFile').setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF invalid synthetic data')});await page.click('#addSheetForm button[type=submit]');await page.waitForFunction(()=>/invalid|PDF|pdf/i.test(document.querySelector('#libraryStatus').textContent)&&!document.querySelector('#libraryStatus').textContent.includes('saved locally'));assert.equal(await page.evaluate(()=>localStorage.getItem('construction-ai-sheet-library-v1')),before);
 await page.locator('#newSheetFile').setInputFiles(temp+'/locked.pdf');await page.click('#addSheetForm button[type=submit]');await page.waitForFunction(()=>document.querySelector('#libraryStatus').textContent.includes('Password-protected'));assert.equal(await page.evaluate(()=>localStorage.getItem('construction-ai-sheet-library-v1')),before);
 await page.fill('#newSheetId','RANGE');await page.fill('#pdfPages','2');await page.locator('#newSheetFile').setInputFiles(temp+'/two.pdf');await page.click('#addSheetForm button[type=submit]');await page.waitForFunction(()=>document.querySelector('#libraryStatus').textContent.includes('1 PDF page(s) saved'));
 // Offline module/worker/font use in a fresh document, not just previously imported PNGs.
 await context.setOffline(true);await page.reload();if(await page.locator('#workspaceContinue').isVisible())await page.click('#workspaceContinue');await page.evaluate(()=>window.constructionAIShowTab('library'));await page.fill('#newSheetId','OFFLINE');await page.fill('#pdfPages','1');await page.locator('#newSheetFile').setInputFiles(temp+'/two.pdf');await page.click('#addSheetForm button[type=submit]');await page.waitForFunction(()=>document.querySelector('#libraryStatus').textContent.includes('1 PDF page(s) saved'));
 await page.reload();if(await page.locator('#workspaceContinue').isVisible())await page.click('#workspaceContinue');await page.evaluate(()=>window.constructionAIShowTab('library'));await page.selectOption('#sheetSelector',pages[0].id);await page.waitForFunction(()=>document.querySelector('#sheet').naturalWidth>0);assert.equal(await page.evaluate(()=>localStorage.getItem('construction-ai-batch1-v1')),saved);
 const legacySize=await page.evaluate(()=>new Promise(resolve=>{const req=indexedDB.open('construction-ai-private-drawings',1);req.onsuccess=()=>{const db=req.result,get=db.transaction('images').objectStore('images').get('A102');get.onsuccess=()=>{resolve(get.result.size);db.close()}}}));assert.equal(legacySize,fs.statSync(root+'/icons/icon-192.png').size);
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);console.log('PASS: two-page PDF rendered to separate sheets; page range; local original retained; saved reviews/records preserved; malformed/password PDF errors leave library unchanged; offline PDF import and reload; no external requests/page errors. Chromium iPad emulation, not Safari.');
 await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true})}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
