"""Synthetic transport checks. Real Repository Secrets are never read by this test."""
import base64
import hashlib
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

module_path = Path(__file__).resolve().parents[1] / 'scripts/permanent-signing.py'
spec = importlib.util.spec_from_file_location('permanent_signing_transport', module_path)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class SigningTransport(unittest.TestCase):
    def fixture(self, directory, encoded, raw=b'synthetic-pkcs12-fixture'):
        certificate = b'synthetic-public-certificate'
        pin = hashlib.sha256(certificate).hexdigest()
        policy = {'certificateSha256': pin, 'legacyCertificateSha256': 'b' * 64,
            'provisioningStatus': 'READY_FOR_FIXED_APK_VALIDATION',
            'keyPreservationReceipt': {'recoveryVerification': 'PASS',
                'encryptedArchiveSha256': hashlib.sha256(raw).hexdigest(), 'vaultReference': 'synthetic'}}
        env = {name: 'synthetic-private-value' for name in m.SECRET_NAMES}
        env.update(VDRAW_SIGNING_KEY_ALIAS='synthetic-alias', VDRAW_SIGNING_KEYSTORE_B64=encoded, VDRAW_SIGNING_CERT_SHA256=pin,
                   RUNNER_TEMP=directory, GITHUB_ENV=str(Path(directory) / 'github-env'))
        return policy, env, certificate

    def test_ascii_transport_whitespace_keeps_exact_pinned_bytes(self):
        raw = b'synthetic-pkcs12-fixture'
        encoded = base64.b64encode(raw).decode()
        for value in [encoded, '\n' + encoded + '\n', ' \t\r\n\f\v'.join(encoded)]:
            with self.subTest(format='synthetic'), tempfile.TemporaryDirectory() as directory:
                policy, env, certificate = self.fixture(directory, value)
                def export(args):
                    key_path = Path(args[args.index('-keystore') + 1])
                    self.assertEqual(key_path.read_bytes(), raw)
                    self.assertEqual(key_path.stat().st_mode & 0o777, 0o600)
                    self.assertEqual(key_path.parent.stat().st_mode & 0o777, 0o700)
                    self.assertNotIn(env['VDRAW_SIGNING_STORE_PASSWORD'], args)
                    return certificate
                with patch.dict(os.environ, env), patch.object(m, 'safe_command', side_effect=export):
                    result = m.prepare(policy, env)
                self.assertEqual(result['status'], 'PASS')
                self.assertNotIn('synthetic-private-value', str(result))

    def test_non_base64_characters_and_non_ascii_whitespace_are_rejected(self):
        encoded = base64.b64encode(b'synthetic-pkcs12-fixture').decode()
        for suffix in ['!', '\u00a0', '\u200b', '\ufeff']:
            with self.subTest(suffix_codepoint=ord(suffix)), tempfile.TemporaryDirectory() as directory:
                policy, env, certificate = self.fixture(directory, encoded + suffix)
                with patch.dict(os.environ, env), patch.object(m, 'safe_command') as command:
                    with self.assertRaises((ValueError, UnicodeError)):
                        m.prepare(policy, env)
                    command.assert_not_called()
                self.assertEqual(list(Path(directory).iterdir()), [])

    def test_valid_base64_with_changed_bytes_is_rejected_before_key_write(self):
        with tempfile.TemporaryDirectory() as directory:
            policy, env, certificate = self.fixture(directory, base64.b64encode(b'changed').decode())
            with patch.dict(os.environ, env), patch.object(m, 'safe_command') as command:
                with self.assertRaisesRegex(ValueError, '^KEYSTORE_BYTES_PIN_MISMATCH$'):
                    m.prepare(policy, env)
                command.assert_not_called()
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_certificate_mismatch_removes_private_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            policy, env, certificate = self.fixture(directory, base64.b64encode(b'synthetic-pkcs12-fixture').decode())
            with patch.dict(os.environ, env), patch.object(m, 'safe_command', return_value=b'changed-certificate'):
                with self.assertRaisesRegex(ValueError, '^KEYSTORE_CERTIFICATE_PIN_MISMATCH$'):
                    m.prepare(policy, env)
            self.assertEqual(list(Path(directory).iterdir()), [])

if __name__ == '__main__':
    unittest.main()
