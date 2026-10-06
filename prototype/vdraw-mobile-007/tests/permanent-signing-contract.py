"""No permanent key is generated here. Synthetic values test secret/pin fail-closed decisions."""
import importlib.util
from pathlib import Path
import unittest

module_path = Path(__file__).resolve().parents[1] / 'scripts/permanent-signing.py'
spec = importlib.util.spec_from_file_location('permanent_signing', module_path)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class SigningContract(unittest.TestCase):
    def setUp(self):
        self.pin = 'a' * 64
        self.policy = {'certificateSha256': self.pin, 'legacyCertificateSha256': 'b' * 64,
            'keyPreservationReceipt': {'recoveryVerification': 'PASS', 'encryptedArchiveSha256': 'c' * 64, 'vaultReference': 'synthetic-vault-reference'}}
        self.env = {name: 'synthetic-private-value' for name in m.SECRET_NAMES}
        self.env['VDRAW_SIGNING_CERT_SHA256'] = self.pin
    def test_complete_presence_is_only_readiness(self):
        r = m.readiness(self.policy, self.env)
        self.assertEqual(r['status'], 'PASS')
        self.assertEqual(r['privateKeyPreserved'], 'PROVISIONING_RECEIPT_PRESENT')
        self.assertEqual(r['legacyToPermanentUpdateCompatibility'], 'NOT_PROVEN')
    def test_each_missing_secret_blocks(self):
        for name in m.SECRET_NAMES:
            env = self.env.copy(); env.pop(name)
            r = m.readiness(self.policy, env)
            self.assertEqual(r['status'], 'BLOCKED')
            self.assertIn(name, r['missingSecretNames'])
    def test_unpinned_key_blocks(self):
        self.policy['certificateSha256'] = None
        self.assertEqual(m.readiness(self.policy, self.env)['status'], 'BLOCKED')
    def test_legacy_certificate_cannot_be_new_pin(self):
        self.policy['certificateSha256'] = self.policy['legacyCertificateSha256']
        self.env['VDRAW_SIGNING_CERT_SHA256'] = self.policy['certificateSha256']
        self.assertEqual(m.readiness(self.policy, self.env)['status'], 'BLOCKED')
    def test_changed_secret_fingerprint_blocks(self):
        self.env['VDRAW_SIGNING_CERT_SHA256'] = 'c' * 64
        self.assertEqual(m.readiness(self.policy, self.env)['status'], 'BLOCKED')
    def test_bad_pin_blocks(self):
        self.policy['certificateSha256'] = 'bad'
        self.assertEqual(m.readiness(self.policy, self.env)['status'], 'BLOCKED')
    def test_report_does_not_expose_secret_values(self):
        self.assertNotIn('synthetic-private-value', str(m.readiness(self.policy, self.env)))
    def test_missing_secrets_do_not_create_key_file(self):
        with self.assertRaises(ValueError): m.prepare(self.policy, {})
    def test_missing_or_failed_preservation_blocks(self):
        for receipt in [None, {}, {'recoveryVerification': 'FAIL'}, {'recoveryVerification': 'PASS', 'encryptedArchiveSha256': 'bad', 'vaultReference': 'synthetic'}]:
            self.policy['keyPreservationReceipt'] = receipt
            self.assertEqual(m.readiness(self.policy, self.env)['status'], 'BLOCKED')

if __name__ == '__main__': unittest.main()
