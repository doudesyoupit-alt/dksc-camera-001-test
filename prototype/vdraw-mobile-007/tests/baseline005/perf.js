// Local diagnostic instrumentation. Disabled by default; no content or credentials recorded.
const records=[];
export const start=()=>globalThis.__VDRAW_PROFILE__?performance.now():0;
export function end(name,t){if(t){records.push({name,ms:performance.now()-t});if(records.length>5000)records.shift();}}
export function span(name,fn){const t=start();try{return fn();}finally{end(name,t);}}
export async function asyncSpan(name,fn){const t=start();try{return await fn();}finally{end(name,t);}}
export function take(){return records.splice(0);}
