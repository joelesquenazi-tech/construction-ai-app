// Run: node tests/settings-refresh.cjs (Playwright, Chromium, and OpenSSL required).
// Uses only generated synthetic data on an ephemeral loopback HTTPS server.
const {chromium, devices}=require('playwright');
const fs=require('fs'),https=require('https'),path=require('path'),os=require('os');
const {execFileSync}=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'construction-ai-test-'));
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',scratch+'/key','-out',scratch+'/cert','-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
let old=true,failUpdate=false,failAsset=false;
const server=https.createServer({key:fs.readFileSync(scratch+'/key'),cert:fs.readFileSync(scratch+'/cert')},(req,res)=>{
 const u=new URL(req.url,'https://localhost');let file=u.pathname.replace(/^\/construction-ai-app\//,'');
 if(file===u.pathname||file.includes('..')){res.writeHead(404).end();return;}if(!file)file='index.html';
 if(failAsset&&file==='settings.js'){res.writeHead(503).end();return;}
 if(failUpdate&&file==='sw.js'){res.writeHead(503).end();return;}
 try{let data=fs.readFileSync(path.join(root,file));
 if(old&&file==='sw.js')data=Buffer.from("self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));");
 if(file==='index.html')data=Buffer.from(data.toString().replace('<html ',`<html data-test-deployed="${old?'old':'new'}" `));
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404).end();}
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--ignore-certificate-errors']});
try{const context=await browser.newContext({...devices['iPad (gen 7)'],ignoreHTTPSErrors:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const url=`https://127.0.0.1:${server.address().port}/construction-ai-app/`;
 await page.goto(url);await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
 await page.getByRole('button',{name:'Settings',exact:true}).click();assert(await page.locator('#settingsPanel').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('#settingsPanel').isVisible(),false);
 await page.locator('#drawingImport').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:fs.readFileSync(root+'/icons/icon-192.png')});
 await page.waitForFunction(()=>document.querySelector('#sheet').naturalWidth===192);
 await page.locator('.marker').first().click();await page.fill('#correction','synthetic verified reading');await page.fill('#reviewNote','preserve this decision');await page.click('#confirm');
 await page.fill('#reviewNote','unsaved review');await page.click('#openSettings');page.once('dialog',d=>d.dismiss());await page.click('#settingsRefresh');assert.match(await page.locator('#refreshStatus').innerText(),/cancelled/);await page.click('#closeSettings');assert.equal(await page.inputValue('#reviewNote'),'unsaved review');await page.fill('#reviewNote','preserve this decision');
 await page.click('[data-tab="records"]');await page.fill('[name="stoneThickness"]','1.25');await page.fill('[name="projectNotes"]','synthetic saved record');await page.click('#recordForm button');
 const before=await page.evaluate(()=>localStorage.getItem('construction-ai-batch1-v1'));
 await page.fill('[name="projectNotes"]','unsaved record');await page.click('#openSettings');page.once('dialog',d=>d.dismiss());await page.click('#settingsRefresh');assert.match(await page.locator('#refreshStatus').innerText(),/cancelled/);await page.click('#closeSettings');await page.fill('[name="projectNotes"]','synthetic saved record');
 await page.click('#openSettings');await context.setOffline(true);await page.click('#settingsRefresh');await page.waitForFunction(()=>document.querySelector('#refreshStatus').textContent.includes('offline'));assert.equal(await page.locator('#settingsRefresh').isEnabled(),true);await context.setOffline(false);
 failUpdate=true;await page.click('#settingsRefresh');await page.waitForFunction(()=>document.querySelector('#refreshStatus').dataset.error==='true');assert.match(await page.locator('#refreshStatus').innerText(),/Refresh failed/);failUpdate=false;
 old=false;failAsset=true;
 await page.click('#settingsRefresh');await page.waitForFunction(()=>document.querySelector('#refreshStatus').dataset.error==='true');assert.match(await page.locator('#refreshStatus').innerText(),/could not install/);assert.equal(await page.locator('html').getAttribute('data-test-deployed'),'old');failAsset=false;
 await Promise.all([page.waitForEvent('load'),page.click('#settingsRefresh')]);
 assert.equal(await page.locator('html').getAttribute('data-test-deployed'),'new');assert.equal(await page.evaluate(()=>localStorage.getItem('construction-ai-batch1-v1')),before);
 await page.waitForFunction(()=>document.querySelector('#sheet').naturalWidth===192);assert.equal(await page.locator('#confirmed').innerText(),'1');
 const files=await page.evaluate(async()=>{const c=await caches.open('construction-ai-shell-v1-2-2');return(await c.keys()).map(r=>r.url)});assert.equal(files.length,10);
 await page.click('[data-tab="records"]');assert.equal(await page.inputValue('[name="projectNotes"]'),'synthetic saved record');
 // No-update refresh also reloads successfully, without a confirmation after saving.
 await page.click('#openSettings');await Promise.all([page.waitForEvent('load'),page.click('#settingsRefresh')]);
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>document.querySelector('#sheet').naturalWidth===192);assert.equal(await page.evaluate(()=>localStorage.getItem('construction-ai-batch1-v1')),before);
 await page.click('#openSettings');assert(await page.locator('#settingsRefresh').isVisible());
 assert.deepEqual(errors,[]);console.log('PASS: Chromium with iPad viewport/touch emulation (not Safari): settings keyboard/touch-sized UI, dirty review and record cancellation, offline, HTTP update, and failed-precache errors/retry, new-worker control before reload, latest deployed shell, no-update refresh, all 10 assets offline, exact saved data and synthetic drawing preservation.');
 await context.close();
}finally{await browser.close();server.close();fs.rmSync(scratch,{recursive:true,force:true})}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
