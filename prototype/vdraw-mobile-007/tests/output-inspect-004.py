from pathlib import Path
import zipfile,json,xml.etree.ElementTree as E,hashlib
import ezdxf
r=Path('evidence');ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(r/'manual-regression.pptx') as z:
 assert z.testzip() is None
 slides=[E.fromstring(z.read(f'ppt/slides/slide{i}.xml')) for i in [1,2]]
 counts=[{'nativeShapes':len(s.findall('.//p:sp',ns)),'images':len(s.findall('.//p:pic',ns)),'editableTextRuns':len(s.findall('.//a:t',ns)),'customGeometries':len(s.findall('.//a:custGeom',ns))} for s in slides]
 assert counts[0]['nativeShapes']==9 and counts[1]['nativeShapes']==1
 colors=[x.attrib['val'].upper() for s in slides for x in s.findall('.//a:srgbClr',ns)]
 assert 'AA4422' in colors and '775544' in colors and '285EC6' not in colors
 assert counts[0]['images']==0 and counts[0]['customGeometries']==2
x=ezdxf.readfile(r/'manual-regression.dxf');a=x.audit();assert not a.errors and not a.fixes;assert x.header['$INSUNITS']==0
kinds={k:len(x.modelspace().query(k)) for k in ['LINE','LWPOLYLINE','CIRCLE','ARC','TEXT']};assert all(v for v in kinds.values())
assert any(e.dxf.true_color==int('775544',16) for e in x.modelspace().query('LWPOLYLINE'))
data=json.loads((r/'manual-regression.json').read_text());assert len(data['pages'])==2 and data['pages'][0]['calibration']['status']=='UNSCALED'
result={'status':'PASS','input':'manual synthetic sample, not real photo/AI','PPTX':counts,'uiSelectionColorIncluded':False,'DXF':{'entities':kinds,'layers':list(x.layers.entries),'auditErrors':0,'auditFixes':0,'INSUNITS':0},'projectPages':2,'files':[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [r/'manual-regression.pptx',r/'manual-regression.dxf',r/'manual-regression.json']],'PowerPointApplicationOpened':False,'JwCadApplicationOpened':False}
(r/'output-inspection.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
