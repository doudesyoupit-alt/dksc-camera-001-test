"""Release-only secret restoration and public APK evidence. No secret values are logged."""
import argparse
import base64
import binascii
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

class SigningFailure(ValueError):
    """Only constant internal reason codes; never pass tool output or secret values."""


def require(condition, reason):
    if not condition:
        raise SigningFailure(reason)

def readiness(policy, env):
    missing = [name for name in SECRET_NAMES if not env.get(name)]
    pin = policy.get('certificateSha256')
    pin_ok = isinstance(pin, str) and bool(re.fullmatch('[0-9a-f]{64}', pin)) and pin != policy['legacyCertificateSha256']
    matches = pin_ok and env.get('VDRAW_SIGNING_CERT_SHA256') == pin
    receipt = policy.get('keyPreservationReceipt') or {}
    preserved = (receipt.get('recoveryVerification') == 'PASS' and
                 bool(re.fullmatch('[0-9a-f]{64}', str(receipt.get('encryptedArchiveSha256', '')))) and
                 bool(receipt.get('vaultReference')))
    build_authorized = policy.get('provisioningStatus') == 'READY_FOR_FIXED_APK_VALIDATION'
    ready = not missing and matches and preserved and build_authorized
    return {'status': 'PASS' if ready else 'BLOCKED', 'missingSecretNames': missing,
            'publicCertificatePinConfigured': pin_ok, 'secretCertificatePinMatches': bool(matches),
            'fixedApkBuildAuthorized': build_authorized,
            'privateKeyPreserved': 'PROVISIONING_RECEIPT_PRESENT' if preserved else 'NOT_VERIFIED',
            'legacyToPermanentUpdateCompatibility': 'NOT_PROVEN',
            'userDeviceDataChanged': False}

def safe_command(args):
    result = subprocess.run(args, text=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
    require(result.returncode == 0, 'SIGNING_TOOL_FAILED')
    return result.stdout

def keytool_stage(args, failure_code):
    try:
        return safe_command(args)
    except SigningFailure:
        raise SigningFailure(failure_code) from None

def key_password_check(env):
    # Java KeyStore.getKey checks the actual PKCS12 private-key password.
    # keytool may ignore -keypass for PKCS12, so it cannot prove this stage.
    run_temp = Path(env['RUNNER_TEMP']).resolve()
    with tempfile.TemporaryDirectory(prefix='vdraw007-private-key-check-', dir=run_temp) as directory:
        os.chmod(directory, 0o700)
        source = Path(directory) / 'VDRAWKeyCheck.java'
        source.write_text("""
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Key;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.UnrecoverableKeyException;
import java.util.Arrays;
public class VDRAWKeyCheck {
    public static void main(String[] args) {
        char[] store = System.getenv("VDRAW_SIGNING_STORE_PASSWORD").toCharArray();
        char[] password = System.getenv("VDRAW_SIGNING_KEY_PASSWORD").toCharArray();
        int exit = 30;
        try {
            KeyStore ks = KeyStore.getInstance("PKCS12");
            try (InputStream input = Files.newInputStream(Path.of(System.getenv("VDRAW_SIGNING_KEYSTORE_PATH")))) {
                ks.load(input, store);
            }
            Key key = ks.getKey(System.getenv("VDRAW_SIGNING_KEY_ALIAS"), password);
            exit = key instanceof PrivateKey ? 0 : 22;
        } catch (UnrecoverableKeyException error) {
            exit = 21;
        } catch (Exception error) {
            exit = 30;
        } finally {
            Arrays.fill(store, '\\0');
            Arrays.fill(password, '\\0');
        }
        System.exit(exit);
    }
}
""")
        os.chmod(source, 0o600)
        result = subprocess.run(['java', str(source)], env=env, text=False,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        if result.returncode == 21:
            raise SigningFailure('KEY_PASSWORD_INVALID')
        if result.returncode == 22:
            raise SigningFailure('KEY_ALIAS_INVALID')
        require(result.returncode == 0, 'PRIVATE_KEY_CHECK_FAILED')

def build_release(env, version_code, version_name):
    require(version_code in (8, 9) and version_name == {8: '0.8.0', 9: '0.8.1'}[version_code],
            'APK_BUILD_VERSION_INVALID')
    key_password_check(env)
    tasks = [':app:assembleRelease']
    if version_code == 8:
        tasks.append(':app:assembleReleaseAndroidTest')
    # Never forward raw Gradle stdout/stderr, which can include the secret alias.
    result = subprocess.run(['gradle', '-p', 'android', '--no-daemon',
        '-PvdrawPermanentSigning=true', '-PvdrawVersionCode=' + str(version_code),
        '-PvdrawVersionName=' + version_name] + tasks, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=900)
    require(result.returncode == 0, 'APK_BUILD_FAILED')
    return {'status': 'PASS', 'versionCode': version_code, 'versionName': version_name,
            'privateKeyPasswordCheck': 'PASS', 'rawToolOutputPublished': False}

def prepare(policy, env):
    require(readiness(policy, env)['status'] == 'PASS', 'SIGNING_SECRETS_OR_PUBLIC_PIN_NOT_READY')
    run_temp = Path(env['RUNNER_TEMP']).resolve()
    require(run_temp.is_dir() and not run_temp.is_relative_to(ROOT.resolve().parent.parent), 'PRIVATE_DIRECTORY_MUST_BE_OUTSIDE_REPOSITORY')
    # Repository Secret entry may preserve ASCII whitespace from the Base64 handoff.
    # Normalize only transport whitespace; keep strict decoding and authenticate bytes.
    encoded = re.sub(r'[ \t\r\n\f\v]', '', env['VDRAW_SIGNING_KEYSTORE_B64'])
    raw = base64.b64decode(encoded, validate=True)
    require(0 < len(raw) <= 24000, 'KEYSTORE_SIZE_INVALID')
    require(hashlib.sha256(raw).hexdigest() == policy['keyPreservationReceipt']['encryptedArchiveSha256'],
            'KEYSTORE_BYTES_PIN_MISMATCH')
    # Private keys never enter the repository, artifacts, caches or command-line password arguments.
    directory = Path(tempfile.mkdtemp(prefix='vdraw007-private-signing-', dir=run_temp))
    os.chmod(directory, 0o700)
    try:
        path = directory / 'permanent.p12'
        with path.open('xb') as handle:
            os.chmod(path, 0o600)
            handle.write(raw)
        keytool_stage(['keytool', '-list', '-keystore', str(path), '-storetype', 'PKCS12',
            '-storepass:env', 'VDRAW_SIGNING_STORE_PASSWORD'], 'STORE_PASSWORD_INVALID')
        certificate = keytool_stage(['keytool', '-exportcert', '-keystore', str(path), '-storetype', 'PKCS12',
            '-storepass:env', 'VDRAW_SIGNING_STORE_PASSWORD', '-alias', env['VDRAW_SIGNING_KEY_ALIAS']],
            'KEY_ALIAS_INVALID')
        require(hashlib.sha256(certificate).hexdigest() == policy['certificateSha256'], 'KEYSTORE_CERTIFICATE_PIN_MISMATCH')
        with open(env['GITHUB_ENV'], 'a') as handle:
            handle.write('VDRAW_SIGNING_KEYSTORE_PATH=' + str(path) + '\n')
        return {'status': 'PASS', 'restoredCertificateSha256': policy['certificateSha256'], 'keyMaterialLogged': False,
                'storePasswordCheck': 'PASS', 'keyAliasCheck': 'PASS', 'certificatePinCheck': 'PASS'}
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

def failure_report(error):
    reason = ('CERTIFICATE_PIN_MISMATCH' if error.args[0] == 'KEYSTORE_CERTIFICATE_PIN_MISMATCH'
              else error.args[0]) if isinstance(error, SigningFailure) else 'SIGNING_BASE64_INVALID' if isinstance(error, binascii.Error) else 'SIGNING_OPERATION_FAILED'
    return {'status': 'BLOCKED', 'reason': reason, 'errorType': type(error).__name__, 'privateKeyLogged': False}

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('mode', choices=['readiness', 'prepare', 'verify', 'build'])
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--apk', type=Path)
    p.add_argument('--version-code', type=int)
    p.add_argument('--version-name')
    a = p.parse_args()
    a.output.parent.mkdir(parents=True, exist_ok=True)
    try:
        policy = json.loads(POLICY.read_text())
        result = readiness(policy, os.environ) if a.mode == 'readiness' else prepare(policy, os.environ) if a.mode == 'prepare' else build_release(os.environ, a.version_code, a.version_name) if a.mode == 'build' else verify_apk(policy, a.apk, a.version_code, a.version_name)
    except Exception as error:
        # Exception messages from key parsing or tools may include sensitive inputs; do not echo them.
        result = failure_report(error)
    a.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    raise SystemExit(0 if result['status'] == 'PASS' else 2)
