// Synthetic end-to-end test: real local HTTP adapter, simulated model output.
// NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node tests/vision-browser.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=spawn('python3',['-u','-c',
  "import sys;sys.path.insert(0,'local-engine');from vision_server import VisionServer;from test_vision_server import FakeEngine;s=VisionServer(('127.0.0.1',0),FakeEngine());print(s.server_address[1],flush=True);s.serve_forever()"],{cwd:root,stdio:['ignore','pipe','inherit']});
(async()=>{
 let browser;
 try{
  const port=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(Number(d.toString().trim())));server.once('error',reject);server.once('exit',()=>reject(Error('Test server stopped')))});
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1024,height:768}});
  const page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const u=route.request().url();
   if(!u.startsWith(`http://127.0.0.1:${port}`)&&!u.startsWith('blob:')&&!u.startsWith('data:')){external.push(u);return route.abort()}
   return route.continue();
  });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(()=>window.constructionAIUploadDrawing&&window.constructionAIGetVisionSource);
  await page.evaluate(async()=>{
   const c=document.createElement('canvas');c.width=800;c.height=600;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,800,600);ctx.fillStyle='black';ctx.fillRect(80,100,500,8);ctx.fillRect(80,120,500,8);
   const blob=await new Promise(r=>c.toBlob(r,'image/png'));
   await window.constructionAIUploadDrawing(new File([blob],'synthetic-plan.png',{type:'image/png'}),{drawingType:'floor-plan'});
   window.constructionAIPreviewStartup('return');window.constructionAIShowTab('interpret');
   localStorage.setItem('construction-ai-wall-traces-v1:sentinel','existing wall correction');
  });
  const previous=await page.evaluate(()=>({walls:localStorage.getItem('construction-ai-wall-traces-v1:sentinel'),ocr:localStorage.getItem('construction-ai-batch1-v1')}));
  await page.click('#visionLoad');
  await page.waitForFunction(()=>!document.getElementById('visionRun').disabled);
  await page.fill('#visionRevision','R1');await page.locator('#visionRun').focus();
  await page.click('#visionCheck');await page.waitForFunction(()=>document.getElementById('visionStatus').textContent.includes('Local model ready'));
  const bounds=await page.locator('#visionCanvas').boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.25,bounds.y+bounds.height*.25);await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width*.75,bounds.y+bounds.height*.75);await page.mouse.up();
  await page.click('#visionRun');
  await page.waitForFunction(()=>document.getElementById('visionResults').textContent.includes('Possible wall'));
  let runs=await page.evaluate(()=>JSON.parse(localStorage.getItem('construction-ai-vision-runs-v1')));
  assert.equal(runs.length,1);assert.equal(runs[0].source.revision,'R1');
  assert(Math.abs(runs[0].source.crop.x-200)<2);assert(Math.abs(runs[0].proposals[0].bbox.x-204)<2);
  assert.equal(runs[0].proposals[0].geometryState,'not_modeled');
  await page.getByRole('button',{name:'Not correct',exact:true}).click();
  await page.click('#visionRun');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('construction-ai-vision-runs-v1')).length===2);
  runs=await page.evaluate(()=>JSON.parse(localStorage.getItem('construction-ai-vision-runs-v1')));
  assert.equal(runs[0].proposals[0].reviewState,'rejected');
  assert.equal(runs[1].proposals[0].reviewState,'unreviewed');
  assert.deepEqual(await page.evaluate(()=>({walls:localStorage.getItem('construction-ai-wall-traces-v1:sentinel'),ocr:localStorage.getItem('construction-ai-batch1-v1')})),previous);
  // A later request must not attach its response to a different room.
  let release,intercepted;
  const received=new Promise(r=>intercepted=r);
  await page.route('**/api/vision/analyze',async route=>{await new Promise(r=>{release=r;intercepted()});await route.continue().catch(()=>{})});
  await page.click('#visionRun');await received;
  await page.evaluate(()=>window.dispatchEvent(new Event('construction-room-change')));
  release();await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('construction-ai-vision-runs-v1')).length),2);
  assert.equal(await page.locator('#visionResults').textContent(),'');
  // Reload restores saved proposals under their original source/revision.
  await page.unroute('**/api/vision/analyze');
  await page.reload();await page.evaluate(()=>{window.constructionAIPreviewStartup('return');window.constructionAIShowTab('interpret')});
  await page.waitForFunction(()=>document.querySelector('#sheetSelector').options.length>1);
  await page.selectOption('#sheetSelector',runs[0].source.sheetId);
  await page.waitForFunction(async expected=>(await window.constructionAIGetVisionSource())?.metadata.id===expected,runs[0].source.sheetId);
  await page.click('#visionLoad');await page.waitForFunction(()=>!document.querySelector('#visionRun').disabled);
  await page.fill('#visionRevision','R1');await page.locator('#visionRun').focus();
  await page.selectOption('#visionHistory',runs[0].id);
  assert.match(await page.locator('#visionResults').innerText(),/rejected/);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS: source import, region mapping, local HTTP inference, separate proposal persistence, rejected decisions survive reruns/reload, late response discarded on room change, existing OCR/walls unchanged, no external browser requests. Simulated model; no accuracy claim.');
 }finally{await browser?.close();server.kill()}
})().catch(error=>{console.error(error);process.exitCode=1;server.kill()});
