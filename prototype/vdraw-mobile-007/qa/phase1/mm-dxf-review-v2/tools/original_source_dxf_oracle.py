"""G pre-backend oracle v2. Geometry values come only from frozen original XML truth.
B2 accepted IR keys specify the independently qualified subset, never DXF expected math.
"""
import json,hashlib,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'b2-review/tools'))
from bounded_geometry_oracle import expected as original_geometry
PROPERTIES=['type','geometry','text','color','stroke','fill','width','dash','opacity','font','sourceIdentity','unsupported','hidden','background','customPath','unitHeader']

def build(t,qualified_ir):
 inv={v['id']:v for v in qualified_ir['sourceInventory']};accepted={o['sourceBinding']['partPath']:o for o in qualified_ir['objects']};out={'schema':'vdraw-G-original-source-MM-DXF-oracle/2','sourceHash':t['sourceHash'],'sourceUnit':'EMU','coordinateUnit':'MM','unitRole':'LAYOUT','scaleStatus':'UNSCALED','yAxis':'UP','sourceObjects':t['sourceObjectDenominator'],'sourceComponentsExcludingBackground':t['componentDenominator'],'sourceGeometryDenominator':sum(c['kind']=='geometry' for o in t['objects'] for c in o['components']),'sourceTextDenominator':sum(c['kind']=='text' for o in t['objects'] for c in o['components']),'IRGeometryDenominator':len(qualified_ir['objects']),'IRInventoryDenominator':len(qualified_ir['sourceInventory']),'pages':[],'allInventory':qualified_ir['sourceInventory'],'allSourceLedger':qualified_ir['sourceLedger'],'originalObjects':t['objects'],'requiredLossProperties':PROPERTIES,'targetDialect':'AC1009_BOUNDED_REVIEW_ONLY','unitHeaderStatus':'UNIT_HEADER_METADATA_UNAVAILABLE','headerMetadataProvesNumericUnits':False,'actualJwCad':'NOT_RUN','productGate':'HOLD','appearanceFidelity':'NOT_QUALIFIED_SYNTHETIC_REVIEW_DISPLAY_ONLY','boundedAdapterQualificationHEAD':'7c515ae3cda3af6b086bf115857a9de553f1eaed','preBackendResultsSeen':False}
 for ix,part in enumerate(t['presentationOrder']):
  p={'pageIndex':ix,'sourcePart':part,'pageId':qualified_ir['pages'][ix]['id'],'sizeMM':t['layoutMm'],'entities':[],'sourceKeysInOriginalOrder':[o['sourceKey'] for o in t['objects'] if o['sourceKey'].split('#')[0]==part]}
  for o in t['objects']:
   if o['sourceKey'].split('#')[0]!=part:continue
   cid=o['sourceKey']+'/geometry';a=accepted.get(cid)
   if not a:continue
   e=original_geometry(o,t['layoutMm'][1]);g=e.get('drawingGeometry');kind=g.get('kind') if g else None
   if kind not in ['line','circle','polygon','polyline']:continue
   iid=next(l['inventoryId'] for l in qualified_ir['sourceLedger'] if a['id'] in l['objectIds'])
   p['entities'].append({'sourceKey':o['sourceKey'],'componentId':cid,'inventoryId':iid,'IRObjectId':a['id'],'sourceNativeId':o['nativeId'],'type':{'line':'LINE','circle':'CIRCLE','polygon':'POLYLINE','polyline':'POLYLINE'}[kind],'originalComputedGeometryMM':g,'rawRecordCount':len(g['points'])+2 if kind in ['polygon','polyline'] else 1,'rawRecordTypes':['POLYLINE']+['VERTEX']*len(g['points'])+['SEQEND'] if kind in ['polygon','polyline'] else [{'line':'LINE','circle':'CIRCLE'}[kind]],'sourceProperties':o['properties'],'appearanceRetained':False})
  p['logicalEntityCount']=len(p['entities']);p['rawEntityRecordCount']=sum(e['rawRecordCount'] for e in p['entities']);p['otherPageInventoryIds']=[i['id'] for i in qualified_ir['sourceInventory'] if i['sourceBinding']['pageId']!=p['pageId']];p['globalRequiredInventoryIds']=[i['id'] for i in qualified_ir['sourceInventory']];out['pages'].append(p)
 out['targetLogicalEntityCount']=sum(p['logicalEntityCount'] for p in out['pages']);out['targetRawEntityRecordCount']=sum(p['rawEntityRecordCount'] for p in out['pages']);return out
if __name__=='__main__':
 t=json.loads(Path(sys.argv[1]).read_text());ir=json.loads(Path(sys.argv[2]).read_text());ir=ir.get('document',ir);Path(sys.argv[3]).write_text(json.dumps(build(t,ir),ensure_ascii=False,indent=2)+'\n')
