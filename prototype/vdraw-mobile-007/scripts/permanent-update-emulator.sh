#!/usr/bin/env bash
set -euo pipefail
mkdir -p signing-update-evidence
certificate_sha="$(python3 -c 'import json;print(json.load(open("fixed-apks/A.json"))["certificateSHA256"])')"
adb install fixed-apks/VDRAW-MOBILE-008-fixed.apk
adb install -t fixed-apks/update-test.apk
adb shell am instrument -w -e stage A -e versionCode 8 -e certificateSha256 "$certificate_sha" jp.dksc.vdraw.prototype007.test/jp.dksc.vdraw.prototype007.PermanentUpdateInstrumentation > signing-update-evidence/A.log
python3 - <<'PY'
from pathlib import Path
text=Path('signing-update-evidence/A.log').read_text()
assert 'INSTRUMENTATION_RESULT: status=PASS' in text and 'INSTRUMENTATION_CODE: -1' in text, text
PY
# Update only; no uninstall, clear, -d downgrade or fallback reinstall is allowed.
adb install -r fixed-apks/VDRAW-MOBILE-009-fixed.apk > signing-update-evidence/adb-update.log
adb shell am instrument -w -e stage B -e versionCode 9 -e certificateSha256 "$certificate_sha" jp.dksc.vdraw.prototype007.test/jp.dksc.vdraw.prototype007.PermanentUpdateInstrumentation > signing-update-evidence/B.log
python3 - <<'PY'
import json
from pathlib import Path
for stage in ['A','B']:
    text=Path('signing-update-evidence/'+stage+'.log').read_text()
    assert 'INSTRUMENTATION_RESULT: status=PASS' in text and 'INSTRUMENTATION_CODE: -1' in text, text
    assert 'INSTRUMENTATION_RESULT: productProjectPreservation=PASS' in text, text
a=json.loads(Path('fixed-apks/A.json').read_text());b=json.loads(Path('fixed-apks/B.json').read_text())
assert a['certificateSHA256']==b['certificateSHA256'] and a['package']==b['package'] and b['versionCode']>a['versionCode']>=8
assert 'Success' in Path('signing-update-evidence/adb-update.log').read_text()
Path('signing-update-evidence/acceptance.json').write_text(json.dumps({'status':'PASS','A':a,'B':b,'updateWithoutUninstall':'PASS','actualProductProjectPreservation':'PASS','userDeviceTouched':False,'legacyToPermanentUpdateCompatibility':'NOT_PROVEN'},indent=2)+'\n')
PY
