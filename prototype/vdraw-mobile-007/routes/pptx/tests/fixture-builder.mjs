// Explicitly SYNTHETIC raw native OOXML packages. Not PowerPoint app evidence.
import {createRequire} from 'node:module';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/runtime.js');
export const JSZip=require('jszip');
export const P='http://schemas.openxmlformats.org/presentationml/2006/main';
export const A='http://schemas.openxmlformats.org/drawingml/2006/main';
export const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL='http://schemas.openxmlformats.org/package/2006/relationships';
export const directStyle='<a:noFill/><a:ln w="3600"><a:solidFill><a:srgbClr val="123456"/></a:solidFill></a:ln>';
export function shape(id=2,{kind='rect',x=36000,y=72000,w=108000,h=144000,extra='',text='',attrs='',geometry='',style=directStyle,tag='sp'}={}){
 return `<p:${tag}><p:${tag==='cxnSp'?'nvCxnSpPr':'nvSpPr'}><p:cNvPr id="${id}" name="s${id}" ${attrs}/><p:${tag==='cxnSp'?'cNvCxnSpPr':'cNvSpPr'}/><p:nvPr/></p:${tag==='cxnSp'?'nvCxnSpPr':'nvSpPr'}><p:spPr><a:xfrm ${extra}><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>${geometry||`<a:prstGeom prst="${kind}"><a:avLst/></a:prstGeom>`}${style}</p:spPr>${text}</p:${tag}>`;
}
export function group(contents,{id=5,x=1000,y=2000,w=1000,h=800,cx=100,cy=200,cw=500,ch=400,extra=''}={}){
 return `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="${id}" name="g${id}"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm ${extra}><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/><a:chOff x="${cx}" y="${cy}"/><a:chExt cx="${cw}" cy="${ch}"/></a:xfrm></p:grpSpPr>${contents}</p:grpSp>`;
}
export const textRuns='<p:txBody><a:bodyPr anchor="t"/><a:lstStyle/><a:p><a:r><a:rPr sz="1200"/><a:t>AB</a:t></a:r><a:r><a:rPr sz="1200"/><a:t>日本語</a:t></a:r><a:br/><a:r><a:t>C</a:t></a:r></a:p><a:p><a:r><a:t>D</a:t></a:r></a:p></p:txBody>';
export const rootMetadata='<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>';
export const slideXml=(content,bg='')=>`<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}" xmlns:u="urn:unknown"><p:cSld>${bg}<p:spTree>${rootMetadata}${content}</p:spTree></p:cSld></p:sld>`;
export async function pptx(contents,{slides=null,presentation=null,presentationRels=null,extraParts={},slideRels={}}={}){
 const z=new JSZip();z.file('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>`);
 z.file('_rels/.rels',`<Relationships xmlns="${REL}"><Relationship Id="root" Type="${R}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`);
 const pages=slides||[slideXml(contents)],ids=pages.map((_,i)=>`<p:sldId id="${256+i}" r:id="s${i}"/>`).join('');
 z.file('ppt/presentation.xml',presentation||`<p:presentation xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="10972800" cy="7315200"/></p:presentation>`);
 z.file('ppt/_rels/presentation.xml.rels',presentationRels||`<Relationships xmlns="${REL}">${pages.map((_,i)=>`<Relationship Id="s${i}" Type="${R}/slide" Target="slides/slide${i+1}.xml"/>`).join('')}</Relationships>`);
 pages.forEach((s,i)=>z.file(`ppt/slides/slide${i+1}.xml`,s));for(const [p,s]of Object.entries(extraParts))z.file(p,s);for(const [i,s]of Object.entries(slideRels))z.file(`ppt/slides/_rels/slide${i}.xml.rels`,s);
 for(const entry of Object.values(z.files))entry.date=new Date('2000-01-01T00:00:00Z');
 return new Uint8Array(await z.generateAsync({type:'uint8array',compression:'DEFLATE',platform:'DOS'}));
}
