# Inherited 002 test; not run in phase 003. See docs/TEST-PROCEDURE.md.
"""Inspect real UI generated files; does not claim external desktop application tests."""
import pathlib,zipfile,json,xml.etree.ElementTree as E
import ezdxf,openpyxl,fitz
r=pathlib.Path('evidence');result={}
with zipfile.ZipFile(r/'ui-output.pptx') as z:
 slides=sorted(n for n in z.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml'));details=[]
 for n in slides:
  root=E.fromstring(z.read(n));details.append({'file':n,'nativeShapes':len(root.findall('.//{*}sp')),'texts':[t.text for t in root.findall('.//{*}t')],'bitmapPictures':len(root.findall('.//{*}pic')),'customGeometry':len(root.findall('.//{*}custGeom')),'uiSelectionBlue':b'285EC6' in z.read(n)})
 assert len(slides)==2 and sum(a['nativeShapes'] for a in details)>=10 and not any(a['uiSelectionBlue'] or a['bitmapPictures'] for a in details)
 result['pptx']={'status':'PASS','slides':details,'editable':'OOXML native shapes, paths, lines, text and fill properties; Microsoft PowerPoint NOT opened'}
with zipfile.ZipFile(r/'duplicate-name-polygons.pptx') as z:
 root=E.fromstring(z.read('ppt/slides/slide1.xml'));polys=[s for s in root.findall('.//{*}sp') if s.find('.//{*}custGeom') is not None];segments=sorted(len(s.findall('.//{*}lnTo')) for s in polys);assert segments==[2,3,48];assert len({s.find('.//{*}cNvPr').get('name') for s in polys})==3
 result['duplicateNamePolygons']={'status':'PASS','separateCustomGeometry':3,'lineSegmentCounts':segments}
d=ezdxf.readfile(r/'ui-output.dxf');a=d.audit();types={}
for e in d.modelspace():types[e.dxftype()]=types.get(e.dxftype(),0)+1
assert {'LINE','LWPOLYLINE','CIRCLE','ARC','TEXT'}<=set(types)
assert d.header['$INSUNITS']==0 and len(a.errors)==0 and len(a.fixes)==0
result['dxf']={'status':'PASS','entities':types,'layers':[l.dxf.name for l in d.layers],'units':0,'errors':0,'fixes':0,'Jw_cad':'NOT TESTED','SPLINE':'not in CORE / unimplemented'}
w=openpyxl.load_workbook(r/'ui-output.xlsx');result['xlsx']={'status':'PASS','rows':w.active.max_row,'columns':w.active.max_column};assert w.active.max_column==8
pdf=fitz.open(r/'ui-output.pdf');result['pdf']={'status':'PASS','pages':len(pdf),'imagesPerPage':[len(p.get_images()) for p in pdf],'vectorEditable':False};assert len(pdf)==2
obj=json.loads((r/'ui-output.json').read_text());assert len(obj['pages'])==2;result['json']={'status':'PASS','pages':2,'elements':sum(len(p['elements']) for p in obj['pages'])}
(r/'002-output-structure.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False,indent=2))
