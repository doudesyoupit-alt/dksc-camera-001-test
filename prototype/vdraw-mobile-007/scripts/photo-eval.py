"""Offline Golden evaluation; preparation PASS never means real-photo accuracy PASS."""
import argparse
import hashlib
import importlib.util
import json
import math
import os
import re
from pathlib import Path
from PIL import Image, ImageOps

BASE = '15bf3371bec3f7d1e4090e7198a850c5636baf3f'
METRICS = ['objectRecall', 'objectPrecision', 'iou', 'positionErrorPx', 'angleErrorDeg',
           'contourErrorPx', 'shapeMatchRate', 'ocrAccuracy', 'dimensionErrorMm',
           'unknownAppropriateness', 'criticalMisses', 'criticalMisrecognitions',
           'zeroCorrectionCompletionRate', 'meanCorrectionCount', 'meanCorrectionTimeSeconds',
           'pptxFidelity', 'dxfFidelity', 'roundTripSuccessRate', 'deviceSuccessRates',
           'realPhotoToUsableDrawingSuccessRate', 'cameraQualityAccuracy']
DIFFICULTIES = ['Easy', 'Normal', 'Hard', 'Extreme']
SPLITS = ['development', 'validation', 'blind-holdout']
PROVIDER_VARS = ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL', 'SAM_PROVIDER_URL', 'SAM_PROVIDER_TOKEN']
STAGES = ['Camera Quality', 'Scene', 'Detection', 'Segmentation', 'OCR', 'Geometry',
          'Coordinate', 'Scale', 'Overlay', 'Adopt', 'Save', 'Export']

def require(ok, code):
    if not ok:
        raise ValueError(code)

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def finite(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)

def safe_path(root, name):
    require(isinstance(name, str) and bool(name) and not Path(name).is_absolute(), 'DATASET_PATH_INVALID')
    root = Path(root).resolve()
    result = (root / name).resolve()
    require(result.is_relative_to(root), 'DATASET_PATH_ESCAPE')
    return result

def checked_json(root, name, sha):
    p = safe_path(root, name)
    require(isinstance(sha, str) and len(sha) == 64 and digest(p) == sha, 'EVIDENCE_HASH_MISMATCH')
    return json.loads(p.read_text())

def validate_manifest(m):
    require(m.get('schema') == 'vdraw-photo-golden/1', 'MANIFEST_SCHEMA_INVALID')
    require(m.get('snapshotStatus') in ['DRAFT', 'FROZEN'], 'SNAPSHOT_STATUS_INVALID')
    require(isinstance(m.get('photos'), list) and len(m['photos']) <= 1000, 'PHOTO_LIST_INVALID')
    ids, originals, canonical, groups = set(), set(), set(), {}
    for p in m['photos']:
        require(isinstance(p, dict), 'PHOTO_INVALID')
        ident = p.get('id')
        require(isinstance(ident, str) and re.fullmatch(r'[A-Za-z0-9_-]{1,80}', ident) and ident not in ids, 'PHOTO_ID_INVALID')
        ids.add(ident)
        require(p.get('inputKind') == 'real-photo', 'FIXTURE_IS_NOT_REAL_PHOTO')
        require(p.get('split') in SPLITS and p.get('difficulty') in DIFFICULTIES, 'SPLIT_DIFFICULTY_INVALID')
        require(p.get('captureGroup') and p.get('deviceId'), 'CAPTURE_DEVICE_REQUIRED')
        for k, seen in [('originalSHA256', originals), ('canonicalSHA256', canonical)]:
            v = p.get(k)
            require(isinstance(v, str) and len(v) == 64 and all(c in '0123456789abcdef' for c in v), 'PHOTO_HASH_REQUIRED')
            require(v not in seen, 'DUPLICATE_PHOTO')
            seen.add(v)
        group = p['captureGroup']
        require(group not in groups or groups[group] == p['split'], 'CAPTURE_GROUP_SPLIT_LEAK')
        groups[group] = p['split']
        require(p.get('consent', {}).get('photoUseApproved') is True, 'PHOTO_USE_NOT_APPROVED')
    return m

def normalize_image(original, output):
    # Evaluation preparation only, independent of the unchanged product importer.
    with Image.open(original) as image:
        image.load()
        orientation = int(image.getexif().get(274, 1))
        im = ImageOps.exif_transpose(image).convert('RGB')
        initial_size = im.size
        im.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        require(im.width > 0 and im.height > 0, 'IMAGE_DIMENSIONS_INVALID')
        require(not Path(output).exists(), 'OUTPUT_ALREADY_EXISTS')
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        clean = Image.new('RGB', im.size)
        clean.paste(im)
        clean.save(output, 'PNG')
        return {'originalSHA256': digest(original), 'canonicalSHA256': digest(output),
                'originalEXIFOrientation': orientation, 'orientedSize': list(initial_size),
                'canonicalSize': list(im.size), 'metadataRemoved': True,
                'coordinateSpace': 'canonical-photo-pixels', 'productImporterParity': 'NOT_PROVEN'}

def check_truth(gt, photo, width, height):
    require(gt.get('schema') == 'vdraw-photo-ground-truth/1', 'GROUND_TRUTH_SCHEMA_INVALID')
    require(gt.get('status') == 'HUMAN_CONFIRMED' and bool(gt.get('reviewerId')), 'GROUND_TRUTH_UNCONFIRMED')
    require(gt.get('photoId') == photo['id'] and gt.get('canonicalSHA256') == photo['canonicalSHA256'], 'GROUND_TRUTH_SOURCE_MISMATCH')
    require(gt.get('coordinateSpace') == 'canonical-photo-pixels' and gt.get('width') == width and gt.get('height') == height, 'GROUND_TRUTH_FRAME_MISMATCH')
    require(isinstance(gt.get('objects'), list), 'GROUND_TRUTH_OBJECTS_INVALID')
    require(gt.get('coverageReviewed') is True, 'GROUND_TRUTH_COVERAGE_UNREVIEWED')
    require(gt.get('realPhotoVerified') is True and gt.get('photoOrigin') in ['USER_FIELD_CAPTURE', 'AUTHORIZED_FIELD_CAPTURE'], 'REAL_PHOTO_PROVENANCE_UNVERIFIED')

def check_provider(run, candidate, photo, candidate_sha):
    require(run.get('schema') == 'vdraw-photo-provider-run/1' and run.get('executionKind') == 'real-providers', 'REAL_PROVIDER_EVIDENCE_REQUIRED')
    require(run.get('inputKind') == 'real-photo' and run.get('photoId') == photo['id'], 'PROVIDER_PHOTO_MISMATCH')
    require(run.get('originalSHA256') == photo['originalSHA256'] and run.get('canonicalSHA256') == photo['canonicalSHA256'], 'PROVIDER_SOURCE_HASH_MISMATCH')
    require(run.get('candidateSHA256') == candidate_sha, 'PROVIDER_CANDIDATE_HASH_MISMATCH')
    require(run.get('status') == 'CANDIDATE_READY' and run.get('transport') == 'ACTUAL_NETWORK_FETCH', 'PROVIDER_NOT_EXECUTED')
    require(run.get('externalTransferApproved') is True and run.get('costApproved') is True, 'PROVIDER_CONSENT_MISSING')
    network = run.get('networkEvidence', [])
    require(len(network) == 2 and [n.get('stage') for n in network] == ['SCENE', 'SEGMENTATION'], 'PROVIDER_NETWORK_EVIDENCE_INVALID')
    require(all(n.get('responseStatus') == 200 and n.get('attempts') == 1 for n in network), 'PROVIDER_NETWORK_NOT_SUCCESS')
    require(all(isinstance(run.get(k), str) and run[k] and 'mock' not in run[k].lower() and run[k] != 'not-reported' for k in ['sceneModel', 'segmentationModel']), 'MODEL_ID_UNPROVEN')
    require(candidate.get('schema') == 'vdraw-vision-result/1' and candidate.get('executionKind') == 'real-providers', 'CANDIDATE_EXECUTION_KIND_INVALID')
    require(candidate.get('record', {}).get('status') == 'CANDIDATE_READY', 'CANDIDATE_NOT_READY')
    require(candidate.get('candidate', {}).get('sourceId') == photo['id'], 'CANDIDATE_SOURCE_ID_MISMATCH')
    require(candidate['record'].get('model') == run['sceneModel'] and candidate['record'].get('samModel') == run['segmentationModel'], 'CANDIDATE_MODEL_MISMATCH')

def to_photo(candidate, width, height):
    require(candidate.get('coordinateSpace') == 'drawing-1200x800', 'COORDINATE_SPACE_INVALID')
    require(candidate.get('calibration') == 'UNSCALED', 'UNSUPPORTED_SCALE_CLAIM')
    scale = min(1200 / width, 800 / height)
    ox, oy = (1200 - width * scale) / 2, (800 - height * scale) / 2
    result = []
    for e in candidate.get('elements', []):
        require(all(finite(e.get(k)) for k in ['x', 'y', 'w', 'h']), 'CANDIDATE_GEOMETRY_INVALID')
        q = dict(e)
        q.update(x=(e['x'] - ox) / scale, y=(e['y'] - oy) / scale, w=e['w'] / scale, h=e['h'] / scale)
        q['points'] = [[(x - ox) / scale, (y - oy) / scale] for x, y in e.get('points', [])]
        q['uncertainty'] = 'UNKNOWN' if e.get('category') == '未知対象' else 'HUMAN_CHECK_REQUIRED'
        result.append(q)
    return result

def module_metrics():
    spec = importlib.util.spec_from_file_location('photo_metrics', Path(__file__).with_name('photo-eval-metrics.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def review_evidence(root, photo, run_sha, overlay_sha):
    if not photo.get('humanReviewPath'):
        return None
    r = checked_json(root, photo['humanReviewPath'], photo.get('humanReviewSHA256'))
    require(r.get('schema') == 'vdraw-photo-human-review/1' and r.get('status') == 'HUMAN_CONFIRMED' and r.get('reviewerId'), 'HUMAN_REVIEW_UNCONFIRMED')
    require(r.get('photoId') == photo['id'] and r.get('canonicalSHA256') == photo['canonicalSHA256'] and r.get('providerRunSHA256') == run_sha and r.get('overlaySHA256') == overlay_sha, 'HUMAN_REVIEW_HASH_MISMATCH')
    require(r.get('overlayReviewed') is True, 'OVERLAY_REVIEW_REQUIRED')
    require(type(r.get('correctionCount')) is int and r['correctionCount'] >= 0 and finite(r.get('correctionTimeSeconds')) and r['correctionTimeSeconds'] >= 0, 'CORRECTION_COST_REQUIRED')
    require(isinstance(r.get('corrections'), list) and len(r['corrections']) == r['correctionCount'], 'CORRECTION_LEDGER_INCOMPLETE')
    require(r.get('majorFalsePass') is False, 'MAJOR_FALSE_PASS')
    return r

def evaluate_photo(root, photo, output):
    row = {'photoId': photo['id'], 'split': photo['split'], 'difficulty': photo['difficulty'],
           'deviceId': photo['deviceId'], 'status': 'BLOCKED', 'failureStage': None,
           'declaredPhotoRecordConsistent': False, 'declaredProviderRecordConsistent': False,
           'evidenceAuthority': 'UNVERIFIED_DECLARATIONS_DIAGNOSTIC_ONLY',
           'metrics': {k: None for k in METRICS}, 'releaseBlockers': []}
    stage = 'Camera Quality'
    try:
        original = safe_path(root, photo['originalPath'])
        require(digest(original) == photo['originalSHA256'], 'ORIGINAL_HASH_MISMATCH')
        canonical = safe_path(root, photo['canonicalPath'])
        require(digest(canonical) == photo['canonicalSHA256'], 'CANONICAL_HASH_MISMATCH')
        with Image.open(canonical) as im:
            width, height = im.size
            im.load()
            require(im.format == 'PNG' and not im.getexif() and not im.info and im.mode == 'RGB' and 0 < width <= 1600 and 0 < height <= 1600, 'CANONICAL_IMAGE_INVALID')
        gt = checked_json(root, photo['groundTruthPath'], photo['groundTruthSHA256'])
        check_truth(gt, photo, width, height)
        row['declaredPhotoRecordConsistent'] = True
        quality = gt.get('qualityReview')
        require(isinstance(quality, dict) and type(quality.get('acceptable')) is bool and quality.get('reviewerId'), 'QUALITY_GROUND_TRUTH_REQUIRED')
        # Current product has no quality gate: never upgrade GT quality into a product gate PASS.
        row['cameraQualityGate'] = 'NOT_IMPLEMENTED_IN_PRODUCT'
        row['releaseBlockers'].append('CAMERA_QUALITY_GATE_UNIMPLEMENTED')
        if not quality['acceptable']:
            row['releaseBlockers'].append('RETAKE_REQUIRED')
            row['failureStage'] = 'Camera Quality'
            return row
        stage = 'Scene'
        run = checked_json(root, photo['providerRunPath'], photo['providerRunSHA256'])
        envelope = checked_json(root, photo['candidatePath'], photo['candidateSHA256'])
        check_provider(run, envelope, photo, photo['candidateSHA256'])
        row['declaredProviderRecordConsistent'] = True
        row['providerEvidenceAuthority'] = 'LOCAL_RUNNER_RECORDED_NOT_PROVIDER_ATTESTED'
        row['metrics']['aiProcessingTimeMs'] = envelope['record'].get('totalMs')
        stage = 'Coordinate'
        predicted = to_photo(envelope['candidate'], width, height)
        stage = 'Geometry'
        module = module_metrics()
        measured = module.evaluate_objects(gt['objects'], predicted, width, height)
        row['objectAssessment'] = measured
        require(measured.get('status') != 'NEEDS_REVIEW', 'GEOMETRY_NEEDS_REVIEW')
        row['metrics'].update({k: v for k, v in measured.items() if k in METRICS})
        overlay = output / (photo['id'] + '-overlay.png')
        module.draw_overlay(canonical, gt['objects'], predicted, overlay)
        row['overlay'] = {'filename': overlay.name, 'sha256': digest(overlay), 'sourceSHA256': photo['canonicalSHA256']}
        stage = 'Adopt'
        review = review_evidence(root, photo, photo['providerRunSHA256'], row['overlay']['sha256'])
        if review is None:
            row['releaseBlockers'].append('HUMAN_OVERLAY_REVIEW_REQUIRED')
            row['status'] = 'MEASURED_PENDING_HUMAN_REVIEW'
        else:
            row['humanReview'] = review
            row['metrics']['meanCorrectionCount'] = review['correctionCount']
            row['metrics']['meanCorrectionTimeSeconds'] = review['correctionTimeSeconds']
            row['status'] = 'MEASURED_HUMAN_REVIEWED'
        for key in ['criticalMisses', 'criticalMisrecognitions']:
            if measured.get(key):
                row['releaseBlockers'].append(key.upper())
        row['releaseBlockers'].extend(['REAL_UI_AI_CONNECTION_UNPROVEN', 'PRODUCT_SCALE_PERSPECTIVE_VALIDATION_UNPROVEN', 'EDITABLE_EXPORT_AND_ROUNDTRIP_REVIEW_REQUIRED'])
        row['usableDrawingSuccess'] = None
    except (ValueError, KeyError, OSError, TypeError, AttributeError, json.JSONDecodeError) as e:
        row['failureStage'] = stage
        code = str(e) if isinstance(e, ValueError) and str(e).replace('_', '').isalnum() else 'EVIDENCE_MISSING_OR_INVALID'
        row['releaseBlockers'].append(code)
    return row

def pinned_holdout_denominator(manifest):
    registry_path = Path(__file__).parent.parent / 'docs/photo-accuracy/internet-source-registry.json'
    if not registry_path.exists():
        return 0
    registry = json.loads(registry_path.read_text())
    if manifest.get('datasetId') != registry.get('datasetId'):
        return 0
    # Retain every pinned holdout, even if omitted, missing, rejected or UNKNOWN.
    return sum(p['split'] == 'blind-holdout' for p in registry['photos'])

def verified_internet_inventory(manifest, root):
    # Integration-reviewed public source inventory, pinned in repository. This
    # attests acquisition bytes only; never a human GT or real-provider response.
    registry_path = Path(__file__).parent.parent / 'docs/photo-accuracy/internet-source-registry.json'
    if not registry_path.exists():
        return []
    registry = json.loads(registry_path.read_text())
    if manifest.get('datasetId') != registry.get('datasetId'):
        return []
    pinned = {p['id']: p for p in registry['photos']}
    verified = []
    for p in manifest['photos']:
        expected = pinned.get(p['id'])
        if not expected:
            continue
        fields = ['sourceURL', 'sourceRevisionURL', 'license', 'licenseURL', 'author',
                  'originalSHA256', 'canonicalSHA256', 'category', 'split', 'difficulty', 'captureGroup']
        if not all(p.get(k) == expected.get(k) for k in fields):
            continue
        try:
            original = safe_path(root, p['originalPath'])
            canonical = safe_path(root, p['canonicalPath'])
            if digest(original) != expected['originalSHA256'] or digest(canonical) != expected['canonicalSHA256']:
                continue
            if hashlib.sha1(original.read_bytes()).hexdigest() != expected['sourceSHA1']:
                continue
            with Image.open(canonical) as image:
                if image.format != 'PNG' or list(image.size) != expected['canonicalSize']:
                    continue
            verified.append(p)
        except (OSError, ValueError, KeyError):
            continue
    return verified

def report(manifest, root, output, execute_evaluation=False):
    validate_manifest(manifest)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    photos = manifest['photos']
    counts = {d: sum(p['difficulty'] == d for p in photos) for d in DIFFICULTIES}
    acquired = verified_internet_inventory(manifest, root)
    blockers = ['TRUSTED_GT_PROVIDER_AUTHORITY_UNIMPLEMENTED']
    if not photos:
        blockers += ['REAL_PHOTOS_MISSING', 'HUMAN_GROUND_TRUTH_MISSING', 'BLIND_HOLDOUT_MISSING']
    if manifest['snapshotStatus'] != 'FROZEN':
        blockers.append('GOLDEN_SNAPSHOT_NOT_FROZEN')
    if not any(p['split'] == 'blind-holdout' for p in photos):
        blockers.append('BLIND_HOLDOUT_MISSING')
    present = {name: bool(os.environ.get(name)) for name in PROVIDER_VARS}
    if not all(present.values()):
        blockers.append('REAL_PROVIDER_CONFIG_UNAVAILABLE_IN_THIS_ENVIRONMENT')
    rows = [evaluate_photo(root, p, output) for p in photos] if execute_evaluation else []
    metrics = {k: None for k in METRICS}
    # Hashes bind bytes, not provenance. Local claims cannot attest a photograph,
    # a human reviewer or a network inference. Formal authority is a separate gate.
    # This preparation release deliberately exposes per-photo diagnostics only.
    # No partial holdout average is promoted to a formal metric.
    claimed = [r for r in rows if r['declaredProviderRecordConsistent']]
    holdout_count = sum(p['split'] == 'blind-holdout' for p in photos)
    if sum(r['split'] == 'blind-holdout' for r in claimed) != holdout_count:
        blockers.append('HOLDOUT_NOT_FULLY_MEASURED')
    r = {'schema': 'vdraw-photo-accuracy-report/1', 'status': 'BLOCKED',
         'productReleaseAllowed': False, 'productCompletionPercent': None,
         'targetPracticalAccuracyPercent': 100, 'majorFalsePassTarget': 0,
         'registeredPhotoCount': len(photos), 'realPhotoTotal': len(acquired), 'realAIPhotoCount': 0,
         'claimedPhotoRecords': sum(row['declaredPhotoRecordConsistent'] for row in rows),
         'claimedProviderRecords': len(claimed), 'formalEvidenceAuthority': 'NOT_IMPLEMENTED',
         'difficultyCounts': {d: sum(p['difficulty'] == d for p in acquired) for d in DIFFICULTIES}, 'registeredDifficultyCounts': counts,
         'splitCounts': {s: sum(p['split'] == s for p in acquired) for s in SPLITS}, 'registeredSplitCounts': {s: sum(p['split'] == s for p in photos) for s in SPLITS},
         'formalAccuracyBasis': 'FROZEN_BLIND_HOLDOUT_WITH_INDEPENDENT_PROVENANCE_AUTHORITY',
         'formalMeasuredPhotos': 0, 'formalDenominatorPhotos': pinned_holdout_denominator(manifest), 'acquiredHoldoutCoverage': sum(p['split'] == 'blind-holdout' for p in acquired), 'registeredHoldoutDenominator': holdout_count,
         'denominatorRule': 'All real holdout photos, including blocked/UNKNOWN/rejected, remain in the success denominator; missing metrics stay null.',
         'formalMetrics': metrics, 'measurementCoverageByMetric': {k: 0 for k in METRICS},
         'diagnosticCoverageByMetric': {k: sum(finite(row['metrics'].get(k)) for row in rows) for k in METRICS},
         'realProviderConfigPresence': present, 'actualNetworkRequestsThisCommand': 0,
         'sourceReleaseHEAD': BASE, 'benchmarkImplementationHEAD': os.environ.get('GITHUB_SHA', 'WORKING_TREE_UNCOMMITTED'),
         'save001DeviceAcceptance': 'CLOSED', 'rows': rows,
         'currentPhotoPhaseDefects': {'P0': 0, 'P1': 0, 'openIssues': []},
         'releaseBlockers': sorted(set(blockers + [c for row in rows for c in row['releaseBlockers']])),
         'regressionEvidence': {'fullRegression': 'BASELINE_53_PASS', 'fail': 0, 'blocked': 0, 'skip': 0,
                                'accuracyEvidence': False, 'sourceReleaseHEAD': BASE, 'P0': 0, 'P1': 0,
                                'scope': 'Accepted 0.8.2 software gates; real-photo product readiness is BLOCKED.'}}
    (output / 'accuracy-report.json').write_text(json.dumps(r, ensure_ascii=False, indent=2) + '\n')
    labels = [('実写真総数', r['realPhotoTotal']), ('実AI使用枚数', r['realAIPhotoCount']),
              ('難易度別枚数', r['difficultyCounts'])] + [(key, value) for key, value in metrics.items()]
    text = '| 実写真精度KPI | 今回の測定 |\n|---|---|\n'
    text += ''.join('| ' + name + ' | ' + ('未測定' if value is None else json.dumps(value, ensure_ascii=False)) + ' |\n' for name, value in labels)
    text += '\n実写真第一次試験: BLOCKED。製品完成率は算出しません。\n\n'
    text += '自動回帰: 基準0.8.2で53 PASS / FAIL 0 / BLOCKED 0 / skip 0。写真精度の合格証拠ではありません。\n'
    text += 'P0/P1: 0.8.2既存受入範囲は0/0。PHOTO-PPTX-001修正済み。006保護はCIの変更範囲guardで別途確認。\n'
    text += '\nRelease停止理由: ' + ', '.join(r['releaseBlockers']) + '\n'
    (output / 'accuracy-summary.md').write_text(text)
    return r

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['preflight', 'evaluate', 'normalize'])
    parser.add_argument('--manifest', type=Path)
    parser.add_argument('--dataset-root', type=Path, default=Path('.'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--image', type=Path)
    args = parser.parse_args()
    try:
        if args.mode == 'normalize':
            r = normalize_image(args.image, args.output)
        else:
            r = report(json.loads(args.manifest.read_text()), args.dataset_root, args.output, args.mode == 'evaluate')
        print(json.dumps(r, ensure_ascii=False))
    except Exception:
        # Paths, provider configuration and raw exception strings never enter public logs.
        print(json.dumps({'status': 'BLOCKED', 'reason': 'EVALUATION_INPUT_INVALID', 'productReleaseAllowed': False}))
        raise SystemExit(2)

if __name__ == '__main__':
    main()
