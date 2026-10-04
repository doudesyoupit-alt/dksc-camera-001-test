import {isNative,bridge,photoFile} from './shell.js';
import {nativeIO} from './native-io.js';
const os=nativeIO(bridge,{photoFile,readDataUrl});
// Native capabilities may be connected behind this boundary. Web path is real.
export async function downloadOrShare(blob,name,share=false){const file=new File([blob],name,{type:blob.type});
 if(isNative())return os.share(blob,name);
 if(share){if(!navigator.canShare?.({files:[file]}))throw Error('このブラウザはファイル共有に未対応です。ダウンロードを選んでください');await navigator.share({files:[file],title:name});return 'shared';}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),30000);return 'downloaded';
}
export function readDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);});}
export async function sanitizeImage(file){const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});if(bitmap.width*bitmap.height>48000000){bitmap.close();throw Error('写真が大きすぎます。48MP以下で選択してください');}
 const ratio=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));const c=document.createElement('canvas');c.width=Math.round(bitmap.width*ratio);c.height=Math.round(bitmap.height*ratio);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();return{dataUrl:c.toDataURL('image/png'),width:c.width,height:c.height};}

export async function capturePhoto(){if(!isNative())throw Error('端末カメラはNativeモードで利用できます');return os.capture();}
