"""Release-only secret restoration and public APK evidence. No secret values are logged."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
POLICY = Path(__file__).with_name('permanent-signing-policy.json')
SECRET_NAMES = ('VDRAW_SIGNING_KEYSTORE_B64', 'VDRAW_SIGNING_STORE_PASSWORD', 'VDRAW_SIGNING_KEY_ALIAS', 'VDRAW_SIGNING_KEY_PASSWORD', 'VDRAW_SIGNING_CERT_SHA256')

def require(condition, reason):
    if not condition:
        raise ValueError(reason)

def readiness(policy, env):
    missing = [name for name in SECRET_NAMES if not env.get(name)]
    pin = policy.get('certificateSha256')
    pin_ok = isinstance(pin, str) and bool(re.fullmatch('[0-9a-f]{64}', pin)) and pin != policy['legacyCertificateSha256']
    matches = pin_ok and env.get('VDRAW_SIGNING_CERT_SHA256') == pin
    receipt = policy.get('keyPreservationReceipt') or {}
    preserved = (receipt.get('recoveryVerification') == 'PASS' and
                 bool(re.fullmatch('[0-9a-f]{64}', str(receipt.get('encryptedArchiveSha256', '')))) and
                 bool(receipt.get('vaultReference')))
    ready = not missing and matches and preserved
    return {'status': 'PASS' if ready else 'BLOCKED', 'missingSecretNames': missing,
            'publicCertificatePinConfigured': pin_ok, 'secretCertificatePinMatches': bool(matches),
            'privateKeyPreserved': 'PROVISIONING_RECEIPT_PRESENT' if preserved else 'NOT_VERIFIED',
            'legacyToPermanentUpdateCompatibility': 'NOT_PROVEN',
            'userDeviceDataChanged': False}

def safe_command(args):
    result = subprocess.run(args, text=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
    require(result.returncode == 0, 'SIGNING_TOOL_FAILED')
    return result.stdout

def prepare(policy, env):
    require(readiness(policy, env)['status'] == 'PASS', 'SIGNING_SECRETS_OR_PUBLIC_PIN_NOT_READY')
    run_temp = Path(env['RUNNER_TEMP']).resolve()
    require(run_temp.is_dir() and not run_temp.is_relative_to(ROOT.resolve()), 'PRIVATE_DIRECTORY_MUST_BE_OUTSIDE_REPOSITORY')
    raw = base64.b64decode(env['VDRAW_SIGNING_KEYSTORE_B64'], validate=True)
    require(0 < len(raw) <= 24000, 'KEYSTORE_SIZE_INVALID')
    # Private keys never enter the repository, artifacts, caches or command-line password arguments.
    directory = Path(tempfile.mkdtemp(prefix='vdraw007-private-signing-', dir=run_temp))
    os.chmod(directory, 0o700)
    try:
        path = directory / 'permanent.p12'
        with path.open('xb') as handle:
            os.chmod(path, 0o600)
            handle.write(raw)
        certificate = safe_command(['keytool', '-exportcert', '-keystore', str(path), '-storetype', 'PKCS12',
            '-storepass:env', 'VDRAW_SIGNING_STORE_PASSWORD', '-alias', env['VDRAW_SIGNING_KEY_ALIAS']])
        require(hashlib.sha256(certificate).hexdigest() == policy['certificateSha256'], 'KEYSTORE_CERTIFICATE_PIN_MISMATCH')
        with open(env['GITHUB_ENV'], 'a') as handle:
            handle.write('VDRAW_SIGNING_KEYSTORE_PATH=' + str(path) + '\n')
        return {'status': 'PASS', 'restoredCertificateSha256': policy['certificateSha256'], 'keyMaterialLogged': False}
    except BaseException:
        shutil.rmtree(directory)
        raise

def verify_apk(policy, apk, version_code, version_name):
    require(policy.get('certificateSha256'), 'PUBLIC_CERTIFICATE_PIN_NOT_SET')
    tool = Path(os.environ['ANDROID_HOME']) / 'build-tools/35.0.0'
    certificate_output = safe_command([str(tool / 'apksigner'), 'verify', '--verbose', '--print-certs', str(apk)]).decode()
    certificates = re.findall(r'Signer #\d+ certificate SHA-256 digest: ([0-9a-f]+)', certificate_output)
    require(certificates == [policy['certificateSha256']], 'APK_CERTIFICATE_PIN_MISMATCH')
    require('Verified using v2 scheme (APK Signature Scheme v2): true' in certificate_output, 'APK_V2_VERIFICATION_REQUIRED')
    badging = safe_command([str(tool / 'aapt'), 'dump', 'badging', str(apk)]).decode()
    m = re.search(r"^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging, re.M)
    require(m and m.groups() == (policy['applicationId'], str(version_code), version_name), 'APK_MANIFEST_IDENTITY_MISMATCH')
    return {'status': 'PASS', 'package': policy['applicationId'], 'versionCode': version_code, 'versionName': version_name,
            'apkSHA256': hashlib.sha256(apk.read_bytes()).hexdigest(), 'certificateSHA256': certificates[0],
            'apkBytes': apk.stat().st_size, 'officialApksigner': 'PASS', 'workflowRun': os.environ['GITHUB_RUN_ID'],
            'sourceHEAD': os.environ['GITHUB_SHA'], 'legacyToPermanentUpdateCompatibility': 'NOT_PROVEN'}

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('mode', choices=['readiness', 'prepare', 'verify'])
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--apk', type=Path)
    p.add_argument('--version-code', type=int)
    p.add_argument('--version-name')
    a = p.parse_args()
    a.output.parent.mkdir(parents=True, exist_ok=True)
    try:
        policy = json.loads(POLICY.read_text())
        result = readiness(policy, os.environ) if a.mode == 'readiness' else prepare(policy, os.environ) if a.mode == 'prepare' else verify_apk(policy, a.apk, a.version_code, a.version_name)
    except Exception as error:
        # Exception messages from key parsing or tools may include sensitive inputs; do not echo them.
        result = {'status': 'BLOCKED', 'reason': 'SIGNING_OPERATION_FAILED', 'errorType': type(error).__name__, 'privateKeyLogged': False}
    a.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    raise SystemExit(0 if result['status'] == 'PASS' else 2)
