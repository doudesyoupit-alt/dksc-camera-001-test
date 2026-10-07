"""Round3 source oracle extension. Reads original XML; never imports B implementation."""
import sys,json,zipfile,hashlib,math
from pathlib import Path
import xml.etree.ElementTree as E
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from independent_oracle import inspect,NS,local
ROOT=Path(__file__).resolve().parents[1]
def point(m,p):return [sum(m[i][j]*([*p,1][j]) for j in range(3)) for i in range(2)]
def truth(path):
 out=inspect(path);out['schema']='vdraw-round3-independent-source-truth/1';out['oracleStatus']='PRE_ADAPTER_TRUTH';out['numericTolerance']={'emu':1e-7,'layoutMm':1e-10,'scope':'arithmetic only; actual Jw_cad tolerance unset'}
 with zipfile.ZipFile(path) as z:
  out['partBytes']=[{'path':n,'sha256':hashlib.sha256(z.read(n)).hexdigest(),'bytes':len(z.read(n))} for n in sorted(z.namelist())]
  out['rawDependencyParts']=[{'path':n,'xml':z.read(n).decode()} for n in sorted(z.namelist()) if '/theme/' in n or '/slideMasters/' in n or '/slideLayouts/' in n]
  for o in out['sourceObjects']:
   n=E.fromstring(o['nativeXml']);m=o['globalMatrix'];v=o['xfrm'];geom=n.find('p:spPr/a:custGeom',NS)
   o['rawCustomGeometry']=E.tostring(geom,encoding='unicode') if geom is not None else None;o['geometryPaths']=[]
   if geom is not None:
    for p in geom.findall('a:pathLst/a:path',NS):
     vertices=[];commands=[];unsupported=False
     for c in p:
      tag=local(c);commands.append(tag)
      if tag not in ['moveTo','lnTo','close']:unsupported=True
      for pt in c.findall('a:pt',NS):vertices.append([int(pt.attrib['x']),int(pt.attrib['y'])])
     projected=[]
     if not unsupported and m and v:
      projected=[point(m,[x*v['cx']/int(p.attrib['w']),y*v['cy']/int(p.attrib['h'])]) for x,y in vertices]
     o['geometryPaths'].append({'commands':commands,'verticesPathUnits':vertices,'extentPathUnits':[int(p.attrib['w']),int(p.attrib['h'])],'closed':'close' in commands,'unsupported':unsupported,'globalVerticesEmu':projected,'globalVerticesMm':[[x/36000,y/36000] for x,y in projected]})
   if m and v:
    corners=[point(m,p) for p in [[0,0],[v['cx'],0],[v['cx'],v['cy']],[0,v['cy']]]]
    o['orderedCornersEmu']=corners;o['orderedCornersMm']=[[x/36000,y/36000] for x,y in corners];o['basisEmu']=[[corners[1][i]-corners[0][i] for i in range(2)],[corners[3][i]-corners[0][i] for i in range(2)]]
   else:o['orderedCornersEmu']=None;o['orderedCornersMm']=None;o['basisEmu']=None
   o['expectedComponents']=[{'kind':p['kind'],'path':o['canonicalXmlPath']+'/'+p['kind'],'nativeId':o['nativeId'],'text':p.get('text'),'status':'SOURCE_TRUTH_COMPONENT_NOT_TARGET_SUPPORT'} for p in o['parts']]
 out['denominators']={'sourceObjects':len(out['sourceObjects']),'components':sum(len(o['expectedComponents']) for o in out['sourceObjects']),'backgrounds':len(out['backgrounds']),'targetRepresented':'NOT_EVALUATED','unsupportedTarget':'NOT_EVALUATED'}
 out['productGate']='HOLD';return out
if __name__=='__main__':
 p=Path(sys.argv[1]);Path(sys.argv[2]).write_text(json.dumps(truth(p),ensure_ascii=False,indent=2)+'\n')
