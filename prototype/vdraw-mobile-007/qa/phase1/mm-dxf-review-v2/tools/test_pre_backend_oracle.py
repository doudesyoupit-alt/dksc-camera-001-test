import unittest,json,copy
from pathlib import Path
from original_source_dxf_oracle import build,PROPERTIES
from ascii_dxf_parser import parse,DXFError
R=Path(__file__).resolve().parents[1]
def truth(n):return json.loads((R/'fixtures'/(n+'.source-mm-dxf-truth.json')).read_text())
G=truth('synthetic-g03-expanded');N=truth('native-vdraw-n01');C=truth('generic-synthetic-g01');S=json.loads((R/'evidence/pre-backend-original-oracle-summary.json').read_text())
# G-authored parser specimens are synthetic, not writer outputs or acceptance evidence.
def specimen(entity='0\nLINE\n5\n1\n8\nG_REVIEW\n10\n-1\n20\n148\n11\n2\n21\n146\n'):
 return '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'+entity+'0\nENDSEC\n0\nEOF\n'
class PreBackendOracle(unittest.TestCase):
 def test_source_denominators(self):self.assertEqual((sum(x['sourceGeometry'] for x in S),sum(x['sourceText'] for x in S)),(32,8))
 def test_source_IR_target_denominators_distinct(self):self.assertEqual((sum(x['IRGeometry'] for x in S),sum(x['logicalDXFExpected'] for x in S),sum(x['rawDXFExpected'] for x in S)),(23,22,82))
 def test_ellipse_never_circle_or_poly_approximation(self):self.assertEqual((N['IRGeometryDenominator'],N['targetLogicalEntityCount']),(6,5))
 def test_page_order_from_relationships(self):self.assertEqual([p['sourcePart'] for p in G['pages']],['ppt/slides/slide2.xml','ppt/slides/slide1.xml'])
 def test_page_split_not_overlay(self):self.assertEqual([p['logicalEntityCount'] for p in G['pages']],[1,5])
 def test_rectangle_all_ordered_corners(self):self.assertEqual(G['pages'][0]['entities'][0]['originalComputedGeometryMM']['points'],[[-1,148],[2,148],[2,146],[-1,146]])
 def test_source_emu_unit_math_flip_not_double_reflect(self):g=G['pages'][1]['entities'][0]['originalComputedGeometryMM'];self.assertEqual(g,{'kind':'line','start':[2,148],'end':[-1,146]})
 def test_90degree_raw_source_math(self):g=G['pages'][1]['entities'][1]['originalComputedGeometryMM'];self.assertAlmostEqual(g['start'][0],1.5);self.assertAlmostEqual(g['end'][0],-.5);self.assertAlmostEqual(g['end'][1],148.5)
 def test_true_circle_original_center_radius(self):e=next(e for e in C['pages'][0]['entities'] if e['type']=='CIRCLE');self.assertEqual(e['originalComputedGeometryMM'],{'kind':'circle','center':[15,125],'radius':5})
 def test_custom_native_units_not_target(self):self.assertFalse(any(e['sourceNativeId'] in ['2','3'] for p in G['pages'] for e in p['entities']))
 def test_polyline_raw_denominator(self):e=G['pages'][0]['entities'][0];self.assertEqual(e['rawRecordTypes'],['POLYLINE']+['VERTEX']*4+['SEQEND']);self.assertEqual(e['rawRecordCount'],6)
 def test_every_page_keeps_global_required_inventory(self):self.assertEqual(G['pages'][0]['globalRequiredInventoryIds'],G['pages'][1]['globalRequiredInventoryIds']);self.assertTrue(G['pages'][0]['otherPageInventoryIds'])
 def test_property_loss_dimensions(self):self.assertTrue(set(['type','geometry','text','color','stroke','fill','width','dash','opacity','font','sourceIdentity','unsupported','hidden','background','customPath','unitHeader']).issubset(PROPERTIES))
 def test_no_unit_header_or_version_false_proof(self):self.assertEqual(G['unitHeaderStatus'],'UNIT_HEADER_METADATA_UNAVAILABLE');self.assertFalse(G['headerMetadataProvesNumericUnits'])
 def test_layout_unscaled_not_calibration(self):self.assertEqual((G['coordinateUnit'],G['unitRole'],G['scaleStatus'],G['yAxis']),('MM','LAYOUT','UNSCALED','UP'))
 def test_source_geometry_independent_of_ir_value(self):
  q=R.parent/'b2-review';t=json.loads((q/'fixtures/synthetic-g04-property-witness.property-unit-truth.json').read_text());a=json.loads((q/'evidence/synthetic-g04-property-witness.adapter-result.json').read_text())['document'];before=build(t,a);a['objects'][0]['drawingGeometry']['start']=[999,999];self.assertEqual(build(t,a)['pages'],before['pages'])
 def test_parser_synthetic_line(self):self.assertEqual(parse(specimen())['logicalEntities'][0]['geometry'],{'kind':'line','start':[-1,148],'end':[2,146]})
 def test_parser_does_not_infer_mm_from_AC1009(self):self.assertEqual(parse(specimen())['coordinateUnit'],'UNSPECIFIED_IN_DXF_BYTES')
 def test_ascii_review_comment_not_unit_proof(self):p=parse(specimen().replace('9\n$ACADVER','999\nG authored review only\n9\n$ACADVER'));self.assertEqual(p['comments'],['G authored review only']);self.assertEqual(p['coordinateUnit'],'UNSPECIFIED_IN_DXF_BYTES')
 def test_odd_pairs(self):self.assertRaises(DXFError,parse,specimen()+'0\n')
 def test_bad_code(self):self.assertRaises(DXFError,parse,specimen().replace('10\n-1','ten\n-1'))
 def test_nonfinite(self):self.assertRaises(DXFError,parse,specimen().replace('10\n-1','10\nnan'))
 def test_missing_eof(self):self.assertRaises(DXFError,parse,specimen().removesuffix('0\nEOF\n'))
 def test_newer_header_not_qualified(self):self.assertRaises(DXFError,parse,specimen().replace('1\nAC1009','1\nAC1009\n9\n$INSUNITS\n70\n4'))
 def test_newer_entity_not_qualified(self):self.assertRaises(DXFError,parse,specimen().replace('0\nLINE','0\nLWPOLYLINE'))
 def test_duplicate_raw_handle(self):entity=specimen().split('2\nENTITIES\n')[1].split('0\nENDSEC')[0];self.assertRaises(DXFError,parse,specimen(entity+entity))
if __name__=='__main__':unittest.main(verbosity=2)
