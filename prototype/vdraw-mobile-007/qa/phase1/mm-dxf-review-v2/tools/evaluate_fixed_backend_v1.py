"""G independent actual ASCII/source/all-inventory/property-loss evaluator, fixed B377.
Imports only independent G parsers/oracles. No writer import or expected geometry from IR.
"""
import json,hashlib,sys,xml.etree.ElementTree as E
from pathlib import Path
from ascii_dxf_parser_v3 import parse,DXFError
from compare_original_parsed_geometry import evaluate_page
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'b2-review/tools'));sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from property_claim_checker_v2 import evaluate as propcheck
from compare_b_inventory import canonical_xml
from independent_oracle import NS
FIELDS={'strokeColor':'stroke','fill':'fill','width':'width','dash':'dash','opacity':'opacity','font':'font'}
def evaluate(t,m,ir,files,source):
 checks=[];parsedPages=[];claims=[]
 def check(path,e,a):checks.append({'path':path,'expected':e,'actual':a,'status':'PASS' if e==a else 'FAIL'})
 inv={i['id']:i for i in t['allInventory']};srcledger={l['inventoryId']:l for l in t['allSourceLedger']};ret={l['inventoryId']:l for l in m['packageRetentionLedger']};loss={l['inventoryId']:l for l in m['propertyLossLedger']};original={o['sourceKey']:o for o in t['originalObjects']};native={o['sourceKey']:o for o in source['nativeSource']['objects']};parts={p['inventoryId']:p for p in source['manifest']['parts']};objects={o['id']:o for o in source['document']['objects']};entities={e['inventoryId']:e for p in t['pages'] for e in p['entities']};pagemap={p['pageId']:p for p in m['pages']};policy=m['reviewPolicy'];policyid=policy['id']
 check('sourceHash',t['sourceHash'],m['sourceHash']);check('inputPin.B2','2ad1c0a2c3537914d2d3a460b5843b542a6dc098',m['inputPin']['adapterHead']);check('unit.physicalUnit','MM',m['unit']['physicalUnit']);check('unit.role','LAYOUT',m['unit']['unitRole']);check('unit.scale','UNSCALED',m['unit']['scaleStatus']);check('unit.yAxis','UP',m['unit']['axis']);check('unit.header','UNIT_HEADER_METADATA_UNAVAILABLE',m['unit']['headerMetadata']);check('unit.humanCheckExplicit',True,'Jw' in m['unit']['nextHumanAction'] and 'mm' in m['unit']['nextHumanAction']);check('manifest.HOLD','HOLD',m['productGate']);check('manifest.actualJw','NOT_RUN',m['actualJwCad']);check('manifest.exportReadiness','PARTIAL_HUMAN_CHECK_REQUIRED',m['exportStatus']);check('appearance.fidelity',False,m['completeAppearanceFidelity']);check('sourceInventoryExact',t['allInventory'],m['sourceInventory']);check('sourceLedgerExact',t['allSourceLedger'],m['sourceLedger']);check('sourceGeometryDenominator',t['sourceGeometryDenominator'],m['sourceDenominators']['geometry']);check('sourceTextDenominator',t['sourceTextDenominator'],m['sourceDenominators']['text']);check('IRGeometryDenominator',t['IRGeometryDenominator'],m['sourceDenominators']['IRGeometry']);check('allInventoryDenominator',t['IRInventoryDenominator'],m['sourceDenominators']['allInventory']);check('retention.coverage',sorted(inv),sorted(ret));check('retention.unique',len(ret),len(m['packageRetentionLedger']));check('loss.coverage',sorted(inv),sorted(loss));check('loss.unique',len(loss),len(m['propertyLossLedger']));check('page.order',[p['pageId'] for p in t['pages']],[p['pageId'] for p in m['pages']]);check('page.unique',len(m['pages']),len(pagemap));check('package.logicalCount',t['targetLogicalEntityCount'],m['packageLogicalEntityCount']);check('package.rawCount',t['targetRawEntityRecordCount'],m['packageRawEntityRecordCount']);check('package.geometryRetained',t['targetLogicalEntityCount'],m['geometryRetainedCount']);check('files.exactNames',sorted(p['filename'] for p in m['pages']),sorted(files))
 check('policy.purpose','GEOMETRY_REVIEW_ONLY_HUMAN_CHECK_REQUIRED',policy['purpose']);check('policy.strokeSynthetic','GENERATED_REVIEW_FOREGROUND_NOT_SOURCE_COLOR',policy['stroke']);check('policy.fillSynthetic','OUTLINE_ONLY_NOT_SOURCE_FILL',policy['fill']);check('policy.opacityLost','NO_SOURCE_OPACITY_RETAINED',policy['opacity']);check('policy.widthLost','NO_SOURCE_WIDTH_RETAINED',policy['width']);check('policy.sha256',hashlib.sha256(json.dumps(policy,ensure_ascii=False,separators=(',',':')).encode()).hexdigest(),m['reviewPolicySha256'])
 ircopy=json.loads(json.dumps(ir));ircopy['exportEvaluations']=[];ircopy['evidence']=[e for e in ircopy['evidence'] if e['id']!='dxf-review-policy'];check('evaluatedIR.coreUnchanged',source['document'],ircopy)
 ne={o['sourceKey']:o for o in m['sourceNativeEvidence']};check('nativeEvidence.fullSourceKeys',sorted(native),sorted(ne));check('nativeEvidence.unique',len(ne),len(m['sourceNativeEvidence']))
 for key,o in original.items():
  a=ne.get(key);check(key+'.rawOriginalPresent',True,a is not None)
  if a:check(key+'.rawOriginalXML',canonical_xml(o['rawXml']),canonical_xml(a['rawXml']));check(key+'.componentIds',native[key]['components'] and [c['id'] for c in native[key]['components']] or [],a['componentIds']);check(key+'.nativeHidden',native[key]['hidden'],a['hidden'])
 for iid,item in inv.items():
  row=ret.get(iid);pl=loss.get(iid);part=parts[iid];n=native[part['sourceKey']];src=original.get(part['sourceKey']);emitted=entities.get(iid);o=objects.get(srcledger[iid]['objectIds'][0]) if srcledger[iid]['objectIds'] else None
  if not row or not pl:continue
  check(iid+'.retention.sourceBinding',item['sourceBinding'],row['sourceBinding']);check(iid+'.retention.sourceKey',part['sourceKey'],row['sourceKey']);check(iid+'.retention.componentId',part['componentId'],row['componentId']);check(iid+'.retention.originalRole',item['role'],row['sourceRole']);check(iid+'.retention.reason',True,bool(row['reason']));check(iid+'.retention.humanAction',True,bool(row['nextHumanAction']));check(iid+'.loss.sourceKey',part['sourceKey'],pl['sourceKey']);check(iid+'.loss.componentId',part['componentId'],pl['componentId']);check(iid+'.loss.originalHash',t['sourceHash'],pl['sourceRawXmlReference']['packageHash']);check(iid+'.loss.originalPartHash',n['sourceBinding']['partHash'],pl['sourceRawXmlReference']['partHash']);check(iid+'.loss.propertyDimensions',sorted(FIELDS),sorted(p['property'] for p in pl['properties']));check(iid+'.loss.propertyUnique',len(FIELDS),len({p['property'] for p in pl['properties']}));check(iid+'.loss.sourceIRObject',o['id'] if o else None,pl['sourceIRObjectId'])
  if emitted:check(iid+'.geometryExported','EXPORTED',row['status']);check(iid+'.geometryHasLogical',1,len(row['logicalEntityIds']));check(iid+'.typeOriginalNative',True,src is not None and src['preset'] in ['line','rect','ellipse'])
  else:
   check(iid+'.noInventedEntities',[],row['logicalEntityIds']);check(iid+'.noInventedRaw',[],row['rawHandles']);check(iid+'.notFalseExport',True,row['status']!='EXPORTED')
   if srcledger[iid]['disposition'] in ['UNSUPPORTED','HUMAN_CHECK_REQUIRED']:check(iid+'.sourceReasonPreserved',srcledger[iid]['reason'],row['reason'])
   if o and o['drawingGeometry']['kind']=='ellipse':check(iid+'.ellipseExplicitLoss','UNSUPPORTED_DXF_REVIEW_GEOMETRY_ELLIPSE',row['reason'])
  for p in pl['properties']:
   field=FIELDS.get(p['property']);check(iid+'.'+p['property']+'.notRetained','NOT_RETAINED',p['retention']);check(iid+'.'+p['property']+'.reason',True,bool(p['reason']));check(iid+'.'+p['property']+'.policy',policyid,p['targetPolicyId']);check(iid+'.'+p['property']+'.human',True,bool(p['nextHumanAction']))
   if o and field!='font':check(iid+'.'+field+'.IRvaluePreserved',o['style'][field],p['sourceValue']);check(iid+'.'+field+'.IRresolutionPreserved',o['style']['resolution'][field],p['sourceResolution'])
   if field=='font' and p['nativeProperty'] is not None:
    actualfonts=[[{k:v[k] for k in ['fontLatin','fontEastAsian','runProperties','runStyle'] if k in v} for v in pp['items']] for pp in n['native']['text']['paragraphs']];check(iid+'.font.rawValuesPreserved',actualfonts,p['nativeProperty']);check(iid+'.font.sourceValuesPreserved',actualfonts,p['sourceValue'])
  if o and src:
   props={FIELDS[p['property']]:p for p in pl['properties'] if p['property']!='font'};claims.append({'sourceKey':src['sourceKey'],'sourceHash':t['sourceHash'],'resolution':{f:p['sourceResolution'] for f,p in props.items()},'values':{f:p['sourceValue'] for f,p in props.items()}})
   noStroke=src['properties']['stroke']['state']=='EXPLICIT' and src['properties']['stroke']['value'] is None;noFill=src['properties']['fill']['state']=='EXPLICIT' and src['properties']['fill']['value'] is None;alphaZero=src['properties']['opacity']['state']=='EXPLICIT' and src['properties']['opacity']['value']==0
   check(iid+'.reviewOutlineOverride',bool(emitted and noStroke),pl['reviewOutlineOverride']);check(iid+'.reviewVisibilityOverride',bool(emitted and (noStroke and noFill or alphaZero)),pl['reviewVisibilityOverride'])
  if part.get('sourceKind')=='text':
   check(iid+'.text.rawPayloadPreserved',n['native']['text'],pl['sourceRawText']);check(iid+'.text.absentTarget',[],pl['logicalEntityIds'])
 for exp in t['pages']:
  ap=pagemap.get(exp['pageId']);check(exp['pageId']+'.present',True,ap is not None)
  if not ap:continue
  data=files.get(ap['filename']);check(exp['pageId']+'.filenameStable','vdraw-review-'+t['sourceHash']+'-p'+str(exp['pageIndex']+1).zfill(3)+'.dxf',ap['filename']);check(exp['pageId']+'.fileSourcePageId',exp['pageIndex'],ap['index']);check(exp['pageId']+'.nonzero',True,ap['logicalEntityCount']>0)
  if data is None:continue
  try:parsed=parse(data)
  except DXFError as e:check(exp['pageId']+'.validASCII',True,str(e));continue
  check(exp['pageId']+'.sha256',parsed['sha256'],ap['sha256']);check(exp['pageId']+'.unitPhysical','MM',ap['physicalUnit']);check(exp['pageId']+'.unitRole','LAYOUT',ap['unitRole']);check(exp['pageId']+'.unitScale','UNSCALED',ap['scaleStatus']);check(exp['pageId']+'.axisUP','UP',ap['yAxis']);check(exp['pageId']+'.logicalCount',parsed['logicalEntityCount'],ap['logicalEntityCount']);check(exp['pageId']+'.rawCount',parsed['rawEntityRecordCount'],ap['rawEntityRecordCount'])
  raw={r['handle']:r for r in ap['rawRecords']};check(exp['pageId']+'.rawMapUnique',len(ap['rawRecords']),len(raw));normalized={}
  for h,r in raw.items():
   sb=r['sourceBinding'];cid=sb['partPath'];normalized[h]={'sourceKey':cid.rsplit('/',1)[0],'componentId':cid,'inventoryId':r['inventoryId'],'IRObjectId':r['objectId'],'pageId':sb['pageId'],'sourcePart':cid.split('#')[0]};check(exp['pageId']+'.'+h+'.sourceHash',t['sourceHash'],sb['sha256']);check(exp['pageId']+'.'+h+'.syntheticPolicy',policyid,r['generatedDisplayPolicyId']);check(exp['pageId']+'.'+h+'.recordType',next((v['type'] for v in parsed['rawEntityRecords'] if v['handle']==h),None),r['recordType'])
  for logical in ap['logicalEntities']:
   expectedentity=next((e for e in exp['entities'] if e['inventoryId']==logical['inventoryId']),None);check(exp['pageId']+'.'+logical['id']+'.knownOriginalEntity',True,expectedentity is not None)
   if expectedentity:
    check(exp['pageId']+'.'+logical['id']+'.logicalId',expectedentity['inventoryId']+'-dxf-logical',logical['id']);check(exp['pageId']+'.'+logical['id']+'.originalIRObjectId',expectedentity['IRObjectId'],logical['objectId']);check(exp['pageId']+'.'+logical['id']+'.originalType',expectedentity['type'],logical['entityType']);check(exp['pageId']+'.'+logical['id']+'.appearanceNotRetained','NOT_RETAINED',logical['appearanceRetention'])
    for idx,h in enumerate(logical['rawHandles']):
     rr=raw.get(h);check(exp['pageId']+'.'+h+'.inLogicalRawMap',True,rr is not None)
     if rr:check(exp['pageId']+'.'+h+'.logicalOwner',logical['id'],rr['logicalEntityId']);check(exp['pageId']+'.'+h+'.orderedVertexIndex',idx-1 if expectedentity['type']=='POLYLINE' and 0<idx<len(logical['rawHandles'])-1 else None,rr['vertexIndex'])
  nr=evaluate_page(exp,parsed,normalized);checks+=nr['checks'];parsedPages.append({'pageId':exp['pageId'],'parsed':parsed,'comparison':nr})
  for rr in parsed['rawEntityRecords']:
   attrs=dict(rr['pairs']);check(exp['pageId']+'.'+rr['handle']+'.generatedLayer',policy['layer'],rr['layer']);check(exp['pageId']+'.'+rr['handle']+'.generatedACI',str(policy['ACI']),attrs.get(62));check(exp['pageId']+'.'+rr['handle']+'.generatedLinetype',policy['linetype'],attrs.get(6))
  tabs=parsed['tables'];check(exp['pageId']+'.tableOrder',['TABLE','LTYPE','ENDTAB','TABLE','LAYER','ENDTAB'],[x['type'] for x in tabs]);lt=next((x for x in tabs if x['type']=='LTYPE'),None);la=next((x for x in tabs if x['type']=='LAYER'),None)
  if lt:ltv=dict(lt['pairs']);check(exp['pageId']+'.table.continuous',policy['linetype'],ltv.get(2));check(exp['pageId']+'.table.dashElements','0',ltv.get(73));check(exp['pageId']+'.table.dashPeriod','0',ltv.get(40))
  if la:lav=dict(la['pairs']);check(exp['pageId']+'.table.layer',policy['layer'],lav.get(2));check(exp['pageId']+'.table.layerACI',str(policy['ACI']),lav.get(62));check(exp['pageId']+'.table.layerLinetype',policy['linetype'],lav.get(6))
  rows={r['inventoryId']:r for r in ap['retentionLedger']};check(exp['pageId']+'.globalInventoryDenominator',len(inv),ap['requiredGlobalInventoryCount']);check(exp['pageId']+'.allInventoryCoverage',sorted(inv),sorted(rows));check(exp['pageId']+'.allInventoryUnique',len(ap['retentionLedger']),len(rows))
  for iid,row in rows.items():
   item=inv.get(iid)
   if not item:continue
   if iid in exp['otherPageInventoryIds']:
    other=pagemap.get(item['sourceBinding']['pageId']);check(exp['pageId']+'.'+iid+'.partitionTargetPageExists',True,other is not None)
    if other is None:continue
    check(exp['pageId']+'.'+iid+'.partitionStatus','EXCLUDED_BY_POLICY',row['status']);check(exp['pageId']+'.'+iid+'.partitionNoEntities',[],row['entityIds']);check(exp['pageId']+'.'+iid+'.separateFilenameHash','FILE_PARTITION_OTHER_PAGE '+other['filename']+' sha256='+other['sha256'],row['reason'])
   elif iid in ret:check(exp['pageId']+'.'+iid+'.ownPageStatus',ret[iid]['status'],row['status']);check(exp['pageId']+'.'+iid+'.ownPageEntities',ret[iid]['logicalEntityIds'] if ret[iid]['status']=='EXPORTED' else [],row['entityIds'])
 expectedmap=[{**e,'filename':p['filename'],'fileSha256':p['sha256'],'pageId':p['pageId']} for p in m['pages'] for e in p['logicalEntities']];check('sourceEntityGlobalMapping',expectedmap,m['sourceToEntityMapping'])
 for evaluation in ir['exportEvaluations']:
  check(evaluation['id']+'.readinessPARTIAL','PARTIAL',evaluation['readiness']);check(evaluation['id']+'.roleLAYOUT','LAYOUT',evaluation['unitRole']);check(evaluation['id']+'.fullInventoryRequired',sorted(inv),sorted(evaluation['requiredInventoryIds']));page=next((p for p in m['pages'] if p['coordinateFrameId']==evaluation['targetFrameId']),None);check(evaluation['id']+'.knownPage',True,page is not None)
  if page:check(evaluation['id']+'.retentionRows',page['retentionLedger'],evaluation['retentionLedger']);check(evaluation['id']+'.logicalOutputMap',[{'id':e['id'],'inventoryId':e['inventoryId'],'objectId':e['objectId']} for e in page['logicalEntities']],evaluation['outputEntities'])
 pr=propcheck({'sourceHash':t['sourceHash'],'objects':t['originalObjects']},claims);checks+=pr['checks']
 # All loss dimensions are covered across numeric/entity, original native, inventory/retention and property ledgers.
 return {'schema':'vdraw-G-fixed-B377-MM-DXF-independent-qualification/1','checks':checks,'pass':sum(c['status']=='PASS' for c in checks),'fail':sum(c['status']=='FAIL' for c in checks),'parsedPages':parsedPages,'originalSourceObjects':t['sourceObjects'],'originalSourceComponents':t['sourceComponentsExcludingBackground'],'sourceGeometry':t['sourceGeometryDenominator'],'sourceText':t['sourceTextDenominator'],'IRGeometry':t['IRGeometryDenominator'],'IRInventory':t['IRInventoryDenominator'],'targetLogical':t['targetLogicalEntityCount'],'targetRaw':t['targetRawEntityRecordCount'],'propertyLossRows':len(m['propertyLossLedger']),'propertyLossRecords':sum(len(r['properties']) for r in m['propertyLossLedger']),'pageInventoryRows':sum(len(p['retentionLedger']) for p in m['pages']),'boundedReadiness':'YES' if all(c['status']=='PASS' for c in checks) else 'NO_OPEN_FINDING','productGate':'HOLD','actualJw':'NOT_RUN'}
