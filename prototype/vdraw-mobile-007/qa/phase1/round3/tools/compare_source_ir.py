"""Independent source→IR checker. Actual view must remain source-bound; not a producer oracle."""
import json,math

def compare(expected,actual):
 checks=[]
 def check(path,e,a,tolerance=0):
  if isinstance(e,(int,float)) and not isinstance(e,bool) and isinstance(a,(int,float)) and not isinstance(a,bool):
   delta=a-e;ok=math.isfinite(a) and abs(delta)<=tolerance
  else:delta=None;ok=e==a
  checks.append({'path':path,'expected':e,'actual':a,'delta':delta,'tolerance':tolerance,'status':'PASS' if ok else 'FAIL'})
 for f in ['sourceHash','sourceUnit','layoutMm','presentationOrder','realWorldScaleStatus']:
  check(f,expected[f],actual.get(f))
 check('productGate','HOLD',actual.get('productGate'))
 index=lambda o:(o.get('partPath'),o.get('canonicalXmlPath'),o.get('nativeId'))
 eo={index(o):o for o in expected['sourceObjects']};ao=actual.get('sourceObjects',[]);idx={index(o):o for o in ao}
 check('uniqueSourceObjects',len(ao),len(idx));check('sourceObjectIdentities',sorted(eo),sorted(idx))
 for key,o in eo.items():
  a=idx.get(key,{})
  for f in ['partHash','kind','role','xfrm','preset','style','styleResolution','nativeXml','rawCustomGeometry','geometryPaths','expectedComponents']:
   check(str(key)+'.'+f,o.get(f),a.get(f))
  for f in ['orderedCornersEmu','basisEmu','orderedCornersMm']:
   e=o.get(f);v=a.get(f);check(str(key)+'.'+f+'.shape',None if e is None else [len(e),[len(p) for p in e]],None if v is None else [len(v),[len(p) for p in v]])
   if e is not None and v is not None:
    for i,p in enumerate(e):
     for j,n in enumerate(p):check(str(key)+f'.{f}[{i}][{j}]',n,v[i][j] if i<len(v) and j<len(v[i]) else None,1e-10 if f.endswith('Mm') else 1e-7)
 check('backgrounds',expected['backgrounds'],actual.get('backgrounds'))
 check('rawDependencyParts',expected['rawDependencyParts'],actual.get('rawDependencyParts'))
 expected_components={(o['partPath'],p['path'],o['nativeId']):p for o in eo.values() for p in o['expectedComponents']}
 ledger=actual.get('componentLedger',[]);keys=[(v.get('partPath'),v.get('componentPath'),v.get('nativeId')) for v in ledger];check('uniqueComponents',len(keys),len(set(keys)));check('componentDenominator',sorted(expected_components),sorted(keys))
 represented=0
 for v in ledger:
  k=(v.get('partPath'),v.get('componentPath'),v.get('nativeId'));e=expected_components.get(k)
  check(str(k)+'.supportedDisposition',True,v.get('disposition') in ['REPRESENTED','UNSUPPORTED','HUMAN_CHECK_REQUIRED'])
  if v.get('disposition')=='REPRESENTED':
   represented+=1;check(str(k)+'.sourceHash',expected['sourceHash'],v.get('sourceHash'));check(str(k)+'.targetGeometryChecked',True,v.get('targetGeometryChecked'))
   if e and e['kind']=='text':check(str(k)+'.exactText',e['text'],v.get('sourceText'))
  else:
   check(str(k)+'.reasonPresent',True,bool(v.get('reason')));check(str(k)+'.humanActionPresent',True,bool(v.get('nextHumanAction')))
 result={'schema':'vdraw-round3-source-ir-independent-comparison/1','status':'FAIL' if any(c['status']=='FAIL' for c in checks) else 'SOURCE_ACCOUNTING_ONLY_PENDING_TARGET','checks':checks,'pass':sum(c['status']=='PASS' for c in checks),'fail':sum(c['status']=='FAIL' for c in checks),'namedTests':None,'sourceObjects':len(eo),'sourceComponents':len(expected_components),'representedComponents':represented,'actualTargetRetention':'NOT_EVALUATED_BY_NORMALIZED_SOURCE_CHECKER','productGate':'HOLD'}
 return result
