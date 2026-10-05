import {project,newPage,element,uid,validate} from './core.js';
import {readDataUrl,sanitizeImage} from './device.js';
const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('資料XMLを読めません');return d;};
const all=(n,name)=>[...n.getElementsByTagNameNS('*',name)],one=(n,name)=>all(n,name)[0];
export async function importFile(file){if(!file||file.size>30*1024*1024)throw Error('資料は30MB以下で選択してください');
 if(file.name.toLowerCase().endsWith('.json')){const d=JSON.parse(await file.text());validate(d);d.id=uid();d.title=(d.title.slice(0,140)+'（バックアップから復元）').slice(0,160);return d;}
 const d=project(file.name.replace(/\.[^.]+$/,'').slice(0,160));const source={id:uid(),name:file.name,type:file.type,original:await readDataUrl(file),workImage:null,locked:true,importedAt:new Date().toISOString(),kind:'original'};
 d.sources.push(source);const ext=file.name.split('.').pop().toLowerCase();
 if(['jpg','jpeg','png','webp','bmp'].includes(ext)||file.type.startsWith('image/')){const im=await sanitizeImage(file);source.workImage=im.dataUrl;source.kind='photo';d.pages[0].sourceId=source.id;d.pages[0].canvas.width=im.width;d.pages[0].canvas.height=im.height;source.note='原本と作業用PNGを分離。作業用画像は位置情報を含みません。';}
 else if(ext==='pdf'){const pdfjs=await import('../vendor/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.mjs',import.meta.url).href;
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
  if(pdf.numPages>20){await pdf.destroy();throw Error('この試作のPDF読込は20ページまでです');}d.pages=[];source.kind='pdf';source.nativeText=[];
  try{for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i),vp=pg.getViewport({scale:1}),scale=Math.min(2,1600/Math.max(vp.width,vp.height)),viewport=pg.getViewport({scale});const c=document.createElement('canvas');c.width=Math.ceil(viewport.width);c.height=Math.ceil(viewport.height);await pg.render({canvasContext:c.getContext('2d'),viewport}).promise;
   const s={...source,id:uid(),original:null,pageNumber:i,workImage:c.toDataURL('image/png'),nativeText:(await pg.getTextContent()).items.map(t=>({text:t.str,transform:t.transform,width:t.width,height:t.height}))};d.sources.push(s);const p=newPage('PDF '+i);p.canvas={width:c.width,height:c.height,yAxis:'down'};p.sourceId=s.id;d.pages.push(p);}
  }finally{await pdf.destroy();}d.activePageId=d.pages[0].id;d.importWarnings.push('PDFの原本と抽出文字を保持。ページ画像はロックされた参照です。PDFベクターの編集取込みは未接続。AI再推定はしていません。');
 }
 else if(ext==='pptx'){source.kind='pptx';const zip=await window.JSZip.loadAsync(await file.arrayBuffer());
  let total=0;for(const f of Object.values(zip.files)){total+=f._data?.uncompressedSize||0;}if(total>100*1024*1024)throw Error('展開後の資料が大きすぎます');
  const pres=xml(await zip.file('ppt/presentation.xml').async('string')),size=one(pres,'sldSz'),cx=Number(size?.getAttribute('cx')||10972800),cy=Number(size?.getAttribute('cy')||7315200);
  const rels=xml(await zip.file('ppt/_rels/presentation.xml.rels').async('string')),relsById=new Map(all(rels,'Relationship').map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
  const slides=all(pres,'sldId').map(n=>relsById.get(n.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'))).filter(Boolean);
  if(slides.length>50)throw Error('PPTXは50ページまでです');d.pages=[];let unsupported=0;
  for(let i=0;i<slides.length;i++){const path='ppt/'+slides[i].replace(/^\.\.\//,''),x=xml(await zip.file(path).async('string'));const p=newPage('スライド '+(i+1));p.sourceId=source.id;p.canvas={width:1200,height:1200*cy/cx,yAxis:'down'};
   for(const sp of all(x,'sp')){const pr=one(sp,'spPr'),xf=pr&&one(pr,'xfrm'),off=xf&&one(xf,'off'),ext=xf&&one(xf,'ext');if(!off||!ext||Number(xf.getAttribute('rot')||0)!==0||['flipH','flipV'].some(k=>['1','true'].includes(xf.getAttribute(k)))){unsupported++;continue;}
    const sx=1200/cx,sy=p.canvas.height/cy,b={x:Number(off.getAttribute('x'))*sx,y:Number(off.getAttribute('y'))*sy,w:Number(ext.getAttribute('cx'))*sx,h:Number(ext.getAttribute('cy'))*sy};
    const name=one(sp,'cNvPr')?.getAttribute('name')||'PPTX対象',text=all(sp,'t').map(n=>n.textContent).join('\n'),ln=pr&&one(pr,'ln'),rgb=pr&&all(pr,'solidFill').find(n=>n.parentNode===pr),fill=rgb&&one(rgb,'srgbClr')?.getAttribute('val'),stroke=ln&&one(ln,'srgbClr')?.getAttribute('val'),geom=one(pr,'prstGeom'),custom=one(pr,'custGeom');
    if(all(sp,'grpSp').length){unsupported++;continue;}const g=geom?.getAttribute('prst');
    if(text){const font=Number(one(sp,'rPr')?.getAttribute('sz')||2000)/100/72*914400*sx;const color=one(one(sp,'txBody')||sp,'srgbClr')?.getAttribute('val')||'394C63';p.elements.push(element('text',name,{...b,text,fontSize:font,fill:'#'+color,stroke:'#'+color,origin:'pptx-native'}));}
    else if(custom){if(!one(custom,'close')){unsupported++;continue;}const path=one(custom,'path'),w=Number(path?.getAttribute('w')),h=Number(path?.getAttribute('h'));if(!w||!h||all(custom,'cubicBezTo').length||all(custom,'arcTo').length||all(custom,'path').length!==1){unsupported++;continue;}
     const points=all(path,'pt').map(pt=>[b.x+Number(pt.getAttribute('x'))/w*b.w,b.y+Number(pt.getAttribute('y'))/h*b.h]);if(points.length<3){unsupported++;continue;}p.elements.push(element('polygon',name,{...b,points,fill:'#'+(fill||'D5E3EF'),stroke:'#'+(stroke||'394C63'),origin:'pptx-native'}));
    }else if(['rect','ellipse','line'].includes(g)){p.elements.push(element(g,name,{...b,fill:one(pr,'noFill')?'none':'#'+(fill||'D5E3EF'),stroke:'#'+(stroke||'394C63'),strokeWidth:Number(ln?.getAttribute('w')||28575)*sx,origin:'pptx-native'}));}else if(!text){unsupported++;}
   }unsupported+=all(x,'pic').length+all(x,'graphicFrame').length+all(x,'grpSp').length;d.pages.push(p);
  }if(!d.pages.length)throw Error('スライドがありません');d.activePageId=d.pages[0].id;
  d.importWarnings.push('PPTXの基本図形・文字・単純多角形を構造から取り込みました。原本を保持し、AI再推定はしていません。');
  if(unsupported)d.importWarnings.push(`${unsupported}件以上の画像・グループ・回転・複雑図形は編集取込み未対応。テーマ色・書式の完全再現も未確認。元資料を参照してください。`);
 }else throw Error('対応する画像・PDF・PPTX・案件JSONを選択してください');validate(d);return d;
}
