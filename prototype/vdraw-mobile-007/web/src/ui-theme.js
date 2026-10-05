// Presentation only. No project, geometry, persistence or provider mutation.
export const stateLabel={NOT_RUN:'未実行',BLOCKED:'未接続',RUNNING:'処理中',PASS:'完了',SUCCEEDED:'完了',COMPLETED:'完了',FAILED:'失敗',CANCELLED:'中止'};
export const exportCopy={pptx:['PowerPoint','あとから図形・文字を編集する'],dxf:['DXF','CADで編集する'],pdf:['PDF','閲覧・共有する'],png:['PNG','画像として共有する'],svg:['SVG','ベクター画像として使う'],json:['案件バックアップ','ページ・図形・履歴の復旧用'],xlsx:['Excel','対象一覧を確認する']};
export function safeNotice(value){const text=String(value??'');return /(?:TypeError|ReferenceError|SyntaxError|stack|Unexpected|undefined|Failed to fetch|ENOENT|https?:\/\/|endpoint|JSON\.parse)/i.test(text)?'操作を完了できませんでした。入力を確認し、もう一度お試しください。':text;}
export function noticeKind(text){return /失敗|できません|不正|不足|破損/.test(text)?'error':/未接続|未校正|確認|キャンセル/.test(text)?'warning':/保存しました|完了|作成しました/.test(text)?'success':'info';}
export function traceSteps(source,vision,report){
 const stages=report?.stages||[],find=(names)=>stages.find(s=>names.includes(s.stage));
 const map=[['画像読込',['PHOTO']],['解析',['SCENE']],['輪郭抽出',['SEGMENTATION']],['図面生成',['GEOMETRY']],['確認',['HUMAN_REVIEW']]];
 return map.map(([label,names],i)=>{const stage=find(names);let status=stage?.status||'NOT_RUN';if(!stage&&i===0&&source?.workImage)status='PASS';if(!stage&&i===1&&vision?.state==='BLOCKED')status='BLOCKED';return {label,status:stateLabel[status]?status:'NOT_RUN',text:stateLabel[status]||'未実行'};});
}
let returnFocus=null;
export function enterSheet(modal){returnFocus=document.activeElement;document.querySelector('#app').inert=modal;requestAnimationFrame(()=>document.querySelector('.sheet [data-action=dismiss]')?.focus({preventScroll:true}));}
export function leaveSheet(){document.querySelector('#app').inert=false;if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;}
export function syncViewport(){const v=window.visualViewport;document.documentElement.style.setProperty('--keyboard-offset',Math.max(0,window.innerHeight-(v?.height||window.innerHeight)-(v?.offsetTop||0))+'px');}
export function focusDimension(){requestAnimationFrame(()=>{const n=document.querySelector('#dimension-value');n?.focus({preventScroll:true});n?.scrollIntoView({block:'nearest'});});}
export function exportBusy(busy){const s=document.querySelector('.export-status');if(s){s.textContent=busy?'ファイルを作成中…':'形式を選んで保存・共有';s.setAttribute('aria-busy',String(busy));}for(const b of document.querySelectorAll('.export-actions button'))b.disabled=busy;}
document.addEventListener('keydown',e=>{const s=document.querySelector('.sheet');if(!s)return;if(e.key==='Escape'){e.preventDefault();s.querySelector('[data-action=dismiss]')?.click();}if(e.key==='Tab'&&s.getAttribute('aria-modal')==='true'){const nodes=[...s.querySelectorAll('button,input,select,summary,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
window.visualViewport?.addEventListener('resize',syncViewport);window.visualViewport?.addEventListener('scroll',syncViewport);syncViewport();
