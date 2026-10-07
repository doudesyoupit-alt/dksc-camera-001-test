// Test-only generic DOM adapter over an installed SAX XML parser (xml-js).
// Runtime uses browser DOMParser/XMLSerializer. This is not a geometry oracle.
import {createRequire} from 'node:module';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/runtime.js');
const {xml2js,js2xml}=require('xml-js');
const sax=require('sax');
export class DOMParser {
 parseFromString(text){
  // XML-js's exposed tree does not enforce every namespace failure. Validate
  // with the underlying strict namespace-aware SAX parser before adapting it.
  const parser=sax.parser(true,{xmlns:true,strictEntities:true});let error;
  parser.onerror=e=>{error=e;};parser.write(text).close();if(error)throw error;
  const ast=xml2js(text,{compact:false}),root={childNodes:[],nodeType:9};
  const build=(value,bindings={})=>{
   if(value.type!=='element')return {nodeType:value.type==='text'?3:8,textContent:value.text||value.cdata||'',childNodes:[],_ast:value};
   const next={...bindings};for(const [k,v]of Object.entries(value.attributes||{})){if(k==='xmlns')next['']=v;else if(k.startsWith('xmlns:'))next[k.slice(6)]=v;}
   const [prefix,name]=value.name.includes(':')?value.name.split(':'):['',value.name];
   const node={nodeType:1,nodeName:value.name,localName:name,namespaceURI:next[prefix]||null,attributes:Object.entries(value.attributes||{}).map(([name,value])=>({name,value})),_ast:value};
   node.childNodes=(value.elements||[]).map(x=>build(x,next));
   node.getAttribute=k=>Object.hasOwn(value.attributes||{},k)?value.attributes[k]:null;
   node.hasAttribute=k=>Object.hasOwn(value.attributes||{},k);
   node.getAttributeNS=(ns,key)=>{for(const [k,v]of Object.entries(value.attributes||{})){const [p,n]=k.includes(':')?k.split(':'):['',k];if(next[p]===ns&&n===key)return v;}return null;};
   Object.defineProperty(node,'textContent',{get:()=>node.childNodes.map(x=>x.textContent).join('')});
   node.getElementsByTagNameNS=(ns,key)=>{const result=[];function walk(n){for(const c of n.childNodes){if(c.nodeType===1&&(ns==='*'||c.namespaceURI===ns)&&(key==='*'||c.localName===key))result.push(c);walk(c);}}walk(node);return result;};
   return node;
  };
  root.childNodes=(ast.elements||[]).map(n=>build(n));root.documentElement=root.childNodes.find(n=>n.nodeType===1);
  root.getElementsByTagNameNS=(ns,key)=>root.childNodes.flatMap(n=>{if(n.nodeType!==1)return [];return [...((ns==='*'||n.namespaceURI===ns)&&(key==='*'||n.localName===key)?[n]:[]),...n.getElementsByTagNameNS(ns,key)];});
  root.querySelector=selector=>selector==='parsererror'?root.getElementsByTagNameNS('*','parsererror')[0]||null:null;
  return root;
 }
}
export class XMLSerializer { serializeToString(node){return js2xml({elements:[node._ast]},{compact:false});} }
