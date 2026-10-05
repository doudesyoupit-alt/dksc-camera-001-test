#!/usr/bin/env python3
"""Use only discovered existing JDK/SDK; prefer project Gradle Wrapper. No installs."""
from pathlib import Path
import importlib.util,json,sys,os,subprocess,time,hashlib,shutil,re
from bounded_process import run_bounded
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'evidence';out.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('android_env',ROOT/'scripts/check-android-env.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
report=module.diagnose();app=(ROOT/'android/app/build.gradle').read_text();variables=(ROOT/'android/variables.gradle').read_text();report.update(buildStartedAt=None,apk=None,gradleExecuted=False,versionCode=int(re.search(r'versionCode\s+(\d+)',app)[1]),versionName=re.search(r'versionName\s+"([^"]+)"',app)[1],minSdk=int(re.search(r'minSdkVersion\s*=\s*(\d+)',variables)[1]),targetSdk=int(re.search(r'targetSdkVersion\s*=\s*(\d+)',variables)[1]),compileSdk=int(re.search(r'compileSdkVersion\s*=\s*(\d+)',variables)[1]))
if report['status']!='READY':
 (out/'android-build.log').write_text('APK = BLOCKED. Gradle not launched. No installations.\n'+'\n'.join(report['blockers'])+'\n')
else:
 env=os.environ.copy();env['JAVA_HOME']=report['selectedJDK'];env['ANDROID_SDK_ROOT']=report['selectedSDK'];env['ANDROID_HOME']=report['selectedSDK'];env['PATH']=report['selectedJDK']+'/bin:'+env['PATH'];report['buildStartedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());report['gradleExecuted']=True
 try:
  with (out/'android-build.log').open('w') as log:
   deadline=time.monotonic()+180
   version=run_bounded(['sh','./gradlew','--version'],cwd=ROOT/'android',env=env,stdout=log,stderr=subprocess.STDOUT,timeout=min(60,deadline-time.monotonic()))
   if version.returncode:raise RuntimeError('GRADLE_VERSION_FAILED')
   process=run_bounded(['sh','./gradlew','--no-daemon','--console=plain','assembleDebug'],cwd=ROOT/'android',env=env,stdout=log,stderr=subprocess.STDOUT,timeout=deadline-time.monotonic())
  report['gradleExitCode']=process.returncode;apk=ROOT/'android/app/build/outputs/apk/debug/app-debug.apk'
  if process.returncode==0 and apk.is_file():
   target=out/'VDRAW-MOBILE-007-debug.apk';shutil.copy2(apk,target);report['apk']={'file':target.name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()};report['status']='APK_BUILT';(out/'APK-SHA256.txt').write_text(report['apk']['sha256']+'  '+target.name+'\n')
  else:report['status']='BUILD_FAILED'
 except subprocess.TimeoutExpired:report['status']='BUILD_TIMEOUT_NO_RETRY'
 except Exception:report['status']='BUILD_FAILED_NO_RETRY'
(out/'android-environment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
if report['status']!='APK_BUILT':sys.exit(2)
