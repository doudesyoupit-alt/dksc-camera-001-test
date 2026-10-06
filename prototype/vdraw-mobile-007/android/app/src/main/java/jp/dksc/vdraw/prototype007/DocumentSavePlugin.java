package jp.dksc.vdraw.prototype007;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "DocumentSave")
public class DocumentSavePlugin extends Plugin {
    private final AtomicBoolean active = new AtomicBoolean(false);

    @PluginMethod
    public void save(PluginCall call) {
        if (!active.compareAndSet(false, true)) {
            call.reject("保存処理が進行中です", "DOCUMENT_SAVE_BUSY");
            return;
        }
        try {
            DocumentSaver.source(getContext(), call.getString("sourceUri"));
            Intent intent = DocumentSaver.createIntent(call.getString("fileName"), call.getString("mimeType"));
            startActivityForResult(call, intent, "documentCreated");
        } catch (Exception e) {
            active.set(false);
            call.reject("保存先選択を開始できません", "DOCUMENT_SAVE_UNAVAILABLE");
        }
    }

    protected void executeWrite(Runnable write) { getBridge().execute(write); }

    @ActivityCallback
    private void documentCreated(PluginCall call, ActivityResult result) {
        if (call == null) { active.set(false); return; }
        if (result.getResultCode() == Activity.RESULT_CANCELED) {
            active.set(false);
            call.reject("保存をキャンセルしました", "DOCUMENT_SAVE_CANCELLED");
            return;
        }
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            active.set(false);
            call.reject("保存先を確認できません", "DOCUMENT_SAVE_FAILED");
            return;
        }
        // Provider I/O runs on Capacitor's worker, away from the UI thread.
        executeWrite(() -> {
            try {
                File source = DocumentSaver.source(getContext(), call.getString("sourceUri"));
                long bytes = DocumentSaver.write(getContext(), source, data.getData());
                JSObject response = new JSObject();
                response.put("status", "saved");
                response.put("bytes", bytes);
                call.resolve(response);
            } catch (Exception e) {
                call.reject("ファイルを保存できませんでした", "DOCUMENT_SAVE_FAILED");
            } finally {
                active.set(false);
            }
        });
    }
}
