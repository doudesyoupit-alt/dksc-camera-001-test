// Real-photo containers, synthetic registration geometry, actual bundled PPTX.
// Coordinate assay ONLY: no recognition, annotation, semantic holdout inspection,
// external API/transfer, human fidelity acceptance, Office opening or release PASS.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {project,element,clone,pageOf} from '../web/src/core.js';
import {VisionJobs} from '../web/src/vision.js';
import {exportFile} from '../web/src/exporters.js';
const args=process.argv.slice(2),value=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:undefined;};
const root=path.resolve(value('--dataset-root')||'evidence/photo-pilot');
const output=path.resolve(value('--output')||path.join(root,'export-assay.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireCondition=(condition,code)=>{if(!condition)throw Object.assign(Error(code),{code});};
const close=(actual,expected)=>requireCondition(Number.isFinite(actual)&&Math.abs(actual-expected)<=1,'OOXML_PLACEMENT_MISMATCH');
async function safeInput(name){
 requireCondition(typeof name==='string'&&name&&!path.isAbsolute(name),'INPUT_PATH_INVALID');
 const actual=await fs.realpath(path.join(root,name)),base=await fs.realpath(root),relative=path.relative(base,actual);
 requireCondition(relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative),'INPUT_PATH_ESCAPE');
 return actual;
}
function pngSize(bytes){
 requireCondition(bytes.length>=33&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a'&&bytes.readUInt32BE(8)===13&&bytes.toString('ascii',12,16)==='IHDR','CANONICAL_PNG_INVALID');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 requireCondition(width>0&&height>0&&width<=10000&&height<=10000,'CANONICAL_DIMENSIONS_INVALID');
 return {width,height};
}
const context={console,Buffer,Blob,Uint8Array,ArrayBuffer,setTimeout,clearTimeout,TextEncoder,TextDecoder,atob,btoa};
context.window=context;context.global=context;context.self=context;vm.createContext(context);
vm.runInContext(await fs.readFile(new URL('../web/vendor/pptxgen.bundle.js',import.meta.url),'utf8'),context);
class Pptx extends context.PptxGenJS{async write(options){return Buffer.from(await super.write({...options,outputType:'uint8array'}));}}
const zipAdapter={loadAsync:async raw=>{const z=await context.JSZip.loadAsync(raw),generate=z.generateAsync.bind(z);z.generateAsync=options=>generate({...options,type:'uint8array'});return z;}};
globalThis.window={PptxGenJS:Pptx,JSZip:zipAdapter};
function xmlFrame(xml){
 const xf=xml.match(/<a:xfrm[^>]*>([\s\S]*?)<\/a:xfrm>/)?.[1];
 const off=xf?.match(/<a:off x="(-?\d+)" y="(-?\d+)"/),ext=xf?.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
 requireCondition(off&&ext,'OOXML_FRAME_MISSING');return {x:+off[1],y:+off[2],w:+ext[1],h:+ext[2]};
}
async function assay(photo,outputFolder){
 const row={photoId:photo?.id??null,split:photo?.split??null,difficulty:photo?.difficulty??null,status:'FAIL',
  inputKind:'real-photo',realAI:false,geometryKind:'SYNTHETIC_REGISTRATION_RECT_NOT_AI_RECOGNITION',
  semanticGroundTruthAccessed:false,humanReviewPerformed:false,officeAppVisualAcceptance:'NOT_RUN'};
 try{
  requireCondition(photo&&typeof photo==='object'&&/^[A-Za-z0-9_-]{1,80}$/.test(photo.id),'PHOTO_ID_INVALID');
  requireCondition(photo.inputKind==='real-photo'&&photo.consent?.photoUseApproved===true,'REAL_PHOTO_USE_UNAPPROVED');
  requireCondition(['development','validation','blind-holdout'].includes(photo.split),'SPLIT_INVALID');
  const original=await fs.readFile(await safeInput(photo.originalPath)),bytes=await fs.readFile(await safeInput(photo.canonicalPath));
  requireCondition(sha(original)===photo.originalSHA256&&sha(bytes)===photo.canonicalSHA256,'PHOTO_HASH_MISMATCH');
  const size=pngSize(bytes),canvas={width:1200,height:800,yAxis:'down'};
  const scale=Math.min(canvas.width/size.width,canvas.height/size.height),offsetX=(canvas.width-size.width*scale)/2,offsetY=(canvas.height-size.height*scale)/2;
  const expectedPhoto={x:offsetX,y:offsetY,w:size.width*scale,h:size.height*scale};
  // Registration rectangle is deliberately calculated, never inferred from pixels.
  const marker=element('rect','Synthetic registration marker — NOT AI geometry',{x:offsetX+size.width*scale*.25,y:offsetY+size.height*scale*.3,w:size.width*scale*.2,h:size.height*scale*.2,fill:'none',stroke:'#ff3030',strokeWidth:1,category:'汎用図形'});
  const d=project('Photo export coordinate assay '+photo.id),vision=new VisionJobs();
  d.sources=[{id:photo.id,kind:'photo',workImage:'data:image/png;base64,'+bytes.toString('base64'),locked:true}];d.pages[0].sourceId=photo.id;
  const candidate=vision.receive(d,{schema:'vdraw-vision-result/1',executionKind:'protocol-fixture',record:{status:'CANDIDATE_READY'},candidate:{sourceId:photo.id,coordinateSpace:'drawing-1200x800',calibration:'UNSCALED',elements:[marker]}});
  d.candidates.push(candidate);const contract=JSON.stringify({coordinateSpace:candidate.coordinateSpace,sourceBinding:candidate.sourceBinding,referenceImageTransform:candidate.referenceImageTransform});
  vision.preview(d,candidate);vision.adopt(d,candidate);
  // Serialization assay is not a browser IndexedDB or application round-trip claim.
  const saved=JSON.parse(JSON.stringify(d)),stored=saved.candidates[0],before=JSON.stringify(clone(saved));
  requireCondition(contract===JSON.stringify({coordinateSpace:stored.coordinateSpace,sourceBinding:stored.sourceBinding,referenceImageTransform:stored.referenceImageTransform}),'COORDINATE_CONTRACT_CHANGED');
  requireCondition(JSON.stringify(stored.referenceImageTransform)===JSON.stringify({fit:'contain',scale,offsetX,offsetY}),'REFERENCE_TRANSFORM_MISMATCH');
  const raw=await exportFile(saved,'pptx',{includePhoto:true}),zip=await context.JSZip.loadAsync(Buffer.from(raw));
  const pictureFrames=[],markerFrames=[],emu=914400,k=.01;
  for(let i=0;i<saved.pages.length;i++){
   const xml=await zip.file(`ppt/slides/slide${i+1}.xml`).async('string');
   const pictures=[...xml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)];requireCondition(pictures.length===1,'PICTURE_COUNT_INVALID');
   const actual=xmlFrame(pictures[0][1]);for(const key of ['x','y','w','h'])close(actual[key],expectedPhoto[key]*k*emu);
   requireCondition(Math.abs(actual.w/actual.h-size.width/size.height)<1e-5,'PHOTO_ASPECT_RATIO_CHANGED');
   pictureFrames.push({slide:i+1,...actual});
   const shapes=[...xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)];
   requireCondition(shapes.length===(i===1?1:0),'REGISTRATION_SHAPE_COUNT_INVALID');
   for(const shape of shapes){requireCondition(shape[1].includes('prst="rect"'),'REGISTRATION_NOT_NATIVE_RECT');const actualMarker=xmlFrame(shape[1]);for(const key of ['x','y','w','h'])close(actualMarker[key],pageOf(saved).elements[0][key]*k*emu);markerFrames.push({slide:i+1,...actualMarker});}
  }
  requireCondition(before===JSON.stringify(saved),'EXPORT_MUTATED_PROJECT');
  const filename=photo.id+'.pptx',target=path.join(outputFolder,filename);await fs.writeFile(target,Buffer.from(raw),{flag:'wx'});
  row.status='PASS';row.canonicalSHA256=photo.canonicalSHA256;row.originalSHA256=photo.originalSHA256;row.sourceImageSize=size;
  row.expectedContainDrawingFrame=expectedPhoto;row.pictureOOXMLFramesEMU=pictureFrames;row.registrationOOXMLFramesEMU=markerFrames;
  row.coordinateSpace=stored.coordinateSpace;row.sourceBinding=stored.sourceBinding;row.referenceImageTransform=stored.referenceImageTransform;
  row.coordinateContractPreserved=true;row.sourceAspectRatioPreserved=true;row.nativeEditableRegistrationRect=true;
  row.pptx={filename,sha256:sha(Buffer.from(raw)),bytes:raw.byteLength};row.serializedProjectContractPreserved=true;
 }catch(error){row.errorCode=error.code&&/^[A-Z0-9_]+$/.test(error.code)?error.code:'ASSAY_FAILED';}
 return row;
}
let report;
try{
 await fs.access(output).then(()=>{throw Object.assign(Error(),{code:'OUTPUT_ALREADY_EXISTS'});},error=>{if(error.code!=='ENOENT')throw error;});
 const manifestBytes=await fs.readFile(path.join(root,'golden-manifest.json')),manifest=JSON.parse(manifestBytes.toString('utf8'));
 requireCondition(manifest.schema==='vdraw-photo-golden/1'&&Array.isArray(manifest.photos),'MANIFEST_INVALID');
 requireCondition(manifest.photos.length===10,'TEN_REAL_PHOTOS_REQUIRED');
 const ids=new Set();for(const photo of manifest.photos){requireCondition(!ids.has(photo.id),'DUPLICATE_PHOTO_ID');ids.add(photo.id);}
 const folder=path.join(path.dirname(output),'pptx-assay');await fs.mkdir(folder,{recursive:true});
 const cases=[];for(const photo of manifest.photos)cases.push(await assay(photo,folder));
 report={schema:'vdraw-photo-pptx-coordinate-assay/1',status:cases.every(c=>c.status==='PASS')?'PASS_COORDINATE_ASSAY_ONLY':'FAIL',
  manifestSHA256:sha(manifestBytes),realPhotoContainerCount:cases.length,realAIPhotoCount:0,recognitionEvaluationPhotoCount:0,
  nativeOOXMLInspected:true,syntheticRegistrationGeometry:true,semanticGroundTruthAccessed:false,
  splitCounts:Object.fromEntries(['development','validation','blind-holdout'].map(split=>[split,cases.filter(c=>c.split===split).length])),
  pass:cases.filter(c=>c.status==='PASS').length,fail:cases.filter(c=>c.status!=='PASS').length,skip:0,
  measuredScope:'Source-photo aspect ratio and contain placement plus synthetic native registration rectangle coordinates only',
  pptxFidelity:null,objectRecall:null,objectPrecision:null,realPhotoToUsableDrawingSuccessRate:null,
  officeAppVisualAcceptance:'NOT_RUN',roundTripSuccessRate:null,photoReleaseAllowed:false,
  storageEvidence:'JSON serialization contract only; not browser IndexedDB acceptance',
  filesFolder:path.relative(path.dirname(output),folder),cases};
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:report.status,pass:report.pass,fail:report.fail,skip:0,realAIPhotoCount:0,recognitionEvaluationPhotoCount:0,output},null,2));
 if(report.fail)process.exitCode=1;
}catch(error){console.error(JSON.stringify({status:'FAIL',errorCode:error.code&&/^[A-Z0-9_]+$/.test(error.code)?error.code:'ASSAY_PREFLIGHT_FAILED',skip:0}));process.exitCode=1;}
