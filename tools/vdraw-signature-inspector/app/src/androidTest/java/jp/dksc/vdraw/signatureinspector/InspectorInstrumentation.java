package jp.dksc.vdraw.signatureinspector;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;

public final class InspectorInstrumentation extends Instrumentation {
    private String mode;
    @Override public void onCreate(Bundle args) { super.onCreate(args); mode = args.getString("expect", "baseline"); start(); }
    @Override public void onStart() {
        Bundle output = new Bundle();
        try {
            require(getTargetContext().getPackageName().equals("jp.dksc.vdraw.signatureinspector"), "Independent inspector package");
            if ("baseline".equals(mode)) {
                InstalledIdentityReader.Result info = InstalledIdentityReader.read(getTargetContext().getPackageManager());
                require("0.7.0".equals(info.versionName) && info.versionCode == 7, "Installed fixture version");
                require(info.currentCertificateSha256.length == 1 && Identity.BASELINE_CERT.equals(info.currentCertificateSha256[0]), "Installed actual baseline certificate");
                require(info.matchesBaseline(), "Baseline identity decision");
                output.putString("osPackageManager", "PASS versionName/versionCode/current signing certificate");
            } else if ("missing".equals(mode)) {
                boolean absent = false;
                try { InstalledIdentityReader.read(getTargetContext().getPackageManager()); }
                catch (PackageManager.NameNotFoundException expected) { absent = true; }
                require(absent, "Missing package must not pass");
            } else { throw new AssertionError("Unknown test mode"); }
            Intent intent = new Intent(getTargetContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            Activity activity = startActivitySync(intent);
            waitForIdleSync();
            runOnMainSync(() -> {
                Button button = activity.findViewById(MainActivity.CHECK_ID);
                require(button != null && button.isShown() && button.isEnabled(), "Usable check button");
                button.performClick();
                TextView result = activity.findViewById(MainActivity.RESULT_ID);
                String text = result.getText().toString();
                if ("baseline".equals(mode)) {
                    require(text.startsWith("基準007と一致"), "Real button result");
                    require(text.replace("\n", "").contains(Identity.BASELINE_CERT), "Full certificate visible");
                } else { require(text.startsWith("007が見つかりません"), "Missing package UI"); }
            });
            output.putString("status", "PASS"); output.putString("mode", mode); output.putString("uiButton", "PASS");
            finish(Activity.RESULT_OK, output);
        } catch (Throwable error) {
            output.putString("status", "FAIL"); output.putString("reason", error.toString());
            finish(Activity.RESULT_CANCELED, output);
        }
    }
    private static void require(boolean condition, String label) { if (!condition) throw new AssertionError(label); }
}
