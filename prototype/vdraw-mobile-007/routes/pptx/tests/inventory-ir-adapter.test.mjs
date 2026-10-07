import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {readNativePptx} from '../native-inventory.mjs';
import {inventoryToDrawingIR} from '../inventory-ir-adapter.mjs';
import {validateDrawingIR,mapPoint,compose} from '../../../drawing-ir/validate.mjs';
import {JSZip,shape,group,pptx,textRuns,slideXml} from './fixture-builder.mjs';
import {DOMParser,XMLSerializer} from './node-xml-adapter.mjs';
const deps={JSZip,DOMParser,XMLSerializer,crypto:webcrypto};
const alpha='<a:alpha val="75000"/>';
const style=`<a:noFill/><a:ln w="3600"><a:solidFill><a:srgbClr val="123456">${alpha}</a:srgbClr></a:solidFill><a:prstDash val="solid"/></a:ln>`;
const src=async content=>readNativePptx(await pptx(content),deps);
const adapt=s=>inventoryToDrawingIR(s,{DOMParser});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const point=(a,b)=>a.forEach((v,i)=>near(v,b[i]));
const only=r=>{assert.equal(r.document.objects.length,1);assert.equal(validateDrawingIR(r.document).ok,true);return r.document.objects[0];};
test('explicit source style line: independent endpoint/unit/axis oracle',async()=>{
 const s=await src(shape(2,{kind:'line',x:36000,y:72000,w:108000,h:144000,style})),r=adapt(s),o=only(r);
 point(o.drawingGeometry.start,[1,203.2-2]);point(o.drawingGeometry.end,[4,203.2-6]);assert.equal(o.style.stroke,'#123456');assert.equal(o.style.width,3600);assert.equal(o.style.widthUnit,'EMU');assert.equal(o.style.opacity,.75);assert.deepEqual(o.style.dash,[]);assert.equal(r.document.scaleStatus,'UNSCALED');assert.equal(r.document.calibrations.length,0);assert.equal(r.manifest.sourceGeometryDenominator,1);assert.equal(r.manifest.representedGeometryCount,1);
});
test('rotated rectangle retains all four vertices; no bbox diagonal reduction',async()=>{
 const r=adapt(await src(shape(2,{x:0,y:0,w:72000,h:36000,extra:'rot="5400000"',style}))),o=only(r);
 assert.equal(o.kind,'polygon');assert.equal(o.drawingGeometry.points.length,4);
 const expected=[[54000,-18000],[54000,54000],[18000,54000],[18000,-18000]].map(([x,y])=>[x/36000,203.2-y/36000]);o.drawingGeometry.points.forEach((p,i)=>point(p,expected[i]));
});
test('group transforms reversed local→parent composition and negative offsets preserved',async()=>{
 const r=adapt(await src(group(shape(2,{kind:'line',x:-50,y:-70,w:100,h:40,style}),{x:1000,y:2000,w:1000,h:800,cx:100,cy:200,cw:500,ch:400}))),o=only(r);
 point(o.drawingGeometry.start,[700/36000,203.2-1460/36000]);point(o.drawingGeometry.end,[900/36000,203.2-1540/36000]);assert.equal(r.manifest.geometryCandidates[0].affineChain.length,2);assert.equal(o.transformIds.length,4);
});
test('flipH line direction preserved without endpoint sorting',async()=>{
 const o=only(adapt(await src(shape(2,{kind:'line',x:0,y:0,w:72000,h:0,extra:'flipH="1"',style}))));point(o.drawingGeometry.start,[2,203.2]);point(o.drawingGeometry.end,[0,203.2]);
});
test('nonuniform nonrotated rectangular group retains geometry; no bbox approximation',async()=>{
 const o=only(adapt(await src(group(shape(2,{x:0,y:0,w:100,h:40,style}),{x:0,y:0,w:1000,h:800,cx:0,cy:0,cw:500,ch:200}))));
 const expected=[[0,0],[200,0],[200,160],[0,160]].map(([x,y])=>[x/36000,203.2-y/36000]);o.drawingGeometry.points.forEach((p,i)=>point(p,expected[i]));
});
test('nonuniform rotated group is explicit app-semantics hold',async()=>{
 const r=adapt(await src(group(shape(2,{extra:'rot="1800000"',style}),{w:1000,h:800,cw:500,ch:200})));assert.equal(r.document.objects.length,0);assert.ok(r.document.sourceLedger.some(l=>l.reason==='APP_AFFINE_SEMANTICS_UNVERIFIED'));assert.equal(r.manifest.sourceGeometryDenominator,1);
});
test('explicit resolved circle stays circle with source radius and target unit',async()=>{const o=only(adapt(await src(shape(2,{kind:'ellipse',x:0,y:0,w:72000,h:72000,style}))));assert.equal(o.kind,'circle');assert.equal(o.nativeGeometry.radius,36000);near(o.drawingGeometry.radius,1);point(o.drawingGeometry.center,[1,202.2]);});
test('similarity rotated ellipse retains radii and basis orientation',async()=>{const o=only(adapt(await src(shape(2,{kind:'ellipse',x:0,y:0,w:72000,h:36000,extra:'rot="1800000"',style}))));assert.equal(o.kind,'ellipse');o.drawingGeometry.radii.forEach((r,i)=>near(r,[1,.5][i]));near(o.drawingGeometry.angleDeg,-30);});
test('ellipse nonsimilarity is explicit unsupported, native axes retained',async()=>{const r=adapt(await src(group(shape(2,{kind:'ellipse',w:100,h:100,style}),{w:1000,h:800,cw:500,ch:200})));assert.equal(r.document.objects.length,0);assert.ok(r.document.sourceLedger.some(l=>l.reason==='UNSUPPORTED_ELLIPSE_NONSIMILARITY_OR_SKEW'));assert.equal(r.nativeSource.objects.find(o=>o.native.geometry?.includes('ellipse')).components[0].geometry.axisVectorsEmu.length,2);});
const custom=closed=>`<a:custGeom><a:pathLst><a:path w="100" h="100"><a:moveTo><a:pt x="-10" y="0"/></a:moveTo><a:lnTo><a:pt x="80" y="-20"/></a:lnTo><a:lnTo><a:pt x="100" y="100"/></a:lnTo>${closed?'<a:close/>':''}</a:path></a:pathLst></a:custGeom>`;
for(const closed of [false,true])test(`${closed?'closed polygon':'open polyline'} native path uses all signed points and normalization`,async()=>{const o=only(adapt(await src(shape(2,{x:0,y:0,w:72000,h:36000,geometry:custom(closed),style}))));assert.equal(o.kind,closed?'polygon':'polyline');assert.equal(o.nativeGeometry.closed,closed);assert.deepEqual(o.nativeGeometry.points,[[-10,0],[80,-20],[100,100]]);[[-.2,203.2],[1.6,203.4],[2,202.2]].forEach((p,i)=>point(o.drawingGeometry.points[i],p));});
test('text structure preserved separately from geometry, no guessed font/anchor/dimension',async()=>{
 const s=await src(shape(2,{style,text:textRuns})),r=adapt(s);only(r);assert.equal(r.manifest.sourceTextDenominator,1);assert.equal(r.manifest.representedTextCount,0);assert.deepEqual(r.nativeSource,s);assert.equal(r.nativeSource.objects.find(o=>o.native.text).native.text.content,'AB日本語\nC\nD');assert.ok(r.document.sourceLedger.some(l=>l.reason==='CONTRACT_CAPABILITY_LIMITATION_TEXT_ANCHOR_BASELINE_FONT'));assert.equal(r.document.objects.some(o=>o.kind==='text'),false);
});
test('missing opacity/dash: geometry retained as candidate, no invented mandatory values',async()=>{
 const r=adapt(await src(shape()));assert.equal(r.document.objects.length,0);assert.equal(r.manifest.geometryCandidateCount,1);assert.equal(r.manifest.sourceGeometryDenominator,1);assert.equal(r.manifest.representedGeometryCount,0);assert.ok(r.manifest.capabilityLimitations.some(l=>l.reason.startsWith('CONTRACT_CAPABILITY_LIMITATION_')));
});
test('theme color is unresolved, never arbitrary black',async()=>{const r=adapt(await src(shape(2,{style:'<a:noFill/><a:ln w="3600"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:prstDash val="solid"/></a:ln>'})));assert.equal(r.document.objects.length,0);assert.ok(r.document.sourceLedger.some(l=>l.reason?.includes('COLOR_OR_OPACITY')));});
test('hidden object/component and background require explicit policy',async()=>{const s=await readNativePptx(await pptx('',{slides:[slideXml(shape(2,{style,attrs:'hidden="1"'}),'<p:bg><p:bgPr><a:noFill/></p:bgPr></p:bg>')]}),deps),r=adapt(s);assert.equal(r.document.objects.length,0);assert.ok(r.document.sourceInventory.some(i=>i.role==='HIDDEN'));assert.ok(r.document.sourceInventory.some(i=>i.role==='BACKGROUND'));assert.ok(r.document.sourceLedger.every(l=>l.disposition!=='EXCLUDED_BY_POLICY'));});
test('multiple slides have independent frames/order and reversible Y mapping',async()=>{const s=await readNativePptx(await pptx('',{slides:[slideXml(shape(2,{style})),slideXml(shape(2,{style}))]}),deps),r=adapt(s);assert.equal(r.document.pages.length,2);assert.equal(r.document.objects.length,2);assert.notEqual(r.document.objects[0].frameId,r.document.objects[1].frameId);for(const t of r.document.transforms.filter(t=>t.id.endsWith('-axis')))point(mapPoint(compose(t.matrix,t.matrix),[8,12]),[8,12]);assert.deepEqual(r.document.pages.map(p=>p.index),[0,1]);});
const malformed=[
 ['unknown schema',s=>s.schema='unknown','UNKNOWN_INVENTORY_SCHEMA'],
 ['unit role mismatch',s=>s.unitRole='REAL_WORLD','SOURCE_UNIT_ROLE_MISMATCH'],
 ['unsafe coordinates',s=>s.objects[0].transform.matrix[0]=Infinity,'UNSAFE_COORDINATE'],
 ['unsafe integer',s=>s.objects.find(o=>o.native.xfrm).native.xfrm.ext.cx='9007199254740992','UNSAFE_NATIVE_INTEGER'],
 ['duplicate source identity',s=>s.objects.push(structuredClone(s.objects[0])),'DUPLICATE_SOURCE_IDENTITY'],
 ['omitted component ledger',s=>s.componentLedger.pop(),'SOURCE_COUNT_OR_LEDGER_OMISSION'],
 ['source object omitted',s=>s.objects.pop(),'SOURCE_COUNT_OR_LEDGER_OMISSION'],
 ['missing text component',s=>{const o=s.objects.find(o=>o.native.text);o.components=o.components.filter(c=>c.kind!=='text');s.componentLedger=s.componentLedger.filter(c=>!c.componentId.endsWith('/text'));s.counts.components--;s.sourceLedger.find(l=>l.sourceKey===o.sourceKey).componentIds=o.components.map(c=>c.id);},'MISSING_OR_CHANGED_TEXT_COMPONENT'],
 ['missing unsupported reason',s=>s.componentLedger.find(c=>c.disposition!=='EXTRACTED').reasons=[],'UNSUPPORTED_REASON_ACTION_REQUIRED'],
 ['missing unsupported action',s=>s.componentLedger.find(c=>c.disposition!=='EXTRACTED').nextHumanAction=null,'UNSUPPORTED_REASON_ACTION_REQUIRED'],
 ['tampered chain matrix',s=>s.objects.find(o=>o.native.xfrm).transform.chain[0].matrix[2]++,'SOURCE_CHAIN_MATRIX_MISMATCH'],
 ['duplicate component ledger',s=>s.componentLedger[1]=structuredClone(s.componentLedger[0]),'DUPLICATE_SOURCE_LEDGER']
];
for(const[name,change,code]of malformed)test('fail closed: '+name,async()=>{const s=structuredClone(await src(shape(2,{style,text:textRuns})));change(s);assert.throws(()=>adapt(s),e=>e.code===code,code);});
test('adapter output passes pinned validator; missing ledger or changed target rejected',async()=>{const r=adapt(await src(shape(2,{style}))),a=structuredClone(r.document),b=structuredClone(r.document);a.sourceLedger.pop();b.objects[0].drawingGeometry.points[2][0]++;assert.equal(validateDrawingIR(a).ok,false);assert.equal(validateDrawingIR(b).ok,false);});
test('caller source is unchanged and independent copies survive result mutation',async()=>{const s=await src(shape(2,{style})),before=JSON.stringify(s),r=adapt(s);r.nativeSource.objects.pop();r.document.objects[0].nativeGeometry.points[0][0]=99;assert.equal(JSON.stringify(s),before);});
for(const id of ['generic-synthetic-g01','generic-synthetic-g02-nested','native-vdraw-n01'])test('fixed G package '+id+': source accounting and exact native inventory preservation',async()=>{const bytes=readFileSync(new URL('../../../qa/phase1/fixtures/'+id+'.pptx',import.meta.url)),s=await readNativePptx(bytes,deps),r=adapt(s);assert.equal(r.document.sourceInventory.length,s.objects.length+s.componentLedger.length);assert.equal(r.document.sourceLedger.length,r.document.sourceInventory.length);assert.equal(r.manifest.parts.length,r.document.sourceInventory.length);assert.deepEqual(r.nativeSource,s);assert.equal(r.manifest.sourceGeometryDenominator,s.componentLedger.filter(c=>c.componentId.endsWith('/geometry')).length);assert.equal(r.document.exportEvaluations.length,0);assert.equal(r.productGate,'HOLD');});
test('original signed/zero-padded numeric lexemes survive canonical candidate mapping',async()=>{const r=adapt(await src(shape(2,{w:'+00072000',h:'00036000',style})));only(r);const c=r.manifest.geometryCandidates[0];assert.ok(c.sourceNumberLexemes.some(n=>n.rawLexeme==='+00072000'));assert.ok(c.sourceNumberLexemes.some(n=>n.rawLexeme==='00036000'));assert.ok(c.nativeNumbers.every(n=>!n.lexeme.startsWith('+')));assert.equal(c.nativeNumbersProvenance,'CANONICAL_IR_LOCAL_GEOMETRY_NOT_ORIGINAL_LEXEMES');});
test('G expanded two-page source retains 15 source objects and 17 components without declaring drawable readiness',async()=>{const bytes=readFileSync(new URL('../../../qa/phase1/round3/fixtures/synthetic-g03-expanded.pptx',import.meta.url)),s=await readNativePptx(bytes,deps),r=adapt(s);assert.equal(s.objects.filter(o=>!['NON_DRAWABLE','BACKGROUND'].includes(o.role)).length,15);assert.equal(s.componentLedger.filter(c=>!c.componentId.endsWith('/background')).length,17);assert.equal(s.objects.length,24);assert.equal(s.componentLedger.length,18);assert.equal(r.document.sourceInventory.length,42);assert.equal(r.document.sourceLedger.length,42);assert.deepEqual(r.nativeSource,s);assert.equal(r.document.objects.length,0);assert.equal(r.manifest.exportReadiness,'HOLD');});
