package jp.dksc.vdraw.signatureinspector;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

final class Identity {
    static final String TARGET = "jp.dksc.vdraw.prototype007";
    static final String BASELINE_CERT = "c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855";
    static String sha256(byte[] certificate) {
        if (certificate == null || certificate.length == 0) throw new IllegalArgumentException("Empty certificate");
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(certificate);
            StringBuilder out = new StringBuilder(64);
            for (byte b : hash) out.append(Character.forDigit((b & 0xff) >>> 4, 16)).append(Character.forDigit(b & 15, 16));
            return out.toString();
        } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    static boolean matchesBaseline(String name, long code, String[] currentSigners) {
        return "0.7.0".equals(name) && code == 7 && currentSigners != null
            && currentSigners.length == 1 && BASELINE_CERT.equals(currentSigners[0]);
    }
    static String readableHash(String hash) {
        if (hash == null || !hash.matches("[0-9a-f]{64}")) throw new IllegalArgumentException("Invalid SHA256");
        return hash.substring(0, 32) + "\n" + hash.substring(32);
    }
}
