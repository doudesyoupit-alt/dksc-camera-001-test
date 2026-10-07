// Capture only Round3 adapter evidence. Frozen packages are referenced, never regenerated.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {readNativePptx} from '../native-inventory.mjs';
import {inventoryToDrawingIR} from '../inventory-ir-adapter.mjs';
import {JSZip} from './fixture-builder.mjs';
import {DOMParser,XMLSerializer} from './node-xml-adapter.mjs';
const out=new URL('../../../docs/architecture/tracks/B/round3-evidence/',import.meta.url);mkdirSync(out,{recursive:true});
const results=[];
for(const[name,path,head]of [
 ['generic-synthetic-g01','fixtures/generic-synthetic-g01.pptx','7835d3588fdb53131a113e9fb1fba797d28c6a89'],
 ['generic-synthetic-g02-nested','fixtures/generic-synthetic-g02-nested.pptx','7835d3588fdb53131a113e9fb1fba797d28c6a89'],
 ['native-vdraw-n01','fixtures/native-vdraw-n01.pptx','7835d3588fdb53131a113e9fb1fba797d28c6a89'],
 ['synthetic-g03-expanded','round3/fixtures/synthetic-g03-expanded.pptx','478383bf506123b97b0b94d1d9fbba84af34295f']
]){
 const bytes=readFileSync(new URL('../../../qa/phase1/'+path,import.meta.url));
 const s=await readNativePptx(bytes,{JSZip,DOMParser,XMLSerializer,crypto:webcrypto}),r=inventoryToDrawingIR(s,{DOMParser});
 for(const[filename,value]of [[name+'.adapter-result.json',r],[name+'.ir.json',r.document],[name+'.part-manifest.json',r.manifest]])writeFileSync(new URL(filename,out),JSON.stringify(value,null,2)+'\n');
 results.push({fixture:name,sourceHead:head,sourceSha256:s.source.sha256,sourceObjectsAll:s.objects.length,sourceObjectsWithoutMetadataOrBackground:s.objects.filter(o=>!['NON_DRAWABLE','BACKGROUND'].includes(o.role)).length,componentsAll:s.componentLedger.length,componentsWithoutBackground:s.componentLedger.filter(c=>!c.componentId.endsWith('/background')).length,sourceGeometryDenominator:r.manifest.sourceGeometryDenominator,sourceTextDenominator:r.manifest.sourceTextDenominator,sourceInventory:r.document.sourceInventory.length,sourceLedger:r.document.sourceLedger.length,geometryCandidates:r.manifest.geometryCandidateCount,representedGeometry:r.manifest.representedGeometryCount,representedText:r.manifest.representedTextCount,irValidation:r.validation.ok,readiness:'HOLD',reasons:[...new Set(r.manifest.capabilityLimitations.map(x=>x.reason))]});
}
writeFileSync(new URL('SOURCE-RETENTION-SUMMARY-V1.json',out),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results.map(x=>({fixture:x.fixture,objects:x.sourceObjectsAll,components:x.componentsAll,irInventory:x.sourceInventory,geometryDenominator:x.sourceGeometryDenominator,geometryCandidates:x.geometryCandidates,represented:x.representedGeometry})),null,2));
