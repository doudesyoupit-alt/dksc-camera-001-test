import unittest,json,copy,math
from pathlib import Path
from independent_oracle import inspect,compare_reference,transform,matmul,identity
R=Path(__file__).resolve().parents[1];F=R/'fixtures'
class GoldenOracle(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.g=inspect(F/'generic-synthetic-g01.pptx');cls.n=inspect(F/'native-vdraw-n01.pptx');cls.t=json.loads((F/'generic-synthetic-g01.truth.json').read_text())
 def test_fixed_object_part_denominators(self): self.assertEqual(self.g['counts'],self.t['counts'])
 def test_paragraph_run_explicit_break_content(self):
  o=next(o for o in self.g['sourceObjects'] if o['nativeId']=='2');self.assertEqual(o['parts'][1]['text']['content'],'分電盤ABC\n1000\n次行');self.assertEqual([t['kind'] for t in o['parts'][1]['text']['paragraphs'][0]],['r','r','break','r'])
 def test_group_nonuniform_scale_known_manual_corners(self):
  o=next(o for o in self.g['sourceObjects'] if o['nativeId']=='6');self.assertEqual(o['globalBoxEmu'],[720000,1080000,180000,540000]);self.assertEqual(o['xfrm'],{'x':180000,'y':120000,'cx':90000,'cy':180000})
 def test_nested_rotation_flip_asymmetric_parent_known_basis(self):
  g=inspect(F/'generic-synthetic-g02-nested.pptx');o=next(o for o in g['sourceObjects'] if o['nativeId']=='6');t=json.loads((F/'generic-synthetic-g02-nested.truth.json').read_text());self.assertTrue(all(abs(a-b)<1e-8 for a,b in zip(o['globalBoxEmu'],t['globalBoxEmu'])));m=o['globalMatrix'];self.assertTrue(all(abs(a-b)<1e-8 for a,b in zip([m[0][0]*60000,m[1][0]*60000],t['expectedBasisVectorXEmu'])));self.assertTrue(all(abs(a-b)<1e-8 for a,b in zip([m[0][1]*40000,m[1][1]*40000],t['expectedBasisVectorYEmu'])))
 def test_connector_rotation_flip_keeps_zero_extent(self):
  o=next(o for o in self.g['sourceObjects'] if o['nativeId']=='3');self.assertEqual(o['xfrm']['rot'],5400000);self.assertTrue(o['xfrm']['flipH']);self.assertEqual(o['xfrm']['cy'],0);m=o['globalMatrix'];self.assertAlmostEqual(m[1][0],-1);self.assertAlmostEqual(m[0][1],-1)
 def test_native_generation_not_external_app_evidence(self):
  p=json.loads((F/'native-generation-provenance.json').read_text());self.assertEqual(p['appVerification'],'NOT_RUN');self.assertTrue(p['unchangedExporter']);self.assertFalse(p['accuracyEvidence'])
 def test_native_slide_size_layout_only(self):
  self.assertEqual(self.n['sourceSizeEmu'],[10972800,7315200]);self.assertEqual(self.n['layoutMm'],[304.8,203.2]);self.assertEqual(self.n['realWorldScaleStatus'],'UNSCALED')
 def test_native_manual_expected_positions_and_quantization(self):
  n={o['name']:o for o in self.n['sourceObjects']};self.assertEqual(n['native-rect']['xfrm'],{'x':1828800,'y':1828800,'cx':1645920,'cy':914400});self.assertEqual(n['native-line']['xfrm'],{'x':914400,'y':914400,'cx':2743200,'cy':91});self.assertEqual(n['native-rect']['globalBoxEmu'],[1828800,1828800,1645920,914400])
 def test_native_shape_text_part_denominator(self):
  self.assertEqual(self.n['counts']['sourceObjects'],6);self.assertEqual(self.n['counts']['parts'],8);self.assertEqual(sum(p['kind']=='text' for o in self.n['sourceObjects'] for p in o['parts']),2)
 def assert_failure(self,alter,expected_code):
  x=copy.deepcopy(self.g);alter(x);v=compare_reference(self.g,x);self.assertEqual(v['status'],'FAIL');self.assertTrue(any(s.startswith(expected_code) for s in v['failures']),v)
 def test_same_count_duplicate_source_replaces_connector(self):
  def f(x):x['sourceObjects'][1]=copy.deepcopy(x['sourceObjects'][0])
  self.assert_failure(f,'DUPLICATE_SOURCE_KEY')
 def test_shape_present_text_part_missing(self):self.assert_failure(lambda x:x['sourceObjects'][0]['parts'].pop(),'SOURCE_PART_LOSS_OR_MUTATION')
 def test_unknown_source_unledgered(self):self.assert_failure(lambda x:x['sourceObjects'].pop(7),'SOURCE_OBJECT_COVERAGE')
 def test_unsupported_reason_erased(self):self.assert_failure(lambda x:x['sourceObjects'][5]['parts'][0].pop('reason'),'SOURCE_PART_LOSS_OR_MUTATION')
 def test_unit_header_without_correct_unit_rejected(self):self.assert_failure(lambda x:x.update(sourceUnit='MM'),'UNIT')
 def test_layout_cannot_claim_realworld(self):self.assert_failure(lambda x:x.update(realWorldScaleStatus='CALIBRATED'),'UNSUPPORTED_REAL_WORLD_SCALE')
 def test_native_coordinate_mutation_rejected(self):self.assert_failure(lambda x:x['sourceObjects'][0]['xfrm'].update(x=1200),'SOURCE_FACT')
 def test_group_parent_transform_loss_rejected(self):self.assert_failure(lambda x:x['sourceObjects'][4].update(globalMatrix=identity()),'SOURCE_FACT')
 def test_background_denominator_cannot_disappear(self):self.assert_failure(lambda x:x.update(backgrounds=[]),'BACKGROUND_COVERAGE')
 def test_source_hash_rebinding_rejected(self):self.assert_failure(lambda x:x.update(sourceHash='0'*64),'SOURCE_HASH')
 def test_slide_size_mutation_detected(self):self.assert_failure(lambda x:x.update(sourceSizeEmu=[1200,800]),'SOURCE_DOCUMENT_FACT:sourceSizeEmu')
 def test_native_rotation_mutation_detected(self):self.assert_failure(lambda x:x['sourceObjects'][1]['xfrm'].update(rot=0),'SOURCE_FACT')
 def test_native_flip_mutation_detected(self):self.assert_failure(lambda x:x['sourceObjects'][1]['xfrm'].update(flipH=False),'SOURCE_FACT')
 def test_name_mutation_detected(self):self.assert_failure(lambda x:x['sourceObjects'][0].update(name='other'),'SOURCE_FACT')
 def test_raw_native_xml_mutation_detected(self):self.assert_failure(lambda x:x['sourceObjects'][0].update(nativeXml='<shape/>'),'SOURCE_FACT')
 def test_raw_line_color_mutation_detected(self):
  def f(x):x['sourceObjects'][0]['style'][0]['attributes']['val']='000000'
  self.assert_failure(f,'SOURCE_FACT')
 def test_native_actual_stroke_color_mutation_detected(self):
  n=copy.deepcopy(self.n);o=next(o for o in n['sourceObjects'] if o['name']=='native-line');stroke=next(c for c in o['style'] if c['attributes'].get('val')=='112233');stroke['attributes']['val']='000000';self.assertEqual(compare_reference(self.n,n)['status'],'FAIL')
 def test_explicit_br_run_structure_loss_detected(self):
  def f(x):x['sourceObjects'][0]['parts'][1]['text']['paragraphs'][0]=[{'kind':'r','text':'分電盤ABC\n1000'}]
  self.assert_failure(f,'SOURCE_PART_LOSS_OR_MUTATION')
 def test_presentation_order_mutation_detected(self):self.assert_failure(lambda x:x.update(presentationOrder=[]),'SOURCE_DOCUMENT_FACT:presentationOrder')
 def test_count_match_is_not_supported_retention(self):
  v=compare_reference(self.g,copy.deepcopy(self.g));self.assertEqual(v['status'],'SOURCE_ORACLE_MATCH_ONLY');self.assertEqual(v['supportedRetention'],'NOT_EVALUATED');self.assertEqual(v['productGate'],'HOLD')
if __name__=='__main__':unittest.main(verbosity=2)
