import unittest,json,copy,os
from pathlib import Path
from evaluate_saved_adapter import evaluate
R=Path(__file__).resolve().parents[1];T=json.loads((R/'fixtures/synthetic-g03-source-truth.json').read_text());ACTUAL_PATH=Path(os.environ['VDRAW_B_FIXED_RESULT']);B=json.loads(ACTUAL_PATH.read_text())
class FixedAdapterAdverseTests(unittest.TestCase):
 def fail(self,a):self.assertGreater(evaluate(T,a)['fail'],0)
 def test_fixed_source_accounting_scope_only(self):r=evaluate(T,B);self.assertEqual(r['fail'],0);self.assertEqual(r['drawableIR'],0);self.assertEqual(r['sourceToIRProductGate'],'SOURCE_TO_IR_PRODUCT_CONNECTION_BLOCKED')
 def test_same_count_sidecar_endpoint_mutation(self):a=copy.deepcopy(B);a['manifest']['geometryCandidates'][0]['pageEmuGeometry']['points'][0][0]+=1;self.fail(a)
 def test_wrong_numeric_mm_same_label(self):a=copy.deepcopy(B);a['manifest']['geometryCandidates'][0]['cadLayoutGeometry']['points'][0][0]*=36000;self.fail(a)
 def test_wrong_basis(self):a=copy.deepcopy(B);a['manifest']['geometryCandidates'][0]['basisVectorsPageEmu'][0][0]=99;self.fail(a)
 def test_erased_native_text(self):a=copy.deepcopy(B);o=next(o for o in a['nativeSource']['objects'] if o['native'].get('text'));o['native']['xml']=o['native']['xml'].replace('電源 A','');self.fail(a)
 def test_erased_ledger_reason(self):a=copy.deepcopy(B);v=next(v for v in a['document']['sourceLedger'] if v.get('reason'));v['reason']='';self.fail(a)
 def test_missing_component_inventory(self):a=copy.deepcopy(B);p=next(p for p in a['manifest']['parts'] if p.get('componentId'));a['document']['sourceInventory']=[v for v in a['document']['sourceInventory'] if v['id']!=p['inventoryId']];self.fail(a)
 def test_unknown_component_same_count(self):a=copy.deepcopy(B);p=next(p for p in a['manifest']['parts'] if p.get('componentId'));p['componentId']='unknown';self.fail(a)
 def test_rotation_raw_changed(self):a=copy.deepcopy(B);o=next(o for o in a['nativeSource']['objects'] if 'rot="5400000"' in o['native']['xml']);o['native']['xml']=o['native']['xml'].replace('rot="5400000"','rot="0"');self.fail(a)
 def test_color_raw_changed(self):a=copy.deepcopy(B);o=next(o for o in a['nativeSource']['objects'] if '123456' in o['native']['xml']);o['native']['xml']=o['native']['xml'].replace('123456','FFFFFF');self.fail(a)
 def test_fake_real_world(self):a=copy.deepcopy(B);a['document']['scaleStatus']='CALIBRATED';self.fail(a)
 def test_fake_target_pass(self):a=copy.deepcopy(B);a['productGate']='PASS';self.fail(a)
 def test_wrong_slide_binding(self):a=copy.deepcopy(B);a['nativeSource']['slides'].reverse();self.fail(a)
 def test_unknown_has_no_human_action(self):a=copy.deepcopy(B);v=next(v for v in a['document']['sourceLedger'] if v['disposition']=='UNSUPPORTED');v['nextHumanAction']='';self.fail(a)
if __name__=='__main__':unittest.main()
