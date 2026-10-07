// Test/QA CLI. Browser runtime has no filesystem or Node parser dependencies.
import {readFile,writeFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {readNativePptx} from '../native-inventory.mjs';
import {DOMParser,XMLSerializer} from './node-xml-adapter.mjs';
import {JSZip} from './fixture-builder.mjs';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node inspect-pptx.mjs input.pptx output.json');
const bytes=new Uint8Array(await readFile(input));
try{const result=await readNativePptx(bytes,{JSZip,DOMParser,XMLSerializer,crypto:webcrypto,origin:'QA_CALLER_REPORTED_UNVERIFIED'});await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'INVENTORY_ONLY',counts:result.counts,exportReadiness:result.exportReadiness}));}
catch(e){await writeFile(output,JSON.stringify({status:'BLOCKED',error:{code:e.code||e.name,message:e.message,source:e.source||null}},null,2)+'\n');process.exitCode=1;}
