import test from 'node:test';import assert from 'node:assert/strict';import path from'node:path';import{pathToFileURL}from'node:url';import{fixture,unknown}from'../fixtures/independent-style-scaffold.mjs';
const{validateDrawingIR:v}=await import(pathToFileURL(path.join(process.env.VDRAW_A2_FIXED_ROOT,'validate.mjs')));
test('custom arbitrary source coordinates cannot be called UNSCALED PPTX SOURCE frame without new contract',()=>{const d=unknown();d.frames[0].physicalUnit='UNSCALED';assert.equal(v(d).ok,false);});
test('PPTX source geometry cannot silently relabel custom path coordinates as PX',()=>{const d=unknown();d.frames[0].physicalUnit='PX';assert.equal(v(d).ok,false);});
