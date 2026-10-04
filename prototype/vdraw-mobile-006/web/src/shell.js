import * as bridge from '../vendor/native-bridge.js';
import {nativeRuntime} from './native-runtime.js';
export const isNative=()=>bridge.Capacitor.isNativePlatform();
export {bridge};
export async function photoFile(photo){if(!photo?.webPath)return null;const r=await fetch(photo.webPath);if(!r.ok)throw Error('撮影画像を開けません');return new File([await r.blob()],`撮影-${Date.now()}.${photo.format||'jpeg'}`,{type:'image/'+(photo.format||'jpeg')});}
let runtime;
export function nativeHealth(){return runtime?{...runtime.health}:{mode:'web'};}
export async function initShell({back,suspend,resume,restoredPhoto,error}){
 if(!isNative())return {mode:'web'};
 if(runtime)await runtime.dispose();
 document.documentElement.classList.add('native-shell');
 runtime=nativeRuntime(bridge,{back,suspend,resume,error,resize:()=>window.dispatchEvent(new Event('resize')),restoredPhoto:async photo=>{const f=await photoFile(photo);if(!f)throw Error('撮影画像の保存先がありません');await restoredPhoto(f);}});
 return runtime.start();
}
