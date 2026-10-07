"""Deterministic synthetic OOXML, not external application output. Truth precedes adapter."""
import json,zipfile,hashlib,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'fixtures'
A='http://schemas.openxmlformats.org/drawingml/2006/main';P='http://schemas.openxmlformats.org/presentationml/2006/main';R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
def xf(x,y,w,h,extra=''):return f'<a:xfrm {extra}><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>'
def shape(i,g,x=-36000,y=72000,w=108000,h=72000,extra='',text='',color=None):
 color=color or '<a:solidFill><a:srgbClr val="123456"/></a:solidFill><a:ln w="3600"><a:solidFill><a:srgbClr val="654321"/></a:solidFill></a:ln>'
 return f'<p:sp><p:nvSpPr><p:cNvPr id="{i}" name="s{i}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>{xf(x,y,w,h,extra)}{g}{color}</p:spPr>{text}</p:sp>'
def preset(v):return f'<a:prstGeom prst="{v}"><a:avLst/></a:prstGeom>'
def path(vertices,closed=False,curved=False):
 commands=f'<a:moveTo><a:pt x="{vertices[0][0]}" y="{vertices[0][1]}"/></a:moveTo>'
 for x,y in vertices[1:]:commands+=f'<a:lnTo><a:pt x="{x}" y="{y}"/></a:lnTo>'
 if curved:commands+='<a:cubicBezTo><a:pt x="0" y="0"/><a:pt x="100" y="100"/><a:pt x="200" y="0"/></a:cubicBezTo>'
 if closed:commands+='<a:close/>'
 return f'<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="300" h="200">{commands}</a:path></a:pathLst></a:custGeom>'
tx='<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1200"/><a:t>電源 A</a:t></a:r><a:r><a:rPr sz="1200"/><a:t>＋B</a:t></a:r><a:br/><a:r><a:rPr sz="1200"/><a:t>行2</a:t></a:r></a:p><a:p><a:r><a:rPr sz="1200"/><a:t>次段落</a:t></a:r></a:p></p:txBody>'
verts=[[0,0],[300,0],[120,200]]
s1=shape(2,path(verts))+shape(3,path(verts,True))+shape(4,preset('triangle'))
for i,angle in [(5,0),(6,90),(7,359)]:s1+=shape(i,preset('line'),extra=f'rot="{angle*60000}" flipH="1"')
s1+=shape(8,preset('arc'),text=tx)+shape(9,path(verts,curved=True),text=tx)
s1+=shape(10,preset('rect'),text=tx)+shape(11,preset('rect'),color='<a:solidFill><a:schemeClr val="accent1"><a:tint val="20000"/></a:schemeClr></a:solidFill>')
s1+='<p:futureObject><p:cNvPr id="12" name="future"/></p:futureObject>'
def grp(i,body,xfm):return f'<p:grpSp><p:nvGrpSpPr><p:cNvPr id="{i}" name="g{i}"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr>{xfm}</p:grpSpPr>{body}</p:grpSp>'
inner='<a:xfrm rot="5400000" flipV="1"><a:off x="36000" y="-72000"/><a:ext cx="144000" cy="72000"/><a:chOff x="-36000" y="0"/><a:chExt cx="72000" cy="72000"/></a:xfrm>'
outer='<a:xfrm flipV="1"><a:off x="-360000" y="720000"/><a:ext cx="720000" cy="1080000"/><a:chOff x="0" y="0"/><a:chExt cx="360000" cy="360000"/></a:xfrm>'
s2=grp(2,grp(3,shape(4,preset('rect'),x=-18000,y=18000,w=36000,h=36000),inner),outer)+shape(5,preset('rect'),text=tx)
def slide(body,bg):return f'<p:sld xmlns:p="{P}" xmlns:a="{A}" xmlns:r="{R}"><p:cSld>{bg}<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name="root"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>{body}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'
bg='<p:bg><p:bgPr><a:solidFill><a:schemeClr val="bg1"/></a:solidFill></p:bgPr></p:bg>'
parts={'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>', '_rels/.rels':f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rRoot" Type="{R}/officeDocument" Target="ppt/presentation.xml"/></Relationships>', 'ppt/presentation.xml':f'<p:presentation xmlns:p="{P}" xmlns:r="{R}"><p:sldIdLst><p:sldId id="257" r:id="r2"/><p:sldId id="256" r:id="r1"/></p:sldIdLst><p:sldSz cx="7200000" cy="5400000"/></p:presentation>', 'ppt/_rels/presentation.xml.rels':f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="{R}/slide" Target="slides/slide1.xml"/><Relationship Id="r2" Type="{R}/slide" Target="slides/slide2.xml"/><Relationship Id="rt" Type="{R}/theme" Target="theme/theme1.xml"/></Relationships>', 'ppt/slides/slide1.xml':slide(s1,bg),'ppt/slides/slide2.xml':slide(s2,''),'ppt/slides/_rels/slide1.xml.rels':f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rl" Type="{R}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>','ppt/slideLayouts/slideLayout1.xml':f'<p:sldLayout xmlns:p="{P}" xmlns:a="{A}"><p:cSld><p:spTree/></p:cSld></p:sldLayout>', 'ppt/slideLayouts/_rels/slideLayout1.xml.rels':f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rm" Type="{R}/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>','ppt/slideMasters/slideMaster1.xml':f'<p:sldMaster xmlns:p="{P}" xmlns:a="{A}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="ABCDEF"/></a:solidFill></p:bgPr></p:bg><p:spTree/></p:cSld><p:clrMap accent1="accent1" bg1="lt1"/><p:txStyles><p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:bodyStyle></p:txStyles></p:sldMaster>', 'ppt/theme/theme1.xml':f'<a:theme xmlns:a="{A}" name="synthetic"><a:themeElements><a:clrScheme name="synthetic"><a:accent1><a:srgbClr val="336699"/></a:accent1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1></a:clrScheme></a:themeElements></a:theme>'}
OUT.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(OUT/'synthetic-g03-expanded.pptx','w',compression=zipfile.ZIP_DEFLATED) as z:
 for name,data in sorted(parts.items()):
  info=zipfile.ZipInfo(name,date_time=(2026,10,7,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data)
(OUT/'synthetic-g03-design-truth.json').write_text(json.dumps({'classification':'SYNTHETIC_RAW_XML_NOT_EXTERNAL_APP','externalAppGoldenCount':0,'realAppEvidence':'NOT_RUN','presentationOrder':['ppt/slides/slide2.xml','ppt/slides/slide1.xml'],'sourceSizeEmu':[7200000,5400000],'layoutMm':[200,150],'scaleStatus':'UNSCALED','openCustomPath':{'nativeId':'2','vertices':verts,'closed':False},'closedCustomPath':{'nativeId':'3','vertices':verts,'closed':True},'anglesDeg':[0,90,359],'exactText':'電源 A＋B\n行2\n次段落','nestedBasisHandAlgebra':{'part':'ppt/slides/slide2.xml','nativeId':'4','localOriginEmu':[90000,-72000],'localBasisXEmu':[0,72000],'localBasisYEmu':[36000,0],'globalOriginEmu':[-180000,2016000],'globalBasisXEmu':[0,-216000],'globalBasisYEmu':[72000,0]},'policy':'directly resolved primitive eligible; raw scheme/theme/master inheritance remains unresolved and ledgered, never assume defaults','unsupported':['arc preset','cubic custom path','future object'],'componentsIncludeGeometryAndText':True},ensure_ascii=False,indent=2)+'\n')
print('synthetic-g03-expanded.pptx generated')
