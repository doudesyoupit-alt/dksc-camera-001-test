package jp.dksc.vdraw.prototype007;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.security.MessageDigest;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Runs only on a disposable CI emulator. The user's legacy007 is never connected. */
public final class PermanentUpdateInstrumentation extends Instrumentation {
    private Bundle args;
    @Override public void onCreate(Bundle bundle) { super.onCreate(bundle); args = bundle; start(); }
    @Override public void onStart() {
        Bundle result = new Bundle();
        try {
            String stage = args.getString("stage");
            long expectedVersion = Long.parseLong(args.getString("versionCode"));
            String expectedCertificate = args.getString("certificateSha256");
            PackageInfo info = getTargetContext().getPackageManager().getPackageInfo(getTargetContext().getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
            check(getTargetContext().getPackageName().equals("jp.dksc.vdraw.prototype007"), "APP_ID");
            check(info.getLongVersionCode() == expectedVersion, "INSTALLED_VERSION");
            check(info.signingInfo != null && info.signingInfo.getApkContentsSigners().length == 1, "ONE_CURRENT_SIGNER");
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(info.signingInfo.getApkContentsSigners()[0].toByteArray());
            StringBuilder hash = new StringBuilder();
            for (byte b : digest) hash.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
            check(expectedCertificate.equals(hash.toString()), "INSTALLED_CERTIFICATE_PIN");
            SharedPreferences prefs = getTargetContext().getSharedPreferences("permanent-update-e2e", 0);
            Activity activity = startActivitySync(new Intent(getTargetContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            waitForIdleSync();
            AtomicReference<WebView> web = new AtomicReference<>();
            runOnMainSync(() -> web.set(findWeb(activity.getWindow().getDecorView())));
            check(web.get() != null, "REAL_VDRAW_WEBVIEW");
            String op;
            if ("A".equals(stage)) {
                op = "const d=c.project('固定署名更新CI案件');d.id='ci-permanent-signing-project';" +
                     "d.pages[0].elements.push(c.element('rect','配電盤',{x:10,y:20,w:150,h:90}),c.element('text','確認文字',{text:'署名更新後も保持'}));" +
                     "await s.save(d);const loaded=await s.load(d.id);return {status:'PASS',project:JSON.stringify(loaded),origin:location.origin};";
            } else {
                check("B".equals(stage), "STAGE");
                check(prefs.contains("project") && prefs.contains("origin"), "ANDROID_PRIVATE_DATA_SURVIVED");
                op = "const loaded=await s.load('ci-permanent-signing-project');return {status:'PASS',project:JSON.stringify(loaded),origin:location.origin};";
            }
            // Use the product's actual project constructor and LocalStore in its installed HTTPS origin.
            long deadline = SystemClock.elapsedRealtime() + 90000;
            JSONObject document = null;
            String js = "window.__permanentUpdateResult=null;(async()=>{const c=await import(new URL('/src/core.js',location.href).href);" +
                "const {LocalStore}=await import(new URL('/src/storage.js',location.href).href);const s=new LocalStore();" +
                "window.__permanentUpdateResult=await(async()=>{" + op + "})();})().catch(()=>{window.__permanentUpdateResult={status:'FAIL'};});";
            // Wait for the app origin to be ready before importing modules.
            while (SystemClock.elapsedRealtime() < deadline) {
                String ready = evaluate(web.get(), "String(location.origin==='https://localhost'&&document.readyState==='complete')");
                if ("\"true\"".equals(ready)) break;
                SystemClock.sleep(250);
            }
            check(SystemClock.elapsedRealtime() < deadline, "VDRAW_ORIGIN_READY_TIMEOUT");
            evaluate(web.get(), js);
            while (SystemClock.elapsedRealtime() < deadline) {
                String value = evaluate(web.get(), "JSON.stringify(window.__permanentUpdateResult||null)");
                Object decoded = new JSONTokener(value).nextValue();
                if (decoded instanceof String && !"null".equals(decoded)) { document = new JSONObject((String) decoded); break; }
                SystemClock.sleep(250);
            }
            check(document != null && "PASS".equals(document.optString("status")), "PRODUCT_LOCALSTORE_SAVE_LOAD");
            String project = document.getString("project"), origin = document.getString("origin");
            if ("A".equals(stage)) {
                check(prefs.edit().putString("project", project).putString("origin", origin).commit(), "ANDROID_PRIVATE_MARKER_SAVED");
            } else {
                check(project.equals(prefs.getString("project", null)), "ACTUAL_PROJECT_BYTES_SURVIVED_UPDATE");
                check(origin.equals(prefs.getString("origin", null)), "SAME_WEBVIEW_STORAGE_ORIGIN");
            }
            result.putString("status", "PASS"); result.putString("stage", stage);
            result.putString("versionCode", String.valueOf(expectedVersion));
            result.putString("certificateSha256", hash.toString());
            result.putString("productProjectPreservation", "PASS");
            finish(Activity.RESULT_OK, result);
        } catch (Throwable error) {
            result.putString("status", "FAIL"); result.putString("errorType", error.getClass().getSimpleName());
            finish(Activity.RESULT_CANCELED, result);
        }
    }
    private String evaluate(WebView view, String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        runOnMainSync(() -> view.evaluateJavascript(script, v -> { value.set(v); latch.countDown(); }));
        check(latch.await(5, TimeUnit.SECONDS), "WEBVIEW_EVALUATION_TIMEOUT");
        return value.get();
    }
    private WebView findWeb(View v) {
        if (v instanceof WebView) return (WebView) v;
        if (v instanceof ViewGroup) { ViewGroup g = (ViewGroup) v; for (int i=0;i<g.getChildCount();i++) { WebView w=findWeb(g.getChildAt(i)); if(w!=null)return w; } }
        return null;
    }
    private static void check(boolean value, String code) { if(!value) throw new AssertionError(code); }
}
