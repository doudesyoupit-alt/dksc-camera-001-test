// Contract for a PRIVATE SAM wrapper. It does not load a model, CUDA or checkpoints.
const fail=()=>Object.assign(new Error('SAM mask contract invalid'),{code:'SAM_MASK_INVALID'});
const bboxOK=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]>=0&&b[1]>=0&&b[2]>b[0]&&b[3]>b[1]&&b[2]<=1200&&b[3]<=800;
export function prompts(scene){return scene.objects.map(o=>({objectId:o.id,label:o.name,bbox:o.bbox??null}));}
export function rankMasks(result,scene){
 if(result?.schema!=='vdraw-sam-masks/1')return result;
 if(result.coordinateSpace!=='drawing-1200x800'||!Array.isArray(result.masks)||result.masks.length>300)throw fail();
 const known=new Map(scene.objects.map(o=>[o.id,o])),best=new Map();
 for(const m of result.masks){
  if(!known.has(m.objectId)||!bboxOK(m.bbox)||!Number.isFinite(m.score)||m.score<0||m.score>1||!Array.isArray(m.points)||m.points.length<3||m.points.length>2000||m.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<m.bbox[0]||p[0]>m.bbox[2]||p[1]<m.bbox[1]||p[1]>m.bbox[3]))throw fail();
  const prompt=known.get(m.objectId).bbox;
  if(prompt&&(Math.min(prompt[2],m.bbox[2])<=Math.max(prompt[0],m.bbox[0])||Math.min(prompt[3],m.bbox[3])<=Math.max(prompt[1],m.bbox[1])))throw fail();
  if(!best.has(m.objectId)||m.score>best.get(m.objectId).score)best.set(m.objectId,m);
 }
 return {schema:'vdraw-vision-provider/1',coordinateSpace:result.coordinateSpace,model:result.model,maskCount:result.masks.length,selectedMaskCount:best.size,objects:[...best.values()].map(m=>({objectId:m.objectId,kind:'polygon',x:m.bbox[0],y:m.bbox[1],w:m.bbox[2]-m.bbox[0],h:m.bbox[3]-m.bbox[1],points:m.points}))};
}
export {bboxOK};
