import json,unittest
from pathlib import Path
from bounded_geometry_oracle import expected
R=Path(__file__).resolve().parents[1];G=json.loads((R/'fixtures/synthetic-g03-expanded.property-unit-truth.json').read_text());W=json.loads((R/'fixtures/synthetic-g04-property-witness.property-unit-truth.json').read_text())
def o(t,i,s=1):return next(v for v in t['objects'] if v['nativeId']==str(i) and v['sourceKey'].startswith(f'ppt/slides/slide{s}.xml#'))
class BoundedGeometryTests(unittest.TestCase):
 def test_custom_raw_excluded(self):self.assertEqual(expected(o(G,2),150)['representability'],'CUSTOM_PATH_COORDINATE_FRAME_UNREPRESENTABLE')
 def test_line_emu_direction(self):e=expected(o(G,5),150);self.assertEqual(e['nativeGeometry'],{'kind':'line','start':[0,0],'end':[108000,72000]});self.assertEqual(e['drawingGeometry'],{'kind':'line','start':[2,148],'end':[-1,146]})
 def test_direct_witness_mm(self):self.assertEqual(expected(o(W,2),150)['drawingGeometry'],{'kind':'line','start':[-1,148],'end':[1,147]})
 def test_rect_full_vertices(self):self.assertEqual(expected(o(W,3),150)['drawingGeometry']['points'],[[-1,148],[1,148],[1,147],[-1,147]])
 def test_90_degree_endpoints(self):e=expected(o(G,6),150)['drawingGeometry'];self.assertAlmostEqual(e['start'][0],1.5);self.assertAlmostEqual(e['start'][1],145.5);self.assertAlmostEqual(e['end'][0],-0.5);self.assertAlmostEqual(e['end'][1],148.5)
 def test_359_not_zero(self):self.assertNotEqual(expected(o(G,7),150)['drawingGeometry'],expected(o(G,5),150)['drawingGeometry'])
 def test_nested_rect_basis_not_axis_box(self):e=expected(o(G,4,2),150);self.assertEqual(e['drawingGeometry']['kind'],'polygon');self.assertAlmostEqual(e['drawingGeometry']['points'][0][0],-5);self.assertAlmostEqual(e['drawingGeometry']['points'][0][1],94)
 def test_nativeUnit_layout_not_world(self):e=expected(o(W,2),150);self.assertEqual(e['sourceUnit'],'EMU');self.assertEqual(e['unitRole'],'LAYOUT');self.assertEqual(e['scaleStatus'],'UNSCALED')
if __name__=='__main__':unittest.main()
