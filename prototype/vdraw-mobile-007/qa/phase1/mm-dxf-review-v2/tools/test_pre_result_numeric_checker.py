"""New checker guard tests fixed before backend results; hand-authored ASCII specimens."""
import unittest,copy
from test_pre_backend_oracle import specimen,G
from ascii_dxf_parser_v3 import parse,DXFError
from compare_original_parsed_geometry import evaluate_page
P=G['pages'][0];POLY='0\nPOLYLINE\n5\nA\n8\nG_REVIEW\n66\n1\n70\n1\n10\n0\n20\n0\n'
for handle,x,y in [('B',-1,148),('C',2,148),('D',2,146),('E',-1,146)]:POLY+=f'0\nVERTEX\n5\n{handle}\n8\nG_REVIEW\n10\n{x}\n20\n{y}\n'
POLY+='0\nSEQEND\n5\nF\n8\nG_REVIEW\n';RAW=specimen(POLY);E=P['entities'][0];M={h:{**{k:E[k] for k in ['sourceKey','componentId','inventoryId','IRObjectId']},'pageId':P['pageId'],'sourcePart':P['sourcePart']} for h in 'ABCDEF'}
class PreResultNumericChecker(unittest.TestCase):
 def bad(self,raw=RAW,m=M):self.assertGreater(evaluate_page(P,parse(raw),m)['fail'],0)
 def test_hand_authored_rect_all_raw_records(self):p=parse(RAW);self.assertEqual((p['logicalEntityCount'],p['rawEntityRecordCount']),(1,6));self.assertEqual(evaluate_page(P,p,M)['fail'],0)
 def test_source_mm_coordinate_change(self):self.bad(RAW.replace('10\n-1','10\n-36000',1))
 def test_double_y_reflection(self):self.bad(RAW.replace('20\n148','20\n2'))
 def test_missing_corner(self):self.bad(RAW.replace('0\nVERTEX\n5\nE\n8\nG_REVIEW\n10\n-1\n20\n146\n',''))
 def test_wrong_closure(self):self.bad(RAW.replace('70\n1','70\n0',1))
 def test_extra_vertex(self):self.bad(RAW.replace('0\nSEQEND','0\nVERTEX\n5\n10\n8\nG_REVIEW\n10\n2\n20\n150\n0\nSEQEND'))
 def test_misordered_vertices(self):self.bad(RAW.replace('5\nC\n8\nG_REVIEW\n10\n2\n20\n148','5\nC\n8\nG_REVIEW\n10\n2\n20\n146'))
 def test_missing_seqend_reject(self):self.assertRaises(DXFError,parse,RAW.replace('0\nSEQEND\n5\nF\n8\nG_REVIEW\n',''))
 def test_fractional_polyflag_reject(self):self.assertRaises(DXFError,parse,RAW.replace('70\n1','70\n1.5'))
 def test_fractional_vertices_follow_reject(self):self.assertRaises(DXFError,parse,RAW.replace('66\n1','66\n1.0'))
 def test_missing_raw_mapping(self):m=copy.deepcopy(M);m.pop('C');self.bad(m=m)
 def test_wrong_source_mapping_same_counts(self):m=copy.deepcopy(M);m['C']['sourceKey']='wrong-original';self.bad(m=m)
 def test_wrong_page_mapping(self):m=copy.deepcopy(M);m['D']['pageId']='page-1';self.bad(m=m)
 def test_vertex_mapping_not_just_polyline_header(self):m=copy.deepcopy(M);m['E']['componentId']='wrong-component';self.bad(m=m)
 def test_no_newer_truecolor(self):self.assertRaises(DXFError,parse,RAW.replace('5\nA','420\n16777215\n5\nA'))
 def test_synthetic_circle_parser(self):p=parse(specimen('0\nCIRCLE\n5\nA\n8\nG_REVIEW\n10\n15\n20\n125\n40\n5\n'));self.assertEqual(p['logicalEntities'][0]['geometry'],{'kind':'circle','center':[15,125],'radius':5})
 def test_circle_radius_zero_reject(self):self.assertRaises(DXFError,parse,specimen('0\nCIRCLE\n5\nA\n8\nG_REVIEW\n10\n15\n20\n125\n40\n0\n'))
if __name__=='__main__':unittest.main(verbosity=2)
