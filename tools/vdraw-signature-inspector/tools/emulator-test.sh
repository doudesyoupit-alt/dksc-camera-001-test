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
adb shell am start -W -n jp.dksc.vdraw.signatureinspector/.MainActivity
adb shell uiautomator dump /sdcard/inspector-before.xml
adb pull /sdcard/inspector-before.xml inspector-os-evidence/before.xml
read -r tap_x tap_y < <(python3 - <<'PY'
import re
import xml.etree.ElementTree as ET
root = ET.parse('inspector-os-evidence/before.xml').getroot()
nodes = [n for n in root.iter('node') if n.get('text') == '007の署名を確認']
assert len(nodes) == 1 and nodes[0].get('clickable') == 'true' and nodes[0].get('enabled') == 'true'
left, top, right, bottom = map(int, re.findall(r'\d+', nodes[0].get('bounds')))
assert right > left and bottom > top
print((left+right)//2, (top+bottom)//2)
PY
)
adb shell input tap "$tap_x" "$tap_y"
adb shell uiautomator dump /sdcard/inspector-after.xml
adb pull /sdcard/inspector-after.xml inspector-os-evidence/after.xml
python3 - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('inspector-os-evidence/after.xml').getroot()
text = '\n'.join(n.get('text','') for n in root.iter('node'))
assert '基準007と一致' in text, text
assert 'c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855' in text.replace('\n',''), text
PY
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
    'screenCoordinateTapAndVisibleResult': 'PASS',
    'userDeviceTest': 'NOT_RUN', 'userDeviceDataChanged': False,
    'existingVDRAWUpdateCompatibility': 'BLOCKED'
}, indent=2) + '\n')
PY
