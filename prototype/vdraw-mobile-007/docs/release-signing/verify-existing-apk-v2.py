"""Read-only APK v2 verifier for the existing signing audit (not apksigner)."""
import hashlib
import json
import pathlib
import struct
import sys

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


def lp(data, pos=0):
    n = struct.unpack_from('<I', data, pos)[0]
    end = pos + 4 + n
    if end > len(data):
        raise ValueError('Invalid length-prefixed field')
    return data[pos + 4:end], end


def items(data):
    pos = 0
    while pos < len(data):
        item, pos = lp(data, pos)
        yield item
    assert pos == len(data)


def verify(path):
    data = pathlib.Path(path).read_bytes()
    eocd = data.rfind(b'PK\x05\x06')
    assert eocd >= 0 and eocd + 22 + struct.unpack_from('<H', data, eocd + 20)[0] == len(data)
    cd = struct.unpack_from('<I', data, eocd + 16)[0]
    assert cd + struct.unpack_from('<I', data, eocd + 12)[0] == eocd
    assert data[cd - 16:cd] == b'APK Sig Block 42'
    size = struct.unpack_from('<Q', data, cd - 24)[0]
    start = cd - size - 8
    assert struct.unpack_from('<Q', data, start)[0] == size
    pos = start + 8
    v2 = None
    while pos < cd - 24:
        n = struct.unpack_from('<Q', data, pos)[0]
        ident = struct.unpack_from('<I', data, pos + 8)[0]
        assert n >= 4 and pos + 8 + n <= cd - 24
        if ident == 0x7109871a:
            assert v2 is None
            v2 = data[pos + 12:pos + 8 + n]
        pos += 8 + n
    assert pos == cd - 24 and v2 is not None
    signer_list, end = lp(v2)
    assert end == len(v2)
    tail = bytearray(data[eocd:])
    struct.pack_into('<I', tail, 16, start)
    chunks = []
    for section in (data[:start], data[cd:eocd], bytes(tail)):
        for off in range(0, len(section), 1024 * 1024):
            chunk = section[off:off + 1024 * 1024]
            chunks.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(chunk)) + chunk).digest())
    digest = hashlib.sha256(b'\x5a' + struct.pack('<I', len(chunks)) + b''.join(chunks)).digest()
    results = []
    for signer in items(signer_list):
        signed, pos = lp(signer)
        signatures, pos = lp(signer, pos)
        public_key, pos = lp(signer, pos)
        assert pos == len(signer)
        digests, pos = lp(signed)
        certs, pos = lp(signed, pos)
        attributes, pos = lp(signed, pos)
        # AOSP V2SchemeSigner includes a fourth, empty length-prefixed field.
        if pos < len(signed):
            reserved, pos = lp(signed, pos)
            assert reserved == b''
        assert pos == len(signed)
        cert = next(items(certs))
        certificate = x509.load_der_x509_certificate(cert)
        key = certificate.public_key()
        assert key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo) == public_key
        verified = []
        for record in items(signatures):
            algorithm = struct.unpack_from('<I', record)[0]
            signature, end = lp(record, 4)
            assert end == len(record)
            if algorithm == 0x0103:
                key.verify(signature, signed, padding.PKCS1v15(), hashes.SHA256())
                verified.append(algorithm)
        assert verified, 'This audit only supports RSA PKCS1 SHA256'
        matched = []
        for record in items(digests):
            algorithm = struct.unpack_from('<I', record)[0]
            claimed, end = lp(record, 4)
            assert end == len(record)
            if algorithm in verified:
                assert claimed == digest, 'APK content digest mismatch'
                matched.append(algorithm)
        assert matched
        results.append({'certificateSHA256': hashlib.sha256(cert).hexdigest(), 'signatureAlgorithms': matched, 'signedDataSignature': 'PASS', 'contentDigest': 'PASS', 'publicKeyMatch': 'PASS'})
    assert results
    return {'apkName': pathlib.Path(path).name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'v2Verification': 'PASS', 'signers': results, 'apksignerVerification': 'NOT_RUN'}


if __name__ == '__main__':
    result = verify(sys.argv[1])
    print(json.dumps(result, indent=2))
