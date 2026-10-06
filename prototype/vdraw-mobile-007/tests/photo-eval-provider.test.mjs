// These tests never execute a provider; they are safety/contract regression only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {preflight, datasetPath, runPhoto, validateCanonicalPNG} from '../server/photo-eval-provider.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
const fixture = JSON.parse(await fs.readFile(new URL('./photo-eval-png-fixture.json', import.meta.url), 'utf8'));
test('missing config is safe and makes no inference claim', async () => {
  const r = await preflight({});
  assert.equal(r.status, 'BLOCKED'); assert.equal(r.realInferenceCount, 0); assert.equal(r.networkRequests, 0);
  assert.equal(r.missing.length, 4);
});
test('configured is not connected, values never returned', async () => {
  const r = await preflight({ANTHROPIC_API_KEY: 'LOCAL_TEST_VALUE', CLAUDE_MODEL: 'example',
    SAM_PROVIDER_URL: 'https://example.test/sam', SAM_PROVIDER_TOKEN: 'LOCAL_TEST_TOKEN'});
  assert.equal(r.status, 'CONFIGURED_NOT_CONNECTED');
  assert.ok(!JSON.stringify(r).includes('LOCAL_TEST_VALUE'));
  assert.ok(!JSON.stringify(r).includes('LOCAL_TEST_TOKEN'));
  assert.ok(!JSON.stringify(r).includes('example.test'));
});
test('path escape rejected', () => {
  assert.throws(() => datasetPath('/private/golden', '../secret'), /DATASET_PATH_ESCAPE/);
  assert.throws(() => datasetPath('/private/golden', '/secret'), /DATASET_PATH_INVALID/);
});
test('unapproved image cannot reach network', async () => {
  await assert.rejects(runPhoto({photo: {id: 'P01', inputKind: 'real-photo', consent: {}},
    datasetRoot: '/no-dataset', outputDirectory: '/no-output',
    env: {ANTHROPIC_API_KEY: 'LOCAL_TEST_VALUE', CLAUDE_MODEL: 'example', SAM_PROVIDER_URL: 'https://example.test/sam', SAM_PROVIDER_TOKEN: 'LOCAL_TEST_TOKEN'}}), /PHOTO_CONSENT_REQUIRED/);
});
test('fixture cannot run as real photo', async () => {
  await assert.rejects(runPhoto({photo: {id: 'P01', inputKind: 'synthetic-fixture'},
    env: {ANTHROPIC_API_KEY: 'LOCAL_TEST_VALUE', CLAUDE_MODEL: 'example', SAM_PROVIDER_URL: 'https://example.test/sam', SAM_PROVIDER_TOKEN: 'LOCAL_TEST_TOKEN'}}), /PHOTO_INVALID/);
});
test('canonical PNG is decoded and has no metadata', () => {
  assert.deepEqual(validateCanonicalPNG(Buffer.from(fixture.cleanPNG, 'base64')), {width: 20, height: 10, metadataRemoved: true});
});
test('PNG text metadata blocked before network', () => {
  assert.throws(() => validateCanonicalPNG(Buffer.from(fixture.metadataPNG, 'base64')), /CANONICAL_METADATA_FORBIDDEN/);
});
test('truncated PNG header cannot bypass decoder', () => {
  assert.throws(() => validateCanonicalPNG(Buffer.from(fixture.cleanPNG, 'base64').subarray(0, 24)), /CANONICAL_IMAGE_INVALID/);
});
test('tampered pixel stream CRC rejected', () => {
  const bytes = Buffer.from(fixture.cleanPNG, 'base64'); bytes[bytes.length - 15] ^= 1;
  assert.throws(() => validateCanonicalPNG(bytes), /CANONICAL_IMAGE_INVALID/);
});
test('metadata PNG cannot reach actual transport even with forged approvals', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vdraw-photo-probe-'));
  const clean = Buffer.from(fixture.cleanPNG, 'base64'), metadata = Buffer.from(fixture.metadataPNG, 'base64');
  await fs.writeFile(path.join(dir, 'original.png'), clean); await fs.writeFile(path.join(dir, 'canonical.png'), metadata);
  const sha = b => crypto.createHash('sha256').update(b).digest('hex');
  let requests = 0; const previous = globalThis.fetch;
  globalThis.fetch = async () => {requests++; throw Error('OFFLINE_TEST_TRAP');};
  try {
    await assert.rejects(runPhoto({photo: {id: 'P01', inputKind: 'real-photo', originalPath: 'original.png', canonicalPath: 'canonical.png',
      originalSHA256: sha(clean), canonicalSHA256: sha(metadata), manualQualityApproved: true,
      consent: {photoUseApproved: true, externalTransferApproved: true, costApproved: true}},
      datasetRoot: dir, outputDirectory: path.join(dir, 'out'), env: {ANTHROPIC_API_KEY: 'LOCAL_TEST_VALUE', CLAUDE_MODEL: 'example',
      SAM_PROVIDER_URL: 'https://example.test/sam', SAM_PROVIDER_TOKEN: 'LOCAL_TEST_TOKEN'}}), /CANONICAL_METADATA_FORBIDDEN/);
    assert.equal(requests, 0);
  } finally {globalThis.fetch = previous;}
});
test('existing run lock prevents repeat billable calls', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vdraw-photo-lock-probe-'));
  const clean = Buffer.from(fixture.cleanPNG, 'base64'), hash = crypto.createHash('sha256').update(clean).digest('hex');
  await fs.writeFile(path.join(dir, 'original.png'), clean); await fs.writeFile(path.join(dir, 'canonical.png'), clean);
  await fs.mkdir(path.join(dir, 'out')); await fs.writeFile(path.join(dir, 'out', 'P01-run.lock'), '{}');
  let requests = 0; const previous = globalThis.fetch; globalThis.fetch = async () => {requests++; throw Error('OFFLINE_TEST_TRAP');};
  try {
    await assert.rejects(runPhoto({photo: {id: 'P01', inputKind: 'real-photo', originalPath: 'original.png', canonicalPath: 'canonical.png',
      originalSHA256: hash, canonicalSHA256: hash, manualQualityApproved: true, consent: {photoUseApproved: true, externalTransferApproved: true, costApproved: true}},
      datasetRoot: dir, outputDirectory: path.join(dir, 'out'), env: {ANTHROPIC_API_KEY: 'LOCAL_TEST_VALUE', CLAUDE_MODEL: 'example',
      SAM_PROVIDER_URL: 'https://example.test/sam', SAM_PROVIDER_TOKEN: 'LOCAL_TEST_TOKEN'}}), /EEXIST/);
    assert.equal(requests, 0);
  } finally {globalThis.fetch = previous;}
});
