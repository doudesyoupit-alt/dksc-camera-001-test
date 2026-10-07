"""G fixed B2 source/property/unit/geometry QA. Expected values from pre-fixed original XML."""
import json,math,sys,xml.etree.ElementTree as E
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from compare_b_inventory import canonical_xml
from independent_oracle import NS,local
from property_claim_checker_v2 import evaluate as properties_check
from bounded_geometry_oracle import expected as geometry_expected

def evaluate(t,result):
 checks=[];n=result['nativeSource'];d=result['document'];m=result['manifest'];source={o['sourceKey']:o for o in t['objects']};ni={o['sourceKey']:o for o in n['objects']};frames={f['id']:f for f in d['frames']};objs={o['id']:o for o in d['objects']};parts={p['componentId']:p for p in m['parts'] if p.get('componentId')};led={v['inventoryId']:v for v in d['sourceLedger']};inv={v['id']:v for v in d['sourceInventory']};cand={c['componentId']:c for c in m['geometryCandidates']};pageparts={p['id']:t['presentationOrder'][p['index']] for p in d['pages']}
 def check(path,e,a,tol=0):
  if isinstance(e,(int,float)) and not isinstance(e,bool) and isinstance(a,(int,float)) and not isinstance(a,bool):delta=a-e;ok=math.isfinite(a) and abs(delta)<=tol
  else:delta=None;ok=e==a
  checks.append({'path':path,'expected':e,'actual':a,'delta':delta,'tolerance':tol,'status':'PASS' if ok else 'FAIL'})
 def facts(path,e,a,tol):
  if isinstance(e,dict):
   check(path+'.keys',sorted(e),sorted(a) if isinstance(a,dict) else None)
   for k,v in e.items():facts(path+'.'+k,v,a.get(k) if isinstance(a,dict) else None,tol)
  elif isinstance(e,list):
   check(path+'.length',len(e),len(a) if isinstance(a,list) else None)
   for i,v in enumerate(e):facts(path+f'[{i}]',v,a[i] if isinstance(a,list) and i<len(a) else None,tol)
  else:check(path,e,a,tol)
 check('source.hash',t['sourceHash'],n['source']['sha256']);check('manifest.hash',t['sourceHash'],m['sourceHash']);check('IRasset.hash',[t['sourceHash']],[v['sha256'] for v in d['sourceAssets']]);check('source.UNSCALED','UNSCALED',d['scaleStatus']);check('source.noCalibration',[],d['calibrations']);check('source.nativeUnit','EMU',n['physicalUnit']);check('source.slideOrder',t['presentationOrder'],[p['partPath'] for p in n['slides']])
 actualkeys=[o['sourceKey'] for o in n['objects'] if o['role'] not in ['BACKGROUND','NON_DRAWABLE']];check('source.realObjectIdentities',sorted(source),sorted(actualkeys));check('source.nativeIdentityUnique',len(n['objects']),len(ni));check('IR.inventoryUnique',len(d['sourceInventory']),len(inv));check('IR.ledgerUnique',len(d['sourceLedger']),len(led));check('IR.inventoryLedgerParity',sorted(inv),sorted(led));check('IR.objectUnique',len(d['objects']),len(objs));check('manifest.geometryDenominator',sum(c['kind']=='geometry' for o in t['objects'] for c in o['components']),m['sourceGeometryDenominator']);check('manifest.textDenominator',sum(c['kind']=='text' for o in t['objects'] for c in o['components']),m['sourceTextDenominator'])
 original_components=[];claims=[];custom_resolutions=[]
 for key,o in source.items():
  a=ni.get(key);check(key+'.sourcePresent',True,a is not None)
  if a is None:continue
  check(key+'.kind',o['kind'],a['kind']);check(key+'.role',o['role'],a['role']);check(key+'.partHash',o['partHash'],a['sourceBinding']['partHash']);check(key+'.rawXML',canonical_xml(o['rawXml']),canonical_xml(a['native']['xml']))
  check(key+'.componentKinds',['unknown' if c['kind']=='unsupported' else c['kind'] for c in o['components']],[c['kind'] for c in a['components']])
  for p in o['components']:
   kind='unknown' if p['kind']=='unsupported' else p['kind'];cid=key+'/'+kind;original_components.append(cid);part=parts.get(cid);check(cid+'.manifestPresent',True,part is not None)
   if not part:continue
   iid=part['inventoryId'];v=inv.get(iid);l=led.get(iid);check(cid+'.IRinventoryPresent',True,v is not None);check(cid+'.IRledgerPresent',True,l is not None)
   if v and l:
    check(cid+'.sourceHash',t['sourceHash'],v['sourceBinding']['sha256']);check(cid+'.sourcePage',key.split('#')[0],pageparts.get(v['sourceBinding']['pageId']));check(cid+'.componentBinding',cid,v['sourceBinding']['partPath']);check(cid+'.partLedgerDisposition',part['disposition'],l['disposition']);check(cid+'.partLedgerObjects',part['objectIds'],l['objectIds'])
    if l['disposition']!='REPRESENTED':check(cid+'.reasonPresent',True,bool(l['reason']));check(cid+'.HumanActionPresent',True,bool(l['nextHumanAction']));check(cid+'.unsupportedNoObjects',[],l['objectIds'])
   if p['kind']=='text':
    text=next(c['text'] for c in a['components'] if c['kind']=='text');check(cid+'.textContent',p['text']['content'],text['content']);check(cid+'.paragraphRunBr',p['text']['paragraphs'],[[{'kind':'break' if v['kind']=='br' else v['kind'],'text':v['text']} for v in r['items']] for r in text['paragraphs']]);check(cid+'.textNotInvented',[],part['objectIds'])
   c=cand.get(cid)
   if c:
    expectedkeys=[k for k,vv in source.items() if k==key or vv['kind']=='grpSp' and key.startswith(k+'/')]
    check(cid+'.affineChainSourceKeys',sorted(expectedkeys),sorted(ch['sourceKey'] for ch in c['affineChain']))
    for ch in c['affineChain']:
     orig=source.get(ch['sourceKey']);check(cid+'.chainOriginalExists',True,orig is not None)
     if orig:
      root=E.fromstring(orig['rawXml']);xf=root.find('p:grpSpPr/a:xfrm',NS) if orig['kind']=='grpSp' else root.find('p:spPr/a:xfrm',NS)
      native={'attributes':dict(xf.attrib) if xf is not None else {},**{f:dict(xf.find('a:'+f,NS).attrib) if xf is not None and xf.find('a:'+f,NS) is not None else {} for f in ['off','ext','chOff','chExt']}}
      check(cid+'.chainRawXfrm.'+ch['sourceKey'],native,ch['native'])
   if o['customPaths'] and c:
    path=o['customPaths'][0];check(cid+'.customNativeUnit','PATH_COORDINATE',c['nativeFrameUnit']);check(cid+'.normalizationTargetEMU','EMU',c['normalizationTargetUnit']);check(cid+'.rawPathExtent',path['pathExtent'],c['pathExtent']);facts(cid+'.rawPathPoints',path['rawVertices'],c['nativeGeometry']['points'],0);check(cid+'.customSourceLedger','CUSTOM_PATH_COORDINATE_FRAME_UNREPRESENTABLE',l['reason']);check(cid+'.customNotIRObject',[],part['objectIds']);check(cid+'.customSidecarReason',l['reason'],c['reason']);check(cid+'.customRawNumbers',[int(v['rawLexeme']) for v in c['sourceNumberLexemes'] if v['origin']=='SOURCE_PATH_XML'][:2],path['pathExtent'])
    facts(cid+'.customDerivedPageVertices',path['pageVerticesEMU'],c['pageEmuGeometry']['points'],1e-7);facts(cid+'.customDerivedCADVertices',[[p[0],t['layoutMm'][1]-p[1]] for p in path['pageVerticesLayoutMM']],c['cadLayoutGeometry']['points'],1e-10)
    expectednorm=[path['normalizationToShapeEMU'][0],0,0,0,path['normalizationToShapeEMU'][1],0,0,0,1];facts(cid+'.normalization',expectednorm,c['normalization'],0)
    claims.append({'sourceKey':key,'sourceHash':t['sourceHash'],'resolution':{},'values':{},'sourceCoordinateUnit':c['nativeFrameUnit'],'represented':bool(part['objectIds']),'ledgerReason':l['reason'],'rawPathExtents':[c['pathExtent']],'rawPathVertices':[c['nativeGeometry']['points']]});custom_resolutions.append({'sourceKey':key,'componentId':cid,'priorFinding':'FAIL_SOURCE_UNIT_DECLARATION','currentStatus':'RESOLVED_BY_FIXED_B2_EXPLICIT_LEDGER_AND_PATH_COORDINATE_DECLARATION','newUnit':c['nativeFrameUnit'],'reason':l['reason'],'inventoryId':iid,'objectIds':part['objectIds'],'rawPathExtent':c['pathExtent'],'rawPoints':c['nativeGeometry']['points']})
   for oid in part['objectIds']:
    actual=objs.get(oid);check(cid+'.mappedObjectExists',True,actual is not None)
    if not actual:continue
    check(cid+'.objectExactSourceBinding',v['sourceBinding'],actual['sourceBinding']);e=geometry_expected(o,t['layoutMm'][1]);check(cid+'.knownEMUPrimitive','KNOWN_NATIVE_EMU_PRIMITIVE_NUMERICS_ONLY',e['representability'])
    if e['representability']!='KNOWN_NATIVE_EMU_PRIMITIVE_NUMERICS_ONLY':continue
    if e['representability']=='KNOWN_NATIVE_EMU_PRIMITIVE_NUMERICS_ONLY':facts(cid+'.nativeGeometry',e['nativeGeometry'],actual['nativeGeometry'],0);facts(cid+'.drawingGeometry',e['drawingGeometry'],actual['drawingGeometry'],1e-10)
    sf=frames[actual['sourceFrameId']];tf=frames[actual['frameId']];check(cid+'.sourceFrameUnit','EMU',sf['physicalUnit']);check(cid+'.targetFrameUnit','MM',tf['physicalUnit']);check(cid+'.targetUnitRole','LAYOUT',tf['unitRole']);check(cid+'.targetYaxis','UP',tf['yAxis'])
    check(cid+'.rawRotationDEG',o['xfrm'].get('rot',0)/60000,actual['rotation']['value']);check(cid+'.rawRotationUnit','DEG',actual['rotation']['unit']);check(cid+'.rawRotationDirection','CW',actual['rotation']['direction']);check(cid+'.rawRotationSourcePivot',[o['xfrm']['cx']/2,o['xfrm']['cy']/2],actual['rotation']['pivot'])
    rd=c['sourceRotationDeclaration'];check(cid+'.sourceRotationMetadataValue',actual['rotation']['value'],rd['value']);check(cid+'.sourceRotationMetadataUnit',actual['rotation']['unit'],rd['unit']);check(cid+'.sourceRotationMetadataDirection',actual['rotation']['direction'],rd['direction']);check(cid+'.sourceRotationMetadataPivot',actual['rotation']['pivot'],rd['pivot']);check(cid+'.rawRotationDeclared', 'rot' in o['xfrm'],rd['declared']);check(cid+'.rawRotationPivotFrame',actual['sourceFrameId'],rd['pivotFrameId']);check(cid+'.rawRotationPivotUnit','EMU',rd['pivotUnit']);check(cid+'.composedBasisMeaning','FIRST_BASIS_ORIENTATION_NOT_ASSERTED_RIGID_ROTATION',c['rotationInterpretation'])
    raw=E.fromstring(o['rawXml']).find('p:spPr/a:xfrm',NS);check(cid+'.sourceRotLexeme',raw.attrib.get('rot'),rd['rawLexeme'])
    claim={'sourceKey':key,'sourceHash':actual['sourceBinding']['sha256'],'resolution':actual['style']['resolution'],'values':{f:actual['style'][f] for f in actual['style']['resolution']}}
    claims.append(claim)
    for field,r in actual['style']['resolution'].items():
     check(cid+'.'+field+'.propertyBinding',actual['sourceBinding'],r['sourceBinding']);check(cid+'.'+field+'.noPolicy',None,r['policyId'])
     if r['state']=='UNRESOLVED':check(cid+'.'+field+'.issuePresent',True,any(i['inventoryId']==iid and i['code']=='STYLE_UNRESOLVED_'+field for i in d['issues']));check(cid+'.'+field+'.objectHumanRequired','HUMAN_CHECK_REQUIRED',actual['status'])
     check(cid+'.'+field+'.sourceEvidence',True,any(ev['id'] in r['evidenceIds'] and ev['sha256']==t['sourceHash'] and ev['method']=='SOURCE_XML' for ev in d['evidence']))
 check('sourceComponentDenominator',sorted(original_components),sorted(cid for cid in parts if not cid.endswith('/background')));check('backgroundDenominator',t['backgroundDenominator'],sum(o['role']=='BACKGROUND' for o in n['objects']));check('nonzeroGeometry',True,len(d['objects'])>0);check('representedGeometryCount',len(d['objects']),m['representedGeometryCount']);check('representedText',0,m['representedTextCount']);check('sourceNoTargetFULL',[],d['exportEvaluations']);check('productHOLD','HOLD',result['productGate']);check('manifestHOLD','HOLD',m['exportReadiness'])
 pr=properties_check(t,claims);checks+=pr['checks']
 return {'schema':'vdraw-G-independent-candidate2-adapter-qualification/1','checks':checks,'pass':sum(c['status']=='PASS' for c in checks),'fail':sum(c['status']=='FAIL' for c in checks),'sourceObjects':t['sourceObjectDenominator'],'sourceComponents':t['componentDenominator'],'geometryDenominator':m['sourceGeometryDenominator'],'textDenominator':m['sourceTextDenominator'],'representedGeometry':len(d['objects']),'representedText':0,'customUnitResolutions':custom_resolutions,'boundedGeometryReadiness':'YES' if all(c['status']=='PASS' for c in checks) else 'NO','appearanceFidelity':'UNQUALIFIED_UNRESOLVED_FIELDS','DXF':'NOT_RUN','realJwCad':'NOT_RUN','productGate':'HOLD'}
