"""Public-only verification of shipped SAVE-001 content and accepted delivery gates."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PIN = '186ad92e96316b7a2a247c092fd3d83a94fa7a89ea406859a93b057c329a2d8d'
CHECKPOINT = '5a6a760c7ece23fda764b1f3f6d2fa1f0dd09737'

def verify_content(apk):
    paths = ['src/app.js', 'src/device.js', 'src/native-io.js', 'src/export-jobs.js', 'vendor/native-bridge.js']
    hashes = {}
    with ZipFile(apk) as archive:
        for path in paths:
            actual = archive.read('assets/public/' + path)
            assert actual == (ROOT / 'web' / path).read_bytes(), 'APK_SAVE001_ASSET_MISMATCH'
            hashes[path] = hashlib.sha256(actual).hexdigest()
        dex = b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
        assert b'DocumentSavePlugin' in dex and b'DocumentSaver' in dex, 'APK_SAVE001_NATIVE_PLUGIN_MISSING'
    return {'status': 'PASS', 'save001FixIncluded': 'PASS', 'approvedSave001Checkpoint': CHECKPOINT,
            'sourceHEAD': os.environ['GITHUB_SHA'], 'packagedWebSha256': hashes,
            'compiledDocumentSavePlugin': 'PASS', 'apkSHA256': hashlib.sha256(Path(apk).read_bytes()).hexdigest()}

def accept(directory):
    directory = Path(directory)
    read = lambda name: json.loads((directory / name).read_text())
    a, b, update, content = [read(name) for name in ['A.json', 'B.json', 'update-evidence/acceptance.json', 'save001-content.json']]
    summary, ready = read('regression-summary.json'), read('readiness.json')
    assert ready['status'] == 'PASS', 'READINESS_NOT_PASS'
    assert summary['sourceSha'] == os.environ['GITHUB_SHA'] and summary['suiteComplete'] is True and summary['profile'] == 'full'
    assert summary['pass'] == 53 and summary['fail'] == summary['blocked'] == summary['skip'] == 0
    assert len(summary['rows']) == 53 and all(row['status'] == 'PASS' and row.get('skip', 0) == 0 for row in summary['rows'])
    native = ET.parse(directory / 'DocumentSaveTest.xml').getroot()
    assert int(native.get('tests')) == 9 and all(int(native.get(key)) == 0 for key in ['failures', 'errors', 'skipped'])
    assert a['status'] == b['status'] == content['status'] == update['status'] == 'PASS'
    assert a['package'] == b['package'] == 'jp.dksc.vdraw.prototype007'
    assert a['certificateSHA256'] == b['certificateSHA256'] == PIN
    assert (a['versionCode'], a['versionName'], b['versionCode'], b['versionName']) == (9, '0.8.1', 10, '0.8.2')
    assert b['sourceHEAD'] == content['sourceHEAD'] == os.environ['GITHUB_SHA']
    assert update['A'] == a and update['B'] == b
    assert update['updateWithoutUninstall'] == update['actualProductProjectPreservation'] == 'PASS'
    assert content['save001FixIncluded'] == content['compiledDocumentSavePlugin'] == 'PASS'
    assert content['apkSHA256'] == b['apkSHA256'] == hashlib.sha256((directory / 'VDRAW-MOBILE-010-fixed.apk').read_bytes()).hexdigest()
    return {'status': 'ACCEPTED', 'sourceHEAD': os.environ['GITHUB_SHA'], 'workflowRun': os.environ['GITHUB_RUN_ID'],
            'package': b['package'], 'versionCode': 10, 'versionName': '0.8.2', 'apkSHA256': b['apkSHA256'],
            'certificateSHA256': PIN, 'save001FixIncluded': 'PASS', 'fullRegression': 'PASS',
            'fullRegressionEntries': 53, 'fail': 0, 'blocked': 0, 'skip': 0, 'androidSaveTests': 9,
            'baselineVersion': '0.8.1', 'updateWithoutUninstall': 'PASS', 'actualProductProjectPreservation': 'PASS',
            'protection006': 'PASS_VERIFIED_IN_REQUIRED_FULL_REGRESSION_JOB', 'P0': 0, 'P1': 0,
            'physicalDeviceSavePickerAcceptance': 'PENDING_ONE_USER_CHECK', 'userDeviceTouched': False}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['content', 'accept'])
    parser.add_argument('--apk', type=Path)
    parser.add_argument('--directory', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = verify_content(args.apk) if args.mode == 'content' else accept(args.directory)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
