// Executes the unchanged legacy importer using native XML/ZIP, with Node-only
// device/DOM boundaries injected. It is a narrow regression witness, not UI QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readNativePptx} from '../native-inventory.mjs';
import {JSZip,pptx,shape,group,textRuns} from './fixture-builder.mjs';
import {DOMParser,XMLSerializer} from './node-xml-adapter.mjs';
const legacyRoot=process.env.VDRAW_LEGACY_ROOT?pathToFileURL(resolve(process.env.VDRAW_LEGACY_ROOT)+'/'):new URL('../../../',import.meta.url);
const raw=await readFile(new URL('web/src/importers.js',legacyRoot),'utf8');
assert.equal(createHash('sha256').update(raw).digest('hex'),'771f1db99a4cf674b684cabfeeee896fddbebbb253203f3502ef2aaead73d7c3','legacy source must be fixed baseline, not silently modified');
const core=new URL('web/src/core.js',legacyRoot).href;
const injected=raw.replace("from './core.js'",`from '${core}'`).replace("import {readDataUrl,sanitizeImage} from './device.js';","const readDataUrl=globalThis.__VDRAW_TEST_READ_DATA_URL; const sanitizeImage=()=>{throw Error('not used for PPTX')};");
globalThis.DOMParser=DOMParser;globalThis.XMLSerializer=XMLSerializer;globalThis.window={JSZip};globalThis.crypto??=webcrypto;
globalThis.__VDRAW_TEST_READ_DATA_URL=async file=>'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,'+Buffer.from(await file.arrayBuffer()).toString('base64');
const {importFile}=await import('data:text/javascript;base64,'+Buffer.from(injected).toString('base64'));
const read=bytes=>readNativePptx(bytes,{JSZip,DOMParser,XMLSerializer,crypto:webcrypto,origin:'SYNTHETIC_GENERIC'});
async function compare(content){const bytes=await pptx(content),file={name:'defect.pptx',type:'application/vnd.openxmlformats-officedocument.presentationml.presentation',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};return {old:await importFile(file),next:await read(bytes)};}
test('old connector omitted with no unsupported warning; new inventory retains source/geometry',async()=>{
 const {old,next}=await compare(shape(2,{tag:'cxnSp',kind:'line'}));assert.equal(old.pages[0].elements.length,0);assert.equal(old.importWarnings.length,1);assert.equal(next.objects.filter(o=>o.kind==='cxnSp').length,1);assert.equal(next.counts.components,1);
});
test('old group child mapped without parent; new basic group endpoints preserve expected parent mapping',async()=>{
 const {old,next}=await compare(group(shape(2,{kind:'line',x:200,y:300,w:100,h:100})));const e=old.pages[0].elements[0],newLine=next.objects.find(o=>o.sourceBinding.nativeId==='2').components[0].geometry;
 assert.ok(Math.abs(e.x*10972800/1200-200)<1e-8);assert.equal(newLine.endpointsEmu[0][0],1200);assert.notEqual(e.x*10972800/1200,newLine.endpointsEmu[0][0]);
});
test('old text-bearing shape loses its geometry part; new inventory retains both parts',async()=>{
 const {old,next}=await compare(shape(2,{text:textRuns}));assert.deepEqual(old.pages[0].elements.map(e=>e.kind),['text']);assert.deepEqual(next.objects.find(o=>o.sourceBinding.nativeId==='2').components.map(c=>c.kind),['geometry','text']);
});
test('old importer inserts newline between adjacent text runs; new text follows paragraph/br',async()=>{
 const {old,next}=await compare(shape(2,{text:textRuns}));assert.equal(old.pages[0].elements[0].text,'AB\n日本語\nC\nD');assert.equal(next.objects.find(o=>o.sourceBinding.nativeId==='2').native.text.content,'AB日本語\nC\nD');
});
