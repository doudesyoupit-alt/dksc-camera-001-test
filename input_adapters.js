(function(global){
'use strict';

const PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDFJS_WORKER_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

function ext(name=''){
  const m=String(name).toLowerCase().match(/\.([^.]+)$/);
  return m?m[1]:'';
}
function decodeXml(s=''){
  return String(s)
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&apos;/g,"'")
    .replace(/&amp;/g,'&');
}
function attrs(tag=''){
  const out={};
  tag.replace(/([\w:.-]+)="([^"]*)"/g,(_,k,v)=>{out[k]=decodeXml(v)});
  return out;
}
function firstTag(block,name){
  const m=block.match(new RegExp(`<${name}\\b[^>]*>`,'i'));
  return m?m[0]:'';
}
function textRuns(block=''){
  return [...block.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
    .map(m=>decodeXml(m[1]))
    .join('');
}
function numericAttr(tag,key,def=0){
  const a=attrs(tag);
  const n=Number(a[key]);
  return Number.isFinite(n)?n:def;
}
function xfrmBox(block){
  const xfrm=block.match(/<a:xfrm\b[\s\S]*?<\/a:xfrm>/)?.[0]||'';
  const off=firstTag(xfrm,'a:off');
  const extTag=firstTag(xfrm,'a:ext');
  return{
    x:numericAttr(off,'x'),
    y:numericAttr(off,'y'),
    w:numericAttr(extTag,'cx'),
    h:numericAttr(extTag,'cy')
  };
}
function mapBox(box,sx,sy){
  return{
    x:(box.x+box.w/2)*sx,
    y:(box.y+box.h/2)*sy,
    w:Math.max(1,box.w*sx),
    h:Math.max(1,box.h*sy)
  };
}
function slideFiles(zip){
  return Object.keys(zip.files)
    .filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x))
    .sort((a,b)=>{
      const na=Number(a.match(/slide(\d+)/)[1]);
      const nb=Number(b.match(/slide(\d+)/)[1]);
      return na-nb;
    });
}
function parsePresentationSize(xml=''){
  const m=xml.match(/<p:sldSz\b[^>]*>/);
  if(!m)return{cx:12192000,cy:6858000};
  return{
    cx:numericAttr(m[0],'cx',12192000),
    cy:numericAttr(m[0],'cy',6858000)
  };
}
function pptShapeKind(block){
  const geom=block.match(/<a:prstGeom\b[^>]*prst="([^"]+)"/)?.[1]||'rect';
  if(geom==='ellipse')return'ellipse';
  if(geom==='roundRect')return'roundRect';
  if(geom==='line')return'line';
  return'rect';
}
function parsePptxSlide(xml,slideIndex,slideSize){
  const canvasW=1200;
  const canvasH=Math.max(300,Math.round(canvasW*slideSize.cy/slideSize.cx));
  const sx=canvasW/slideSize.cx;
  const sy=canvasH/slideSize.cy;
  const elements=[];
  let seq=0;
  const nextId=type=>`pptx-s${slideIndex+1}-${type}-${++seq}`;

  // Normal shapes and text boxes.
  for(const match of xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)){
    const block=match[0];
    const box=mapBox(xfrmBox(block),sx,sy);
    const text=textRuns(block).trim();
    const shapeKind=pptShapeKind(block);

    if(shapeKind==='line'){
      elements.push({
        id:nextId('line'),type:'line',kind:'line',
        p1:{x:box.x-box.w/2,y:box.y-box.h/2},
        p2:{x:box.x+box.w/2,y:box.y+box.h/2},
        layerId:'route',source:'pptx'
      });
      continue;
    }

    const hasGeometry=/<a:prstGeom\b/.test(block);
    if(hasGeometry && box.w>1 && box.h>1){
      elements.push({
        id:nextId('shape'),type:'shape',kind:'shape',
        shapeKind,x:box.x,y:box.y,w:box.w,h:box.h,
        text,label:text,layerId:'shape',source:'pptx'
      });
    }else if(text){
      elements.push({
        id:nextId('text'),type:'text',kind:'text',
        x:box.x,y:box.y,w:Math.max(box.w,80),h:Math.max(box.h,24),
        text,label:text,layerId:'text',source:'pptx'
      });
    }
  }

  // Connectors / line objects.
  for(const match of xml.matchAll(/<p:cxnSp\b[\s\S]*?<\/p:cxnSp>/g)){
    const block=match[0];
    const raw=xfrmBox(block);
    const p1={x:raw.x*sx,y:raw.y*sy};
    const p2={x:(raw.x+raw.w)*sx,y:(raw.y+raw.h)*sy};
    elements.push({
      id:nextId('connector'),type:'line',kind:'connector',
      p1,p2,layerId:'route',source:'pptx'
    });
  }

  // Pictures are retained as editable placeholders until media extraction is implemented.
  for(const match of xml.matchAll(/<p:pic\b[\s\S]*?<\/p:pic>/g)){
    const block=match[0];
    const box=mapBox(xfrmBox(block),sx,sy);
    const name=attrs(firstTag(block,'p:cNvPr')).name||'Image';
    elements.push({
      id:nextId('image'),type:'image',kind:'image',
      x:box.x,y:box.y,w:box.w,h:box.h,
      label:name,layerId:'image',source:'pptx'
    });
  }

  return{
    canvas:{width:canvasW,height:canvasH,yAxis:'down'},
    elements,
    metadata:{slideIndex:slideIndex+1}
  };
}
async function importPptxArrayBuffer(buffer,fileMeta,Core,ZipLib){
  if(!ZipLib)throw new Error('JSZip is not available');
  const zip=await ZipLib.loadAsync(buffer);
  const presFile=zip.file('ppt/presentation.xml');
  if(!presFile)throw new Error('Invalid PPTX: presentation.xml missing');
  const presXml=await presFile.async('string');
  const slideSize=parsePresentationSize(presXml);
  const files=slideFiles(zip);
  if(!files.length)throw new Error('PPTX has no slides');

  const sourceId='source-pptx-1';
  const pages=[];
  for(let i=0;i<files.length;i++){
    const xml=await zip.file(files[i]).async('string');
    const parsed=parsePptxSlide(xml,i,slideSize);
    pages.push(Core.createPage({
      id:`page-${i+1}`,
      name:`Slide ${i+1}`,
      index:i,
      kind:'slide',
      canvas:parsed.canvas,
      elements:parsed.elements,
      sourceDocumentRefs:[sourceId],
      metadata:{
        ...parsed.metadata,
        sourcePath:files[i],
        adapter:'pptx'
      }
    }));
  }

  return{
    kind:'pptx',
    title:fileMeta?.name||'PowerPoint',
    warnings:[],
    core:Core.createCore({
      document:{
        id:'document-1',
        title:fileMeta?.name||'PowerPoint',
        metadata:{adapter:'pptx'},
        sourceDocuments:[{
          id:sourceId,kind:'pptx',name:fileMeta?.name||'PowerPoint',
          metadata:{size:fileMeta?.size||0,lastModified:fileMeta?.lastModified||null}
        }]
      },
      pages,
      activePageId:pages[0].id
    })
  };
}
async function importPptxFile(file,Core,ZipLib){
  return importPptxArrayBuffer(await file.arrayBuffer(),{
    name:file.name,size:file.size,lastModified:file.lastModified
  },Core,ZipLib);
}

let pdfModulePromise=null;
async function loadPdfJs(){
  if(!pdfModulePromise){
    pdfModulePromise=import(PDFJS_URL).then(mod=>{
      if(mod.GlobalWorkerOptions)mod.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_URL;
      return mod;
    });
  }
  return pdfModulePromise;
}
async function importPdfFile(file,Core){
  const pdfjs=await loadPdfJs();
  const bytes=new Uint8Array(await file.arrayBuffer());
  const pdf=await pdfjs.getDocument({data:bytes}).promise;
  const sourceId='source-pdf-1';
  const pages=[];

  for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
    const page=await pdf.getPage(pageNo);
    const viewport=page.getViewport({scale:1});
    const canvasW=1200;
    const canvasH=Math.max(200,Math.round(canvasW*viewport.height/viewport.width));
    const sx=canvasW/viewport.width;
    const sy=canvasH/viewport.height;
    const content=await page.getTextContent();
    const elements=[];

    let seq=0;
    for(const item of content.items||[]){
      if(!item?.str)continue;
      const tr=item.transform||[1,0,0,1,0,0];
      const fontH=Math.max(8,Math.hypot(tr[0],tr[1])*sy);
      elements.push({
        id:`pdf-p${pageNo}-text-${++seq}`,
        type:'text',kind:'text',
        x:Number(tr[4]||0)*sx,
        y:canvasH-Number(tr[5]||0)*sy,
        w:Math.max(20,Number(item.width||0)*sx),
        h:fontH,
        text:item.str,label:item.str,
        layerId:'text',source:'pdf'
      });
    }

    pages.push(Core.createPage({
      id:`page-${pageNo}`,
      name:`Page ${pageNo}`,
      index:pageNo-1,
      kind:'pdf-page',
      canvas:{width:canvasW,height:canvasH,yAxis:'down'},
      elements,
      sourceDocumentRefs:[sourceId],
      metadata:{
        adapter:'pdf',
        pageNumber:pageNo,
        importLevel:'text-and-page-structure'
      }
    }));
  }

  return{
    kind:'pdf',
    title:file.name||'PDF',
    warnings:['PDF vector path extraction is deferred; text and page structure imported.'],
    core:Core.createCore({
      document:{
        id:'document-1',
        title:file.name||'PDF',
        metadata:{adapter:'pdf'},
        sourceDocuments:[{
          id:sourceId,kind:'pdf',name:file.name||'PDF',
          metadata:{size:file.size||0,lastModified:file.lastModified||null,pageCount:pdf.numPages}
        }]
      },
      pages,
      activePageId:pages[0]?.id
    })
  };
}
async function importFile(file,{Core=global.DKSC_CORE,ZipLib=global.JSZip}={}){
  if(!file)throw new Error('No file');
  const e=ext(file.name);
  if(e==='pptx')return importPptxFile(file,Core,ZipLib);
  if(e==='pdf')return importPdfFile(file,Core);
  throw new Error(`Unsupported input: .${e||'unknown'}`);
}

global.DKSC_INPUT={
  PDFJS_URL,
  PDFJS_WORKER_URL,
  importFile,
  importPptxFile,
  importPptxArrayBuffer,
  importPdfFile,
  parsePptxSlide,
  parsePresentationSize
};
})(typeof window!=='undefined'?window:globalThis);
