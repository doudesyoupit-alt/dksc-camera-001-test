import unittest,json,copy
from pathlib import Path
from ir_numerical_oracle import evaluate
T=json.loads((Path(__file__).resolve().parents[1]/'fixtures/synthetic-g03-source-truth.json').read_text());S=next(o for o in T['sourceObjects'] if o['partPath'].endswith('slide1.xml') and o['nativeId']=='5')
def ir():return {'scaleStatus':'UNSCALED','calibrations':[],'sourceAssets':[{'sha256':T['sourceHash']}],'frames':[{'id':'sf','physicalUnit':'EMU'},{'id':'df','physicalUnit':'MM','unitRole':'LAYOUT'}],'sourceInventory':[{'id':'inv','sourceBinding':{'sha256':T['sourceHash'],'pageId':'p1','partPath':S['canonicalXmlPath']+'/geometry'}}],'sourceLedger':[],'objects':[{'id':'line1','sourceBinding':{'sha256':T['sourceHash'],'pageId':'p1','partPath':S['canonicalXmlPath']+'/geometry'},'sourceFrameId':'sf','frameId':'df','rotation':{'value':0},'drawingGeometry':{'kind':'line','start':S['orderedCornersMm'][0],'end':S['orderedCornersMm'][2]}}],'exportEvaluations':[]}
class NumericalTests(unittest.TestCase):
 def fail(self,x):self.assertGreater(evaluate(T,x,{'p1':'ppt/slides/slide1.xml'})['fail'],0)
 def test_independent_mm_endpoints(self):self.assertEqual(evaluate(T,ir(),{'p1':'ppt/slides/slide1.xml'})['fail'],0)
 def test_wrong_same_count_endpoint(self):x=ir();x['objects'][0]['drawingGeometry']['end']=[0,0];self.fail(x)
 def test_label_mm_no_conversion(self):x=ir();x['objects'][0]['drawingGeometry']['start']=[72000,72000];self.fail(x)
 def test_wrong_type(self):x=ir();x['objects'][0]['drawingGeometry']['kind']='rect';self.fail(x)
 def test_swapped_direction(self):x=ir();g=x['objects'][0]['drawingGeometry'];g['start'],g['end']=g['end'],g['start'];self.fail(x)
 def test_wrong_rotation(self):x=ir();x['objects'][0]['rotation']['value']=90;self.fail(x)
 def test_wrong_source_hash(self):x=ir();x['objects'][0]['sourceBinding']['sha256']='0'*64;self.fail(x)
 def test_unknown_binding(self):x=ir();x['objects'][0]['sourceBinding']['partPath']='unknown';self.fail(x)
 def test_real_world_frame(self):x=ir();x['frames'][1]['unitRole']='REAL_WORLD';self.fail(x)
 def test_false_calibration(self):x=ir();x['scaleStatus']='CALIBRATED';self.fail(x)
 def test_unproven_target_full(self):x=ir();x['exportEvaluations']=[{'readiness':'FULL'}];self.fail(x)
 def test_duplicate_inventory(self):x=ir();x['sourceInventory']*=2;self.fail(x)
 def test_zero_objects_is_no_target_retention(self):x=ir();x['objects']=[];r=evaluate(T,x,{'p1':'ppt/slides/slide1.xml'});self.assertEqual(r['representedObjects'],0);self.assertEqual(r['productGate'],'HOLD')
if __name__=='__main__':unittest.main()
