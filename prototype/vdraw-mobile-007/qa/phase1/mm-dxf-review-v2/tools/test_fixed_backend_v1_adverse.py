"""G new actual-B377 output mutation tests. Source/pre-output truth stays immutable."""
import unittest,json,copy,os,re,hashlib
from pathlib import Path
from evaluate_fixed_backend_v1 import evaluate
R=Path(__file__).resolve().parents[1];D=Path(os.environ['VDRAW_DXF_EVIDENCE_ROOT']);B=Path(os.environ['VDRAW_B2_EVIDENCE_ROOT']);Q=R.parent/'b2-review'
def load(n):
 t=json.loads((R/'fixtures'/(n+'.source-mm-dxf-truth.json')).read_text());m=json.loads((D/(n+'.manifest.json')).read_text());i=json.loads((D/(n+'.evaluated-ir.json')).read_text());a=json.loads(((Q/'evidence' if n.startswith('synthetic-g04') else B)/(n+'.adapter-result.json')).read_text());f={p['filename']:(D/p['filename']).read_bytes() for p in m['pages']};return t,m,i,f,a
G=load('synthetic-g03-expanded');W=load('synthetic-g04-property-witness');N=load('native-vdraw-n01');C=load('generic-synthetic-g01')
def firstfile(m,f):return m['pages'][0]['filename']
def changebytes(m,f,old,new):
 k=firstfile(m,f);assert old.encode() in f[k];f[k]=f[k].replace(old.encode(),new.encode(),1);m['pages'][0]['sha256']=hashlib.sha256(f[k]).hexdigest()
def lossrow(m):return next(r for r in m['propertyLossLedger'] if r['logicalEntityIds'])
class FixedBackendAdverse(unittest.TestCase):
 def bad(self,mut,base=G,path=None):
  t,m,i,f,a=copy.deepcopy(base);mut(m,i,f);v=evaluate(t,m,i,f,a);fails=[c for c in v['checks'] if c['status']=='FAIL'];self.assertTrue(fails);self.assertTrue(path is None or any(path in c['path'] for c in fails),fails[:3])
 def test_fixed_nonzero_geometry(self):self.assertEqual(evaluate(*G)['fail'],0)
 def test_native_alpha_zero_known_finding(self):
  v=evaluate(*N);f=[c for c in v['checks'] if c['status']=='FAIL'];self.assertEqual([(x['path'],x['expected'],x['actual']) for x in f],[('source-5-part-0.reviewVisibilityOverride',True,False)])
 def test_actual_mm_value_not_hash_only(self):self.bad(lambda m,i,f:changebytes(m,f,'10\n-1\n','10\n-36000\n'),path='sourceComputedMMGeometry')
 def test_wrong_y_reflection(self):self.bad(lambda m,i,f:changebytes(m,f,'20\n148\n','20\n2\n'),path='sourceComputedMMGeometry')
 def test_missing_ordered_corner(self):
  def mut(m,i,f):
   k=firstfile(m,f);s=f[k].decode();s=re.sub(r'0\nVERTEX\n5\n104\n.*?(?=0\nSEQEND)', '',s,flags=re.S);f[k]=s.encode();m['pages'][0]['sha256']=hashlib.sha256(f[k]).hexdigest()
  self.bad(mut,path='rawRecordCount')
 def test_closed_polygon_became_open(self):self.bad(lambda m,i,f:changebytes(m,f,'70\n1\n10\n0','70\n0\n10\n0'),path='sourceComputedMMGeometry')
 def test_polyline_flag_fraction_reject(self):self.bad(lambda m,i,f:changebytes(m,f,'70\n1\n10\n0','70\n1.5\n10\n0'),path='validASCII')
 def test_malformed_odd_group_pair(self):self.bad(lambda m,i,f:f.__setitem__(firstfile(m,f),f[firstfile(m,f)]+b'0\n'),path='validASCII')
 def test_missing_eof(self):self.bad(lambda m,i,f:changebytes(m,f,'0\nEOF\n',''),path='validASCII')
 def test_newer_insunits_header_does_not_prove_mm(self):self.bad(lambda m,i,f:changebytes(m,f,'1\nAC1009\n','1\nAC1009\n9\n$INSUNITS\n70\n4\n'),path='validASCII')
 def test_wrong_group_code(self):self.bad(lambda m,i,f:changebytes(m,f,'10\n-1\n','ten\n-1\n'),path='validASCII')
 def test_missing_raw_vertex_mapping(self):self.bad(lambda m,i,f:m['pages'][0]['rawRecords'].pop(2),path='rawHandleMappingKeys')
 def test_wrong_raw_source_binding(self):self.bad(lambda m,i,f:m['pages'][0]['rawRecords'][2]['sourceBinding'].__setitem__('partPath','ppt/slides/slide2.xml#wrong/geometry'),path='componentId')
 def test_raw_source_hash(self):self.bad(lambda m,i,f:m['pages'][0]['rawRecords'][2]['sourceBinding'].__setitem__('sha256','0'*64),path='sourceHash')
 def test_raw_vertex_logical_owner(self):self.bad(lambda m,i,f:m['pages'][0]['rawRecords'][2].__setitem__('logicalEntityId','other'),path='logicalOwner')
 def test_raw_vertex_index(self):self.bad(lambda m,i,f:m['pages'][0]['rawRecords'][2].__setitem__('vertexIndex',99),path='orderedVertexIndex')
 def test_page_merge(self):self.bad(lambda m,i,f:m['pages'][1].__setitem__('pageId','page-0'),path='page.order')
 def test_page_global_inventory_omission(self):self.bad(lambda m,i,f:m['pages'][0]['retentionLedger'].pop(),path='allInventoryCoverage')
 def test_page_wrong_partition_filename_hash(self):self.bad(lambda m,i,f:next(r for r in m['pages'][0]['retentionLedger'] if r['reason'] and r['reason'].startswith('FILE_PARTITION')).__setitem__('reason','FILE_PARTITION_OTHER_PAGE missing'),path='separateFilenameHash')
 def test_global_inventory_omission(self):self.bad(lambda m,i,f:m['sourceInventory'].pop(),path='sourceInventoryExact')
 def test_unsupported_ledger_omission(self):self.bad(lambda m,i,f:m['packageRetentionLedger'].pop(),path='retention.coverage')
 def test_property_loss_row_omission(self):self.bad(lambda m,i,f:m['propertyLossLedger'].pop(),path='loss.coverage')
 def test_font_property_loss_missing(self):self.bad(lambda m,i,f:lossrow(m)['properties'].pop(),path='propertyDimensions')
 def test_source_color_retained_false_claim(self):self.bad(lambda m,i,f:lossrow(m)['properties'][0].__setitem__('retention','RETAINED'),path='notRetained')
 def test_source_color_value_forged(self):self.bad(lambda m,i,f:lossrow(m)['properties'][0].__setitem__('sourceValue','#FFFFFF'),W,path='IRvaluePreserved')
 def test_source_opacity_missing_evidence(self):self.bad(lambda m,i,f:lossrow(m)['properties'][4]['sourceResolution'].__setitem__('evidenceIds',[]),W,path='IRresolutionPreserved')
 def test_type_global_mapping_forged(self):self.bad(lambda m,i,f:m['sourceToEntityMapping'][0].__setitem__('entityType','CIRCLE'),path='sourceEntityGlobalMapping')
 def test_source_text_payload_forged(self):self.bad(lambda m,i,f:next(r for r in m['propertyLossLedger'] if r['sourceComponentKind']=='text')['sourceRawText'].__setitem__('content','forged text'),path='text.rawPayloadPreserved')
 def test_source_hidden_disclosure_forged(self):self.bad(lambda m,i,f:next(r for r in m['sourceNativeEvidence'] if r['sourceKey']==G[0]['originalObjects'][0]['sourceKey']).__setitem__('hidden',True),path='nativeHidden')
 def test_source_raw_xml_omitted(self):self.bad(lambda m,i,f:next(r for r in m['sourceNativeEvidence'] if r['sourceKey']==G[0]['originalObjects'][0]['sourceKey']).__setitem__('rawXml','<omitted/>'),path='rawOriginalXML')
 def test_fake_full_readiness(self):self.bad(lambda m,i,f:i['exportEvaluations'][0].__setitem__('readiness','FULL'),path='readinessPARTIAL')
 def test_false_UNIT_MM_marker(self):self.bad(lambda m,i,f:m['unit'].__setitem__('physicalUnit','EMU'),path='unit.physicalUnit')
 def test_false_REAL_WORLD(self):self.bad(lambda m,i,f:m['unit'].__setitem__('unitRole','REAL_WORLD'),path='unit.role')
 def test_false_calibration_scale(self):self.bad(lambda m,i,f:m['unit'].__setitem__('scaleStatus','CALIBRATED'),path='unit.scale')
 def test_synthetic_display_source_appearance_forgery(self):self.bad(lambda m,i,f:m.__setitem__('completeAppearanceFidelity',True),path='appearance.fidelity')
 def test_actual_application_false_pass(self):self.bad(lambda m,i,f:m.__setitem__('actualJwCad','PASS'),path='actualJw')
 def test_wrong_circle_radius(self):
  def mut(m,i,f):
   k=firstfile(m,f);s=f[k].decode();s=s.replace('40\n5\n','40\n500\n');f[k]=s.encode();m['pages'][0]['sha256']=hashlib.sha256(f[k]).hexdigest()
  self.bad(mut,C,path='sourceComputedMMGeometry')
if __name__=='__main__':unittest.main(verbosity=2)
