package jp.dksc.vdraw.prototype007;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;

// SAF writes only a staged export in this application's private cache.
final class DocumentSaver {
    static File source(Context context, String sourceUri) throws IOException {
        if (sourceUri == null) throw new IOException("Invalid source");
        Uri uri = Uri.parse(sourceUri);
        if (!"file".equals(uri.getScheme()) || uri.getPath() == null) throw new IOException("Invalid source");
        File root = new File(context.getCacheDir(), "vdraw-007-saves").getCanonicalFile();
        File file = new File(uri.getPath()).getCanonicalFile();
        if (!file.getPath().startsWith(root.getPath() + File.separator) || !file.isFile()) {
            throw new IOException("Invalid source");
        }
        return file;
    }

    static Intent createIntent(String name, String mime) {
        if (name == null || name.isEmpty() || name.equals(".") || name.equals("..") || name.chars().anyMatch(c -> c == '/' || c == '\\' || c < 32)) {
            throw new IllegalArgumentException("Invalid filename");
        }
        if (mime == null || !mime.matches("[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+")) {
            throw new IllegalArgumentException("Invalid MIME");
        }
        return new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(mime)
            .putExtra(Intent.EXTRA_TITLE, name);
    }

    static long write(Context context, File source, Uri destination) throws IOException {
        if (destination == null || !"content".equals(destination.getScheme())) throw new IOException("Invalid destination");
        long bytes = 0;
        try (FileInputStream input = new FileInputStream(source);
             OutputStream output = context.getContentResolver().openOutputStream(destination, "wt")) {
            if (output == null) throw new IOException("No output stream");
            byte[] buffer = new byte[65536];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
                bytes += count;
            }
            output.flush();
        }
        // A close/flush failure throws before completion is returned.
        return bytes;
    }
}
