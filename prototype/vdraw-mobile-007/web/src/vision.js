import {uid,clone,pageOf,element,newPage,project,validate,classes} from './core.js';
// Candidate coordinates use a named drawing frame. Photos use the renderer's
// xMidYMid meet transform; a frame change must preserve that same image mapping.
const frameError=()=>Error('候補の座標系・元資料・ページを特定できません。元資料から候補を作成し直してください');
const dimension=n=>Number.isFinite(n)&&n>0&&n<=10000;
const canvasFrame=canvas=>{if(!canvas||!dimension(canvas.width)||!dimension(canvas.height)||canvas.yAxis!=='down')throw frameError();return {width:canvas.width,height:canvas.height,yAxis:'down'};};
function namedFrame(c){
 const match=typeof c.coordinateSpace==='string'&&/^drawing-(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(c.coordinateSpace);
 if(!match)throw frameError();return canvasFrame({width:Number(match[1]),height:Number(match[2]),yAxis:'down'});
}
// Dimensions come from the actual sanitized PNG header, including pre-metadata
// saved projects. Never infer image dimensions from an unrelated active canvas.
function pngDimensions(data){
 if(typeof data!=='string'||!data.startsWith('data:image/png;base64,'))throw frameError();
 let bytes;try{bytes=atob(data.slice(22,66));}catch{throw frameError();}
 const signature=[137,80,78,71,13,10,26,10];
 if(bytes.length<24||signature.some((n,i)=>bytes.charCodeAt(i)!==n)||bytes.slice(12,16)!=='IHDR')throw frameError();
 const word=i=>[0,1,2,3].reduce((n,k)=>n*256+bytes.charCodeAt(i+k),0);
 return canvasFrame({width:word(16),height:word(20),yAxis:'down'});
}
// Change detector only, not a cryptographic attestation of AI/source provenance.
function sourceFingerprint(source){
 const text=JSON.stringify([source?.id??null,source?.kind??null,source?.pageNumber??null,source?.importedAt??null,source?.workImage??null]);
 let a=2166136261,b=3335557771;for(let i=0;i<text.length;i++){const n=text.charCodeAt(i);a=Math.imul(a^n,16777619);b=Math.imul(b^n,2246822519);}
 return text.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);
}
function currentSource(d){const page=pageOf(d),source=d.sources.find(s=>s.id===page.sourceId);if(page.sourceId&&!source)throw frameError();return {page,source};}
function binding(d){
 const {page,source}=currentSource(d);let image;
 if(source?.workImage)image=pngDimensions(source.workImage);
 else if(!source||source.kind==='sample')image=canvasFrame(page.canvas);
 else throw frameError();
 return {documentId:d.id,pageId:page.id,sourceId:page.sourceId,sourcePageNumber:source?.pageNumber??null,sourceFingerprint:sourceFingerprint(source),sourceWidth:image.width,sourceHeight:image.height};
}
function candidateContract(d,c){
 const frame=namedFrame(c),actual=binding(d),saved=c.sourceBinding;
 if(c.sourceId!==actual.sourceId||!saved||saved.documentId!==actual.documentId||saved.pageId!==actual.pageId||saved.sourceId!==actual.sourceId||saved.sourcePageNumber!==actual.sourcePageNumber||saved.sourceFingerprint!==actual.sourceFingerprint||c.sourceWidth!==actual.sourceWidth||c.sourceHeight!==actual.sourceHeight||saved.sourceWidth!==c.sourceWidth||saved.sourceHeight!==c.sourceHeight)throw frameError();
 const referenceImageTransform=contain(c.sourceWidth,c.sourceHeight,frame);
 if(!c.referenceImageTransform||['fit','scale','offsetX','offsetY'].some(k=>c.referenceImageTransform[k]!==referenceImageTransform[k]))throw frameError();
 if(!Array.isArray(c.elements)||c.elements.length>100)throw frameError();
 const check=project('候補検証');check.pages[0].canvas=frame;check.pages[0].elements=c.elements;validate(check);
 for(const e of c.elements){if(![e.x,e.y,e.w,e.h,e.fontSize,e.strokeWidth].every(n=>Number.isFinite(n)&&Math.abs(n)<=100000)||e.x<0||e.y<0||e.x+e.w>frame.width||e.y+e.h>frame.height||e.points.length>2000||e.points.some(q=>q[0]<0||q[1]<0||q[0]>frame.width||q[1]>frame.height))throw frameError();}
 return {frame,actual,referenceImageTransform};
}
function contain(width,height,canvas){const scale=Math.min(canvas.width/width,canvas.height/height);return {fit:'contain',scale,offsetX:(canvas.width-width*scale)/2,offsetY:(canvas.height-height*scale)/2};}
function attachCoordinates(d,c,frame){
 const actual=binding(d);
 if((c.sourceWidth!==undefined&&c.sourceWidth!==actual.sourceWidth)||(c.sourceHeight!==undefined&&c.sourceHeight!==actual.sourceHeight))throw frameError();
 if((c.sourcePageId!==undefined&&c.sourcePageId!==actual.pageId)||(c.sourcePageNumber!==undefined&&c.sourcePageNumber!==actual.sourcePageNumber))throw frameError();
 return {coordinateSpace:c.coordinateSpace,sourceWidth:actual.sourceWidth,sourceHeight:actual.sourceHeight,sourceBinding:actual,referenceImageTransform:contain(actual.sourceWidth,actual.sourceHeight,frame)};
}
function convertedElements(elements,from,to){
 const scale=to.scale/from.scale,offsetX=to.offsetX-from.offsetX*scale,offsetY=to.offsetY-from.offsetY*scale;
 if(![scale,offsetX,offsetY].every(Number.isFinite)||scale<=0)throw frameError();
 return {elements:elements.map(e=>({...clone(e),x:e.x*scale+offsetX,y:e.y*scale+offsetY,w:e.w*scale,h:e.h*scale,points:e.points.map(([x,y])=>[x*scale+offsetX,y*scale+offsetY]),fontSize:e.fontSize*scale,strokeWidth:e.strokeWidth*scale})),transform:{scale,offsetX,offsetY}};
}
// A real provider requires a private authenticated job service. No automatic retry.
export class VisionJobs {
 constructor(){this.state='UNCONNECTED';this.provider=null;}
 async draft(){this.state='BLOCKED';throw Error('AI下書きは未接続です。写真の外部送信・費用は発生しません。手動作図で続けられます');}
 receive(d,result){
  if(result?.schema!=='vdraw-vision-result/1'||result.record?.status!=='CANDIDATE_READY'||!['real-providers','protocol-fixture'].includes(result.executionKind))throw Error('Vision結果の形式が対応外です');
  const c=result.candidate;
  if(!c||!d.sources.some(s=>s.id===c.sourceId)||c.sourceId!==pageOf(d).sourceId||!Array.isArray(c.elements)||c.elements.length>100||c.calibration!=='UNSCALED')throw Error('元資料・候補の対応を確認してください');
  const frame=namedFrame(c),coordinates=attachCoordinates(d,c,frame);
  const elements=c.elements.map(raw=>{const e={};for(const k of ['kind','name','category','x','y','w','h','points','fill','stroke','strokeWidth','text','fontSize','startAngle','endAngle'])if(raw[k]!==undefined)e[k]=clone(raw[k]);
   if(typeof e.name!=='string'||e.name.length>160||!classes.includes(e.category)||!Array.isArray(e.points)||e.points.length>2000)throw Error('候補の対象属性が不正です');return element(e.kind,e.name,{...e,...(typeof raw.sourceObjectId==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(raw.sourceObjectId)?{sourceObjectId:raw.sourceObjectId}:{}),origin:result.executionKind==='protocol-fixture'?'protocol-fixture':'ai-candidate'});});
  const check=project('候補検証');check.pages[0].elements=elements;validate(check);
  const received={id:uid(),kind:result.executionKind==='protocol-fixture'?'protocol-fixture':'provider-candidate',status:'pending',createdAt:new Date().toISOString(),sourceId:c.sourceId,...coordinates,elements,missingObjects:Array.isArray(c.missingObjects)?c.missingObjects.filter(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x)):[],calibration:'UNSCALED',note:'外部結果の候補。採用前に対象・形状・色を確認してください。'};
  candidateContract(d,received);this.state='CANDIDATE_READY';return received;
 }
 sampleCandidate(d){
  const page=pageOf(d),frame=canvasFrame(page.canvas),input={sourceId:page.sourceId,coordinateSpace:`drawing-${frame.width}x${frame.height}`};
  const c={id:uid(),kind:'operation-sample',status:'pending',createdAt:new Date().toISOString(),...input,...attachCoordinates(d,input,frame),elements:[element('rect','下書きサンプル',{x:frame.width*.2,y:frame.height*.2,w:frame.width*.24,h:frame.height*.23,fill:'#C8D7BF',category:'未知対象',origin:'operation-sample'})],note:'操作確認用サンプル。実写真の認識結果ではありません。'};
  candidateContract(d,c);this.state='SAMPLE_READY';return c;
 }
 preview(d,c){
  const {frame}=candidateContract(d,c),{source}=currentSource(d);
  return {page:{...pageOf(d),canvas:frame,elements:clone(c.elements)},source};
 }
 adopt(d,c){
  if(c.kind==='provider-candidate'&&c.review?.status!=='reviewed')throw Error('候補を確認してから採用してください');
  if(c.status==='discarded')throw Error('破棄した候補は採用できません');
  const {referenceImageTransform}=candidateContract(d,c),p=newPage('採用候補 '+(d.pages.length+1));p.sourceId=c.sourceId;
  const target=contain(c.sourceWidth,c.sourceHeight,p.canvas),converted=convertedElements(c.elements,referenceImageTransform,target);p.elements=converted.elements;
  // Validate the full prospective document before changing any caller-owned state.
  validate({...d,pages:[...d.pages,p],activePageId:p.id});
  const record={candidateId:c.id,pageId:p.id,at:new Date().toISOString(),coordinateSpace:c.coordinateSpace,targetCanvas:clone(p.canvas),transform:converted.transform,sourceBinding:clone(c.sourceBinding)};
  d.pages.push(p);d.activePageId=p.id;d.adoptions.push(record);const saved=d.candidates.find(x=>x.id===c.id);if(saved)saved.status='adopted';return p;
 }
}
