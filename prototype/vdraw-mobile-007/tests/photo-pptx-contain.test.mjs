// Synthetic regression only; not real-photo/AI or PowerPoint visual acceptance.
// Shipped VisionJobs, LocalStore checksums/save/reload and PPTX packagers execute.
// The IndexedDB boundary is memory-injected; Node packager output uses uint8array.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {project,element,pageOf} from '../web/src/core.js';
import {VisionJobs} from '../web/src/vision.js';
import {LocalStore} from '../web/src/storage.js';
import {drawingSvg} from '../web/src/render.js';
import {exportFile} from '../web/src/exporters.js';
const context={console,Buffer,Blob,Uint8Array,ArrayBuffer,setTimeout,clearTimeout,TextEncoder,TextDecoder,atob,btoa};
context.window=context;context.global=context;context.self=context;vm.createContext(context);
vm.runInContext(await fs.readFile(new URL('../web/vendor/pptxgen.bundle.js',import.meta.url),'utf8'),context);
class Pptx extends context.PptxGenJS{async write(options){return Buffer.from(await super.write({...options,outputType:'uint8array'}));}}
const zipAdapter={loadAsync:async raw=>{const z=await context.JSZip.loadAsync(raw),generate=z.generateAsync.bind(z);z.generateAsync=options=>generate({...options,type:'uint8array'});return z;}};
globalThis.window={PptxGenJS:Pptx,JSZip:zipAdapter};
function crc32(bytes){let crc=0xffffffff;for(const n of bytes){crc^=n;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function pngImage(width,height){
 const chunk=(type,data)=>{const name=Buffer.from(type),n=Buffer.alloc(4),checksum=Buffer.alloc(4);n.writeUInt32BE(data.length);checksum.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([n,name,data,checksum]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
 const rows=Buffer.alloc((width*3+1)*height,0xff);for(let i=0;i<height;i++)rows[i*(width*3+1)]=0;
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
async function persist(d){
 const memory=new Map(),store=new LocalStore();
 store.transaction=async(_mode,fn)=>{let key;fn({get:k=>{key=k;return {};}});return memory.get(key);};
 store.open=async()=>({transaction(){const tx={objectStore:name=>({get:key=>{const r={};queueMicrotask(()=>{r.result=memory.get(key);r.onsuccess();queueMicrotask(()=>tx.oncomplete());});return r;},put:record=>{if(name==='projects')memory.set(record.id,record);}})};return tx;}});
 await store.save(d);return (await store.loadSession(d.id)).doc;
}
const frame=xml=>{const xf=xml.match(/<a:xfrm[^>]*>([\s\S]*?)<\/a:xfrm>/)?.[1];assert.ok(xf);const off=xf.match(/<a:off x="(-?\d+)" y="(-?\d+)"/),ext=xf.match(/<a:ext cx="(\d+)" cy="(\d+)"/);return {x:+off[1],y:+off[2],w:+ext[1],h:+ext[2]};};
async function inspect(d,includePhoto){
 const bytes=await exportFile(d,'pptx',{includePhoto}),zip=await context.JSZip.loadAsync(Buffer.from(bytes)),pages=[];
 for(let i=0;i<d.pages.length;i++){
  const xml=await zip.file(`ppt/slides/slide${i+1}.xml`).async('string');
  const pictures=[...xml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)].map(m=>frame(m[1]));
  const shapes=[...xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)].map(m=>({id:m[1].match(/<p:cNvPr[^>]* name="([^"]*)"/)?.[1],...frame(m[1])}));
  pages.push({pictures,shapes});
 }
 return{bytes:bytes.byteLength,pages};
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<=1,`${actual} != ${expected} EMU`);
for(const [name,width,height] of [['square',80,80],['portrait',40,80],['wide',120,40],['non-3:2',90,50]]){
 test(`${name}: preview/adopt/save/reload/PPTX preserve contain image and native shape placement`,async()=>{
  const d=project('Synthetic photo placement'),v=new VisionJobs();d.sources=[{id:'synthetic-photo',kind:'photo',workImage:pngImage(width,height)}];d.pages[0].sourceId=d.sources[0].id;d.pages[0].canvas={width,height,yAxis:'down'};
  const raw=element('rect','Synthetic editable shape',{x:width*.25,y:height*.3,w:width*.2,h:height*.2,strokeWidth:1});
  const c=v.receive(d,{schema:'vdraw-vision-result/1',executionKind:'protocol-fixture',record:{status:'CANDIDATE_READY'},candidate:{sourceId:d.sources[0].id,coordinateSpace:`drawing-${width}x${height}`,calibration:'UNSCALED',elements:[raw]}});d.candidates.push(c);
  const contract=JSON.stringify({coordinateSpace:c.coordinateSpace,sourceBinding:c.sourceBinding,referenceImageTransform:c.referenceImageTransform});
  const preview=v.preview(d,c),svg=drawingSvg(preview.page,preview.source,{sourceVisible:true,overlay:true});assert.match(svg,/preserveAspectRatio="xMidYMid meet"/);
  const adopted=v.adopt(d,c),before=JSON.stringify(adopted.elements),sourceBefore=JSON.stringify(d.sources),restored=await persist(d),saved=restored.candidates[0];
  assert.equal(before,JSON.stringify(pageOf(restored).elements));assert.equal(sourceBefore,JSON.stringify(restored.sources));
  assert.equal(contract,JSON.stringify({coordinateSpace:saved.coordinateSpace,sourceBinding:saved.sourceBinding,referenceImageTransform:saved.referenceImageTransform}));
  const withPhoto=await inspect(restored,true),withoutPhoto=await inspect(restored,false);assert.ok(withPhoto.bytes>1000);
  const emu=914400,k=Math.min(12/adopted.canvas.width,8/adopted.canvas.height),ox=(12-adopted.canvas.width*k)/2,oy=(8-adopted.canvas.height*k)/2;
  const fit=Math.min(adopted.canvas.width/width,adopted.canvas.height/height),x=(adopted.canvas.width-width*fit)/2,y=(adopted.canvas.height-height*fit)/2;
  const picture=withPhoto.pages[1].pictures[0];assert.ok(picture);
  close(picture.x,(ox+x*k)*emu);close(picture.y,(oy+y*k)*emu);close(picture.w,width*fit*k*emu);close(picture.h,height*fit*k*emu);
  assert.ok(Math.abs(picture.w/picture.h-width/height)<1e-6);
  const e=adopted.elements[0],shape=withPhoto.pages[1].shapes.find(s=>s.id===e.id);
  close(shape.x,(ox+e.x*k)*emu);close(shape.y,(oy+e.y*k)*emu);close(shape.w,e.w*k*emu);close(shape.h,e.h*k*emu);
  for(let i=0;i<withPhoto.pages.length;i++){assert.equal(withPhoto.pages[i].pictures.length,1);assert.equal(withoutPhoto.pages[i].pictures.length,0);assert.deepEqual(withPhoto.pages[i].shapes,withoutPhoto.pages[i].shapes);}
  // The source frame original page also fits uniformly into a 12x8 slide.
  const sourcePicture=withPhoto.pages[0].pictures[0],sourceScale=Math.min(12/width,8/height);
  close(sourcePicture.x,(12-width*sourceScale)/2*emu);close(sourcePicture.y,(8-height*sourceScale)/2*emu);
  close(sourcePicture.w,width*sourceScale*emu);close(sourcePicture.h,height*sourceScale*emu);
 });
}
test('invalid PNG dimensions never stretch or guess; photo exclusion keeps old output',async()=>{
 const good=pngImage(40,80),decoded=Buffer.from(good.slice(22),'base64'),wrong=Buffer.from(decoded);wrong[19]^=1;
 const bad=['data:image/jpeg;base64,AA==','data:image/png;base64,notPNG','data:image/png;base64,'+decoded.subarray(0,24).toString('base64'),'data:image/png;base64,'+wrong.toString('base64'),'data:image/png;base64,'+decoded.subarray(0,-12).toString('base64')];
 for(const image of bad){const d=project();d.sources=[{id:'source',workImage:image}];d.pages[0].sourceId='source';await assert.rejects(exportFile(d,'pptx',{includePhoto:true}),/写真の寸法・形式/);const file=await inspect(d,false);assert.ok(file.bytes>1000);assert.equal(file.pages[0].pictures.length,0);}
});
test('absent optional work image retains photo-free blank drawing behavior',async()=>{
 const d=project();d.sources=[{id:'source',workImage:null}];d.pages[0].sourceId='source';const result=await inspect(d,true);assert.equal(result.pages[0].pictures.length,0);
});
