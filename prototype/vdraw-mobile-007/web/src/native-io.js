// Injected OS boundary; browser paths remain in device.js and HTML file inputs.
export function nativeIO(plugins,{photoFile,readDataUrl}){
 return {
  async capture(){const p=await plugins.Camera.getPhoto({quality:90,resultType:plugins.CameraResultType.Uri,source:plugins.CameraSource.Camera,saveToGallery:false,correctOrientation:true});const f=await photoFile(p);if(!f)throw Error('撮影を中止しました。写真から選択できます');return f;},
  async save(blob,name){
   if(typeof name!=='string'||!name||/[\\/\x00-\x1f]/.test(name)||name==='.'||name==='..')throw Error('保存ファイル名が不正です');
   const path='vdraw-007-saves/'+crypto.randomUUID()+'/'+name;
   try{
    const data=await readDataUrl(blob);
    const file=await plugins.Filesystem.writeFile({path,data:data.split(',')[1],directory:plugins.Directory.Cache,recursive:true});
    if(!file?.uri)throw Error('保存用ファイルを準備できません');
    const result=await plugins.DocumentSave.save({sourceUri:file.uri,fileName:name,mimeType:blob.type||'application/octet-stream'});
    if(result?.status!=='saved'||result.bytes!==blob.size)throw Error('ファイルの保存完了を確認できません');
    return 'saved';
   }catch(e){
    if(e.code==='DOCUMENT_SAVE_CANCELLED'){const cancelled=Error('保存をキャンセルしました');cancelled.name='AbortError';throw cancelled;}
    throw e;
   }finally{
    // Only this save job's private staging file is removed. Shared files remain available to recipients.
    try{await plugins.Filesystem.deleteFile({path,directory:plugins.Directory.Cache});}catch{}
   }
  },
  async share(blob,name){if(typeof name!=='string'||!name||/[\\/\x00-\x1f]/.test(name))throw Error('共有ファイル名が不正です');const data=await readDataUrl(blob),path='vdraw-005-exports/'+crypto.randomUUID()+'/'+name;
   const file=await plugins.Filesystem.writeFile({path,data:data.split(',')[1],directory:plugins.Directory.Cache,recursive:true});
   if(!file?.uri)throw Error('共有ファイルを端末へ保存できません');await plugins.Share.share({title:name,files:[file.uri],dialogTitle:'図面ファイルを共有'});return 'share-requested';
  }
 };
}

