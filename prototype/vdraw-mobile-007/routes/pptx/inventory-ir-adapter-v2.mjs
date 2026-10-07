// Isolated immutable inventory -> pinned candidate IR. No editor, DXF, network or repairs.
import {validateDrawingIR, compose, mapPoint, IR_VERSION} from '../../drawing-ir/candidate-2/validate.mjs';
export const ADAPTER_VERSION='vdraw-pptx-inventory-ir/2';
export const IR_PIN={head:'32fac121b5a7df53cde79e0be515581a9dc8496d',version:IR_VERSION,schemaSha256:'5ad6ce7875e7cd70ee9d95daec98d91aa43b0bb74b1a16aefe76c25b546fcdbc',validatorSha256:'b69ac8f46d533674bc9d1c500dcf28b6d121bb874b7dce644a8f16d0b72055a2'};
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
 let native,normalization=I,coordinateUnit='EMU',pathExtent=null;
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
  coordinateUnit='PATH_COORDINATE';pathExtent=[pw,ph];native={kind:closed?'polygon':'polyline',points,closed};normalization=[w/pw,0,0,0,h/ph,0,0,0,1];
 }else return {reason:node?'UNSUPPORTED_PRESET_OR_GEOMETRY':'XML_PARSER_REQUIRED'};
 if(o.transform.status==='HUMAN_CHECK_REQUIRED')return {reason:'APP_AFFINE_SEMANTICS_UNVERIFIED',nativeGeometry:native};
 let matrix=normalization;for(const t of [...o.transform.chain].reverse()){if(!t.matrix)return {reason:'UNRESOLVED_GROUP_AFFINE'};matrix=compose(t.matrix,matrix);}
 // Recompose independently; native matrix is parent * local, path normalization is separate.
 let chain=I;for(const t of [...o.transform.chain].reverse())chain=compose(t.matrix,chain);
 if(chain.some((v,i)=>!near(v,o.transform.matrix[i])))fail('SOURCE_CHAIN_MATRIX_MISMATCH',o.sourceKey);
 if(matrix[0]*matrix[4]-matrix[1]*matrix[3]===0)return {reason:'SINGULAR_AFFINE'};
 const candidate={nativeGeometry:native,normalization,matrix,coordinateUnit,pathExtent};
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
// candidate.2 resolves raw direct fields independently; no synthesized OOXML defaults.
function partialStyle(o,node,binding,evidenceId){
 const pr=spPr(node),ln=child(pr,'ln'),base=o.sourceBinding.partPath+'#'+o.sourceBinding.xmlPath+'/p:spPr';
 const style={stroke:null,fill:null,width:null,widthUnit:'EMU',dash:null,opacity:null,semanticColor:'UNKNOWN',evidenceIds:[evidenceId],resolution:{}};
 const claims=[],limitations=[];
 function field(name,value,state,encoding,rawLexeme,path,reason=null,sourceRaw=rawLexeme){
  style[name]=value;style.resolution[name]={state,evidenceIds:[evidenceId],sourceBinding:clone(binding),propertyPath:path,rawLexeme,encoding,reason,policyId:null};
  claims.push({field:name,state,propertyPath:path,sourceRawLexeme:sourceRaw,present:sourceRaw!==null,value,encoding,reason});
  if(state==='UNRESOLVED')limitations.push({field:name,reason,propertyPath:path,sourceRawLexeme:sourceRaw});
 }
 function unresolved(name,path,reason,raw=null){field(name,null,'UNRESOLVED','UNRESOLVED',null,path,reason,raw);}
 function paint(name,owner,path){
  if(child(owner,'noFill')){field(name,null,'EXPLICIT','OOXML_NO_FILL','noFill',path+'/a:noFill');return {noPaint:true};}
  const rgb=child(child(owner,'solidFill'),'srgbClr'),raw=rgb?.getAttribute('val')??null,colorPath=path+'/a:solidFill/a:srgbClr/@val';
  if(!rgb||! /^[a-f\d]{6}$/i.test(raw||'')||kids(rgb).some(n=>n.namespaceURI!==A||n.localName!=='alpha')){unresolved(name,colorPath,'UNRESOLVED_THEME_INHERITANCE_OR_COLOR_TRANSFORM',raw);return {unknown:true};}
  field(name,'#'+raw,'EXPLICIT','HEX_RGB',raw,colorPath);
  const ts=kids(rgb),alpha=ts.length===1?ts[0].getAttribute('val'):null,alphaPath=path+'/a:solidFill/a:srgbClr/a:alpha/@val';
  return {noPaint:false,alpha:alpha!==null&&/^(?:0|[1-9]\d*)$/.test(alpha)&&Number(alpha)<=100000?alpha:null,alphaRaw:alpha,alphaPath};
 }
 const stroke=paint('stroke',ln,base+'/a:ln'),fill=paint('fill',pr,base);
 const width=ln?.getAttribute('w')??null;
 if(width!==null&&/^(?:0|[1-9]\d*)$/.test(width)&&Number.isSafeInteger(Number(width)))field('width',Number(width),'EXPLICIT','NUMBER',width,base+'/a:ln/@w');
 else if(stroke.noPaint)field('width',null,'NOT_APPLICABLE','NOT_APPLICABLE',null,base+'/a:ln/@w','EXPLICIT_NO_STROKE',width);
 else unresolved('width',base+'/a:ln/@w',width===null?'UNRESOLVED_NATIVE_WIDTH':'UNSUPPORTED_NATIVE_WIDTH_LEXICAL_ENCODING',width);
 const dash=child(ln,'prstDash'),dashRaw=dash?.getAttribute('val')??null;
 if(stroke.noPaint)field('dash',null,'NOT_APPLICABLE','NOT_APPLICABLE',null,base+'/a:ln/a:prstDash/@val','EXPLICIT_NO_STROKE',dashRaw);
 else unresolved('dash',base+'/a:ln/a:prstDash/@val',dashRaw!==null?'UNSUPPORTED_NATIVE_DASH_LEXICAL_ENCODING':'UNRESOLVED_NATIVE_DASH',dashRaw);
 if(stroke.noPaint&&fill.noPaint)field('opacity',null,'NOT_APPLICABLE','NOT_APPLICABLE',null,base,'EXPLICIT_NO_PAINT');
 else {
  const active=[stroke,fill].filter(x=>!x.noPaint),alphas=active.map(x=>x.alpha);
  if(active.length&&active.every(x=>!x.unknown&&x.alpha!==null)&&new Set(alphas).size===1)field('opacity',Number(alphas[0])/100000,'EXPLICIT','OOXML_ALPHA_100000',alphas[0],active[0].alphaPath);
  else unresolved('opacity',active.find(x=>x.alphaPath)?.alphaPath??base,'UNRESOLVED_OR_PER_PAINT_OPACITY',active.find(x=>x.alphaRaw)?.alphaRaw??null);
 }
 return {style,claims,limitations};
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
 const d={schemaVersion:IR_VERSION,contractStatus:'CANDIDATE',documentId:'pptx-'+s.source.sha256,sourceType:'PPTX',scaleStatus:'UNSCALED',sourceAssets:[{id:'pptx-source',sha256:s.source.sha256,mediaType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',sourceType:'PPTX',immutableUri:'urn:sha256:'+s.source.sha256}],pages:[],frames:[],calibrations:[],transforms:[],layers:[],objects:[],sourceInventory:[],sourceLedger:[],relationships:[],issues:[],exportEvaluations:[],evidence:[{id:'package',sha256:s.source.sha256,uri:'urn:sha256:'+s.source.sha256,method:'SOURCE_PACKAGE'},{id:'unit',sha256:IR_PIN.schemaSha256,uri:'urn:github:'+IR_PIN.head+':drawing-ir/candidate-2/schema.json',method:'PINNED_EMU_LAYOUT_CONTRACT'}]};
 const manifest={version:ADAPTER_VERSION,irPin:IR_PIN,sourceHash:s.source.sha256,sourceObjectCount:s.objects.length,sourceComponentCount:s.componentLedger.length,sourceGeometryDenominator:s.componentLedger.filter(c=>c.componentId.endsWith('/geometry')).length,sourceTextDenominator:s.componentLedger.filter(c=>c.componentId.endsWith('/text')).length,representedGeometryCount:0,geometryCandidateCount:0,representedTextCount:0,parts:[],geometryCandidates:[],capabilityLimitations:[],propertyLimitations:[],propertyClaims:[],cadTargetPolicy:'SEPARATE_PAGE_FRAMES_NO_AGGREGATION',exportReadiness:'HOLD'};
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
   const f=pageFrames.get(o.sourceBinding.slideIndex);
   let reason=o.hidden?'HIDDEN_POLICY_REQUIRED':c.kind==='text'?'CONTRACT_CAPABILITY_LIMITATION_TEXT_ANCHOR_BASELINE_FONT':c.kind!=='geometry'?'UNSUPPORTED_NATIVE_'+c.kind.toUpperCase():geometry.reason??(geometry.coordinateUnit==='PATH_COORDINATE'?'CUSTOM_PATH_COORDINATE_FRAME_UNREPRESENTABLE':null);
   if(c.kind==='geometry'&&geometry.nativeGeometry&&!geometry.reason){
    const unit=[1/36000,0,0,0,1/36000,0,0,0,1],axis=[1,0,0,0,-1,f.sl.heightEmu/36000,0,0,1],total=compose(axis,compose(unit,geometry.matrix));
    const candidate={inventoryId:iid,sourceKey:o.sourceKey,componentId:c.id,nativeGeometry:clone(geometry.nativeGeometry),nativeNumbers:numbers(geometry.nativeGeometry),nativeNumbersProvenance:'CANONICAL_IR_LOCAL_GEOMETRY_NOT_ORIGINAL_LEXEMES',sourceNumberLexemes:sourceLexemes(o,node),nativeFrameUnit:geometry.coordinateUnit,pathExtent:geometry.pathExtent,pathUnitDefinition:geometry.coordinateUnit==='PATH_COORDINATE'?'ARBITRARY_A_PATH_WIDTH_HEIGHT_COORDINATES':'SHAPE_LOCAL_EMU',normalizationTargetUnit:'EMU',unitRole:geometry.coordinateUnit==='PATH_COORDINATE'?'SOURCE_PATH_COORDINATE':'SOURCE',layoutUnit:'MM',layoutRole:'LAYOUT',scaleStatus:'UNSCALED',affineChain:clone(o.transform.chain),normalization:geometry.normalization,matrixToPageEmu:geometry.matrix,basisVectorsPageEmu:[[geometry.matrix[0],geometry.matrix[3]],[geometry.matrix[1],geometry.matrix[4]]],basisOrientationDegrees:Math.atan2(geometry.matrix[3],geometry.matrix[0])*180/Math.PI,rotationInterpretation:'FIRST_BASIS_ORIENTATION_NOT_ASSERTED_RIGID_ROTATION',pageEmuGeometry:transformed(geometry.nativeGeometry,geometry.matrix),cadFrameId:f.cad,cadLayoutGeometry:transformed(geometry.nativeGeometry,total),styleStatus:'PARTIAL_SOURCE_PROPERTIES_EVALUATED_FOR_IR_OBJECTS',typeAdaptation:c.geometry?.kind==='rect'?'RECT_TO_ALL_FOUR_CORNER_POLYGON':null,reason};
    safeJson(candidate);
    manifest.geometryCandidates.push(candidate);manifest.geometryCandidateCount++;
   }
   const supported=!reason,unsupported=c.kind!=='geometry'&&c.kind!=='text'||geometry?.reason?.startsWith('UNSUPPORTED_');
   const binding=item(o,iid,c.kind,o.hidden?'HIDDEN':c.kind==='background'?'BACKGROUND':'DRAWABLE_PART',supported?'SUPPORTED':unsupported?'UNSUPPORTED':'HUMAN_CHECK_REQUIRED',reason, supported?[iid+'-object']:[],parentId);
   if(supported){
    const local=iid+'-local',tids=[];const styleEvidenceId=iid+'-style-source';d.evidence.push({id:styleEvidenceId,sha256:s.source.sha256,uri:'urn:pptx-xml:'+s.source.sha256+':'+o.sourceBinding.partPath+'#'+o.sourceBinding.xmlPath,method:'SOURCE_XML'});const partial=partialStyle(o,node,binding,styleEvidenceId);for(const limitation of partial.limitations){d.issues.push({id:'issue-'+d.issues.length,code:'STYLE_UNRESOLVED_'+limitation.field,inventoryId:iid,reason:limitation.reason,nextHumanAction:'Resolve native source appearance before faithful target export',evidenceIds:[styleEvidenceId]});manifest.propertyLimitations.push({inventoryId:iid,...limitation});}manifest.propertyClaims.push({inventoryId:iid,sourceKey:o.sourceKey,partHash:o.sourceBinding.partHash,fields:partial.claims});
    d.frames.push({id:local,physicalUnit:'EMU',unitRole:'SOURCE',origin:[0,0],yAxis:'DOWN',extent:[f.sl.widthEmu,f.sl.heightEmu],pageId:f.page.id});let from=local;
    const matrices=[...(same(geometry.normalization,I)?[]:[geometry.normalization]),...o.transform.chain.slice().reverse().map(t=>t.matrix)];
    matrices.forEach((m,j)=>{const to=j===matrices.length-1?f.native:iid+'-step-'+j;if(to!==f.native)d.frames.push({id:to,physicalUnit:'EMU',unitRole:'SOURCE',origin:[0,0],yAxis:'DOWN',extent:[f.sl.widthEmu,f.sl.heightEmu],pageId:f.page.id});const tid=iid+'-affine-'+j;d.transforms.push(transform(tid,from,to,m,f.page.id+'-part','SOURCE_NATIVE_AFFINE_CHAIN'));tids.push(tid);from=to;});
    tids.push(f.page.id+'-unit',f.page.id+'-axis');const candidate=manifest.geometryCandidates.at(-1),matrix=geometry.matrix;
    const rawRotation=o.native.xfrm.attributes.rot??null,sourceRotation={value:integer(rawRotation??'0')/60000,unit:'DEG',direction:'CW',pivot:[integer(o.native.xfrm.ext.cx)/2,integer(o.native.xfrm.ext.cy)/2]};candidate.sourceRotationDeclaration={...clone(sourceRotation),rawLexeme:rawRotation,declared:rawRotation!==null,pivotFrameId:local,pivotUnit:'EMU',pivotRole:'SHAPE_LOCAL_SOURCE',pivotProvenance:'DERIVED_CENTER_OF_NATIVE_EXTENT',absentRotationRepresentation:rawRotation===null?'UNDECLARED_IDENTITY_OPERATION_CONTRACT_REQUIRES_ZERO_METADATA':null};
    d.objects.push({id:iid+'-object',kind:geometry.nativeGeometry.kind,sourceBinding:binding,sourceFrameId:local,frameId:f.cad,nativeGeometry:clone(geometry.nativeGeometry),nativeNumbers:numbers(geometry.nativeGeometry),drawingGeometry:clone(candidate.cadLayoutGeometry),transformIds:tids,layerId:f.page.id+'-layer',category:'UNKNOWN',rotation:sourceRotation,style:partial.style,confidence:{value:null,method:'NOT_MEASURED',measurementStatus:'UNMEASURED'},status:'HUMAN_CHECK_REQUIRED',relationshipIds:[]});
    f.page.objectIds.push(iid+'-object');manifest.representedGeometryCount++;part.objectIds=[iid+'-object'];
   }
   const row=d.sourceLedger.at(-1);part.disposition=row.disposition;part.reason=row.reason;manifest.parts.push(part);
  }
 });
 const validation=validateDrawingIR(d);if(!validation.ok)fail('PINNED_IR_VALIDATION_FAILED',validation.errors);
 manifest.sourceInventoryCount=d.sourceInventory.length;manifest.sourceLedgerCount=d.sourceLedger.length;
 return {schema:ADAPTER_VERSION,document:d,nativeSource:clone(s),manifest,validation,productGate:'HOLD',dxf:'NOT_IMPLEMENTED',realJwCad:'NOT_RUN'};
}
