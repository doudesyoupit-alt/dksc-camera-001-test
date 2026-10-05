import {test} from 'node:test';import assert from 'node:assert/strict';
globalThis.document={addEventListener(){},documentElement:{style:{setProperty(){}}}};globalThis.window={innerHeight:844};
const {traceSteps,safeNotice,exportCopy}=await import('../web/src/ui-theme.js');
test('No credential/clock-driven fake trace completion',()=>{const x=traceSteps(null,{state:'BLOCKED'},null);assert.deepEqual(x.map(x=>x.status),['NOT_RUN','BLOCKED','NOT_RUN','NOT_RUN','NOT_RUN']);assert.ok(!JSON.stringify(x).includes('%'));});
test('Only observed source and stage attestations change visible trace state',()=>{const x=traceSteps({workImage:'local'},null,{stages:[{stage:'SCENE',status:'RUNNING'},{stage:'SEGMENTATION',status:'FAILED'}]});assert.deepEqual(x.map(x=>x.status),['PASS','RUNNING','FAILED','NOT_RUN','NOT_RUN']);});
test('Unknown states do not imply success',()=>assert.equal(traceSteps(null,null,{stages:[{stage:'GEOMETRY',status:'whatever'}]})[3].status,'NOT_RUN'));
test('Technical error is separated from useful user guidance',()=>{assert.ok(!safeNotice('TypeError: undefined at endpoint https://internal').includes('endpoint'));assert.equal(safeNotice('実測寸法は正数を入力してください'),'実測寸法は正数を入力してください');});
test('Output descriptions preserve existing editable/viewable meanings',()=>{assert.match(exportCopy.pptx[1],/編集/);assert.match(exportCopy.dxf[1],/CAD/);assert.match(exportCopy.pdf[1],/共有/);});
