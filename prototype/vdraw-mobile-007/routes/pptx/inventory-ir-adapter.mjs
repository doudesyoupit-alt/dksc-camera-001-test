// Isolated immutable inventory -> pinned candidate IR. No editor, DXF, network or repairs.
import {validateDrawingIR, compose, mapPoint, IR_VERSION} from '../../drawing-ir/validate.mjs';
export const ADAPTER_VERSION='vdraw-pptx-inventory-ir/1';
export const IR_PIN={head:'3e1f6892ff5c6b06644b07b8247ccd9053b978db',version:IR_VERSION,schemaSha256:'65f43167210d86fac84c9918cfc1cd7266afb05f8a53c2c5b240d4f4584096c8',validatorSha256:'8b9ab5443647f89c6b07dbe5ce13c9980a81ff2bf2b5ad1e5705b0407eefbd6e'};
const I=[1,0,0,0,1,0,0,0,1], SHA=/^[a-f0-9]{64}$/;
const P='http://schemas.openxmlformats.org/presentationml/2006/main', A='http://schemas.openxmlformats.org/drawingml/2006/main';
const clone=x=>structuredClone(x), same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const kids=n=>[...n.childNodes].filter(c=>c.nodeType===1);
const child=(n,name)=>n&&kids(n).find(c=>c.namespaceURI===A&&c.localName===name);
const near=(a,b)=>Math.abs(a-b)<=64*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
export class AdapterError extends Error {constructor(code,detail){super(code);this.code=code;this.detail=detail;}}
const fail=(c,d)=>{throw new AdapterError(c,d);};
function safeJson(x,depth=0){if(depth>100)fail('UNSAFE_INPUT_DEPTH');if(x===null||typeof x==='boolean'||typeof x==='string')return;if(typeof x==='number'){if(!Number.isFinite(x)||Math.abs(x)>Number.MAX_SAFE_INTEGER)fail('UNSAFE_COORDINATE');return;}if(!x||typeof x!=='object'||Object.getPrototypeOf(x)!==Object.prototype&&!Array.isArray(x))fail('NON_JSON_INPUT');for(const v of Object.values(x))safeJson(v,depth+1);}
function integer(s){if(typeof s!=='string'||!/^[-+]?\d+$/.test(s)||!Number.isSafeInteger(Number(s)))fail('UNSAFE_NATIVE_INTEGER',s);return Number(s);}
function numbers(g){const out=[];function walk(v,p){if(typeof v==='number')out.push({path:p,lexeme:String(v),value:v});else if(Array.isArray(v))v.forEach((x,i)=>walk(x,p+'/'+i));else if(v&&typeof v==='object')for(const[k,x]of Object.entries(v))walk(x,p+'/'+k);}walk(g,'');return out;}
function parseObject(o,Parser){if(!Parser)return null;try{return [...new Parser().parseFromString(`<root xmlns:p="${P}" xmlns:a="${A}">${o.native.xml}</root>`,'application/xml').documentElement.childNodes].find(n=>n.nodeType===1);}catch{fail('SOURCE_XML_PARSE_FAILED',o.sourceKey);}}
function spPr(node){return node&&kids(node).find(n=>n.namespaceURI===P&&n.localName==='spPr');}
function localGeometry(o,node){
 const g=o.components.find(c=>c.kind==='geometry')?.geometry;if(!g)return {reason:'UNSUPPORTED_NATIVE_GEOMETRY'};
 const xf=o.native.xfrm;if(!xf||!o.transform.matrix||!o.transform.chain.length)return {reason:'UNRESOLVED_SOURCE_TRANSFORM'};
 const w=integer(xf.ext.cx),h=integer(xf.ext.cy);if(w<0||h<0)return {reason:'NEGATIVE_SOURCE_EXTENT'};
 const pr=spPr(node),preset=child(pr,'prstGeom')?.getAttribute('prst'),custom=child(pr,'custGeom');
 let native,normalization=I;
 if(preset==='line')native={kind:'line',start:[0,0],end:[w,h]};
 else if(preset==='rect'&&w>0&&h>0)native={kind:'polygon',points:[[0,0],[w,0],[w,h],[0,h]],closed:true};
 else if(preset==='ellipse'&&w>0&&h>0){
  if(w%2||h%2)return {reason:'CONTRACT_CAPABILITY_LIMITATION_FRACTIONAL_EMU_RADIUS'};
  native=w===h?{kind:'circle',center:[w/2,h/2],radius:w/2}:{kind:'ellipse',center:[w/2,h/2],radii:[w/2,h/2],angleDeg:0};
 }else if(custom){
  const paths=kids(child(custom,'pathLst')||{childNodes:[]});if(paths.length!==1)return {reason:'UNSUPPORTED_COMPOUND_PATH'};
  const path=paths[0],pw=integer(path.getAttribute('w')),ph=integer(path.getAttribute('h'));if(pw<=0||ph<=0)return {reason:'DEGENERATE_CUSTOM_PATH'};
  const commands=kids(path);if(commands.some(n=>!['moveTo','lnTo','close'].includes(n.localName))||commands.filter(n=>n.localName==='moveTo').length!==1||commands[0]?.localName!=='moveTo'||commands.filter(n=>n.localName==='close').length>1||commands.some((n,i)=>n.localName==='close'&&i!==commands.length-1))return {reason:'UNSUPPORTED_CURVE_OR_SUBPATH'};
  const points=commands.filter(n=>n.localName!=='close').map(n=>{const p=child(n,'pt');return [integer(p?.getAttribute('x')),integer(p?.getAttribute('y'))];});
  const closed=commands.at(-1)?.localName==='close';if(points.length<(closed?3:2))return {reason:'DEGENERATE_CUSTOM_PATH'};
  native={kind:closed?'polygon':'polyline',points,closed};normalization=[w/pw,0,0,0,h/ph,0,0,0,1];
 }else return {reason:node?'UNSUPPORTED_PRESET_OR_GEOMETRY':'XML_PARSER_REQUIRED'};
 if(o.transform.status==='HUMAN_CHECK_REQUIRED')return {reason:'APP_AFFINE_SEMANTICS_UNVERIFIED',nativeGeometry:native};
 let matrix=normalization;for(const t of [...o.transform.chain].reverse()){if(!t.matrix)return {reason:'UNRESOLVED_GROUP_AFFINE'};matrix=compose(t.matrix,matrix);}
 // Recompose independently; native matrix is parent * local, path normalization is separate.
 let chain=I;for(const t of [...o.transform.chain].reverse())chain=compose(t.matrix,chain);
 if(chain.some((v,i)=>!near(v,o.transform.matrix[i])))fail('SOURCE_CHAIN_MATRIX_MISMATCH',o.sourceKey);
 if(matrix[0]*matrix[4]-matrix[1]*matrix[3]===0)return {reason:'SINGULAR_AFFINE'};
 const candidate={nativeGeometry:native,normalization,matrix};
 if(['circle','ellipse'].includes(native.kind)){
  const sx=Math.hypot(matrix[0],matrix[3]),sy=Math.hypot(matrix[1],matrix[4]);
  if(!near(sx,sy)||Math.abs(matrix[0]*matrix[1]+matrix[3]*matrix[4])>64*Number.EPSILON*Math.max(1,sx*sy))return {...candidate,reason:'UNSUPPORTED_ELLIPSE_NONSIMILARITY_OR_SKEW'};
 }
 return candidate;
}
function transformed(g,m){
 if(g.kind==='line')return {kind:'line',start:mapPoint(m,g.start),end:mapPoint(m,g.end)};
 if(g.points)return {kind:g.kind,points:g.points.map(p=>mapPoint(m,p)),closed:g.closed};
 const scale=Math.hypot(m[0],m[3]);if(g.kind==='circle')return {kind:'circle',center:mapPoint(m,g.center),radius:g.radius*scale};
 const flipped=m[0]*m[4]-m[1]*m[3]<0,rot=Math.atan2(m[3],m[0])*180/Math.PI;
 return {kind:'ellipse',center:mapPoint(m,g.center),radii:g.radii.map(x=>x*scale),angleDeg:rot+(flipped?-g.angleDeg:g.angleDeg)};
}
// Resolve only explicit style. No absent-width, absent-alpha or absent-dash defaults.
function resolvedStyle(o,node){
 const pr=spPr(node),ln=child(pr,'ln');if(!ln)return {reason:'CONTRACT_CAPABILITY_LIMITATION_UNRESOLVED_LINE_STYLE'};
 const rawWidth=ln.getAttribute('w');if(rawWidth===null)return {reason:'CONTRACT_CAPABILITY_LIMITATION_UNRESOLVED_LINE_WIDTH'};
 const width=integer(rawWidth);if(width<0)return {reason:'INVALID_STYLE_WIDTH'};
 function paint(owner){if(child(owner,'noFill'))return {value:null,opacity:null};const solid=child(owner,'solidFill'),rgb=child(solid,'srgbClr');if(!rgb||! /^[a-f\d]{6}$/i.test(rgb.getAttribute('val')||''))return null;const ts=kids(rgb);if(ts.length!==1||ts[0].localName!=='alpha')return null;const alpha=integer(ts[0].getAttribute('val'));if(alpha<0||alpha>100000)return null;return {value:'#'+rgb.getAttribute('val'),opacity:alpha/100000};}
 const stroke=paint(ln),fill=paint(pr);if(!stroke||!fill)return {reason:'CONTRACT_CAPABILITY_LIMITATION_UNRESOLVED_COLOR_OR_OPACITY'};
 const opacities=[stroke.opacity,fill.opacity].filter(x=>x!==null);if(!opacities.length||new Set(opacities).size!==1)return {reason:'CONTRACT_CAPABILITY_LIMITATION_PER_PAINT_OPACITY'};
 const dash=child(ln,'prstDash');if(!dash||dash.getAttribute('val')!=='solid'||child(ln,'custDash'))return {reason:'CONTRACT_CAPABILITY_LIMITATION_UNRESOLVED_DASH'};
 if(kids(ln).some(n=>!['solidFill','noFill','prstDash'].includes(n.localName))||Object.keys(o.native.style?.stroke?.attributes||{}).some(k=>k!=='w'))return {reason:'CONTRACT_CAPABILITY_LIMITATION_LINE_DECORATION'};
 if(kids(pr).some(n=>!['xfrm','prstGeom','custGeom','solidFill','noFill','ln'].includes(n.localName)))return {reason:'CONTRACT_CAPABILITY_LIMITATION_SHAPE_EFFECT'};
 return {style:{stroke:stroke.value,fill:fill.value,width,widthUnit:'EMU',dash:[],opacity:opacities[0],semanticColor:'UNKNOWN',evidenceIds:[]}};
}
function verifyInventory(s){
 safeJson(s);if(s.schema!=='vdraw-pptx-native-inventory/1'||s.contract?.sha256!=='ceecb509891f34d0701cdad525ee3d8d6722dbd2ea92d94aaccfe4aecf381742')fail('UNKNOWN_INVENTORY_SCHEMA');
 if(s.physicalUnit!=='EMU'||s.unitRole!=='SOURCE'||s.realWorldScaleStatus!=='UNSCALED')fail('SOURCE_UNIT_ROLE_MISMATCH');
 if(!SHA.test(s.source?.sha256)||!s.slides?.length)fail('SOURCE_IDENTITY_REQUIRED');
 const keys=s.objects.map(o=>o.sourceKey),components=s.objects.flatMap(o=>o.components.map(c=>c.id));
 if(new Set(keys).size!==keys.length||new Set(components).size!==components.length)fail('DUPLICATE_SOURCE_IDENTITY');
 if(s.counts.objects!==keys.length||s.counts.components!==components.length||s.sourceLedger.length!==keys.length||s.componentLedger.length!==components.length)fail('SOURCE_COUNT_OR_LEDGER_OMISSION');
 if(new Set(s.sourceLedger.map(l=>l.sourceKey)).size!==keys.length||new Set(s.componentLedger.map(l=>l.componentId)).size!==components.length)fail('DUPLICATE_SOURCE_LEDGER');
 for(const o of s.objects){
  const sl=s.slides[o.sourceBinding.slideIndex];if(!sl||o.sourceBinding.packageHash!==s.source.sha256||o.sourceBinding.partHash!==sl.partHash||o.sourceBinding.partPath!==sl.partPath||!SHA.test(sl.partHash)||o.sourceKey!==sl.partPath+'#'+o.sourceBinding.xmlPath)fail('SOURCE_BINDING_MISMATCH',o.sourceKey);
  const row=s.sourceLedger.find(l=>l.sourceKey===o.sourceKey);if(!row||!same(row.componentIds,o.components.map(c=>c.id)))fail('SOURCE_COMPONENT_OMISSION',o.sourceKey);
  if(Boolean(o.native.text)!==o.components.some(c=>c.kind==='text')||o.components.some(c=>c.kind==='text'&&!same(c.text,o.native.text)))fail('MISSING_OR_CHANGED_TEXT_COMPONENT',o.sourceKey);
  for(const c of o.components){const row=s.componentLedger.find(l=>l.componentId===c.id);if(!row||row.sourceKey!==o.sourceKey||!same(row.sourceBinding,o.sourceBinding))fail('SOURCE_COMPONENT_OMISSION',c.id);if(row.disposition!=='EXTRACTED'&&(!row.reasons?.length||!row.nextHumanAction))fail('UNSUPPORTED_REASON_ACTION_REQUIRED',c.id);}
 }
 if(s.slides.some((sl,i)=>sl.index!==i||!Number.isSafeInteger(sl.widthEmu)||!Number.isSafeInteger(sl.heightEmu)||sl.widthEmu<=0||sl.heightEmu<=0))fail('UNSAFE_PAGE_SIZE_OR_ORDER');
}
function sourceLexemes(o,node){
 const result=[];
 for(const [part,attrs]of Object.entries(o.native.xfrm??{}))for(const [field,value]of Object.entries(attrs))if(/^[-+]?\d+$/.test(value))result.push({path:'xfrm/'+part+'/'+field,rawLexeme:value,value:integer(value),origin:'SOURCE_XFRM_XML'});
 const custom=child(spPr(node),'custGeom'),path=kids(child(custom,'pathLst')||{childNodes:[]})[0];
 if(path){for(const name of ['w','h']){const value=path.getAttribute(name);if(value!==null)result.push({path:'custom/path/'+name,rawLexeme:value,value:integer(value),origin:'SOURCE_PATH_XML'});}kids(path).forEach((cmd,i)=>{const pt=child(cmd,'pt');if(pt)for(const name of ['x','y']){const value=pt.getAttribute(name);result.push({path:'custom/command/'+i+'/'+name,rawLexeme:value,value:integer(value),origin:'SOURCE_PATH_XML'});}});}
 return result;
}
export function inventoryToDrawingIR(s,{DOMParser=globalThis.DOMParser}={}){
 verifyInventory(s);
 const d={schemaVersion:IR_VERSION,contractStatus:'CANDIDATE',documentId:'pptx-'+s.source.sha256,sourceType:'PPTX',scaleStatus:'UNSCALED',sourceAssets:[{id:'pptx-source',sha256:s.source.sha256,mediaType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',sourceType:'PPTX',immutableUri:'urn:sha256:'+s.source.sha256}],pages:[],frames:[],calibrations:[],transforms:[],layers:[],objects:[],sourceInventory:[],sourceLedger:[],relationships:[],issues:[],exportEvaluations:[],evidence:[{id:'package',sha256:s.source.sha256,uri:'urn:sha256:'+s.source.sha256,method:'SOURCE_PACKAGE'},{id:'unit',sha256:IR_PIN.schemaSha256,uri:'urn:github:'+IR_PIN.head+':drawing-ir/schema.json',method:'PINNED_EMU_LAYOUT_CONTRACT'}]};
 const manifest={version:ADAPTER_VERSION,irPin:IR_PIN,sourceHash:s.source.sha256,sourceObjectCount:s.objects.length,sourceComponentCount:s.componentLedger.length,sourceGeometryDenominator:s.componentLedger.filter(c=>c.componentId.endsWith('/geometry')).length,sourceTextDenominator:s.componentLedger.filter(c=>c.componentId.endsWith('/text')).length,representedGeometryCount:0,geometryCandidateCount:0,representedTextCount:0,parts:[],geometryCandidates:[],capabilityLimitations:[],cadTargetPolicy:'SEPARATE_PAGE_FRAMES_NO_AGGREGATION',exportReadiness:'HOLD'};
 const pageFrames=new Map();
 const transform=(id,from,to,matrix,evidenceId,method)=>({id,fromFrameId:from,toFrameId:to,type:'AFFINE',matrix,convention:'ROW_MAJOR_COLUMN_VECTOR',composition:'NEXT_TIMES_PREVIOUS',invertible:true,provenance:{method,evidenceIds:[evidenceId]},validRegion:null,calibrationId:null});
 for(const sl of s.slides){
  const id='page-'+sl.index,native=id+'-emu',layout=id+'-layout-mm',cad=id+'-cad-mm';
  d.pages.push({id,sourceAssetId:'pptx-source',index:sl.index,objectIds:[],inventoryIds:[]});
  for(const [fid,unit,role,axis,extent]of [[native,'EMU','SOURCE','DOWN',[sl.widthEmu,sl.heightEmu]],[layout,'MM','LAYOUT','DOWN',[sl.widthEmu/36000,sl.heightEmu/36000]],[cad,'MM','LAYOUT','UP',[sl.widthEmu/36000,sl.heightEmu/36000]]])d.frames.push({id:fid,physicalUnit:unit,unitRole:role,origin:[0,0],yAxis:axis,extent,pageId:id});
  d.transforms.push(transform(id+'-unit',native,layout,[1/36000,0,0,0,1/36000,0,0,0,1],'unit','KNOWN_EMU_LAYOUT_UNIT'),transform(id+'-axis',layout,cad,[1,0,0,0,-1,sl.heightEmu/36000,0,0,1],'unit','EXPLICIT_TOP_LEFT_TO_BOTTOM_LEFT_REVERSIBLE'));
  d.layers.push({id:id+'-layer',name:'Source slide '+sl.index,provenance:'SYNTHETIC',evidenceIds:[]});
  d.evidence.push({id:id+'-part',sha256:sl.partHash,uri:'urn:pptx-part:'+sl.partPath,method:'SOURCE_PART_HASH'});pageFrames.set(sl.index,{page:d.pages.at(-1),native,layout,cad,sl});
 }
 const objectIds=new Map(s.objects.map((o,i)=>[o.sourceKey,'source-'+i]));
 function item(o,id,suffix,role,support,reason,objectIdsValue=[],parentId=null){
  const f=pageFrames.get(o.sourceBinding.slideIndex),binding={sourceAssetId:'pptx-source',sha256:s.source.sha256,pageId:f.page.id,nativeObjectId:o.sourceBinding.nativeId??'anonymous',partPath:o.sourceBinding.partPath+'#'+o.sourceBinding.xmlPath+'/'+suffix};
  const next=reason?'Inspect preserved native XML and resolve '+reason:null;
  d.sourceInventory.push({id,sourceBinding:binding,role,parentId,support,reason,nextHumanAction:next});
  d.sourceLedger.push({inventoryId:id,disposition:support==='SUPPORTED'?'REPRESENTED':support,objectIds:objectIdsValue,reason,nextHumanAction:next,policyEvidenceId:null});f.page.inventoryIds.push(id);
  if(reason){d.issues.push({id:'issue-'+d.issues.length,code:reason,inventoryId:id,reason,nextHumanAction:next,evidenceIds:[f.page.id+'-part']});manifest.capabilityLimitations.push({inventoryId:id,reason,nextHumanAction:next});}
  return binding;
 }
 s.objects.forEach((o,oi)=>{
  const id=objectIds.get(o.sourceKey),parentKey=o.transform.chain.slice(0,-1).at(-1)?.sourceKey,parent=parentKey&&objectIds.get(parentKey);let parentId=parent??null;
  // Source wrappers and component parts have distinct identities. Only real containers may parent IR inventory.
  item(o,id,'object',o.role==='CONTAINER'?'CONTAINER':o.role==='BACKGROUND'?'BACKGROUND':o.hidden?'HIDDEN':'NON_DRAWABLE',o.hidden||o.role==='BACKGROUND'?'HUMAN_CHECK_REQUIRED':'SUPPORTED',o.hidden?'HIDDEN_POLICY_REQUIRED':o.role==='BACKGROUND'?'BACKGROUND_POLICY_REQUIRED':null,[],parentId);
  manifest.parts.push({sourceKey:o.sourceKey,componentId:null,inventoryId:id,sourceRole:o.role,sourceNativeId:o.sourceBinding.nativeId,partHash:o.sourceBinding.partHash});
  const node=o.components.some(c=>c.kind==='geometry')?parseObject(o,DOMParser):null;
  for(const [ci,c]of o.components.entries()){
   const iid=id+'-part-'+ci,part={sourceKey:o.sourceKey,componentId:c.id,inventoryId:iid,sourceKind:c.kind,sourceRole:o.role,disposition:null,reason:null,objectIds:[]};
   let geometry=c.kind==='geometry'?localGeometry(o,node):null;
   const f=pageFrames.get(o.sourceBinding.slideIndex),style=c.kind==='geometry'?resolvedStyle(o,node):null;
   let reason=o.hidden?'HIDDEN_POLICY_REQUIRED':c.kind==='text'?'CONTRACT_CAPABILITY_LIMITATION_TEXT_ANCHOR_BASELINE_FONT':c.kind!=='geometry'?'UNSUPPORTED_NATIVE_'+c.kind.toUpperCase():geometry.reason??style.reason??null;
   if(c.kind==='geometry'&&geometry.nativeGeometry&&!geometry.reason){
    const unit=[1/36000,0,0,0,1/36000,0,0,0,1],axis=[1,0,0,0,-1,f.sl.heightEmu/36000,0,0,1],total=compose(axis,compose(unit,geometry.matrix));
    const candidate={inventoryId:iid,sourceKey:o.sourceKey,componentId:c.id,nativeGeometry:clone(geometry.nativeGeometry),nativeNumbers:numbers(geometry.nativeGeometry),nativeNumbersProvenance:'CANONICAL_IR_LOCAL_GEOMETRY_NOT_ORIGINAL_LEXEMES',sourceNumberLexemes:sourceLexemes(o,node),nativeFrameUnit:'EMU',unitRole:'SOURCE',layoutUnit:'MM',layoutRole:'LAYOUT',scaleStatus:'UNSCALED',affineChain:clone(o.transform.chain),normalization:geometry.normalization,matrixToPageEmu:geometry.matrix,basisVectorsPageEmu:[[geometry.matrix[0],geometry.matrix[3]],[geometry.matrix[1],geometry.matrix[4]]],basisOrientationDegrees:Math.atan2(geometry.matrix[3],geometry.matrix[0])*180/Math.PI,rotationInterpretation:'FIRST_BASIS_ORIENTATION_NOT_ASSERTED_RIGID_ROTATION',pageEmuGeometry:transformed(geometry.nativeGeometry,geometry.matrix),cadFrameId:f.cad,cadLayoutGeometry:transformed(geometry.nativeGeometry,total),styleStatus:style.reason?'UNRESOLVED':'EXPLICIT',reason};
    safeJson(candidate);
    manifest.geometryCandidates.push(candidate);manifest.geometryCandidateCount++;
   }
   const supported=!reason,unsupported=c.kind!=='geometry'&&c.kind!=='text'||geometry?.reason?.startsWith('UNSUPPORTED_');
   const binding=item(o,iid,c.kind,o.hidden?'HIDDEN':c.kind==='background'?'BACKGROUND':'DRAWABLE_PART',supported?'SUPPORTED':unsupported?'UNSUPPORTED':'HUMAN_CHECK_REQUIRED',reason, supported?[iid+'-object']:[],parentId);
   if(supported){
    const local=iid+'-local',tids=[];
    d.frames.push({id:local,physicalUnit:'EMU',unitRole:'SOURCE',origin:[0,0],yAxis:'DOWN',extent:[f.sl.widthEmu,f.sl.heightEmu],pageId:f.page.id});let from=local;
    const matrices=[...(same(geometry.normalization,I)?[]:[geometry.normalization]),...o.transform.chain.slice().reverse().map(t=>t.matrix)];
    matrices.forEach((m,j)=>{const to=j===matrices.length-1?f.native:iid+'-step-'+j;if(to!==f.native)d.frames.push({id:to,physicalUnit:'EMU',unitRole:'SOURCE',origin:[0,0],yAxis:'DOWN',extent:[f.sl.widthEmu,f.sl.heightEmu],pageId:f.page.id});const tid=iid+'-affine-'+j;d.transforms.push(transform(tid,from,to,m,f.page.id+'-part','SOURCE_NATIVE_AFFINE_CHAIN'));tids.push(tid);from=to;});
    tids.push(f.page.id+'-unit',f.page.id+'-axis');const candidate=manifest.geometryCandidates.at(-1),matrix=geometry.matrix;
    const rotation=Math.atan2(matrix[3],matrix[0])*180/Math.PI;
    d.objects.push({id:iid+'-object',kind:geometry.nativeGeometry.kind,sourceBinding:binding,sourceFrameId:local,frameId:f.cad,nativeGeometry:clone(geometry.nativeGeometry),nativeNumbers:numbers(geometry.nativeGeometry),drawingGeometry:clone(candidate.cadLayoutGeometry),transformIds:tids,layerId:f.page.id+'-layer',category:'UNKNOWN',rotation:{value:-rotation,unit:'DEG',direction:'CCW',pivot:mapPoint(compose([1/36000,0,0,0,-1/36000,f.sl.heightEmu/36000,0,0,1],matrix),[0,0])},style:style.style,confidence:{value:null,method:'NOT_MEASURED',measurementStatus:'UNMEASURED'},status:'HUMAN_CHECK_REQUIRED',relationshipIds:[]});
    f.page.objectIds.push(iid+'-object');manifest.representedGeometryCount++;part.objectIds=[iid+'-object'];
   }
   const row=d.sourceLedger.at(-1);part.disposition=row.disposition;part.reason=row.reason;manifest.parts.push(part);
  }
 });
 const validation=validateDrawingIR(d);if(!validation.ok)fail('PINNED_IR_VALIDATION_FAILED',validation.errors);
 manifest.sourceInventoryCount=d.sourceInventory.length;manifest.sourceLedgerCount=d.sourceLedger.length;
 return {schema:ADAPTER_VERSION,document:d,nativeSource:clone(s),manifest,validation,productGate:'HOLD',dxf:'NOT_IMPLEMENTED',realJwCad:'NOT_RUN'};
}
