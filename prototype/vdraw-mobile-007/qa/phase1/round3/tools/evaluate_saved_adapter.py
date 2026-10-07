"""G independent fixed-result qualification. Original XML/EMU is expected; B is actual."""
import json,sys,math,copy,xml.etree.ElementTree as E
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from independent_oracle import inspect,NS
from compare_b_inventory import canonical_xml
from source_truth import truth as expanded_truth
from ir_numerical_oracle import evaluate as evaluate_ir

def evaluate(t,result):
 checks=[];native=result['nativeSource'];ir=result['document'];manifest=result['manifest'];page_parts={p['id']:t['presentationOrder'][p['index']] for p in ir['pages'] if p['index']<len(t['presentationOrder'])}
 def check(path,e,a,tol=0):
  if isinstance(e,(int,float)) and not isinstance(e,bool) and isinstance(a,(int,float)) and not isinstance(a,bool):delta=a-e;ok=math.isfinite(a) and abs(delta)<=tol
  else:delta=None;ok=e==a
  checks.append({'path':path,'expected':e,'actual':a,'delta':delta,'tolerance':tol,'status':'PASS' if ok else 'FAIL'})
 def coords(path,e,a,tol):
  check(path+'.shape',[len(e),[len(v) for v in e]],[len(a),[len(v) for v in a]] if isinstance(a,list) and all(isinstance(v,list) for v in a) else None)
  for i,v in enumerate(e):
   for j,x in enumerate(v):check(path+f'[{i}][{j}]',x,a[i][j] if isinstance(a,list) and i<len(a) and isinstance(a[i],list) and j<len(a[i]) else None,tol)
 check('native.sha256',t['sourceHash'],native['source']['sha256']);check('manifest.sha256',t['sourceHash'],manifest['sourceHash']);check('native.sourceUnit','EMU',native['physicalUnit']);check('native.UNSCALED','UNSCALED',native['realWorldScaleStatus'])
 check('slide.order',t['presentationOrder'],[s['partPath'] for s in native['slides']]);check('IR.page.order',list(range(len(t['presentationOrder']))),[p['index'] for p in ir['pages']])
 native_objects=native['objects'];idx={(o['sourceBinding']['partPath'],o['sourceBinding']['xmlPath']):o for o in native_objects};actual_real=[o for o in native_objects if o['role'] not in ['NON_DRAWABLE','BACKGROUND']]
 expected={(o['partPath'],o['canonicalXmlPath']):o for o in t['sourceObjects']};actual_keys=[(o['sourceBinding']['partPath'],o['sourceBinding']['xmlPath']) for o in actual_real]
 check('source.objects.unique',len(actual_keys),len(set(actual_keys)));check('source.objects.exact',sorted(expected),sorted(actual_keys))
 candidate_by_id={c['componentId']:c for c in manifest['geometryCandidates']};native_by_source={o['sourceKey']:o for o in native_objects};parts_manifest={p['componentId']:p for p in manifest['parts'] if p.get('componentId')};manifest_component_ids=list(parts_manifest)
 source_component_ids=[]
 for key,o in expected.items():
  a=idx.get(key);label=key[0]+'#'+key[1];check(label+'.present',True,a is not None)
  if a is None:continue
  bind=a['sourceBinding'];check(label+'.partHash',o['partHash'],bind['partHash']);check(label+'.packageHash',t['sourceHash'],bind['packageHash']);check(label+'.kind',o['kind'],a['kind']);check(label+'.role',o['role'],a['role'])
  check(label+'.rawXML',canonical_xml(o['nativeXml']),canonical_xml(a['native']['xml']))
  check(label+'.nativeComponentKinds',['unknown' if p['kind']=='unsupported' else p['kind'] for p in o['parts']],[p['kind'] for p in a['components']])
  if o['globalMatrix'] is not None:
   coords(label+'.nativeMatrix',o['globalMatrix'],[a['transform']['matrix'][i:i+3] for i in range(0,9,3)],1e-7)
  for p in o['parts']:
   kind='unknown' if p['kind']=='unsupported' else p['kind'];cid=label+'/'+kind;source_component_ids.append(cid);m=parts_manifest.get(cid);check(cid+'.manifestPresent',True,m is not None)
   if m is None:continue
   inv=next((v for v in ir['sourceInventory'] if v['id']==m['inventoryId']),None);ledger=next((v for v in ir['sourceLedger'] if v['inventoryId']==m['inventoryId']),None)
   check(cid+'.IRinventoryPresent',True,inv is not None);check(cid+'.IRledgerPresent',True,ledger is not None)
   if inv and ledger:
    b=inv['sourceBinding'];check(cid+'.IRhash',t['sourceHash'],b['sha256']);check(cid+'.IRpagePart',o['partPath'],page_parts.get(b['pageId']));check(cid+'.IRpartBinding',cid,b['partPath']);check(cid+'.ledgerDisposition',m['disposition'],ledger['disposition']);check(cid+'.ledgerReason',m.get('reason'),ledger.get('reason'))
    check(cid+'.reasonPresent',True,bool(ledger.get('reason')));check(cid+'.HumanActionPresent',True,bool(ledger.get('nextHumanAction')))
    check(cid+'.noFalseRepresented','HUMAN_CHECK_REQUIRED' if inv['support']=='HUMAN_CHECK_REQUIRED' else 'UNSUPPORTED',ledger['disposition']);check(cid+'.objectsEmpty',[],ledger['objectIds'])
   if p['kind']=='text':
    text=next((c.get('text') for c in a['components'] if c['kind']=='text'),{});check(cid+'.textExact',p['text']['content'],text.get('content'));got=[[{'kind':'break' if v['kind']=='br' else v['kind'],'text':v['text']} for v in para['items']] for para in text.get('paragraphs',[])];check(cid+'.paragraphRunBr',p['text']['paragraphs'],got)
   c=candidate_by_id.get(cid)
   if c:
    check(cid+'.candidateKnownSource',True,p['kind']=='geometry');g=c['pageEmuGeometry'];cg=c['cadLayoutGeometry'];want=None
    em=copy.deepcopy(o['globalMatrix']);native_expected=None
    if o['preset']=='line':native_expected={'kind':'line','start':[0,0],'end':[o['xfrm']['cx'],o['xfrm']['cy']]}
    elif o['preset']=='rect':native_expected={'kind':'polygon','points':[[0,0],[o['xfrm']['cx'],0],[o['xfrm']['cx'],o['xfrm']['cy']],[0,o['xfrm']['cy']]],'closed':True}
    elif o['geometryPaths']:
     pt=o['geometryPaths'][0];native_expected={'kind':'polygon' if pt['closed'] else 'polyline','points':pt['verticesPathUnits'],'closed':pt['closed']};sx=o['xfrm']['cx']/pt['extentPathUnits'][0];sy=o['xfrm']['cy']/pt['extentPathUnits'][1]
     for row in em:row[0]*=sx;row[1]*=sy
    if native_expected is not None:check(cid+'.exactNativeGeometry',native_expected,c['nativeGeometry'])
    coords(cid+'.candidateMatrix',em,[c['matrixToPageEmu'][i:i+3] for i in range(0,9,3)],1e-7)
    coords(cid+'.candidateBasis',[[em[0][0],em[1][0]],[em[0][1],em[1][1]]],c['basisVectorsPageEmu'],1e-7)
    check(cid+'.basisOrientation',math.atan2(em[1][0],em[0][0])*180/math.pi,c['basisOrientationDegrees'],1e-10)
    check(cid+'.nativeUnit','EMU',c['nativeFrameUnit']);check(cid+'.layoutUnit','MM',c['layoutUnit']);check(cid+'.layoutRole','LAYOUT',c['layoutRole']);check(cid+'.scaleStatus','UNSCALED',c['scaleStatus'])
    if o['preset']=='line':want=[o['orderedCornersEmu'][0],o['orderedCornersEmu'][2]];check(cid+'.candidateType','line',g['kind']);got=[g.get('start'),g.get('end')];cad=[cg.get('start'),cg.get('end')]
    elif o['preset']=='rect':want=o['orderedCornersEmu'];check(cid+'.candidateType','polygon',g['kind']);got=g.get('points',[]);cad=cg.get('points',[]);check(cid+'.closed',True,g.get('closed'))
    elif o['geometryPaths']:
     pth=o['geometryPaths'][0];want=pth['globalVerticesEmu'];check(cid+'.candidateType','polygon' if pth['closed'] else 'polyline',g['kind']);check(cid+'.pathClosed',pth['closed'],g.get('closed'));got=g.get('points',[]);cad=cg.get('points',[])
    elif o['preset']=='ellipse':
     em=o['globalMatrix'];w=o['xfrm']['cx'];h=o['xfrm']['cy'];center=[sum(em[i][j]*[w/2,h/2,1][j] for j in range(3)) for i in range(2)];coords(cid+'.centerEMU',[center],[g.get('center',[])],1e-7);coords(cid+'.centerMM',[[center[0]/36000,t['layoutMm'][1]-center[1]/36000]],[cg.get('center',[])],1e-10)
     radii=[math.hypot(em[0][0],em[1][0])*w/2,math.hypot(em[0][1],em[1][1])*h/2];check(cid+'.radiusEMU',radii[0],g.get('radius'),1e-7) if g['kind']=='circle' else coords(cid+'.radiiEMU',[radii],[g.get('radii',[])],1e-7)
    else:check(cid+'.independentPrimitiveExpectationPresent',True,False)
    if want is not None:coords(cid+'.pageEMU',want,got,1e-7);coords(cid+'.CADmm',[[x/36000,t['layoutMm'][1]-y/36000] for x,y in want],cad,1e-10)
    check(cid+'.candidateNotProductObject',False,bool(m['objectIds']));check(cid+'.candidateReason',m['reason'],c['reason'])
  if o['rawCustomGeometry'] is not None:check(label+'.customRawXMLPresent',True,'custGeom' in a['native']['xml'])
 check('sourceComponentDenominator',sorted(source_component_ids),sorted(v for v in manifest_component_ids if not v.endswith('/background')))
 check('geometry.denominator',sum(p['kind']=='geometry' for o in t['sourceObjects'] for p in o['parts']),manifest['sourceGeometryDenominator']);check('text.denominator',sum(p['kind']=='text' for o in t['sourceObjects'] for p in o['parts']),manifest['sourceTextDenominator'])
 check('manifestIRinventoryCount',len(ir['sourceInventory']),manifest['sourceInventoryCount']);check('ledgerUnique',len(ir['sourceLedger']),len({v['inventoryId'] for v in ir['sourceLedger']}));check('IRinventoryLedgerParity',sorted(v['id'] for v in ir['sourceInventory']),sorted(v['inventoryId'] for v in ir['sourceLedger']))
 for inv in ir['sourceInventory']:
  check('inventory:'+inv['id']+'.sourceHash',t['sourceHash'],inv['sourceBinding']['sha256'])
 for frame in ir['frames']:
  expectedunit='EMU' if frame['unitRole']=='SOURCE' else 'MM';check(frame['id']+'.unit',expectedunit,frame['physicalUnit']);check(frame['id']+'.extent',t['sourceSizeEmu'] if frame['unitRole']=='SOURCE' else t['layoutMm'],frame['extent'])
 check('noDrawableIR',0,len(ir['objects']));check('representedGeometryCount',0,manifest['representedGeometryCount']);check('representedTextCount',0,manifest['representedTextCount']);check('product.HOLD','HOLD',result['productGate']);check('manifest.HOLD','HOLD',manifest['exportReadiness']);check('noTargetEvaluations',[],ir['exportEvaluations'])
 nr=evaluate_ir(t,ir,page_parts);checks+=nr['checks']
 return {'schema':'vdraw-round3-fixed-adapter-independent-qa/1','status':'FAIL' if any(c['status']=='FAIL' for c in checks) else 'SOURCE_ACCOUNTING_AND_GEOMETRY_SIDECAR_ONLY','checks':checks,'pass':sum(c['status']=='PASS' for c in checks),'fail':sum(c['status']=='FAIL' for c in checks),'sourceObjects':len(expected),'sourceComponents':len(source_component_ids),'geometryDenominator':manifest['sourceGeometryDenominator'],'textDenominator':manifest['sourceTextDenominator'],'geometryCandidates':len(candidate_by_id),'drawableIR':len(ir['objects']),'sourceToIRProductGate':'SOURCE_TO_IR_PRODUCT_CONNECTION_BLOCKED','productGate':'HOLD','rawThemeMasterRetention':'PACKAGE_HASH_AND_ORIGINAL_ASSET_ONLY_NOT_RESOLVED','realJwCad':'NOT_RUN'}
if __name__=='__main__':
 s=Path(sys.argv[1]);r=json.loads(Path(sys.argv[2]).read_text());t=expanded_truth(s);e=evaluate(t,r);Path(sys.argv[3]).write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in e.items() if k!='checks'}));raise SystemExit(bool(e['fail']))
