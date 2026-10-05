package jp.dksc.vdraw.signatureinspector;

import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public final class MainActivity extends Activity {
    static final int CHECK_ID = 1001;
    static final int RESULT_ID = 1002;
    private TextView result;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(246, 248, 251));
        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(22), dp(22), dp(22), dp(30));
        scroll.addView(body);
        body.addView(label("VDRAW 署名確認", 26, true));
        body.addView(label("端末に入っている007の版と署名を確認します。\nVDRAWの図面・保存データは変更しません。", 16, false));
        Button check = new Button(this);
        check.setId(CHECK_ID);
        check.setText("007の署名を確認");
        check.setTextSize(18);
        check.setMinHeight(dp(56));
        LinearLayout.LayoutParams buttonLayout = new LinearLayout.LayoutParams(-1, -2);
        buttonLayout.setMargins(0, dp(18), 0, dp(12));
        body.addView(check, buttonLayout);
        result = label("上の確認ボタンを押してください。", 16, false);
        result.setId(RESULT_ID);
        result.setTextIsSelectable(true);
        result.setTypeface(Typeface.MONOSPACE);
        body.addView(result);
        body.addView(label("署名確認のみです。\n結果が一致しても、旧署名の秘密鍵が未回収なら、現在の007へ上書き更新できるとは判定しません。", 14, false));
        check.setOnClickListener(view -> inspect());
        setContentView(scroll);
    }
    private void inspect() {
        try {
            InstalledIdentityReader.Result info = InstalledIdentityReader.read(getPackageManager());
            result.setText(info.display());
            result.setTextColor(info.matchesBaseline() ? Color.rgb(15, 102, 76) : Color.rgb(132, 62, 5));
        } catch (PackageManager.NameNotFoundException e) {
            result.setText("007が見つかりません\n\n" + Identity.TARGET + "\n\nこの検査アプリと同じユーザー／プロファイルにある007を確認します。");
            result.setTextColor(Color.rgb(132, 62, 5));
        } catch (SecurityException | IllegalStateException | IllegalArgumentException e) {
            result.setText("確認できませんでした\n\n取得できない情報を一致として扱いません。結果画面をそのままお知らせください。");
            result.setTextColor(Color.rgb(132, 62, 5));
        }
    }
    private TextView label(String text, int size, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text); view.setTextSize(size);
        view.setTextColor(Color.rgb(25, 43, 63));
        view.setPadding(0, dp(8), 0, dp(8));
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
