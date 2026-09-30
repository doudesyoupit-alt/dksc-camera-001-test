(function(global){
'use strict';

const PROJECT_SCHEMA='dksc-project/1';

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v))}
function safeFileName(name='DKSC_project'){
  return String(name||'DKSC_project').replace(/[\\/:*?"<>|]/g,'_');
}
function serialize(state,Core,appSchema='dksc-drawing'){
  if(!Core)throw new Error('CORE required');
  const out=Core.serializeAppState(state);
  out.schema=appSchema;
  out.projectPackage={
    schema:PROJECT_SCHEMA,
    savedAt:new Date().toISOString(),
    coreSchema:out.core?.schema||'',
    pageCount:out.core?.pages?.length||0
  };
  return out;
}
function parse(raw,defaults,Core){
  if(!Core)throw new Error('CORE required');
  const source=typeof raw==='string'?JSON.parse(raw):clone(raw||{});
  const migrated=Core.migrateAppState(source,defaults);
  migrated.history=[];
  migrated.redo=[];
  return Core.bindLegacyAliases(migrated);
}
function validateProject(state,Core){
  const c=Core.validateCore(state?.core);
  return{
    ok:c.ok,
    errors:c.errors,
    pageCount:c.core?.pages?.length||0,
    coreSchema:c.core?.schema||''
  };
}
function makeFilePayload(state,Core,appSchema){
  return JSON.stringify(serialize(state,Core,appSchema),null,2);
}

global.DKSC_PROJECT={
  PROJECT_SCHEMA,
  safeFileName,
  serialize,
  parse,
  validateProject,
  makeFilePayload
};
})(typeof window!=='undefined'?window:globalThis);
