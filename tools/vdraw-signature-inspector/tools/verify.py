"""Public-only inspector build evidence; never writes to VDRAW or handles its keys."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
APP_ID = 'jp.dksc.vdraw.signatureinspector'
BASELINE_CERT = 'c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855'

def check(value, reason):
    if not value:
        raise ValueError(reason)

def source_audit():
    manifest = ET.parse(ROOT / 'app/src/main/AndroidManifest.xml').getroot()
    ns = '{http://schemas.android.com/apk/res/android}'
    check(not manifest.findall('uses-permission'), 'Inspection APK must request zero permissions')
    check([p.get(ns + 'name') for p in manifest.findall('queries/package')] == ['jp.dksc.vdraw.prototype007'], 'Exact scoped query required')
    check(manifest.find('application').get(ns + 'allowBackup') == 'false', 'Inspector backup disabled')
    source = '\n'.join(p.read_text() for p in (ROOT / 'app/src/main/java').rglob('*.java'))
    forbidden = ['Runtime.getRuntime', 'ProcessBuilder', 'FileOutputStream', 'SharedPreferences', 'ContentResolver', 'deletePackage', 'clearApplicationUserData', 'ACTION_DELETE', 'ACTION_UNINSTALL_PACKAGE', 'ACTION_INSTALL_PACKAGE', 'HttpURLConnection', 'Socket', 'getInstalledPackages', 'getSigningCertificateHistory']
    for token in forbidden:
        check(token not in source, 'Forbidden inspection operation: ' + token)
    check('getApkContentsSigners' in source and 'GET_SIGNING_CERTIFICATES' in source, 'Official current-signer API required')
    check('signingConfigs' not in (ROOT / 'app/build.gradle').read_text(), 'Do not reuse VDRAW signing config')
    return {'sourceSafetyAudit': 'PASS', 'permissions': [], 'scopedQuery': 'jp.dksc.vdraw.prototype007'}

def command(*args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=60)
    check(result.returncode == 0, 'Tool failed: ' + args[0] + '\n' + result.stdout + result.stderr)
    return result.stdout

def build_evidence():
    output = Path('inspector-delivery')
    output.mkdir(exist_ok=True)
    apk = output / 'VDRAW-SIGNATURE-CHECK-1.0.0.apk'
    check(apk.is_file(), 'Built APK missing')
    sdk = Path(os.environ['ANDROID_HOME'])
    tool = sdk / 'build-tools/36.0.0'
    signature = command(str(tool / 'apksigner'), 'verify', '--verbose', '--print-certs', str(apk))
    certs = re.findall(r'Signer #\d+ certificate SHA-256 digest: ([0-9a-f]+)', signature)
    check(len(certs) == 1 and certs[0] != BASELINE_CERT, 'Inspector signer must be independent')
    check('Verified using v2 scheme (APK Signature Scheme v2): true' in signature, 'Inspector v2 required')
    badging = command(str(tool / 'aapt'), 'dump', 'badging', str(apk))
    package = re.search(r"^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging, re.M)
    check(package and package.groups() == (APP_ID, '1', '1.0.0'), 'Inspector identity mismatch')
    permissions = command(str(tool / 'aapt'), 'dump', 'permissions', str(apk))
    check('uses-permission:' not in permissions, 'Merged APK must request zero permissions')
    tests = list((ROOT / 'app/build/test-results/testDebugUnitTest').glob('TEST-*.xml'))
    check(bool(tests), 'Unit test evidence missing')
    total = 0
    for path in tests:
        suite = ET.parse(path).getroot()
        total += int(suite.get('tests', '0'))
        check(all(int(suite.get(k, '0')) == 0 for k in ['failures', 'errors', 'skipped']), 'Unit failures or skips')
    check(total == 8, 'Expected eight decision/hash tests')
    report = source_audit() | {
        'status': 'PASS', 'applicationId': APP_ID, 'versionCode': 1, 'versionName': '1.0.0',
        'apkSHA256': hashlib.sha256(apk.read_bytes()).hexdigest(), 'apkBytes': apk.stat().st_size,
        'certificateSHA256': certs[0], 'officialApksigner': 'PASS', 'unitTests': {'pass': total, 'fail': 0, 'skip': 0},
        'buildHEAD': os.environ['GITHUB_SHA'], 'runId': os.environ['GITHUB_RUN_ID'],
        'signingMode': 'isolated standard Android debug signing; not VDRAW permanent signing',
        'installedUserDeviceIdentity': 'NOT_VERIFIED', 'existingVDRAWUpdateCompatibility': 'BLOCKED',
        'existingPrivateKeyRecovered': False,
    }
    (output / 'inspector-build-report.json').write_text(json.dumps(report, indent=2) + '\n')
    (output / 'APK-SHA256.txt').write_text(report['apkSHA256'] + '  ' + apk.name + '\n')
    print(json.dumps(report))

if __name__ == '__main__':
    if sys.argv[1] == 'source':
        print(json.dumps(source_audit()))
    else:
        build_evidence()
