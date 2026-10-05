import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {ExportJobs} from '../web/src/export-jobs.js';
import {nativeIO} from '../web/src/native-io.js';
import {exportFile} from '../web/src/exporters.js';
globalThis.crypto??=webcrypto;
const text=await readFile(new URL('../web/src/app.js',import.meta.url),'utf8'),start=text.indexOf('async function output(share)'),code=text.slice(start,text.indexOf('\nfunction ',start));
const document=()=>({id:'A',title:'案件 A',revision:7,exports:[],sources:[],activePageId:'page',pages:[{id:'page',name:'page',canvas:{width:1200,height:800},elements:[]}]});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
function harness(format='pptx'){
 const generation=deferred(),delivery=deferred(),persistence=deferred(),owner={doc:document()},events=[],jobs=new ExportJobs();
 const context={ExportJobs,exportJobs:jobs,editor:owner,format,includePhoto:true,includeOriginal:true,busy:false,screen:'export',Date,console,
  doc:()=>context.editor.doc,toast:m=>events.push(['toast',m]),exportBusy:b=>events.push(['busy',b]),safeNotice:x=>x,
  measuredExport:async(d,f,o)=>{events.push(['generate',d,f,o]);return generation.promise;},
  downloadOrShare:async(b,n,s)=>{events.push(['deliver',b,n,s]);return delivery.promise;},
  markDirty:()=>events.push(['dirty']),save:async()=>{events.push(['save',structuredClone(context.editor.doc)]);return persistence.promise;},
  exportScreen:()=>events.push(['screen'])};
 vm.createContext(context);vm.runInContext(code,context);
 return {context,events,jobs,owner,generation,delivery,persistence,run:()=>context.output(false)};
}
const flush=()=>new Promise(r=>setImmediate(r));
const mime={pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',dxf:'application/dxf',pdf:'application/pdf'};
for(const format of Object.keys(mime)){
 test(`${format}: immutable UI snapshot drives blob, name, MIME and history`,async()=>{
  const h=harness(format),running=h.run();h.context.format='json';h.context.includePhoto=false;h.context.includeOriginal=false;
  const capture=h.events.find(e=>e[0]==='generate');assert.equal(capture[2],format);assert.equal(capture[3].includePhoto,true);assert.equal(capture[3].includeOriginal,false);
  assert.ok(Object.isFrozen(capture[1].pages[0]));assert.throws(()=>{capture[1].title='corrupt';},TypeError);
  h.generation.resolve(new Blob(['content'],{type:mime[format]}));await flush();assert.equal(h.events.find(e=>e[0]==='deliver')[2],'案件 A.'+format);
  h.delivery.resolve('downloaded');await flush();const entry=h.owner.doc.exports[0];assert.equal(entry.format,format);assert.equal(entry.fileName,'案件 A.'+format);assert.equal(entry.mime,mime[format]);assert.equal(entry.revision,7);assert.equal(entry.includePhoto,true);
  h.persistence.resolve(true);await running;assert.equal(h.context.busy,false);assert.equal(h.jobs.active,null);assert.equal(h.owner.doc.revision,8);
 });
}
test('parallel and rapid repeated requests have one delivery owner',async()=>{
 const h=harness(),p=h.run();await h.run();await h.run();assert.equal(h.events.filter(e=>e[0]==='generate').length,1);
 h.generation.resolve(new Blob(['x'],{type:mime.pptx}));await flush();await h.run();assert.equal(h.events.filter(e=>e[0]==='deliver').length,1);
 h.delivery.resolve('shared');await flush();await h.run();h.persistence.resolve(true);await p;assert.equal(h.owner.doc.exports.length,1);
});
for(const transition of ['A to B','A to B to A','same owner revision edit','same owner unversioned geometry edit','same owner replaced document']){
 test(`cancel before delivery: ${transition}`,async()=>{
  const h=harness(),p=h.run();
  if(transition==='A to B')h.context.editor={doc:{...document(),id:'B',title:'案件 B'}};
  if(transition==='A to B to A'){h.context.editor={doc:{...document(),id:'B'}};h.context.editor={doc:structuredClone(h.owner.doc)};}
  if(transition==='same owner revision edit')h.owner.doc.revision++;
  if(transition==='same owner unversioned geometry edit')h.owner.doc.pages[0].elements.push({kind:'line',x:9});
  if(transition==='same owner replaced document')h.owner.doc=structuredClone(h.owner.doc);
  const before=structuredClone(h.context.editor.doc);h.generation.resolve(new Blob(['x'],{type:mime.pptx}));await p;
  assert.deepEqual(h.context.editor.doc,before);assert.equal(h.events.filter(e=>e[0]==='deliver'||e[0]==='save').length,0);assert.equal(h.jobs.active,null);
 });
}
test('owner switch while OS share awaits never writes another project history',async()=>{
 const h=harness(),p=h.run();h.generation.resolve(new Blob(['x'],{type:mime.pptx}));await flush();h.context.editor={doc:{...document(),id:'B',title:'案件 B'}};
 h.delivery.resolve('share-requested');await p;assert.equal(h.owner.doc.exports.length,0);assert.equal(h.context.editor.doc.exports.length,0);assert.equal(h.events.filter(e=>e[0]==='save').length,0);
});
test('editing A during OS share keeps new geometry and adds no stale history',async()=>{
 const h=harness(),p=h.run();h.generation.resolve(new Blob(['x'],{type:mime.pptx}));await flush();h.owner.doc.pages[0].elements.push({kind:'line',x:20});h.owner.doc.revision++;
 h.delivery.resolve('shared');await p;assert.equal(h.owner.doc.pages[0].elements[0].x,20);assert.equal(h.owner.doc.revision,8);assert.equal(h.owner.doc.exports.length,0);
});
test('save completion cannot navigate a new owner to old export screen',async()=>{
 const h=harness(),p=h.run();h.generation.resolve(new Blob(['x'],{type:mime.pptx}));await flush();h.delivery.resolve('downloaded');await flush();h.context.editor={doc:{...document(),id:'B'}};h.context.screen='edit';
 h.persistence.resolve(true);await p;assert.equal(h.events.filter(e=>e[0]==='screen').length,0);assert.equal(h.context.editor.doc.exports.length,0);assert.equal(h.owner.doc.exports.length,1);
});
for(const failure of ['generation failure','MIME mismatch','share cancel','share rejection','invalid delivery result']){
 test(`no history on ${failure}`,async()=>{
  const h=harness(),p=h.run();
  if(failure==='generation failure')h.generation.reject(Error('generator failed'));
  else {h.generation.resolve(new Blob(['x'],{type:failure==='MIME mismatch'?'application/json':mime.pptx}));await flush();
   if(failure==='share cancel')h.delivery.reject(Object.assign(Error('cancel'),{name:'AbortError'}));
   else if(failure==='share rejection')h.delivery.reject(Error('OS refused'));
   else if(failure==='invalid delivery result')h.delivery.resolve('unknown');
  }
  await p;assert.equal(h.owner.doc.exports.length,0);assert.equal(h.events.filter(e=>e[0]==='save').length,0);assert.equal(h.jobs.active,null);
 });
}
test('persist failure preserves created history and reports storage failure',async()=>{
 const h=harness(),p=h.run();h.generation.resolve(new Blob(['x'],{type:mime.pptx}));await flush();h.delivery.resolve('share-requested');await flush();h.persistence.resolve(false);await p;
 assert.equal(h.owner.doc.exports[0].status,'share-requested');assert.ok(h.events.some(e=>e[0]==='toast'&&e[1].includes('保存に失敗')));
});
test('job IDs differ and old release cannot clear a new active owner',()=>{
 const jobs=new ExportJobs(),d=document(),owner={doc:d},a=jobs.begin({owner,document:d,format:'pdf'});assert.equal(jobs.begin({owner,document:d,format:'dxf'}),null);assert.equal(jobs.release(a),true);
 const b=jobs.begin({owner,document:d,format:'dxf'});assert.notEqual(a.snapshot.id,b.snapshot.id);assert.equal(jobs.release(a),false);assert.equal(jobs.active,b);
});
test('JSON original option, filename and history metadata share one frozen snapshot',()=>{
 const jobs=new ExportJobs(),d=document();d.title='bad/\\title\n';const a=jobs.begin({owner:{},document:d,format:'json',options:{includePhoto:true,includeOriginal:true}});
 assert.equal(a.snapshot.options.includeOriginal,true);assert.equal(a.snapshot.name,'bad__title_.json');const record=jobs.history(a,'downloaded');assert.equal(record.jobId,a.snapshot.id);assert.equal(record.includeOriginal,true);
});
test('real DXF exporter accepts frozen snapshot and preserves correct MIME/content',async()=>{
 const d=document(),j=new ExportJobs().begin({owner:{},document:d,format:'dxf'}),blob=await exportFile(j.snapshot.document,j.snapshot.format,j.snapshot.options);
 assert.equal(blob.type,j.snapshot.mime);assert.ok((await blob.text()).includes('AC1024'));assert.ok((await blob.text()).endsWith('EOF\r\n'));
});
for(const outcome of ['success','cancel','reject','cache failure']){
 test(`native OS boundary ${outcome} keeps captured name and propagates failure`,async()=>{
  const calls=[],plugins={Directory:{Cache:'cache'},Filesystem:{writeFile:async args=>{calls.push(args);if(outcome==='cache failure')throw Error('cache refused');return {uri:'file://captured'};}},Share:{share:async args=>{calls.push(args);if(outcome==='cancel')throw Object.assign(Error('cancel'),{name:'AbortError'});if(outcome==='reject')throw Error('share refused');}}};
  const io=nativeIO(plugins,{readDataUrl:async()=> 'data:application/pdf;base64,eA==',photoFile:()=>null}),p=io.share(new Blob(['x'],{type:mime.pdf}),'captured.pdf');
  if(outcome==='success')assert.equal(await p,'share-requested');else await assert.rejects(p);
  assert.ok(calls[0].path.endsWith('/captured.pdf'));if(calls[1])assert.equal(calls[1].title,'captured.pdf');
 });
}
test('export view rerender reapplies owner busy state',()=>{assert.ok(text.includes('exportBusy(!!exportJobs.active);'));});

// Real bundled packagers run here. Browser font/image/canvas IO is replaced by
// a one-pixel fixture; this proves document packaging, not visual raster quality.
test('real PPTX and PDF packagers accept frozen job documents and retain titles',async()=>{
 class Reader {readAsArrayBuffer(b){b.arrayBuffer().then(result=>{this.result=result;this.onload?.({target:this});});}readAsDataURL(b){b.arrayBuffer().then(result=>{this.result='data:'+b.type+';base64,'+Buffer.from(result).toString('base64');this.onload?.({target:this});});}}
 const browser=vm.createContext({console,Blob,FileReader:Reader,TextEncoder,TextDecoder,Array,Uint8Array,ArrayBuffer,DataView,Buffer,setTimeout,setImmediate,clearTimeout,URL,Date,Promise});browser.window=browser;browser.global=browser;
 for(const file of ['jszip.min.js','pptxgen.bundle.js','pdf-lib.min.js'])vm.runInContext(await readFile(new URL('../web/vendor/'+file,import.meta.url),'utf8'),browser);
 const old={window:globalThis.window,Image:globalThis.Image,document:globalThis.document,FileReader:globalThis.FileReader,fetch:globalThis.fetch};
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
 try {
  globalThis.window=browser;globalThis.FileReader=Reader;globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['font fixture'])});globalThis.Image=class {async decode(){}};
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}}),toBlob:f=>f(new Blob([png],{type:'image/png'}))})};
  const jobs=new ExportJobs(),d=document(),ppt=jobs.begin({owner:{},document:d,format:'pptx'}),pptBlob=await exportFile(ppt.snapshot.document,ppt.snapshot.format,ppt.snapshot.options);
  assert.equal(pptBlob.type,ppt.snapshot.mime);const zip=await browser.JSZip.loadAsync(await pptBlob.arrayBuffer());assert.ok(zip.file('ppt/presentation.xml'));assert.ok((await zip.file('docProps/core.xml').async('string')).includes(d.title));jobs.release(ppt);
  const pdf=jobs.begin({owner:{},document:d,format:'pdf'}),pdfBlob=await exportFile(pdf.snapshot.document,pdf.snapshot.format,pdf.snapshot.options);assert.equal(pdfBlob.type,pdf.snapshot.mime);
  const loaded=await browser.PDFLib.PDFDocument.load(new Uint8Array(await pdfBlob.arrayBuffer()));assert.equal(loaded.getPageCount(),1);assert.equal(loaded.getTitle(),d.title);
 } finally {for(const [key,value] of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
