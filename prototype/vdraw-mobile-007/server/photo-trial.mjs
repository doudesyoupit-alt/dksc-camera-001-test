// Evidence ledger only. No automatic adoption, retries or fabricated human assessment.
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {trialEvent,stageObjectCount} from '../web/src/trial-event.js';
export const trialStages=['PHOTO','SCENE','SEGMENTATION','GEOMETRY','COLOR','CANDIDATE','HUMAN_REVIEW','ADOPT','MANUAL_EDIT','SAVE','PPTX','DXF'];
const idOK=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x);
const codeOK=x=>typeof x==='string'&&/^[A-Z0-9_]{1,60}$/.test(x);
export class PhotoTrial {
 constructor({executionKind='real-providers',inputKind='real-photo',inputId=randomUUID()}={}){
  if(!['real-providers','protocol-fixture'].includes(executionKind)||!['real-photo','synthetic-fixture'].includes(inputKind)||!idOK(inputId))throw Error('Invalid trial configuration');
  this.executionKind=executionKind;this.inputKind=inputKind;this.inputId=inputId;this.runId=randomUUID();this.createdAt=new Date().toISOString();this.clock=performance.now();this.rows=[];this.pending=null;
  this.metrics={inputCount:0,sceneCount:null,segmentationCount:null,unknownCount:null,missedObjects:null,misclassifiedObjects:null,incorrectShapes:null,colorCorrections:null,shapeCorrections:null,classCorrections:null,operatorActionCount:null,correctionTimeMs:null,aiProcessingTimeMs:null,totalTimeMs:null,usage:null,measuredOnRealPhoto:false};
 }
 start(stage,{provider='local',model=null,inputId=this.inputId}={}){
  if(this.pending||!trialStages.includes(stage)||!idOK(inputId)||!/^[a-z-]{1,30}$/.test(provider)||model!==null&&!/^[A-Za-z0-9._-]{1,120}$/.test(model))throw Error('Invalid trial stage');
  const previous=trialStages.indexOf(stage)-1;
  if(previous>=0&&!this.rows.some(r=>r.stage===trialStages[previous]&&r.status==='SUCCESS'))throw Error('Previous stage incomplete');
  this.pending={stage,startedAt:new Date().toISOString(),clock:performance.now(),provider,model,inputId,outputId:randomUUID(),retryCount:0};
 }
 finish(status='SUCCESS',error=null){if(!this.pending||!['SUCCESS','FAILED','BLOCKED'].includes(status)||error!==null&&!codeOK(error))throw Error('Invalid trial completion');const row={...this.pending,endedAt:new Date().toISOString(),durationMs:performance.now()-this.pending.clock,status,error};delete row.clock;this.rows.push(row);this.pending=null;return row;}
 async step(stage,fn,meta={}){this.start(stage,meta);try{const value=await fn();this.finish();return value;}catch(e){this.finish('FAILED',codeOK(e.code)?e.code:'STAGE_FAILED');throw e;}}
 providerEvent(row){const stage=row.stage==='CANDIDATE_READY'?'CANDIDATE':row.stage;if(!trialStages.includes(stage)||!this.rows.some(r=>r.stage==='PHOTO'&&r.status==='SUCCESS'))throw Error('Provider event before photo');
  const index=trialStages.indexOf(stage);if(!this.rows.some(r=>r.stage===trialStages[index-1]&&r.status==='SUCCESS'))throw Error('Provider event sequence invalid');
  const copy={stage,startedAt:row.startedAt,endedAt:row.endedAt,durationMs:row.durationMs,status:row.status,provider:row.provider,model:row.model,inputId:this.inputId,outputId:randomUUID(),error:row.error,retryCount:0};
  if(!Number.isFinite(copy.durationMs)||copy.durationMs<0||!Number.isFinite(Date.parse(copy.startedAt))||!Number.isFinite(Date.parse(copy.endedAt))||copy.error!==null&&!codeOK(copy.error))throw Error('Invalid provider evidence');this.rows.push(copy);
 }
 inputAccepted(){this.metrics.inputCount=1;}
 aiResult(record){for(const k of ['sceneCount','segmentationCount','unknownCount','candidateCount'])this.metrics[k]=record[k]??null;this.metrics.aiProcessingTimeMs=record.totalMs;this.metrics.usage=record.usage??null;}
 humanAssessment(values,{attested=false,source='human'}={}){
  if(!attested||!['human','automated-fixture'].includes(source)||source==='automated-fixture'&&this.executionKind!=='protocol-fixture')throw Error('Human review required');
  for(const k of ['missedObjects','misclassifiedObjects','incorrectShapes','colorCorrections','shapeCorrections','classCorrections','operatorActionCount']){const v=values[k];if(v!==null&&(!Number.isInteger(v)||v<0))throw Error('Invalid correction count');this.metrics[k]=v;}
  if(values.correctionTimeMs!==null&&(!Number.isFinite(values.correctionTimeMs)||values.correctionTimeMs<0))throw Error('Invalid correction time');this.metrics.correctionTimeMs=values.correctionTimeMs;
  this.metrics.measuredOnRealPhoto=source==='human'&&this.executionKind==='real-providers'&&this.inputKind==='real-photo';this.metrics.assessmentSource=source;
 }
 report(){return {schema:'vdraw-photo-trial/1',runId:this.runId,inputId:this.inputId,executionKind:this.executionKind,inputKind:this.inputKind,createdAt:this.createdAt,stages:trialStages.map(stage=>{const row=this.rows.find(r=>r.stage===stage)||{stage,status:'NOT_RUN',startedAt:null,endedAt:null,durationMs:null,provider:null,model:null,inputId:this.inputId,outputId:null,error:null,retryCount:0};return {...row,...trialEvent(row,{runId:this.runId,inputId:this.inputId,objectCount:stageObjectCount(stage,this.metrics)})};}),metrics:{...this.metrics,totalTimeMs:this.rows.some(r=>r.stage==='DXF'&&r.status==='SUCCESS')?performance.now()-this.clock:null}};}
}
