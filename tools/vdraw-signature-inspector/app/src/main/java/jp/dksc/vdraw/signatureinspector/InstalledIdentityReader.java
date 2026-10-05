package jp.dksc.vdraw.signatureinspector;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;

final class InstalledIdentityReader {
    static final class Result {
        final String versionName;
        final long versionCode;
        final String[] currentCertificateSha256;
        Result(String name, long code, String[] certificates) {
            versionName = name; versionCode = code; currentCertificateSha256 = certificates;
        }
        boolean matchesBaseline() { return Identity.matchesBaseline(versionName, versionCode, currentCertificateSha256); }
        String display() {
            StringBuilder text = new StringBuilder(matchesBaseline() ? "基準007と一致\n\n" : "基準007と異なります\n\n");
            text.append("package\n").append(Identity.TARGET)
                .append("\n\nversionName\n").append(versionName == null ? "未取得" : versionName)
                .append("\n\nversionCode\n").append(versionCode)
                .append("\n\nsigning certificate SHA256\n");
            for (int i = 0; i < currentCertificateSha256.length; i++) {
                if (currentCertificateSha256.length > 1) text.append("署名者 ").append(i + 1).append("\n");
                text.append(Identity.readableHash(currentCertificateSha256[i])).append("\n");
            }
            return text.toString();
        }
    }
    static Result read(PackageManager pm) throws PackageManager.NameNotFoundException {
        PackageInfo info;
        if (Build.VERSION.SDK_INT >= 33) {
            info = pm.getPackageInfo(Identity.TARGET, PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES));
        } else {
            info = pm.getPackageInfo(Identity.TARGET, PackageManager.GET_SIGNING_CERTIFICATES);
        }
        if (!Identity.TARGET.equals(info.packageName)) throw new IllegalStateException("Unexpected package");
        if (info.signingInfo == null) throw new IllegalStateException("SigningInfo unavailable");
        // Current APK signers only. A historical signer match must never count as a current match.
        Signature[] signers = info.signingInfo.getApkContentsSigners();
        if (signers == null || signers.length == 0) throw new IllegalStateException("Current signer unavailable");
        String[] hashes = new String[signers.length];
        for (int i = 0; i < signers.length; i++) {
            if (signers[i] == null) throw new IllegalStateException("Missing signer");
            hashes[i] = Identity.sha256(signers[i].toByteArray());
        }
        return new Result(info.versionName, info.getLongVersionCode(), hashes);
    }
}
