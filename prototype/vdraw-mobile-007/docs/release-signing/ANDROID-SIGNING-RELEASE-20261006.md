# VDRAW MOBILE 007 Release signing audit

Repository: doudesyoupit-alt/dksc-camera-001-test  
専用branch: work/vdraw007-signing-release-20261006  
開始HEAD: 70f9b5be972573906328e5d72b0318473ff5fa1c  
判定: **BLOCKED。UPDATE_COMPATIBLEは証明できていない。新APK生成不可。**

## 今回の直接確認

既存run一覧を全件取得した。total_count=9、返却9件でページ欠落なし。Pages 2件、VDRAWのrun 7件を調査し、全10 artifact metadataとjob/stepを回収した。007の実APK生成は基準run 37283743856の1件だけだった。006は2件でAPK生成しているが、006の署名を007の更新鍵として扱わない。

調査開始時点の20 branch、13 unique HEADから到達可能な30 unique commitを棚卸しした。各commitの全再帰treeはtruncated=falseであり、keystore/jks/p12/pfx/pem/keyのファイル名候補は0。過去workflow 5 versionを原文で確認した。固定signingConfigs・鍵復元step・鍵保全uploadは確認できない。これは調査範囲外の鍵保管先が存在しないことの証明ではない。

基準run 37283743856のログartifact 11333696470を実際に取得した。ZIP SHA256はActions metadata digestと一致し、全7 memberの名前・サイズ・SHAを確認した。ci/APK-report.json、ci/npm.log、ci/build.log、ci/sdk.log、ci/sync.log、android-build.log、android-environment.jsonだけで、keystore memberはない。APK artifact側のupload対象もAPK・SHA・APK-reportだけである。

基準debug-apk job 111677615053はGitHub hosted ubuntu-24.04 runnerで実行された。ログからsetup-java実使用pinはde7274f081f381c8f8158605e0321c36c376e2e6。このpinの[公式src/cache.ts](https://github.com/actions/setup-java/blob/de7274f081f381c8f8158605e0321c36c376e2e6/src/cache.ts)を確認し、標準Gradle cache対象が~/.gradle/cachesと~/.gradle/wrapperであることを確認した。workflowはcache-paths overrideを指定していない。~/.android/debug.keystoreは対象外。ログ上391MBのcache復元は秘密鍵復元の証拠にならない。

releasesは0件。Actions caches collectionとrepository-wide artifacts collectionは現在connectorの許可endpoint外で400となった。artifactはrun単位の対応toolで全件回収した。cache本体は取得できていないので、cache内容の実読取まで完了したとは主張しない。

## 既存APKの検証

| 項目 | 基準007 |
|---|---|
| run / HEAD | 37283743856 / 1ec046fc1582803cf49716dcfa3330b06c21714f |
| APK SHA256 | 89350a7e6d8471ba3bbe983dfaeefba477d6ad31519f1036105da5cf9af71d09 |
| appId | jp.dksc.vdraw.prototype007 |
| code / name | 7 / 0.7.0 |
| certificate SHA256 | c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855 |
| APK v2公開keyとcertificate一致 | PASS |
| signedData RSA-PKCS1-SHA256署名検証 | PASS |
| APK保護領域の1MiB chunk content digest | PASS |
| 公式apksigner完全検証 | NOT_RUN |

今回の読み取り専用Python検証は、署名ブロック境界、EOCD/central directory整合、公開key一致、signedData署名、APK内容digestを確認した。追加空fieldは[AOSP V2SchemeSigner原実装](https://android.googlesource.com/platform/tools/apksig/+/master/src/main/java/com/android/apksig/internal/apk/v2/V2SchemeSigner.java)に合わせて厳密に空として検査した。独自v2検証をapksigner実行の代替と判定しない。鍵生成・Gradle実行・新APK生成は0。

006の既存artifact 11299865262も読み取った。旧APK SHA256はc93a2ab12641b89ed84ec90d1d1b2c7349c3de4b0d9865b5cd6dcaaa0866f0e3、cert SHA256は564c1834c46e2df209cadb6e4c8920633cd019e44ac4ee4e0170ddde18e45398。007とは署名が異なる。006 cert開始時刻2026-10-04T09:30:57Z、007開始時刻2026-10-05T08:29:16ZはそれぞれのAPK job内である。jobごとに通常debug鍵が生成されたことを強く示すが、鍵が別途保管されていないことまでは証明しない。

## 保存候補の調査と未取得範囲

総括によるファイルmetadata検索keystore/.jks/signingはいずれも0件。既存007 ZIPは前roundでkey entry 0を実読取済み。追加候補VDRAW-MOBILE-007-UI-CHECKPOINT.zipとVDRAW-MOBILE-006.zipの現在helperによる取得を試したが、2件選択2回および006単独1回のすべてHTTP502となった。この2 ZIPは今回は未読であり「keyが無い」と判定しない。旧検証結果や既存ファイルを上書きしていない。

## 残る更新ゲート

- EXISTING_SIGNING_PRIVATE_KEY_NOT_RECOVERED: 基準007のcertificateに対応する秘密鍵を回収できていない。APKと公開certificateからその秘密鍵を復元できるとは扱わない。
- INSTALLED_SIGNATURE_NOT_VERIFIED: このworkspaceから実機に接続する経路がなく、実際のinstalled007 package/version/certificateを取得できていない。
- NEXT_APK_UPDATE_COMPATIBILITY_NOT_VERIFIED: 同一appId、適切なversion、実機が認める署名の3条件が揃っていない。別鍵、別package、アンインストール、データ削除は更新互換性の代替にしない。
- APK_FULL_SIGNATURE_VERIFICATION_NOT_RUN: 公式apksignerの検証は未実行。

実機でなければ得られない情報は現在installed007のAPK identity。実機APKを読み取りで1ファイル回収できれば、package/version/certificate/SHAを同時に確定できる。標準のアプリ情報画面だけではcertificateを取得できない。実機APK回収で秘密鍵不足は解消しないので、その後も鍵所在の安全な証明が必要になる。ユーザーへの操作依頼・担当管理は総括がまとめて行う。

秘密鍵、パスワード、tokenを取得・表示・Git収録していない。変更は007配下の公開metadata証跡と本報告だけ。アプリ、workflow、main、validation、006、旧APK、旧checkpointを変更していない。
