from pathlib import Path
import zipfile,json,hashlib,xml.etree.ElementTree as E
import ezdxf
r=Path('evidence');ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(r/'protocol-flow.pptx') as z:
 assert z.testzip() is None
 slides=[E.fromstring(z.read(f'ppt/slides/slide{i}.xml')) for i in [1,2]]
 counts=[{'shapes':len(s.findall('.//p:sp',ns)),'pictures':len(s.findall('.//p:pic',ns)),'customGeometry':len(s.findall('.//a:custGeom',ns)),'textRuns':len(s.findall('.//a:t',ns))} for s in slides]
 assert counts[1]['customGeometry']==1 and counts[1]['pictures']==0
 colors=[n.attrib['val'].upper() for s in slides for n in s.findall('.//a:srgbClr',ns)]
 assert 'AA4422' in colors and '285EC6' not in colors
 poly=slides[1].find('.//a:custGeom/a:pathLst/a:path',ns);assert len(poly.findall('./a:lnTo',ns))==3
 assert slides[0].find('.//a:t',ns) is not None
ppt={'pages':2,'nativeShapeCounts':counts,'correctedColorPresent':True,'uiSelectionColorPresent':False,'editablePolyline':True,'PowerPointApplicationOpened':False}
doc=ezdxf.readfile(r/'protocol-flow.dxf');audit=doc.audit();assert not audit.errors and not audit.fixes
kinds={k:len(doc.modelspace().query(k)) for k in ['LINE','LWPOLYLINE','CIRCLE','ARC','TEXT','ELLIPSE']}
assert doc.header['$INSUNITS']==0
polys=list(doc.modelspace().query('LWPOLYLINE'));match=[p for p in polys if list(p.get_points('xy'))==[(1400,670),(1630,700),(1650,600),(1420,550)]];assert len(match)==1;assert match[0].closed
assert match[0].dxf.true_color==int('BACFC7',16)
dxf={'entities':kinds,'layers':list(doc.layers.entries),'auditErrors':len(audit.errors),'auditFixes':len(audit.fixes),'INSUNITS':doc.header['$INSUNITS'],'obliquePolygonPreserved':True,'lineColorPreserved':True,'fillHatchingImplemented':False,'JwCadApplicationOpened':False}
data=json.loads((r/'protocol-flow.json').read_text());assert len(data['pages'])==2;assert data['pages'][1]['calibration']['status']=='UNSCALED'
files=[{'file':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in [r/'protocol-flow.pptx',r/'protocol-flow.dxf',r/'protocol-flow.json']]
result={'executionKind':'protocol-fixture','realAI':False,'status':'PASS','PPTX':ppt,'DXF':dxf,'files':files}
(r/'protocol-output-inspection.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n');print(json.dumps(result,indent=2,ensure_ascii=False))
