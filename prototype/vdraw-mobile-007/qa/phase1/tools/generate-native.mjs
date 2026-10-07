// QA-only unchanged native exporter invocation. No production source edits.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import crypto from 'node:crypto';
const [sourceRoot,outRoot]=process.argv.slice(2);
if(!sourceRoot||!outRoot)throw Error('usage: node generate-native.mjs SOURCE_ROOT OUTPUT_ROOT');
const runtimeRoot=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if(!runtimeRoot)throw Error('Explicit installed Node module path required');
const require=createRequire(path.join(runtimeRoot,'package.json'));
const PptxGenJS=require('pptxgenjs'),JSZip=require('jszip');
class QATypeAdapter extends PptxGenJS {async write(options){return Buffer.from(await super.write({...options,outputType:'uint8array'}));}}
const zipAdapter={loadAsync:async raw=>{const z=await JSZip.loadAsync(raw),generate=z.generateAsync.bind(z);z.generateAsync=options=>generate({...options,type:'uint8array'});return z;}};
globalThis.window={PptxGenJS:QATypeAdapter,JSZip:zipAdapter};
const root=path.resolve(sourceRoot),context=vm.createContext({window:globalThis.window,crypto:crypto.webcrypto,structuredClone,Blob,console,Date,Math,Uint8Array,Buffer,setTimeout,clearTimeout,TextEncoder,TextDecoder,atob,btoa});
const modules={};
for(const name of ['core','render','exporters'])modules[name]=new vm.SourceTextModule(await fs.readFile(path.join(root,'web/src/'+name+'.js'),'utf8'),{context,identifier:name});
// readDataUrl is not reached by photo-free PPTX. Explicit QA boundary prevents
// Android/native imports while invoking the unchanged exporter module bytes.
modules.device=new vm.SourceTextModule('export function readDataUrl(){throw Error("Unused QA native IO boundary");}',{context,identifier:'device'});
await modules.exporters.link(spec=>modules[spec.replace('./','').replace('.js','')]);await modules.exporters.evaluate();
const {exportFile}=modules.exporters.namespace,{project,element}=modules.core.namespace;
const d=project('QA Native Fixture');d.id='qa-native-doc';d.createdAt=d.updatedAt='2026-10-07T00:00:00Z';d.pages[0].id='qa-native-page';d.activePageId=d.pages[0].id;
d.pages[0].elements=[element('line','horizontal',{id:'native-line',x:100,y:100,w:300,h:0,fill:'none',stroke:'#112233'}),element('rect','rectangle',{id:'native-rect',x:200,y:200,w:180,h:100,fill:'#ABCDEF',stroke:'#102030'}),element('ellipse','ellipse',{id:'native-ellipse',x:450,y:250,w:100,h:160,fill:'none',stroke:'#334455'}),element('text','japanese',{id:'native-text',x:100,y:500,w:400,h:100,text:'分電盤 ABC\n1000',fontSize:24,fill:'#224466',stroke:'#224466'}),element('dimension','manual annotation',{id:'native-dimension',x:700,y:500,w:200,h:0,text:'1000',dimension:{status:'MANUAL',valueMm:1000},fill:'none',stroke:'#334466'})];
await fs.mkdir(outRoot,{recursive:true});await fs.writeFile(path.join(outRoot,'native-vdraw-n01.pptx'),Buffer.from(await exportFile(d,'pptx',{})));await fs.writeFile(path.join(outRoot,'native-vdraw-n01.editor.json'),JSON.stringify(d,null,2)+'\n');
await fs.writeFile(path.join(outRoot,'native-generation-provenance.json'),JSON.stringify({sourceHead:'6c0facb34757a54ed37d08d94505129b0341ad66',unchangedExporter:true,packagerVersion:JSON.parse(await fs.readFile(path.join(runtimeRoot,'pptxgenjs/package.json'),'utf8')).version,zipVersion:require('jszip/package.json').version,adapter:'Blob/uint8array packaging type only; photo-free unused native IO module dependency injection',semanticMetadataAuthority:'UNVERIFIED',appVerification:'NOT_RUN',classification:'VDRAW_NATIVE_QA_EXPORTER_OUTPUT',accuracyEvidence:false},null,2)+'\n');
console.log(JSON.stringify({nativeFixtureGenerated:true,productionSourceEdits:0,app:'NOT_RUN'}));
