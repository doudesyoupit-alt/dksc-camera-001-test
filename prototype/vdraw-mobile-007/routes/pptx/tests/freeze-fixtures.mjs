import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pptx,shape,group,textRuns,slideXml} from './fixture-builder.mjs';
const directory=new URL('../fixtures/',import.meta.url);await mkdir(directory,{recursive:true});
const fixtures=[
 ['basic-components',shape(2,{kind:'line',h:0})+shape(3)+shape(4,{kind:'ellipse',w:100,h:100})+shape(5,{kind:'ellipse'})+shape(6,{text:textRuns})],
 ['connector-shape-text',shape(2,{kind:'line',tag:'cxnSp',extra:'flipH="1"',x:100,y:200,w:300,h:400})+shape(3,{text:textRuns})],
 ['basic-group',group(shape(2,{kind:'line',x:200,y:300,w:100,h:100}))],
 ['complex-affine',group(shape(2,{extra:'rot="2700000"',x:0,y:0,w:100,h:100})+shape(3,{kind:'ellipse',extra:'rot="2700000"',x:0,y:0,w:100,h:100}),{x:0,y:0,w:400,h:200,cx:0,cy:0,cw:200,ch:200})],
 ['unknown-hidden-background',null,{slides:[slideXml(shape(2,{attrs:'hidden="1"'})+'<p:pic/><p:graphicFrame/><u:future/>','<p:bg><p:bgPr/></p:bg>')]}],
 ['identity-collision',null,{slides:[slideXml(shape(2)+shape(2)),slideXml(shape(2))]}]
];
const rows=[];
for(const [name,content,options]of fixtures){const bytes=await pptx(content,options);await writeFile(new URL(name+'.pptx',directory),bytes);rows.push({id:'B-SYN-'+name,filename:name+'.pptx',origin:'SYNTHETIC_GENERIC_RAW_OOXML',SHA256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,realAppEvidence:false});}
await writeFile(new URL('manifest.json',directory),JSON.stringify({schema:'vdraw-pptx-inventory-fixtures/1',generator:'tests/freeze-fixtures.mjs',version:'1',fixtures:rows},null,2)+'\n');
console.log(JSON.stringify({frozenFixtureCount:rows.length,scope:'synthetic native ZIP only'}));
