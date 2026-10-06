"""Additional release-version tests; inherited signing tests remain unchanged."""
import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

path = Path(__file__).resolve().parents[1] / 'scripts/permanent-signing.py'
spec = importlib.util.spec_from_file_location('signing_save001', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ReleaseVersion(unittest.TestCase):
    def test_082_build_uses_permanent_key_and_builds_update_instrumentation(self):
        with patch.object(module, 'key_password_check') as key_check, patch.object(module.subprocess, 'run',
                return_value=subprocess.CompletedProcess(['gradle'], 0)) as run:
            result = module.build_release({}, 10, '0.8.2')
            key_check.assert_called_once_with({})
            args = run.call_args.args[0]
            self.assertIn('-PvdrawPermanentSigning=true', args)
            self.assertIn('-PvdrawVersionCode=10', args)
            self.assertIn('-PvdrawVersionName=0.8.2', args)
            self.assertIn(':app:assembleReleaseAndroidTest', args)
            self.assertEqual(result['status'], 'PASS')
            self.assertIs(run.call_args.kwargs['stdout'], subprocess.PIPE)
            self.assertIs(run.call_args.kwargs['stderr'], subprocess.PIPE)
    def test_wrong_or_unapproved_version_fails_before_private_key_access(self):
        for code, name in [(10, '0.8.1'), (9, '0.8.2'), (11, '0.8.3'), (7, '0.7.0')]:
            with patch.object(module, 'key_password_check') as key_check:
                with self.assertRaisesRegex(module.SigningFailure, '^APK_BUILD_VERSION_INVALID$'):
                    module.build_release({}, code, name)
                key_check.assert_not_called()

if __name__ == '__main__': unittest.main()
