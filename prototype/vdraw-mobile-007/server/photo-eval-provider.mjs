// Evaluation-only runner. No listener, secrets/artifacts/cache, retry or automatic adoption.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {configuration, runVision} from './vision-provider.mjs';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = code => {throw Object.assign(new Error(code), {code});};
const crc32 = bytes => {
  let c = 0xffffffff;
  for (const b of bytes) {c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);}
  return (c ^ 0xffffffff) >>> 0;
};
export function validateCanonicalPNG(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 6 * 1024 * 1024 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') fail('CANONICAL_IMAGE_INVALID');
  let offset = 8, width, height, seenHeader = false, seenEnd = false, dataEnded = false;
  const data = [];
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length || seenEnd) fail('CANONICAL_IMAGE_INVALID');
    const length = bytes.readUInt32BE(offset);
    if (length > bytes.length - offset - 12) fail('CANONICAL_IMAGE_INVALID');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const body = bytes.subarray(offset + 8, offset + 8 + length);
    if (!['IHDR', 'IDAT', 'IEND'].includes(type)) fail('CANONICAL_METADATA_FORBIDDEN');
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== bytes.readUInt32BE(offset + 8 + length)) fail('CANONICAL_IMAGE_INVALID');
    if (type === 'IHDR') {
      if (seenHeader || offset !== 8 || length !== 13) fail('CANONICAL_IMAGE_INVALID');
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      if (width < 1 || height < 1 || width > 1600 || height > 1600 || body[8] !== 8 || body[9] !== 2 || body[10] !== 0 || body[11] !== 0 || body[12] !== 0) fail('CANONICAL_IMAGE_INVALID');
      seenHeader = true;
    } else if (type === 'IDAT') {
      if (!seenHeader || dataEnded) fail('CANONICAL_IMAGE_INVALID');
      data.push(body);
    } else {
      if (!seenHeader || !data.length || length !== 0) fail('CANONICAL_IMAGE_INVALID');
      seenEnd = true; dataEnded = true;
    }
    offset += length + 12;
  }
  if (!seenEnd || offset !== bytes.length) fail('CANONICAL_IMAGE_INVALID');
  const stride = width * 3 + 1, expected = stride * height;
  let raw;
  try {raw = inflateSync(Buffer.concat(data), {maxOutputLength: expected});} catch {fail('CANONICAL_IMAGE_INVALID');}
  if (raw.length !== expected) fail('CANONICAL_IMAGE_INVALID');
  for (let row = 0; row < height; row++) if (raw[row * stride] > 4) fail('CANONICAL_IMAGE_INVALID');
  return {width, height, metadataRemoved: true};
}
export async function preflight(env = process.env) {
  const {missing, ready} = configuration(env);
  return {status: ready ? 'CONFIGURED_NOT_CONNECTED' : 'BLOCKED', missing,
    realInferenceCount: 0, networkRequests: 0, automaticRetry: false};
}
export function datasetPath(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) fail('DATASET_PATH_INVALID');
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) fail('DATASET_PATH_ESCAPE');
  return resolved;
}
export async function runPhoto({photo, datasetRoot, outputDirectory, env = process.env}) {
  const {config, missing} = configuration(env);
  if (missing.length) fail('CONFIG_MISSING');
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(photo.id || '') || photo.inputKind !== 'real-photo') fail('PHOTO_INVALID');
  if (photo.consent?.photoUseApproved !== true || photo.consent?.externalTransferApproved !== true || photo.consent?.costApproved !== true) fail('PHOTO_CONSENT_REQUIRED');
  const actualPath = async relative => {
    const p = await fs.realpath(datasetPath(datasetRoot, relative));
    const root = await fs.realpath(datasetRoot);
    if (!p.startsWith(root + path.sep)) fail('DATASET_PATH_ESCAPE');
    return p;
  };
  const original = await fs.readFile(await actualPath(photo.originalPath));
  const bytes = await fs.readFile(await actualPath(photo.canonicalPath));
  if (sha(original) !== photo.originalSHA256 || sha(bytes) !== photo.canonicalSHA256) fail('PHOTO_HASH_MISMATCH');
  validateCanonicalPNG(bytes);
  if (photo.manualQualityApproved !== true) fail('QUALITY_REVIEW_REQUIRED');
  if (typeof outputDirectory !== 'string' || !outputDirectory) fail('OUTPUT_REQUIRED');
  await fs.mkdir(outputDirectory, {recursive: true, mode: 0o700});
  // Claim the run before any billable request. Failed runs remain blocked; no auto retry.
  const lock = await fs.open(path.join(outputDirectory, photo.id + '-run.lock'), 'wx', 0o600);
  await lock.writeFile(JSON.stringify({photoId: photo.id, canonicalSHA256: sha(bytes)}));
  await lock.close();
  const networkEvidence = [];
  // Intentionally no fetch injection: offline mocks use existing provider contract tests.
  const transport = async (url, options) => {
    const stage = networkEvidence.length === 0 ? 'SCENE' : 'SEGMENTATION';
    if (networkEvidence.length > 1 || url !== (stage === 'SCENE' ? 'https://api.anthropic.com/v1/messages' : config.samURL)) fail('NETWORK_ROUTE_INVALID');
    const entry = {stage, attempts: 1, responseStatus: null, providerRequestId: null};
    networkEvidence.push(entry);
    const response = await fetch(url, {...options, redirect: 'error'});
    entry.responseStatus = response.status;
    const requestId = response.headers.get('request-id') || response.headers.get('x-request-id');
    if (requestId && /^[A-Za-z0-9._-]{1,160}$/.test(requestId) && !requestId.includes(config.key) && !requestId.includes(config.samToken)) entry.providerRequestId = requestId;
    return response;
  };
  const result = await runVision({bytes, mime: 'image/png', sourceId: photo.id,
    consent: {externalTransferApproved: true, costApproved: true}, config, fetchImpl: transport});
  const candidate = {schema: 'vdraw-vision-result/1', executionKind: 'real-providers', ...result};
  const candidateBytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n');
  const record = {schema: 'vdraw-photo-provider-run/1', status: result.record.status,
    inputKind: 'real-photo', executionKind: 'real-providers', photoId: photo.id,
    originalSHA256: sha(original), canonicalSHA256: sha(bytes), candidateSHA256: sha(candidateBytes),
    transport: 'ACTUAL_NETWORK_FETCH', evidenceAuthority: 'LOCAL_RUNNER_RECORDED_NOT_PROVIDER_ATTESTED',
    sceneModel: result.record.model, segmentationModel: result.record.samModel,
    sourceReleaseHEAD: '15bf3371bec3f7d1e4090e7198a850c5636baf3f',
    adapterSHA256: sha(await fs.readFile(new URL('./vision-provider.mjs', import.meta.url))),
    externalTransferApproved: true, costApproved: true, networkEvidence,
    startedAt: result.record.stageLog[0]?.startedAt, endedAt: result.record.stageLog.at(-1)?.endedAt,
    automaticRetry: false, automaticAdoption: false};
  const candidatePath = path.join(outputDirectory, photo.id + '-candidate.json');
  const runPath = path.join(outputDirectory, photo.id + '-provider-run.json');
  await fs.writeFile(candidatePath, candidateBytes, {flag: 'wx', mode: 0o600});
  const runBytes = Buffer.from(JSON.stringify(record, null, 2) + '\n');
  await fs.writeFile(runPath, runBytes, {flag: 'wx', mode: 0o600});
  return {status: 'CANDIDATE_READY', photoId: photo.id, candidateSHA256: sha(candidateBytes),
    providerRunSHA256: sha(runBytes), networkRequests: networkEvidence.length,
    humanReview: 'REQUIRED', productAccuracy: 'NOT_YET_MEASURED'};
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2);
  const value = k => args[args.indexOf(k) + 1];
  try {
    if (!args.includes('--execute-real-ai')) console.log(JSON.stringify(await preflight()));
    else {
      const manifest = JSON.parse(await fs.readFile(value('--manifest'), 'utf8'));
      const photo = manifest.photos.find(p => p.id === value('--photo-id'));
      if (!photo) fail('PHOTO_NOT_FOUND');
      console.log(JSON.stringify(await runPhoto({photo, datasetRoot: value('--dataset-root'), outputDirectory: value('--output-directory')})));
    }
  } catch (e) {
    const code = /^[A-Z0-9_]{1,80}$/.test(e.code || '') ? e.code : 'PROVIDER_PREFLIGHT_FAILED';
    // Never print raw exception/provider stderr, URLs, headers, image or credentials.
    console.log(JSON.stringify({status: 'BLOCKED', reason: code, automaticRetry: false}));
    process.exitCode = 2;
  }
}
