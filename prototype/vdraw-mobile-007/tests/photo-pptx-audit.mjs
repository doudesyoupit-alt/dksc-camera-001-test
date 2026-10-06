// Actual generated OOXML defect probe. Synthetic image, not real-photo fidelity evidence.
import vm from 'node:vm';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {exportFile} from '../web/src/exporters.js';
import {project} from '../web/src/core.js';
const context = {console, Buffer, Blob, Uint8Array, ArrayBuffer, setTimeout, clearTimeout, TextEncoder, TextDecoder, atob, btoa};
context.window = context; context.global = context; context.self = context;
vm.createContext(context);
vm.runInContext(await fs.readFile(new URL('../web/vendor/pptxgen.bundle.js', import.meta.url), 'utf8'), context);
// Container adaptation only. The shipped PptxGenJS, image placement and OOXML are unchanged.
class Pptx extends context.PptxGenJS {
  async write(options) {return Buffer.from(await super.write({...options, outputType: 'uint8array'}));}
}
const zipAdapter = {loadAsync: async raw => {
  const z = await context.JSZip.loadAsync(raw), generate = z.generateAsync.bind(z);
  z.generateAsync = options => generate({...options, type: 'uint8array'});
  return z;
}};
globalThis.window = {PptxGenJS: Pptx, JSZip: zipAdapter};
const fixture = JSON.parse(await fs.readFile(new URL('./photo-eval-png-fixture.json', import.meta.url), 'utf8'));
const doc = project('Synthetic portrait attachment audit');
doc.sources = [{id: 'synthetic-photo', workImage: 'data:image/png;base64,' + fixture.portraitPNG}];
doc.pages[0].sourceId = 'synthetic-photo';
const bytes = await exportFile(doc, 'pptx', {includePhoto: true});
const zip = await context.JSZip.loadAsync(Buffer.from(bytes));
const xml = await zip.file('ppt/slides/slide1.xml').async('string');
const picture = xml.match(/<p:pic>[\s\S]*?<\/p:pic>/)?.[0];
assert.ok(picture);
const extent = picture.match(/<a:ext cx="(\d+)" cy="(\d+)"/), off = picture.match(/<a:off x="(\d+)" y="(\d+)"/);
const actual = {x: +off[1], y: +off[2], width: +extent[1], height: +extent[2]};
const expected = {x: 3657600, y: 0, width: 3657600, height: 7315200};
assert.deepEqual(actual, {x: 0, y: 0, width: 10972800, height: 7315200});
assert.notDeepEqual(actual, expected);
assert.ok(picture.includes('<a:stretch>'));
console.log(JSON.stringify({schema: 'vdraw-photo-pptx-defect-probe/1', status: 'REPRODUCED_DEFECT',
  issue: 'PHOTO-PPTX-001', severity: 'P1', sourceReleaseHEAD: '15bf3371bec3f7d1e4090e7198a850c5636baf3f',
  inputKind: 'synthetic-fixture', realPhotoInputs: 0, realAI: false, actualPPTXGenerated: true,
  nativeOOXMLInspected: true, actual, expectedContainPlacement: expected,
  sourceImageSize: [40, 80], adoptedPageCanvas: [1200, 800], photoReleaseAllowed: false,
  officeAppVisualAcceptance: 'NOT_RUN', productFilesEdited: false}, null, 2));
