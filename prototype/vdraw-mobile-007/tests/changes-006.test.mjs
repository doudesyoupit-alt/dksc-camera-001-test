import test from 'node:test';import assert from 'node:assert/strict';
import * as before from './baseline005/core.js';import * as after from '../web/src/core.js';
import {PhotoTrial} from '../server/photo-trial.mjs';import {TrialRecorder} from '../web/src/trial-recorder.js';
import {trialEvent} from '../web/src/trial-event.js';
const verdict=(fn,d)=>{try{fn(d);return 'PASS'}catch(e){return e.message}};
test('005 and 006 validation preserve rejection/acceptance and messages',()=>{
 const original=before.sample();
 const patches=[{kind:'invalid'},{kind:'rect'},{x:NaN},{x:Infinity},{y:'1'},{w:-1},{h:-1},{strokeWidth:NaN},{strokeWidth:31},{stroke:'#aabbcc'},{stroke:'blue'},{fill:'none'},{fill:'#12FF00'},{fill:'BAD'},{kind:'ellipse',w:0},{kind:'arc',w:2,h:3,startAngle:0,endAngle:30},{kind:'arc',w:2,h:2,startAngle:0,endAngle:30},{fontSize:0},{fontSize:NaN},{name:null},{category:null},{text:1},{points:[[1,2,3]]},{points:[[NaN,2]]},{kind:'polygon',points:[[1,2],[2,3]]},{kind:'polygon',points:[[1,2],[2,3],[3,4]]}];
 for(const patch of patches){const d=before.clone(original);Object.assign(d.pages[0].elements[0],patch);assert.equal(verdict(after.validate,d),verdict(before.validate,d));}
 const large=before.project('boundary');for(let i=0;i<5000;i++)large.pages[0].elements.push(before.element('rect','test'));
 assert.equal(verdict(after.validate,large),verdict(before.validate,large));large.pages[0].elements.push(before.element());assert.equal(verdict(after.validate,large),verdict(before.validate,large));
 for(const d of [{},{...original,pages:[]},{...original,activePageId:'absent'},{...original,revision:-1}])assert.equal(verdict(after.validate,d),verdict(before.validate,d));
});
test('event allowlist strips sensitive extras and retains required fields',()=>{
 const row=trialEvent({stage:'SCENE',status:'FAILED',provider:'claude',model:'fixture',startedAt:'2026-10-04T00:00:00Z',endedAt:'2026-10-04T00:00:01Z',durationMs:1000,error:'PROVIDER_TIMEOUT',retryCount:0,photo:'PRIVATE_IMAGE',endpoint:'PRIVATE_URL',stack:'PRIVATE_STACK',name:'PRIVATE_NAME',apiKey:'PRIVATE_KEY'},{runId:'run-1',inputId:'input-1',objectCount:2});
 for(const field of ['runId','inputId','provider','model','stage','startedAt','finishedAt','durationMs','status','errorCode','retryCount','objectCount'])assert.ok(Object.hasOwn(row,field),field);
 assert.ok(!JSON.stringify(row).includes('PRIVATE'));assert.equal(row.objectCount,2);assert.equal(row.errorCode,'PROVIDER_TIMEOUT');
});
test('server blocked trial records every stage without invented counts/times',()=>{
 const t=new PhotoTrial();t.start('PHOTO');t.finish('BLOCKED','CONFIG_MISSING');
 const r=t.report();assert.equal(r.metrics.inputCount,0);assert.equal(r.stages.length,12);
 for(const row of r.stages){assert.equal(row.runId,r.runId);assert.equal(row.inputId,r.inputId);assert.ok(Object.hasOwn(row,'objectCount'));assert.ok(Object.hasOwn(row,'finishedAt'));}
 assert.equal(r.stages[0].objectCount,0);assert.equal(r.stages[1].objectCount,null);assert.equal(r.stages[1].durationMs,null);assert.equal(r.stages[1].status,'NOT_RUN');
});
test('browser recorder roundtrip preserves attestation and counts, no raw content',()=>{
 const envelope={executionKind:'protocol-fixture',candidate:{elements:[{},{}]},record:{sceneCount:3,segmentationCount:2,unknownCount:1}};
 const t=new TrialRecorder(envelope);t.start('ADOPT');const d=after.sample();t.adopted(d);const r=t.report();
 assert.equal(r.stages.find(x=>x.stage==='ADOPT').objectCount,2);assert.equal(r.metrics.measuredOnRealPhoto,false);
 const restored=TrialRecorder.restore(r,d).report();assert.equal(restored.metrics.candidateCount,2);assert.equal(restored.metrics.humanAttested,false);assert.equal(restored.runId,r.runId);
 assert.ok(restored.stages.every(x=>x.runId===r.runId));
});
