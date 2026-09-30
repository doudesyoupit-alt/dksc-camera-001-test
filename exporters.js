(function(global){
'use strict';

function pageFor(core,pageId){
  if(!core)return null;
  if(pageId && global.DKSC_CORE?.getPage)return global.DKSC_CORE.getPage(core,pageId);
  if(global.DKSC_CORE?.getActivePage)return global.DKSC_CORE.getActivePage(core);
  return core.pages?.find(p=>p.id===core.activePageId)||core.pages?.[0]||null;
}
function fmt(n){return Number(n||0).toFixed(3)}
function toDXF(core,{pageId=null}={}){
  const page=pageFor(core,pageId);
  if(!page)throw new Error('No page to export');

  const k=Number(page.calibration?.mmPerUnit)||1;
  const Y=y=>-Number(y||0)*k;
  let out=`0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
TABLES
0
ENDSEC
0
SECTION
2
ENTITIES
`;

  const line=(x1,y1,x2,y2,layer='0')=>{
    out+=`0
LINE
8
${layer}
10
${fmt(Number(x1)*k)}
20
${fmt(Y(y1))}
30
0
11
${fmt(Number(x2)*k)}
21
${fmt(Y(y2))}
31
0
`;
  };
  const text=(x,y,value,layer='TEXT',height=180)=>{
    const safe=String(value||'').replace(/[\r\n]/g,' ');
    out+=`0
TEXT
8
${layer}
10
${fmt(Number(x)*k)}
20
${fmt(Y(y))}
30
0
40
${Number(height)||180}
1
${safe}
`;
  };
  const box=(x,y,w,h,layer='BOX')=>{
    const x1=x-w/2,x2=x+w/2,y1=y-h/2,y2=y+h/2;
    line(x1,y1,x2,y1,layer);line(x2,y1,x2,y2,layer);
    line(x2,y2,x1,y2,layer);line(x1,y2,x1,y1,layer);
  };
  const ellipse=(x,y,w,h,layer='SHAPE')=>{
    const steps=36;
    let prev={x:x+w/2,y};
    for(let i=1;i<=steps;i++){
      const a=Math.PI*2*i/steps;
      const next={x:x+Math.cos(a)*w/2,y:y+Math.sin(a)*h/2};
      line(prev.x,prev.y,next.x,next.y,layer);
      prev=next;
    }
  };

  for(const o of page.elements||[]){
    if(o.visible===false)continue;

    if(o.type==='trace'&&o.points?.length>1){
      for(let i=1;i<o.points.length;i++){
        line(o.points[i-1].x,o.points[i-1].y,o.points[i].x,o.points[i].y,'TRACE');
      }
      if(o.closed&&o.points.length>2){
        line(o.points[o.points.length-1].x,o.points[o.points.length-1].y,o.points[0].x,o.points[0].y,'TRACE');
      }
    }else if(o.type==='shape'){
      if(o.shapeKind==='ellipse')ellipse(o.x,o.y,o.w,o.h,'SHAPE');
      else box(o.x,o.y,o.w,o.h,'SHAPE');
      if(o.text)text(o.x-o.w*.3,o.y,o.text,'TEXT',150);
    }else if(o.type==='text'){
      text(o.x,o.y,o.text||o.label||'','TEXT',150);
    }else if(o.type==='image'){
      box(o.x,o.y,o.w,o.h,'IMAGE_REF');
    }else if(o.type==='line'){
      line(o.p1.x,o.p1.y,o.p2.x,o.p2.y,'LINE');
    }else if(o.type==='room'){
      box(o.x,o.y,o.w,o.h,'ROOM');
      text(o.x-o.w*.18,o.y,o.label||'Room','ROOM_TEXT',220);
    }else if(o.type==='wall'){
      line(o.p1.x,o.p1.y,o.p2.x,o.p2.y,'WALL');
    }else if(o.type==='window'){
      box(o.x,o.y,o.w,o.h,'WINDOW');
    }else if(o.type==='door'){
      line(o.x-o.w/2,o.y+o.h/2,o.x+o.w/2,o.y+o.h/2,'DOOR');
      line(o.x-o.w/2,o.y+o.h/2,o.x+o.w/2,o.y-o.h/2,'DOOR');
    }else if(o.type==='furniture'){
      box(o.x,o.y,o.w||100,o.h||60,'FURNITURE');
    }else if(o.type==='device'){
      box(o.x,o.y,56,56,'DEVICE');
      text(o.x-20,o.y+42,o.label||o.kind||'Device','DEVICE_TEXT',150);
    }else if(o.type==='route'){
      line(o.p1.x,o.p1.y,o.p2.x,o.p2.y,'ROUTE');
    }else if(o.type==='dimension'){
      line(o.p1.x,o.p1.y,o.p2.x,o.p2.y,'DIMENSION');
      const value=Number(o.mm);
      const dimText=Number.isFinite(value)
        ? (value>=1000?(value/1000).toFixed(2)+' m':Math.round(value)+' mm')
        : '';
      text((o.p1.x+o.p2.x)/2,(o.p1.y+o.p2.y)/2-10,dimText,'DIM_TEXT',150);
    }else if(o.type==='note'){
      text(o.x,o.y,o.text||o.label||'','NOTE',180);
    }
  }

  out+=`0
ENDSEC
0
EOF
`;
  return out;
}


function pptxPageTransform(page){
  const w=Number(page?.canvas?.width)||1200;
  const h=Number(page?.canvas?.height)||800;
  const scale=Math.min(12/w,8/h);
  return{
    scale,
    ox:(12-w*scale)/2,
    oy:(8-h*scale)/2,
    x(v){return this.ox+Number(v||0)*this.scale},
    y(v){return this.oy+Number(v||0)*this.scale},
    w(v){return Number(v||0)*this.scale},
    h(v){return Number(v||0)*this.scale}
  };
}
function pptLine(slide,pptx,t,p1,p2,opt={}){
  slide.addShape(pptx.ShapeType.line,{
    x:t.x(p1.x),y:t.y(p1.y),
    w:t.w(p2.x-p1.x),h:t.h(p2.y-p1.y),
    line:{color:opt.color||'30343A',pt:opt.pt||1.2,dash:opt.dash||'solid'}
  });
}
function pptText(slide,t,value,x,y,w,h,opt={}){
  slide.addText(String(value||''),{
    x:t.x(x),y:t.y(y),w:Math.max(.1,t.w(w)),h:Math.max(.1,t.h(h)),
    fontFace:'Aptos',fontSize:opt.fontSize||10,bold:!!opt.bold,
    color:opt.color||'202020',align:opt.align||'center',valign:'mid',
    margin:0,fit:'shrink'
  });
}
function addElementToPptx(slide,pptx,t,o){
  if(o.visible===false)return;

  if(o.type==='trace'&&o.points?.length>1){
    for(let i=1;i<o.points.length;i++)pptLine(slide,pptx,t,o.points[i-1],o.points[i],{pt:1.1});
    if(o.closed&&o.points.length>2)pptLine(slide,pptx,t,o.points[o.points.length-1],o.points[0],{pt:1.1});
    return;
  }
  if(o.type==='shape'){
    const shape=o.shapeKind==='ellipse'?pptx.ShapeType.ellipse:o.shapeKind==='roundRect'?pptx.ShapeType.roundRect:pptx.ShapeType.rect;
    slide.addShape(shape,{
      x:t.x(o.x-o.w/2),y:t.y(o.y-o.h/2),w:t.w(o.w),h:t.h(o.h),
      fill:{color:'EEF2F6',transparency:5},line:{color:'4B5563',pt:1.1}
    });
    if(o.text)pptText(slide,t,o.text,o.x-o.w/2,o.y-o.h*.12,o.w,o.h*.24,{fontSize:9});
    return;
  }
  if(o.type==='text'){
    pptText(slide,t,o.text||o.label||'',o.x,o.y-(o.h||24)/2,o.w||160,o.h||30,{fontSize:10,align:'left'});
    return;
  }
  if(o.type==='image'){
    slide.addShape(pptx.ShapeType.rect,{
      x:t.x(o.x-o.w/2),y:t.y(o.y-o.h/2),w:t.w(o.w),h:t.h(o.h),
      fill:{color:'FFFFFF',transparency:100},line:{color:'64748B',pt:1,dash:'dash'}
    });
    pptText(slide,t,o.label||'Image',o.x-o.w/2,o.y-10,o.w,20,{fontSize:8,color:'64748B'});
    return;
  }
  if(o.type==='line'||o.type==='route'||o.type==='wall'){
    const pt=o.type==='wall'?4:o.type==='route'?2.5:1.1;
    pptLine(slide,pptx,t,o.p1,o.p2,{pt});
    return;
  }
  if(o.type==='room'){
    slide.addShape(pptx.ShapeType.rect,{
      x:t.x(o.x-o.w/2),y:t.y(o.y-o.h/2),w:t.w(o.w),h:t.h(o.h),
      fill:{color:'EFE6CC',transparency:2},line:{color:'4B4F54',pt:2}
    });
    pptText(slide,t,o.label||'Room',o.x-o.w/2,o.y-15,o.w,30,{fontSize:10,bold:true});
    return;
  }
  if(o.type==='window'){
    slide.addShape(pptx.ShapeType.rect,{
      x:t.x(o.x-o.w/2),y:t.y(o.y-o.h/2),w:t.w(o.w),h:t.h(o.h),
      fill:{color:'D9F2FF'},line:{color:'79CFFF',pt:1.3}
    });
    return;
  }
  if(o.type==='door'){
    pptLine(slide,pptx,t,{x:o.x-o.w/2,y:o.y+o.h/2},{x:o.x+o.w/2,y:o.y+o.h/2},{color:'B39467',pt:1.3});
    pptLine(slide,pptx,t,{x:o.x-o.w/2,y:o.y+o.h/2},{x:o.x+o.w/2,y:o.y-o.h/2},{color:'B39467',pt:1.3});
    return;
  }
  if(o.type==='furniture'){
    if(o.kind==='meetingTable'){
      slide.addShape(pptx.ShapeType.ellipse,{
        x:t.x(o.x-78),y:t.y(o.y-31),w:t.w(156),h:t.h(62),
        fill:{color:'F4EFE9'},line:{color:'C8C0B7',pt:1.1}
      });
    }else if(o.kind==='plant'){
      slide.addShape(pptx.ShapeType.ellipse,{
        x:t.x(o.x-20),y:t.y(o.y-20),w:t.w(40),h:t.h(40),
        fill:{color:'2AAE61'},line:{color:'19884A',pt:1}
      });
    }else{
      const fill=o.kind==='deskBench'?'FFAD47':o.kind==='sofa'?'D8C7B1':'D5851D';
      const w=o.w||100,h=o.h||60;
      slide.addShape(pptx.ShapeType.roundRect,{
        x:t.x(o.x-w/2),y:t.y(o.y-h/2),w:t.w(w),h:t.h(h),
        fill:{color:fill},line:{color:'A86C2A',pt:1}
      });
    }
    return;
  }
  if(o.type==='device'){
    const isRound=o.kind==='meter'||o.kind==='person';
    slide.addShape(isRound?pptx.ShapeType.ellipse:pptx.ShapeType.roundRect,{
      x:t.x(o.x-28),y:t.y(o.y-28),w:t.w(56),h:t.h(56),
      fill:{color:'EEF3F8'},line:{color:'54789B',pt:1.3}
    });
    pptText(slide,t,o.label||o.kind||'Device',o.x-50,o.y+31,100,24,{fontSize:7,bold:true});
    return;
  }
  if(o.type==='dimension'){
    pptLine(slide,pptx,t,o.p1,o.p2,{color:'D68500',pt:1});
    const mx=(o.p1.x+o.p2.x)/2,my=(o.p1.y+o.p2.y)/2;
    const mm=Number(o.mm);
    const label=Number.isFinite(mm)?(mm>=1000?(mm/1000).toFixed(2)+' m':Math.round(mm)+' mm'):'';
    pptText(slide,t,label,mx-55,my-16,110,28,{fontSize:9,bold:true,color:'7F5100'});
    return;
  }
  if(o.type==='note'){
    pptText(slide,t,o.text||o.label||'',o.x,o.y-20,180,40,{fontSize:10,bold:true,align:'left'});
  }
}
function buildPptx(core,title,PptxGenJS){
  if(!PptxGenJS)throw new Error('PptxGenJS is required');
  const c=global.DKSC_CORE?.normalizeCore?global.DKSC_CORE.normalizeCore(core):core;
  const pptx=new PptxGenJS();
  pptx.defineLayout({name:'DKSC_DRAWING',width:12,height:8});
  pptx.layout='DKSC_DRAWING';
  pptx.author='DKSC';
  pptx.company='DKSC';
  pptx.subject='DKSC editable drawing';
  pptx.title=title||c.document?.title||'DKSC Drawing';
  pptx.lang='ja-JP';

  for(const page of c.pages||[]){
    const slide=pptx.addSlide();
    slide.background={color:'FFFFFF'};
    const t=pptxPageTransform(page);
    for(const o of page.elements||[])addElementToPptx(slide,pptx,t,o);
  }
  if(!(c.pages||[]).length)pptx.addSlide();
  return pptx;
}


function xmlEscape(v){
  return String(v??'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function excelCol(n){
  let s='';
  while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}
  return s;
}
function sheetXml(rows){
  const parts=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'];
  rows.forEach((row,ri)=>{
    parts.push(`<row r="${ri+1}">`);
    row.forEach((value,ci)=>{
      const ref=`${excelCol(ci+1)}${ri+1}`;
      const style=ri===0?' s="1"':'';
      if(typeof value==='number'&&Number.isFinite(value)){
        parts.push(`<c r="${ref}"${style}><v>${value}</v></c>`);
      }else{
        parts.push(`<c r="${ref}" t="inlineStr"${style}><is><t>${xmlEscape(value)}</t></is></c>`);
      }
    });
    parts.push('</row>');
  });
  parts.push('</sheetData></worksheet>');
  return parts.join('');
}
function workbookRows(core,title){
  const c=global.DKSC_CORE?.normalizeCore?global.DKSC_CORE.normalizeCore(core):core;
  const summary=[
    ['項目','値'],
    ['案件名',title||c.document?.title||''],
    ['ページ数',(c.pages||[]).length],
    ['CORE schema',c.schema||''],
    ['出力日時',new Date().toISOString()]
  ];
  const pages=[['Page ID','Page名','種類','幅','高さ','mm/図面単位','要素数','寸法拘束数']];
  const objects=[['Page','ID','Type','Kind','Layer','名称/文字','X','Y','幅','高さ','X1','Y1','X2','Y2','寸法mm','Source']];
  const dimensions=[['Page','Element ID','寸法mm','X1','Y1','X2','Y2','Constraint status','mm/図面単位']];

  for(const p of c.pages||[]){
    pages.push([
      p.id,p.name,p.kind,p.canvas?.width||'',p.canvas?.height||'',
      p.calibration?.mmPerUnit||'',p.elements?.length||0,p.constraints?.length||0
    ]);
    for(const o of p.elements||[]){
      objects.push([
        p.name,o.id,o.type,o.kind||'',o.layerId||'',
        o.text||o.label||'',
        o.x??'',o.y??'',o.w??'',o.h??'',
        o.p1?.x??'',o.p1?.y??'',o.p2?.x??'',o.p2?.y??'',
        o.mm??'',o.source||''
      ]);
      if(o.type==='dimension'){
        const constraint=(p.constraints||[]).find(x=>x.type==='distance'&&x.elementId===o.id);
        dimensions.push([
          p.name,o.id,o.mm??'',
          o.p1?.x??'',o.p1?.y??'',o.p2?.x??'',o.p2?.y??'',
          constraint?.status||'',p.calibration?.mmPerUnit||''
        ]);
      }
    }
  }
  return{summary,pages,objects,dimensions};
}
async function toXlsxBytes(core,title,ZipLib){
  if(!ZipLib)throw new Error('JSZip is required');
  const rows=workbookRows(core,title);
  const zip=new ZipLib();

  zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);

  zip.folder('_rels').file('.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  zip.folder('xl').file('workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="概要" sheetId="1" r:id="rId1"/>
<sheet name="Pages" sheetId="2" r:id="rId2"/>
<sheet name="Objects" sheetId="3" r:id="rId3"/>
<sheet name="Dimensions" sheetId="4" r:id="rId4"/>
</sheets>
</workbook>`);

  zip.folder('xl').folder('_rels').file('workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.folder('xl').file('styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
</styleSheet>`);

  const ws=zip.folder('xl').folder('worksheets');
  ws.file('sheet1.xml',sheetXml(rows.summary));
  ws.file('sheet2.xml',sheetXml(rows.pages));
  ws.file('sheet3.xml',sheetXml(rows.objects));
  ws.file('sheet4.xml',sheetXml(rows.dimensions));

  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}

function jpegSize(bytes){
  const b=bytes;
  if(b[0]!==0xFF||b[1]!==0xD8)throw new Error('Invalid JPEG');
  let i=2;
  while(i<b.length){
    if(b[i]!==0xFF){i++;continue}
    const marker=b[i+1];
    if(marker===0xD9||marker===0xDA)break;
    const len=(b[i+2]<<8)+b[i+3];
    if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)){
      return{height:(b[i+5]<<8)+b[i+6],width:(b[i+7]<<8)+b[i+8]};
    }
    i+=2+len;
  }
  throw new Error('JPEG size not found');
}
function concatBytes(chunks){
  const total=chunks.reduce((n,c)=>n+c.length,0);
  const out=new Uint8Array(total);
  let pos=0;
  for(const c of chunks){out.set(c,pos);pos+=c.length}
  return out;
}
function ascii(s){return new TextEncoder().encode(s)}
function jpegPagesToPdf(pages){
  if(!pages?.length)throw new Error('No PDF pages');
  const chunks=[];
  const offsets=[0];
  let pos=0;
  const push=chunk=>{const c=typeof chunk==='string'?ascii(chunk):chunk;chunks.push(c);pos+=c.length};

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  const pageObjIds=[];
  const contentObjIds=[];
  const imageObjIds=[];
  for(let i=0;i<pages.length;i++){
    pageObjIds.push(3+i*3);
    contentObjIds.push(4+i*3);
    imageObjIds.push(5+i*3);
  }
  const lastObj=2+pages.length*3;

  function beginObj(id){offsets[id]=pos;push(`${id} 0 obj\n`)}
  function endObj(){push('endobj\n')}

  beginObj(1);push('<< /Type /Catalog /Pages 2 0 R >>\n');endObj();

  beginObj(2);
  push(`<< /Type /Pages /Count ${pages.length} /Kids [${pageObjIds.map(id=>`${id} 0 R`).join(' ')}] >>\n`);
  endObj();

  for(let i=0;i<pages.length;i++){
    const p=pages[i];
    const bytes=p.bytes instanceof Uint8Array?p.bytes:new Uint8Array(p.bytes);
    const size=p.width&&p.height?{width:p.width,height:p.height}:jpegSize(bytes);
    const mediaW=842,mediaH=595;
    const scale=Math.min(mediaW/size.width,mediaH/size.height);
    const dw=size.width*scale,dh=size.height*scale;
    const dx=(mediaW-dw)/2,dy=(mediaH-dh)/2;
    const content=`q\n${dw.toFixed(3)} 0 0 ${dh.toFixed(3)} ${dx.toFixed(3)} ${dy.toFixed(3)} cm\n/Im${i+1} Do\nQ\n`;

    beginObj(pageObjIds[i]);
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${mediaW} ${mediaH}] /Resources << /XObject << /Im${i+1} ${imageObjIds[i]} 0 R >> >> /Contents ${contentObjIds[i]} 0 R >>\n`);
    endObj();

    beginObj(contentObjIds[i]);
    push(`<< /Length ${ascii(content).length} >>\nstream\n${content}endstream\n`);
    endObj();

    beginObj(imageObjIds[i]);
    push(`<< /Type /XObject /Subtype /Image /Width ${size.width} /Height ${size.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
    push(bytes);
    push('\nendstream\n');
    endObj();
  }

  const xref=pos;
  push(`xref\n0 ${lastObj+1}\n`);
  push('0000000000 65535 f \n');
  for(let id=1;id<=lastObj;id++){
    push(String(offsets[id]||0).padStart(10,'0')+' 00000 n \n');
  }
  push(`trailer\n<< /Size ${lastObj+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return concatBytes(chunks);
}

global.DKSC_EXPORT={
  toDXF,
  pageFor,
  buildPptx,
  addElementToPptx,
  toXlsxBytes,
  jpegPagesToPdf,
  jpegSize
};
})(typeof window!=='undefined'?window:globalThis);
