const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium,webkit}=require('playwright'),fixture=require('../tools/automatic-room-fixtures.cjs');
const safari=process.env.TEST_BROWSER==='webkit',root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json'};
let offline=false;
const server=http.createServer((req,res)=>{
 if(offline){req.socket.destroy();return}
 const url=new URL(req.url,'http://localhost'),file=path.resolve(root,url.pathname==='/'?'index.html':'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep))return res.writeHead(404).end();
 try{const bytes=fs.readFileSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(bytes)}catch{res.writeHead(404).end()}
});
const saved=page=>page.evaluate(()=>{
 const c=window.constructionAIProjects.current();return JSON.parse(localStorage.getItem('construction-ai-automatic-room-v1:'+c.projectId+':'+c.roomId)||'null');
});
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await (safari?webkit:chromium).launch(),timer=setTimeout(()=>{console.error('Automatic room test timed out');process.exit(1)},150000);
 try{
  const context=await browser.newContext({viewport:{width:1024,height:1366},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[],external=[],dialogs=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());void d.dismiss()});
  page.on('request',r=>{if(![origin+'/','blob:','data:'].some(p=>r.url().startsWith(p)))external.push(r.url())});
  await page.goto(origin);
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}))});
  if(safari)offline=true;else await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(()=>window.constructionAIUploadDrawing&&window.ConstructionAutomaticPipeline);
  await page.evaluate(()=>{const build=window.ConstructionAutomaticRoom.build;window.ConstructionAutomaticRoom.build=input=>{window.roomDebug=input;return build(input)};window.constructionAIPreviewStartup('return');window.constructionAIShowTab('model3d')});
  await page.locator('#modelFloorFile').setInputFiles({name:'floor.pdf',mimeType:'application/pdf',buffer:fixture.floor()});
  await page.waitForFunction(()=>document.getElementById('modelFloorFile').value==='');
  await page.locator('#modelElevationFiles').setInputFiles({name:'elevation.pdf',mimeType:'application/pdf',buffer:fixture.elevation()});
  await page.waitForFunction(()=>!document.getElementById('modelContinue').disabled);
  await page.click('#modelContinue');
  await page.waitForFunction(()=>/generated automatically|finished with unresolved|could not complete|could not start/.test(document.getElementById('automaticRoomStatus').textContent),null,{timeout:120000});
  const result=await saved(page);
  if(result?.report?.status!=='preliminary')console.error('Synthetic auto debug:',await page.locator('#automaticRoomStatus').textContent(),JSON.stringify(await page.evaluate(()=>window.roomDebug)));
  assert.equal(result?.report?.status,'preliminary',JSON.stringify(result));assert.equal(result.report.walls.length,4);
  for(const [key,n]of Object.entries({length:3.048,width:2.4384,height:2.7432}))assert(Math.abs(result.report.clear_dimensions_m[key]-n)<.01,key);
  assert.equal(await page.locator('#automaticRoomScene polygon').count(),20);
  assert.equal(await page.locator('#manualModelTools').getAttribute('open'),null);
  assert.deepEqual(dialogs,[],'No tracing, calibration or replacement questions are required');
  const untouched=await page.evaluate(()=>({calibration:JSON.parse(localStorage.getItem(window.constructionAI3DScaleEvidenceStore.scope())||'{}').calibration,findings:localStorage.getItem('construction-ai-sheet-findings-v1'),traces:Object.keys(localStorage).filter(k=>k.startsWith('construction-ai-traced-walls-v1:'))}));
  assert.equal(untouched.calibration,null);assert.equal(untouched.findings,null);assert.deepEqual(untouched.traces,[]);
  // A valid saved result reopens without rerunning recognition; hashes are rechecked.
  await page.reload();await page.waitForFunction(()=>window.ConstructionAutomaticPipeline);
  await page.evaluate(()=>{window.ConstructionAutomaticPipeline.run=async()=>{throw Error('Unchanged result should reopen from saved evidence')};window.constructionAIPreviewStartup('return');window.constructionAIShowTab('model3d')});
  await page.waitForFunction(()=>document.getElementById('automaticRoomStatus').textContent.includes('generated automatically'));
  assert.equal((await saved(page)).fingerprint,result.fingerprint);
  await page.reload();await page.waitForFunction(()=>window.ConstructionAutomaticPipeline);
  await page.evaluate(()=>{window.constructionAIPreviewStartup('return');window.constructionAIShowTab('model3d')});
  await page.waitForFunction(()=>document.getElementById('automaticRoomStatus').textContent.includes('generated automatically'));
  // Cancellation during line processing must terminate the worker and preserve saved evidence.
  await page.evaluate(()=>{
   const Native=window.Worker;window.restoreRoomWorker=()=>{window.Worker=Native};
   window.roomWorkerStarted=false;window.roomWorkerStopped=false;
   window.Worker=function(url,...args){
    if(!String(url).endsWith('/automatic-room-worker.js'))return new Native(url,...args);
    return {postMessage(){window.roomWorkerStarted=true},terminate(){window.roomWorkerStopped=true}};
   };
  });
  await page.click('#automaticRoomRetry');await page.waitForFunction(()=>window.roomWorkerStarted);
  await page.click('#automaticRoomCancel');
  await page.waitForFunction(()=>document.getElementById('automaticRoomStatus').textContent.includes('analysis stopped'));
  assert.equal(await page.evaluate(()=>window.roomWorkerStopped),true);
  assert.equal((await saved(page)).fingerprint,result.fingerprint);
  assert.deepEqual((await saved(page)).report,result.report);
  await page.evaluate(()=>window.restoreRoomWorker());
  // Adding contradictory elevation evidence automatically invalidates the saved shell.
  await page.click('#modelChangeFiles');
  await page.locator('#modelElevationFiles').setInputFiles({name:'other-elevation.pdf',mimeType:'application/pdf',buffer:fixture.elevation(10)});
  await page.waitForFunction(()=>document.getElementById('modelElevationFiles').value==='');
  await page.click('#modelContinue');
  await page.waitForFunction(()=>document.getElementById('automaticRoomIssues').textContent.includes('height notes disagree'),null,{timeout:120000});
  assert.equal((await saved(page)).report.status,'unresolved');assert.equal(await page.locator('#automaticRoomScene polygon').count(),0);
  assert.deepEqual(dialogs,[]);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log('PASS: offline real PDFs automatically produce an unverified source-backed shell without manual input; saved reopening, worker cancellation and conflicting elevation invalidation; no external requests.');
 }finally{clearTimeout(timer);await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
