"""Confirm this is the isolated 006 Android source before any build."""
import json,re,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'capacitor.config.json').read_text())
app=(root/'android/app/build.gradle').read_text()
assert config['appId']=='jp.dksc.vdraw.prototype006'
assert 'applicationId "jp.dksc.vdraw.prototype006"' in app
assert re.search(r'versionCode\s+6\b',app) and 'versionName "0.6.0"' in app
assert "DB_NAME='vdraw-mobile-prototype-006'" in (root/'web/src/storage.js').read_text()
assert (root/'android/gradle/wrapper/gradle-wrapper.jar').is_file()
manifest=root/'CI-SOURCE-MANIFEST.json'
if manifest.exists():
    assert all(hashlib.sha256((root/name).read_bytes()).hexdigest()==digest for name,digest in json.loads(manifest.read_text()).items())
print('PASS: isolated 006 source, debug build prerequisites structurally present')
