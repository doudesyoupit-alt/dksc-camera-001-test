# VDRAW MOBILE 007 Android署名調査 ラウンド1

- repository: doudesyoupit-alt/dksc-camera-001-test
- branch: work/vdraw007-signing-audit-round1-20261006
- 開始HEAD: 9c1dcdf8d87e32a9f0d86996c210a8a4b7ebb2fc
- 日付: 2026-10-06 JST
- 変更範囲: この調査資料と公開情報だけの証跡JSON。アプリ・workflow・006を変更していない。
- 判定: **署名更新互換性 BLOCKED。新APK生成不可。**

## 独立に確認した事項

既存配布APKを読み取り専用で再確認した。APK生成・Gradle実行・再インストール・アンインストール・データ消去・鍵生成は行っていない。

| 項目 | 結果 | 今回の直接証拠 |
|---|---|---|
| APK | VDRAW-MOBILE-007-debug.apk | 既存の配布ファイル |
| サイズ | 13,141,918 bytes | ファイル直接計測 |
| SHA256 | 89350a7e6d8471ba3bbe983dfaeefba477d6ad31519f1036105da5cf9af71d09 | ファイル全体をハッシュ |
| applicationId | jp.dksc.vdraw.prototype007 | バイナリAndroidManifest.xmlのmanifest属性 |
| versionCode / versionName | 7 / 0.7.0 | 同上 |
| v2公開証明書SHA256 | c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855 | APK Signing Blockのv2署名者証明書を抽出してハッシュ |
| 証明書subject | C=US,O=Android,CN=Android Debug | DER公開証明書読み取り |
| 証明書開始 / 期限 | 2026-10-05T08:29:16Z / 2056-09-27T08:29:16Z | 同上 |
| apksigner完全検証 | NOT_RUN | この環境でapksigner未検出。証明書抽出は署名完全検証を代替しない |
| 端末に入っているAPK | NOT_VERIFIED | 端末からAPK・package情報・証明書を取得できていない |

公開証明書と既存APKの識別情報だけを証跡JSONへ保存した。秘密鍵・秘密情報は取得、表示、保存、Git収録していない。

[既存run 37283743856](https://github.com/doudesyoupit-alt/dksc-camera-001-test/actions/runs/37283743856)のmetadata、成果物一覧、debug-apk job 111677615053の既存ログを各1回読み取った。生成branchはvalidation、生成HEADは1ec046fc1582803cf49716dcfa3330b06c21714f。ログのAPKサイズ/SHA/appID/versionCode/versionName/run/生成HEADは今回の配布APK読み取りおよび既存記録と一致した。runのsuccessは端末署名互換性の証明ではない。ui-smoke jobは既存runではskippedであり、このrunを全回帰PASSとして扱わない。

## signing key所在の限定調査

[原workflow](https://github.com/doudesyoupit-alt/dksc-camera-001-test/blob/9c1dcdf8d87e32a9f0d86996c210a8a4b7ebb2fc/.github/workflows/vdraw-mobile-007.yml)、app/build.gradle、scripts/build-debug.pyをGitの原文で確認した。

- app/build.gradleには固定signingConfigsがない。appIDはjp.dksc.vdraw.prototype007、版は7/0.7.0。
- build-debug.pyはassembleDebugを実行する実装である。今回実行していない。
- workflowはubuntu-24.04 runnerでビルドする。固定署名鍵の復元や署名鍵自体の保全stepを確認できない。
- setup-javaのGradle cache利用はある。鍵がそのcacheに含まれている証拠はない。cache存在だけで鍵回収可能と判定しない。
- 開始HEADの再帰treeはtruncated=false。keystore/jks/p12/pfx/pem/key拡張子のGitファイル候補0。
- 既存VDRAW-MOBILE-007.zipの同拡張子ファイル候補0。
- このworkspace利用者の既定.android/debug.keystoreは存在しない。これは過去のActions runnerの存在確認ではない。
- 指定run成果物は次の2件。名前・upload対象から鍵専用artifactは確認できない。APK/logをfixtureとしてGit追加していない。
  - 11333531784: VDRAW-MOBILE-007-debug-37283743856（APK、SHAテキスト、APK-report）
  - 11333696470: VDRAW-MOBILE-007-build-logs-37283743856（ci、build log、environment）

証明書開始時刻が既存CIビルド時刻内であり、固定鍵復元stepもないため、このrunで通常のdebug鍵が生成された可能性が高い。ただしこれは推定である。Actions runner内の実鍵所在、現在の回収可否、別の安全な保管先の有無は未確認。公開証明書から対応する秘密鍵を復元できるとは判断しない。

secret API・secret値、無関係なprivate領域へアクセスしていない。artifactのバイナリ再取得や大量再探索は行っていない。

## 実機で観測できない事項

この実行環境にadb/aapt/apksignerがなく、/dev/bus/usbもない。ユーザー端末に接続する経路が提示されていないため、次の4項目はすべてNOT_VERIFIED。

1. 現在インストール済み007のapplicationId。
2. インストール済みversionCode / versionName。
3. インストール済みAPKの署名証明書。
4. インストール済みAPKと既存配布APKの完全一致。

ユーザー提供の「007をインストール、起動、ホーム、図面作成シート表示」を証明書取得の代替にしない。

## 更新可能にするための後続ゲート

総括が管理する読み取り工程として、接続可能な環境で以下を確認する。実機操作は今回未実施。ユーザーに別担当管理を依頼しない。

1. adbの接続先を確認し、pm/dumpsysの読み取りで007のpackage/版/base.apk経路を取得する。
2. base.apkを読み取りで回収し、apksigner verify --print-certsで実機APKの証明書・完全検証結果を記録する。端末からの回収だけでは署名鍵は得られない。
3. 既存署名鍵の安全な保管先を確認する。鍵自体をGitへ置かず、対応する公開証明書が実機APKの証明書と一致することを確認する。所在不明なら停止を維持する。
4. P0/P1、限定・全回帰、006保護が合格し、署名更新互換性を先に確認できた場合だけ、同じ鍵による次APK生成へ進む。
5. 生成した候補APKのappID、増加したversionCode、証明書、署名完全検証、生成HEAD/run/SHAを再照合する。更新前に案件保存・バックアップ・再読込を確認する。

別の鍵の生成、アンインストール、データ消去、別packageへの移行を既存更新の代替として独断で実行しない。現在versionCode 7を維持した設定のまま「次の受入版」と混同しない。

## 未解決・引継ぎ

- INSTALLED_SIGNATURE_NOT_VERIFIED
- EXISTING_SIGNING_PRIVATE_KEY_NOT_RECOVERED
- NEXT_APK_UPDATE_COMPATIBILITY_NOT_VERIFIED
- APK_FULL_SIGNATURE_VERIFICATION_NOT_RUN

これは署名更新ゲートのBLOCKERであり、現在の4件のアプリP1に未確認の実機障害を追加した判定ではない。今回のAndroid調査は完了し、APK禁止条件を維持する。

## 公式確認

[Android公式署名資料](https://developer.android.com/studio/publish/app-signing)を読み取り、公開証明書と秘密鍵の区別、debug keystore、非Play経路で署名鍵を失った場合の更新制約を確認した。[apksigner公式資料](https://developer.android.com/tools/apksigner)も確認した。鍵rotation等の更新経路を本アプリで構成した証跡はないため、今回は既存の同一署名鍵を前提に判定する。
