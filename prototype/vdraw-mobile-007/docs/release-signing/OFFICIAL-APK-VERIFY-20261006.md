# 基準007 APK 公式署名検証の追加証跡

前調査のapksigner NOT_RUNを、実機操作・新APK生成なしで解消した。**旧APKの公式署名検証はPASS、更新互換性はBLOCKEDのまま。**

- branch: work/vdraw007-signing-release-20261006
- 検証生成元HEAD: 3b68541bb44c02098e4a428d9127427a23ff48ae
- [workflow run 37342418509](https://github.com/doudesyoupit-alt/dksc-camera-001-test/actions/runs/37342418509)
- job: 111872531047、verify-existing-apk
- job全step: SUCCESS、skip 0
- CI artifact: 11358872446、VDRAW007-existing-APK-signature-37342418509
- artifact ZIP SHA256: 96dc560b4d1f99b45e3cb93d5842f6a9990f6d7abc5693fdad1ebd7a329d315c（実ダウンロードでも一致）

専用branchのpush/pathだけで起動する読み取りworkflowを追加し、contents:read/actions:readで固定基準run37283743856から旧artifact11333531784だけを取得した。基準run/HEAD/name/id/digest/期限をAPIで厳密照合、旧APK SHA・サイズ・SHAテキスト・元APK-reportのpackage/version/run/HEADを照合した。

SDK既存build-tools/35.0.0/apksignerで`verify --verbose --print-certs`を実行し、exit 0、v2 true、certificate SHA256 c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855を確認。aaptによる実APK manifest読取もjp.dksc.vdraw.prototype007、versionCode7、versionName0.7.0で一致した。コマンドが成功しただけで互換判定しないよう、公開JSONにprivateKeyRecovered=false、installedDeviceIdentity=NOT_VERIFIED、updateCompatibility=BLOCKEDを明記した。

公式検証の公開JSON2件を証跡化した。apksignerの公開証明書ログは上記CI artifactに保管されている。APK・秘密鍵・パスワード・token実値をGitへ追加していない。Gradle実行、署名、鍵生成、新APK生成、実機インストール、アンインストール、データ消去はすべて0。main/validation/006/既存workflowは変更していない。

残るBLOCKERは、基準certificateに対応する秘密鍵がNOT_RECOVEREDであること、および現在の実機APK identityがNOT_VERIFIEDであること。旧APK署名の正当性が確認されても次APKの同一署名はまだ証明できない。
