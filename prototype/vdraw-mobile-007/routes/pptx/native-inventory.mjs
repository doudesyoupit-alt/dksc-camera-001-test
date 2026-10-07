// Isolated native OOXML inventory. No Editor, IR adapter, CAD export or network.
export const INVENTORY_SCHEMA = 'vdraw-pptx-native-inventory/1';
export const INVENTORY_CONTRACT_SHA256 = 'ceecb509891f34d0701cdad525ee3d8d6722dbd2ea92d94aaccfe4aecf381742';
const P='http://schemas.openxmlformats.org/presentationml/2006/main';
const A='http://schemas.openxmlformats.org/drawingml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL='http://schemas.openxmlformats.org/package/2006/relationships';
const LIMIT={bytes:30*1024*1024,expanded:100*1024*1024,parts:5000,slides:50,objects:5000,depth:32};
const I=[1,0,0,0,1,0,0,0,1];
const local=n=>n.localName;
const children=n=>[...n.childNodes].filter(x=>x.nodeType===1);
const direct=(n,ns,name)=>children(n).find(x=>x.namespaceURI===ns&&local(x)===name);
const descendants=(n,ns,name)=>[...n.getElementsByTagNameNS(ns,name)];
const attrs=n=>n?Object.fromEntries([...n.attributes].map(x=>[x.name,x.value])):{};
const truth=v=>v==='1'||v==='true';
const multiply=(a,b)=>Array.from({length:9},(_,i)=>[0,1,2].reduce((v,k)=>v+a[Math.floor(i/3)*3+k]*b[k*3+i%3],0));
const translate=(x,y)=>[1,0,x,0,1,y,0,0,1];
const scale=(x,y)=>[x,0,0,0,y,0,0,0,1];
const point=(m,p)=>[m[0]*p[0]+m[1]*p[1]+m[2],m[3]*p[0]+m[4]*p[1]+m[5]];
const vector=(m,p)=>[m[0]*p[0]+m[1]*p[1],m[3]*p[0]+m[4]*p[1]];
const hash=async(crypto,bytes)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
export class InventoryError extends Error { constructor(code,message,source=null){super(message);this.name='InventoryError';this.code=code;this.source=source;} }
const fail=(code,message,source)=>{throw new InventoryError(code,message,source);};
function xmlParse(text,Parser,path){
 if(/<!DOCTYPE|<!ENTITY/i.test(text))fail('XML_DTD_FORBIDDEN','DTD/entity declarations are not accepted',path);
 let doc;try{doc=new Parser().parseFromString(text,'application/xml');}catch{fail('MALFORMED_XML','Invalid native XML',path);}
 if(descendants(doc,'*','parsererror').length||doc.documentElement?.localName==='parsererror')fail('MALFORMED_XML','Invalid native XML',path);
 return doc;
}
function partTarget(base,target){
 if(!target||target.includes('\\')||/[?#\u0000]/.test(target)||/^[a-z][a-z\d+.-]*:/i.test(target))fail('UNSAFE_RELATIONSHIP','Unsafe relationship target',base);
 const output=target.startsWith('/')?[]:base.split('/').slice(0,-1);
 for(const x of target.split('/')){if(!x||x==='.')continue;if(x==='..'){if(!output.length)fail('UNSAFE_RELATIONSHIP','Target escapes package',base);output.pop();}else output.push(x);}
 return output.join('/');
}
function relPath(path){const p=path.split('/'),name=p.pop();return [...p,'_rels',name+'.rels'].join('/');}
// Validate raw ZIP central directory before JSZip can overwrite duplicate names.
function zipInventory(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(view.getUint32(p,true)===0x06054b50&&p+22+view.getUint16(p+20,true)===bytes.length){end=p;break;}
 if(end<0)fail('INVALID_ZIP','ZIP end record missing');
 const count=view.getUint16(end+10,true),start=view.getUint32(end+16,true),size=view.getUint32(end+12,true);
 if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||count===65535||start===0xffffffff||size===0xffffffff)fail('UNSUPPORTED_ZIP','Multi-disk/ZIP64 packages are not supported');
 if(count>LIMIT.parts||start+size!==end)fail('ZIP_LIMIT_OR_BOUNDS','Package entry count or bounds invalid');
 let pos=start,total=0;const names=new Set(),decoder=new TextDecoder('utf-8',{fatal:true});
 for(let i=0;i<count;i++){
  if(pos+46>end||view.getUint32(pos,true)!==0x02014b50)fail('INVALID_ZIP','Invalid central directory');
  const flags=view.getUint16(pos+8,true),method=view.getUint16(pos+10,true),expanded=view.getUint32(pos+24,true),nl=view.getUint16(pos+28,true),el=view.getUint16(pos+30,true),cl=view.getUint16(pos+32,true),next=pos+46+nl+el+cl;
  if(next>end||flags&1||![0,8].includes(method))fail('UNSUPPORTED_ZIP','Encrypted/unknown ZIP method or invalid bounds');
  let name;try{name=decoder.decode(bytes.subarray(pos+46,pos+46+nl));}catch{fail('ZIP_NAME_ENCODING','ZIP part names must be UTF-8/ASCII');}
  if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(n=>n==='..')||name.includes('\0'))fail('UNSAFE_ZIP_PATH','Unsafe package part path',name);
  if(names.has(name))fail('DUPLICATE_ZIP_PART','Duplicate package part',name);names.add(name);
  total+=expanded;if(total>LIMIT.expanded)fail('ZIP_EXPANSION_LIMIT','Expanded package exceeds limit');pos=next;
 }
 if(pos!==end)fail('INVALID_ZIP','Central directory count mismatch');
 return {entryCount:count,declaredExpandedBytes:total,names:[...names]};
}
function integer(raw,label,issues,{positive=false,optional=false}={}){
 if(raw==null&&optional)return 0;
 if(raw==null||!/^[-+]?\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||(positive&&Number(raw)<=0)){issues.push({code:'INVALID_NATIVE_INTEGER',field:label,raw,nextHumanAction:'Inspect native geometry; do not guess coordinates'});return null;}
 return Number(raw);
}
function xfrm(node,isGroup,issues){
 const owner=direct(node,P,isGroup?'grpSpPr':'spPr'),xf=owner&&direct(owner,A,'xfrm');
 if(!xf){issues.push({code:'MISSING_XFRM',nextHumanAction:'Inspect layout/master inheritance or supply native geometry'});return null;}
 const off=direct(xf,A,'off'),ext=direct(xf,A,'ext'),chOff=direct(xf,A,'chOff'),chExt=direct(xf,A,'chExt');
 const raw={attributes:attrs(xf),off:attrs(off),ext:attrs(ext),chOff:attrs(chOff),chExt:attrs(chExt)};
 const x=integer(off?.getAttribute('x'),'off.x',issues),y=integer(off?.getAttribute('y'),'off.y',issues),w=integer(ext?.getAttribute('cx'),'ext.cx',issues),h=integer(ext?.getAttribute('cy'),'ext.cy',issues),rot=integer(xf.hasAttribute('rot')?xf.getAttribute('rot'):null,'rot',issues,{optional:true});
 const fh=xf.getAttribute('flipH'),fv=xf.getAttribute('flipV');
 if([fh,fv].some(v=>v!==null&&!['0','1','false','true',''].includes(v)))issues.push({code:'INVALID_FLIP',nextHumanAction:'Inspect native flip attributes'});
 if([x,y,w,h,rot].includes(null)||w<0||h<0)return {raw,matrix:null};
 const rad=rot/60000*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad),rotation=[c,-s,0,s,c,0,0,0,1],flip=scale(truth(fh)?-1:1,truth(fv)?-1:1);
 let base=translate(x,y);
 if(isGroup){
  const cx=integer(chOff?.getAttribute('x'),'chOff.x',issues),cy=integer(chOff?.getAttribute('y'),'chOff.y',issues),cw=integer(chExt?.getAttribute('cx'),'chExt.cx',issues,{positive:true}),ch=integer(chExt?.getAttribute('cy'),'chExt.cy',issues,{positive:true});
  if([cx,cy,cw,ch].includes(null)||w===0||h===0){issues.push({code:'SINGULAR_GROUP_TRANSFORM',nextHumanAction:'Inspect group extents'});return {raw,matrix:null};}
  base=multiply(multiply(base,scale(w/cw,h/ch)),translate(-cx,-cy));
  const about=multiply(multiply(translate(x+w/2,y+h/2),multiply(rotation,flip)),translate(-x-w/2,-y-h/2));base=multiply(about,base);
 }else base=multiply(multiply(multiply(translate(x+w/2,y+h/2),rotation),flip),translate(-w/2,-h/2));
 if(base.some(v=>!Number.isFinite(v))){issues.push({code:'INVALID_TRANSFORM',nextHumanAction:'Inspect transform values'});base=null;}
 return {raw,matrix:base,extentEmu:[w,h],rotationRaw:rot,rotationDegrees:rot/60000,pivotEmu:[x+w/2,y+h/2],flipH:truth(fh),flipV:truth(fv)};
}
function geometry(node,xf,matrix,issues){
 const pr=direct(node,P,'spPr'),preset=pr&&direct(pr,A,'prstGeom'),custom=pr&&direct(pr,A,'custGeom');
 if(!xf?.matrix||!matrix)return null;
 const [w,h]=xf.extentEmu,name=preset?.getAttribute('prst');
 const adjusted=preset&&direct(preset,A,'avLst');if(adjusted&&children(adjusted).length){issues.push({code:'UNSUPPORTED_GEOMETRY_ADJUSTMENT',nextHumanAction:'Inspect preset adjustments'});return null;}
 if(name==='line')return {kind:'line',endpointsEmu:[[0,0],[w,h]].map(p=>point(matrix,p))};
 if(name==='rect')return {kind:'rect',cornersEmu:[[0,0],[w,0],[w,h],[0,h]].map(p=>point(matrix,p))};
 if(name==='ellipse'){
  if(w<=0||h<=0){issues.push({code:'DEGENERATE_ELLIPSE',nextHumanAction:'Inspect ellipse extent'});return null;}
  const u=vector(matrix,[w/2,0]),v=vector(matrix,[0,h/2]),lu=Math.hypot(...u),lv=Math.hypot(...v),circle=Math.abs(lu-lv)<=1e-9*Math.max(lu,lv)&&Math.abs(u[0]*v[0]+u[1]*v[1])<=1e-9*lu*lv;
  return {kind:circle?'circle':'ellipse',centerEmu:point(matrix,[w/2,h/2]),axisVectorsEmu:[u,v]};
 }
 if(custom){
  const list=direct(custom,A,'pathLst'),paths=list?children(list):[];
  if(paths.length!==1||local(paths[0])!=='path'){issues.push({code:'UNSUPPORTED_CUSTOM_PATH_COUNT',nextHumanAction:'Review compound custom geometry'});return null;}
  const path=paths[0],pw=integer(path.getAttribute('w'),'path.w',issues,{positive:true}),ph=integer(path.getAttribute('h'),'path.h',issues,{positive:true});if(pw===null||ph===null)return null;
  const pts=[];let closed=false;const commands=children(path);
  if(commands.some(n=>n.namespaceURI!==A||!['moveTo','lnTo','close'].includes(local(n)))||local(commands[0]||{})!=='moveTo'||commands.filter(n=>local(n)==='moveTo').length!==1||commands.filter(n=>local(n)==='close').length>1||commands.some((n,i)=>local(n)==='close'&&i!==commands.length-1)){
   issues.push({code:'UNSUPPORTED_CUSTOM_PATH_COMMAND',nextHumanAction:'Inspect custom curve/subpath commands'});return null;
  }
  for(const command of commands){if(local(command)==='close'){closed=true;continue;}const pt=direct(command,A,'pt'),px=integer(pt?.getAttribute('x'),'path.x',issues),py=integer(pt?.getAttribute('y'),'path.y',issues);if(px===null||py===null)return null;pts.push(point(matrix,[px/pw*w,py/ph*h]));}
  if(pts.length<(closed?3:2)){issues.push({code:'DEGENERATE_PATH',nextHumanAction:'Inspect path vertex count'});return null;}
  return {kind:closed?'polygon':'polyline',pointsEmu:pts,closed};
 }
 issues.push({code:'UNSUPPORTED_OR_INHERITED_GEOMETRY',nativePreset:name??null,nextHumanAction:'Review source shape geometry'});return null;
}
function textContent(node,serialize){
 const body=direct(node,P,'txBody');if(!body)return null;
 const paragraphs=children(body).filter(n=>n.namespaceURI===A&&local(n)==='p').map(p=>({properties:attrs(direct(p,A,'pPr')),items:children(p).filter(n=>n.namespaceURI===A&&['r','fld','br'].includes(local(n))).map(n=>({kind:local(n),attributes:attrs(n),rawXml:serialize(n),runProperties:attrs(direct(n,A,'rPr')),runStyle:{state:'PRESERVED_NOT_RESOLVED',rawXml:direct(n,A,'rPr')?serialize(direct(n,A,'rPr')):null},fontLatin:attrs(direct(direct(n,A,'rPr')||n,A,'latin')),fontEastAsian:attrs(direct(direct(n,A,'rPr')||n,A,'ea')),text:local(n)==='br'?'\n':(direct(n,A,'t')?.textContent??'')}))}));
 return {bodyProperties:attrs(direct(body,A,'bodyPr')),paragraphs,content:paragraphs.map(p=>p.items.map(i=>i.text).join('')).join('\n')};
}
function styleContent(node,issues){
 const pr=direct(node,P,'spPr');const data={rawAttributes:attrs(pr),stroke:null,fill:null,semanticColor:'UNKNOWN'};
 for(const [key,owner]of [['fill',pr],['stroke',pr&&direct(pr,A,'ln')]]){
  if(!owner){issues.push({code:'STYLE_INHERITANCE_UNRESOLVED',field:key,nextHumanAction:'Review theme/layout/master style'});continue;}
  if(direct(owner,A,'noFill')){data[key]={kind:'none',attributes:attrs(owner)};continue;}
  const solid=direct(owner,A,'solidFill'),rgb=solid&&direct(solid,A,'srgbClr');
  if(rgb&&/^[a-f\d]{6}$/i.test(rgb.getAttribute('val')||'')){data[key]={kind:'rgb',value:rgb.getAttribute('val'),transforms:children(rgb).map(n=>({kind:local(n),attributes:attrs(n)})),attributes:attrs(owner)};if(children(rgb).some(n=>local(n)!=='alpha'))issues.push({code:'COLOR_TRANSFORM_UNRESOLVED',field:key,nextHumanAction:'Resolve color transforms before target export'});}
  else {data[key]={kind:'unresolved',attributes:attrs(owner)};issues.push({code:'COLOR_OR_STYLE_UNRESOLVED',field:key,nextHumanAction:'Resolve theme/gradient/inherited style'});}
 }
 return data;
}
export async function readNativePptx(input,{JSZip=globalThis.JSZip,DOMParser=globalThis.DOMParser,XMLSerializer=globalThis.XMLSerializer,crypto=globalThis.crypto,origin='GENERIC_UNVERIFIED'}={}){
 if(!JSZip?.loadAsync||!DOMParser||!XMLSerializer||!crypto?.subtle)fail('DEPENDENCY_MISSING','ZIP, XML and digest capabilities required');
 if(!(input instanceof Uint8Array)&&!(input instanceof ArrayBuffer))fail('INVALID_INPUT','PPTX bytes required');
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);if(!bytes.length||bytes.length>LIMIT.bytes)fail('INPUT_SIZE_LIMIT','PPTX must be within 30 MiB');
 const rawZip=zipInventory(bytes),packageHash=await hash(crypto,bytes);let zip;
 try{zip=await JSZip.loadAsync(bytes,{checkCRC32:true});}catch{fail('INVALID_ZIP','ZIP parsing/CRC failed');}
 const partCache=new Map();let actual=0;
 async function part(path,required=true){
  if(partCache.has(path))return partCache.get(path);const entry=zip.file(path);
  if(!entry){if(required)fail('MISSING_PART','Required package part is missing',path);return null;}
  const b=await entry.async('uint8array');actual+=b.length;if(actual>LIMIT.expanded)fail('ZIP_EXPANSION_LIMIT','Expanded parts exceed bound');
  let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(b);}catch{fail('XML_ENCODING_UNSUPPORTED','Native XML must be UTF-8',path);}
  const record={path,sha256:await hash(crypto,b),document:xmlParse(text,DOMParser,path)};partCache.set(path,record);return record;
 }
 async function relationships(path,required=true){
  const record=await part(relPath(path),required);if(!record)return [];if(record.document.documentElement.namespaceURI!==REL||local(record.document.documentElement)!=='Relationships')fail('INVALID_RELATIONSHIPS','Relationship document root invalid',record.path);
  const rows=children(record.document.documentElement).map(n=>({id:n.getAttribute('Id'),type:n.getAttribute('Type'),target:n.getAttribute('Target'),external:n.getAttribute('TargetMode')==='External'})),ids=new Set();
  for(const r of rows){if(!r.id||ids.has(r.id))fail('DUPLICATE_RELATIONSHIP_ID','Missing/duplicate relationship identity',record.path);ids.add(r.id);if(!r.external){r.resolvedPart=partTarget(path,r.target);if(!zip.file(r.resolvedPart))fail('MISSING_RELATIONSHIP_TARGET','Relationship target absent',r.resolvedPart);}}
  return rows;
 }
 const rootR=await part('_rels/.rels'),rootRows=children(rootR.document.documentElement),office=rootRows.filter(n=>(n.getAttribute('Type')||'').endsWith('/officeDocument'));
 if(office.length!==1||office[0].getAttribute('TargetMode')==='External')fail('PRESENTATION_RELATIONSHIP_REQUIRED','Single internal presentation relationship required');
 const presentationPath=partTarget('',office[0].getAttribute('Target')),pres=await part(presentationPath);
 if(pres.document.documentElement.namespaceURI!==P||local(pres.document.documentElement)!=='presentation')fail('PRESENTATION_NAMESPACE_UNSUPPORTED','Only Transitional OOXML presentation supported',presentationPath);
 const size=direct(pres.document.documentElement,P,'sldSz'),sizeIssues=[],widthEmu=integer(size?.getAttribute('cx'),'sldSz.cx',sizeIssues,{positive:true}),heightEmu=integer(size?.getAttribute('cy'),'sldSz.cy',sizeIssues,{positive:true});
 if(sizeIssues.length)fail('SLIDE_SIZE_REQUIRED','Valid native slide physical size required',presentationPath);
 const presR=await relationships(presentationPath),slideList=direct(pres.document.documentElement,P,'sldIdLst'),ids=slideList?children(slideList):[];
 if(!ids.length||ids.length>LIMIT.slides)fail('SLIDE_COUNT_LIMIT','Presentation must contain 1..50 slides');
 const result={schema:INVENTORY_SCHEMA,contract:{version:INVENTORY_SCHEMA,sha256:INVENTORY_CONTRACT_SHA256},contractStatus:'PROVISIONAL',source:{sha256:packageHash,origin,semanticMetadataVerified:false,presentationPath,presentationHash:pres.sha256,zip:rawZip},slides:[],objects:[],sourceLedger:[],componentLedger:[],issues:[],exportReadiness:'HOLD',physicalUnit:'EMU',unitRole:'SOURCE',realWorldScaleStatus:'UNSCALED'};
 const serializer=new XMLSerializer(),nativeIds=new Map(),slideParts=new Set();
 function inventory(node,slide,parent,parentChain,path,depth,ancestorHidden=false){
  if(depth>LIMIT.depth||result.objects.length>=LIMIT.objects)fail('OBJECT_OR_DEPTH_LIMIT','Native object/depth limit exceeded',slide.partPath);
  const name=local(node),isGroup=node.namespaceURI===P&&name==='grpSp',isShape=node.namespaceURI===P&&['sp','cxnSp'].includes(name),metadata=node.namespaceURI===P&&['nvGrpSpPr','grpSpPr'].includes(name),background=node.namespaceURI===P&&name==='bg';
  const issues=[],nativePr=children(node).find(n=>n.namespaceURI===P&&local(n).startsWith('nv')),idNode=nativePr&&direct(nativePr,P,'cNvPr'),nativeId=idNode?.getAttribute('id')??null;
  const key=slide.partPath+'#'+path,hidden=truth(idNode?.getAttribute('hidden'))||slide.hidden||ancestorHidden;
  const binding={packageHash,partHash:slide.partHash,partPath:slide.partPath,slideIndex:slide.index,xmlPath:path,nativeId};
  if(nativeId){const idKey=slide.partPath+'#id:'+nativeId;if(nativeIds.has(idKey))issues.push({code:'DUPLICATE_NATIVE_ID',previous:nativeIds.get(idKey),nextHumanAction:'Inspect duplicate IDs; XML path remains authoritative'});else nativeIds.set(idKey,key);}
  else if(isShape||isGroup)issues.push({code:'MISSING_NATIVE_ID',nextHumanAction:'Inspect source identity; retain XML path'});
  const xf=isShape||isGroup?xfrm(node,isGroup,issues):null,matrix=xf?.matrix&&parent?multiply(parent,xf.matrix):isShape||isGroup?null:parent;
  const chain=xf?[...parentChain,{sourceKey:key,native:xf.raw,pivotEmu:xf.pivotEmu??null,matrix:xf.matrix,order:'parent * local',convention:'column-vector row-major'}]:[...parentChain];
  const nonuniformParent=parentChain.some(t=>t.native.chExt.cx&&t.native.chExt.cy&&Math.abs(Number(t.native.ext.cx)/Number(t.native.chExt.cx)-Number(t.native.ext.cy)/Number(t.native.chExt.cy))>1e-12);
  if(nonuniformParent&&chain.some(t=>Number(t.native.attributes.rot||0)%10800000!==0))issues.push({code:'NONUNIFORM_ROTATED_GROUP_APP_SEMANTICS_UNVERIFIED',nextHumanAction:'Verify Office rendering; full affine candidate and native transforms retained'});
  if((isShape||isGroup)&&!parent)issues.push({code:'PARENT_TRANSFORM_UNRESOLVED',nextHumanAction:'Resolve ancestor group before geometry export'});
  const rawText=textContent(node,n=>serializer.serializeToString(n)),rawStyle=isShape?styleContent(node,issues):null,geom=isShape?geometry(node,xf,matrix,issues):null;
  if(rawText)issues.push({code:'TEXT_LAYOUT_UNRESOLVED',nextHumanAction:'Native runs retained; resolve font/baseline/anchor before target export'});
  if(hidden)issues.push({code:'HIDDEN_SOURCE_POLICY',nextHumanAction:'Select explicit hidden-object policy before target export'});
  if(rawText?.paragraphs.some(p=>p.items.some(i=>i.kind==='fld')))issues.push({code:'DYNAMIC_FIELD_UNRESOLVED',nextHumanAction:'Review dynamic text field'});
  const object={sourceKey:key,sourceBinding:binding,role:isGroup?'CONTAINER':metadata?'NON_DRAWABLE':background?'BACKGROUND':hidden?'HIDDEN':'DRAWABLE',kind:name,hidden,layer:{value:'slide-'+slide.index,provenance:'SYNTHETIC_SLIDE_LAYER'},native:{xml:serializer.serializeToString(node),xfrm:xf?.raw??null,geometry:isShape?serializer.serializeToString(direct(node,P,'spPr')||node):null,text:rawText,style:rawStyle},transform:{matrix,chain,unit:'EMU',convention:'column-vector row-major',status:issues.some(i=>i.code==='NONUNIFORM_ROTATED_GROUP_APP_SEMANTICS_UNVERIFIED')?'HUMAN_CHECK_REQUIRED':'NATIVE_AFFINE_CANDIDATE'},components:[],issues};
  function component(kind,data,unsupported=false){
   const id=key+'/'+kind,reason=unsupported?'UNSUPPORTED_NATIVE_OBJECT':issues.length?'UNRESOLVED_NATIVE_PROPERTIES':null;
   const disposition=unsupported?'UNSUPPORTED':issues.length?'HUMAN_CHECK_REQUIRED':'EXTRACTED';
   const item={id,kind,disposition,...data,issues:[...issues]};object.components.push(item);result.componentLedger.push({componentId:id,sourceKey:key,sourceBinding:binding,disposition,reasons:[...new Set([...(reason?[reason]:[]),...issues.map(i=>i.code)])],nextHumanAction:disposition==='EXTRACTED'?null:'Review native source and unresolved properties'});
  }
  if(isShape){component('geometry',{geometry:geom},!geom);if(rawText)component('text',{text:rawText,positionMatrix:matrix});}
  else if(!isGroup&&!metadata){issues.push({code:background?'BACKGROUND_POLICY_UNRESOLVED':'UNSUPPORTED_NATIVE_OBJECT',nativeTag:node.nodeName,nextHumanAction:'Review source; preserve native XML; no silent deletion'});component(background?'background':'unknown',{nativeTag:node.nodeName},true);}
  const disposition=issues.length?'HUMAN_CHECK_REQUIRED':isGroup?'CONTAINER_RECORDED':metadata?'METADATA_RECORDED':'EXTRACTED';
  result.objects.push(object);result.sourceLedger.push({sourceKey:key,componentIds:object.components.map(c=>c.id),disposition,reasons:issues.map(i=>i.code),nextHumanAction:issues.length?'Inspect native object before adoption':null});
  result.issues.push(...issues.map(issue=>({...issue,sourceKey:key,sourceBinding:binding})));
  if(isGroup){const counts={};for(const child of children(node)){const tag=child.nodeName,index=(counts[tag]=(counts[tag]||0)+1);inventory(child,slide,matrix,chain,path+'/'+tag+'['+index+']',depth+1,hidden);}}
 }
 for(let i=0;i<ids.length;i++){
  const id=ids[i].getAttributeNS(R,'id'),relationship=presR.find(r=>r.id===id);
  if(!relationship||relationship.external||!relationship.type.endsWith('/slide'))fail('SLIDE_RELATIONSHIP_REQUIRED','Missing/wrong slide relationship',id);
  if(slideParts.has(relationship.resolvedPart))fail('DUPLICATE_SLIDE_REFERENCE','Slide part referenced more than once',relationship.resolvedPart);slideParts.add(relationship.resolvedPart);
  const record=await part(relationship.resolvedPart),root=record.document.documentElement;
  if(root.namespaceURI!==P||local(root)!=='sld')fail('SLIDE_NAMESPACE_UNSUPPORTED','Unsupported slide document root',record.path);
  const csld=direct(root,P,'cSld'),tree=csld&&direct(csld,P,'spTree');if(!tree)fail('SPTREE_REQUIRED','Slide shape tree missing',record.path);
  const slide={index:i,partPath:record.path,partHash:record.sha256,widthEmu,heightEmu,layoutMm:{width:widthEmu/36000,height:heightEmu/36000,unitRole:'LAYOUT'},hidden:['0','false'].includes(root.getAttribute('show')),relationships:await relationships(record.path,false)};result.slides.push(slide);
  const counts={};for(const child of children(tree)){const tag=child.nodeName,index=(counts[tag]=(counts[tag]||0)+1);inventory(child,slide,I,[], '/p:sld/p:cSld/p:spTree/'+tag+'['+index+']',0);}
  const bg=direct(csld,P,'bg');if(bg)inventory(bg,slide,I,[],'/p:sld/p:cSld/p:bg[1]',0);
  for(const r of slide.relationships){if(r.external)result.issues.push({code:'EXTERNAL_RELATIONSHIP_NOT_FETCHED',sourceKey:record.path,relationship:r,nextHumanAction:'Inspect external reference'});else if(!r.type.endsWith('/image'))result.issues.push({code:'RELATED_PART_POLICY_UNRESOLVED',sourceKey:record.path,relationship:r,nextHumanAction:'Inspect layout/master/notes; no inherited style claim'});}
 }
 const objectKeys=result.objects.map(o=>o.sourceKey),componentKeys=result.componentLedger.map(c=>c.componentId);
 if(new Set(objectKeys).size!==objectKeys.length||new Set(componentKeys).size!==componentKeys.length)fail('IDENTITY_COLLISION','Source/component identities must be unique');
 result.counts={objects:result.objects.length,containers:result.objects.filter(o=>o.role==='CONTAINER').length,nonDrawable:result.objects.filter(o=>o.role==='NON_DRAWABLE').length,backgrounds:result.objects.filter(o=>o.role==='BACKGROUND').length,hidden:result.objects.filter(o=>o.hidden).length,drawableObjects:result.objects.filter(o=>['DRAWABLE','HIDDEN'].includes(o.role)).length,components:result.componentLedger.length,sourceLedger:result.sourceLedger.length,componentLedger:result.componentLedger.length};
 result.accountingComplete=result.counts.objects===result.counts.sourceLedger&&result.objects.flatMap(o=>o.components).length===result.counts.componentLedger;
 result.supportedRetention='NOT_EVALUATED';
 result.unsupportedLedger=result.componentLedger.filter(c=>c.disposition==='UNSUPPORTED');
 result.counts.unsupportedComponents=result.unsupportedLedger.length;
 result.counts.humanCheckComponents=result.componentLedger.filter(c=>c.disposition==='HUMAN_CHECK_REQUIRED').length;
 return result;
}
