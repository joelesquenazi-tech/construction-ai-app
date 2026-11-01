// Touch-capable Chromium, synthetic source and controlled scanner predictions.
// Existing offline-ocr.cjs separately exercises actual model recognition.
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path'),os=require('os'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'dimension-check-'));
const mime={'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.css':'text/css','.html':'text/html','.json':'application/json'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,url.pathname==='/'?'index.html':'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))return res.writeHead(404).end();try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}});
async function tapSource(page,x,y){
 await page.locator('#dimensionCheckViewport').scrollIntoViewIfNeeded();
 const box=await page.locator('#dimensionCheckImage').boundingBox();
 await page.touchscreen.tap(box.x+x*box.width/800,box.y+y*box.height/500);
}
async function label(page,x,y){await page.click('#dimensionCheckLabel');await tapSource(page,x,y);await tapSource(page,x+60,y+14)}
async function open(page){await page.evaluate(()=>{window.constructionAIPreviewStartup('return');window.constructionAIShowTab('drawings');document.querySelector('.dimension-check-intake').open=true});await page.click('#dimensionCheckOpen');await page.waitForFunction(()=>document.getElementById('dimensionCheckStatus').textContent.includes('Automatic findings are hidden'))}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const timeout=setTimeout(()=>{console.error('Accuracy-check browser test exceeded 150 seconds');process.exit(1)},150000);
 try{
  browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:834,height:1112},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage(),errors=[],external=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))external.push(r.url())});
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}))});
  await ctx.setOffline(true);await page.reload();await page.waitForFunction(()=>window.constructionAIUploadDrawing);
  const source=await page.evaluate(async()=>{
   const c=document.createElement('canvas');c.width=800;c.height=500;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,800,500);x.fillStyle='black';x.font='16px Arial';x.fillText('12 FEET',300,54);x.fillText('6 FEET',300,129);x.strokeStyle='black';x.beginPath();x.moveTo(50,80);x.lineTo(700,80);x.moveTo(50,65);x.lineTo(50,100);x.moveTo(700,65);x.lineTo(700,100);x.stroke();
   const blob=await new Promise(r=>c.toBlob(r));await window.constructionAIUploadDrawing(new File([blob],'synthetic-accuracy.png',{type:'image/png'}),{drawingType:'floor-plan'});
   const snapshot=await window.ConstructionDimensionScan.capture(document.getElementById('sheetSelector').value);
   window.constructionAIImportFindings(snapshot.source.sheet_id,[{id:'controlled-prediction',text:'12 FEET',x:300,y:40,bbox:{x:300,y:40,width:60,height:14},source:snapshot.source,status:'rejected',correction:'13 FEET',source_kind:'raster_ocr',confidence:95,dimension_evidence:{association_status:'candidate_unverified',axis:'h',points_px:[[50,80],[700,80]],geometry_status:'unverified'}}]);
   return snapshot.source;
  });
  const before=await page.evaluate(()=>JSON.stringify(localStorage));
  await open(page);
  assert.match(await page.locator('#dimensionCheckCount').innerText(),/0 independent/);
  assert.equal(await page.locator('#dimensionCheckOverlay [data-prediction]').count(),0);
  assert.equal(await page.locator('#dimensionCheckRun').isEnabled(),false);
  await page.click('#dimensionCheckRegion');await tapSource(page,20,20);await tapSource(page,720,180);await page.click('#dimensionCheckUseRegion');
  await page.waitForFunction(()=>document.getElementById('dimensionCheckCount').textContent.includes('1 test area'));
  await page.click('#dimensionCheckAdd');await page.click('#dimensionCheckLabel');await tapSource(page,290,40);await tapSource(page,360,54);
  await page.click('#dimensionCheckZoomIn');await page.locator('#dimensionCheckViewport').scrollIntoViewIfNeeded();
  const imageBox=await page.locator('#dimensionCheckImage').boundingBox(),client=await ctx.newCDPSession(page);
  const point=(x,y)=>({x:imageBox.x+x*imageBox.width/800,y:imageBox.y+y*imageBox.height/500});
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(290,40)]});
  assert.equal(await page.locator('#dimensionCheckLens').isVisible(),true);
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(300,40)]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await client.detach();await page.click('#dimensionCheckFit');
  await page.click('#dimensionCheckSpan');await tapSource(page,50,80);await tapSource(page,700,80);
  await page.fill('#dimensionCheckFeet','12');await page.click('#dimensionCheckSaveReading');
  await page.waitForFunction(()=>document.getElementById('dimensionCheckCount').textContent.includes('1 independent'));
  await page.click('#dimensionCheckAdd');await label(page,300,115);await page.selectOption('#dimensionCheckAxis','none');await page.fill('#dimensionCheckFeet','6');await page.click('#dimensionCheckSaveReading');
  await page.waitForFunction(()=>document.getElementById('dimensionCheckCount').textContent.includes('2 independent'));
  await page.selectOption('#dimensionCheckKind','synthetic');await page.fill('#dimensionCheckLabelTolerance','5');await page.fill('#dimensionCheckEndpointTolerance','3');
  await page.check('#dimensionCheckExhaustive');await page.check('#dimensionCheckIndependent');await page.click('#dimensionCheckConfirm');
  await page.waitForFunction(()=>document.getElementById('dimensionCheckRun').disabled===false);
  await page.click('#dimensionCheckRun');await page.waitForFunction(()=>document.getElementById('dimensionCheckResults').textContent.includes('Measurement readings:'));
  const result=await page.locator('#dimensionCheckResults').innerText();assert.match(result,/Measurement readings: 1 matched · 1 missed · 0 extra/);assert.match(result,/recall 50\.0%/);assert.match(result,/Dimension spans: 1 matched/);
  const downloadPromise=page.waitForEvent('download');await page.click('#dimensionCheckExport');const download=await downloadPromise,bundle=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(bundle.truth.dimensions.length,2);assert.equal(bundle.truth.annotation_method,'manual_source_only');assert.equal(bundle.prediction_packet.findings.length,1);assert.equal(bundle.report.ready_for_verified_3d,false);
  assert.equal(bundle.prediction_packet.findings[0].status,'rejected');assert.equal(bundle.report.text_readings.true_positive,1,'Human correction must not change the automatic score');
  for(const p of bundle.truth.dimensions[0].points_px)assert(Math.abs(p[1]-80)<1);
  assert(Math.abs(bundle.truth.dimensions[0].label_box_px.x-300)<1,'Zoomed touch drag must retain original source coordinates');
  bundle.report.text_readings.true_positive=999;const file=path.join(temp,'bundle.json');fs.writeFileSync(file,JSON.stringify(bundle));
  const cli=JSON.parse(execFileSync(process.execPath,[path.join(root,'tools/evaluate-dimensions.cjs'),file],{encoding:'utf8'}));assert.equal(cli.text_readings.true_positive,1,'CLI must recompute rather than trust a cached report');
  const remove=page.locator('#dimensionCheckDimensions button').last();await remove.click();await page.waitForFunction(()=>document.getElementById('dimensionCheckRun').disabled);await page.click('#dimensionCheckUndo');await page.waitForFunction(()=>document.getElementById('dimensionCheckRun').disabled===false);
  if(process.env.CHECK_SCREENSHOT)await page.screenshot({path:process.env.CHECK_SCREENSHOT,fullPage:true});
  await page.click('#dimensionCheckClose');await page.reload();await page.waitForFunction(()=>window.constructionAIUploadDrawing&&document.getElementById('sheetSelector').options.length);
  await page.evaluate(()=>{window.constructionAIPreviewStartup('return');window.constructionAIShowTab('library')});await page.selectOption('#sheetSelector',source.sheet_id);await page.waitForFunction(id=>window.constructionAIDimensionSource?.sheet_id===id,source.sheet_id);await open(page);
  assert.match(await page.locator('#dimensionCheckCount').innerText(),/2 independent/);assert.equal(await page.locator('#dimensionCheckRun').isEnabled(),true);
  // An optimistic revision guard prevents one tab overwriting a newer check.
  await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('construction-ai-dimension-checks-v1',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('sessions','readwrite'),store=tx.objectStore('sessions'),q=store.openCursor();q.onsuccess=()=>{const cursor=q.result;if(cursor){const v=cursor.value;v.revision++;cursor.update(v)}};tx.oncomplete=()=>{db.close();resolve()}}}));
  await page.locator('#dimensionCheckDimensions button').last().click();await page.waitForFunction(()=>document.getElementById('dimensionCheckStatus').textContent.includes('another tab'));
  assert.match(await page.locator('#dimensionCheckCount').innerText(),/2 independent/);
  await page.click('#dimensionCheckClose');
  const current=await page.evaluate(()=>window.constructionAIProjects.current());
  await page.evaluate(()=>{const p=window.constructionAIProjects,id=p.createProject('Synthetic separate project'),room=p.createRoom(id,'Other room');p.selectWorkspace(id,room)});
  await page.waitForFunction(()=>document.getElementById('sheetSelector').options.length===0);
  await page.evaluate(value=>window.constructionAIProjects.selectWorkspace(value.projectId,value.roomId),current);
  await page.waitForFunction(()=>document.getElementById('sheetSelector').options.length>1);
  await page.evaluate(()=>window.constructionAIShowTab('library'));await page.selectOption('#sheetSelector',source.sheet_id);await open(page);
  await page.evaluate(()=>{const p=window.constructionAIProjects,id=p.createProject('Synthetic switch while open'),room=p.createRoom(id,'Switch test');p.selectWorkspace(id,room)});
  await page.waitForFunction(()=>!document.getElementById('dimensionCheckDialog').open);
  // Restore the original context and verify readings/model stores were untouched.
  await page.evaluate(value=>window.constructionAIProjects.selectWorkspace(value.projectId,value.roomId),current);
  const original=JSON.parse(before),after=await page.evaluate(()=>Object.assign({},localStorage));
  for(const [k,v]of Object.entries(original))if(/(?:findings|wall|scale|3d|geometry|batch1)/i.test(k))assert.equal(after[k],v,k);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS: offline touch annotation without copied proposals, imperial entry, independent missing dimension, exact scoring and recomputed CLI bundle, persistent annotations/Undo, tab revision guard, room isolation, unchanged detector reviews/geometry. Chromium touch emulation; physical iPad Safari remains open.');
 }finally{clearTimeout(timeout);await browser?.close();await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true})}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
