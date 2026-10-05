// Diagnostic allowlist: never copy photo, object names, endpoint or raw errors.
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(value);
const count=value=>Number.isInteger(value)&&value>=0?value:null;
export function trialEvent(row,{runId,inputId,objectCount=null}){
 if(!id(runId)||!id(inputId))throw Error('Invalid diagnostic identity');
 const status=['SUCCESS','FAILED','BLOCKED','NOT_RUN'].includes(row.status)?row.status:'NOT_RUN';
 const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
 return {runId,inputId,provider:['claude','sam','local'].includes(row.provider)?row.provider:null,model:typeof row.model==='string'&&/^[A-Za-z0-9._-]{1,120}$/.test(row.model)?row.model:null,stage:['PHOTO','SCENE','SEGMENTATION','GEOMETRY','COLOR','CANDIDATE','HUMAN_REVIEW','ADOPT','MANUAL_EDIT','SAVE','PPTX','DXF'].includes(row.stage)?row.stage:null,startedAt:date(row.startedAt),finishedAt:date(row.endedAt),durationMs:Number.isFinite(row.durationMs)&&row.durationMs>=0?row.durationMs:null,status,errorCode:typeof row.error==='string'&&/^[A-Z0-9_]{1,60}$/.test(row.error)?row.error:null,retryCount:count(row.retryCount)??0,objectCount:count(objectCount)};
}
export function stageObjectCount(stage,metrics){
 return count(stage==='PHOTO'?metrics.inputCount:stage==='SCENE'?metrics.sceneCount:stage==='SEGMENTATION'?metrics.segmentationCount:['GEOMETRY','COLOR','CANDIDATE','ADOPT'].includes(stage)?metrics.candidateCount:null);
}
