import {drawingSvg,esc} from './render.js';
import {bounds,arcPoints,classes} from './core.js';
import {readDataUrl} from './device.js';
let fontPromise;
async function portableSvg(p,s,include){fontPromise ||= fetch(new URL('../assets/NotoSansJP.ttf',import.meta.url)).then(r=>{if(!r.ok)throw Error('日本語フォントを読めません');return r.blob()}).then(readDataUrl);const font=await fontPromise,svg=drawingSvg(p,s,{sourceVisible:include}),index=svg.indexOf('>')+1;return svg.slice(0,index)+`<style>@font-face{font-family:VDRAWJP;src:url('${font}') format('truetype')} text{font-family:VDRAWJP,sans-serif}</style>`+svg.slice(index);}
export const formats=[{id:'pptx',title:'PowerPointで編集',ext:'PPTX',note:'色付きのネイティブ図形・文字。写真は選択した場合だけ添付。'}, {id:'pdf',title:'お客様に説明',ext:'PDF',note:'全ページを画像として配置。閲覧・説明用です。'}, {id:'dxf',title:'CADで仕上げ',ext:'DXF',note:'未校正の図面座標・単位なし。実寸図面ではありません。'}, {id:'png',title:'画像で共有',ext:'PNG',note:'現在のページ。位置情報を含まない画像。'}, {id:'svg',title:'ベクター画像',ext:'SVG',note:'現在のページ。図形・文字を保持。'}, {id:'xlsx',title:'対象一覧',ext:'XLSX',note:'全ページの対象名・分類・実色・寸法状態。'}, {id:'json',title:'案件バックアップ',ext:'JSON',note:'原本を含める場合は明示的に選択。既定では図面と作業用画像。'}];
const source=(d,p)=>d.sources.find(s=>s.id===p.sourceId);
// Match SVG's xMidYMid meet mapping in drawing coordinates before slide scaling.
// Read the sanitized PNG itself; page size is not a substitute for image dimensions.
function photoContain(data,canvas){
 const fail=()=>Error('写真の寸法・形式を確認できません。写真を添付せず出力するか、元写真を読み込み直してください');
 if(typeof data!=='string'||!data.startsWith('data:image/png;base64,')||data.length>32*1024*1024||!canvas||canvas.yAxis!=='down'||![canvas.width,canvas.height].every(n=>Number.isFinite(n)&&n>0&&n<=10000))throw fail();
 const encoded=data.slice(22);if(encoded.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw fail();
 let bytes;try{bytes=atob(encoded);}catch{throw fail();}
 const signature=[137,80,78,71,13,10,26,10],word=i=>[0,1,2,3].reduce((n,k)=>n*256+bytes.charCodeAt(i+k),0);
 if(bytes.length<57||signature.some((n,i)=>bytes.charCodeAt(i)!==n)||word(8)!==13||bytes.slice(12,16)!=='IHDR')throw fail();
 const width=word(16),height=word(20);if(![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=10000))throw fail();
 // IHDR CRC pins the dimension bytes. Chunk bounds reject truncated image data.
 let crc=0xffffffff;for(let i=12;i<29;i++){crc^=bytes.charCodeAt(i);for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}if(((crc^0xffffffff)>>>0)!==word(29))throw fail();
 let position=33,hasImageData=false,ended=false;
 while(position+12<=bytes.length){const length=word(position),type=bytes.slice(position+4,position+8),next=position+12+length;if(next>bytes.length||type==='IHDR')throw fail();if(type==='IDAT')hasImageData=true;if(type==='IEND'){if(length!==0||next!==bytes.length)throw fail();ended=true;break;}position=next;}
 if(!hasImageData||!ended)throw fail();
 const scale=Math.min(canvas.width/width,canvas.height/height);
 return {x:(canvas.width-width*scale)/2,y:(canvas.height-height*scale)/2,w:width*scale,h:height*scale};
}
export async function png(p,s,include=false){const svg=await portableSvg(p,s,include);const img=new Image();img.src=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{await img.decode();const c=document.createElement('canvas');c.width=p.canvas.width;c.height=p.canvas.height;c.getContext('2d').drawImage(img,0,0);return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('画像出力に失敗しました')),'image/png'));}finally{URL.revokeObjectURL(img.src);}}
async function pptx(d,include){const pptx=new window.PptxGenJS();pptx.defineLayout({name:'VDRAW',width:12,height:8});pptx.layout='VDRAW';pptx.author='VDRAW';pptx.subject='UNSCALED drawing coordinates / 手入力寸法は対象限定';pptx.title=d.title;
 const customs=[];
 for(const p of d.pages){const slide=pptx.addSlide(),k=Math.min(12/p.canvas.width,8/p.canvas.height),ox=(12-p.canvas.width*k)/2,oy=(8-p.canvas.height*k)/2;
  if(include&&source(d,p)?.workImage){const image=source(d,p).workImage,box=photoContain(image,p.canvas);slide.addImage({data:image,x:ox+box.x*k,y:oy+box.y*k,w:box.w*k,h:box.h*k,altText:'作業用写真・メタデータ除去済み'});}
  const custom=[];
  for(const e of p.elements.filter(e=>e.visible!==false)){const b=bounds(e),opts={x:ox+b.x*k,y:oy+b.y*k,w:Math.max(.0001,b.w*k),h:Math.max(.0001,b.h*k),fill:{color:e.fill==='none'?'FFFFFF':e.fill.slice(1),transparency:e.fill==='none'?100:0},line:{color:e.stroke.slice(1),width:Math.max(.1,e.strokeWidth*k*72)},objectName:e.id,rotate:0};
   if(e.kind==='text'){slide.addText(e.text,{...opts,fill:{color:'FFFFFF',transparency:100},line:{color:'FFFFFF',transparency:100},color:e.fill==='none'?e.stroke.slice(1):e.fill.slice(1),fontFace:'Yu Gothic',fontSize:e.fontSize*k*72,margin:0,breakLine:false});}
   else if(e.kind==='dimension'){slide.addShape('line',opts);slide.addText(`${e.text}（${e.dimension?.status==='MANUAL'?'手入力・対象のみ':'未校正'}）`,{x:opts.x,y:opts.y-.32,w:Math.max(2,opts.w),h:.3,color:e.stroke.slice(1),fontSize:12,margin:0,fontFace:'Yu Gothic',objectName:e.id+'-label'});}
   else {slide.addShape(e.kind==='ellipse'?'ellipse':e.kind==='line'?'line':'rect',opts);if(e.kind==='polygon'||e.kind==='arc')custom.push({name:e.id,points:e.kind==='arc'?arcPoints(e):e.points,b,closed:e.kind==='polygon'});}
  }customs.push(custom);slide.addNotes(`単位なし・未校正。写真全域の縮尺は確定していません。ページ: ${p.name}`);
 }
 // Replace polygon placeholders with native OOXML custom geometry, never a bitmap.
 const raw=await pptx.write({outputType:'blob'});const zip=await window.JSZip.loadAsync(raw);
 for(let i=0;i<customs.length;i++){if(!customs[i].length)continue;const path=`ppt/slides/slide${i+1}.xml`,xml=new DOMParser().parseFromString(await zip.file(path).async('string'),'application/xml');
  for(const c of customs[i]){const shapes=[...xml.getElementsByTagNameNS('*','sp')],sp=shapes.find(s=>s.getElementsByTagNameNS('*','cNvPr')[0]?.getAttribute('name')===c.name);if(!sp)throw Error('多角形の出力位置が見つかりません');
   const pr=sp.getElementsByTagNameNS('*','spPr')[0],old=pr.getElementsByTagNameNS('*','prstGeom')[0];if(old)old.remove();
   const pts=c.points.map(([x,y])=>[Math.round((x-c.b.x)/(c.b.w||1)*100000),Math.round((y-c.b.y)/(c.b.h||1)*100000)]);
   const g=`<a:custGeom xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="100000" b="100000"/><a:pathLst><a:path w="100000" h="100000"><a:moveTo><a:pt x="${pts[0][0]}" y="${pts[0][1]}"/></a:moveTo>${pts.slice(1).map(([x,y])=>`<a:lnTo><a:pt x="${x}" y="${y}"/></a:lnTo>`).join('')}${c.closed?'<a:close/>':''}</a:path></a:pathLst></a:custGeom>`;
   pr.appendChild(xml.importNode(new DOMParser().parseFromString(g,'application/xml').documentElement,true));
  }zip.file(path,new XMLSerializer().serializeToString(xml));
 }return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
}
function dxf(d){const out=[],pair=(a,b)=>out.push(String(a),String(b));
 const safe=s=>String(s).replace(/[\r\n]/g,' ').replace(/[^\x20-\x7E]/g,c=>'\\U+'+c.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0'));
 const layerFor=(p,e)=>'P'+(d.pages.indexOf(p)+1)+'_'+safe(e.layerId||'drawing').replace(/[<>/\\":;?*|=]/g,'_')+'_C'+(classes.indexOf(e.category)>=0?classes.indexOf(e.category)+1:safe(e.category));
 const layers=[...new Set(d.pages.flatMap(p=>p.elements.map(e=>layerFor(p,e))))];
 pair(0,'SECTION');pair(2,'HEADER');pair(9,'$ACADVER');pair(1,'AC1024');pair(9,'$INSUNITS');pair(70,0);pair(0,'ENDSEC');
 pair(0,'SECTION');pair(2,'TABLES');pair(0,'TABLE');pair(2,'LAYER');pair(5,'2');pair(70,layers.length);for(const name of layers){pair(0,'LAYER');pair(100,'AcDbSymbolTableRecord');pair(100,'AcDbLayerTableRecord');pair(2,name);pair(70,0);pair(62,7);pair(6,'CONTINUOUS');}pair(0,'ENDTAB');pair(0,'ENDSEC');
 pair(0,'SECTION');pair(2,'ENTITIES');let offset=0;
 for(const p of d.pages){for(const e of p.elements.filter(e=>e.visible!==false)){
  const common=type=>{pair(100,'AcDbEntity');pair(8,layerFor(p,e));pair(420,parseInt(e.stroke.slice(1),16));pair(100,type);};
  const text=(label,x,y,height)=>{pair(0,'TEXT');common('AcDbText');pair(10,x);pair(20,y);pair(30,0);pair(40,height);pair(1,safe(label));pair(100,'AcDbText');};
  if(e.kind==='text'&&/[\r\n]/.test(e.text)){pair(0,'MTEXT');common('AcDbMText');pair(10,e.x+offset);pair(20,p.canvas.height-e.y);pair(30,0);pair(40,e.fontSize);pair(41,Math.max(1,e.w));pair(71,1);pair(1,e.text.replace(/\r\n|\r/g,'\n').split('\n').map(t=>safe(t.replace(/\\/g,'\\\\').replace(/[{}]/g,c=>'\\'+c))).join('\\P'));}
  else if(e.kind==='text'){text(e.text,e.x+offset,p.canvas.height-e.y-e.fontSize,e.fontSize);}
  else if(e.kind==='line'||e.kind==='dimension'){pair(0,'LINE');common('AcDbLine');pair(10,e.x+offset);pair(20,p.canvas.height-e.y);pair(30,0);pair(11,e.x+e.w+offset);pair(21,p.canvas.height-e.y-e.h);pair(31,0);if(e.kind==='dimension')text(e.text+' [MANUAL / UNSCALED]',e.x+offset,p.canvas.height-e.y+18,26);}
  else if(e.kind==='arc'||(e.kind==='ellipse'&&e.w===e.h)){pair(0,e.kind==='arc'?'ARC':'CIRCLE');common('AcDbCircle');pair(10,e.x+e.w/2+offset);pair(20,p.canvas.height-e.y-e.h/2);pair(30,0);pair(40,e.w/2);if(e.kind==='arc'){pair(100,'AcDbArc');pair(50,(360-e.endAngle)%360);pair(51,(360-e.startAngle)%360);}}
  else if(e.kind==='ellipse'){pair(0,'ELLIPSE');common('AcDbEllipse');pair(10,e.x+e.w/2+offset);pair(20,p.canvas.height-e.y-e.h/2);pair(30,0);pair(11,e.w>=e.h?e.w/2:0);pair(21,e.h>e.w?e.h/2:0);pair(31,0);pair(40,Math.min(e.w,e.h)/Math.max(e.w,e.h));pair(41,0);pair(42,Math.PI*2);}
  else {const pts=e.kind==='polygon'?e.points:[[e.x,e.y],[e.x+e.w,e.y],[e.x+e.w,e.y+e.h],[e.x,e.y+e.h]];pair(0,'LWPOLYLINE');common('AcDbPolyline');pair(90,pts.length);pair(70,1);for(const [x,y]of pts){pair(10,x+offset);pair(20,p.canvas.height-y);}}
 }offset+=p.canvas.width+100;}pair(0,'ENDSEC');pair(0,'EOF');return new Blob([out.join('\r\n')+'\r\n'],{type:'application/dxf'});}
async function xlsx(d){const zip=new window.JSZip();const rows=[['ページ','対象名','分類','実色','線色','種類','寸法','寸法状態'],...d.pages.flatMap(p=>p.elements.map(e=>[p.name,e.name,e.category,e.fill,e.stroke,e.kind,e.dimension?.valueMm??'',e.dimension?.status??'未校正']))];
 zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
 zip.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 zip.file('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="対象一覧" sheetId="1" r:id="rId1"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
 zip.file('xl/worksheets/sheet1.xml',`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r,i)=>`<row r="${i+1}">${r.map((v,j)=>`<c r="${String.fromCharCode(65+j)}${i+1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`);return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
export async function exportFile(d,format,{includePhoto=false,includeOriginal=false}={}){
 const p=d.pages.find(p=>p.id===d.activePageId),s=source(d,p);switch(format){
  case 'pptx':return pptx(d,includePhoto);case 'dxf':return dxf(d);case 'xlsx':return xlsx(d);
  case 'svg':return new Blob([await portableSvg(p,s,includePhoto)],{type:'image/svg+xml'});case 'png':return png(p,s,includePhoto);
  case 'pdf':{const pdf=await window.PDFLib.PDFDocument.create();for(const p of d.pages){const img=await pdf.embedPng(await (await png(p,source(d,p),includePhoto)).arrayBuffer());const page=pdf.addPage([p.canvas.width*.6,p.canvas.height*.6]);page.drawImage(img,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});}pdf.setTitle(d.title);pdf.setSubject('説明用ラスタ画像 / 未校正');return new Blob([await pdf.save()],{type:'application/pdf'});}
  case 'json':{const copy=structuredClone(d);if(!includeOriginal)for(const s of copy.sources){delete s.original;s.originalOmitted=true;}return new Blob([JSON.stringify(copy,null,2)],{type:'application/json'});}
  default:throw Error('この出力は未接続です');
 }
}
