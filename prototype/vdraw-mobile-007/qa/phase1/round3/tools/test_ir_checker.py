import unittest,copy,json
from pathlib import Path
from compare_source_ir import compare
R=Path(__file__).resolve().parents[1];T=json.loads((R/'fixtures/synthetic-g03-source-truth.json').read_text())
def view():
 a=copy.deepcopy(T);a['componentLedger']=[{'partPath':o['partPath'],'componentPath':p['path'],'nativeId':o['nativeId'],'disposition':'HUMAN_CHECK_REQUIRED','reason':'CONTRACT_CAPABILITY_LIMITATION','nextHumanAction':'Review original XML; no assumption'} for o in a['sourceObjects'] for p in o['expectedComponents']];return a
class CheckerTests(unittest.TestCase):
 def fail(self,a):self.assertGreater(compare(T,a)['fail'],0)
 def test_honest_accounting_is_only_accounting(self):r=compare(T,view());self.assertEqual(r['fail'],0);self.assertEqual(r['representedComponents'],0);self.assertEqual(r['actualTargetRetention'],'NOT_EVALUATED_BY_NORMALIZED_SOURCE_CHECKER')
 def test_same_count_changed_native_type(self):a=view();a['sourceObjects'][0]['kind']='unknown';self.fail(a)
 def test_erased_exact_text(self):a=view();a['sourceObjects'][6]['expectedComponents']=[];self.fail(a)
 def test_changed_endpoint(self):a=view();a['sourceObjects'][0]['geometryPaths'][0]['globalVerticesMm'][0][0]+=1;self.fail(a)
 def test_changed_basis(self):a=view();a['sourceObjects'][-2]['basisEmu'][0][0]+=1;self.fail(a)
 def test_changed_color(self):a=view();a['sourceObjects'][0]['style']=[];self.fail(a)
 def test_wrong_rotation(self):a=view();a['sourceObjects'][4]['xfrm']['rot']=0;self.fail(a)
 def test_empty_unsupported_reason(self):a=view();a['componentLedger'][0]['reason']='';self.fail(a)
 def test_empty_human_action(self):a=view();a['componentLedger'][0]['nextHumanAction']='';self.fail(a)
 def test_erased_component_denominator(self):a=view();a['componentLedger'].pop();self.fail(a)
 def test_unknown_same_count_binding(self):a=view();a['componentLedger'][0]['nativeId']='nonexistent';self.fail(a)
 def test_duplicate_component(self):a=view();a['componentLedger'][0]=a['componentLedger'][1];self.fail(a)
 def test_label_only_mm(self):a=view();a['sourceUnit']='MM';self.fail(a)
 def test_real_world_promotion(self):a=view();a['realWorldScaleStatus']='CALIBRATED';self.fail(a)
 def test_fake_target_pass(self):a=view();a['productGate']='PASS';self.fail(a)
 def test_wrong_slide_order(self):a=view();a['presentationOrder'].reverse();self.fail(a)
 def test_erased_theme_master(self):a=view();a['rawDependencyParts']=[];self.fail(a)
 def test_erased_background(self):a=view();a['backgrounds']=[];self.fail(a)
 def test_false_geometry_retention(self):a=view();a['componentLedger'][0].update({'disposition':'REPRESENTED','sourceHash':T['sourceHash'],'targetGeometryChecked':False});self.fail(a)
if __name__=='__main__':unittest.main()
