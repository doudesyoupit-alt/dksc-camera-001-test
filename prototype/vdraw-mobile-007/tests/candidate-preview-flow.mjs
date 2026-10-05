// Real Chromium UI/storage regression. No Vision provider, device, or OS claim.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/runtime.js':import.meta.url);
const {chromium}=require('playwright'),root=new URL('../',import.meta.url).pathname;
const port=Number(process.env.VDRAW_TEST_PORT||4326),base=`http://127.0.0.1:${port}/`;
const server=spawn('python3',['serve.py','--port',String(port)],{cwd:root,stdio:'ignore'});let browser;
try{
 browser=await chromium.launch({...(process.env.VDRAW_CHROMIUM?{executablePath:process.env.VDRAW_CHROMIUM}:{}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto(base);const click=a=>page.locator(`[data-action="${a}"]`).first().click();
 await click('sample');await page.waitForFunction(()=>VDRAW.state.saveState==='saved');
 const original=await page.evaluate(()=>JSON.stringify(VDRAW.editor.doc.pages[0]));
 await click('display');await click('candidate-sample');await click('keep-candidate');await page.waitForFunction(()=>VDRAW.state.saveState==='saved');
 await click('display');await click('candidate-open');await click('adopt');await page.locator('#stage').waitFor();
 await page.evaluate(()=>VDRAW.editor.apply('manual edit',d=>d.pages.find(p=>p.id===d.activePageId).elements[0].name='manual edit preserved'));
 await click('save');await page.waitForFunction(()=>VDRAW.state.saveState==='saved');
 const adopted=await page.evaluate(()=>({active:VDRAW.editor.doc.activePageId,page:JSON.stringify(VDRAW.editor.doc.pages.find(p=>p.id===VDRAW.editor.doc.activePageId)),id:VDRAW.editor.doc.id}));
 await page.reload();await page.locator('[data-action=open]').first().click();await page.locator('#stage').waitFor();
 await click('display');await click('candidate-open');await page.locator('#candidate-preview svg').waitFor();
 for(const action of ['candidate-photo','candidate-overlay','candidate-drawing']){await click(action);await page.locator('#candidate-preview svg').waitFor();}
 await click('adopt');assert.match(await page.locator('#toast').innerText(),/座標系・元資料・ページを特定できません/);
 const beforeDiscard=await page.evaluate(()=>({active:VDRAW.editor.doc.activePageId,original:JSON.stringify(VDRAW.editor.doc.pages[0]),page:JSON.stringify(VDRAW.editor.doc.pages.find(p=>p.id===VDRAW.editor.doc.activePageId))}));
 assert.equal(beforeDiscard.active,adopted.active);assert.equal(beforeDiscard.page,adopted.page);assert.equal(beforeDiscard.original,original);
 await click('discard-candidate');assert.equal(await page.evaluate(()=>VDRAW.editor.doc.candidates[0].status),'discarded');assert.equal(await page.evaluate(()=>JSON.stringify(VDRAW.editor.doc.pages.find(p=>p.id===VDRAW.editor.doc.activePageId))),adopted.page);
 // Stale source-bound metadata must show a safe warning and keep explicit discard usable.
 for(const malformed of ['missing-binding','null-element']){
  await click('display');await click('candidate-sample');await click('keep-candidate');
  await page.evaluate(kind=>{const c=VDRAW.editor.doc.candidates.at(-1);if(kind==='missing-binding')delete c.sourceBinding;else c.elements=[null];},malformed);
  await click('display');await page.locator('[data-action=candidate-open]').last().click();await page.locator('#candidate-preview [role=alert]').waitFor();
  assert.equal(await page.locator('[data-action=discard-candidate]').count(),1);await click('discard-candidate');
  assert.equal(await page.evaluate(()=>VDRAW.editor.doc.candidates.at(-1).status),'discarded');
  assert.equal(await page.evaluate(()=>JSON.stringify(VDRAW.editor.doc.pages.find(p=>p.id===VDRAW.editor.doc.activePageId))),adopted.page);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const result={status:'PASS',issue:'INPUT_CANDIDATE_POST_ADOPTION_PREVIEW_BLOCKED',checks:['saved adopted candidate reopens after real save/reload','all three review views remain usable','re-adoption from unrelated active page rejected','original and edited adopted page unchanged','explicit discard works','unidentifiable saved candidate warning and explicit discard work'],errors,externalRequests:external};
 await fs.mkdir(new URL('../evidence/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../evidence/candidate-preview-flow.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}
