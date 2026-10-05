import {span,asyncSpan} from './perf.js';
const MAX_BYTES=8*1024*1024;
function base64(bytes){let out='';for(let i=0;i<bytes.length;i+=32768)out+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(out);}
function encoded(h){if(h===null)return;if(!h||h.codec!=='deflate-base64/1'||!Number.isInteger(h.bytes)||h.bytes<1||h.bytes>MAX_BYTES||typeof h.data!=='string'||h.data.length>MAX_BYTES*2||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(h.data))throw Error('保存履歴の形式が不正です');}
export async function packHistory(history){
 if(!history)return null;
 const json=span('storage.history.stringify',()=>JSON.stringify(history));
 // Preserve the existing optional-history limit; do not silently promise unlimited history.
 if(json.length>=2000000)return null;
 if(typeof CompressionStream==='undefined')return history;
 const bytes=new TextEncoder().encode(json);if(bytes.length>MAX_BYTES)return null;
 const packed=await asyncSpan('storage.history.compress',async()=>new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer()));
 return {codec:'deflate-base64/1',bytes:bytes.length,data:base64(packed)};
}
export function checkPackedHistory(h){encoded(h);}
export async function unpackHistory(h){
 encoded(h);if(h===null)return null;
 if(typeof DecompressionStream==='undefined')throw Error('保存履歴の展開に対応していません。対応ブラウザで開いてください');
 try{
  const bytes=Uint8Array.from(atob(h.data),c=>c.charCodeAt(0));
  const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  let size=0;const chunks=[];
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>h.bytes||size>MAX_BYTES){await reader.cancel();throw Error();}chunks.push(value);}
  if(size!==h.bytes)throw Error();const result=new Uint8Array(size);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}
  const history=span('storage.history.json.parse',()=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(result)));
  if(!history||!Array.isArray(history.undo)||!Array.isArray(history.redo))throw Error();return history;
 }catch{throw Error('保存履歴の整合性を確認できません');}
}
