"""Actual parsed DXF -> pre-fixed original-source numerical/page/raw-record comparison."""
import math

def evaluate_page(expected,parsed,raw_source_mapping):
 checks=[]
 def check(p,e,a,tol=0):
  delta=None
  if isinstance(e,(int,float)) and not isinstance(e,bool) and isinstance(a,(int,float)) and not isinstance(a,bool):delta=a-e;ok=math.isfinite(a) and abs(delta)<=tol
  else:ok=e==a
  checks.append({'path':p,'expected':e,'actual':a,'delta':delta,'tolerance':tol,'status':'PASS' if ok else 'FAIL'})
 def numeric(p,e,a):
  if isinstance(e,dict):
   check(p+'.keys',sorted(e),sorted(a) if isinstance(a,dict) else None)
   for k,v in e.items():numeric(p+'.'+k,v,a.get(k) if isinstance(a,dict) else None)
  elif isinstance(e,list):
   check(p+'.length',len(e),len(a) if isinstance(a,list) else None)
   for i,v in enumerate(e):numeric(p+'['+str(i)+']',v,a[i] if isinstance(a,list) and i<len(a) else None)
  else:check(p,e,a,1e-8)
 check('logicalEntityCount',expected['logicalEntityCount'],parsed['logicalEntityCount']);check('rawRecordCount',expected['rawEntityRecordCount'],parsed['rawEntityRecordCount']);check('rawHandleMappingKeys',sorted(r['handle'] for r in parsed['rawEntityRecords']),sorted(raw_source_mapping))
 for i,e in enumerate(expected['entities']):
  a=parsed['logicalEntities'][i] if i<len(parsed['logicalEntities']) else None;prefix='entity['+str(i)+']';check(prefix+'.exists',True,a is not None)
  if not a:continue
  check(prefix+'.type',e['type'],a['type']);numeric(prefix+'.sourceComputedMMGeometry',e['originalComputedGeometryMM'],a['geometry']);check(prefix+'.rawRecordTypes',e['rawRecordTypes'],a['rawTypes']);check(prefix+'.rawRecordCount',e['rawRecordCount'],len(a['rawHandles']))
  for handle in a['rawHandles']:
   mapping=raw_source_mapping.get(handle);check(prefix+'.'+handle+'.hasSourceMapping',True,mapping is not None)
   if mapping:
    for field in ['sourceKey','componentId','inventoryId','IRObjectId']:check(prefix+'.'+handle+'.'+field,e[field],mapping.get(field))
    check(prefix+'.'+handle+'.pageId',expected['pageId'],mapping.get('pageId'));check(prefix+'.'+handle+'.sourcePart',expected['sourcePart'],mapping.get('sourcePart'))
 return {'schema':'vdraw-G-original-source-parsed-DXF-numeric-comparison/2','checks':checks,'pass':sum(c['status']=='PASS' for c in checks),'fail':sum(c['status']=='FAIL' for c in checks),'tolerance':'1e-8 MM synthetic numeric-oracle precision; NOT actual-app acceptance tolerance','actualJw':'NOT_RUN','productGate':'HOLD'}
