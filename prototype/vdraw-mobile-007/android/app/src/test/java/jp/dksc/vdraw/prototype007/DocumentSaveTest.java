package jp.dksc.vdraw.prototype007;

import static org.junit.Assert.*;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.io.*;
import java.lang.reflect.Method;
import java.nio.file.Files;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowContentResolver;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 28, manifest = Config.NONE)
public class DocumentSaveTest {
    Context context;
    File source;
    Uri destination = Uri.parse("content://save001/documents/selected");
    @Before public void setup() throws Exception {
        context = RuntimeEnvironment.getApplication();
        source = new File(context.getCacheDir(), "vdraw-007-saves/test/名称未設定の現調.pptx");
        source.getParentFile().mkdirs();
        Files.write(source.toPath(), new byte[]{80,75,3,4,0,127,(byte)255});
    }
    @Test public void chooserUsesCreateDocumentAndExactNameMime() {
        Intent intent = DocumentSaver.createIntent(source.getName(), "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        assertEquals(Intent.ACTION_CREATE_DOCUMENT, intent.getAction());
        assertTrue(intent.hasCategory(Intent.CATEGORY_OPENABLE));
        assertEquals(source.getName(), intent.getStringExtra(Intent.EXTRA_TITLE));
        assertEquals("application/vnd.openxmlformats-officedocument.presentationml.presentation", intent.getType());
        assertFalse(intent.hasExtra(Intent.EXTRA_STREAM));
    }
    @Test public void rejectsBadFilenameAndMime() {
        for (String name : new String[]{"", "..", "a/b", "a\\b", "a\nb", "a\nb\nc"}) {
            assertThrows(IllegalArgumentException.class, () -> DocumentSaver.createIntent(name, "application/pdf"));
        }
        assertThrows(IllegalArgumentException.class, () -> DocumentSaver.createIntent("a.pdf", "invalid"));
    }
    @Test public void sourceIsConfinedToPrivateSaveCache() throws Exception {
        assertEquals(source.getCanonicalFile(), DocumentSaver.source(context, Uri.fromFile(source).toString()));
        File other = new File(context.getCacheDir(), "unrelated.txt");
        Files.write(other.toPath(), new byte[]{1});
        assertThrows(IOException.class, () -> DocumentSaver.source(context, Uri.fromFile(other).toString()));
        String traversal = "file://" + source.getParent() + "/../../unrelated.txt";
        assertThrows(IOException.class, () -> DocumentSaver.source(context, traversal));
        assertThrows(IOException.class, () -> DocumentSaver.source(context, "content://other/private"));
    }
    @Test public void providerReceivesAllBytesAndClosesBeforeSuccess() throws Exception {
        byte[] payload = new byte[180003];
        for (int i=0;i<payload.length;i++) payload[i]=(byte)(i%251);
        Files.write(source.toPath(), payload);
        class Sink extends ByteArrayOutputStream { boolean closed; public void close() { closed=true; } }
        Sink sink = new Sink();
        ShadowContentResolver.registerOutputStream(destination, sink);
        assertEquals(payload.length, DocumentSaver.write(context, source, destination));
        assertArrayEquals(payload, sink.toByteArray());
        assertTrue(sink.closed);
    }
    @Test public void providerWriteOrCloseFailureCannotReturnSuccess() {
        ShadowContentResolver.registerOutputStream(destination, new OutputStream() {
            public void write(int b) throws IOException { throw new IOException("provider write failed"); }
        });
        assertThrows(IOException.class, () -> DocumentSaver.write(context, source, destination));
        ShadowContentResolver.registerOutputStream(destination, new ByteArrayOutputStream() {
            public void close() throws IOException { throw new IOException("provider close failed"); }
        });
        assertThrows(IOException.class, () -> DocumentSaver.write(context, source, destination));
        assertThrows(IOException.class, () -> DocumentSaver.write(context, source, Uri.fromFile(source)));
    }
    static class Call extends PluginCall {
        String code; boolean resolved; JSObject response;
        Call(JSObject data) { super(null, "DocumentSave", "test", "save", data); }
        @Override public void reject(String message, String code) { this.code=code; }
        @Override public void resolve(JSObject result) { resolved=true; response=result; }
    }
    class Plugin extends DocumentSavePlugin {
        Intent launched; String callback;
        @Override protected void executeWrite(Runnable write) { write.run(); }
        @Override public Context getContext() { return context; }
        @Override public void startActivityForResult(PluginCall call, Intent intent, String callback) {
            this.launched=intent; this.callback=callback;
        }
    }
    Call call() {
        JSObject data = new JSObject();
        data.put("sourceUri", Uri.fromFile(source).toString());
        data.put("fileName", source.getName());
        data.put("mimeType", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        return new Call(data);
    }
    void finish(Plugin plugin, Call call, ActivityResult result) throws Exception {
        Method callback=DocumentSavePlugin.class.getDeclaredMethod("documentCreated", PluginCall.class, ActivityResult.class);
        callback.setAccessible(true); callback.invoke(plugin, call, result);
    }
    @Test public void cancelRejectsAndReleasesBusyWithoutWriting() throws Exception {
        Plugin plugin=new Plugin(); Call first=call(); plugin.save(first);
        assertEquals(Intent.ACTION_CREATE_DOCUMENT, plugin.launched.getAction());
        assertEquals("documentCreated", plugin.callback);
        Call duplicate=call(); plugin.save(duplicate); assertEquals("DOCUMENT_SAVE_BUSY", duplicate.code);
        finish(plugin, first, new ActivityResult(Activity.RESULT_CANCELED, null));
        assertEquals("DOCUMENT_SAVE_CANCELLED", first.code); assertFalse(first.resolved);
        Call next=call(); plugin.save(next); assertNull(next.code);
    }
    @Test public void successfulCallbackResolvesAfterProviderClose() throws Exception {
        Plugin plugin=new Plugin(); Call first=call(); plugin.save(first);
        class Sink extends ByteArrayOutputStream { boolean closed; public void close() { closed=true; } }
        Sink sink=new Sink(); ShadowContentResolver.registerOutputStream(destination, sink);
        finish(plugin, first, new ActivityResult(Activity.RESULT_OK, new Intent().setData(destination)));
        assertTrue(sink.closed); assertTrue(first.resolved); assertNull(first.code);
        assertEquals("saved", first.response.getString("status"));
        assertEquals(source.length(), first.response.getLong("bytes").longValue());
        assertArrayEquals(Files.readAllBytes(source.toPath()), sink.toByteArray());
        Call next=call(); plugin.save(next); assertNull(next.code);
    }
    @Test public void failedCallbackRejectsWithoutSuccessAndReleasesBusy() throws Exception {
        Plugin plugin=new Plugin(); Call first=call(); plugin.save(first);
        ShadowContentResolver.registerOutputStream(destination, new ByteArrayOutputStream() {
            public void close() throws IOException { throw new IOException("provider failed to close"); }
        });
        finish(plugin, first, new ActivityResult(Activity.RESULT_OK, new Intent().setData(destination)));
        assertEquals("DOCUMENT_SAVE_FAILED", first.code); assertFalse(first.resolved);
        Call next=call(); plugin.save(next); assertNull(next.code);
    }
    @Test public void missingResultUriRejectsAndReleasesBusy() throws Exception {
        Plugin plugin=new Plugin(); Call first=call(); plugin.save(first);
        finish(plugin, first, new ActivityResult(Activity.RESULT_OK, new Intent()));
        assertEquals("DOCUMENT_SAVE_FAILED", first.code); assertFalse(first.resolved);
        Call next=call(); plugin.save(next); assertNull(next.code);
    }
}
