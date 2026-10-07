"""G numerical IR checks against frozen XML truth; no producer transforms as oracle."""
import math

def evaluate(truth,ir,page_parts):
 checks=[]
 def check(path,want,got,tol=0):
  if isinstance(want,(int,float)) and not isinstance(want,bool) and isinstance(got,(int,float)) and not isinstance(got,bool):delta=got-want;ok=math.isfinite(got) and abs(delta)<=tol
  else:delta=None;ok=want==got
  checks.append({'path':path,'expected':want,'actual':got,'delta':delta,'tolerance':tol,'status':'PASS' if ok else 'FAIL'})
 def coords(path,want,got,tol):
  check(path+'.shape',[len(want),[len(p) for p in want]], [len(got),[len(p) for p in got]] if isinstance(got,list) and all(isinstance(p,list) for p in got) else None)
  for i,p in enumerate(want):
   for j,x in enumerate(p):check(path+f'[{i}][{j}]',x,got[i][j] if isinstance(got,list) and i<len(got) and isinstance(got[i],list) and j<len(got[i]) else None,tol)
 check('scaleStatus','UNSCALED',ir.get('scaleStatus'));check('noCalibration',[],ir.get('calibrations'))
 check('sourceAssetHash',[truth['sourceHash']],[a.get('sha256') for a in ir.get('sourceAssets',[])])
 frames={f['id']:f for f in ir.get('frames',[])};objs=ir.get('objects',[]);parts={}
 for o in truth['sourceObjects']:
  for p in o['expectedComponents']:parts[(o['partPath'],o['canonicalXmlPath']+'/'+p['kind'])]=(o,p)
 bindings=[];seen_objects={};ledgers={v['inventoryId']:v for v in ir.get('sourceLedger',[])}
 for inv in ir.get('sourceInventory',[]):
  b=inv.get('sourceBinding',{});bindings.append((b.get('pageId'),b.get('partPath')));check('inventory:'+inv['id']+'.hash',truth['sourceHash'],b.get('sha256'))
 check('inventory.unique',len(bindings),len(set(bindings)))
 for o in objs:
  b=o.get('sourceBinding',{});part=page_parts.get(b.get('pageId'));path=b.get('partPath','');key=(part,path)
  # Binding canonical paths may include package part prefix; strip only independently known page part.
  if key not in parts and part and path.startswith(part+'#'):key=(part,path[len(part)+1:])
  original=parts.get(key);label='object:'+o.get('id','?');check(label+'.componentRecognized',True,original is not None)
  check(label+'.hash',truth['sourceHash'],b.get('sha256'))
  if not original:continue
  source,component=original;seen_objects[key]=o
  sf=frames.get(o.get('sourceFrameId'),{});df=frames.get(o.get('frameId'),{})
  check(label+'.sourceUnit','EMU',sf.get('physicalUnit'));check(label+'.targetUnit','MM',df.get('physicalUnit'));check(label+'.unitRole','LAYOUT',df.get('unitRole'))
  check(label+'.rotation',source.get('xfrm',{}).get('rot',0)/60000,o.get('rotation',{}).get('value'),1e-12)
  geometry=o.get('drawingGeometry',{});g=geometry.get('kind');v=source.get('xfrm') or {}
  if component['kind']=='geometry':
   want=None
   if source['preset']=='line':want=[source['orderedCornersMm'][0],source['orderedCornersMm'][2]];check(label+'.kind','line',g);got=[geometry.get('start'),geometry.get('end')]
   elif source['preset']=='rect':
    want=source['orderedCornersMm'];got=geometry.get('points',[]) if g=='polygon' else [[geometry['origin'][0],geometry['origin'][1]],[geometry['origin'][0]+geometry['size'][0],geometry['origin'][1]],[geometry['origin'][0]+geometry['size'][0],geometry['origin'][1]+geometry['size'][1]],[geometry['origin'][0],geometry['origin'][1]+geometry['size'][1]]] if g=='rect' and 'origin' in geometry and 'size' in geometry else []
    check(label+'.allowedRectKind',True,g in ['rect','polygon'])
   elif source.get('geometryPaths'):
    p=source['geometryPaths'][0];check(label+'.curveCannotBecomePolyline',False,p['unsupported']);want=p['globalVerticesMm'];got=geometry.get('points',[]);check(label+'.pathClosed',p['closed'],geometry.get('closed'))
   else:check(label+'.unimplementedGeometryIndependentExpectation',True,False)
   if want is not None:coords(label+'.drawingPoints',want,got,1e-10)
  elif component['kind']=='text':check(label+'.exactContent',component['text']['content'],geometry.get('content'));check(label+'.kind','text',g)
  else:check(label+'.unknownCannotBeDrawable',True,False)
 check('allObjectIdsUnique',len(objs),len({o.get('id') for o in objs}))
 check('targetEvaluationNoneBeforeBackend',[],ir.get('exportEvaluations'))
 return {'schema':'vdraw-round3-independent-ir-numerical-oracle/1','checks':checks,'pass':sum(c['status']=='PASS' for c in checks),'fail':sum(c['status']=='FAIL' for c in checks),'representedObjects':len(objs),'status':'FAIL' if any(c['status']=='FAIL' for c in checks) else 'SOURCE_BOUND_NUMERICS_ONLY','productGate':'HOLD','notChecked':'full source component denominator/raw native retention requires companion independent source checker'}
