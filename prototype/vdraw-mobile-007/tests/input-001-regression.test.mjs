import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {project,element,clone,newPage,pageOf,validate} from '../web/src/core.js';
import {VisionJobs} from '../web/src/vision.js';
import {drawingSvg} from '../web/src/render.js';
import {LocalStore} from '../web/src/storage.js';
import {Editor} from '../web/src/commands.js';
// Synthetic PNG header for dimension contract tests; no real photo or AI calls.
function image(width,height){const b=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a0000000d49484452','hex').copy(b);b.writeUInt32BE(width,16);b.writeUInt32BE(height,20);return 'data:image/png;base64,'+b.toString('base64');}
function document(width=2000,height=1000){const d=project('INPUT-001 synthetic');d.pages[0].canvas={width,height,yAxis:'down'};d.sources=[{id:'source-1',kind:'photo',workImage:image(width,height),pageNumber:1}];d.pages[0].sourceId='source-1';return d;}
function envelope(coordinateSpace='drawing-2000x1000',extra={}){return {schema:'vdraw-vision-result/1',executionKind:'protocol-fixture',record:{status:'CANDIDATE_READY'},candidate:{coordinateSpace,sourceId:'source-1',calibration:'UNSCALED',elements:[element('rect','対象',{x:600,y:400,w:200,h:100,points:[],strokeWidth:3,fontSize:30})],...extra}};}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
async function persisted(d){
 // Exercise actual LocalStore checksum/decode/save/loadSession, without relying
 // on a browser's IndexedDB in this Node-only focused regression suite.
 const memory=new Map(),store=new LocalStore();
 store.transaction=async (_mode,fn)=>{let key;fn({get:k=>{key=k;return {};}});return memory.get(key);};
 store.open=async()=>({transaction(){const tx={objectStore:name=>({get:key=>{const req={};queueMicrotask(()=>{req.result=memory.get(key);req.onsuccess();queueMicrotask(()=>tx.oncomplete());});return req;},put:record=>{if(name==='projects')memory.set(record.id,record);}})};return tx;}});
 await store.save(d);const session=await store.loadSession(d.id);return session.doc;
}
test('INPUT-001 2000x1000 candidate survives actual save/reload, preview and contain adoption',async()=>{
 const d=document(),v=new VisionJobs(),before=JSON.stringify(d.pages[0]),c=v.receive(d,envelope());d.candidates.push(c);
 const restored=await persisted(d),saved=restored.candidates[0];assert.equal(saved.coordinateSpace,'drawing-2000x1000');assert.equal(saved.sourceWidth,2000);assert.equal(saved.sourceHeight,1000);assert.equal(saved.sourceBinding.pageId,d.pages[0].id);
 const preview=v.preview(restored,saved);assert.equal(preview.page.canvas.width,2000);assert.equal(preview.page.canvas.height,1000);assert.equal(preview.page.elements[0].x,600);assert.equal(preview.source.id,'source-1');assert.match(drawingSvg(preview.page,preview.source,{sourceVisible:true}),/viewBox="0 0 2000 1000"/);
 const adopted=v.adopt(restored,saved),e=adopted.elements[0];assert.deepEqual(adopted.canvas,{width:1200,height:800,yAxis:'down'});close(e.x,360);close(e.y,340);close(e.w,120);close(e.h,60);close(e.strokeWidth,1.8);close(e.fontSize,18);assert.equal(JSON.stringify(restored.pages[0]),before);assert.equal(adopted.calibration.status,'UNSCALED');assert.deepEqual(restored.adoptions[0].transform,{scale:.6,offsetX:0,offsetY:100});assert.equal(restored.candidates[0].status,'adopted');
});
for(const [width,height] of [[1000,1000],[1000,2000],[2000,1000],[1800,700],[700,1800]])test(`INPUT-001 ${width}x${height} photo matches contain transform in preview/adopt`,()=>{
 const d=document(width,height),v=new VisionJobs(),raw=element('polygon','多角形',{x:width*.2,y:height*.3,w:width*.3,h:height*.2,points:[[width*.2,height*.3],[width*.5,height*.3],[width*.3,height*.5]]}),c=v.receive(d,envelope(`drawing-${width}x${height}`,{elements:[raw]})),p=v.adopt(d,c),e=p.elements[0],scale=Math.min(1200/width,800/height),ox=(1200-width*scale)/2,oy=(800-height*scale)/2;
 close((e.x-ox)/(width*scale),.2);close((e.y-oy)/(height*scale),.3);for(let i=0;i<3;i++){close(e.points[i][0],raw.points[i][0]*scale+ox);close(e.points[i][1],raw.points[i][1]*scale+oy);}validate(d);
});
test('existing drawing-1200x800 provider frame stays identical through preview/adopt on wide photo',()=>{
 const d=document(),v=new VisionJobs(),raw=element('rect','固定契約',{x:360,y:340,w:120,h:60}),c=v.receive(d,envelope('drawing-1200x800',{elements:[raw]})),preview=v.preview(d,c);assert.deepEqual(preview.page.canvas,{width:1200,height:800,yAxis:'down'});assert.deepEqual(c.referenceImageTransform,{fit:'contain',scale:.6,offsetX:0,offsetY:100});const p=v.adopt(d,c);assert.deepEqual(p.elements,c.elements);
});
for(const bad of [undefined,'','mm','image-pixels','drawing-0x800','drawing-Infinityx800','drawing-1e308x800','drawing-10001x800',{},null])test(`unknown/invalid coordinateSpace ${JSON.stringify(bad)} is refused atomically`,()=>{const d=document(),before=JSON.stringify(d),v=new VisionJobs();const input=envelope();input.candidate.coordinateSpace=bad;assert.throws(()=>v.receive(d,input));assert.equal(JSON.stringify(d),before);});
test('missing source dimension or transform in saved old candidate is not guessed',()=>{
 for(const key of ['sourceWidth','sourceHeight','sourceBinding','referenceImageTransform','coordinateSpace']){const d=document(),v=new VisionJobs(),c=v.receive(d,envelope());delete c[key];const before=JSON.stringify(d);assert.throws(()=>v.preview(d,c));assert.throws(()=>v.adopt(d,c));assert.equal(JSON.stringify(d),before);}
});
test('supplied source dimension, page ID, or PDF page number mismatch is refused before candidate',()=>{
 for(const extra of [{sourceWidth:1200},{sourceHeight:800},{sourcePageId:'another-page'},{sourcePageNumber:2}]){const d=document(),before=JSON.stringify(d);assert.throws(()=>new VisionJobs().receive(d,envelope('drawing-2000x1000',extra)));assert.equal(JSON.stringify(d),before);}
});
test('candidate target source/page/work-image switches are refused for preview and adoption',()=>{
 for(const change of [d=>{const p=newPage();p.sourceId='source-1';d.pages.push(p);d.activePageId=p.id;},d=>{d.sources[0].workImage=image(2000,900);},d=>{d.sources[0].workImage=d.sources[0].workImage+'AA';},d=>{d.sources[0].pageNumber=2;},d=>{d.sources[0].id='source-2';d.pages[0].sourceId='source-2';},d=>{d.id='different-document';}]){const d=document(),v=new VisionJobs(),c=v.receive(d,envelope());change(d);const before=JSON.stringify(d);assert.throws(()=>v.preview(d,c));assert.throws(()=>v.adopt(d,c));assert.equal(JSON.stringify(d),before);}
});
test('receive rejects unidentifiable source PNG/unsupported image and source mismatch without modifying document',()=>{
 for(const workImage of ['data:image/png;base64,not-a-png','data:image/jpeg;base64,AA==',null,image(0,1000),image(20000,1000)]){const d=document();d.sources[0].workImage=workImage;const before=JSON.stringify(d);assert.throws(()=>new VisionJobs().receive(d,envelope()));assert.equal(JSON.stringify(d),before);}
});
test('malformed/infinite/out-of-frame geometry is refused atomically at receipt and persisted adoption',()=>{
 for(const patch of [{x:Infinity},{y:NaN},{w:1e308},{x:-1},{x:1999,w:200},{points:[[Infinity,0]]}]){const d=document(),v=new VisionJobs(),before=JSON.stringify(d),raw=element('rect','不正',{x:600,y:400,w:200,h:100,...patch});assert.throws(()=>v.receive(d,envelope('drawing-2000x1000',{elements:[raw]})));assert.equal(JSON.stringify(d),before);const c=v.receive(d,envelope());Object.assign(c.elements[0],patch);assert.throws(()=>v.adopt(d,c));assert.equal(JSON.stringify(d),before);}
});
test('transformed circle arc stays circular; text and line sizes use the same scale',()=>{
 const d=document(),v=new VisionJobs(),elements=[element('arc','円弧',{x:600,y:300,w:200,h:200,startAngle:0,endAngle:180}),element('text','文字',{x:600,y:300,w:200,h:50,fontSize:30}),element('line','線',{x:600,y:300,w:200,h:0}),element('ellipse','楕円',{x:600,y:300,w:200,h:100}),element('dimension','寸法',{x:600,y:300,w:200,h:0,text:'100mm',dimension:{status:'MANUAL'}})],c=v.receive(d,envelope('drawing-2000x1000',{elements})),p=v.adopt(d,c);assert.equal(p.elements[0].w,p.elements[0].h);assert.equal(p.elements[0].startAngle,0);close(p.elements[1].fontSize,18);close(p.elements[2].w,120);close(p.elements[3].w/p.elements[3].h,2);close(p.elements[4].w,120);assert.equal(p.elements[4].text,'100mm');validate(d);
});
test('real provider still requires explicit review; protocol provenance and UNSCALED state never promoted',()=>{
 const d=document(),v=new VisionJobs(),input=envelope();input.executionKind='real-providers';const c=v.receive(d,input),before=JSON.stringify(d);assert.equal(c.kind,'provider-candidate');assert.equal(c.elements[0].origin,'ai-candidate');assert.throws(()=>v.adopt(d,c),/確認/);assert.equal(JSON.stringify(d),before);c.review={status:'reviewed'};v.adopt(d,c);assert.equal(pageOf(d).calibration.status,'UNSCALED');
});
test('operation sample on blank page remains usable; Undo/Redo preserves original page and candidate frame',()=>{
 const editor=new Editor(project()),v=new VisionJobs(),before=clone(pageOf(editor.doc)),c=v.sampleCandidate(editor.doc);editor.apply('候補採用',d=>v.adopt(d,c));assert.deepEqual(editor.doc.pages[0],before);assert.equal(editor.doc.pages.length,2);editor.undo();assert.equal(editor.doc.pages.length,1);editor.redo();assert.equal(editor.doc.pages.length,2);validate(editor.doc);
});
test('UI candidate preview uses bound candidate page/source rather than current page canvas',()=>{const app=fs.readFileSync(new URL('../web/src/app.js',import.meta.url),'utf8');assert.match(app,/function candidatePreview\(view='drawing'\)\{const context=vision\.preview\(doc\(\),candidate\);const result=drawingSvg\(context\.page,context\.source,/);});
