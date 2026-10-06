import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {File} from 'node:buffer';
import {nativeIO} from '../web/src/native-io.js';
import {ExportJobs} from '../web/src/export-jobs.js';
globalThis.crypto??=webcrypto;
const name='名称未設定の現調.pptx',mime='application/vnd.openxmlformats-officedocument.presentationml.presentation';
const blob=new Blob([new Uint8Array([80,75,3,4,0,255])],{type:mime});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=()=>new Promise(r=>setImmediate(r));
function io(result={status:'saved',bytes:blob.size}){
 const events=[],done=deferred();
 const plugins={Directory:{Cache:'CACHE'},Filesystem:{
  writeFile:async args=>{events.push(['stage',args]);return {uri:'file:///private/cache/'+args.path};},
  deleteFile:async args=>events.push(['delete',args])},
  DocumentSave:{save:async args=>{events.push(['save',args]);await done.promise;return result;}},
  Share:{share:async args=>events.push(['share',args])}};
 const readDataUrl=async b=>'data:'+b.type+';base64,'+Buffer.from(await b.arrayBuffer()).toString('base64');
 return {os:nativeIO(plugins,{readDataUrl}),plugins,events,done};
}
const device=await readFile(new URL('../web/src/device.js',import.meta.url),'utf8');
function boundary(h,native=true){
 const events=h.events,context={os:h.os,isNative:()=>native,File,Blob,
  navigator:{canShare:()=>true,share:async args=>events.push(['web-share',args])},
  document:{body:{append:()=>{}},createElement:()=>({click:()=>events.push(['download']),remove:()=>{}})},
  URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},setTimeout:()=>{}};
 vm.createContext(context);
 vm.runInContext(device.replace(/^import .*\n/gm,'').replace(/^const os=.*\n/m,'').replace(/^export /gm,''),context);
 return context.downloadOrShare;
}
test('native default/false opens save boundary; true opens share boundary',async()=>{
 for(const share of [undefined,false,true]){
  const h=io(),send=boundary(h),pending=send(blob,name,share);await flush();
  assert.equal(h.events.filter(e=>e[0]==='save').length,share===true?0:1);
  assert.equal(h.events.filter(e=>e[0]==='share').length,share===true?1:0);
  h.done.resolve();assert.equal(await pending,share===true?'share-requested':'saved');
 }
});
test('web false downloads and true shares without native staging',async()=>{
 const h=io(),send=boundary(h,false);
 assert.equal(await send(blob,name,false),'downloaded');assert.equal(await send(blob,name,true),'shared');
 assert.deepEqual(h.events.map(e=>e[0]),['download','web-share']);
});
test('save stages exact bytes/name/MIME, waits for completion, then deletes only staging file',async()=>{
 const h=io();let completed=false;const pending=h.os.save(blob,name).then(r=>{completed=true;return r;});await flush();
 assert.equal(completed,false);assert.deepEqual(h.events.map(e=>e[0]),['stage','save']);
 const stage=h.events[0][1],request=h.events[1][1];
 assert.equal(stage.directory,'CACHE');assert.match(stage.path,/^vdraw-007-saves\/[^/]+\/名称未設定の現調\.pptx$/);
 assert.deepEqual(Buffer.from(stage.data,'base64'),Buffer.from(await blob.arrayBuffer()));
 assert.equal(request.fileName,name);assert.equal(request.mimeType,mime);assert.equal(request.sourceUri,'file:///private/cache/'+stage.path);
 h.done.resolve();assert.equal(await pending,'saved');
 assert.equal(h.events[2][1].path,stage.path);assert.equal(h.events[2][1].directory,'CACHE');
});
for(const code of ['DOCUMENT_SAVE_CANCELLED','DOCUMENT_SAVE_FAILED','DOCUMENT_SAVE_UNAVAILABLE']){
 test(`${code}: rejects and removes private save staging`,async()=>{
  const h=io();h.plugins.DocumentSave.save=async()=>{throw Object.assign(Error('failed'),{code});};
  await assert.rejects(h.os.save(blob,name),e=>code==='DOCUMENT_SAVE_CANCELLED'?e.name==='AbortError':e.code===code);
  assert.deepEqual(h.events.map(e=>e[0]),['stage','delete']);
 });
}
for(const result of [undefined,{status:'share-requested'},{status:'saved',bytes:0}]){
 test(`no false save completion: ${JSON.stringify(result)}`,async()=>{
  const h=io(result); // undefined requires explicit override of default below
  if(result===undefined)h.plugins.DocumentSave.save=async()=>undefined;
  h.done.resolve();await assert.rejects(h.os.save(blob,name));assert.equal(h.events.at(-1)[0],'delete');
 });
}
test('invalid filename never stages or opens picker',async()=>{
 const h=io();for(const name of ['../x','a\\b','a\nb','..',''])await assert.rejects(h.os.save(blob,name));
 assert.equal(h.events.length,0);
});
test('staging failure never opens picker or shares',async()=>{
 const h=io();h.plugins.Filesystem.writeFile=async()=>{throw Error('storage full');};
 await assert.rejects(h.os.save(blob,name));assert.deepEqual(h.events.map(e=>e[0]),['delete']);
});
const app=await readFile(new URL('../web/src/app.js',import.meta.url),'utf8');
const start=app.indexOf('async function output(share)'),output=app.slice(start,app.indexOf('\nfunction ',start));
function outputHarness(){
 const owner={doc:{id:'A',title:'名称未設定の現調',revision:1,exports:[],pages:[]}},h=io(),events=[],jobs=new ExportJobs();
 const c={editor:owner,doc:()=>c.editor.doc,exportJobs:jobs,busy:false,format:'pptx',includePhoto:false,includeOriginal:false,screen:'export',
  measuredExport:async()=>blob,downloadOrShare:boundary(h),exportBusy:x=>events.push(['busy',x]),toast:x=>events.push(['toast',x]),
  markDirty:()=>events.push(['dirty']),save:async()=>{events.push(['persist']);return true;},exportScreen:()=>{},safeNotice:x=>x};
 vm.createContext(c);vm.runInContext(output,c);return {...h,nativeEvents:h.events,c,events,owner,jobs};
}
test('actual output waits for provider before saved history/notice; repeated tap has one picker',async()=>{
 const h=outputHarness(),pending=h.c.output(false);await flush();await h.c.output(false);
 assert.equal(h.owner.doc.exports.length,0);assert.equal(h.events.filter(e=>e[0]==='persist').length,0);assert.equal(h.nativeEvents.filter(e=>e[0]==='save').length,1);
 h.done.resolve();await pending;assert.equal(h.owner.doc.exports.length,1);assert.equal(h.owner.doc.exports[0].status,'saved');
 assert.equal(h.owner.doc.exports[0].fileName,name);assert.ok(h.events.some(e=>e[0]==='toast'&&e[1].startsWith('ファイルを保存しました')));
 assert.equal(h.c.busy,false);assert.equal(h.jobs.active,null);
});
for(const cancel of [true,false])test(`actual output ${cancel?'cancel':'write failure'} adds no successful history`,async()=>{
 const h=outputHarness();h.plugins.DocumentSave.save=async()=>{throw Object.assign(Error('write failed'),{code:cancel?'DOCUMENT_SAVE_CANCELLED':'DOCUMENT_SAVE_FAILED'});};
 await h.c.output(false);assert.equal(h.owner.doc.exports.length,0);assert.equal(h.c.busy,false);assert.equal(h.jobs.active,null);
 assert.equal(h.events.filter(e=>e[0]==='persist').length,0);
 if(cancel)assert.ok(h.events.some(e=>e[0]==='toast'&&e[1]==='保存をキャンセルしました'));
});
for(const change of ['owner','revision','geometry'])test(`picker pending ${change} change adds no stale history`,async()=>{
 const h=outputHarness(),pending=h.c.output(false);await flush();
 if(change==='owner')h.c.editor={doc:{...h.owner.doc,id:'B',exports:[]}};
 if(change==='revision')h.owner.doc.revision++;
 if(change==='geometry')h.owner.doc.pages.push({name:'changed'});
 h.done.resolve();await pending;assert.equal(h.owner.doc.exports.length,0);assert.equal(h.c.doc().exports.length,0);
 assert.equal(h.events.filter(e=>e[0]==='persist').length,0);assert.equal(h.jobs.active,null);
});

test('committed native bundle exposes the registered DocumentSave proxy',async()=>{
 const bridge=await import('../web/vendor/native-bridge.js');
 assert.equal(typeof bridge.DocumentSave?.save,'function');
 assert.equal(typeof bridge.Share.share,'function');
});
