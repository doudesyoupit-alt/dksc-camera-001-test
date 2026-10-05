"""007 source contract; optional synchronized asset parity, never Android device proof."""
from pathlib import Path
import argparse, json, hashlib, xml.etree.ElementTree as ET
p=argparse.ArgumentParser();p.add_argument('--check-assets', action='store_true');args=p.parse_args()
r=Path(__file__).resolve().parents[1]
c=json.loads((r/'capacitor.config.json').read_text());assert c['appId']=='jp.dksc.vdraw.prototype007'
assert c['plugins']['Keyboard']['resizeOnFullScreen'] is True
assert c['android']['allowMixedContent'] is False
j=r/'android/app/src/main/java/jp/dksc/vdraw/prototype007/MainActivity.java'
assert 'package jp.dksc.vdraw.prototype007;' in j.read_text()
g=(r/'android/app/build.gradle').read_text();assert 'applicationId "jp.dksc.vdraw.prototype007"' in g
m=ET.parse(r/'android/app/src/main/AndroidManifest.xml').getroot();ns='{http://schemas.android.com/apk/res/android}'
a=m.find('application');assert a.attrib[ns+'allowBackup']=='false';assert ns+'screenOrientation' not in a.find('activity').attrib
sw=(r/'web/sw.js').read_text();assert "'native-runtime'" in sw and "startsWith('vdraw-mobile-shell-007-')" in sw
assert "const CACHE='vdraw-mobile-shell-007-" in sw
checked=[]
if args.check_assets:
 asset=r/'android/app/src/main/assets';assert json.loads((asset/'capacitor.config.json').read_text())==c
 for f in sorted((r/'web').rglob('*')):
  if f.is_file():
   q=asset/'public'/f.relative_to(r/'web');assert q.exists(),str(q)
   assert hashlib.sha256(q.read_bytes()).digest()==hashlib.sha256(f.read_bytes()).digest(),str(f)
   checked.append(str(f.relative_to(r/'web')))
print(json.dumps({'status':'PASS','scope':'007 source native configuration/static lifecycle contract; not compile/device/signing proof','assetParity':'PASS' if args.check_assets else 'NOT_REQUESTED_SEPARATE_GATE','assetCount':len(checked),'APK':None},indent=2))
