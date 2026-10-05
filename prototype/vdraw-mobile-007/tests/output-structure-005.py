from pathlib import Path
import json,zipfile,xml.etree.ElementTree as E,hashlib
import ezdxf
r=Path('evidence');ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main'}
summary={}
for stem in ['fixture-pipeline','quality-fixture']:
 d=json.loads((r/(stem+'.json')).read_text());assert all(p['calibration']['status']=='UNSCALED' for p in d['pages'])
 with zipfile.ZipFile(r/(stem+'.pptx')) as z:
  assert z.testzip() is None
  slides=[E.fromstring(z.read(f'ppt/slides/slide{i+1}.xml')) for i in range(len(d['pages']))];counts=[]
  for pg,slide in zip(d['pages'],slides):
   shapes=slide.findall('p:cSld/p:spTree/p:sp',ns);pics=slide.findall('.//p:pic',ns);assert len(pics)==0
   names=[x.find('p:nvSpPr/p:cNvPr',ns).get('name') for x in shapes];expected=[e['id'] for e in pg['elements'] if e['visible']]
   # Dimensions intentionally expand to line + editable text. All other CORE targets remain ordered.
   expected=[n for name in expected for n in ([name,name+'-label'] if next(e for e in pg['elements'] if e['id']==name)['kind']=='dimension' else [name])]
   assert names==expected,(stem,names,expected)
   count={'nativeShapes':len(shapes),'images':len(pics),'editableTextRuns':len(slide.findall('.//a:t',ns)),'nativeFreeforms':len(slide.findall('.//a:custGeom',ns))};counts.append(count)
   for e in pg['elements']:
    sp=shapes[names.index(e['id'])]
    if e['kind']=='text':
     assert sp.find('p:spPr/a:solidFill/a:srgbClr/a:alpha',ns).get('val')=='0'
    if e['kind'] in ['polygon','arc']:
     path=sp.find('.//a:custGeom/a:pathLst/a:path',ns);assert path is not None
     assert (path.find('a:close',ns) is not None)==(e['kind']=='polygon')
    if e['fill']=='none':assert sp.find('.//a:solidFill/a:srgbClr/a:alpha',ns) is not None or sp.find('.//a:noFill',ns) is not None
   colors=[x.get('val','').upper() for x in slide.findall('.//a:srgbClr',ns)];assert '285EC6' not in colors
  assert any(x['editableTextRuns'] for x in counts) if stem=='quality-fixture' else True
 x=ezdxf.readfile(r/(stem+'.dxf'));audit=x.audit();assert not audit.errors and not audit.fixes;assert x.header['$INSUNITS']==0
 entities={k:len(x.modelspace().query(k)) for k in ['LINE','LWPOLYLINE','CIRCLE','ELLIPSE','ARC','TEXT','MTEXT','SPLINE']}
 if stem=='quality-fixture':
  assert all(entities[k]>0 for k in ['LINE','LWPOLYLINE','CIRCLE','ELLIPSE','ARC','TEXT','MTEXT'])
  assert all(e.closed for e in x.modelspace().query('LWPOLYLINE'))
  arc=x.modelspace().query('ARC').first;assert arc.dxf.start_angle==145 and arc.dxf.end_angle==345
 summary[stem]={'PPTX':counts,'orderedByCoreZOrder':True,'uiColorIncluded':False,'DXF':{'entities':entities,'layers':list(x.layers.entries),'INSUNITS':0,'auditErrors':0,'auditFixes':0},'pages':len(d['pages'])}
summary['limitations']={'partialOpacity':'CORE has no opacity attribute; no-fill/full-fill only','rotation':'CORE has no rotation property; oblique freeform geometry retained; object rotation not implemented','grouping':'CORE has no group model; objects individually editable, no group preservation claim','MTEXT':'Multiline CORE text emits MTEXT; single line emits TEXT','SPLINE':'No spline CORE kind; not fabricated','MicrosoftPowerPoint':'NOT_RUN','Jw_cad':'NOT_RUN'}
summary['files']=[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in r.iterdir() if p.name.startswith(('fixture-pipeline.','quality-fixture.')) and p.suffix in ['.pptx','.dxf','.json']]
summary['status']='PASS_SUPPORTED_CORE';(r/'output-structure.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False,indent=2))
