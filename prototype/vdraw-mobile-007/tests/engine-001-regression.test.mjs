import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {webcrypto} from 'node:crypto';
import {project,pageOf,element,clone,validate,arcPoints,MAX_ARC_DEGREES} from '../web/src/core.js';
import {Editor} from '../web/src/commands.js';
import {drawingSvg,shape,hit,selection} from '../web/src/render.js';
import {importFile} from '../web/src/importers.js';
import {LocalStore} from '../web/src/storage.js';
globalThis.crypto??=webcrypto;
const arc=patch=>element('arc','円弧',{x:100,y:100,w:200,h:200,startAngle:0,endAngle:180,fill:'none',...patch});
const documentWith=patch=>{const d=project('円弧回帰');pageOf(d).elements.push(arc(patch));return d;};
const jsonFile=d=>({name:'external.json',size:1024,type:'application/json',text:async()=>JSON.stringify(d)});
const invalid=[
 ['overflow angle',{startAngle:1e308,endAngle:0}],
 ['finite non-progress angle',{startAngle:1e20,endAngle:0}],
 ['NaN',{startAngle:NaN}],['positive Infinity',{endAngle:Infinity}],
 ['negative Infinity',{startAngle:-Infinity}],['non-number',{startAngle:'0'}],
 ['angle outside supported range',{startAngle:MAX_ARC_DEGREES+1}],
 ['abnormal span',{startAngle:-MAX_ARC_DEGREES,endAngle:MAX_ARC_DEGREES}],
 ['unequal radii',{w:201,h:200}],['zero radius',{w:0,h:0}],
 ['negative radius',{w:-1,h:-1}],['coordinate overflow',{x:1e308,w:1e308,h:1e308}],
];
for(const [name,patch] of invalid)test(`ENGINE-001 validation refuses ${name} atomically`,()=>{
 const d=documentWith(patch),before=clone(d);assert.throws(()=>validate(d),/円弧|図形/);assert.deepEqual(d,before);
 assert.throws(()=>new Editor(d),/円弧|図形/);
});
test('external finite extreme JSON is refused at the real import boundary',async()=>{
 for(const patch of [{startAngle:1e308,endAngle:0},{startAngle:1e20,endAngle:0},{startAngle:-MAX_ARC_DEGREES,endAngle:MAX_ARC_DEGREES}])await assert.rejects(importFile(jsonFile(documentWith(patch))),/円弧/);
});
test('raw malformed arcs cannot stall render, selection, hit or point generation (2s isolated deadline)',()=>{
 const script=`import assert from 'node:assert/strict';import {arcPoints} from ${JSON.stringify(new URL('../web/src/core.js',import.meta.url).href)};import {shape,selection,hit,drawingSvg} from ${JSON.stringify(new URL('../web/src/render.js',import.meta.url).href)};
 const bad=[{startAngle:1e308,endAngle:0},{startAngle:1e20,endAngle:0},{startAngle:NaN,endAngle:180},{startAngle:0,endAngle:Infinity},{w:0,h:0},{w:2,h:3},{x:1e308,w:1e308,h:1e308}];
 for(const patch of bad){const e={kind:'arc',x:100,y:100,w:200,h:200,startAngle:0,endAngle:180,stroke:'#000000',fill:'none',strokeWidth:3,...patch};assert.deepEqual(arcPoints(e),[]);assert.equal(shape(e),'');assert.equal(selection(e),'');assert.equal(hit(e,100,100),false);const svg=drawingSvg({canvas:{width:1200,height:800},elements:[e]});assert.ok(!/NaN|Infinity|polyline/.test(svg));}
 console.log('raw malformed arc checks PASS');`;
 const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{timeout:2000,encoding:'utf8'});
 assert.ifError(result.error);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PASS/);
});
const normalCases=[[0,180],[350,10],[-90,90],[0,0],[0,360],[0,720],[-720,0],[720,0],[360,360],[90,-90]];
for(const [startAngle,endAngle] of normalCases)test(`normal ${startAngle} → ${endAngle} keeps legacy geometry and SVG`,()=>{
 const e=arc({startAngle,endAngle});validate(documentWith({startAngle,endAngle}));
 const start=startAngle*Math.PI/180,end=endAngle*Math.PI/180;let span=end-start;
 while(span<=0)span+=2*Math.PI;
 const expected=Array.from({length:49},(_,i)=>[e.x+e.w/2+e.w/2*Math.cos(start+span*i/48),e.y+e.h/2+e.h/2*Math.sin(start+span*i/48)]);
 const actual=arcPoints(e);assert.equal(actual.length,49);
 actual.forEach((p,i)=>p.forEach((value,j)=>{assert.ok(Number.isFinite(value));assert.ok(Math.abs(value-expected[i][j])<1e-9);}));
 assert.equal((shape(e).match(/polyline/g)||[]).length,1);assert.ok(!/NaN|Infinity/.test(drawingSvg(pageOf(documentWith({startAngle,endAngle})))));
 assert.ok(hit(e,...actual[24],0.01));
});
test('maximum supported positive and negative spans remain bounded to 49 finite points',()=>{
 for(const [startAngle,endAngle] of [[0,MAX_ARC_DEGREES],[MAX_ARC_DEGREES,0],[-MAX_ARC_DEGREES,0]]){
 const e=arc({startAngle,endAngle});validate(documentWith({startAngle,endAngle}));const points=arcPoints(e);assert.equal(points.length,49);assert.ok(points.flat().every(Number.isFinite));
 }
});
// Minimal transaction adapter exercises production LocalStore.save/write/decode;
// real browser IndexedDB/lifecycle acceptance remains the independent QA's job.
function memoryDatabase(){
 const tables=new Map(['projects','checkpoints','meta'].map(name=>[name,new Map()]));
 return {transaction(){const tx={aborted:false,objectStore(name){const table=tables.get(name);return {
  get(id){const request={};setTimeout(()=>{request.result=clone(table.get(id));request.onsuccess?.();},0);return request;},
  put(value,key){table.set(key??value.id,clone(value));},
 };},abort(){tx.aborted=true;tx.onabort?.();}};setTimeout(()=>{if(!tx.aborted)tx.oncomplete?.();},5);return tx;}};
}
test('import → SVG → save → reload keeps normal multi-turn arc and Undo/Redo history',async()=>{
 const imported=await importFile(jsonFile(documentWith({startAngle:0,endAngle:720}))),editor=new Editor(imported),id=pageOf(editor.doc).elements[0].id;
 editor.update(id,{startAngle:-90,endAngle:90});const saved=clone(editor.doc),svg=drawingSvg(pageOf(saved));
 const store=new LocalStore();store.db=memoryDatabase();await store.save(editor.doc,editor.history());
 const loaded=await store.loadSession(editor.doc.id);assert.deepEqual(loaded.doc,saved);assert.equal(drawingSvg(pageOf(loaded.doc)),svg);
 const restored=new Editor(loaded.doc,loaded.history);assert.ok(restored.undo());assert.equal(pageOf(restored.doc).elements[0].endAngle,720);
 assert.ok(restored.redo());assert.equal(pageOf(restored.doc).elements[0].startAngle,-90);
});
test('invalid edit/save/restore cannot replace a valid document or saved record',async()=>{
 const editor=new Editor(documentWith({})),id=pageOf(editor.doc).elements[0].id,before=clone(editor.doc);
 assert.throws(()=>editor.update(id,{startAngle:1e308,endAngle:0}),/円弧/);assert.deepEqual(editor.doc,before);assert.equal(editor.undoStack.length,0);
 const store=new LocalStore();store.db=memoryDatabase();await store.save(editor.doc);const corrupt=clone(editor.doc);pageOf(corrupt).elements[0].startAngle=1e20;
 await assert.rejects(store.save(corrupt),/円弧/);assert.deepEqual(await store.load(editor.doc.id),before);
 const payload={doc:corrupt,history:null},bytes=new TextEncoder().encode(JSON.stringify(payload));
 const checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
 await assert.rejects(store.decode({storageSchema:'vdraw-mobile-storage/3',payload,checksum}),/円弧/);
});
