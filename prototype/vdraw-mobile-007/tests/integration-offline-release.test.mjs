import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

test('release worker replaces the prior 007 cache while preserving 006 offline assets',async()=>{
 const source=await fs.readFile(new URL('../web/sw.js',import.meta.url),'utf8');
 const handlers=new Map(),opened=[],deleted=[];
 const prior='vdraw-mobile-shell-007-round1-v2',six='vdraw-mobile-shell-006-v1';
 const cache={async addAll(files){assert.ok(files.includes('src/vision.js')&&files.includes('src/app.js'));}};
 const self={registration:{scope:'https://vdraw.test/'},addEventListener:(name,fn)=>handlers.set(name,fn),clients:{claim:async()=>{}}};
 vm.runInNewContext(source,{self,caches:{open:async name=>{opened.push(name);return cache;},keys:async()=>[six,prior,opened[0]],delete:async name=>{deleted.push(name);return true;}}});
 let installed;handlers.get('install')({waitUntil:p=>{installed=p;}});await installed;
 assert.ok(opened[0].startsWith('vdraw-mobile-shell-007-'));
 assert.notEqual(opened[0],prior,'changed app/vision must receive a fresh offline cache');
 let activated;handlers.get('activate')({waitUntil:p=>{activated=p;}});await activated;
 assert.deepEqual(deleted,[prior]);
 assert.ok(!deleted.includes(six),'existing 006 offline assets must remain available');
});
