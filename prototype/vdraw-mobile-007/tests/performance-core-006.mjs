// One paired pass. Node CORE costs only: never compare these numbers with 166ms browser UI.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {project,element,clone} from './baseline005/core.js';
import {Editor as Editor005} from './baseline005/commands.js';import {Editor as Editor006} from '../web/src/commands.js';
import {packHistory,unpackHistory} from '../web/src/history-codec.js';
const measure=fn=>{const t=performance.now();const value=fn();return {value,ms:performance.now()-t}};
const rows=[];
for(const count of [500,2000,5000]){
 const d=project('synthetic-performance');for(let i=0;i<count;i++)d.pages[0].elements.push(element('rect','target',{x:i%100*11,y:Math.floor(i/100)*14,w:8,h:9}));
 const result={elements:count};
 for(const [phase,Editor] of [['005',Editor005],['006',Editor006]]){
  const construct=measure(()=>new Editor(d)),e=construct.value,id=d.pages[0].elements[0].id;
  const select=measure(()=>e.doc.pages[0].elements.find(x=>x.id===d.pages[0].elements.at(-1).id));assert.ok(select.value);
  const update=measure(()=>e.update(id,{fill:'#AA4422'}));assert.equal(update.value,true);
  const undo=measure(()=>e.undo());assert.equal(e.doc.pages[0].elements[0].fill,'#D5E3EF');
  const redo=measure(()=>e.redo());assert.equal(e.doc.pages[0].elements[0].fill,'#AA4422');
  const start=performance.now(),history=await packHistory(e.history()),payload={doc:clone(e.doc),history};const encoded=new TextEncoder().encode(JSON.stringify(payload));await crypto.subtle.digest('SHA-256',encoded);const serializePackChecksumMs=performance.now()-start;
  const resume=performance.now();const parsed=JSON.parse(new TextDecoder().decode(encoded));const restored=new Editor(parsed.doc,await unpackHistory(parsed.history));assert.equal(restored.doc.pages[0].elements.length,count);const unpackAndConstructMs=performance.now()-resume;
  result[phase]={constructMs:construct.ms,selectionLookupMs:select.ms,colorCommandMs:update.ms,undoMs:undo.ms,redoMs:redo.ms,serializePackChecksumMs,unpackAndConstructMs};
 }
 rows.push(result);
}
const result={status:'PASS',scope:'one paired Node CORE pass; no browser DOM/IndexedDB/frame timings; not Android; no comparison to 166ms UI',repetitions:1,node:process.version,rows};await fs.writeFile('evidence/performance-core-006.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
