(function(global){
'use strict';

const CORE_SCHEMA='dksc-core/2';
const CORE_VERSION=2;
const LEGACY_CORE_SCHEMA='dksc-core/1';

const DEFAULT_CANVAS={width:1200,height:800,yAxis:'down'};

const DEFAULT_LAYERS=[
  {id:'trace',name:'Trace',visible:true,locked:false},
  {id:'room',name:'Room',visible:true,locked:false},
  {id:'wall',name:'Wall',visible:true,locked:false},
  {id:'opening',name:'Opening',visible:true,locked:false},
  {id:'furniture',name:'Furniture',visible:true,locked:false},
  {id:'device',name:'Device',visible:true,locked:false},
  {id:'route',name:'Route',visible:true,locked:false},
  {id:'dimension',name:'Dimension',visible:true,locked:false},
  {id:'text',name:'Text',visible:true,locked:false},
  {id:'shape',name:'Shape',visible:true,locked:false},
  {id:'image',name:'Image',visible:true,locked:false}
];

function clone(v){
  return v==null?v:JSON.parse(JSON.stringify(v));
}
function stableId(prefix='id'){
  stableId._n=(stableId._n||0)+1;
  return `${prefix}-${stableId._n}`;
}
function defaultLayerForType(type){
  if(type==='trace')return'trace';
  if(type==='room')return'room';
  if(type==='wall')return'wall';
  if(type==='door'||type==='window')return'opening';
  if(type==='furniture')return'furniture';
  if(type==='device')return'device';
  if(type==='route'||type==='line')return'route';
  if(type==='dimension')return'dimension';
  if(type==='note'||type==='text')return'text';
  if(type==='shape')return'shape';
  if(type==='image')return'image';
  return'trace';
}
function normalizeElement(input,index=0){
  const e={...(input||{})};
  e.id=e.id||`legacy-element-${index+1}`;
  e.type=e.type||'trace';
  e.kind=e.kind||e.type;
  e.layerId=e.layerId||defaultLayerForType(e.type);
  e.source=e.source||'unknown';
  if(e.visible===undefined)e.visible=true;
  if(e.locked===undefined)e.locked=false;
  return e;
}
function distanceUnits(a,b){
  if(!a||!b)return 0;
  return Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y));
}
function normalizeSourceDocument(input,index=0){
  const d={...(input||{})};
  d.id=d.id||`source-${index+1}`;
  d.kind=d.kind||d.type||'unknown';
  d.name=d.name||d.filename||`Source ${index+1}`;
  d.metadata={...(d.metadata||{})};
  return d;
}
function createConstraintFromDimension(element,index=0){
  const mm=Number(element?.mm);
  const units=distanceUnits(element?.p1,element?.p2);
  if(element?.type!=='dimension'||!element?.manualMm||!Number.isFinite(mm)||mm<=0||units<=0)return null;
  return{
    id:`dim-${element.id||index+1}`,
    type:'distance',
    elementId:element.id||null,
    valueMm:mm,
    distanceUnits:units,
    mmPerUnit:mm/units,
    startRef:clone(element.startRef||null),
    endRef:clone(element.endRef||null),
    source:element.source||'legacy',
    status:'active'
  };
}
function uniqueById(items,prefix='item'){
  const map=new Map();
  let n=0;
  for(const item of items||[]){
    if(!item)continue;
    n++;
    const id=item.id||`${prefix}-${n}`;
    map.set(id,{...item,id});
  }
  return[...map.values()];
}

function createPage(options={}){
  const elements=(options.elements||[]).map(normalizeElement);
  let constraints=uniqueById(clone(options.constraints||[]),'constraint');
  if(!constraints.length){
    constraints=elements.map(createConstraintFromDimension).filter(Boolean);
  }

  const mm=Number(options.mmPerUnit ?? options.calibration?.mmPerUnit);
  const index=Number.isInteger(options.index)?options.index:0;
  const id=options.id||`page-${index+1}`;

  return{
    id,
    name:options.name||options.title||`Page ${index+1}`,
    index,
    kind:options.kind||'sheet',
    canvas:{...DEFAULT_CANVAS,...(options.canvas||{})},
    layers:clone(options.layers||DEFAULT_LAYERS),
    calibration:{
      mmPerUnit:Number.isFinite(mm)&&mm>0?mm:10,
      references:clone(options.references ?? options.calibration?.references ?? [])
    },
    elements,
    constraints,
    sourceDocumentRefs:[...(options.sourceDocumentRefs||[])],
    metadata:{...(options.metadata||{})}
  };
}

function normalizePage(input,index=0){
  return createPage({
    ...(input||{}),
    index:Number.isInteger(input?.index)?input.index:index,
    id:input?.id||`page-${index+1}`,
    name:input?.name||input?.title||`Page ${index+1}`
  });
}

function createDocumentMeta(input={}){
  return{
    id:input.id||'document-1',
    title:input.title||'',
    metadata:{...(input.metadata||{})},
    assets:clone(input.assets||[]),
    sourceDocuments:(input.sourceDocuments||[]).map(normalizeSourceDocument)
  };
}

function bindActivePageAliases(core){
  if(!core||typeof core!=='object')return core;

  const active=()=>getActivePage(core);

  const defs={
    elements:{
      get(){return active().elements},
      set(v){active().elements=(Array.isArray(v)?v:[]).map(normalizeElement)}
    },
    constraints:{
      get(){return active().constraints},
      set(v){active().constraints=uniqueById(Array.isArray(v)?v:[],'constraint')}
    },
    layers:{
      get(){return active().layers},
      set(v){active().layers=clone(Array.isArray(v)&&v.length?v:DEFAULT_LAYERS)}
    },
    calibration:{
      get(){return active().calibration},
      set(v){
        const mm=Number(v?.mmPerUnit);
        active().calibration={
          mmPerUnit:Number.isFinite(mm)&&mm>0?mm:10,
          references:clone(v?.references||[])
        };
      }
    },
    sourceDocuments:{
      get(){return core.document.sourceDocuments},
      set(v){core.document.sourceDocuments=(v||[]).map(normalizeSourceDocument)}
    }
  };

  for(const [name,desc] of Object.entries(defs)){
    try{delete core[name]}catch{}
    Object.defineProperty(core,name,{
      configurable:true,
      enumerable:false,
      ...desc
    });
  }
  return core;
}

function createCore(options={}){
  const document=createDocumentMeta(options.document||{});
  const pages=(options.pages&&options.pages.length)
    ? options.pages.map(normalizePage)
    : [createPage({
        id:'page-1',
        name:'Page 1',
        index:0,
        elements:options.elements||[],
        constraints:options.constraints||[],
        layers:options.layers||DEFAULT_LAYERS,
        canvas:options.canvas,
        mmPerUnit:options.mmPerUnit,
        references:options.references,
        sourceDocumentRefs:options.sourceDocumentRefs||[]
      })];

  const activePageId=pages.some(p=>p.id===options.activePageId)
    ? options.activePageId
    : pages[0].id;

  return bindActivePageAliases({
    schema:CORE_SCHEMA,
    version:CORE_VERSION,
    document,
    pages,
    activePageId
  });
}

function migrateCoreV1ToV2(raw={}){
  const sourceDocs=(raw.sourceDocuments||[]).map(normalizeSourceDocument);
  const sourceRefs=sourceDocs.map(d=>d.id);

  return createCore({
    document:{
      id:'document-1',
      title:raw.title||'',
      metadata:{migratedFrom:raw.schema||LEGACY_CORE_SCHEMA},
      assets:raw.assets||[],
      sourceDocuments:sourceDocs
    },
    pages:[{
      id:'page-1',
      name:'Page 1',
      index:0,
      kind:'sheet',
      canvas:raw.canvas||DEFAULT_CANVAS,
      layers:raw.layers||DEFAULT_LAYERS,
      calibration:raw.calibration||{mmPerUnit:10,references:[]},
      elements:raw.elements||[],
      constraints:raw.constraints||[],
      sourceDocumentRefs:sourceRefs,
      metadata:{migratedFrom:'CORE v1'}
    }],
    activePageId:'page-1'
  });
}

function normalizeCore(raw){
  if(!raw||typeof raw!=='object')return createCore();

  if(raw.schema===CORE_SCHEMA || Array.isArray(raw.pages)){
    const pages=(raw.pages||[]).map(normalizePage);
    return createCore({
      document:raw.document||{},
      pages:pages.length?pages:[createPage()],
      activePageId:raw.activePageId
    });
  }

  // Explicit v1 or any legacy flat core.
  if(raw.schema===LEGACY_CORE_SCHEMA || Array.isArray(raw.elements)){
    return migrateCoreV1ToV2(raw);
  }

  return createCore();
}

function getPage(core,pageId){
  const c=core;
  return c.pages.find(p=>p.id===pageId)||null;
}
function getActivePage(core){
  const found=getPage(core,core.activePageId);
  if(found)return found;
  if(!core.pages.length)core.pages.push(createPage());
  core.activePageId=core.pages[0].id;
  return core.pages[0];
}
function setActivePage(core,pageId){
  if(!getPage(core,pageId))return false;
  core.activePageId=pageId;
  bindActivePageAliases(core);
  return true;
}
function addPage(core,options={}){
  const c=normalizeCore(core);
  const page=normalizePage({
    ...options,
    index:c.pages.length,
    id:options.id||`page-${c.pages.length+1}`,
    name:options.name||`Page ${c.pages.length+1}`
  },c.pages.length);

  if(c.pages.some(p=>p.id===page.id)){
    page.id=`page-${c.pages.length+1}-${Date.now()}`;
  }
  c.pages.push(page);
  if(options.activate!==false)c.activePageId=page.id;
  bindActivePageAliases(c);
  return{core:c,page};
}
function removePage(core,pageId){
  const c=normalizeCore(core);
  if(c.pages.length<=1)return{core:c,ok:false,error:'last-page'};
  const index=c.pages.findIndex(p=>p.id===pageId);
  if(index<0)return{core:c,ok:false,error:'page-not-found'};
  c.pages.splice(index,1);
  c.pages.forEach((p,i)=>p.index=i);
  if(c.activePageId===pageId)c.activePageId=c.pages[Math.max(0,index-1)].id;
  bindActivePageAliases(c);
  return{core:c,ok:true};
}

function migrateAppState(raw={},defaults={}){
  const legacyObjects=Array.isArray(raw.objects)?raw.objects:null;
  const legacyScale=Number(raw.scaleMmPerUnit);
  const state={...clone(defaults),...clone(raw)};

  if(raw.core&&typeof raw.core==='object'){
    state.core=normalizeCore(raw.core);
  }else{
    const defaultMm=Number(defaults.core?.calibration?.mmPerUnit)||10;
    state.core=createCore({
      elements:legacyObjects||[],
      mmPerUnit:Number.isFinite(legacyScale)&&legacyScale>0?legacyScale:defaultMm
    });
  }

  delete state.objects;
  delete state.scaleMmPerUnit;
  return state;
}

function bindLegacyAliases(state){
  if(!state||typeof state!=='object')throw new Error('state required');
  state.core=normalizeCore(state.core);
  bindActivePageAliases(state.core);

  try{delete state.objects}catch{}
  try{delete state.scaleMmPerUnit}catch{}

  Object.defineProperty(state,'objects',{
    configurable:true,
    enumerable:false,
    get(){return getActivePage(this.core).elements},
    set(v){getActivePage(this.core).elements=(Array.isArray(v)?v:[]).map(normalizeElement)}
  });

  Object.defineProperty(state,'scaleMmPerUnit',{
    configurable:true,
    enumerable:false,
    get(){return getActivePage(this.core).calibration.mmPerUnit},
    set(v){
      const n=Number(v);
      if(Number.isFinite(n)&&n>0)getActivePage(this.core).calibration.mmPerUnit=n;
    }
  });
  return state;
}

function serializeCore(core){
  const c=normalizeCore(core);
  return{
    schema:CORE_SCHEMA,
    version:CORE_VERSION,
    document:clone(c.document),
    pages:clone(c.pages),
    activePageId:c.activePageId
  };
}
function serializeAppState(state){
  const out={};
  for(const [k,v] of Object.entries(state||{})){
    if(k==='objects'||k==='scaleMmPerUnit'||k==='core')continue;
    out[k]=clone(v);
  }
  out.core=serializeCore(state?.core);
  return out;
}
function snapshotCore(core){
  return JSON.stringify({core:serializeCore(core)});
}
function restoreCoreSnapshot(raw){
  const parsed=typeof raw==='string'?JSON.parse(raw):raw;
  return normalizeCore(parsed?.core||parsed);
}

/* ======================== Dimension CORE ======================== */
function median(values){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const i=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;
}
function dimensionConstraintFor(core,elementId,pageId=null){
  const page=pageId?getPage(core,pageId):getActivePage(core);
  return(page?.constraints||[]).find(c=>c.type==='distance'&&c.elementId===elementId)||null;
}
function upsertDimensionConstraint(core,element,valueMm,options={}){
  const c=normalizeCore(core);
  const page=options.pageId?getPage(c,options.pageId):getActivePage(c);
  if(!page)return{core:c,ok:false,error:'page-not-found'};

  const mm=Number(valueMm);
  const units=distanceUnits(element?.p1,element?.p2);
  if(!element||element.type!=='dimension'||!Number.isFinite(mm)||mm<=0||units<=0){
    return{core:c,ok:false,error:'invalid-dimension'};
  }

  const id=`dim-${element.id}`;
  const next={
    id,
    type:'distance',
    elementId:element.id,
    valueMm:mm,
    distanceUnits:units,
    mmPerUnit:mm/units,
    startRef:clone(options.startRef??element.startRef??null),
    endRef:clone(options.endRef??element.endRef??null),
    source:options.source||element.source||'user',
    status:'active'
  };

  page.constraints=(page.constraints||[]).filter(x=>!(x.type==='distance'&&x.elementId===element.id));
  page.constraints.push(next);

  const target=page.elements.find(x=>x.id===element.id);
  if(target){
    target.mm=mm;
    target.manualMm=true;
    target.constraintId=id;
  }

  const result=recalculateCalibration(c,options.tolerance??0.03,page.id);
  return{core:result.core,ok:true,constraint:next,...result};
}
function recalculateCalibration(core,tolerance=0.03,pageId=null){
  const c=normalizeCore(core);
  const page=pageId?getPage(c,pageId):getActivePage(c);
  if(!page)return{core:c,mmPerUnit:10,conflicts:[],references:[]};

  const refs=(page.constraints||[])
    .filter(x=>x.type==='distance'&&x.status!=='disabled')
    .map(x=>{
      const el=page.elements.find(e=>e.id===x.elementId);
      const units=el?distanceUnits(el.p1,el.p2):Number(x.distanceUnits);
      const mm=Number(x.valueMm);
      const estimate=units>0&&mm>0?mm/units:NaN;
      return{...x,distanceUnits:units,mmPerUnit:estimate};
    })
    .filter(x=>Number.isFinite(x.mmPerUnit)&&x.mmPerUnit>0);

  if(!refs.length){
    return{core:c,mmPerUnit:page.calibration.mmPerUnit,conflicts:[],references:[]};
  }

  const m=median(refs.map(x=>x.mmPerUnit));
  const conflicts=[];

  page.constraints=page.constraints.map(x=>{
    if(x.type!=='distance')return x;
    const ref=refs.find(r=>r.id===x.id);
    if(!ref)return x;
    const deviation=Math.abs(ref.mmPerUnit-m)/m;
    const status=deviation>tolerance?'conflict':'active';
    if(status==='conflict')conflicts.push({...ref,deviation});
    return{...x,distanceUnits:ref.distanceUnits,mmPerUnit:ref.mmPerUnit,status,deviation};
  });

  page.calibration.mmPerUnit=m;
  page.calibration.references=refs.map(r=>({
    constraintId:r.id,
    elementId:r.elementId,
    valueMm:r.valueMm,
    distanceUnits:r.distanceUnits,
    mmPerUnit:r.mmPerUnit
  }));

  for(const e of page.elements){
    if(e.type==='dimension'&&e.p1&&e.p2&&!e.manualMm){
      e.mm=distanceUnits(e.p1,e.p2)*m;
    }
  }

  bindActivePageAliases(c);
  return{core:c,mmPerUnit:m,conflicts,references:refs};
}
function getDimensionHealth(core,tolerance=0.03,pageId=null){
  const result=recalculateCalibration(core,tolerance,pageId);
  return{
    ok:result.conflicts.length===0,
    constraintCount:result.references.length,
    conflictCount:result.conflicts.length,
    mmPerUnit:result.mmPerUnit,
    conflicts:result.conflicts,
    core:result.core
  };
}

/* ======================== Validation ======================== */
function validateCore(core){
  const errors=[];
  const c=normalizeCore(core);

  if(c.schema!==CORE_SCHEMA)errors.push('schema');
  if(!c.document||typeof c.document!=='object')errors.push('document');
  if(!Array.isArray(c.pages)||!c.pages.length)errors.push('pages');
  if(!c.pages.some(p=>p.id===c.activePageId))errors.push('active-page');

  const pageIds=new Set();
  const sourceIds=new Set((c.document.sourceDocuments||[]).map(s=>s.id));

  for(const page of c.pages){
    if(pageIds.has(page.id))errors.push(`duplicate-page:${page.id}`);
    pageIds.add(page.id);

    if(!Array.isArray(page.elements))errors.push(`elements:${page.id}`);
    if(!Array.isArray(page.constraints))errors.push(`constraints:${page.id}`);
    if(!Array.isArray(page.layers)||!page.layers.length)errors.push(`layers:${page.id}`);
    if(!page.calibration||!Number.isFinite(page.calibration.mmPerUnit)||page.calibration.mmPerUnit<=0){
      errors.push(`calibration:${page.id}`);
    }
    if(!Array.isArray(page.sourceDocumentRefs))errors.push(`source-refs:${page.id}`);

    const elementIds=new Set();
    const layerIds=new Set((page.layers||[]).map(x=>x.id));

    for(const e of page.elements||[]){
      if(!e.id){errors.push(`element-id:${page.id}`);continue}
      if(elementIds.has(e.id))errors.push(`duplicate-element:${page.id}:${e.id}`);
      elementIds.add(e.id);
      if(!layerIds.has(e.layerId))errors.push(`unknown-layer:${page.id}:${e.layerId}`);
    }
    for(const constraint of page.constraints||[]){
      if(constraint.type==='distance'&&constraint.elementId&&!elementIds.has(constraint.elementId)){
        errors.push(`orphan-constraint:${page.id}:${constraint.id}`);
      }
    }
    for(const ref of page.sourceDocumentRefs||[]){
      if(sourceIds.size && !sourceIds.has(ref))errors.push(`unknown-source:${page.id}:${ref}`);
    }
  }

  return{ok:errors.length===0,errors,core:c};
}

global.DKSC_CORE={
  CORE_SCHEMA,
  CORE_VERSION,
  LEGACY_CORE_SCHEMA,
  DEFAULT_LAYERS:clone(DEFAULT_LAYERS),
  createCore,
  createPage,
  normalizePage,
  normalizeCore,
  migrateCoreV1ToV2,
  normalizeElement,
  migrateAppState,
  bindLegacyAliases,
  bindActivePageAliases,
  serializeCore,
  serializeAppState,
  snapshotCore,
  restoreCoreSnapshot,
  validateCore,
  defaultLayerForType,
  getPage,
  getActivePage,
  setActivePage,
  addPage,
  removePage,
  distanceUnits,
  dimensionConstraintFor,
  upsertDimensionConstraint,
  recalculateCalibration,
  getDimensionHealth
};
})(typeof window!=='undefined'?window:globalThis);
