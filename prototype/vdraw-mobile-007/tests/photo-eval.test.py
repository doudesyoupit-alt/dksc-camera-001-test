"""Synthetic evaluator safety probes; never counted as real-photo accuracy."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('eval_module', ROOT / 'scripts/photo-eval.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def photo(ident='P01', h='a', group='field1', split='blind-holdout'):
    return {'id': ident, 'inputKind': 'real-photo', 'split': split, 'difficulty': 'Hard',
            'captureGroup': group, 'deviceId': 'D01', 'originalSHA256': h * 64,
            'canonicalSHA256': str(ord(h) % 10) * 64, 'consent': {'photoUseApproved': True}}

def manifest(photos=None):
    return {'schema': 'vdraw-photo-golden/1', 'snapshotStatus': 'DRAFT', 'photos': photos or []}

class EvaluatorSafety(unittest.TestCase):
    def test_zero_photos_never_accuracy_pass(self):
        with tempfile.TemporaryDirectory() as d, patch.dict(os.environ, {}, clear=True):
            r = m.report(manifest(), d, Path(d) / 'out')
            self.assertEqual(r['status'], 'BLOCKED')
            self.assertFalse(r['productReleaseAllowed'])
            self.assertIsNone(r['productCompletionPercent'])
            self.assertTrue(all(v is None for v in r['formalMetrics'].values()))
            self.assertEqual((r['realPhotoTotal'], r['realAIPhotoCount']), (0, 0))
            self.assertEqual(r['actualNetworkRequestsThisCommand'], 0)
            self.assertFalse(r['regressionEvidence']['accuracyEvidence'])
            self.assertNotIn('SAVE001_DEVICE_ACCEPTANCE_PENDING', r['releaseBlockers'])
            self.assertEqual(r['save001DeviceAcceptance'], 'CLOSED')

    def test_fixture_rejected(self):
        p = photo(); p['inputKind'] = 'synthetic-fixture'
        with self.assertRaisesRegex(ValueError, 'FIXTURE_IS_NOT_REAL_PHOTO'):
            m.validate_manifest(manifest([p]))

    def test_duplicate_original_rejected(self):
        with self.assertRaisesRegex(ValueError, 'DUPLICATE_PHOTO'):
            m.validate_manifest(manifest([photo(), photo('P02', group='field2')]))

    def test_duplicate_canonical_reencoding_rejected(self):
        a, b = photo(), photo('P02', h='b', group='field2')
        b['canonicalSHA256'] = a['canonicalSHA256']
        with self.assertRaisesRegex(ValueError, 'DUPLICATE_PHOTO'):
            m.validate_manifest(manifest([a, b]))

    def test_same_capture_group_cannot_leak(self):
        with self.assertRaisesRegex(ValueError, 'CAPTURE_GROUP_SPLIT_LEAK'):
            m.validate_manifest(manifest([photo(split='development'), photo('P02', h='b')]))

    def test_difficulty_required(self):
        p = photo(); p.pop('difficulty')
        with self.assertRaisesRegex(ValueError, 'SPLIT_DIFFICULTY_INVALID'):
            m.validate_manifest(manifest([p]))

    def test_path_escape_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            for p in ['../secret', '/tmp/secret']:
                with self.assertRaises(ValueError): m.safe_path(d, p)

    def test_symlink_escape_rejected(self):
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as outside:
            (Path(d) / 'link').symlink_to(outside)
            with self.assertRaisesRegex(ValueError, 'DATASET_PATH_ESCAPE'):
                m.safe_path(d, 'link/file')

    def test_photo_id_cannot_escape_overlay_directory(self):
        p = photo('../leak')
        with self.assertRaisesRegex(ValueError, 'PHOTO_ID_INVALID'):
            m.validate_manifest(manifest([p]))

    def test_approval_is_not_truthy_string(self):
        p = photo(); p['consent']['photoUseApproved'] = 'true'
        with self.assertRaisesRegex(ValueError, 'PHOTO_USE_NOT_APPROVED'):
            m.validate_manifest(manifest([p]))

    def test_missing_file_not_counted_as_real_photo(self):
        p = photo(); p['originalPath'] = 'not-here.jpg'
        with tempfile.TemporaryDirectory() as d:
            r = m.report(manifest([p]), d, Path(d) / 'out', True)
            self.assertEqual(r['registeredPhotoCount'], 1)
            self.assertEqual(r['realPhotoTotal'], 0)
            self.assertEqual(r['realAIPhotoCount'], 0)
            self.assertEqual(r['registeredHoldoutDenominator'], 1)
            self.assertEqual(r['formalDenominatorPhotos'], 0)
            self.assertIsNone(r['formalMetrics']['realPhotoToUsableDrawingSuccessRate'])

    def test_hash_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / 'a.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'EVIDENCE_HASH_MISMATCH'):
                m.checked_json(d, 'a.json', '0' * 64)

    def test_exif_rotation_and_metadata_removal(self):
        with tempfile.TemporaryDirectory() as d:
            a, b = Path(d) / 'a.jpg', Path(d) / 'b.png'
            im = Image.new('RGB', (40, 20), 'red')
            exif = Image.Exif(); exif[274] = 6; exif[270] = 'PRIVATE_METADATA'
            im.save(a, exif=exif)
            r = m.normalize_image(a, b)
            self.assertEqual(r['canonicalSize'], [20, 40])
            with Image.open(b) as clean:
                self.assertFalse(clean.getexif()); self.assertFalse(clean.info)
            self.assertEqual(r['originalSHA256'], m.digest(a))

    def test_original_not_overwritten(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'a.png'; Image.new('RGB', (20, 20)).save(p)
            old = m.digest(p)
            with self.assertRaisesRegex(ValueError, 'OUTPUT_ALREADY_EXISTS'): m.normalize_image(p, p)
            self.assertEqual(old, m.digest(p))

    def test_portrait_letterbox_inverse(self):
        c = {'coordinateSpace': 'drawing-1200x800', 'calibration': 'UNSCALED',
             'elements': [{'id': 'o', 'category': '設備', 'x': 440, 'y': 40, 'w': 80, 'h': 160, 'points': []}]}
        p = m.to_photo(c, 1000, 2000)[0]
        self.assertEqual((p['x'], p['y'], p['w'], p['h']), (100, 100, 200, 400))
        self.assertEqual(p['uncertainty'], 'HUMAN_CHECK_REQUIRED')

    def test_unsupported_scale_is_not_trusted(self):
        with self.assertRaisesRegex(ValueError, 'UNSUPPORTED_SCALE_CLAIM'):
            m.to_photo({'coordinateSpace': 'drawing-1200x800', 'calibration': 'CALIBRATED', 'elements': []}, 100, 100)

    def test_mock_provider_cannot_become_real(self):
        r = {'schema': 'vdraw-photo-provider-run/1', 'executionKind': 'protocol-fixture'}
        with self.assertRaisesRegex(ValueError, 'REAL_PROVIDER_EVIDENCE_REQUIRED'):
            m.check_provider(r, {}, photo(), 'a' * 64)

    def test_unverified_photo_gt_rejected(self):
        p = photo()
        gt = {'schema': 'vdraw-photo-ground-truth/1', 'status': 'HUMAN_CONFIRMED',
              'reviewerId': 'R01', 'photoId': p['id'], 'canonicalSHA256': p['canonicalSHA256'],
              'coordinateSpace': 'canonical-photo-pixels', 'width': 100, 'height': 100,
              'objects': [], 'coverageReviewed': True}
        with self.assertRaisesRegex(ValueError, 'REAL_PHOTO_PROVENANCE_UNVERIFIED'):
            m.check_truth(gt, p, 100, 100)

    def test_self_declared_ten_records_never_formal_accuracy(self):
        photos = [photo('P%02d' % i, h=hex(i)[2:], group='group%02d' % i) for i in range(10)]
        declared = {'split': 'blind-holdout', 'declaredPhotoRecordConsistent': True,
                    'declaredProviderRecordConsistent': True, 'metrics': {k: 1 for k in m.METRICS}, 'releaseBlockers': []}
        with tempfile.TemporaryDirectory() as d, patch.object(m, 'evaluate_photo', return_value=declared):
            dataset = manifest(photos); dataset['snapshotStatus'] = 'FROZEN'
            r = m.report(dataset, d, Path(d) / 'out', True)
            self.assertEqual((r['claimedPhotoRecords'], r['claimedProviderRecords']), (10, 10))
            self.assertEqual((r['realPhotoTotal'], r['realAIPhotoCount']), (0, 0))
            self.assertTrue(all(v is None for v in r['formalMetrics'].values()))
            self.assertFalse(r['productReleaseAllowed'])

    def test_partial_holdout_has_no_formal_average(self):
        photos = [photo('P%02d' % i, h=hex(i)[2:], group='group%02d' % i) for i in range(8)]
        good = {'split': 'blind-holdout', 'declaredPhotoRecordConsistent': True,
                'declaredProviderRecordConsistent': True, 'metrics': {k: 1 for k in m.METRICS}, 'releaseBlockers': []}
        bad = dict(good, declaredProviderRecordConsistent=False, metrics={k: None for k in m.METRICS})
        with tempfile.TemporaryDirectory() as d, patch.object(m, 'evaluate_photo', side_effect=[good] * 7 + [bad]):
            dataset = manifest(photos); dataset['snapshotStatus'] = 'FROZEN'
            r = m.report(dataset, d, Path(d) / 'out', True)
            self.assertEqual(r['registeredHoldoutDenominator'], 8)
            self.assertEqual(r['diagnosticCoverageByMetric']['objectRecall'], 7)
            self.assertIsNone(r['formalMetrics']['objectRecall'])
            self.assertIn('HOLDOUT_NOT_FULLY_MEASURED', r['releaseBlockers'])

    def test_canonical_metadata_never_accepted(self):
        from PIL.PngImagePlugin import PngInfo
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); p = photo()
            Image.new('RGB', (20, 20), 'white').save(root / 'original.png')
            info = PngInfo(); info.add_text('location', 'SYNTHETIC_METADATA')
            Image.new('RGB', (20, 20), 'white').save(root / 'canonical.png', pnginfo=info)
            p.update(originalPath='original.png', canonicalPath='canonical.png',
                     originalSHA256=m.digest(root / 'original.png'), canonicalSHA256=m.digest(root / 'canonical.png'))
            r = m.evaluate_photo(root, p, root / 'out')
            self.assertIn('CANONICAL_IMAGE_INVALID', r['releaseBlockers'])
            self.assertFalse(r['declaredProviderRecordConsistent'])

if __name__ == '__main__': unittest.main()
