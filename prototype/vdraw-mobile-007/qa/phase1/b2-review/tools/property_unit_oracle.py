"""G pre-output independent original-XML property/unit oracle. No B implementation import."""
import sys,json,hashlib,xml.etree.ElementTree as E
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'round3/tools'))
from source_truth import truth as source_truth
from independent_oracle import NS,local
A=NS['a'];P=NS['p'];TAG=lambda ns,k:'{'+ns+'}'+k

def oracle(path):
 t=source_truth(path);out={'schema':'vdraw-G-pre-B2-source-property-unit-truth/1','sourceHash':t['sourceHash'],'presentationOrder':t['presentationOrder'],'sourceSizeEmu':t['sourceSizeEmu'],'layoutMm':t['layoutMm'],'sourceObjectDenominator':t['denominators']['sourceObjects'],'componentDenominator':t['denominators']['components'],'backgroundDenominator':t['denominators']['backgrounds'],'scaleStatus':'UNSCALED','objects':[],'productGate':'HOLD'}
 for o in t['sourceObjects']:
  key=o['partPath']+'#'+o['canonicalXmlPath'];n=E.fromstring(o['nativeXml']);pr=n.find('p:spPr',NS);ln=pr.find('a:ln',NS) if pr is not None else None
  props={};owners={'fill':(pr,key+'/p:spPr'),'stroke':(ln,key+'/p:spPr/a:ln')};alphas=[]
  for field,(owner,prefix) in owners.items():
   nf=owner.find('a:noFill',NS) if owner is not None else None;rgb=owner.find('a:solidFill/a:srgbClr',NS) if owner is not None else None
   if nf is not None:props[field]={'state':'EXPLICIT','value':None,'encoding':'OOXML_NO_FILL','rawLexeme':'noFill','sourcePropertyPath':prefix+'/a:noFill','xml':E.tostring(nf,encoding='unicode')};continue
   if rgb is not None and rgb.attrib.get('val') and all(local(c)=='alpha' for c in rgb):
    props[field]={'state':'EXPLICIT','value':'#'+rgb.attrib['val'],'encoding':'HEX_RGB','rawLexeme':rgb.attrib['val'],'sourcePropertyPath':prefix+'/a:solidFill/a:srgbClr/@val','xml':E.tostring(rgb,encoding='unicode')}
    alpha=rgb.find('a:alpha',NS);alphas.append({'field':field,'rawLexeme':alpha.attrib['val'] if alpha is not None else None,'value':int(alpha.attrib['val'])/100000 if alpha is not None else None,'sourcePropertyPath':prefix+'/a:solidFill/a:srgbClr/a:alpha/@val'})
   else:props[field]={'state':'UNRESOLVED','value':None,'encoding':'UNRESOLVED','rawLexeme':None,'sourcePropertyPath':prefix,'reason':'RAW_PAINT_NOT_DIRECT_RGB_OR_NOFILL'}
  no_stroke=props['stroke']['state']=='EXPLICIT' and props['stroke']['value'] is None
  width=ln.attrib.get('w') if ln is not None else None;dash=ln.find('a:prstDash',NS) if ln is not None else None
  props['width']={'state':'NOT_APPLICABLE' if no_stroke else 'EXPLICIT' if width is not None else 'UNRESOLVED','value':None if no_stroke or width is None else int(width),'encoding':'NOT_APPLICABLE' if no_stroke else 'NUMBER' if width is not None else 'UNRESOLVED','rawLexeme':None if no_stroke else width,'sourcePropertyPath':key+'/p:spPr/a:ln/@w'}
  props['dash']={'state':'NOT_APPLICABLE' if no_stroke else 'UNRESOLVED','value':None,'encoding':'NOT_APPLICABLE' if no_stroke else 'UNRESOLVED','rawLexeme':None,'rawOOXMLLexeme':dash.attrib.get('val') if dash is not None else None,'sourcePropertyPath':key+'/p:spPr/a:ln/a:prstDash/@val','reason':'NO_NATIVE_DASH_ENCODING_ADOPTED' if not no_stroke else 'EXPLICIT_NOFILL_STROKE'}
  no_fill=props['fill']['state']=='EXPLICIT' and props['fill']['value'] is None
  opacity_known=bool(alphas) and all(a['rawLexeme'] is not None for a in alphas) and len(set(a['value'] for a in alphas))==1 and props['stroke']['state']=='EXPLICIT' and props['fill']['state']=='EXPLICIT'
  props['opacity']={'state':'NOT_APPLICABLE' if no_stroke and no_fill else 'EXPLICIT' if opacity_known else 'UNRESOLVED','value':None if no_stroke and no_fill or not opacity_known else alphas[0]['value'],'encoding':'NOT_APPLICABLE' if no_stroke and no_fill else 'OOXML_ALPHA_100000' if opacity_known else 'UNRESOLVED','rawLexeme':alphas[0]['rawLexeme'] if opacity_known else None,'sourcePropertyPath':alphas[0]['sourcePropertyPath'] if opacity_known else key+'/p:spPr','allPaintAlphas':alphas}
  custom=[]
  for p in o['geometryPaths']:custom.append({'coordinateUnit':'PATH_COORDINATE','pathExtent':p['extentPathUnits'],'rawVertices':p['verticesPathUnits'],'normalizationToShapeEMU':[o['xfrm']['cx']/p['extentPathUnits'][0],o['xfrm']['cy']/p['extentPathUnits'][1]],'pageVerticesEMU':p['globalVerticesEmu'],'pageVerticesLayoutMM':p['globalVerticesMm'],'requiredLedger':'CUSTOM_PATH_COORDINATE_FRAME_UNREPRESENTABLE'})
  out['objects'].append({'sourceKey':key,'partHash':o['partHash'],'nativeId':o['nativeId'],'kind':o['kind'],'role':o['role'],'preset':o['preset'],'rawXml':o['nativeXml'],'components':o['expectedComponents'],'nativeShapeCoordinateUnit':'EMU' if o['xfrm'] else None,'customPaths':custom,'properties':props,'orderedCornersEMU':o['orderedCornersEmu'],'orderedCornersMM':o['orderedCornersMm'],'basisEMU':o['basisEmu'],'xfrm':o['xfrm']})
 return out
if __name__=='__main__':Path(sys.argv[2]).write_text(json.dumps(oracle(sys.argv[1]),ensure_ascii=False,indent=2)+'\n')
