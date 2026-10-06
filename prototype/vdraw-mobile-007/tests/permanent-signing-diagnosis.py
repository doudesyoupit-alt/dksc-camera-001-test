"""Synthetic credential-stage tests; no production keystore or Secrets are read."""
import base64
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch

module_path = Path(__file__).resolve().parents[1] / 'scripts/permanent-signing.py'
spec = importlib.util.spec_from_file_location('permanent_diagnosis', module_path)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class SigningDiagnosis(unittest.TestCase):
    def fixture(self, directory):
        raw = b'synthetic-pkcs12-fixture'
        cert = b'synthetic-public-certificate'
        pin = hashlib.sha256(cert).hexdigest()
        policy = {'certificateSha256': pin, 'legacyCertificateSha256': 'b' * 64,
            'provisioningStatus': 'READY_FOR_FIXED_APK_VALIDATION',
            'keyPreservationReceipt': {'recoveryVerification': 'PASS',
                'encryptedArchiveSha256': hashlib.sha256(raw).hexdigest(), 'vaultReference': 'synthetic'}}
        env = dict(os.environ)
        env.update({name: 'PRIVATE_SENTINEL_' + name for name in m.SECRET_NAMES})
        env.update(VDRAW_SIGNING_KEYSTORE_B64=base64.b64encode(raw).decode(),
            VDRAW_SIGNING_CERT_SHA256=pin, RUNNER_TEMP=directory,
            GITHUB_ENV=str(Path(directory) / 'github-env'),
            VDRAW_SIGNING_KEYSTORE_PATH=str(Path(directory) / 'synthetic.p12'))
        return policy, env, cert

    def test_store_failure_stops_before_alias_export_and_removes_key(self):
        with tempfile.TemporaryDirectory() as directory:
            policy, env, cert = self.fixture(directory)
            with patch.dict(os.environ, env), patch.object(m, 'safe_command',
                    side_effect=m.SigningFailure('SIGNING_TOOL_FAILED')) as command:
                with self.assertRaisesRegex(m.SigningFailure, '^STORE_PASSWORD_INVALID$'):
                    m.prepare(policy, env)
                self.assertEqual(command.call_count, 1)
                args = command.call_args.args[0]
                self.assertIn('-list', args)
                self.assertNotIn('-alias', args)
                self.assertNotIn('-keypass:env', args)
                self.assertNotIn(env['VDRAW_SIGNING_STORE_PASSWORD'], args)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_alias_failure_occurs_only_after_store_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            policy, env, cert = self.fixture(directory)
            with patch.dict(os.environ, env), patch.object(m, 'safe_command',
                    side_effect=[b'synthetic-list', m.SigningFailure('SIGNING_TOOL_FAILED')]) as command:
                with self.assertRaisesRegex(m.SigningFailure, '^KEY_ALIAS_INVALID$'):
                    m.prepare(policy, env)
                self.assertEqual(command.call_count, 2)
                self.assertIn('-list', command.call_args_list[0].args[0])
                self.assertIn('-exportcert', command.call_args_list[1].args[0])
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_certificate_failure_is_publicly_classified_after_both_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            policy, env, cert = self.fixture(directory)
            with patch.dict(os.environ, env), patch.object(m, 'safe_command',
                    side_effect=[b'synthetic-list', b'wrong-certificate']):
                try:
                    m.prepare(policy, env)
                    self.fail('certificate mismatch accepted')
                except m.SigningFailure as error:
                    self.assertEqual(m.failure_report(error)['reason'], 'CERTIFICATE_PIN_MISMATCH')
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_success_records_stages_without_any_private_value(self):
        with tempfile.TemporaryDirectory() as directory:
            policy, env, cert = self.fixture(directory)
            with patch.dict(os.environ, env), patch.object(m, 'safe_command',
                    side_effect=[b'synthetic-list', cert]):
                result = m.prepare(policy, env)
            self.assertEqual(result['status'], 'PASS')
            for name in ('storePasswordCheck', 'keyAliasCheck', 'certificatePinCheck'):
                self.assertEqual(result[name], 'PASS')
            for value in env.values():
                if value.startswith('PRIVATE_SENTINEL_'):
                    self.assertNotIn(value, json.dumps(result))

    def test_key_password_failure_prevents_gradle_and_never_emits_tool_output(self):
        with tempfile.TemporaryDirectory() as directory:
            policy, env, cert = self.fixture(directory)
            output = io.StringIO()
            result = subprocess.CompletedProcess(['java'], 21, b'PRIVATE_STDOUT_SENTINEL', b'PRIVATE_STDERR_SENTINEL')
            with redirect_stdout(output), redirect_stderr(output), patch.object(m.subprocess, 'run',
                    return_value=result) as command:
                with self.assertRaisesRegex(m.SigningFailure, '^KEY_PASSWORD_INVALID$'):
                    m.build_release(env, 8, '0.8.0')
                self.assertEqual(command.call_count, 1)
                args = command.call_args.args[0]
                self.assertEqual(args[0], 'java')
                for name in m.SECRET_NAMES:
                    self.assertNotIn(env[name], args)
                self.assertIs(command.call_args.kwargs['stdout'], subprocess.PIPE)
                self.assertIs(command.call_args.kwargs['stderr'], subprocess.PIPE)
            self.assertEqual(output.getvalue(), '')
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_java_infrastructure_failure_is_not_false_password_diagnosis(self):
        with tempfile.TemporaryDirectory() as directory:
            policy, env, cert = self.fixture(directory)
            with patch.object(m.subprocess, 'run', return_value=subprocess.CompletedProcess(['java'], 30)):
                with self.assertRaisesRegex(m.SigningFailure, '^PRIVATE_KEY_CHECK_FAILED$'):
                    m.build_release(env, 8, '0.8.0')

    def test_build_failure_is_captured_without_claiming_password_invalid(self):
        with tempfile.TemporaryDirectory() as directory:
            policy, env, cert = self.fixture(directory)
            output = io.StringIO()
            with redirect_stdout(output), redirect_stderr(output), patch.object(m.subprocess, 'run',
                    side_effect=[subprocess.CompletedProcess(['java'], 0),
                    subprocess.CompletedProcess(['gradle'], 1, b'PRIVATE_STDOUT_SENTINEL', b'PRIVATE_STDERR_SENTINEL')]):
                with self.assertRaisesRegex(m.SigningFailure, '^APK_BUILD_FAILED$'):
                    m.build_release(env, 8, '0.8.0')
            self.assertEqual(output.getvalue(), '')

    def test_success_build_uses_only_permitted_versions_and_required_tasks(self):
        for code, name in [(8, '0.8.0'), (9, '0.8.1')]:
            with tempfile.TemporaryDirectory() as directory:
                policy, env, cert = self.fixture(directory)
                with patch.object(m.subprocess, 'run', side_effect=[
                        subprocess.CompletedProcess(['java'], 0), subprocess.CompletedProcess(['gradle'], 0)]) as command:
                    result = m.build_release(env, code, name)
                    self.assertEqual(result['status'], 'PASS')
                    args = command.call_args.args[0]
                    self.assertIn(':app:assembleRelease', args)
                    self.assertEqual(':app:assembleReleaseAndroidTest' in args, code == 8)
        with patch.object(m.subprocess, 'run') as command:
            with self.assertRaises(m.SigningFailure):
                m.build_release({}, 7, '0.7.0')
            command.assert_not_called()

    def test_java_source_compiles_and_failure_outputs_no_private_values(self):
        with tempfile.TemporaryDirectory() as directory:
            policy, env, cert = self.fixture(directory)
            original = subprocess.run
            def execute(args, **kwargs):
                result = original(args, **kwargs)
                self.assertEqual(result.returncode, 30)
                self.assertEqual(result.stdout, b'')
                self.assertEqual(result.stderr, b'')
                return result
            with patch.object(m.subprocess, 'run', side_effect=execute):
                with self.assertRaisesRegex(m.SigningFailure, '^PRIVATE_KEY_CHECK_FAILED
        for error in [ValueError('PRIVATE_SENTINEL'), RuntimeError('PRIVATE_SENTINEL'),
                subprocess.TimeoutExpired(['PRIVATE_SENTINEL'], 60,
                    output=b'PRIVATE_SENTINEL', stderr=b'PRIVATE_SENTINEL')]:
            report = m.failure_report(error)
            self.assertNotIn('PRIVATE_SENTINEL', json.dumps(report))
            self.assertEqual(report['reason'], 'SIGNING_OPERATION_FAILED')

if __name__ == '__main__':
    unittest.main()
):
                    m.key_password_check(env)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_raw_exception_text_and_partial_tool_outputs_never_enter_report(self):
        for error in [ValueError('PRIVATE_SENTINEL'), RuntimeError('PRIVATE_SENTINEL'),
                subprocess.TimeoutExpired(['PRIVATE_SENTINEL'], 60,
                    output=b'PRIVATE_SENTINEL', stderr=b'PRIVATE_SENTINEL')]:
            report = m.failure_report(error)
            self.assertNotIn('PRIVATE_SENTINEL', json.dumps(report))
            self.assertEqual(report['reason'], 'SIGNING_OPERATION_FAILED')

if __name__ == '__main__':
    unittest.main()
