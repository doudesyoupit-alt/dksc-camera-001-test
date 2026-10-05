import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const web=fileURLToPath(new URL('../web/',import.meta.url));
const scope='https://vdraw.test/';

test('installed 007 service worker serves the complete imported application graph offline',async()=>{
 const handlers=new Map(),entries=new Map(),opened=[];
 const cache={
  async addAll(files){for(const name of files){const relative=name==='./'?'index.html':name;const bytes=await fs.readFile(path.join(web,relative));entries.set(new URL(name,scope).href,new Response(bytes));}},
  async match(request){return entries.get(typeof request==='string'?request:request.url)?.clone();},
 };
 const worker={registration:{scope},addEventListener:(type,fn)=>handlers.set(type,fn),clients:{claim:async()=>{}}};
 vm.runInNewContext(await fs.readFile(path.join(web,'sw.js'),'utf8'),{
  self:worker,caches:{open:async key=>{opened.push(key);return cache;}},
  fetch:async()=>{throw Error('network intentionally unavailable');},
 });
 let install;handlers.get('install')({waitUntil:p=>{install=p;}});await install;
 assert.ok(opened[0].startsWith('vdraw-mobile-shell-007-'));
 assert.notEqual(opened[0],'vdraw-mobile-shell-007-v1','updated graph needs its own cache generation');
 const visited=new Set();
 async function verify(relative){
  if(visited.has(relative))return;visited.add(relative);
  const request={method:'GET',url:new URL(relative,scope).href};let response;
  handlers.get('fetch')({request,respondWith:p=>{response=p;}});
  const served=await response;assert.ok(served,'offline cache miss: '+relative);
  const actual=await served.text();assert.equal(actual,await fs.readFile(path.join(web,relative),'utf8'));
  const imports=[...actual.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(p=>p.startsWith('.'));
  for(const name of imports)await verify(path.posix.normalize(path.posix.join(path.posix.dirname(relative),name)));
 }
 await verify('src/app.js');
 assert.ok(visited.has('src/export-jobs.js'),'export ownership module was not exercised');
 assert.ok(visited.has('src/vision.js')&&visited.has('src/core.js'));
});
