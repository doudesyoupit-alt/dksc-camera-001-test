import {trialEvent,stageObjectCount} from './trial-event.js';
// Private diagnostic evidence: IDs, clocks, counts only; no photo/name/endpoint/stack.
const stages=['PHOTO','SCENE','SEGMENTATION','GEOMETRY','COLOR','CANDIDATE','HUMAN_REVIEW','ADOPT','MANUAL_EDIT','SAVE','PPTX','DXF'];
const identifier=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x);
const modelOK=x=>x===null||typeof x==='string'&&/^[A-Za-z0-9._-]{1,120}$/.test(x);
export class TrialRecorder {
 constructor(envelope){
  this.kind=envelope.executionKind;this.runId=crypto.randomUUID();this.inputId=crypto.randomUUID();this.rows=new Map();this.active=new Map();this.projectId=null;this.pageId=null;this.firstEdit=null;this.edits={color:new Set(),shape:new Set(),classification:new Set()};this.counts={color:0,shape:0,classification:0};this.actions=0;this.priorEditMs=0;
  this.metrics={inputCount:null,sceneCount:envelope.record?.sceneCount??null,segmentationCount:envelope.record?.segmentationCount??null,candidateCount:envelope.candidate?.elements?.length??envelope.record?.candidateCount??null,unknownCount:envelope.record?.unknownCount??null,missedObjects:null,misclassifiedObjects:null,incorrectShapes:null,aiProcessingTimeMs:envelope.record?.totalMs??null,usage:null,humanAttested:false};
  const trial=envelope.trial;if(trial?.schema==='vdraw-photo-trial/1'&&trial.executionKind===this.kind&&Array.isArray(trial.stages)){
   if(identifier(trial.inputId))this.inputId=trial.inputId;
   for(const raw of trial.stages.slice(0,6))this.accept(raw);
   this.metrics.inputCount=trial.metrics?.inputCount===1?1:0;
  }else for(const raw of envelope.record?.stageLog||[])this.accept({...raw,stage:raw.stage==='CANDIDATE_READY'?'CANDIDATE':raw.stage});
  for(const [k,v] of Object.entries(envelope.record?.usage||{}))if(/^[a-z_]*tokens$/.test(k)&&Number.isFinite(v)&&v>=0)(this.metrics.usage??={})[k]=v;
  this.start('HUMAN_REVIEW');
 }
 static restore(report,d){
  const r=new TrialRecorder({executionKind:report.executionKind,trial:report,record:report.metrics});r.active.clear();r.runId=identifier(report.runId)?report.runId:r.runId;r.projectId=d.id;r.pageId=d.activePageId;
  for(const row of report.stages||[])if(stages.includes(row.stage)&&['SUCCESS','FAILED'].includes(row.status)&&Number.isFinite(row.durationMs)&&row.durationMs>=0&&Number.isFinite(Date.parse(row.startedAt))&&Number.isFinite(Date.parse(row.endedAt))&&modelOK(row.model))r.rows.set(row.stage,{stage:row.stage,status:row.status,startedAt:row.startedAt,endedAt:row.endedAt,durationMs:row.durationMs,provider:['claude','sam','local'].includes(row.provider)?row.provider:'local',model:row.model,inputId:r.inputId,outputId:crypto.randomUUID(),error:row.error&&/^[A-Z0-9_]{1,60}$/.test(row.error)?row.error:null,retryCount:0});
  for(const k of ['sceneCount','segmentationCount','candidateCount','unknownCount','missedObjects','misclassifiedObjects','incorrectShapes'])r.metrics[k]=Number.isInteger(report.metrics?.[k])&&report.metrics[k]>=0?report.metrics[k]:null;
  r.metrics.aiProcessingTimeMs=Number.isFinite(report.metrics?.aiProcessingTimeMs)?report.metrics.aiProcessingTimeMs:null;r.metrics.inputCount=report.metrics?.inputCount===1?1:0;r.metrics.humanAttested=report.metrics?.humanAttested===true;r.actions=Number.isInteger(report.metrics?.operatorActionCount)?report.metrics.operatorActionCount:0;
  for(const [k,key] of Object.entries({color:'colorCorrections',shape:'shapeCorrections',classification:'classCorrections'}))r.counts[k]=Number.isInteger(report.metrics?.[key])?report.metrics[key]:0;
  r.priorEditMs=Number.isFinite(report.metrics?.correctionTimeMs)?report.metrics.correctionTimeMs:0;return r;
 }
 accept(r){if(!stages.slice(0,6).includes(r.stage)||r.status!=='SUCCESS'||!Number.isFinite(r.durationMs)||r.durationMs<0||!modelOK(r.model)||!Number.isFinite(Date.parse(r.startedAt))||!Number.isFinite(Date.parse(r.endedAt)))return;
  this.rows.set(r.stage,{stage:r.stage,status:r.status,startedAt:r.startedAt,endedAt:r.endedAt,durationMs:r.durationMs,provider:['claude','sam','local'].includes(r.provider)?r.provider:'local',model:r.model,inputId:this.inputId,outputId:crypto.randomUUID(),error:null,retryCount:0});
 }
 start(stage){if(!stages.includes(stage))return;this.active.set(stage,{stage,startedAt:new Date().toISOString(),clock:performance.now()});}
 finish(stage,status='SUCCESS',error=null){const a=this.active.get(stage);if(!a)return;this.rows.set(stage,{stage,status,startedAt:a.startedAt,endedAt:new Date().toISOString(),durationMs:performance.now()-a.clock,provider:'local',model:null,inputId:this.inputId,outputId:crypto.randomUUID(),error:error&&/^[A-Z0-9_]{1,60}$/.test(error)?error:null,retryCount:0});this.active.delete(stage);}
 adopted(d){this.finish('HUMAN_REVIEW');this.finish('ADOPT');this.projectId=d.id;this.pageId=d.activePageId;this.actions++;}
 edit(before,after){if(!this.projectId)return;if(!this.firstEdit){this.firstEdit=performance.now();if(!this.active.has('MANUAL_EDIT'))this.start('MANUAL_EDIT');}this.actions++;
  if(['fill','stroke','strokeWidth'].some(k=>before[k]!==after[k])){this.edits.color.add(after.id);this.counts.color++;}
  if(['x','y','w','h','points','startAngle','endAngle'].some(k=>JSON.stringify(before[k])!==JSON.stringify(after[k]))){this.edits.shape.add(after.id);this.counts.shape++;}
  if(before.category!==after.category){this.edits.classification.add(after.id);this.counts.classification++;}
 }
 saving(d){if(d.id!==this.projectId)return false;if(this.rows.has('SAVE')&&(this.rows.has('PPTX')||this.rows.has('DXF'))&&!this.active.has('MANUAL_EDIT'))return false;if(this.active.has('MANUAL_EDIT'))this.finish('MANUAL_EDIT');else if(!this.rows.has('MANUAL_EDIT')){this.start('MANUAL_EDIT');this.finish('MANUAL_EDIT');}this.start('SAVE');return true;}
 saved(ok){if(!this.active.has('SAVE'))return;if(ok&&this.firstEdit!==null)this.editDurationMs=performance.now()-this.firstEdit;this.finish('SAVE',ok?'SUCCESS':'FAILED',ok?null:'SAVE_FAILED');}
 assessment({missed,misclassified,shapes,attested}){for(const v of [missed,misclassified,shapes])if(!Number.isInteger(v)||v<0)throw Error('確認数は0以上の整数で入力してください');this.metrics.missedObjects=missed;this.metrics.misclassifiedObjects=misclassified;this.metrics.incorrectShapes=shapes;this.metrics.humanAttested=attested===true;}
 report(){const first=this.rows.get('PHOTO'),last=this.rows.get('DXF');return {schema:'vdraw-photo-trial/1',executionKind:this.kind,inputKind:this.kind==='protocol-fixture'?'synthetic-fixture':'real-photo',runId:this.runId,inputId:this.inputId,stages:stages.map(s=>{const row=this.rows.get(s)||{stage:s,status:'NOT_RUN',startedAt:null,endedAt:null,durationMs:null,provider:null,model:null,inputId:this.inputId,outputId:null,error:null,retryCount:0};return {...row,...trialEvent(row,{runId:this.runId,inputId:this.inputId,objectCount:stageObjectCount(s,this.metrics)})};}),metrics:{...this.metrics,colorCorrections:this.counts.color,shapeCorrections:this.counts.shape,classCorrections:this.counts.classification,operatorActionCount:this.actions,correctionTimeMs:this.firstEdit===null?(this.priorEditMs||null):this.priorEditMs+(this.editDurationMs??performance.now()-this.firstEdit),totalTimeMs:first&&last?Date.parse(last.endedAt)-Date.parse(first.startedAt):null,measuredOnRealPhoto:this.kind==='real-providers'&&this.metrics.humanAttested,assessmentSource:this.kind==='protocol-fixture'?'automated-fixture-or-sample':this.metrics.humanAttested?'browser-user-attested':'browser-actions-unattested'},recordPersistenceError:this.recordPersistenceError??null};}
}
