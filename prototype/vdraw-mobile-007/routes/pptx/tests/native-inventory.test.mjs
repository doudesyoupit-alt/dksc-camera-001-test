import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {readNativePptx,INVENTORY_CONTRACT_SHA256} from '../native-inventory.mjs';
import {DOMParser,XMLSerializer} from './node-xml-adapter.mjs';
import {JSZip,pptx,shape,group,textRuns,slideXml,P,A,R,directStyle} from './fixture-builder.mjs';
const options={JSZip,DOMParser,XMLSerializer,crypto:webcrypto,origin:'SYNTHETIC_GENERIC'};
const read=bytes=>readNativePptx(bytes,options);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const closePoints=(a,b)=>{assert.equal(a.length,b.length);a.forEach((p,i)=>p.forEach((v,j)=>close(v,b[i][j])));};
const byId=(d,id)=>d.objects.find(o=>o.sourceBinding.nativeId===String(id));
const geometry=o=>o.components.find(c=>c.kind==='geometry')?.geometry;
test('real ZIP bytes preserve integer EMU, package/part source hash, layout versus actual scale',async()=>{
 const bytes=await pptx(shape());const before=Buffer.from(bytes),d=await read(bytes),o=byId(d,2);
 assert.deepEqual(Buffer.from(bytes),before);assert.equal(d.source.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(o.native.xfrm.off.x,'36000');assert.equal(d.slides[0].widthEmu,10972800);assert.equal(d.slides[0].layoutMm.width,304.8);assert.equal(d.realWorldScaleStatus,'UNSCALED');assert.equal(d.unitRole,'SOURCE');
 const z=await JSZip.loadAsync(bytes),xml=await z.file('ppt/slides/slide1.xml').async('uint8array');assert.equal(o.sourceBinding.partHash,createHash('sha256').update(xml).digest('hex'));assert.ok(o.sourceBinding.xmlPath);assert.equal(d.exportReadiness,'HOLD');assert.equal(d.supportedRetention,'NOT_EVALUATED');
});
test('connector inventory retains negative-direction endpoints and original flip',async()=>{
 const d=await read(await pptx(shape(2,{tag:'cxnSp',kind:'line',x:100,y:200,w:300,h:400,extra:'flipH="1"'}))),o=byId(d,2);assert.equal(o.kind,'cxnSp');closePoints(geometry(o).endpointsEmu,[[400,200],[100,600]]);assert.equal(o.native.xfrm.attributes.flipH,'1');assert.equal(d.counts.components,1);
});
test('geometry and text parts are both retained; same-paragraph runs have no artificial newline',async()=>{
 const d=await read(await pptx(shape(2,{text:textRuns}))),o=byId(d,2);assert.deepEqual(o.components.map(c=>c.kind),['geometry','text']);assert.equal(o.native.text.content,'AB日本語\nC\nD');assert.equal(o.native.text.paragraphs[0].items.length,4);assert.equal(o.native.text.paragraphs[0].items[2].kind,'br');assert.equal(d.counts.components,2);assert.ok(o.issues.some(i=>i.code==='TEXT_LAYOUT_UNRESOLVED'));
});
test('basic group chOff/chExt maps child coordinates without normalization',async()=>{
 const d=await read(await pptx(group(shape(2,{kind:'line',x:200,y:300,w:100,h:100})))),o=byId(d,2);closePoints(geometry(o).endpointsEmu,[[1200,2200],[1400,2400]]);assert.equal(d.counts.containers,1);assert.equal(o.transform.chain.length,2);assert.equal(o.transform.chain[0].native.chOff.x,'100');assert.equal(o.transform.chain[0].native.chExt.cx,'500');
});
test('nested groups and clockwise 5400000 rotation retain parent order/pivots',async()=>{
 // Outer: x=100+(child x)*2,y=200+(child y)*2. Inner 90 clockwise about (100,100).
 const inner=group(shape(2,{kind:'line',x:0,y:0,w:100,h:0}),{id:6,x:0,y:0,w:200,h:200,cx:0,cy:0,cw:200,ch:200,extra:'rot="5400000"'});
 const d=await read(await pptx(group(inner,{id:5,x:100,y:200,w:400,h:400,cx:0,cy:0,cw:200,ch:200}))),o=byId(d,2);closePoints(geometry(o).endpointsEmu,[[500,200],[500,400]]);assert.equal(o.transform.chain.length,3);assert.equal(o.transform.chain[1].native.attributes.rot,'5400000');assert.equal(d.counts.containers,2);
});
test('shape rotation and flips preserve endpoint geometry and raw attrs',async()=>{
 const d=await read(await pptx(shape(2,{kind:'line',x:0,y:0,w:100,h:0,extra:'rot="5400000" flipH="1"'})));closePoints(geometry(byId(d,2)).endpointsEmu,[[50,50],[50,-50]]);
});
test('nonuniform parent plus rotation preserves affine quad and signals app semantics unverified',async()=>{
 const d=await read(await pptx(group(shape(2,{x:0,y:0,w:100,h:100,extra:'rot="2700000"'}),{x:0,y:0,w:400,h:200,cx:0,cy:0,cw:200,ch:200}))),o=byId(d,2),g=geometry(o);
 assert.equal(g.cornersEmu.length,4);close(g.cornersEmu[0][0],100);close(g.cornersEmu[0][1],50-50*Math.sqrt(2));assert.ok(o.issues.some(i=>i.code==='NONUNIFORM_ROTATED_GROUP_APP_SEMANTICS_UNVERIFIED'));assert.equal(o.transform.status,'HUMAN_CHECK_REQUIRED');assert.equal(o.components[0].disposition,'HUMAN_CHECK_REQUIRED');assert.notEqual(g.cornersEmu[1][1],g.cornersEmu[0][1]);
});
test('ellipse full affine axis vectors survive nonuniform rotation; no bbox collapse',async()=>{
 const d=await read(await pptx(group(shape(2,{kind:'ellipse',x:0,y:0,w:100,h:100,extra:'rot="2700000"'}),{x:0,y:0,w:400,h:200,cx:0,cy:0,cw:200,ch:200}))),g=geometry(byId(d,2));assert.equal(g.kind,'ellipse');assert.equal(g.axisVectorsEmu.length,2);assert.ok(Math.abs(g.axisVectorsEmu[0][0]*g.axisVectorsEmu[1][0]+g.axisVectorsEmu[0][1]*g.axisVectorsEmu[1][1])>1);assert.ok(byId(d,2).native.geometry.includes('ellipse'));
});
test('circle, ellipse, rect and line inventory remain distinct',async()=>{
 const d=await read(await pptx(shape(2,{kind:'ellipse',w:100,h:100})+shape(3,{kind:'ellipse',w:100,h:50})+shape(4)+shape(5,{kind:'line',h:0})));assert.deepEqual([2,3,4,5].map(i=>geometry(byId(d,i)).kind),['circle','ellipse','rect','line']);
});
test('simple open and closed paths retain ordered vertices',async()=>{
 const custom=close=>`<a:custGeom><a:pathLst><a:path w="100" h="100"><a:moveTo><a:pt x="0" y="0"/></a:moveTo><a:lnTo><a:pt x="100" y="0"/></a:lnTo><a:lnTo><a:pt x="50" y="100"/></a:lnTo>${close?'<a:close/>':''}</a:path></a:pathLst></a:custGeom>`;
 const d=await read(await pptx(shape(2,{x:0,y:0,w:1000,h:500,geometry:custom(false)})+shape(3,{x:0,y:0,w:1000,h:500,geometry:custom(true)})));assert.equal(geometry(byId(d,2)).kind,'polyline');assert.equal(geometry(byId(d,3)).kind,'polygon');closePoints(geometry(byId(d,2)).pointsEmu,[[0,0],[1000,0],[500,500]]);
});
test('curve path unsupported is source-bound and never flattened into points',async()=>{
 const geo='<a:custGeom><a:pathLst><a:path w="100" h="100"><a:moveTo><a:pt x="0" y="0"/></a:moveTo><a:quadBezTo><a:pt x="50" y="50"/><a:pt x="100" y="0"/></a:quadBezTo></a:path></a:pathLst></a:custGeom>';
 const d=await read(await pptx(shape(2,{geometry:geo}))),o=byId(d,2);assert.equal(geometry(o),null);assert.equal(o.components[0].disposition,'UNSUPPORTED');assert.ok(o.native.xml.includes('quadBezTo'));assert.ok(o.issues.some(i=>i.code==='UNSUPPORTED_CUSTOM_PATH_COMMAND'));assert.equal(d.accountingComplete,true);
});
test('every child including unknown/picture/chart/background/hidden has a ledger identity',async()=>{
 const content=shape(2,{attrs:'hidden="1"'})+'<p:pic/><p:graphicFrame/><u:future><u:payload/></u:future>',d=await read(await pptx('',{slides:[slideXml(content,'<p:bg><p:bgPr/></p:bg>')]}));assert.equal(d.counts.objects,7);assert.equal(d.counts.components,5);assert.equal(d.counts.backgrounds,1);assert.equal(d.counts.hidden,1);assert.equal(d.sourceLedger.length,7);assert.equal(new Set(d.componentLedger.map(c=>c.componentId)).size,5);assert.ok(byId(d,2).components[0].issues.some(i=>i.code==='HIDDEN_SOURCE_POLICY'));assert.equal(d.exportReadiness,'HOLD');
});
test('same native id across slides is namespaced; duplicate within slide is explicit',async()=>{
 const d=await read(await pptx('',{slides:[slideXml(shape(2)+shape(2)),slideXml(shape(2))]}));assert.equal(new Set(d.objects.map(o=>o.sourceKey)).size,d.counts.objects);assert.equal(d.issues.filter(i=>i.code==='DUPLICATE_NATIVE_ID').length,1);
});
test('theme/unknown style unresolved is not substituted as faithful black',async()=>{
 const d=await read(await pptx(shape(2,{style:'<a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:ln/>'}))),o=byId(d,2);assert.equal(o.native.style.fill.kind,'unresolved');assert.equal(o.native.style.semanticColor,'UNKNOWN');assert.ok(o.issues.some(i=>i.code==='COLOR_OR_STYLE_UNRESOLVED'));assert.equal(o.components[0].disposition,'HUMAN_CHECK_REQUIRED');
});
test('missing xfrm/native geometry retains text, raw XML and reasons',async()=>{
 const original=shape(2,{text:textRuns}).replace(/<a:xfrm[\s\S]*?<\/a:xfrm>/,'');const d=await read(await pptx(original)),o=byId(d,2);assert.equal(geometry(o),null);assert.equal(o.components.length,2);assert.equal(o.native.text.content,'AB日本語\nC\nD');assert.ok(o.issues.some(i=>i.code==='MISSING_XFRM'));
});
test('unsafe integer is preserved as native string but not converted to finite fake geometry',async()=>{
 const d=await read(await pptx(shape(2,{x:'9007199254740993'}))),o=byId(d,2);assert.equal(o.native.xfrm.off.x,'9007199254740993');assert.equal(geometry(o),null);assert.ok(o.issues.some(i=>i.code==='INVALID_NATIVE_INTEGER'));
});
test('singular group keeps child inventory but blocks coordinate guessing',async()=>{
 const d=await read(await pptx(group(shape(2),{cw:0}))),o=byId(d,2);assert.equal(geometry(o),null);assert.ok(o.issues.some(i=>i.code==='PARENT_TRANSFORM_UNRESOLVED'));assert.ok(d.issues.some(i=>i.code==='SINGULAR_GROUP_TRANSFORM'));
});
test('missing relationship target rejects atomically',async()=>{
 const rel=`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="s0" Type="${R}/slide" Target="slides/missing.xml"/></Relationships>`;await assert.rejects(read(await pptx(shape(),{presentationRels:rel})),e=>e.code==='MISSING_RELATIONSHIP_TARGET');
});
test('missing slide size never guesses default 1200 canvas',async()=>{
 const presentation=`<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst><p:sldId id="256" r:id="s0"/></p:sldIdLst></p:presentation>`;await assert.rejects(read(await pptx(shape(),{presentation})),e=>e.code==='SLIDE_SIZE_REQUIRED');
});
test('malformed XML rejected',async()=>{await assert.rejects(read(await pptx('',{slides:['<p:sld>']})),e=>e.code==='MALFORMED_XML');});
test('DTD declarations rejected before XML parse',async()=>{await assert.rejects(read(await pptx('',{slides:['<!DOCTYPE sld [<!ENTITY x "bad">]>'+slideXml(shape())]})),e=>e.code==='XML_DTD_FORBIDDEN');});
test('unsafe ZIP path rejected before JSZip path sanitization',async()=>{await assert.rejects(read(await pptx(shape(),{extraParts:{'../escape.xml':'bad'}})),e=>e.code==='UNSAFE_ZIP_PATH');});
test('duplicate ZIP names rejected before JSZip overwrites them',async()=>{
 const bytes=await pptx(shape(),{extraParts:{'x1':'a','x2':'b'}}),buffer=Buffer.from(bytes);for(let i=0;i<buffer.length-2;i++)if(buffer[i]===120&&buffer[i+1]===50)buffer[i+1]=49;await assert.rejects(read(new Uint8Array(buffer)),e=>e.code==='DUPLICATE_ZIP_PART');
});
test('external relationships never execute network fetch',async()=>{
 const rel='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="ext" Type="image" Target="https://example.invalid/pic" TargetMode="External"/></Relationships>';const d=await read(await pptx(shape(),{slideRels:{1:rel}}));assert.ok(d.issues.some(i=>i.code==='EXTERNAL_RELATIONSHIP_NOT_FETCHED'));
});
test('JSON serialization preserves raw geometry/binding/ledger; no IR or DXF readiness',async()=>{
 const d=await read(await pptx(group(shape(2,{text:textRuns}))));assert.deepEqual(JSON.parse(JSON.stringify(d)),d);assert.equal(d.accountingComplete,true);assert.equal(d.supportedRetention,'NOT_EVALUATED');assert.equal(d.source.semanticMetadataVerified,false);assert.equal(d.contractStatus,'PROVISIONAL');
});
test('frozen fixture hashes and contract hash bind actual native bytes',async()=>{
 const contract=await readFile(new URL('../inventory-contract.json',import.meta.url));assert.equal(createHash('sha256').update(contract).digest('hex'),INVENTORY_CONTRACT_SHA256);
 const manifest=JSON.parse(await readFile(new URL('../fixtures/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.fixtures.length,6);
 for(const f of manifest.fixtures){const bytes=await readFile(new URL('../fixtures/'+f.filename,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),f.SHA256);const d=await read(new Uint8Array(bytes));assert.equal(d.source.sha256,f.SHA256);assert.equal(d.accountingComplete,true);assert.equal(d.supportedRetention,'NOT_EVALUATED');assert.equal(d.exportReadiness,'HOLD');}
});
test('duplicate slide reference rejects atomically',async()=>{
 const rel=`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="s0" Type="${R}/slide" Target="slides/slide1.xml"/><Relationship Id="s1" Type="${R}/slide" Target="slides/slide1.xml"/></Relationships>`;
 await assert.rejects(read(await pptx('',{slides:[slideXml(shape()),slideXml(shape())],presentationRels:rel})),e=>e.code==='DUPLICATE_SLIDE_REFERENCE');
});
test('blank native slide preserves infrastructure without fabricated drawing objects',async()=>{
 const d=await read(await pptx(''));assert.equal(d.counts.objects,2);assert.equal(d.counts.components,0);assert.equal(d.counts.nonDrawable,2);assert.equal(d.accountingComplete,true);assert.equal(d.exportReadiness,'HOLD');
});
test('duplicate relationship IDs reject rather than arbitrarily choosing target',async()=>{
 const rel=`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="s0" Type="${R}/slide" Target="slides/slide1.xml"/><Relationship Id="s0" Type="${R}/slide" Target="slides/slide1.xml"/></Relationships>`;
 await assert.rejects(read(await pptx(shape(),{presentationRels:rel})),e=>e.code==='DUPLICATE_RELATIONSHIP_ID');
});
