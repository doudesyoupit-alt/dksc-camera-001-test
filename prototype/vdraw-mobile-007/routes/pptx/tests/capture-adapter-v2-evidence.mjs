// Capture only Round3 adapter evidence. Frozen packages are referenced, never regenerated.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {readNativePptx} from '../native-inventory.mjs';
import {inventoryToDrawingIR} from '../inventory-ir-adapter-v2.mjs';
import {JSZip,shape,pptx} from './fixture-builder.mjs';
import {DOMParser,XMLSerializer} from './node-xml-adapter.mjs';
const out=new URL('../../../docs/architecture/tracks/B/candidate2-evidence/',import.meta.url);mkdirSync(out,{recursive:true});
const results=[];const witness=await pptx(shape(2,{style:'<a:noFill/><a:ln w="3600"><a:solidFill><a:srgbClr val="ABCDef"><a:alpha val="75000"/></a:srgbClr></a:solidFill><a:prstDash val="solid"/></a:ln>'}));writeFileSync(new URL('explicit-paint-width-alpha-witness.pptx',out),witness);
for(const[name,path,head]of [
 ['generic-synthetic-g01','fixtures/generic-synthetic-g01.pptx','7835d3588fdb53131a113e9fb1fba797d28c6a89'],
 ['generic-synthetic-g02-nested','fixtures/generic-synthetic-g02-nested.pptx','7835d3588fdb53131a113e9fb1fba797d28c6a89'],
 ['native-vdraw-n01','fixtures/native-vdraw-n01.pptx','7835d3588fdb53131a113e9fb1fba797d28c6a89'],
 ['synthetic-g03-expanded','round3/fixtures/synthetic-g03-expanded.pptx','478383bf506123b97b0b94d1d9fbba84af34295f'],
 ['explicit-paint-width-alpha-witness',null,'Containing B2 commit; no circular self-SHA']
]){
 const bytes=path?readFileSync(new URL('../../../qa/phase1/'+path,import.meta.url)):witness;
 const s=await readNativePptx(bytes,{JSZip,DOMParser,XMLSerializer,crypto:webcrypto}),r=inventoryToDrawingIR(s,{DOMParser});
 for(const[filename,value]of [[name+'.adapter-result.json',r],[name+'.ir.json',r.document],[name+'.part-manifest.json',r.manifest],[name+'.property-manifest.json',r.manifest.propertyClaims]])writeFileSync(new URL(filename,out),JSON.stringify(value,null,2)+'\n');
 results.push({fixture:name,sourceHead:head,sourceSha256:s.source.sha256,sourceObjectsAll:s.objects.length,sourceObjectsWithoutMetadataOrBackground:s.objects.filter(o=>!['NON_DRAWABLE','BACKGROUND'].includes(o.role)).length,componentsAll:s.componentLedger.length,componentsWithoutBackground:s.componentLedger.filter(c=>!c.componentId.endsWith('/background')).length,sourceGeometryDenominator:r.manifest.sourceGeometryDenominator,sourceTextDenominator:r.manifest.sourceTextDenominator,sourceInventory:r.document.sourceInventory.length,sourceLedger:r.document.sourceLedger.length,geometryCandidates:r.manifest.geometryCandidateCount,representedGeometry:r.manifest.representedGeometryCount,representedText:r.manifest.representedTextCount,unresolvedProperties:r.manifest.propertyLimitations.length,propertyStateCounts:Object.fromEntries(['EXPLICIT','UNRESOLVED','NOT_APPLICABLE'].map(state=>[state,r.document.objects.reduce((n,o)=>n+Object.values(o.style.resolution).filter(r=>r.state===state).length,0)])),customPathCoordinateBlocks:r.document.sourceLedger.filter(l=>l.reason==='CUSTOM_PATH_COORDINATE_FRAME_UNREPRESENTABLE').length,irValidation:r.validation.ok,readiness:'HOLD',reasons:[...new Set(r.manifest.capabilityLimitations.map(x=>x.reason))]});
}
writeFileSync(new URL('SOURCE-RETENTION-SUMMARY-V1.json',out),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results.map(x=>({fixture:x.fixture,objects:x.sourceObjectsAll,components:x.componentsAll,irInventory:x.sourceInventory,geometryDenominator:x.sourceGeometryDenominator,geometryCandidates:x.geometryCandidates,represented:x.representedGeometry})),null,2));
