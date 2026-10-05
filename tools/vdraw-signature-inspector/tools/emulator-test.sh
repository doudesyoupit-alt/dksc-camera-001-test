#!/usr/bin/env bash
set -euo pipefail
api="$1"
mkdir -p inspector-os-evidence
# All adb operations below address only the disposable GitHub-hosted emulator.
adb install baseline-fixture/VDRAW-MOBILE-007-debug.apk
adb install inspector-delivery/VDRAW-SIGNATURE-CHECK-1.0.0.apk
adb install inspector-delivery/inspector-test.apk
adb shell am instrument -w -e expect baseline jp.dksc.vdraw.signatureinspector.test/jp.dksc.vdraw.signatureinspector.InspectorInstrumentation > inspector-os-evidence/baseline.log
cat inspector-os-evidence/baseline.log
adb shell am start -n jp.dksc.vdraw.signatureinspector/.MainActivity
adb shell input tap 240 272
adb exec-out screencap -p > inspector-os-evidence/inspector-screen.png
# Missing-package negative test on emulator only. Never touches the user's installed007.
adb uninstall jp.dksc.vdraw.prototype007
adb shell am instrument -w -e expect missing jp.dksc.vdraw.signatureinspector.test/jp.dksc.vdraw.signatureinspector.InspectorInstrumentation > inspector-os-evidence/missing.log
cat inspector-os-evidence/missing.log
python3 - "$api" <<'PY'
import json
from pathlib import Path
import sys
for mode in ['baseline', 'missing']:
    text = Path('inspector-os-evidence/' + mode + '.log').read_text()
    assert 'INSTRUMENTATION_RESULT: status=PASS' in text, text
    assert 'INSTRUMENTATION_RESULT: uiButton=PASS' in text, text
    assert 'INSTRUMENTATION_CODE: -1' in text, text
    assert 'FAIL' not in text and 'INSTRUMENTATION_FAILED' not in text, text
Path('inspector-os-evidence/acceptance.json').write_text(json.dumps({
    'status': 'PASS', 'apiLevel': int(sys.argv[1]), 'baselineInstalledMetadata': 'PASS',
    'realCheckButton': 'PASS', 'missingPackageNegative': 'PASS',
    'userDeviceTest': 'NOT_RUN', 'userDeviceDataChanged': False,
    'existingVDRAWUpdateCompatibility': 'BLOCKED'
}, indent=2) + '\n')
PY
