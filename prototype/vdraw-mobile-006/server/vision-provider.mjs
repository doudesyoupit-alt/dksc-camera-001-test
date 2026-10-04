// PRIVATE Node-only adapter. No listening HTTP server, browser secret, model download or retry.
import {readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {classes,element,project,validate,uid} from '../web/src/core.js';
import {sceneSchema} from './scene-schema.mjs';
import {prompts,rankMasks,bboxOK} from './sam-contract.mjs';
const SCHEMA='vdraw-vision-provider/1';
const fail=(code,message)=>Object.assign(new Error(message),{code});
export function configuration(env=process.env){
 const missing=['ANTHROPIC_API_KEY','CLAUDE_MODEL','SAM_PROVIDER_URL','SAM_PROVIDER_TOKEN'].filter(k=>!env[k]);
 const config={key:env.ANTHROPIC_API_KEY,model:env.CLAUDE_MODEL,samURL:env.SAM_PROVIDER_URL,samToken:env.SAM_PROVIDER_TOKEN,timeoutMs:30000};
 if(config.samURL){let u;try{u=new URL(config.samURL);}catch{throw fail('INVALID_CONFIG','SAM URL is invalid');}if(u.username||u.password||u.search||u.hash||!(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))throw fail('INVALID_CONFIG','SAM requires HTTPS or loopback; URL credentials/query forbidden');}
 return {config,missing,ready:missing.length===0};
}
export function status(env=process.env){const {missing,ready}=configuration(env);return {schema:SCHEMA,status:ready?'CONFIGURED_NOT_CONNECTED':'UNCONNECTED',missing,realInferenceCount:0,networkRequests:0,automaticRetry:false,credentialsInBrowser:false};}
function sceneResult(value){
 if(!value||value.schema!==SCHEMA||!Array.isArray(value.objects)||value.objects.length>100)throw fail('SCENE_INVALID','Scene contract invalid');
 const ids=new Set();for(const o of value.objects){if(typeof o.id!=='string'||!o.id||o.id.length>80||ids.has(o.id)||typeof o.name!=='string'||o.name.length>160||!classes.includes(o.category)||!/^#[0-9a-f]{6}$/i.test(o.color)||o.bbox!=null&&!bboxOK(o.bbox))throw fail('SCENE_INVALID','Scene object invalid');ids.add(o.id);}
 return value;
}
export function candidateFromGeometry(scene,geometry,sourceId){
 sceneResult(scene);
 if(!geometry||geometry.schema!==SCHEMA||!Array.isArray(geometry.objects)||geometry.objects.length>100||geometry.coordinateSpace!=='drawing-1200x800')throw fail('GEOMETRY_INVALID','SAM geometry contract invalid');
 const known=new Map(scene.objects.map(o=>[o.id,o])), seen=new Set(),elements=[];
 for(const g of geometry.objects){const o=known.get(g.objectId);if(!o||seen.has(g.objectId))throw fail('GEOMETRY_INVALID','Unknown or duplicate object');seen.add(g.objectId);
  if(!['polygon','line','ellipse','rect','arc','text'].includes(g.kind))throw fail('GEOMETRY_INVALID','Unsupported geometry');
  // Allowlist only geometry. Never import model calibration, URLs, UI attributes or IDs.
  const data={};for(const k of ['x','y','w','h','points','startAngle','endAngle','text','fontSize'])if(g[k]!==undefined)data[k]=structuredClone(g[k]);
  if(!['x','y','w','h'].every(k=>Number.isFinite(data[k]))||data.x<0||data.y<0||data.x+data.w>1200||data.y+data.h>800)throw fail('GEOMETRY_INVALID','Geometry outside drawing bounds');
  if(g.kind==='polygon'&&(!Array.isArray(data.points)||data.points.length>2000||data.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>1200||p[1]<0||p[1]>800)))throw fail('GEOMETRY_INVALID','Invalid polygon');
  elements.push(element(g.kind,o.name,{...data,category:o.category,fill:['line','arc'].includes(g.kind)?'none':o.color,stroke:o.color,origin:'ai-candidate',sourceObjectId:o.id}));
 }
 const d=project('検証');d.pages[0].elements=elements;validate(d);
 return{id:uid(),kind:'provider-candidate',status:'pending',createdAt:new Date().toISOString(),sourceId,elements,coordinateSpace:'drawing-1200x800',calibration:'UNSCALED',missingObjects:scene.objects.filter(o=>!seen.has(o.id)).map(o=>o.id),note:'未採用のAI候補。形状・分類・色・取りこぼしを利用者が確認してください。実寸未校正。'};
}
async function requestJSON(url,options,config,fetchImpl){
 const controller=new AbortController();let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fail('PROVIDER_TIMEOUT','Provider timed out; no retry'));},config.timeoutMs);});
 const work=async()=>{const response=await fetchImpl(url,{...options,signal:controller.signal});if(!response.ok)throw fail('PROVIDER_HTTP','Provider HTTP '+response.status);
  if(Number(response.headers.get('content-length'))>8*1024*1024)throw fail('PROVIDER_TOO_LARGE','Provider result too large');
  const reader=response.body?.getReader();let raw='';
  if(reader){let total=0;const decoder=new TextDecoder();while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>8*1024*1024){await reader.cancel();throw fail('PROVIDER_TOO_LARGE','Provider result too large');}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}
  else raw=await response.text();if(raw.length>8*1024*1024)throw fail('PROVIDER_TOO_LARGE','Provider result too large');try{return JSON.parse(raw);}catch{throw fail('PROVIDER_JSON','Provider response is not JSON');}};
 try{return await Promise.race([work(),deadline]);}
 catch(e){if(e.code&&String(e.code).startsWith('PROVIDER_'))throw e;if(e.name==='AbortError')throw fail('PROVIDER_TIMEOUT','Provider timed out; no retry');throw fail('PROVIDER_NETWORK','Provider transport failed; no retry');}
 finally{clearTimeout(timer);}
}
export async function runVision({bytes,mime,sourceId,consent,config,fetchImpl=fetch,onStage=()=>{},onEvent=()=>{}}){
 if(!consent?.externalTransferApproved||!consent?.costApproved)throw fail('CONSENT_REQUIRED','External transmission and cost approval required');
 if(!config.key||!config.model||!config.samURL||!config.samToken)throw fail('CONFIG_MISSING','Authenticated providers and explicit model required');
 if(!['image/png','image/jpeg'].includes(mime)||!bytes?.length||bytes.length>6*1024*1024)throw fail('INPUT_INVALID','Use a sanitized PNG/JPEG up to 6 MB');
 if(mime==='image/png'&&Buffer.from(bytes).subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||mime==='image/jpeg'&&Buffer.from(bytes).subarray(0,3).toString('hex')!=='ffd8ff')throw fail('INPUT_INVALID','Image signature mismatch');
 if(!Number.isFinite(config.timeoutMs)||config.timeoutMs<1||config.timeoutMs>60000)throw fail('INVALID_CONFIG','Timeout must be 1..60000ms');
 const safeModel=v=>typeof v==='string'&&/^[A-Za-z0-9._-]{1,120}$/.test(v)&&!v.includes(config.key)&&!v.includes(config.samToken)?v:null;
 const started=performance.now(),stages=[],timings={},stageLog=[];let stage='SCENE',active=null;
 const finish=(status='SUCCESS',error=null)=>{if(!active)return;const row={...active,endedAt:new Date().toISOString(),durationMs:performance.now()-active.clock,status,error,retryCount:0};delete row.clock;stageLog.push(row);onEvent(row);active=null;};
 const enter=s=>{finish();stage=s;stages.push(s);onStage(s);active={stage:s,startedAt:new Date().toISOString(),clock:performance.now(),provider:s==='SCENE'?'claude':s==='SEGMENTATION'?'sam':'local',model:null,inputId:sourceId,outputId:uid()};};
 try{enter('SCENE');let t=performance.now();const image={type:'base64',media_type:mime,data:Buffer.from(bytes).toString('base64')};
  const result=await requestJSON('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':config.key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:config.model,max_tokens:4096,output_config:{format:{type:'json_schema',schema:sceneSchema}},messages:[{role:'user',content:[{type:'image',source:image},{type:'text',text:`Identify meaningful visible objects for an editable drawing. Preserve uncertainty as 未知対象; do not invent dimensions or straighten oblique objects. Up to 100 objects. Use approximate bounding boxes in drawing-1200x800 for segmentation prompts; null if unknown. No recognition scores.`}]}]})},config,fetchImpl);
  active.model=safeModel(result.model)||safeModel(config.model);
  if(['max_tokens','refusal'].includes(result.stop_reason))throw fail('SCENE_INCOMPLETE','Scene response incomplete; no retry');
  const texts=result.content?.filter(c=>c.type==='text').map(c=>c.text).join('');let scene;try{scene=sceneResult(JSON.parse(texts));}catch{throw fail('SCENE_INVALID','Claude scene JSON contract invalid');}timings.sceneMs=performance.now()-t;
  enter('SEGMENTATION');t=performance.now();const samResult=await requestJSON(config.samURL,{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+config.samToken},body:JSON.stringify({schema:SCHEMA,image,scene,prompts:prompts(scene),coordinateSpace:'drawing-1200x800'})},config,fetchImpl);
  if(samResult?.error?.code==='OUT_OF_MEMORY')throw fail('SAM_MEMORY','SAM memory unavailable; no retry');
  const geometry=rankMasks(samResult,scene);active.model=safeModel(geometry.model);timings.segmentationMs=performance.now()-t;
  enter('GEOMETRY');t=performance.now();const candidate=candidateFromGeometry(scene,geometry,sourceId);timings.geometryMs=performance.now()-t;
  enter('COLOR');t=performance.now();candidate.provenance={model:safeModel(result.model)||safeModel(config.model),samModel:safeModel(geometry.model)||'not-reported',usage:result.usage?Object.fromEntries(Object.entries(result.usage).filter(([k,v])=>/tokens/.test(k)&&Number.isFinite(v))):null};timings.colorMs=performance.now()-t;
  enter('CANDIDATE_READY');finish();return {candidate,record:{status:'CANDIDATE_READY',stages,stageLog,timings,totalMs:performance.now()-started,model:candidate.provenance.model,samModel:candidate.provenance.samModel,usage:candidate.provenance.usage,sceneCount:scene.objects.length,segmentationCount:geometry.objects.length,candidateCount:candidate.elements.length,maskCount:geometry.maskCount??null,missingObjects:candidate.missingObjects,unknownCount:scene.objects.filter(o=>o.category==='未知対象').length,corrections:null,correctionTimeMs:null}};
 }catch(e){finish('FAILED',e.code||'FAILED');onStage('FAILED');throw Object.assign(fail(e.code||'FAILED',e.code?'Provider stage failed: '+e.code:'Provider stage failed'),{record:{status:'FAILED',failedStage:stage,stages:[...stages,'FAILED'],stageLog,totalMs:performance.now()-started,errorCode:e.code||'FAILED',automaticRetry:false}});}
}
