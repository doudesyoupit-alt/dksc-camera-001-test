#!/usr/bin/env python3
"""Bounded read-only discovery. Never installs tools or changes global configuration."""
from pathlib import Path
import os,sys,json,re,time,shutil,subprocess,zipfile,hashlib
ROOT=Path(__file__).resolve().parents[1]
def command(argv):
 try:
  r=subprocess.run(argv,capture_output=True,text=True,timeout=12)
  return {'exit':r.returncode,'output':(r.stdout+r.stderr).strip()}
 except Exception:return {'exit':None,'output':'unavailable or timeout'}
def major(text):
 m=re.search(r'(?:version\s+"|javac\s+)(\d+)',text);return int(m[1]) if m else 0
def diagnose():
 started=time.monotonic();jdk=set();sdks=set();visited=0
 if shutil.which('javac'):jdk.add(Path(shutil.which('javac')).resolve().parents[1])
 if shutil.which('sdkmanager'):sdks.add(Path(shutil.which('sdkmanager')).resolve().parents[3])
 if shutil.which('adb'):sdks.add(Path(shutil.which('adb')).resolve().parents[1])
 for env in ['JAVA_HOME','JDK_HOME']:
  if os.getenv(env):jdk.add(Path(os.environ[env]))
 for env in ['ANDROID_HOME','ANDROID_SDK_ROOT']:
  if os.getenv(env):sdks.add(Path(os.environ[env]))
 # Includes Android Studio's bundled JBR and cached SDKs, not the entire filesystem.
 for root in ['/usr/lib/jvm','/opt','/usr/local/lib/android','/root/Android','/root/.gradle/jdks']:
  if not Path(root).exists():continue
  for directory,dirs,names in os.walk(root):
   visited+=1;p=Path(directory)
   dirs[:]=[d for d in dirs if d not in ['node_modules','site-packages','.git','share','cache','caches','libreoffice-headless']]
   if len(p.relative_to(root).parts)>=7:dirs.clear()
   if p.name=='bin' and 'javac' in names:jdk.add(p.parent)
   if p.name=='platforms' and (p/'android-36/android.jar').exists():sdks.add(p.parent)
   if visited>4500 or time.monotonic()-started>35:dirs.clear();break
  if visited>4500 or time.monotonic()-started>35:break
 found=[]
 for p in sorted(jdk):
  java,javac=p/'bin/java',p/'bin/javac'
  if java.is_file() and javac.is_file():
   a,b=command([str(java),'-version']),command([str(javac),'-version'])
   found.append({'path':str(p),'java':a,'javac':b,'usable':major(a['output'])>=21 and major(b['output'])>=21})
 sdk=[]
 for p in sorted(sdks):
  platform=(p/'platforms/android-36/android.jar').is_file();build=list((p/'build-tools').glob('*/aapt2'))
  sdk.append({'path':str(p),'platform36':platform,'buildTools':[x.parent.name for x in build],'requiredBuildTools':'35.0.0','usable':platform and any(x.parent.name=='35.0.0' for x in build),'sdkmanager':next((str(x) for x in (p/'cmdline-tools').glob('*/bin/sdkmanager') if x.is_file()),None),'adb':str(p/'platform-tools/adb') if (p/'platform-tools/adb').exists() else None})
 wrapper=ROOT/'android/gradle/wrapper/gradle-wrapper.jar'
 wrapperOK=wrapper.is_file() and zipfile.is_zipfile(wrapper)
 gradleProperties=(ROOT/'android/gradle/wrapper/gradle-wrapper.properties').read_text()
 cap=json.loads((ROOT/'capacitor.config.json').read_text());pkg=json.loads((ROOT/'package.json').read_text())
 env={n:command([shutil.which(n),'--version' if n in ['node','npm'] else '-version']) if shutil.which(n) else {'exit':None,'output':'missing'} for n in ['node','npm','java','javac']}
 selectedJDK=next((x['path'] for x in found if x['usable']),None);selectedSDK=next((x['path'] for x in sdk if x['usable']),None)
 blockers=[]
 if env['node']['exit']!=0 or not re.match(r'v(?:2[2-9]|[3-9]\d|\d{3,})\.',env['node']['output']):blockers.append('Node22+ not found on PATH')
 if env['npm']['exit']!=0:blockers.append('npm not found on PATH')
 if not selectedJDK:blockers.append('JDK21/compiler not found in bounded existing paths')
 if not selectedSDK:blockers.append('Android SDK36/build-tools35.0.0 not found in bounded existing paths')
 if not wrapperOK:blockers.append('Gradle Wrapper missing or invalid')
 return {'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'status':'BLOCKED' if blockers else 'READY','environment':env,'jdkCandidates':found,'sdkCandidates':sdk,'selectedJDK':selectedJDK,'selectedSDK':selectedSDK,'gradleWrapper':{'exists':wrapper.exists(),'jarValid':wrapperOK,'sha256':hashlib.sha256(wrapper.read_bytes()).hexdigest() if wrapper.exists() else None,'distributionConfig':gradleProperties},'sdkmanagerOnPath':bool(shutil.which('sdkmanager')),'adbOnPath':bool(shutil.which('adb')),'capacitor':pkg['dependencies']['@capacitor/core'],'appId':cap['appId'],'blockers':blockers,'directoriesVisited':visited,'elapsedMs':round((time.monotonic()-started)*1000),'installedAnything':False,'buildExecuted':False}
if __name__=='__main__':
 result=diagnose();print(json.dumps(result,ensure_ascii=False,indent=2))
 if '--output' in sys.argv:
  p=Path(sys.argv[sys.argv.index('--output')+1]);p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
