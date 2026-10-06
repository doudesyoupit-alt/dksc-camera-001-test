"""SYNTHETIC REGRESSION ONLY. Never counted as real-photo / real-AI accuracy."""
import importlib.util
import math
import itertools
import random
from pathlib import Path
import tempfile
import unittest
from PIL import Image, PngImagePlugin

spec = importlib.util.spec_from_file_location('photo_eval_metrics', Path(__file__).resolve().parents[1]/'scripts/photo-eval-metrics.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

def obj(identifier='a', **patch):
    return {'id': identifier, 'category': '設備', 'kind': 'rect', 'x': 10, 'y': 10, 'w': 30, 'h': 20, **patch}

class MetricsSyntheticTests(unittest.TestCase):
    def test_identical_native_shapes(self):
        for kind, extra in [('rect', {}), ('ellipse', {}), ('polygon', {'points': [[10,10],[40,10],[25,30]]}), ('line', {'h': 0}), ('text', {'text':'日本語'})]:
            with self.subTest(kind=kind):
                result = m.evaluate_objects([obj(kind=kind, **extra)], [obj('b', kind=kind, **extra)], 80, 80)
                self.assertEqual(result['objectRecall'], 1); self.assertEqual(result['iou'], 1)
                self.assertEqual(result['positionErrorPx'], 0); self.assertEqual(result['contourErrorPx'], 0)
                self.assertTrue(result['humanReviewRequired'])

    def test_polygon_iou_is_not_bbox_proxy(self):
        a = obj(kind='polygon', points=[[10,10],[40,10],[10,30]])
        b = obj('b', kind='polygon', points=[[40,10],[40,30],[10,30]])
        result = m.evaluate_objects([a], [b], 80, 80)
        self.assertEqual(result['objectRecall'], 0) # only diagonal edge overlap, bbox identical
        self.assertTrue(result['measurementMethod']['nativePixelMaskIoU'])
        self.assertFalse(result['measurementMethod']['bboxProxy'])

    def test_correspondence_maximum_cardinality_before_iou(self):
        pairs = m._assignment([[.95, .20], [.20, 0]])
        self.assertEqual(set(pairs), {(0,1),(1,0)})
        self.assertEqual(m._assignment([[.05]]), [])

    def test_assignment_matches_independent_bruteforce(self):
        random_source=random.Random(100)
        for _ in range(100):
            scores=[[random_source.choice([0,.05,.2,.5,.95]) for _ in range(3)] for _ in range(3)]
            options=[]
            for chosen in itertools.product(range(-1,3),repeat=3):
                assigned=[j for j in chosen if j>=0]
                if len(set(assigned)) != len(assigned): continue
                if any(scores[i][j]<m.MATCH_IOU for i,j in enumerate(chosen) if j>=0): continue
                options.append((len(assigned),sum(scores[i][j] for i,j in enumerate(chosen) if j>=0)))
            expected=max(options); pairs=m._assignment(scores)
            self.assertEqual(len(pairs),expected[0]); self.assertAlmostEqual(sum(scores[i][j] for i,j in pairs),expected[1])

    def test_no_prediction_reuse_and_category_separation(self):
        result = m.evaluate_objects([obj(), obj('duplicate')], [obj('b',category='ボックス')], 80, 80)
        self.assertEqual(result['objectRecall'], .5); self.assertEqual(result['objectPrecision'], 1)
        self.assertEqual(result['missedObjects'], 1); self.assertEqual(result['misclassifiedObjects'], 1)

    def test_kind_difference_is_separate_shape_failure(self):
        result = m.evaluate_objects([obj()], [obj('b',kind='polygon',points=[[10,10],[40,10],[40,30],[10,30]])], 80, 80)
        self.assertEqual(result['iou'], 1); self.assertEqual(result['geometryKindMismatches'], 1)
        self.assertEqual(result['shapeMatchRate'], 0); self.assertEqual(result['misclassifiedObjects'], 0)

    def test_empty_sets_never_report_perfect(self):
        for truth, pred in [([],[]),([], [obj()]),([obj()],[])]:
            result = m.evaluate_objects(truth,pred,80,80)
            self.assertNotEqual(result['objectRecall'], 1); self.assertNotEqual(result['objectPrecision'], 1)
            self.assertIsNone(result['iou']); self.assertIsNone(result['angleErrorDeg'])

    def test_unmeasured_angle_and_ocr_remain_null(self):
        result = m.evaluate_objects([obj()], [obj('b',angleDeg=15,text='余分')],80,80)
        self.assertIsNone(result['angleErrorDeg']); self.assertIsNone(result['ocrCER'])
        result = m.evaluate_objects([obj(angleDeg=0)], [obj('b')],80,80)
        self.assertIsNone(result['angleErrorDeg'])

    def test_angle_uses_180_degree_direction_period(self):
        truth = obj(kind='line',h=0,angleDeg=175)
        result = m.evaluate_objects([truth],[obj('b',kind='line',h=0,angleDeg=5)],80,80)
        self.assertEqual(result['angleErrorDeg'],10)

    def test_ocr_japanese_unicode_and_missed_deletion(self):
        result = m.evaluate_objects([obj(kind='text',text='分電盤')],[obj('b',kind='text',text='分電板')],80,80)
        self.assertAlmostEqual(result['ocrCER'],1/3)
        self.assertAlmostEqual(result['ocrAccuracy'],2/3)
        result = m.evaluate_objects([obj(kind='text',text='ガ')],[obj('b',kind='text',text='カ\u3099')],80,80)
        self.assertEqual(result['ocrCER'],0)
        result = m.evaluate_objects([obj(kind='text',text='配管')],[],80,80)
        self.assertEqual(result['ocrCER'],1)

    def test_ocr_cer_can_exceed_one_not_disguised(self):
        result = m.evaluate_objects([obj(kind='text',text='箱')],[obj('b',kind='text',text='電線配管')],80,80)
        self.assertGreater(result['ocrCER'],1); self.assertEqual(result['ocrAccuracy'],0)

    def test_unknown_requires_annotation_and_rejects_abuse(self):
        prediction = obj('b',uncertainty='UNKNOWN')
        self.assertIsNone(m.evaluate_objects([obj()],[prediction],80,80)['unknownAppropriatenessRate'])
        self.assertEqual(m.evaluate_objects([obj(uncertainty='KNOWN')],[prediction],80,80)['unknownAppropriatenessRate'],0)
        self.assertEqual(m.evaluate_objects([obj(uncertainty='UNKNOWN')],[prediction],80,80)['unknownAppropriatenessRate'],1)
        self.assertIsNone(m.evaluate_objects([obj()],[obj('b')],80,80)['unknownRate'])

    def test_critical_failures_are_not_averaged_away(self):
        result = m.evaluate_objects([obj(critical=True)],[],80,80)
        self.assertEqual(result['criticalMissedObjects'],1)
        result = m.evaluate_objects([obj(critical=True)],[obj('b',category='誤分類')],80,80)
        self.assertEqual(result['criticalMisclassifiedObjects'],1)

    def test_invalid_truth_and_prediction_fail_closed(self):
        bad = [{'x':math.nan},{'w':-2},{'x':79},{'kind':'unsupported'},{'angleDeg':math.inf},{'uncertainty':'CONFIRMED'},{'critical':'yes'},{'kind':[]},{'uncertainty':[]}]
        for patch in bad:
            for side in ('truth','prediction'):
                with self.subTest(patch=patch,side=side):
                    truth, pred = [obj()], [obj('b')]
                    (truth if side=='truth' else pred)[0].update(patch)
                    result = m.evaluate_objects(truth,pred,80,80)
                    self.assertEqual(result['status'],'NEEDS_REVIEW'); self.assertIsNone(result['objectRecall'])
                    self.assertTrue(result['validationErrors'])

    def test_self_intersection_and_degenerate_polygons_need_review(self):
        for points in [[[10,10],[40,30],[10,30],[40,10]],[[10,10],[25,10],[40,10]],[[10,10],[40,10],[10,30],[10,10]]]:
            result = m.evaluate_objects([obj(kind='polygon',points=points)],[obj('b')],80,80)
            self.assertEqual(result['status'],'NEEDS_REVIEW'); self.assertIsNone(result['iou'])

    def test_points_must_match_bbox_and_frame(self):
        result = m.evaluate_objects([obj(kind='polygon',points=[[0,0],[40,10],[10,30]])],[],80,80)
        self.assertEqual(result['status'],'NEEDS_REVIEW')

    def test_frame_limits_and_duplicate_ids(self):
        for w,h in [(0,80),(True,80),(80,math.inf),(10000,10000)]:
            self.assertEqual(m.evaluate_objects([],[],w,h)['status'],'NEEDS_REVIEW')
        self.assertEqual(m.evaluate_objects([obj(),obj()],[obj('b')],80,80)['status'],'NEEDS_REVIEW')

    def test_runner_keys_and_unknown_category_ground_truth(self):
        result=m.evaluate_objects([obj(category='未知対象',critical=False)],[obj('b',category='未知対象')],80,80)
        self.assertEqual(result['unknownAppropriateness'],1)
        self.assertEqual(result['criticalMisses'],0)
        self.assertEqual(result['criticalMisrecognitions'],0)
        self.assertEqual(result['validation_errors'],[])
        self.assertEqual(result['evaluationMethod']['anglePeriodDeg'],180)

    def test_full_frame_boundary_and_missing_critical_annotation(self):
        result=m.evaluate_objects([obj(x=0,y=0,w=80,h=80)],[obj('b',x=0,y=0,w=80,h=80)],80,80)
        self.assertEqual(result['contourErrorPx'],0)
        self.assertIsNone(result['criticalMissedObjects'])
        self.assertFalse(result['criticalAnnotationComplete'])

    def test_overlay_is_original_image_plus_red_ai_green_gt_without_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); info=PngImagePlugin.PngInfo(); info.add_text('private','removed')
            Image.new('RGB',(80,80),'white').save(root/'input.png',pnginfo=info)
            report=m.draw_overlay(root/'input.png',[obj()],[obj('b',x=45,w=20)],root/'overlay.png')
            self.assertTrue(report['humanReviewRequired'])
            with Image.open(root/'overlay.png') as overlay:
                self.assertEqual(overlay.info,{})
                self.assertEqual(overlay.getpixel((10,10)),(0,176,80))
                self.assertEqual(overlay.getpixel((45,10)),(255,48,48))
                self.assertEqual(overlay.getpixel((0,0)),(255,255,255))
            with self.assertRaises(ValueError):m.draw_overlay(root/'input.png',[obj(x=-1)],[],root/'bad.png')

if __name__=='__main__': unittest.main()
