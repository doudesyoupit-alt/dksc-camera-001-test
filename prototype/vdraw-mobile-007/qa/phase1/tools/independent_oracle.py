"""Independent QA OOXML inventory. Not the production importer or an IR adapter."""
import json,zipfile,hashlib,math,copy,posixpath
from pathlib import Path
import xml.etree.ElementTree as E
P='http://schemas.openxmlformats.org/presentationml/2006/main';A='http://schemas.openxmlformats.org/drawingml/2006/main';NS={'p':P,'a':A}
def local(n): return n.tag.rsplit('}',1)[-1]
def digest(b):return hashlib.sha256(b).hexdigest()
def matmul(a,b):return [[sum(a[i][k]*b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
def identity():return [[1,0,0],[0,1,0],[0,0,1]]
def translate(x,y):return [[1,0,x],[0,1,y],[0,0,1]]
def transform(v,group=False):
 x,y,cx,cy=[v.get(k,0) for k in ['x','y','cx','cy']]
 if group:
  if not v.get('chCx') or not v.get('chCy'):return None
  b=matmul(translate(x,y),matmul([[cx/v['chCx'],0,0],[0,cy/v['chCy'],0],[0,0,1]],translate(-v.get('chX',0),-v.get('chY',0))))
 else:b=translate(x,y)
 angle=v.get('rot',0)/60000*math.pi/180;c,s=math.cos(angle),math.sin(angle);fx=-1 if v.get('flipH') else 1;fy=-1 if v.get('flipV') else 1
 orientation=matmul([[c,-s,0],[s,c,0],[0,0,1]],[[fx,0,0],[0,fy,0],[0,0,1]])
 return matmul(translate(x+cx/2,y+cy/2),matmul(orientation,matmul(translate(-(x+cx/2),-(y+cy/2)),b)))
def ownxf(n):
 pr=n.find('p:grpSpPr',NS) if local(n)=='grpSp' else n.find('p:spPr',NS)
 if pr is None:return None
 xf=pr.find('a:xfrm',NS)
 if xf is None:return None
 v={}
 for k in ['rot']: 
  if k in xf.attrib:v[k]=int(xf.attrib[k])
 for k in ['flipH','flipV']:
  if k in xf.attrib:v[k]=xf.attrib[k] in ['1','true']
 for tag,fields in [('off',[('x','x'),('y','y')]),('ext',[('cx','cx'),('cy','cy')]),('chOff',[('x','chX'),('y','chY')]),('chExt',[('cx','chCx'),('cy','chCy')])]:
  child=xf.find('a:'+tag,NS)
  if child is not None:
   for a,b in fields:v[b]=int(child.attrib[a])
 return v
def textdata(n):
 body=n.find('p:txBody',NS)
 if body is None:return None
 paras=[]
 for p in body.findall('a:p',NS):
  tokens=[]
  for child in p:
   if local(child)=='br':tokens.append({'kind':'break','text':'\n'})
   elif local(child) in ['r','fld']:
    for t in child.findall('a:t',NS):tokens.append({'kind':local(child),'text':t.text or ''})
  paras.append(tokens)
 return {'paragraphs':paras,'content':'\n'.join(''.join(t['text'] for t in p) for p in paras)}
def inspect(file):
 data=Path(file).read_bytes();objects=[];backgrounds=[];infrastructure=[]
 with zipfile.ZipFile(Path(file)) as z:
  pres=E.fromstring(z.read('ppt/presentation.xml'));sz=pres.find('p:sldSz',NS);size=[int(sz.attrib['cx']),int(sz.attrib['cy'])]
  rid='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
  relroot=E.fromstring(z.read('ppt/_rels/presentation.xml.rels'));rels={r.attrib['Id']:posixpath.normpath('ppt/'+r.attrib['Target']) for r in relroot if r.attrib.get('TargetMode')!='External'}
  order=[rels.get(s.attrib.get(rid)) for s in pres.findall('p:sldIdLst/p:sldId',NS)]
  slides=[{'partPath':p,'presentationIndexes':[i for i,v in enumerate(order) if v==p],'orphan':p not in order,'partHash':digest(z.read(p))} for p in sorted(v for v in z.namelist() if v.startswith('ppt/slides/slide') and v.endswith('.xml'))]
  for part in sorted(p for p in z.namelist() if p.startswith('ppt/slides/slide') and p.endswith('.xml')):
   raw=z.read(part);root=E.fromstring(raw);ph=digest(raw);bg=root.find('p:cSld/p:bg',NS)
   if bg is not None:backgrounds.append({'partPath':part,'role':'BACKGROUND','partHash':ph,'xml':E.tostring(bg,encoding='unicode')})
   st=root.find('p:cSld/p:spTree',NS)
   if st is None:raise ValueError('MISSING_SPTREE')
   def walk(parent,path,parentmatrix,canonical='/p:sld/p:cSld/p:spTree'):
    occurrences={}
    for i,n in enumerate(parent):
     tag=local(n);xp=path+'/'+tag+'['+str(i)+']';prefix='p:' if n.tag.startswith('{'+P+'}') else 'a:' if n.tag.startswith('{'+A+'}') else 'unknown:';q=prefix+tag;occurrences[q]=occurrences.get(q,0)+1;cp=canonical+'/'+q+'['+str(occurrences[q])+']'
     if tag in ['nvGrpSpPr','grpSpPr']:
      infrastructure.append({'partPath':part,'xmlPath':xp,'role':'INFRASTRUCTURE'});continue
     cn=n.find('.//p:cNvPr',NS);ni=cn.attrib.get('id') if cn is not None else None;name=cn.attrib.get('name') if cn is not None else None;hidden=cn is not None and cn.attrib.get('hidden') in ['1','true']
     v=ownxf(n);tx=textdata(n);geom=n.find('p:spPr/a:prstGeom',NS);preset=geom.attrib.get('prst') if geom is not None else None
     role='CONTAINER' if tag=='grpSp' else 'HIDDEN' if hidden else 'DRAWABLE'
     parts=[]
     if tag in ['sp','cxnSp']:
      parts.append({'kind':'geometry','preset':preset,'xfrm':v,'color':[c.attrib for c in n.findall('p:spPr/a:solidFill/a:srgbClr',NS)],'semantic':'UNKNOWN'})
      if tx is not None:parts.append({'kind':'text','text':tx,'xfrm':v,'semantic':'UNKNOWN'})
     elif tag!='grpSp':parts.append({'kind':'unsupported','sourceType':tag,'disposition':'UNSUPPORTED','reason':'UNSUPPORTED_SOURCE_OBJECT','nextHumanAction':'Review immutable source object; export omitted only by explicit partial-export policy'})
     m=transform(v or {},tag=='grpSp') if v else None;globalm=matmul(parentmatrix,m) if m else None
     box=None
     if globalm and tag!='grpSp':
      xy=[[sum(globalm[i][j]*p[j] for j in range(3)) for i in range(2)] for p in [[0,0,1],[v.get('cx',0),0,1],[0,v.get('cy',0),1],[v.get('cx',0),v.get('cy',0),1]]];xy=[list(p) for p in xy];xs=[p[0] for p in xy];ys=[p[1] for p in xy];box=[min(xs),min(ys),max(xs)-min(xs),max(ys)-min(ys)]
     style=[]
     # Preserve all raw color branches/transforms; theme/style resolution is NOT_RUN.
     for branch in ['p:spPr','p:txBody','p:style']:
      own=n.find(branch,NS)
      if own is not None:
       for color in own.iter():
        if local(color) in ['srgbClr','schemeClr','scrgbClr','sysClr','prstClr','hslClr']:
         style.append({'scope':branch,'colorType':local(color),'attributes':dict(color.attrib),'transforms':[{'kind':local(c),'attributes':dict(c.attrib)} for c in color]})
     o={'canonicalXmlPath':cp,'style':style,'styleResolution':'RAW_PRESERVED_THEME_INHERITANCE_UNRESOLVED','partPath':part,'partHash':ph,'xmlPath':xp,'nativeId':ni,'name':name,'kind':tag,'role':role,'xfrm':v,'preset':preset,'parts':parts,'globalMatrix':globalm,'globalBoxEmu':box,'nativeXml':E.tostring(n,encoding='unicode')};objects.append(o)
     if tag=='grpSp':
      if globalm is None:raise ValueError('UNMEASURABLE_GROUP')
      walk(n,xp,globalm,cp)
   walk(st,'spTree',identity())
 counts={'sourceObjects':len(objects),'containers':sum(o['role']=='CONTAINER' for o in objects),'drawableObjects':sum(o['role']=='DRAWABLE' for o in objects),'hiddenObjects':sum(o['role']=='HIDDEN' for o in objects),'backgrounds':len(backgrounds),'parts':sum(len(o['parts']) for o in objects),'unsupportedParts':sum(p['kind']=='unsupported' for o in objects for p in o['parts'])}
 return {'schema':'vdraw-phase1-independent-oracle/1','sourceHash':digest(data),'sourceSizeEmu':size,'sourceUnit':'EMU','layoutMm':[s/36000 for s in size],'realWorldScaleStatus':'UNSCALED','sourceObjects':objects,'presentationOrder':order,'sourceSlides':slides,'backgrounds':backgrounds,'infrastructure':infrastructure,'counts':counts,'oracleStatus':'CANDIDATE_PENDING_A_B_FREEZE','realAppEvidence':'NOT_RUN'}
def compare_reference(expected,actual):
 """Require unique source identity and ALL object/part facts; count parity alone is insufficient."""
 failures=[]
 if actual.get('sourceHash')!=expected['sourceHash']:failures.append('SOURCE_HASH')
 eo=expected['sourceObjects'];ao=actual.get('sourceObjects',[])
 key=lambda o:(o.get('partPath'),o.get('xmlPath'),o.get('nativeId'))
 ek=[key(o) for o in eo];ak=[key(o) for o in ao]
 if len(set(ak))!=len(ak):failures.append('DUPLICATE_SOURCE_KEY')
 if set(ek)!=set(ak):failures.append('SOURCE_OBJECT_COVERAGE')
 idx={key(o):o for o in ao}
 for e in eo:
  a=idx.get(key(e))
  if a is None:continue
  for field in ['partHash','name','canonicalXmlPath','kind','role','xfrm','preset','globalMatrix','globalBoxEmu','nativeXml','style','styleResolution']:
   if e[field]!=a.get(field):failures.append('SOURCE_FACT:'+str(e['nativeId'])+':'+field)
  if e['parts']!=a.get('parts'):failures.append('SOURCE_PART_LOSS_OR_MUTATION:'+str(e['nativeId']))
 if expected['backgrounds']!=actual.get('backgrounds'):failures.append('BACKGROUND_COVERAGE')
 for field in ['sourceSizeEmu','layoutMm','infrastructure','counts','presentationOrder','sourceSlides']:
  if expected[field]!=actual.get(field):failures.append('SOURCE_DOCUMENT_FACT:'+field)
 if expected['sourceUnit']!=actual.get('sourceUnit'):failures.append('UNIT')
 if actual.get('realWorldScaleStatus')!='UNSCALED':failures.append('UNSUPPORTED_REAL_WORLD_SCALE')
 return {'status':'FAIL' if failures else 'SOURCE_ORACLE_MATCH_ONLY','failures':failures,'supportedRetention':'NOT_EVALUATED','productGate':'HOLD'}
if __name__=='__main__':
 import sys
 if len(sys.argv)!=3:raise SystemExit('usage: python independent_oracle.py INPUT.pptx OUTPUT.json')
 Path(sys.argv[2]).write_text(json.dumps(inspect(sys.argv[1]),ensure_ascii=False,indent=2)+'\n')
