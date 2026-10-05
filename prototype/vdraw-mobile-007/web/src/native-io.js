// Injected OS boundary; browser paths remain in device.js and HTML file inputs.
export function nativeIO(plugins,{photoFile,readDataUrl}){
 return {
  async capture(){const p=await plugins.Camera.getPhoto({quality:90,resultType:plugins.CameraResultType.Uri,source:plugins.CameraSource.Camera,saveToGallery:false,correctOrientation:true});const f=await photoFile(p);if(!f)throw Error('撮影を中止しました。写真から選択できます');return f;},
  async share(blob,name){if(typeof name!=='string'||!name||/[\\/\x00-\x1f]/.test(name))throw Error('共有ファイル名が不正です');const data=await readDataUrl(blob),path='vdraw-005-exports/'+crypto.randomUUID()+'/'+name;
   const file=await plugins.Filesystem.writeFile({path,data:data.split(',')[1],directory:plugins.Directory.Cache,recursive:true});
   if(!file?.uri)throw Error('共有ファイルを端末へ保存できません');await plugins.Share.share({title:name,files:[file.uri],dialogTitle:'図面ファイルを共有・保存'});return 'share-requested';
  }
 };
}
