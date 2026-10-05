import {span,start,end} from './perf.js';
import {clone,validate,pageOf,uid} from './core.js';
export class Editor {
 constructor(d,history=null){validate(d);this.doc=span('editor.construct.clone',()=>clone(d));this.undoStack=[];this.redoStack=[];if(history){try{for(const item of [...history.undo,...history.redo])validate(item);this.undoStack=clone(history.undo);this.redoStack=clone(history.redo);}catch{ /* Drawing remains valid; discard invalid optional undo history. */ }}}
 history(){return {undo:this.undoStack.slice(-10),redo:this.redoStack.slice(-10)};}
 remove(id){return this.apply("対象の削除",d=>{const pg=pageOf(d);pg.elements=pg.elements.filter(e=>e.id!==id);});}
 apply(label,fn){const next=span('command.clone.next',()=>clone(this.doc));fn(next);span('command.validate',()=>validate(next));if(span('command.stringify.compare',()=>JSON.stringify(next)===JSON.stringify(this.doc)))return false;
  this.undoStack.push(span('history.snapshot.clone',()=>clone(this.doc)));while(this.undoStack.length>80||(this.undoStack.length>1&&this.undoStack.reduce((sum,d)=>sum+d.pages.reduce((n,p)=>n+p.elements.length,0),0)>40000))this.undoStack.shift();this.redoStack=[];
  next.revision=this.doc.revision+1;next.updatedAt=new Date().toISOString();next.manualEvents.push({id:uid(),label,at:next.updatedAt,revision:next.revision});this.doc=next;return true;
 }
 update(id,patch){
  const pg=pageOf(this.doc),i=pg.elements.findIndex(e=>e.id===id);if(i<0)throw Error('対象が見つかりません');
  const before=pg.elements[i],next={...before,...clone(patch)};
  if(next.id!==id)throw Error('対象IDは変更できません');
  span('command.validate',()=>{validate(this.doc);validate({...this.doc,pages:[{...pg,elements:[next]}],activePageId:pg.id});});
  if(span('command.stringify.element.compare',()=>JSON.stringify(before)===JSON.stringify(next)))return false;
  // One isolated full history snapshot protects against existing mutable gestures/views.
  // The live document is updated only after validation. Persistence history schema stays unchanged.
  this.undoStack.push(span('history.snapshot.clone',()=>clone(this.doc)));
  while(this.undoStack.length>80||(this.undoStack.length>1&&this.undoStack.reduce((sum,d)=>sum+d.pages.reduce((n,p)=>n+p.elements.length,0),0)>40000))this.undoStack.shift();
  this.redoStack=[];pg.elements[i]=next;this.doc.revision++;this.doc.updatedAt=new Date().toISOString();
  this.doc.manualEvents.push({id:uid(),label:'対象の修正',at:this.doc.updatedAt,revision:this.doc.revision});return true;
 }
 add(e){return this.apply('対象の追加',d=>pageOf(d).elements.push(e));}
 reorder(id,delta){return this.apply('前後の変更',d=>{const es=pageOf(d).elements,i=es.findIndex(e=>e.id===id);const [e]=es.splice(i,1);es.splice(Math.max(0,Math.min(es.length,i+delta)),0,e);});}
 undo(){if(!this.undoStack.length)return false;this.redoStack.push(span('history.undo.clone',()=>clone(this.doc)));const rev=this.doc.revision+1;this.doc=this.undoStack.pop();this.doc.revision=rev;this.doc.updatedAt=new Date().toISOString();this.doc.manualEvents.push({label:'取り消し',revision:rev,at:new Date().toISOString()});return true;}
 redo(){if(!this.redoStack.length)return false;this.undoStack.push(span('history.snapshot.clone',()=>clone(this.doc)));const rev=this.doc.revision+1;this.doc=this.redoStack.pop();this.doc.revision=rev;this.doc.updatedAt=new Date().toISOString();this.doc.manualEvents.push({label:'やり直し',revision:rev,at:new Date().toISOString()});return true;}
}
