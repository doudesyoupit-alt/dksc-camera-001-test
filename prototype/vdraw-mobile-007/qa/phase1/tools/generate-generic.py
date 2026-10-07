"""QA-only deterministic raw OOXML fixtures; never external app or field evidence."""
import json,zipfile,hashlib
from pathlib import Path
from xml.sax.saxutils import escape
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'fixtures'
A='http://schemas.openxmlformats.org/drawingml/2006/main';P='http://schemas.openxmlformats.org/presentationml/2006/main';R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
def xf(x,y,w,h,extra=''):
 return f'<a:xfrm {extra}><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>'
def sp(i,name,preset,x,y,w,h,text='',extra='',hidden=False):
 nv=f'<p:nvSpPr><p:cNvPr id="{i}" name="{name}"'+(' hidden="1"' if hidden else '')+'/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
 return f'<p:sp>{nv}<p:spPr>{xf(x,y,w,h,extra)}<a:prstGeom prst="{preset}"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="ABCDEF"/></a:solidFill></p:spPr>{text}</p:sp>'
tx='<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="2400"/><a:t>分電盤</a:t></a:r><a:r><a:t>ABC</a:t></a:r><a:br/><a:r><a:t>1000</a:t></a:r></a:p><a:p><a:r><a:t>次行</a:t></a:r></a:p></p:txBody>'
shape=sp(2,'shape-text','rect',360000,720000,720000,360000,tx)
connector=f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="3" name="connector"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>{xf(914400,1828800,914400,0,"rot=\"5400000\" flipH=\"1\"")}<a:prstGeom prst="line"><a:avLst/></a:prstGeom></p:spPr></p:cxnSp>'
circle=sp(4,'circle','ellipse',360000,720000,360000,360000)
group='<p:grpSp><p:nvGrpSpPr><p:cNvPr id="5" name="group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="360000" y="720000"/><a:ext cx="720000" cy="1080000"/><a:chOff x="0" y="0"/><a:chExt cx="360000" cy="360000"/></a:xfrm></p:grpSpPr>'+sp(6,'group-child','rect',180000,120000,90000,180000)+'</p:grpSp>'
pic='<p:pic><p:nvPicPr><p:cNvPr id="7" name="unsupported-picture"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rMissing"/></p:blipFill><p:spPr>'+xf(0,0,360000,360000)+'</p:spPr></p:pic>'
graphic='<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="8" name="unsupported-table"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><a:graphic><a:graphicData uri="table"/></a:graphic></p:graphicFrame>'
unknown='<p:unknownShape><p:cNvPr id="9" name="future-object"/></p:unknownShape>'
hidden=sp(10,'hidden-rect','rect',0,0,360000,360000,hidden=True)
slide=f'<p:sld xmlns:p="{P}" xmlns:a="{A}" xmlns:r="{R}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name="root"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>{shape}{connector}{circle}{group}{pic}{graphic}{unknown}{hidden}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'
parts={'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>', '_rels/.rels':f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rRoot" Type="{R}/officeDocument" Target="ppt/presentation.xml"/></Relationships>', 'ppt/presentation.xml':f'<p:presentation xmlns:p="{P}" xmlns:a="{A}" xmlns:r="{R}"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="7200000" cy="5400000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>', 'ppt/_rels/presentation.xml.rels':f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{R}/slide" Target="slides/slide1.xml"/></Relationships>','ppt/slides/slide1.xml':slide}
OUT.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(OUT/'generic-synthetic-g01.pptx','w',compression=zipfile.ZIP_DEFLATED) as z:
 for name,data in sorted(parts.items()):
  info=zipfile.ZipInfo(name,date_time=(2026,10,7,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data)
truth={'classification':'GENERIC_SYNTHETIC_OOXML_NOT_EXTERNAL_APP','externalAppGoldenCount':0,'appVerification':'NOT_RUN','sourceSizeEmu':[7200000,5400000],'objects':{'2':{'kind':'sp','role':'DRAWABLE','partKinds':['geometry','text'],'text':'分電盤ABC\n1000\n次行','xfrm':{'x':360000,'y':720000,'cx':720000,'cy':360000},'globalBoxEmu':[360000,720000,720000,360000]},'3':{'kind':'cxnSp','role':'DRAWABLE','partKinds':['geometry'],'xfrm':{'x':914400,'y':1828800,'cx':914400,'cy':0,'rot':5400000,'flipH':True}},'4':{'kind':'sp','role':'DRAWABLE','partKinds':['geometry'],'preset':'ellipse','globalBoxEmu':[360000,720000,360000,360000]},'5':{'kind':'grpSp','role':'CONTAINER','partKinds':[]},'6':{'kind':'sp','role':'DRAWABLE','partKinds':['geometry'],'globalBoxEmu':[720000,1080000,180000,540000]},'7':{'kind':'pic','role':'DRAWABLE','partKinds':['unsupported'],'support':'UNSUPPORTED'},'8':{'kind':'graphicFrame','role':'DRAWABLE','partKinds':['unsupported'],'support':'UNSUPPORTED'},'9':{'kind':'unknownShape','role':'DRAWABLE','partKinds':['unsupported'],'support':'UNSUPPORTED'},'10':{'kind':'sp','role':'HIDDEN','partKinds':['geometry']}},'counts':{'sourceObjects':9,'containers':1,'drawableObjects':7,'hiddenObjects':1,'backgrounds':1,'parts':9,'unsupportedParts':3},'rootMetadataPolicy':'nvGrpSpPr/grpSpPr are infrastructure; preserved source XML, excluded drawable denominator; root id1 recorded as infrastructure, never an implicit source drawable'}
(OUT/'generic-synthetic-g01.truth.json').write_text(json.dumps(truth,ensure_ascii=False,indent=2)+'\n')

# Nested group: expected corners are fixed by independent hand algebra.
sub='<p:grpSp><p:nvGrpSpPr><p:cNvPr id="11" name="nested-flip-rotate"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm rot="5400000" flipH="1"><a:off x="90000" y="60000"/><a:ext cx="180000" cy="120000"/><a:chOff x="0" y="0"/><a:chExt cx="180000" cy="120000"/></a:xfrm></p:grpSpPr>'+sp(6,'group-child','rect',30000,20000,60000,40000)+'</p:grpSp>'
slide2=slide.replace(sp(6,'group-child','rect',180000,120000,90000,180000),sub)
parts2=dict(parts);parts2['ppt/slides/slide1.xml']=slide2
with zipfile.ZipFile(OUT/'generic-synthetic-g02-nested.pptx','w',compression=zipfile.ZIP_DEFLATED) as z:
 for name,data in sorted(parts2.items()):
  info=zipfile.ZipInfo(name,date_time=(2026,10,7,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data)
(OUT/'generic-synthetic-g02-nested.truth.json').write_text(json.dumps({'classification':'GENERIC_SYNTHETIC_OOXML_NOT_EXTERNAL_APP','expectedChildNativeId':'6','globalBoxEmu':[720000,1080000,80000,180000],'expectedBasisVectorXEmu':[0,-180000],'expectedBasisVectorYEmu':[-80000,0],'derivation':'inner 90-degree rotation with flipH gives local x=240000-y, y=210000-x; outer x=360000+2*x, y=720000+3*y','appVerification':'NOT_RUN'},indent=2)+'\n')

print(json.dumps({'fixtures':2,'synthetic':True,'externalAppEvidence':False}))
