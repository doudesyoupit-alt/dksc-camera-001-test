// Shared drawing CORE. No UI, browser storage or network dependencies.
export const clone = x => structuredClone(x);
export const uid = () => globalThis.crypto.randomUUID();
export const classes = ['建物','室内','家具','設備','車','人物','植栽','未知対象','汎用図形'];
export const pageOf = d => d.pages.find(p=>p.id===d.activePageId) || d.pages[0];
export function newPage(name='図面 1') {
 return {id:uid(),name,canvas:{width:1200,height:800,yAxis:'down'},elements:[],layers:[{id:'drawing',name:'図面',visible:true,locked:false}],sourceId:null,calibration:{status:'UNSCALED',references:[],mmPerUnit:null},view:{x:0,y:0,scale:1}};
}
export function project(title='名称未設定の現調') {
 const p=newPage(); return {schema:'vdraw-mobile/1',version:1,id:uid(),title,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),revision:0,activePageId:p.id,pages:[p],sources:[],candidates:[],adoptions:[],manualEvents:[],exports:[],importWarnings:[],sample:false};
}
export function element(kind='rect',name='新しい図形',extra={}) {
 return {id:uid(),kind,name,category:'汎用図形',x:260,y:220,w:240,h:160,points:[],fill:'#D5E3EF',stroke:'#394C63',strokeWidth:3,text:'文字',fontSize:30,visible:true,layerId:'drawing',origin:'manual',...extra};
}
export function validate(d) {
 if(d?.schema!=='vdraw-mobile/1'||d.version!==1||!d.id||typeof d.title!=='string'||!Array.isArray(d.pages)||!d.pages.length||d.pages.length>100)throw Error('案件の形式が対応外です');
 if(!Number.isInteger(d.revision)||d.revision<0||!Number.isFinite(Date.parse(d.updatedAt))||!Number.isFinite(Date.parse(d.createdAt))||d.title.length>160)throw Error('案件の管理情報が不正です');
 const ids=new Set();let count=0;
 for(const p of d.pages){if(ids.has(p.id))throw Error('ページIDが重複しています');ids.add(p.id);
  if(!p.canvas||![p.canvas.width,p.canvas.height].every(n=>Number.isFinite(n)&&n>0&&n<=10000)||!Array.isArray(p.elements))throw Error('ページの形式が不正です');
  if(typeof p.name!=='string'||!p.view||![p.view.x,p.view.y,p.view.scale].every(Number.isFinite)||p.view.scale<=0||!p.calibration||!Array.isArray(p.calibration.references)||!Array.isArray(p.layers))throw Error('ページの管理情報が不正です');
  const eids=new Set();for(const e of p.elements){if(eids.has(e.id)||!e.id)throw Error('対象IDが重複しています');eids.add(e.id);count++;
   if(!['rect','ellipse','line','polygon','text','dimension','arc'].includes(e.kind)||![e.x,e.y,e.w,e.h,e.strokeWidth].every(Number.isFinite)||e.w<0||e.h<0)throw Error('図形が不正です');
   if(!/^#[\da-f]{6}$/i.test(e.stroke)||!(e.fill==='none'||/^#[\da-f]{6}$/i.test(e.fill)))throw Error('色が不正です');
   if(e.kind==='arc'&&(!Number.isFinite(e.startAngle)||!Number.isFinite(e.endAngle)||e.w!==e.h||e.w<=0))throw Error('円弧が不正です');
   if(e.kind==='ellipse'&&(e.w<=0||e.h<=0))throw Error('楕円が不正です');
   if(typeof e.name!=='string'||typeof e.category!=='string'||typeof e.text!=='string'||!Number.isFinite(e.fontSize)||e.fontSize<=0||e.strokeWidth<0||e.strokeWidth>30)throw Error('対象の属性が不正です');
   if(!Array.isArray(e.points)||e.points.some(p=>p.length!==2||!p.every(Number.isFinite)))throw Error('頂点が不正です');
   if(e.kind==='polygon'&&e.points.length<3)throw Error('多角形の頂点が不足しています');
  }
 }if(count>5000)throw Error('この試作の対象上限は5000です');
 for(const k of ['sources','candidates','adoptions','manualEvents','exports','importWarnings'])if(!Array.isArray(d[k]))throw Error('案件履歴が不正です');
 if(!d.pages.some(p=>p.id===d.activePageId))throw Error('選択ページが不正です');return true;
}
export function bounds(e){if(e.kind==='polygon'){const xs=e.points.map(p=>p[0]),ys=e.points.map(p=>p[1]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}return{x:e.x,y:e.y,w:e.w,h:e.h};}
export function translate(e,dx,dy){e.x+=dx;e.y+=dy;if(e.kind==='polygon')e.points=e.points.map(([x,y])=>[x+dx,y+dy]);}
export function sample(){const d=project('室内レイアウトの検討');d.sample=true;const p=pageOf(d);p.name='1F リビング';
 p.elements=[element('rect','室内外周',{category:'建物',x:100,y:90,w:1000,h:620,fill:'#F5F2EC',stroke:'#536272',strokeWidth:8}),element('rect','窓',{category:'建物',x:340,y:86,w:310,h:18,fill:'#BFD6E4',stroke:'#768D9A',strokeWidth:3}),element('rect','ソファ',{category:'家具',x:220,y:205,w:310,h:150,fill:'#BACFC7',stroke:'#617A70'}),element('rect','テーブル',{category:'家具',x:575,y:280,w:190,h:130,fill:'#D8BEA0',stroke:'#927A60'}),element('ellipse','植栽',{category:'植栽',x:900,y:165,w:90,h:90,fill:'#A9C293',stroke:'#6B8855'}),element('line','配線ルート',{category:'設備',x:150,y:600,w:640,h:0,fill:'none',stroke:'#B88149',strokeWidth:2}),element('text','室名',{category:'室内',x:430,y:490,w:400,h:60,text:'リビング',fill:'#394C63',stroke:'#394C63',strokeWidth:0})];
 d.sources=[{id:uid(),name:'操作確認用サンプル.svg',type:'image/svg+xml',original:null,workImage:null,kind:'sample',locked:true,note:'合成の操作確認用サンプル。実写真・実AIの認識結果ではありません。'}];p.sourceId=d.sources[0].id;return d;
}

export function arcPoints(e){const start=e.startAngle*Math.PI/180,end=e.endAngle*Math.PI/180;let span=end-start;while(span<=0)span+=2*Math.PI;return Array.from({length:49},(_,i)=>[e.x+e.w/2+e.w/2*Math.cos(start+span*i/48),e.y+e.h/2+e.h/2*Math.sin(start+span*i/48)]);}
