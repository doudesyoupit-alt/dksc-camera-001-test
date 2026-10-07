/** Pure, isolated contract validator. Never mutates source or repairs a rejected IR. */
import schema from './schema.json' with {type:'json'};
import {IR_VERSION} from './version.mjs';
export {IR_VERSION} from './version.mjs';
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=32*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
const det=m=>m[0]*(m[4]*m[8]-m[5]*m[7])-m[1]*(m[3]*m[8]-m[5]*m[6])+m[2]*(m[3]*m[7]-m[4]*m[6]);
export function compose(next,previous){
 if(![next,previous].every(m=>Array.isArray(m)&&m.length===9&&m.every(Number.isFinite)))throw Error('INVALID_MATRIX');
 const out=Array.from({length:9},(_,i)=>{const r=Math.floor(i/3),c=i%3;return [0,1,2].reduce((v,k)=>v+next[r*3+k]*previous[k*3+c],0);});
 if(!out.every(Number.isFinite))throw Error('NONFINITE_COMPOSITION');return out;
}
export function mapPoint(matrix,point){
 if(!Array.isArray(matrix)||matrix.length!==9||!matrix.every(Number.isFinite)||!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))throw Error('INVALID_POINT_MAPPING');
 const [x,y]=point,w=matrix[6]*x+matrix[7]*y+matrix[8];if(!Number.isFinite(w)||w===0)throw Error('INVALID_HOMOGRAPHY_DENOMINATOR');
 const out=[(matrix[0]*x+matrix[1]*y+matrix[2])/w,(matrix[3]*x+matrix[4]*y+matrix[5])/w];if(!out.every(Number.isFinite))throw Error('NONFINITE_MAPPING');return out;
}
export function layoutMM(value,physicalUnit,userUnit=1){
 if(!Number.isFinite(value)||!Number.isFinite(userUnit)||userUnit<=0)throw Error('INVALID_UNIT_VALUE');
 if(physicalUnit!=='PT'&&userUnit!==1)throw Error('USER_UNIT_ONLY_PDF_PT');
 const factor=physicalUnit==='EMU'?1/36000:physicalUnit==='PT'?25.4/72*userUnit:physicalUnit==='MM'?1:null;
 if(factor===null)throw Error('NO_LAYOUT_UNIT_CONVERSION');const result=physicalUnit==='EMU'?value/36000:physicalUnit==='PT'?value*25.4/72*userUnit:value;if(!Number.isFinite(result))throw Error('NONFINITE_UNIT_CONVERSION');return result;
}
/** Evaluate only keywords used by our checked-in JSON Schema, not a general JSON Schema engine. */
function check(s,value,path,out,root=schema){
 if(s.$ref){const name=s.$ref.split('/').at(-1);return check(root.$defs[name],value,path,out,root);}
 if(s.oneOf){const branches=s.oneOf.map(b=>{const e=[];check(b,value,path,e,root);return e;});if(branches.filter(e=>!e.length).length!==1)out.push({code:'SCHEMA_ONE_OF',path});return;}
 if(s.const!==undefined&&!same(value,s.const))out.push({code:'SCHEMA_CONST',path});
 if(s.enum&&!s.enum.some(x=>same(x,value)))out.push({code:'SCHEMA_ENUM',path});
 const type=Array.isArray(s.type)?s.type:[s.type];
 const match=t=>t===undefined||t==='null'&&value===null||t==='object'&&plain(value)||t==='array'&&Array.isArray(value)||t==='number'&&typeof value==='number'&&Number.isFinite(value)||t==='integer'&&Number.isSafeInteger(value)||t==='string'&&typeof value==='string'||t==='boolean'&&typeof value==='boolean';
 if(!type.some(match)){out.push({code:'SCHEMA_TYPE',path});return;}
 if(typeof value==='string'){if(s.minLength!==undefined&&value.length<s.minLength||s.maxLength!==undefined&&value.length>s.maxLength||s.pattern&&!new RegExp(s.pattern).test(value))out.push({code:'SCHEMA_STRING',path});}
 if(typeof value==='number'){if(!Number.isFinite(value)||s.minimum!==undefined&&value<s.minimum||s.maximum!==undefined&&value>s.maximum||s.exclusiveMinimum!==undefined&&value<=s.exclusiveMinimum)out.push({code:'SCHEMA_NUMBER',path});}
 if(Array.isArray(value)){if(s.minItems!==undefined&&value.length<s.minItems||s.maxItems!==undefined&&value.length>s.maxItems)out.push({code:'SCHEMA_ARRAY_SIZE',path});value.forEach((v,i)=>check(s.items,v,`${path}/${i}`,out,root));}
 if(plain(value)){for(const k of s.required||[])if(!Object.hasOwn(value,k))out.push({code:'SCHEMA_REQUIRED',path:`${path}/${k}`});for(const [k,v]of Object.entries(value)){if(!Object.hasOwn(s.properties||{},k)){if(s.additionalProperties===false)out.push({code:'SCHEMA_ADDITIONAL_PROPERTY',path:`${path}/${k}`});}else check(s.properties[k],v,`${path}/${k}`,out,root);}}
}
function jsonSafe(x,seen=new Set(),depth=0){
 if(depth>100)return false;if(x===null||typeof x==='string'||typeof x==='boolean')return true;
 if(typeof x==='number')return Number.isFinite(x);if(!plain(x)&&!Array.isArray(x)||seen.has(x))return false;
 seen.add(x);const ok=Object.values(x).every(v=>jsonSafe(v,seen,depth+1));seen.delete(x);return ok;
}
export function validateStructure(document){const errors=[];if(!jsonSafe(document))errors.push({code:'NON_JSON_OR_NONFINITE',path:'/'});else check(schema,document,'',errors);return {ok:errors.length===0,errors,scope:'JSON_SCHEMA_STRUCTURE_ONLY'};}
const identity=b=>JSON.stringify([b.sourceAssetId,b.sha256,b.pageId,b.nativeObjectId,b.partPath]);
/** Result pass means contract validation only; product or actual Jw_cad acceptance never follows. */
export function validateDrawingIR(document){
 const errors=[],add=(code,path,detail)=>errors.push({code,path,...(detail?{detail}: {})});
 if(!jsonSafe(document)){add('NON_JSON_OR_NONFINITE','/');return {ok:false,errors,version:IR_VERSION,scope:'IR_CONTRACT_ONLY'};}
 check(schema,document,'',errors);if(errors.length)return {ok:false,errors,version:IR_VERSION,scope:'IR_CONTRACT_ONLY'};
 const d=document,maps={};for(const key of ['sourceAssets','pages','frames','calibrations','transforms','layers','objects','sourceInventory','relationships','issues','exportEvaluations','evidence']){maps[key]=new Map();for(const item of d[key]){if(maps[key].has(item.id))add('DUPLICATE_ID',`/${key}`,item.id);maps[key].set(item.id,item);}}
 const {sourceAssets:assets,pages,frames,calibrations,transforms,layers,objects,sourceInventory:inventory,relationships,evidence}=maps;
 const requireRefs=(ids,map,path)=>{const seen=new Set();for(const id of ids){if(!map.has(id))add('DANGLING_REFERENCE',path,id);if(seen.has(id))add('DUPLICATE_REFERENCE',path,id);seen.add(id);}};
 const binding=(b,path)=>{const a=assets.get(b.sourceAssetId),p=pages.get(b.pageId);if(!a||a.sha256!==b.sha256||!p||p.sourceAssetId!==b.sourceAssetId)add('SOURCE_BINDING_MISMATCH',path);};
 for(const a of d.sourceAssets)if(a.sourceType!==d.sourceType)add('SOURCE_TYPE_MISMATCH','/sourceAssets',a.id);
 const pageObjects=[],pageInventory=[];
 for(const p of d.pages){if(!assets.has(p.sourceAssetId))add('PAGE_ASSET_MISSING','/pages',p.id);requireRefs(p.objectIds,objects,'/pages/objectIds');requireRefs(p.inventoryIds,inventory,'/pages/inventoryIds');for(const oid of p.objectIds){pageObjects.push(oid);if(objects.get(oid)?.sourceBinding.pageId!==p.id)add('PAGE_OBJECT_BINDING','/pages',oid);}for(const iid of p.inventoryIds){pageInventory.push(iid);if(inventory.get(iid)?.sourceBinding.pageId!==p.id)add('PAGE_INVENTORY_BINDING','/pages',iid);}}
 if(new Set(pageObjects).size!==pageObjects.length||pageObjects.length!==objects.size)add('PAGE_OBJECT_COVERAGE','/pages');
 if(new Set(pageInventory).size!==pageInventory.length||pageInventory.length!==inventory.size)add('PAGE_INVENTORY_COVERAGE','/pages');
 const expectedSourceUnit={PPTX:'EMU',PDF:'PT',PHOTO:'PX',PAPER:'PX'}[d.sourceType];
 for(const f of d.frames){if(f.pageId!==null&&!pages.has(f.pageId))add('FRAME_PAGE_MISSING','/frames',f.id);if(f.physicalUnit!=='PT'&&f.userUnit!==undefined)add('USER_UNIT_ONLY_PDF_PT','/frames',f.id);if(f.unitRole==='SOURCE'&&f.physicalUnit!==expectedSourceUnit)add('SOURCE_UNIT_MISMATCH','/frames',f.id);if(f.unitRole==='REAL_WORLD'&&f.physicalUnit!=='MM')add('REAL_WORLD_UNIT','/frames',f.id);}
 for(const c of d.calibrations){binding(c.referenceBinding,'/calibrations/referenceBinding');requireRefs(c.evidenceIds,evidence,'/calibrations/evidenceIds');requireRefs(c.scope.objectIds,objects,'/calibrations/scope');const frame=frames.get(c.scope.frameId);if(!frame)add('CALIBRATION_FRAME_MISSING','/calibrations',c.id);else if(frame.unitRole!=='SOURCE'||frame.pageId!==c.referenceBinding.pageId||frame.physicalUnit!==c.observedValueUnit)add('CALIBRATION_SOURCE_UNIT_PAGE_MISMATCH','/calibrations',c.id);if(!c.evidenceIds.some(id=>evidence.get(id)?.method==='CALIBRATION_'+c.provenance))add('CALIBRATION_EVIDENCE_METHOD_MISMATCH','/calibrations',c.id);if(!near(c.referenceValueMM/c.observedValue,c.mmPerSourceUnit))add('CALIBRATION_RATIO_MISMATCH','/calibrations',c.id);for(const id of c.scope.objectIds)if(objects.get(id)?.sourceFrameId!==c.scope.frameId||objects.get(id)?.sourceBinding.pageId!==c.referenceBinding.pageId||objects.get(id)?.sourceBinding.sourceAssetId!==c.referenceBinding.sourceAssetId)add('CALIBRATION_SCOPE_MISMATCH','/calibrations',id);}
 for(const c of d.calibrations)if(!d.sourceInventory.some(i=>same(i.sourceBinding,c.referenceBinding)))add('CALIBRATION_REFERENCE_NOT_INVENTORIED','/calibrations',c.id);
 if((d.scaleStatus==='CALIBRATED')!==(d.calibrations.length>0))add('SCALE_STATUS_MISMATCH','/scaleStatus');
 for(const t of d.transforms){const f=frames.get(t.fromFrameId),to=frames.get(t.toFrameId);if(!f||!to){add('TRANSFORM_FRAME_MISSING','/transforms',t.id);continue;}requireRefs(t.provenance.evidenceIds,evidence,'/transforms/evidenceIds');const determinant=det(t.matrix);if(!Number.isFinite(determinant)||determinant===0||t.invertible!==true)add('NONINVERTIBLE_TRANSFORM','/transforms',t.id);
  if(t.type==='AFFINE'&&!same(t.matrix.slice(6),[0,0,1]))add('AFFINE_BOTTOM_ROW','/transforms',t.id);
  if(t.type==='HOMOGRAPHY'){const r=t.validRegion;if(!r||r.min.some((v,i)=>v>=r.max[i]))add('HOMOGRAPHY_REGION_REQUIRED','/transforms',t.id);else{const ws=[r.min,[r.max[0],r.min[1]],r.max,[r.min[0],r.max[1]]].map(([x,y])=>t.matrix[6]*x+t.matrix[7]*y+t.matrix[8]);if(ws.some(w=>!Number.isFinite(w)||w===0)||Math.min(...ws)<0&&Math.max(...ws)>0)add('HOMOGRAPHY_REGION_POLE','/transforms',t.id);}}
  if(t.calibrationId!==null&&!calibrations.has(t.calibrationId))add('CALIBRATION_REFERENCE_MISSING','/transforms',t.id);
  const changingRole=f.unitRole!==to.unitRole,changingUnit=f.physicalUnit!==to.physicalUnit;
  if(to.unitRole==='REAL_WORLD'||changingUnit&&(['PX','UNSCALED'].includes(f.physicalUnit))){const c=calibrations.get(t.calibrationId);if(!c||c.scope.frameId!==t.fromFrameId)add('CALIBRATION_REQUIRED','/transforms',t.id);else{const sx=Math.hypot(t.matrix[0],t.matrix[3]),sy=Math.hypot(t.matrix[1],t.matrix[4]);if(t.type!=='AFFINE'||!near(sx,c.mmPerSourceUnit)||!near(sy,c.mmPerSourceUnit))add('CALIBRATED_TRANSFORM_FACTOR','/transforms',t.id);}}
  else if(changingUnit){if(to.physicalUnit!=='MM'||to.unitRole!=='LAYOUT'||!['EMU','PT','MM'].includes(f.physicalUnit))add('UNIT_CONVERSION_FORBIDDEN','/transforms',t.id);else{const scale=layoutMM(1,f.physicalUnit,f.physicalUnit==='PT'?(f.userUnit??1):1);if(t.type!=='AFFINE'||!near(Math.hypot(t.matrix[0],t.matrix[3]),scale)||!near(Math.hypot(t.matrix[1],t.matrix[4]),scale))add('LAYOUT_CONVERSION_FACTOR','/transforms',t.id);}}
  if(changingRole&&to.unitRole==='SOURCE')add('SOURCE_FRAME_REWRITE_FORBIDDEN','/transforms',t.id);
 }
 const bindingKeys=new Set();for(const i of d.sourceInventory){binding(i.sourceBinding,'/sourceInventory');const key=identity(i.sourceBinding);if(bindingKeys.has(key))add('COLLIDING_SOURCE_IDENTITY','/sourceInventory',i.id);bindingKeys.add(key);if(i.parentId!==null&&(!inventory.has(i.parentId)||i.parentId===i.id||inventory.get(i.parentId).role!=='CONTAINER'||inventory.get(i.parentId).sourceBinding.pageId!==i.sourceBinding.pageId))add('INVENTORY_PARENT_MISSING_OR_SELF','/sourceInventory',i.id);if(i.support!=='SUPPORTED'&&(!i.reason||!i.nextHumanAction))add('UNSUPPORTED_REASON_ACTION_REQUIRED','/sourceInventory',i.id);}
 const cycle=(start,parent,map)=>{let id=start,seen=new Set();while(id!==null){if(seen.has(id))return true;seen.add(id);const item=map.get(id);if(!item)return false;id=parent(item);}return false;};
 for(const i of d.sourceInventory)if(cycle(i.id,x=>x.parentId,inventory))add('INVENTORY_PARENT_CYCLE','/sourceInventory',i.id);
 const sourceIds=new Set(),represented=new Map();for(const l of d.sourceLedger){if(sourceIds.has(l.inventoryId))add('DUPLICATE_SOURCE_LEDGER','/sourceLedger',l.inventoryId);sourceIds.add(l.inventoryId);const i=inventory.get(l.inventoryId);if(!i){add('SOURCE_LEDGER_UNKNOWN_ITEM','/sourceLedger',l.inventoryId);continue;}requireRefs(l.objectIds,objects,'/sourceLedger/objectIds');if(i.support==='UNSUPPORTED'&&l.disposition!=='UNSUPPORTED'||i.support==='HUMAN_CHECK_REQUIRED'&&l.disposition!=='HUMAN_CHECK_REQUIRED')add('SOURCE_SUPPORT_DISPOSITION_MISMATCH','/sourceLedger',i.id);if(l.disposition!=='REPRESENTED'&&(!l.reason||!l.nextHumanAction||l.objectIds.length))add('SOURCE_LEDGER_REASON_ACTION','/sourceLedger',i.id);if(l.disposition==='EXCLUDED_BY_POLICY'&&(!l.policyEvidenceId||!evidence.has(l.policyEvidenceId)))add('EXCLUSION_POLICY_REQUIRED','/sourceLedger',i.id);if(i.support==='SUPPORTED'&&!['REPRESENTED','EXCLUDED_BY_POLICY'].includes(l.disposition))add('SUPPORTED_PART_NOT_REPRESENTED','/sourceLedger',i.id);if(i.role==='CONTAINER'&&l.objectIds.length)add('CONTAINER_DRAWABLE_CONFLATION','/sourceLedger',i.id);if(l.disposition==='REPRESENTED'&&i.role==='DRAWABLE_PART'&&!l.objectIds.length)add('DROPPED_SUPPORTED_PART','/sourceLedger',i.id);for(const oid of l.objectIds){if(represented.has(oid))add('MULTIPLE_SOURCE_MAPPING','/sourceLedger',oid);represented.set(oid,i.id);if(!same(objects.get(oid)?.sourceBinding,i.sourceBinding))add('SOURCE_OBJECT_BINDING_MISMATCH','/sourceLedger',oid);}}
 if(sourceIds.size!==inventory.size||[...inventory.keys()].some(id=>!sourceIds.has(id)))add('SOURCE_INVENTORY_OMISSION','/sourceLedger');
 for(const o of d.objects){binding(o.sourceBinding,'/objects/sourceBinding');if(!represented.has(o.id))add('OBJECT_NOT_SOURCE_ACCOUNTED','/objects',o.id);const sf=frames.get(o.sourceFrameId);if(!sf||!frames.has(o.frameId))add('OBJECT_FRAME_MISSING','/objects',o.id);else if(sf.unitRole!=='SOURCE'||sf.pageId!==o.sourceBinding.pageId)add('OBJECT_SOURCE_FRAME_PAGE_ROLE','/objects',o.id);if(!layers.has(o.layerId))add('OBJECT_LAYER_MISSING','/objects',o.id);if(o.kind!==o.drawingGeometry.kind)add('OBJECT_KIND_MISMATCH','/objects',o.id);requireRefs(o.transformIds,transforms,'/objects/transformIds');requireRefs(o.relationshipIds,relationships,'/objects/relationshipIds');requireRefs(o.style.evidenceIds,evidence,'/objects/style/evidence');if((o.style.semanticColor!=='UNKNOWN'||o.category!=='UNKNOWN')&&!o.style.evidenceIds.some(id=>evidence.get(id)?.method==='VERIFIED_SEMANTIC'))add('SEMANTIC_EVIDENCE_REQUIRED','/objects',o.id);if(o.confidence.measurementStatus==='UNMEASURED'&&o.confidence.value!==null||o.confidence.measurementStatus!=='UNMEASURED'&&o.confidence.value===null)add('CONFIDENCE_MEASUREMENT_MISMATCH','/objects',o.id);
  const coordinateEntries=geometryNumbers(o.nativeGeometry);const numberPaths=new Set();for(const v of o.nativeNumbers){if(numberPaths.has(v.path))add('DUPLICATE_NATIVE_NUMBER_PATH','/objects',o.id);numberPaths.add(v.path);if(!coordinateEntries.some(([path,value])=>path===v.path&&value===v.value))add('NATIVE_NUMBER_GEOMETRY_MISMATCH','/objects',o.id);if(!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(v.lexeme)||Number(v.lexeme)!==v.value||frames.get(o.sourceFrameId)?.physicalUnit==='EMU'&&!['/angleDeg','/startDeg','/sweepDeg'].includes(v.path)&&(!/^-?\d+$/.test(v.lexeme)||!Number.isSafeInteger(v.value)))add('NATIVE_NUMBER_PRECISION_LOSS','/objects/nativeNumbers',o.id);}
  if(['EMU','PT'].includes(sf?.physicalUnit)&&coordinateEntries.some(([path])=>!numberPaths.has(path)))add('NATIVE_NUMBER_COVERAGE_REQUIRED','/objects',o.id);
  let frame=o.sourceFrameId,matrix=[1,0,0,0,1,0,0,0,1],valid=true;for(const id of o.transformIds){const t=transforms.get(id);if(!t){valid=false;continue;}if(t.type==='HOMOGRAPHY'&&t.validRegion){try{for(const point of geometryPoints(o.nativeGeometry).map(p=>mapPoint(matrix,p)))if(point.some((v,i)=>v<t.validRegion.min[i]||v>t.validRegion.max[i]))add('OBJECT_OUTSIDE_TRANSFORM_REGION','/objects',o.id);}catch{add('INVALID_GEOMETRY_MAPPING','/objects',o.id);}}if(t.fromFrameId!==frame){add('TRANSFORM_CHAIN_DISCONNECTED','/objects',o.id);valid=false;}const c=calibrations.get(t.calibrationId);if(c&&!c.scope.objectIds.includes(o.id))add('OBJECT_OUTSIDE_CALIBRATION_SCOPE','/objects',o.id);frame=t.toFrameId;try{matrix=compose(t.matrix,matrix);}catch{add('TRANSFORM_COMPOSITION_INVALID','/objects',o.id);valid=false;}}
  if(frame!==o.frameId)add('TRANSFORM_TARGET_MISMATCH','/objects',o.id);
  if(valid){try{compareGeometry(o.nativeGeometry,o.drawingGeometry,matrix,(code)=>add(code,'/objects/geometry',o.id));}catch{add('INVALID_GEOMETRY_MAPPING','/objects',o.id);}}
 }
 validateStyleResolution(d,represented,evidence,add);
 for(const l of d.layers)requireRefs(l.evidenceIds,evidence,'/layers');
 const containment=new Map();for(const r of d.relationships){if(!objects.has(r.subjectId)||!objects.has(r.objectId)||r.subjectId===r.objectId)add('RELATIONSHIP_DANGLING_OR_SELF','/relationships',r.id);requireRefs(r.evidenceIds,evidence,'/relationships');if(r.status==='KNOWN'&&!r.evidenceIds.some(id=>evidence.get(id)?.method==='VERIFIED_RELATIONSHIP'))add('RELATIONSHIP_EVIDENCE_METHOD_REQUIRED','/relationships',r.id);if(r.confidence.measurementStatus==='UNMEASURED'&&r.confidence.value!==null||r.confidence.measurementStatus!=='UNMEASURED'&&r.confidence.value===null)add('CONFIDENCE_MEASUREMENT_MISMATCH','/relationships',r.id);if(r.kind==='CONTAINS'){if(!containment.has(r.subjectId))containment.set(r.subjectId,[]);containment.get(r.subjectId).push(r.objectId);}for(const oid of [r.subjectId,r.objectId])if(objects.has(oid)&&!objects.get(oid).relationshipIds.includes(r.id))add('RELATIONSHIP_BACKREF_MISSING','/relationships',r.id);}
 const indegree=new Map([...objects.keys()].map(id=>[id,0]));for(const next of containment.values())for(const id of next)if(indegree.has(id))indegree.set(id,indegree.get(id)+1);const queue=[...indegree].filter(([,n])=>n===0).map(([id])=>id);let processed=0;while(queue.length){const id=queue.pop();processed++;for(const next of containment.get(id)||[])if(indegree.has(next)){const n=indegree.get(next)-1;indegree.set(next,n);if(n===0)queue.push(next);}}if(processed!==objects.size)add('CONTAINS_CYCLE','/relationships');
 for(const i of d.issues){if(i.inventoryId!==null&&!inventory.has(i.inventoryId))add('ISSUE_INVENTORY_MISSING','/issues',i.id);requireRefs(i.evidenceIds,evidence,'/issues');}
 for(const e of d.exportEvaluations){const f=frames.get(e.targetFrameId);if(!f||f.unitRole!==e.unitRole)add('EXPORT_FRAME_UNIT_ROLE','/exportEvaluations',e.id);requireRefs(e.requiredInventoryIds,inventory,'/exportEvaluations/requiredInventoryIds');const expected=d.sourceInventory.filter(i=>i.role==='DRAWABLE_PART'&&i.support==='SUPPORTED').map(i=>i.id);if(expected.some(id=>!e.requiredInventoryIds.includes(id)))add('EXPORT_REQUIRED_PART_OMISSION','/exportEvaluations',e.id);
  const rows=new Map(),entities=new Map();for(const out of e.outputEntities){if(entities.has(out.id))add('DUPLICATE_TARGET_ENTITY','/exportEvaluations',out.id);entities.set(out.id,out);if(!objects.has(out.objectId)||represented.get(out.objectId)!==out.inventoryId)add('TARGET_ENTITY_SOURCE_MISMATCH','/exportEvaluations',out.id);}
  for(const row of e.retentionLedger){if(rows.has(row.inventoryId))add('DUPLICATE_TARGET_LEDGER','/exportEvaluations',row.inventoryId);rows.set(row.inventoryId,row);if(!e.requiredInventoryIds.includes(row.inventoryId))add('TARGET_LEDGER_UNKNOWN_PART','/exportEvaluations',row.inventoryId);if(row.status==='EXPORTED'){if(!row.entityIds.length)add('TARGET_PART_DROPPED','/exportEvaluations',row.inventoryId);requireRefs(row.entityIds,entities,'/exportEvaluations/entityIds');for(const id of row.entityIds)if(entities.get(id)?.inventoryId!==row.inventoryId)add('TARGET_ENTITY_PART_MISMATCH','/exportEvaluations',id);}else if(row.entityIds.length||!row.reason||!row.nextHumanAction)add('TARGET_LEDGER_REASON_ACTION','/exportEvaluations',row.inventoryId);}
  if(e.requiredInventoryIds.some(id=>!rows.has(id)))add('TARGET_LEDGER_OMISSION','/exportEvaluations',e.id);const covered=e.retentionLedger.flatMap(row=>row.entityIds);if(new Set(covered).size!==covered.length||covered.length!==entities.size||[...entities.keys()].some(id=>!covered.includes(id)))add('TARGET_ENTITY_COVERAGE','/exportEvaluations',e.id);
  const unresolved=d.sourceInventory.some(i=>i.support!=='SUPPORTED')||d.objects.some(o=>STYLE_FIELDS.some(field=>o.style.resolution[field].state==='UNRESOLVED'))||d.issues.some(i=>/UNRESOLVED|UNSUPPORTED/.test(i.code)),missing=e.retentionLedger.some(r=>r.status!=='EXPORTED');if(e.readiness==='FULL'&&(unresolved||missing))add('FALSE_FULL_RETENTION','/exportEvaluations',e.id);if(e.unitRole==='REAL_WORLD'){if(d.scaleStatus!=='CALIBRATED')add('REAL_WORLD_UNCALIBRATED','/exportEvaluations',e.id);for(const id of e.requiredInventoryIds)for(const o of d.objects.filter(o=>represented.get(o.id)===id)){if(o.frameId!==e.targetFrameId||!o.transformIds.some(tid=>calibrations.get(transforms.get(tid)?.calibrationId)?.scope.objectIds.includes(o.id)))add('REAL_WORLD_SCOPE_UNCOVERED','/exportEvaluations',o.id);}}
 }
 return {ok:errors.length===0,errors,version:IR_VERSION,scope:'IR_CONTRACT_ONLY',productGate:'HOLD'};
}
function geometryNumbers(g){
 const result=[];const walk=(value,path)=>{if(typeof value==='number')result.push([path,value]);else if(Array.isArray(value))value.forEach((v,i)=>walk(v,`${path}/${i}`));else if(plain(value))for(const [key,v]of Object.entries(value))walk(v,`${path}/${key}`);};walk(g,'');return result;
}
function geometryPoints(g){
 if(g.kind==='line')return [g.start,g.end];
 if(g.kind==='polyline'||g.kind==='polygon')return g.points;
 if(g.kind==='rect'){const [x,y]=g.origin,[w,h]=g.size;return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];}
 if(g.kind==='text')return [g.anchor,g.baseline];
 const radii=g.kind==='circle'?[g.radius,g.radius]:g.radii;const angle=g.kind==='ellipse'?g.angleDeg*Math.PI/180:0,cos=Math.cos(angle),sin=Math.sin(angle);const ex=Math.abs(radii[0]*cos)+Math.abs(radii[1]*sin),ey=Math.abs(radii[0]*sin)+Math.abs(radii[1]*cos);const [x,y]=g.center;return [[x-ex,y-ey],[x+ex,y-ey],[x+ex,y+ey],[x-ex,y+ey],g.center];
}
function compareGeometry(native,drawing,matrix,fail){
 const pt=(a,b)=>{const expected=mapPoint(matrix,a);if(!expected.every((v,i)=>near(v,b?.[i])))fail('DRAWING_GEOMETRY_TRANSFORM_MISMATCH');};
 const affine=matrix[6]===0&&matrix[7]===0&&matrix[8]===1;
 if(native.kind==='rect'&&drawing.kind==='polygon'){const corners=geometryPoints(native);if(drawing.points.length!==4||!drawing.closed){fail('RECT_QUAD_REQUIRED');return;}corners.forEach((p,i)=>pt(p,drawing.points[i]));return;}
 if(native.kind!==drawing.kind&&!(native.kind==='circle'&&drawing.kind==='ellipse')){fail('GEOMETRY_KIND_CONVERSION_UNSUPPORTED');return;}
 if(native.kind==='line'){pt(native.start,drawing.start);pt(native.end,drawing.end);}
 else if(['polygon','polyline'].includes(native.kind)){if(native.points.length!==drawing.points.length||native.closed!==drawing.closed){fail('GEOMETRY_PART_LOSS');return;}native.points.forEach((p,i)=>pt(p,drawing.points[i]));}
 else if(native.kind==='rect'){if(!affine||!near(matrix[1],0)||!near(matrix[3],0)||matrix[0]<=0||matrix[4]<=0){fail('RECT_AXIS_REPRESENTATION_UNSUPPORTED');return;}const expected=geometryPoints(native),actual=geometryPoints(drawing);expected.forEach((p,i)=>pt(p,actual[i]));}
 else if(native.kind==='text'){pt(native.anchor,drawing.anchor);pt(native.baseline,drawing.baseline);if(native.content!==drawing.content||!same(native.runs,drawing.runs)||native.lineBreaks!==drawing.lineBreaks||native.fontFamily!==drawing.fontFamily)fail('TEXT_CONTENT_LOSS');const sx=Math.hypot(matrix[0],matrix[3]),sy=Math.hypot(matrix[1],matrix[4]),dot=matrix[0]*matrix[1]+matrix[3]*matrix[4];if(!affine||!near(sx,sy)||!near(dot,0))fail('TEXT_NONSIMILARITY_UNSUPPORTED');if(!near(native.size*sx,drawing.size))fail('TEXT_SIZE_TRANSFORM_MISMATCH');}
 else {pt(native.center,drawing.center);if(!affine){fail('CURVE_HOMOGRAPHY_UNSUPPORTED');return;}
  const angle=(native.kind==='ellipse'?native.angleDeg:0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  const ax=[matrix[0]*cos+matrix[1]*sin,matrix[3]*cos+matrix[4]*sin],ay=[-matrix[0]*sin+matrix[1]*cos,-matrix[3]*sin+matrix[4]*cos];
  const sx=Math.hypot(...ax),sy=Math.hypot(...ay),dot=ax[0]*ay[0]+ax[1]*ay[1];if(!near(dot,0)){fail('CURVE_SKEW_UNSUPPORTED');return;}
  const radii=native.kind==='circle'?[native.radius,native.radius]:native.radii,expected=[radii[0]*sx,radii[1]*sy],got=drawing.kind==='circle'?[drawing.radius,drawing.radius]:drawing.radii;
  if(!expected.every((v,i)=>near(v,got[i])))fail('CURVE_RADII_TRANSFORM_MISMATCH');
  if(drawing.kind==='ellipse'){const orientation=Math.atan2(ax[1],ax[0])*180/Math.PI;if(!near(orientation,drawing.angleDeg))fail('ELLIPSE_ORIENTATION_MISMATCH');}
  if(native.kind==='arc'){if(!near(sx,sy)){fail('ARC_NONUNIFORM_TRANSFORM_UNSUPPORTED');return;}const rotation=Math.atan2(matrix[3],matrix[0])*180/Math.PI,flipped=matrix[0]*matrix[4]-matrix[1]*matrix[3]<0,start=flipped?rotation-native.startDeg:rotation+native.startDeg;if(!near(start,drawing.startDeg)||!near(native.sweepDeg,drawing.sweepDeg)||drawing.direction!==(flipped?(native.direction==='CW'?'CCW':'CW'):native.direction))fail('ARC_SWEEP_TRANSFORM_MISMATCH');}
 }
}

// candidate.2 delta only: geometry/source/unit/calibration functions above stay pinned.
const STYLE_FIELDS=['stroke','fill','width','dash','opacity'];
function explicitStyleValue(field,r){
 const raw=r.rawLexeme;
 if(['stroke','fill'].includes(field)){
  if(r.encoding==='OOXML_NO_FILL'&&raw==='noFill')return {ok:true,value:null};
  if(r.encoding==='HEX_RGB'&&typeof raw==='string'&&/^[A-Fa-f0-9]{6}$/.test(raw))return {ok:true,value:'#'+raw};
 }else if(field==='dash'&&r.encoding==='DASH_JSON'){
  try{const value=JSON.parse(raw);if(Array.isArray(value)&&value.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0))return {ok:true,value};}catch{}
 }else if(['width','opacity'].includes(field)&&r.encoding==='NUMBER'&&typeof raw==='string'&&/^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)&&Number.isFinite(Number(raw)))return {ok:true,value:Number(raw)};
 else if(field==='opacity'&&r.encoding==='OOXML_ALPHA_100000'&&typeof raw==='string'&&/^(?:0|[1-9]\d*)$/.test(raw)&&Number(raw)<=100000)return {ok:true,value:Number(raw)/100000};
 return {ok:false};
}
function validateStyleResolution(d,represented,evidence,add){
 for(const o of d.objects){
  const s=o.style,path='/objects/'+o.id+'/style/resolution';
  const noPaint=field=>s[field]===null&&s.resolution[field].state==='EXPLICIT'&&s.resolution[field].encoding==='OOXML_NO_FILL';
  for(const field of STYLE_FIELDS){
   const r=s.resolution[field];
   if(!same(r.sourceBinding,o.sourceBinding))add('STYLE_SOURCE_BINDING_MISMATCH',path+'/'+field);
   if(new Set(r.evidenceIds).size!==r.evidenceIds.length||r.evidenceIds.some(id=>!evidence.has(id)))add('STYLE_EVIDENCE_REFERENCE',path+'/'+field);
   const sourceEvidence=r.evidenceIds.some(id=>{const ev=evidence.get(id);return ev?.sha256===o.sourceBinding.sha256&&ev.method==='SOURCE_XML';});
   if(!sourceEvidence)add('STYLE_SOURCE_EVIDENCE_REQUIRED',path+'/'+field);
   if(r.state==='UNRESOLVED'){
    if(s[field]!==null||r.rawLexeme!==null||r.encoding!=='UNRESOLVED'||r.policyId!==null||!r.reason)add('STYLE_UNRESOLVED_FAKE_VALUE',path+'/'+field);
    if(!['UNKNOWN','HUMAN_CHECK_REQUIRED'].includes(o.status))add('STYLE_UNKNOWN_OBJECT_STATUS_REQUIRED',path+'/'+field);
    if(!d.issues.some(i=>i.inventoryId===represented.get(o.id)&&i.code==='STYLE_UNRESOLVED_'+field&&i.evidenceIds.some(id=>r.evidenceIds.includes(id))))add('STYLE_UNRESOLVED_ISSUE_REQUIRED',path+'/'+field);
   }else if(r.state==='EXPLICIT'){
    const decoded=explicitStyleValue(field,r);
    if(field==='width'&&s.widthUnit!==d.frames.find(f=>f.id===o.sourceFrameId)?.physicalUnit)add('STYLE_EXPLICIT_WIDTH_SOURCE_UNIT_REQUIRED',path+'/'+field);
    if(!decoded.ok||!same(decoded.value,s[field])||r.policyId!==null||r.reason!==null)add('STYLE_EXPLICIT_LEXEME_MISMATCH',path+'/'+field);
   }else if(r.state==='NOT_APPLICABLE'){
    const permitted=['width','dash'].includes(field)?noPaint('stroke'):field==='opacity'&&noPaint('stroke')&&noPaint('fill');
    if(!permitted||s[field]!==null||r.rawLexeme!==null||r.encoding!=='NOT_APPLICABLE'||r.policyId!==null||!r.reason)add('STYLE_NOT_APPLICABLE_INVALID',path+'/'+field);
   }else {
    // No independently validated spec-default policies are adopted by this candidate.
    add('STYLE_SPEC_DEFAULT_POLICY_NOT_VALIDATED',path+'/'+field);
   }
  }
 }
}
