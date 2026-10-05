// One browser comparison per element count, CPU4; common UI with 005 versus 006 CORE.
import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/runtime.js':import.meta.url),{chromium}=require('playwright');
const candidates=[process.env.VDRAW_CHROMIUM,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium',chromium.executablePath()].filter(Boolean);let executable;
for(const file of candidates){try{if((await fs.stat(file)).size>1000){executable=file;break}}catch{}}
const output='evidence/performance-final-006.json';
if(!executable){await fs.writeFile(output,JSON.stringify({status:'BLOCKED',errorCode:'BROWSER_EXECUTABLE_UNAVAILABLE',attempts:0,repetitions:0,uiMeasurements:0,baselineUi166msNotReplacedByNodeValues:true},null,2)+'\n');console.log('BROWSER_PERFORMANCE = BLOCKED');process.exit(0)}
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'vdraw006-final-')),servers=[],rows=[],errors=[];let browser;
const stop=()=>{for(const s of servers)try{process.kill(-s.pid,'SIGKILL')}catch{}};
const deadline=setTimeout(()=>{stop();process.exit(124)},115000);
try{
 for(const phase of ['005','006']){
  const dir=path.join(folder,phase);await fs.mkdir(dir);await fs.cp('web',path.join(dir,'web'),{recursive:true});await fs.copyFile('serve.py',path.join(dir,'serve.py'));
  if(phase==='005')for(const name of ['core.js','commands.js','perf.js','history-codec.js'])await fs.copyFile('tests/baseline005/'+name,path.join(dir,'web/src',name));
  const server=spawn('python3',[path.join(dir,'serve.py'),'--port',phase==='005'?'4215':'4216'],{detached:true,stdio:'ignore'});servers.push(server);
 }
 browser=await chromium.launch({executablePath:executable,args:['--no-sandbox','--enable-precise-memory-info'],timeout:10000});
 for(const phase of ['005','006']){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+(phase==='005'?4215:4216),{timeout:10000});await page.waitForFunction(()=>window.VDRAW,{timeout:10000});assert.ok((await page.locator('body').innerText()).trim().length>20);
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  for(const count of [500,2000,5000]){
   const m=await page.evaluate(async count=>{const {project,element}=await import('./src/core.js');const d=project('performance '+count);d.sample=true;for(let i=0;i<count;i++)d.pages[0].elements.push(element(i%9===0?'line':'rect','synthetic',{x:20+i%100*11,y:20+Math.floor(i/100)*14,w:8,h:i%9===0?0:9,fill:i%9===0?'none':'#BACFC7',strokeWidth:1}));VDRAW.begin(d);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {id:d.id,elements:count}},count);m.phase=phase;
   await page.locator('[data-action=fit]').click();const pos=await page.evaluate(()=>{const m=document.querySelector('#scene-group').getScreenCTM();return {x:m.a*26+m.e,y:m.d*24+m.f}});
   let t=performance.now();await page.touchscreen.tap(pos.x,pos.y);await page.locator('.sheet').waitFor();if(await page.locator('[data-action=object]').count())await page.locator('[data-action=object]').first().click();await page.locator('#object-color').waitFor();m.selectionMs=performance.now()-t;
   t=performance.now();await page.locator('#object-color').fill('#AA4422');await page.locator('[data-action=apply-object]').click();await page.locator('#object-color').waitFor({state:'hidden'});m.colorChangeMs=performance.now()-t;
   for(const op of ['undo','redo']){t=performance.now();await page.locator(`[data-action=${op}]`).click();await page.evaluate(()=>new Promise(requestAnimationFrame));m[op+'Ms']=performance.now()-t;}
   m.saveMs=await page.evaluate(async()=>{const t=performance.now();if(!await VDRAW.save(true))throw Error('SAVE_FAILED');return performance.now()-t});
   const expected=await page.evaluate(()=>JSON.stringify(VDRAW.editor.doc.pages[0].elements));t=performance.now();await page.reload();await page.locator(`[data-action=open][data-id="${m.id}"]`).first().click();await page.locator('#stage').waitFor();await page.waitForTimeout(40);m.resumeMs=performance.now()-t;assert.equal(await page.evaluate(()=>JSON.stringify(VDRAW.editor.doc.pages[0].elements)),expected);rows.push(m);
  }
  await page.screenshot({path:`evidence/performance-${phase}-final-390.png`});await context.close();
 }
 assert.equal(errors.length,0);await fs.writeFile(output,JSON.stringify({status:'PASS',kind:'real Chromium UI; not Android device',browser:browser.version(),cpuRate:4,viewport:'390x844',repetitions:1,comparisonScope:'same 006 shell/storage, 005 CORE/commands/history versus 006; isolates small validator change, not same conditions as old 18-case median',rows,errors},null,2)+'\n');
}catch(e){await fs.writeFile(output,JSON.stringify({status:'BLOCKED',errorCode:'BROWSER_MEASUREMENT_FAILED',rows,errors,attempts:1},null,2)+'\n');process.exitCode=1}
finally{clearTimeout(deadline);await browser?.close();stop();await fs.rm(folder,{recursive:true,force:true})}
