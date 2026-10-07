"""G-owned independent source-inventory comparison; not an IR adapter or target oracle."""
import json,sys,copy,math,xml.etree.ElementTree as E
from pathlib import Path
from independent_oracle import inspect,P,A
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
def canonical_xml(s):
 root=E.fromstring(f'<qa xmlns:p="{P}" xmlns:a="{A}" xmlns:r="{R}">'+s+'</qa>')
 def node(n):return [n.tag,sorted(n.attrib.items()),n.text or '',[node(c) for c in n]]
 return node(root[0])
def evaluate_b(oracle,b):
 errors=[];checks=[];numeric=[]
 def check(name,ok):checks.append({'name':name,'pass':bool(ok)});errors.extend([] if ok else [name])
 check('package source SHA256',b.get('source',{}).get('sha256')==oracle['sourceHash'])
 check('native EMU/source and UNSCALED real-world',b.get('physicalUnit')=='EMU' and b.get('unitRole')=='SOURCE' and b.get('realWorldScaleStatus')=='UNSCALED')
 check('slide physical size and relationship order',len(b.get('slides',[]))==len(oracle['presentationOrder']) and all(s['partPath']==oracle['presentationOrder'][i] and [s['widthEmu'],s['heightEmu']]==oracle['sourceSizeEmu'] for i,s in enumerate(b.get('slides',[]))))
 key=lambda o:(o.get('sourceBinding',{}).get('partPath'),o.get('sourceBinding',{}).get('xmlPath'))
 objects=b.get('objects',[]);keys=[key(o) for o in objects];idx={key(o):o for o in objects};check('all B source identities unique',len(set(keys))==len(keys))
 expected=set((o['partPath'],o['canonicalXmlPath']) for o in oracle['sourceObjects']);actual=set(key(o) for o in objects if o['role'] not in ['NON_DRAWABLE','BACKGROUND'])
 check('original drawable/hidden/container object set exact',expected==actual)
 for e in oracle['sourceObjects']:
  label=e['canonicalXmlPath'];o=idx.get((e['partPath'],label))
  if not o:continue
  bind=o['sourceBinding'];check('source hash/page part '+label,bind.get('partHash')==e['partHash'] and bind.get('packageHash')==oracle['sourceHash'])
  check('role/type '+label,o['kind']==e['kind'] and o['role']==e['role'])
  try:rawmatch=canonical_xml(e['nativeXml'])==canonical_xml(o['native']['xml'])
  except (E.ParseError,KeyError):rawmatch=False
  check('full native XML/text/style/source identity '+label,rawmatch)
  # Unknown nonstandard ID forms are not semantic native IDs; raw XML/path above
  # must preserve them. For normal sp/cxnSp/group/picture/frame IDs enforce exact.
  if e['kind']!='unknownShape':check('native id '+label,bind.get('nativeId')==e['nativeId'])
  expectedparts=['unknown' if p['kind']=='unsupported' else p['kind'] for p in e['parts']]
  check('object parts exact '+label,[p['kind'] for p in o['components']]==expectedparts)
  for p in o['components']:
   check('component source identity '+p['id'],p['id'].startswith(o['sourceKey']+'/'))
   if p['kind']=='text':
    et=next(v['text'] for v in e['parts'] if v['kind']=='text');check('paragraph/run/br content '+label,p['text']['content']==et['content'] and [[{'kind':'break' if v['kind']=='br' else v['kind'],'text':v['text']} for v in r['items']] for r in p['text']['paragraphs']]==et['paragraphs']);check('text placement matrix '+label,p.get('positionMatrix')==[v for row in e['globalMatrix'] for v in row])
   if p['kind']=='unknown':check('unsupported source retained '+label,p['disposition']=='UNSUPPORTED')
  if e['xfrm'] is not None and e['kind'] in ['sp','cxnSp','grpSp']:
   bx=o['native'].get('xfrm') or {};raw=E.fromstring(e['nativeXml']);xf=raw.find('p:grpSpPr/a:xfrm',{'p':P,'a':A}) if e['kind']=='grpSp' else raw.find('p:spPr/a:xfrm',{'p':P,'a':A});check('raw transform attrs '+label,bx.get('attributes')==dict(xf.attrib))
   for tag,k in [('off','off'),('ext','ext'),('chOff','chOff'),('chExt','chExt')]:
    n=xf.find('{'+A+'}'+tag);check('raw '+tag+' '+label,bx.get(k)==(dict(n.attrib) if n is not None else {}))
   em=[v for row in e['globalMatrix'] for v in row];bm=o['transform']['matrix'];numeric.append({'sourcePath':label,'stage':'OOXML_SOURCE_AFFINE_EMU','metric':'matrix','expected':em,'actual':bm,'rawDelta':[c-a for a,c in zip(em,bm)] if bm is not None else None,'budget':1e-8,'authority':'QA_SOURCE_ARITHMETIC_PROPOSAL_ONLY'});check('independent full affine '+label,bm is not None and len(bm)==9 and all(abs(a-c)<=1e-8 for a,c in zip(em,bm)))
   g=next((p.get('geometry') for p in o['components'] if p['kind']=='geometry'),None)
   if e['preset'] in ['line','rect','ellipse']:
    check('supported structural primitive geometry present '+label,g is not None)
   if g and e['preset'] in ['line','rect','ellipse']:
    m=e['globalMatrix'];w=e['xfrm']['cx'];h=e['xfrm']['cy']
    xy=lambda p:[sum(m[i][j]*p[j] for j in range(3)) for i in range(2)]
    nearpoints=lambda x,y:len(x)==len(y) and all(len(a)==len(b) and all(abs(c-d)<=1e-8 for c,d in zip(a,b)) for a,b in zip(x,y))
    if e['preset']=='line':
     want=[xy([0,0,1]),xy([w,h,1])];got=g.get('endpointsEmu',[]);numeric.append({'sourcePath':label,'stage':'OOXML_SOURCE_COMPONENT_EMU','metric':'lineEndpoints','expected':want,'actual':got,'rawDelta':[[c-a for a,c in zip(x,y)] for x,y in zip(want,got)],'budget':1e-8,'authority':'QA_SOURCE_ARITHMETIC_PROPOSAL_ONLY'});check('independent line type/endpoints '+label,g.get('kind')=='line' and nearpoints(want,g.get('endpointsEmu',[])))
    elif e['preset']=='ellipse':
     center=xy([w/2,h/2,1]);axes=[[m[0][0]*w/2,m[1][0]*w/2],[m[0][1]*h/2,m[1][1]*h/2]];lu,lv=[math.hypot(*v) for v in axes];dot=sum(a*b for a,b in zip(*axes));kind='circle' if abs(lu-lv)<=1e-9*max(lu,lv) and abs(dot)<=1e-9*lu*lv else 'ellipse'
     numeric.append({'sourcePath':label,'stage':'OOXML_SOURCE_COMPONENT_EMU','metric':'centerAndAxisVectors','expected':[center]+axes,'actual':[g.get('centerEmu',[])]+g.get('axisVectorsEmu',[]),'rawDelta':[[c-a for a,c in zip(x,y)] for x,y in zip([center]+axes,[g.get('centerEmu',[])]+g.get('axisVectorsEmu',[]))],'budget':1e-8,'authority':'QA_SOURCE_ARITHMETIC_PROPOSAL_ONLY'});check('independent circle/ellipse type/center/axes/size '+label,g.get('kind')==kind and nearpoints([center], [g.get('centerEmu',[])]) and nearpoints(axes,g.get('axisVectorsEmu',[])))
    else:check('independent rect type '+label,g.get('kind')=='rect')
   if e['kind'] in ['sp','cxnSp']:
    raw=E.fromstring(e['nativeXml']);pr=raw.find('{'+P+'}spPr');bs=o['native'].get('style') or {}
    check('semantic color remains UNKNOWN '+label,bs.get('semanticColor')=='UNKNOWN')
    if pr is not None:
     for scope,parent in [('fill',pr),('stroke',pr.find('{'+A+'}ln'))]:
      if parent is None:continue
      fill=parent.find('{'+A+'}solidFill');clr=fill.find('{'+A+'}srgbClr') if fill is not None else None
      if clr is not None:
       got=bs.get(scope) or {};transforms=[{'kind':n.tag.rsplit('}',1)[-1],'attributes':dict(n.attrib)} for n in clr]
       check('direct raw RGB/transforms '+scope+' '+label,got.get('kind')=='rgb' and got.get('value')==clr.attrib['val'] and got.get('transforms')==transforms)
   if e['preset']=='rect' and g:
    m=e['globalMatrix'];w=e['xfrm']['cx'];h=e['xfrm']['cy'];want=[[sum(m[i][j]*p[j] for j in range(3)) for i in range(2)] for p in [[0,0,1],[w,0,1],[w,h,1],[0,h,1]]];got=g.get('cornersEmu',[]);check('independent four rect corners '+label,len(got)==4 and all(abs(a-c)<=1e-8 for x,y in zip(want,got) for a,c in zip(x,y)))
 components=[p for o in objects for p in o['components']];cid=[p['id'] for p in components];rows=b.get('componentLedger',[]);rowids=[p['componentId'] for p in rows];check('unique component identities and ledger coverage',len(set(cid))==len(cid) and sorted(cid)==sorted(rowids) and len(set(rowids))==len(rowids))
 check('source ledger unique and complete',len(b.get('sourceLedger',[]))==len(objects) and sorted(x['sourceKey'] for x in b['sourceLedger'])==sorted(o['sourceKey'] for o in objects))
 check('background denominator explicit',sum(o['role']=='BACKGROUND' for o in objects)==len(oracle['backgrounds']))
 check('infrastructure denominator explicit',sum(o['role']=='NON_DRAWABLE' for o in objects)==len(oracle['infrastructure']))
 check('component plus background denominator exact',len(components)==oracle['counts']['parts']+len(oracle['backgrounds']))
 check('unsupported count exact with background split',b.get('counts',{}).get('unsupportedComponents')==oracle['counts']['unsupportedParts']+len(oracle['backgrounds']))
 check('unsupported reasons and Human action retained',all(r.get('reasons') and r.get('nextHumanAction') for r in rows if r['disposition']!='EXTRACTED'))
 check('source accounting cannot promote target readiness',b.get('exportReadiness')=='HOLD' and b.get('supportedRetention')=='NOT_EVALUATED')
 return {'status':'FAIL' if errors else 'SOURCE_INVENTORY_MATCH_ONLY','checks':checks,'numericDeltas':numeric,'failures':errors,'supportedRetention':'NOT_EVALUATED','productGate':'HOLD','unknownSemantic':'NO_PROMOTION','realApps':'NOT_RUN'}
if __name__=='__main__':
 if len(sys.argv)!=4:raise SystemExit('usage: python compare_b_inventory.py SOURCE.pptx B_RESULT.json REPORT.json')
 r=evaluate_b(inspect(sys.argv[1]),json.loads(Path(sys.argv[2]).read_text()));Path(sys.argv[3]).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':r['status'],'checks':len(r['checks']),'failures':r['failures']}));raise SystemExit(bool(r['failures']))
