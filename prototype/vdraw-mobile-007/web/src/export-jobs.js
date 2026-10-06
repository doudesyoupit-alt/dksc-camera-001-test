// Export jobs never read mutable UI settings after capture. Only one job owns
// delivery/history at a time; session identity also detects A -> B -> A.
const mimeTypes=Object.freeze({pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',dxf:'application/dxf',pdf:'application/pdf',png:'image/png',svg:'image/svg+xml',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',json:'application/json'});
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export class ExportJobs {
 constructor(){this.active=null;this.sequence=0;}
 begin({owner,document,format,options={},share=false}){
  if(this.active)return null;
  if(!mimeTypes[format])throw Error('この出力形式は未対応です');
  const copy=structuredClone(document),id='export-'+crypto.randomUUID()+'-'+(++this.sequence),at=new Date().toISOString();
  const settings={includePhoto:!!options.includePhoto,includeOriginal:format==='json'&&!!options.includeOriginal};
  const title=String(copy.title||'図面').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')||'図面';
  const snapshot=freeze({id,document:copy,projectId:copy.id,revision:copy.revision,format,options:settings,share:!!share,name:title+'.'+format,extension:format,mime:mimeTypes[format],at});
  const job=Object.freeze({snapshot,owner,document,signature:JSON.stringify(copy)});
  this.active=job;return job;
 }
 owns(job,owner,document){return this.active===job&&job.owner===owner&&job.document===document&&job.snapshot.projectId===document?.id&&job.snapshot.revision===document?.revision&&job.signature===JSON.stringify(document);}
 history(job,status){if(!['saved','downloaded','shared','share-requested'].includes(status))throw Error('共有・保存結果を確認できません');const s=job.snapshot;return {...s.options,id:s.id,jobId:s.id,projectId:s.projectId,format:s.format,fileName:s.name,extension:s.extension,mime:s.mime,status,at:s.at,revision:s.revision};}
 release(job){if(this.active!==job)return false;this.active=null;return true;}
}

