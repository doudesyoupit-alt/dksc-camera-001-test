"""New independent actual-result mutation tests; no A/B implementation import."""
import unittest,json,copy,os
from pathlib import Path
from evaluate_candidate2_adapter import evaluate
from property_claim_checker_v2 import evaluate as propcheck
R=Path(__file__).resolve().parents[1];B=Path(os.environ['VDRAW_B2_EVIDENCE_ROOT'])
def load(n):
 t=json.loads((R/'fixtures'/(n+'.property-unit-truth.json')).read_text());p=R/'evidence' if n.startswith('synthetic-g04') else B;return t,json.loads((p/(n+'.adapter-result.json')).read_text())
G,GR=load('synthetic-g03-expanded');W,WR=load('synthetic-g04-property-witness');N,NR=load('native-vdraw-n01')
def obj(r):return r['document']['objects'][0]
def custom(r):return next(c for c in r['manifest']['geometryCandidates'] if c['nativeFrameUnit']=='PATH_COORDINATE')
def opacity_claim(t,o):
 e=o['properties']['opacity'];return {'sourceKey':o['sourceKey'],'sourceHash':t['sourceHash'],'resolution':{f:{'state':p['state'],'rawLexeme':p['rawLexeme'],'encoding':p['encoding'],'propertyPath':p['sourcePropertyPath'],'reason':'ORIGINAL_UNRESOLVED' if p['state']=='UNRESOLVED' else None} for f,p in o['properties'].items()},'values':{f:p['value'] for f,p in o['properties'].items()}}
class FixedB2Adverse(unittest.TestCase):
 def reject(self,mut,t=G,r=GR):
  a=copy.deepcopy(r);mut(a);self.assertGreater(evaluate(t,a)['fail'],0)
 def test_fixed_g03(self):self.assertEqual(evaluate(G,GR)['fail'],0)
 def test_fixed_independent_witness(self):self.assertEqual(evaluate(W,WR)['fail'],0)
 def test_same_count_wrong_position(self):self.reject(lambda a:obj(a)['drawingGeometry']['points'][0].__setitem__(0,900))
 def test_same_count_wrong_native_size(self):self.reject(lambda a:obj(a)['nativeGeometry']['points'][1].__setitem__(0,999))
 def test_wrong_geometry_type(self):self.reject(lambda a:obj(a)['drawingGeometry'].__setitem__('kind','line'))
 def test_target_mm_mislabel(self):self.reject(lambda a:next(f for f in a['document']['frames'] if f['id']==obj(a)['frameId']).__setitem__('physicalUnit','EMU'))
 def test_target_y_mislabel(self):self.reject(lambda a:next(f for f in a['document']['frames'] if f['id']==obj(a)['frameId']).__setitem__('yAxis','DOWN'))
 def test_raw_rotation_mutated(self):self.reject(lambda a:obj(a)['rotation'].__setitem__('value',123))
 def test_raw_rotation_direction(self):self.reject(lambda a:obj(a)['rotation'].__setitem__('direction','CCW'))
 def test_raw_rotation_local_pivot(self):self.reject(lambda a:obj(a)['rotation'].__setitem__('pivot',[0,0]))
 def test_basis_is_not_raw_rotation(self):self.reject(lambda a:a['manifest']['geometryCandidates'][0].__setitem__('rotationInterpretation','RIGID_ROTATION'))
 def test_source_rot_absence_not_explicit_zero(self):
  self.reject(lambda a:next(c for c in a['manifest']['geometryCandidates'] if c.get('sourceRotationDeclaration')).get('sourceRotationDeclaration').__setitem__('declared',not next(c for c in a['manifest']['geometryCandidates'] if c.get('sourceRotationDeclaration'))['sourceRotationDeclaration']['declared']))
 def test_chain_raw_flip_changed(self):self.reject(lambda a:a['manifest']['geometryCandidates'][0]['affineChain'][0]['native']['attributes'].__setitem__('flipH','1'))
 def test_companion_raw_rotation_changed(self):self.reject(lambda a:next(c for c in a['manifest']['geometryCandidates'] if c.get('sourceRotationDeclaration'))['sourceRotationDeclaration'].__setitem__('value',77))
 def test_original_xml_changed(self):self.reject(lambda a:next(o for o in a['nativeSource']['objects'] if o['sourceKey']==G['objects'][0]['sourceKey'])['native'].__setitem__('xml','<changed/>'))
 def test_source_hash(self):self.reject(lambda a:a['manifest'].__setitem__('sourceHash','0'*64))
 def test_text_denominator_missing(self):self.reject(lambda a:a['manifest'].__setitem__('sourceTextDenominator',0))
 def test_text_same_count_wrong_content(self):
  self.reject(lambda a:next(c for o in a['nativeSource']['objects'] for c in o['components'] if c['kind']=='text')['text'].__setitem__('content','FORGED'))
 def test_custom_emu_false_label(self):self.reject(lambda a:custom(a).__setitem__('nativeFrameUnit','EMU'))
 def test_custom_raw_vertices(self):self.reject(lambda a:custom(a)['nativeGeometry']['points'][1].__setitem__(0,300000))
 def test_custom_path_extent(self):self.reject(lambda a:custom(a).__setitem__('pathExtent',[108000,72000]))
 def test_custom_normalization(self):self.reject(lambda a:custom(a)['normalization'].__setitem__(0,1))
 def test_custom_ledger_missing(self):self.reject(lambda a:next(v for v in a['document']['sourceLedger'] if v['inventoryId']==custom(a)['inventoryId']).__setitem__('reason',''))
 def test_custom_invented_drawable(self):self.reject(lambda a:next(p for p in a['manifest']['parts'] if p.get('componentId')==custom(a)['componentId']).__setitem__('objectIds',[obj(a)['id']]))
 def test_wrong_raw_width_same_value(self):self.reject(lambda a:obj(a)['style']['resolution']['width'].__setitem__('rawLexeme','03600'),W,WR)
 def test_direct_color_forged(self):self.reject(lambda a:obj(a)['style'].__setitem__('stroke','#FFFFFF'),W,WR)
 def test_wrong_source_property_path(self):self.reject(lambda a:obj(a)['style']['resolution']['stroke'].__setitem__('propertyPath','forged'),W,WR)
 def test_missing_opacity_resolution(self):self.reject(lambda a:obj(a)['style']['resolution'].pop('opacity'),W,WR)
 def test_missing_opacity_evidence(self):self.reject(lambda a:obj(a)['style']['resolution']['opacity'].__setitem__('evidenceIds',[]),W,WR)
 def test_missing_unknown_reason(self):self.reject(lambda a:obj(a)['style']['resolution']['dash'].__setitem__('reason',''),W,WR)
 def test_native_solid_not_json_array_default(self):
  def mut(a):s=obj(a)['style'];s['dash']=[];s['resolution']['dash'].update(state='EXPLICIT',encoding='DASH_JSON',rawLexeme='[]')
  self.reject(mut,W,WR)
 def test_noFill_not_unresolved(self):
  def mut(a):s=obj(a)['style'];s['resolution']['fill'].update(state='UNRESOLVED',encoding='UNRESOLVED',rawLexeme=None,reason='FORGED')
  self.reject(mut,W,WR)
 def test_equal_alpha_both_original_paths(self):
  o=next(o for o in N['objects'] if o['properties']['opacity']['state']=='EXPLICIT' and len(o['properties']['opacity']['allPaintAlphas'])==2);c=opacity_claim(N,o)
  self.assertEqual([p['rawLexeme'] for p in o['properties']['opacity']['allPaintAlphas']],['0','0'])
  for p in o['properties']['opacity']['allPaintAlphas']:c['resolution']['opacity']['propertyPath']=p['sourcePropertyPath'];self.assertEqual(propcheck(N,[c])['fail'],0)
 def test_equal_alpha_wrong_path_rejected(self):
  o=next(o for o in N['objects'] if o['properties']['opacity']['state']=='EXPLICIT');c=opacity_claim(N,o);c['resolution']['opacity']['propertyPath']=o['sourceKey']+'/forged/a:alpha/@val';self.assertGreater(propcheck(N,[c])['fail'],0)
 def test_unequal_alpha_rejected_single_known_opacity(self):
  def mut(a):s=next(o['style'] for o in a['document']['objects'] if o['sourceBinding']['nativeObjectId']=='4');p=next(o for o in W['objects'] if o['nativeId']=='4')['properties']['opacity']['allPaintAlphas'][0];s['opacity']=p['value'];s['resolution']['opacity'].update(state='EXPLICIT',rawLexeme=p['rawLexeme'],encoding='OOXML_ALPHA_100000',propertyPath=p['sourcePropertyPath'],reason=None)
  self.reject(mut,W,WR)
 def test_missing_direct_alpha_not_known(self):
  o=next(o for o in W['objects'] if o['nativeId']=='2');c=opacity_claim(W,o);c['resolution']['opacity'].update(state='UNRESOLVED',rawLexeme=None,encoding='UNRESOLVED',reason='MISSING');c['values']['opacity']=None;self.assertGreater(propcheck(W,[c])['fail'],0)
if __name__=='__main__':unittest.main()
