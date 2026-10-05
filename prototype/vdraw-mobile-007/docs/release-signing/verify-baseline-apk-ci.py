"""Verify only the pre-existing VDRAW 007 APK; never build or sign anything."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request

REPO = 'doudesyoupit-alt/dksc-camera-001-test'
RUN = 37283743856
HEAD = '1ec046fc1582803cf49716dcfa3330b06c21714f'
ARTIFACT = 11333531784
ARTIFACT_NAME = 'VDRAW-MOBILE-007-debug-37283743856'
ARTIFACT_DIGEST = 'sha256:e10050c500528020ec3b5280b7bbc76eba037723c902fe63f8d5b8ababe6a56c'
APK_NAME = 'VDRAW-MOBILE-007-debug.apk'
APK_SHA = '89350a7e6d8471ba3bbe983dfaeefba477d6ad31519f1036105da5cf9af71d09'
CERT_SHA = 'c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855'
APP_ID = 'jp.dksc.vdraw.prototype007'


def check(condition, message):
    if not condition:
        raise ValueError(message)


def api(path):
    request = urllib.request.Request('https://api.github.com/repos/' + REPO + path,
        headers={'Accept': 'application/vnd.github+json',
                 'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
                 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def metadata():
    run = api('/actions/runs/' + str(RUN))
    check(run['id'] == RUN and run['head_sha'] == HEAD, 'Baseline run identity mismatch')
    check(run['head_branch'] == 'validation' and run['conclusion'] == 'success', 'Baseline run status mismatch')
    check(run['path'] == '.github/workflows/vdraw-mobile-007.yml', 'Baseline workflow mismatch')
    artifact = api('/actions/artifacts/' + str(ARTIFACT))
    check(artifact['id'] == ARTIFACT and artifact['name'] == ARTIFACT_NAME, 'Baseline artifact identity mismatch')
    check(artifact['digest'] == ARTIFACT_DIGEST and not artifact['expired'], 'Baseline artifact digest or expiration mismatch')
    check(artifact['workflow_run']['id'] == RUN and artifact['workflow_run']['head_sha'] == HEAD, 'Artifact source mismatch')
    return {'status': 'PASS', 'baselineRun': RUN, 'baselineHEAD': HEAD,
            'artifactId': ARTIFACT, 'artifactName': ARTIFACT_NAME, 'artifactDigest': ARTIFACT_DIGEST}


def verify(download, output):
    apk = download / APK_NAME
    check(apk.is_file(), 'Expected baseline APK missing')
    check(hashlib.sha256(apk.read_bytes()).hexdigest() == APK_SHA, 'Baseline APK SHA256 mismatch')
    check(apk.stat().st_size == 13141918, 'Baseline APK size mismatch')
    report = json.loads((download / 'ci/APK-report.json').read_text())
    expected = {'sha256': APK_SHA, 'packageId': APP_ID, 'versionCode': 7, 'versionName': '0.7.0',
                'workflowRunId': str(RUN), 'commitSHA': HEAD, 'file': APK_NAME}
    check(all(report.get(k) == v for k, v in expected.items()), 'Original APK-report provenance mismatch')
    check((download / 'APK-SHA256.txt').read_text().split()[0] == APK_SHA, 'Original SHA text mismatch')
    sdk = Path(os.environ.get('ANDROID_HOME', os.environ.get('ANDROID_SDK_ROOT', '')))
    candidates = sorted((sdk / 'build-tools').glob('*/apksigner'), reverse=True)
    check(bool(candidates), 'Existing SDK apksigner unavailable')
    apksigner = next((p for p in candidates if p.parent.name == '35.0.0'), candidates[0])
    aapt = apksigner.parent / 'aapt'
    check(aapt.is_file(), 'Existing SDK aapt unavailable')
    result = subprocess.run([str(apksigner), 'verify', '--verbose', '--print-certs', str(apk)],
        text=True, capture_output=True, timeout=90)
    (output / 'apksigner-public.log').write_text(result.stdout + result.stderr)
    check(result.returncode == 0, 'Official apksigner verify failed')
    check('Verified using v2 scheme (APK Signature Scheme v2): true' in result.stdout,
          'Official APK v2 verification missing')
    certificates = re.findall(r'Signer #\d+ certificate SHA-256 digest: ([0-9a-fA-F]+)', result.stdout)
    check([value.lower() for value in certificates] == [CERT_SHA], 'Official signer certificate mismatch')
    badging = subprocess.run([str(aapt), 'dump', 'badging', str(apk)], text=True, capture_output=True, timeout=30)
    check(badging.returncode == 0, 'Official aapt badging failed')
    package = re.search(r"^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging.stdout, re.M)
    check(package is not None and package.groups() == (APP_ID, '7', '0.7.0'), 'Actual APK manifest identity mismatch')
    return {'status': 'PASS', 'baselineRun': RUN, 'baselineHEAD': HEAD,
            'artifactId': ARTIFACT, 'artifactDigest': ARTIFACT_DIGEST,
            'apkName': APK_NAME, 'apkSHA256': APK_SHA, 'applicationId': APP_ID,
            'versionCode': 7, 'versionName': '0.7.0', 'certificateSHA256': CERT_SHA,
            'officialApksignerVerification': 'PASS', 'verifiedAPKSignatureSchemeV2': True,
            'actualManifestVerification': 'PASS', 'apksignerPath': str(apksigner),
            'verificationRun': os.environ['GITHUB_RUN_ID'], 'verificationHEAD': os.environ['GITHUB_SHA'],
            'newAPKGenerated': False, 'privateKeyRecovered': False,
            'installedDeviceIdentity': 'NOT_VERIFIED', 'updateCompatibility': 'BLOCKED'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['metadata', 'verify'])
    parser.add_argument('--download', type=Path, default=Path('baseline-apk'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    target = args.output / (args.mode + '-result.json')
    try:
        result = metadata() if args.mode == 'metadata' else verify(args.download, args.output)
    except Exception as error:
        target.write_text(json.dumps({'status': 'FAIL', 'errorType': type(error).__name__,
            'reason': str(error), 'newAPKGenerated': False}, indent=2) + '\n')
        raise
    target.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
