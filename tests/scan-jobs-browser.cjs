const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright'),{importFixture}=require('../tools/scan-performance-fixtures.cjs');
const root=path.resolve(__dirname,'..'),key='construction-ai-scan-jobs-v1';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=path.resolve(root,url.pathname==='/'?'index.html':'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep))return res.writeHead(404).end();
 try{const data=fs.readFileSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data)}
 catch{res.writeHead(404).end()}
});
const journal=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'[]')[0],key);
const findings=page=>page.evaluate(()=>localStorage.getItem('construction-ai-sheet-findings-v1'));
const done=(page,state)=>page.waitForFunction(([key,state])=>JSON.parse(localStorage.getItem(key)||'[]')[0]?.state===state&&!document.getElementById('scanDrawing').disabled,[key,state]);
async function select(page,id){
 await page.waitForFunction(()=>document.getElementById('sheetSelector').options.length);
 await page.evaluate(()=>{window.constructionAIPreviewStartup('return');window.constructionAIShowTab('library')});
 await page.selectOption('#sheetSelector',id);
 await page.waitForFunction(id=>window.constructionAIDimensionSource?.sheet_id===id,id);
 await page.evaluate(()=>window.constructionAIShowTab('drawings'));
}
async function stallWorker(page,name){
 await page.evaluate(name=>{
  const Worker=window.Worker;window.restoreTestWorker=()=>{window.Worker=Worker};
  window.testWorkerSent=false;window.testWorkerStopped=false;
  window.Worker=function(url,...options){
   if(!String(url).endsWith('/'+name))return new Worker(url,...options);
   return {postMessage(){window.testWorkerSent=true},terminate(){window.testWorkerStopped=true}};
  };
 },name);
}
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,errors=[],external=[];
 const browser=await chromium.launch();
 const timer=setTimeout(()=>{console.error('Scan jobs browser check timed out');process.exit(1)},140000);
 try{
  const context=await browser.newContext();
  function observe(page){
   page.on('pageerror',error=>errors.push(error.message));
   page.on('dialog',dialog=>dialog.accept());
   page.on('request',request=>{if(![origin+'/','blob:','data:'].some(p=>request.url().startsWith(p)))external.push(request.url())});
   return page;
  }
  const page=observe(await context.newPage());
  await page.goto(origin);
  await page.evaluate(async()=>{
   await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;
   if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));
  });
  await context.setOffline(true);await page.reload();
  await importFixture(page,'raster_ocr');
  await stallWorker(page,'scan-ocr-worker.js');
  await page.click('#scanDrawing');await page.waitForFunction(()=>window.testWorkerSent);
  assert.equal((await journal(page)).stage,'ocr_setup');
  await page.click('#cancelDrawingScan');await done(page,'cancelled');
  assert.equal(await page.evaluate(()=>window.testWorkerStopped),true);
  assert.equal(await findings(page),null);
  await page.evaluate(()=>window.restoreTestWorker());

  await importFixture(page,'pdf_embedded_text');
  const id=await page.locator('#sheetSelector').inputValue();
  await page.click('#scanDrawing');await done(page,'complete');
  const saved=await findings(page);assert(saved?.includes('12 FEET'));
  await stallWorker(page,'dimension-scan-worker.js');
  await page.click('#scanDrawing');await page.waitForFunction(()=>window.testWorkerSent);
  const prior=await journal(page);assert.equal(prior.stage,'dimensions');
  const other=observe(await context.newPage());await other.goto(origin);await select(other,id);
  await other.click('#scanDrawing');
  await other.waitForFunction(()=>document.getElementById('scanStatus').textContent.includes('another tab'));
  assert.equal((await journal(other)).id,prior.id);
  assert.equal((await journal(other)).state,'running');
  await other.close();

  await page.reload();await select(page,id);
  await page.waitForSelector('#retryDrawingScan');
  const interrupted=await journal(page);assert.equal(interrupted.id,prior.id);assert.equal(interrupted.state,'interrupted');
  assert.equal(await findings(page),saved);
  await page.click('#retryDrawingScan');await done(page,'complete');
  assert.notEqual((await journal(page)).id,prior.id);assert.equal(await findings(page),saved);

  await stallWorker(page,'dimension-scan-worker.js');
  await page.click('#scanDrawing');await page.waitForFunction(()=>window.testWorkerSent);
  await page.reload();await select(page,id);
  await page.waitForSelector('#retryDrawingScan');
  await page.evaluate(async id=>{
   const canvas=document.createElement('canvas');
   canvas.width=window.constructionAIDimensionSource.width_px;canvas.height=window.constructionAIDimensionSource.height_px;
   const blob=await new Promise(r=>canvas.toBlob(r));
   await new Promise((resolve,reject)=>{
    const request=indexedDB.open('construction-ai-private-drawings',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
     const db=request.result,tx=db.transaction('images','readwrite');tx.objectStore('images').put(blob,id);
     tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)};
    };
   });
  },id);
  await page.click('#retryDrawingScan');await done(page,'stale');
  assert.match(await page.locator('#scanStatus').textContent(),/scan version has changed/);
  assert.equal(await findings(page),saved);assert.equal(await page.locator('#retryDrawingScan').isVisible(),false);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS: offline cancellation terminates OCR setup, two tabs cannot scan concurrently, interrupted scan restarts explicitly, changed raster rejects restart, saved findings preserved.');
 }finally{clearTimeout(timer);await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
