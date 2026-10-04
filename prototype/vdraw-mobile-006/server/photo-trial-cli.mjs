import fs from 'node:fs/promises';import {PhotoTrial} from './photo-trial.mjs';import {configuration,runVision} from './vision-provider.mjs';
const args=process.argv.slice(2),value=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:undefined;},output=value('--output');
const trial=new PhotoTrial();let result;
try{
 const {config,missing}=configuration();
 if(missing.length){trial.start('PHOTO');trial.finish('BLOCKED','CONFIG_MISSING');result=trial.report();}
 else{
  const image=value('--image'),sourceId=value('--source-id');
  if(!image||!sourceId||!args.includes('--approved-photo-use')||!args.includes('--approved-external-transfer')||!args.includes('--approved-cost'))throw Object.assign(Error(),{code:'APPROVAL_REQUIRED'});
  const mime=/\.png$/i.test(image)?'image/png':/\.jpe?g$/i.test(image)?'image/jpeg':null;
  const bytes=await trial.step('PHOTO',async()=>fs.readFile(image));trial.inputAccepted();
  const vision=await runVision({bytes,mime,sourceId,consent:{externalTransferApproved:true,costApproved:true},config,onEvent:row=>trial.providerEvent(row)});trial.aiResult(vision.record);
  const candidateOutput=value('--candidate-output');if(!candidateOutput)throw Object.assign(Error(),{code:'OUTPUT_REQUIRED'});
  await fs.writeFile(candidateOutput,JSON.stringify({schema:'vdraw-vision-result/1',executionKind:'real-providers',...vision,trial:trial.report()},null,2),{flag:'wx'});
  // HUMAN_REVIEW and later steps remain NOT_RUN. Import the candidate in the app; never auto-adopt.
  result=trial.report();
 }
}catch(e){if(!trial.rows.length){trial.start('PHOTO');trial.finish('BLOCKED','PREFLIGHT_FAILED');}result=trial.report();result.error=/^[A-Z0-9_]{1,60}$/.test(e.code||'')?e.code:'TRIAL_FAILED';}
if(output)await fs.writeFile(output,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result,null,2));
