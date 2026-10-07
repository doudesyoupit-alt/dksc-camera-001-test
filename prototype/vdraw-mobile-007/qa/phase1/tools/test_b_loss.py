import unittest,json,copy
from pathlib import Path
from independent_oracle import inspect
from compare_b_inventory import evaluate_b
R=Path(__file__).resolve().parents[1];F=R/'fixtures';D=R/'evidence'
class BLossOracle(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.o=inspect(F/'generic-synthetic-g01.pptx');cls.b=json.loads((D/'generic-synthetic-g01.b-result.json').read_text())
 def fail(self,f):
  b=copy.deepcopy(self.b);f(b);r=evaluate_b(self.o,b);self.assertEqual(r['status'],'FAIL',r)
 def test_independent_source_match_remains_hold(self):self.assertEqual(evaluate_b(self.o,self.b)['status'],'SOURCE_INVENTORY_MATCH_ONLY')
 def test_same_count_duplicate_source(self):self.fail(lambda b:b['objects'].__setitem__(3,copy.deepcopy(b['objects'][2])))
 def test_shape_retained_text_part_deleted(self):self.fail(lambda b:b['objects'][2]['components'].pop())
 def test_unknown_source_deleted(self):self.fail(lambda b:b['objects'].pop(11))
 def test_false_target_retention_pass(self):self.fail(lambda b:b.update(exportReadiness='PASS',supportedRetention='PASS'))
 def test_source_key_hash_mutation(self):self.fail(lambda b:b['objects'][2]['sourceBinding'].update(partHash='0'*64))
 def test_rotation_raw_mutation(self):self.fail(lambda b:b['objects'][3]['native']['xfrm']['attributes'].update(rot='0'))
 def test_color_native_xml_mutation(self):self.fail(lambda b:b['objects'][2]['native'].update(xml=b['objects'][2]['native']['xml'].replace('ABCDEF','000000')))
 def test_explicit_break_lost(self):self.fail(lambda b:b['objects'][2]['components'][1]['text'].update(content='分電盤ABC1000次行'))
 def test_group_affine_mutation(self):self.fail(lambda b:b['objects'][8]['transform']['matrix'].__setitem__(0,1))
 def test_line_endpoint_mutated_but_source_xml_unchanged(self):self.fail(lambda b:b['objects'][3]['components'][0]['geometry']['endpointsEmu'][1].__setitem__(1,1200))
 def test_line_type_mutated_but_source_xml_unchanged(self):self.fail(lambda b:b['objects'][3]['components'][0]['geometry'].update(kind='rect'))
 def test_circle_axis_mutated_but_source_xml_unchanged(self):self.fail(lambda b:b['objects'][4]['components'][0]['geometry']['axisVectorsEmu'][0].__setitem__(0,1200))
 def test_circle_center_mutated_but_source_xml_unchanged(self):self.fail(lambda b:b['objects'][4]['components'][0]['geometry']['centerEmu'].__setitem__(1,1200))
 def test_circle_type_mutated_but_source_xml_unchanged(self):self.fail(lambda b:b['objects'][4]['components'][0]['geometry'].update(kind='ellipse'))
 def test_direct_resolved_fill_false_substitution(self):self.fail(lambda b:b['objects'][2]['native']['style']['fill'].update(value='000000'))
 def test_geometry_missing_but_component_accounted(self):self.fail(lambda b:b['objects'][4]['components'][0].update(geometry=None))
 def test_unsupported_reason_action_erased(self):self.fail(lambda b:b['componentLedger'][-1].update(reasons=[],nextHumanAction=None))
 def test_same_counts_duplicate_component_ledger(self):self.fail(lambda b:b['componentLedger'].__setitem__(1,copy.deepcopy(b['componentLedger'][0])))
if __name__=='__main__':unittest.main(verbosity=2)
