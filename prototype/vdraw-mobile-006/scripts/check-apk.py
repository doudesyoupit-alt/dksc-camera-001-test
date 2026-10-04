"""Inspect a real built APK. Never creates an APK or substitutes a fixture."""
from pathlib import Path
import argparse,hashlib,json,os,re,shutil,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[1]

def inspect(path,aapt):
 if not path.is_file():raise ValueError('APK_MISSING')
 with zipfile.ZipFile(path) as archive:
  if archive.testzip() is not None:raise ValueError('APK_CORRUPT')
  names=set(archive.namelist())
  if not {'AndroidManifest.xml','classes.dex','assets/capacitor.config.json','assets/capacitor.plugins.json'}.issubset(names):raise ValueError('APK_REQUIRED_ENTRIES_MISSING')
  cap=json.loads(archive.read('assets/capacitor.config.json'))
  if cap['appId']!='jp.dksc.vdraw.prototype006':raise ValueError('APK_WRONG_APPLICATION_ID')
  plugins=json.loads(archive.read('assets/capacitor.plugins.json'))
  expected=['@capacitor/app','@capacitor/camera','@capacitor/filesystem','@capacitor/keyboard','@capacitor/share','@capacitor/splash-screen','@capacitor/status-bar']
  if sorted(p['pkg'] for p in plugins)!=sorted(expected):raise ValueError('APK_NATIVE_PLUGINS_MISMATCH')
  web=[]
  for file in (ROOT/'web').rglob('*'):
   if not file.is_file():continue
   target='assets/public/'+str(file.relative_to(ROOT/'web'))
   if target not in names or archive.read(target)!=file.read_bytes():raise ValueError('APK_WEB_ASSET_MISMATCH')
   web.append(str(file.relative_to(ROOT/'web')))
 if not aapt:raise ValueError('AAPT_UNAVAILABLE')
 badging=subprocess.run([str(aapt),'dump','badging',str(path)],capture_output=True,text=True,timeout=60,check=True).stdout
 permission=subprocess.run([str(aapt),'dump','permissions',str(path)],capture_output=True,text=True,timeout=30,check=True).stdout
 match=re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'",badging)
 if not match:raise ValueError('APK_BADGING_INVALID')
 package,code,version=match.groups()
 minimum=re.search(r"sdkVersion:'(\d+)'",badging);target=re.search(r"targetSdkVersion:'(\d+)'",badging)
 if (package,code,version)!=('jp.dksc.vdraw.prototype006','6','0.6.0') or not minimum or minimum[1]!='24' or not target or target[1]!='36':raise ValueError('APK_VERSION_OR_SDK_MISMATCH')
 permissions=sorted(set(re.findall(r"uses-permission: name='([^']+)'",permission)))
 return {'APK_BUILD':'PASS','APK_INTERNAL':'PASS','ANDROID_REAL_DEVICE':'NOT_RUN','file':path.name,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'packageId':package,'versionCode':int(code),'versionName':version,'minSdk':24,'targetSdk':36,'permissions':permissions,'webAssets':web,'nativePlugins':expected,'workflowRunId':os.getenv('VDRAW_RUN_ID'),'commitSHA':os.getenv('VDRAW_COMMIT_SHA'),'buildKind':'debug','realDeviceVerified':False}

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('apk',type=Path);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
 sdk=os.getenv('ANDROID_HOME') or os.getenv('ANDROID_SDK_ROOT')
 aapt=Path(sdk)/'build-tools/35.0.0/aapt' if sdk else shutil.which('aapt')
 try:result=inspect(args.apk,aapt)
 except Exception as error:
  code=str(error) if re.fullmatch(r'APK_[A-Z_]+|AAPT_UNAVAILABLE',str(error)) else 'APK_INSPECTION_FAILED'
  result={'APK_BUILD':'BLOCKED','APK_INTERNAL':'BLOCKED','ANDROID_REAL_DEVICE':'NOT_RUN','errorCode':code,'file':None}
 args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
 if result['APK_INTERNAL']!='PASS':raise SystemExit(2)
