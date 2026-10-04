import {span,start,end,asyncSpan} from './perf.js';
import {validate,clone} from './core.js';
import {packHistory,unpackHistory,checkPackedHistory} from './history-codec.js';
export const DB_NAME='vdraw-mobile-prototype-006';
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',span('storage.stringify.encode',()=>new TextEncoder().encode(JSON.stringify(value)))))).map(n=>n.toString(16).padStart(2,'0')).join('');
export class LocalStore {
 constructor(){this.db=null;this.issues=[];this.expected=new Map();this.lastSaveInfo=null;this.queue=Promise.resolve();}
 async open(){if(this.db)return this.db;this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{r.result.createObjectStore('projects',{keyPath:'id'});r.result.createObjectStore('checkpoints',{keyPath:'id'});r.result.createObjectStore('meta');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('別の画面を閉じて保存を再試行してください'));});this.db.onversionchange=()=>{this.db.close();this.db=null};return this.db;}
 async transaction(mode,fn,name='projects'){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction(name,mode);let result;const r=fn(tx.objectStore(name));if(r)r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('端末保存に失敗しました'));tx.onabort=()=>reject(tx.error||Error('端末保存が中止されました'));});}
 async decode(record,withHistory=true){if(!record||!['vdraw-mobile-storage/2','vdraw-mobile-storage/3'].includes(record.storageSchema)||record.checksum!==await asyncSpan('storage.checksum.verify',()=>digest(record.payload)))throw Error('保存データの整合性を確認できません');validate(record.payload.doc);
 if(record.storageSchema==='vdraw-mobile-storage/3'){
  checkPackedHistory(record.payload.history);
  return {doc:record.payload.doc,history:withHistory?await asyncSpan('storage.history.decompress',()=>unpackHistory(record.payload.history)):null};
 }
 return withHistory?record.payload:{doc:record.payload.doc,history:null};}
 save(d,history=null){const snapshot=span('storage.snapshot.clone',()=>clone(d)),undo=span('storage.history.clone',()=>clone(history));const operation=this.queue.catch(()=>{}).then(()=>this.write(snapshot,undo));this.queue=operation;return operation;}
 async write(d,history){validate(d);const previous=await this.transaction('readonly',s=>s.get(d.id));if(previous){await this.decode(previous);if(this.expected.get(d.id)!==previous.checksum)throw Error('別の画面で案件が更新されました。再読込して確認してください');} // Never overwrite a corrupt record.
 const packed=await packHistory(history),isPacked=packed===null||packed?.codec==='deflate-base64/1';
 const payload={doc:d,history:packed};const record={id:d.id,storageSchema:isPacked?'vdraw-mobile-storage/3':'vdraw-mobile-storage/2',payload,checksum:await digest(payload)};
 const db=await this.open();await new Promise((resolve,reject)=>{const tx=db.transaction(['projects','checkpoints','meta'],'readwrite');const projects=tx.objectStore('projects'),r=projects.get(d.id);let reason;
 r.onsuccess=()=>{if((r.result?.checksum||null)!==(previous?.checksum||null)){reason=Error('別の画面で案件が更新されました。再読込して確認してください');tx.abort();return;}if(previous)tx.objectStore('checkpoints').put(previous);projects.put(record);tx.objectStore('meta').put(d.id,'lastProject');};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(reason||tx.error||Error('保存が中止されました'));});this.expected.set(d.id,record.checksum);this.lastSaveInfo={id:d.id,revision:d.revision,historyStored:!!packed,historyOmitted:!!history&&!packed};return d.revision;}
 async list(){const records=await asyncSpan('storage.list.idb.getAll',()=>this.transaction('readonly',s=>s.getAll()));this.issues=[];const documents=[];for(const r of records){try{documents.push((await this.decode(r,false)).doc);}catch(e){this.issues.push({id:r.id,message:e.message});}}return documents.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
 async load(id){return (await this.loadSession(id)).doc;}
 async loadSession(id){const record=await this.transaction('readonly',s=>s.get(id));const session=await this.decode(record);this.expected.set(id,record.checksum);return session;}
 async remember(id){await this.transaction("readwrite",s=>s.put(id,"lastProject"),"meta");}
 async lastProject(){return this.transaction('readonly',s=>s.get('lastProject'),'meta');}
 async recovery(id){return (await this.decode(await this.transaction('readonly',s=>s.get(id),'checkpoints'))).doc;}
 async recoverAsCopy(id){const d=await this.recovery(id);d.id=crypto.randomUUID();d.title+='（復旧コピー）';d.updatedAt=new Date().toISOString();await this.save(d);return d;}
 async requestPersistence(){return navigator.storage?.persist?await navigator.storage.persist():false;}
 async estimate(){return navigator.storage?.estimate?await navigator.storage.estimate():{};}
}
