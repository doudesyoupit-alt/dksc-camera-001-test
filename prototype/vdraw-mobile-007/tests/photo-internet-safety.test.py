"""Real-byte inventory anti-false-PASS probes, never recognition accuracy."""
import copy, importlib.util, json, os, tempfile, unittest
from pathlib import Path
R=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('ev',R/'scripts/photo-eval.py');ev=importlib.util.module_from_spec(s);s.loader.exec_module(ev)
DATA=Path(os.environ.get('VDRAW_PUBLIC_DATASET_ROOT',R/'evidence/photo-pilot'))
class InventorySafety(unittest.TestCase):
    def setUp(self):self.m=json.loads((R/'docs/photo-accuracy/golden-manifest.json').read_text())
    def result(self,m=None):
        with tempfile.TemporaryDirectory() as d:return ev.report(m or self.m,DATA,Path(d))
    def test_ten_actual_pinned_photos_do_not_prove_ai_or_accuracy(self):
        r=self.result();self.assertEqual(r['realPhotoTotal'],10);self.assertEqual(r['realAIPhotoCount'],0);self.assertEqual(r['formalDenominatorPhotos'],2)
        self.assertTrue(all(x is None for x in r['formalMetrics'].values()));self.assertFalse(r['productReleaseAllowed'])
    def test_unknown_license_claim_is_not_counted(self):
        self.m['photos'][0]['license']='UNKNOWN';self.assertEqual(self.result()['realPhotoTotal'],9)
    def test_foreign_source_url_is_not_counted(self):
        self.m['photos'][0]['sourceURL']='https://invalid.example/forged';self.assertEqual(self.result()['realPhotoTotal'],9)
    def test_forged_hash_cannot_count_a_photo(self):
        self.m['photos'][0]['canonicalSHA256']='a'*64;self.assertEqual(self.result()['realPhotoTotal'],9)
    def test_missing_holdout_asset_keeps_pinned_denominator(self):
        self.m['photos'][-1]['canonicalPath']='missing.png';r=self.result();self.assertEqual(r['realPhotoTotal'],9);self.assertEqual(r['formalDenominatorPhotos'],2);self.assertEqual(r['acquiredHoldoutCoverage'],1)
    def test_omitting_holdout_does_not_raise_success_rate(self):
        self.m['photos'].pop();r=self.result();self.assertEqual(r['formalDenominatorPhotos'],2);self.assertEqual(r['acquiredHoldoutCoverage'],1);self.assertIsNone(r['formalMetrics']['realPhotoToUsableDrawingSuccessRate'])
    def test_reassigning_split_or_difficulty_cannot_inflate_inventory(self):
        self.m['photos'][0]['difficulty']='Easy';self.assertEqual(self.result()['realPhotoTotal'],9)
if __name__=='__main__':unittest.main()
