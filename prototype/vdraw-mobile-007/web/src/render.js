import {bounds,arcPoints} from './core.js';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function shape(e){const style=`fill="${esc(e.fill)}" stroke="${esc(e.stroke)}" stroke-width="${e.strokeWidth}" stroke-linejoin="round"`;
 switch(e.kind){case 'arc':return `<polyline points="${arcPoints(e).map(p=>p.join(',')).join(' ')}" fill="none" stroke="${e.stroke}" stroke-width="${e.strokeWidth}"/>`; case 'rect':return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" ${style}/>`;
 case 'ellipse':return `<ellipse cx="${e.x+e.w/2}" cy="${e.y+e.h/2}" rx="${e.w/2}" ry="${e.h/2}" ${style}/>`;
 case 'polygon':return `<polygon points="${e.points.map(p=>p.join(',')).join(' ')}" ${style}/>`;
 case 'line':return `<line x1="${e.x}" y1="${e.y}" x2="${e.x+e.w}" y2="${e.y+e.h}" ${style}/>`;
 case 'text':return `<text x="${e.x}" y="${e.y+e.fontSize}" fill="${e.fill==='none'?e.stroke:e.fill}" font-family="VDRAWJP,sans-serif" font-size="${e.fontSize}">${esc(e.text)}</text>`;
 case 'dimension':return `<g><path d="M${e.x} ${e.y-12}v24 M${e.x} ${e.y}h${e.w} M${e.x+e.w} ${e.y-12}v24" fill="none" stroke="${e.stroke}" stroke-width="${e.strokeWidth}"/><text x="${e.x+e.w/2}" y="${e.y-16}" text-anchor="middle" fill="${e.stroke}" font-size="26" font-family="VDRAWJP,sans-serif">${esc(e.text)}（${e.dimension?.status==='MANUAL'?'手入力・対象のみ':'未校正'}）</text></g>`;
 }
}
export function drawingSvg(p,source=null,{sourceVisible=false,drawingVisible=true,overlay=false}={}){return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.canvas.width}" height="${p.canvas.height}" viewBox="0 0 ${p.canvas.width} ${p.canvas.height}"><rect width="100%" height="100%" fill="#FFFFFF"/>${sourceVisible&&source?.workImage?`<image href="${esc(source.workImage)}" width="${p.canvas.width}" height="${p.canvas.height}" preserveAspectRatio="xMidYMid meet"/>`:''}<g opacity="${overlay?0.75:1}">${drawingVisible?p.elements.filter(e=>e.visible!==false).map(shape).join(''):''}</g></svg>`;}
export function selection(e){const b=bounds(e);return `<rect x="${b.x-8}" y="${b.y-8}" width="${Math.max(16,b.w+16)}" height="${Math.max(16,b.h+16)}" fill="none" stroke="#285EC6" stroke-width="2" vector-effect="non-scaling-stroke" stroke-dasharray="5 4"/>`;}
const segment=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);};
export function hit(e,x,y,tol=15){if(e.visible===false)return false;const b=bounds(e);
 if(e.kind==='arc'){const pts=arcPoints(e);return pts.slice(1).some((q,i)=>segment(x,y,pts[i],q)<=tol);}
 if(e.kind==='line'||e.kind==='dimension')return segment(x,y,[e.x,e.y],[e.x+e.w,e.y+e.h])<=tol;
 if(e.kind==='ellipse')return ((x-e.x-e.w/2)/(e.w/2+tol))**2+((y-e.y-e.h/2)/(e.h/2+tol))**2<=1;
 if(e.kind==='polygon'){let inside=false;for(let i=0,j=e.points.length-1;i<e.points.length;j=i++){const a=e.points[i],c=e.points[j];if(segment(x,y,a,c)<=tol)return true;if((a[1]>y)!==(c[1]>y)&&x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0])inside=!inside;}return inside;}
 return x>=b.x-tol&&x<=b.x+b.w+tol&&y>=b.y-tol&&y<=b.y+b.h+tol;
}
