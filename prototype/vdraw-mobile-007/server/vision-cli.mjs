import fs from 'node:fs/promises';import path from 'node:path';
import {configuration,status,runVision} from './vision-provider.mjs';
const args=process.argv.slice(2),value=k=>{const i=args.indexOf(k);return i>=0&&args[i+1]&&!args[i+1].startsWith('--')?args[i+1]:undefined;};
try{
 if(args.includes('--check')){console.log(JSON.stringify(status(),null,2));}
 else{
  const {config,missing}=configuration();if(missing.length)throw Error('UNCONNECTED: '+missing.join(', '));
  if(!args.includes('--approved-external-transfer')||!args.includes('--approved-cost'))throw Error('Explicit approved photo transmission/cost flags required');
  const file=value('--image'),sourceId=value('--source-id'),output=value('--output');if(!file||!sourceId||!output)throw Error('--image sanitized.png --source-id <UUID> --output candidate.json required');
  const mime=/\.png$/i.test(file)?'image/png':/\.jpe?g$/i.test(file)?'image/jpeg':null;
  const result=await runVision({bytes:await fs.readFile(file),mime,sourceId,consent:{externalTransferApproved:true,costApproved:true},config,onStage:s=>console.error(s)});
  // Candidate only. Existing project never overwritten; import into candidate review separately.
  await fs.writeFile(output,JSON.stringify({schema:'vdraw-vision-result/1',executionKind:'real-providers',...result},null,2),{flag:'wx'});console.log(JSON.stringify(result.record,null,2));
 }
}catch(e){console.error(JSON.stringify({status:'BLOCKED_OR_FAILED',code:e.code||'PREFLIGHT',message:e.message,record:e.record||null}));process.exitCode=2;}
