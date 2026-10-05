from pathlib import Path
import json,hashlib,xml.etree.ElementTree as E
r=Path(__file__).resolve().parents[1];a=r/'android/app/src/main/assets/public'
files=[];mismatch=[]
for p in sorted((r/'web').rglob('*')):
 if p.is_file():
  q=a/p.relative_to(r/'web');good=q.exists() and hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256(q.read_bytes()).digest();files.append({'path':p.relative_to(r/'web').as_posix(),'matchesAndroidAsset':good})
  if not good:mismatch.append(str(p))
config=json.loads((r/'capacitor.config.json').read_text());copied=json.loads((r/'android/app/src/main/assets/capacitor.config.json').read_text());assert copied==config
assert config['appId']=='jp.dksc.vdraw.prototype004';assert config['plugins']['Keyboard']['resizeOnFullScreen'] is True
java=r/'android/app/src/main/java/jp/dksc/vdraw/prototype004/MainActivity.java';assert 'package jp.dksc.vdraw.prototype004;' in java.read_text()
manifest=E.parse(r/'android/app/src/main/AndroidManifest.xml');ns='{http://schemas.android.com/apk/res/android}';app=manifest.getroot().find('application');assert app.attrib[ns+'allowBackup']=='false';act=app.find('activity');assert ns+'screenOrientation' not in act.attrib
sw=(r/'web/sw.js').read_text();assert "'native-runtime'" in sw and "startsWith('vdraw-mobile-shell-004-')" in sw
assert not mismatch
result={'status':'PASS','kind':'static source/assets check; not Android compile or device test','webFiles':files,'count':len(files),'configurationMatches':True,'javaPackageMatches':True,'rotationNotLocked':True,'keyboardFullScreenResizeConfigured':True,'backupDisabled':True,'oldCacheCleanupAbsent':True,'APK':None}
(r/'evidence/native-assets-004.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
