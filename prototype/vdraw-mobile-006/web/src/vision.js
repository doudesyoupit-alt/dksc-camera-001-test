import {uid,clone,pageOf,element,newPage,project,validate,classes} from './core.js';
// A real provider requires a private authenticated job service. No automatic retry.
export class VisionJobs {
 constructor(){this.state='UNCONNECTED';this.provider=null;}
 async draft(){this.state='BLOCKED';throw Error('AI下書きは未接続です。写真の外部送信・費用は発生しません。手動作図で続けられます');}
 receive(d,result){
  if(result?.schema!=='vdraw-vision-result/1'||result.record?.status!=='CANDIDATE_READY'||!['real-providers','protocol-fixture'].includes(result.executionKind))throw Error('Vision結果の形式が対応外です');
  const c=result.candidate;
  if(!c||!d.sources.some(s=>s.id===c.sourceId)||c.sourceId!==pageOf(d).sourceId||!Array.isArray(c.elements)||c.elements.length>100||c.calibration!=='UNSCALED')throw Error('元資料・候補の対応を確認してください');
  const elements=c.elements.map(raw=>{const e={};for(const k of ['kind','name','category','x','y','w','h','points','fill','stroke','strokeWidth','text','fontSize','startAngle','endAngle'])if(raw[k]!==undefined)e[k]=clone(raw[k]);
   if(typeof e.name!=='string'||e.name.length>160||!classes.includes(e.category)||!Array.isArray(e.points)||e.points.length>2000)throw Error('候補の対象属性が不正です');return element(e.kind,e.name,{...e,...(typeof raw.sourceObjectId==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(raw.sourceObjectId)?{sourceObjectId:raw.sourceObjectId}:{}),origin:result.executionKind==='protocol-fixture'?'protocol-fixture':'ai-candidate'});});
  const check=project('候補検証');check.pages[0].elements=elements;validate(check);
  this.state='CANDIDATE_READY';return {id:uid(),kind:result.executionKind==='protocol-fixture'?'protocol-fixture':'provider-candidate',status:'pending',createdAt:new Date().toISOString(),sourceId:c.sourceId,elements,missingObjects:Array.isArray(c.missingObjects)?c.missingObjects.filter(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x)):[],calibration:'UNSCALED',note:'外部結果の候補。採用前に対象・形状・色を確認してください。'};
 }
 sampleCandidate(d){this.state='SAMPLE_READY';return {id:uid(),kind:'operation-sample',status:'pending',createdAt:new Date().toISOString(),sourceId:pageOf(d).sourceId,elements:[element('rect','下書きサンプル',{x:250,y:180,w:280,h:180,fill:'#C8D7BF',category:'未知対象',origin:'operation-sample'})],note:'操作確認用サンプル。実写真の認識結果ではありません。'};}
 adopt(d,c){if(c.kind==='provider-candidate'&&c.review?.status!=='reviewed')throw Error('候補を確認してから採用してください');const p=newPage('採用候補 '+(d.pages.length+1));p.sourceId=c.sourceId;p.elements=clone(c.elements);d.pages.push(p);d.activePageId=p.id;d.adoptions.push({candidateId:c.id,pageId:p.id,at:new Date().toISOString()});const saved=d.candidates.find(x=>x.id===c.id);if(saved)saved.status='adopted';return p;}
}
