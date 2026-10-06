# VDRAW MOBILE 007 Release Blocker checkpoint

判定：**ソフトウェア回帰 PASS／新APK生成禁止継続**。署名更新互換性は未証明です。実機受入PASSとは判定しません。

| 記録 | 値 |
|---|---|
| repository | doudesyoupit-alt/dksc-camera-001-test |
| 新checkpoint branch | work/vdraw007-release-checkpoint-20261006 |
| 試験branch | work/vdraw007-regression-environment-20261006 |
| 試験HEAD | e1292b62499701c8fe2558f9c76d334dcfb5ef8e |
| workflow run / job | 37347164239 / 111888511462 |
| 限定回帰 | 18 PASS、180ケース、FAIL 0 / BLOCKED 0 / skip 0 |
| 全回帰 | 52 PASS、183ケース、FAIL 0 / BLOCKED 0 / skip 0 |
| 当初29 BLOCKED | 個別対応確認済み、29 PASS |
| P0 / P1 / P2 | 0 / 0 / 未確定 |
| 独立QA HEAD | 1f699d70013e7ce0b4bf5bcca22bdfe5f6cfdc45 |
| artifact / SHA256 | 11361790491 / ee3e7cd4f05fae0478e27da619dbd9f3b637faded6853445540a8021f758401d |

新checkpointの正確なHEADは、この報告を含むGit commitとbranch refに記録されます。試験済みruntime・harness・tests・manifest・workflowを変更せず、担当証跡と総括記録だけを追加しています。旧checkpoint b2f9351b6418f2b552d95b96132650a297ea0afeを保持しています。

006 subtree 47cabdf70e9aebf7c64a1e028e85c476df32a169は不変。開始時の20 branch refは不変。旧テスト資産64件のうち実テスト・fixture 63件は同一blob、manifestだけを条件維持した登録へ変更。現在81件、削除0。旧archive55資産・45実行入口は保持。実006の37 web blobを基準に5000要素を比較し、比率1.052188126366691で既存閾値内です。

ENGINE-001、INPUT-001、OUTPUT-001、EXPORT_OWNER_RACEは元の独立QA31ケースでPASS。追加発見した採用後候補再表示P1は同じ3ケースで修正前0 PASS / 3 FAIL、修正後3 PASS / 0 FAIL。旧失敗証跡は保持しています。

CI3のプロセス観測競合とprivate contextのPWA検査FAILは、新しい環境adapterで元条件を保持して解消。生存child・既存PIDのENOENT・権限・不正statの負制御は独立QAで拒否を確認。通常profileのChrome154でPWAエラー0。旧ログは合格証跡へ転用していません。

27件のfresh判定snapshot、実7形式、構造検査対象12ファイルのSHA、8 PPTX slide XML、native web40資産一致を独立QAが確認。artifact runtimeは115 blob一致、hidden4ファイルはupload対象外、2ファイルは正常なCapacitor同期生成物（JSON同値／依存path8箇所置換）です。Git runtime121 blobの保護と、artifactのbyte比較範囲を区別します。product段階のsnapshotと全suite完了後出力は別時点で、output-regressionが同名PPTX/DXFを再出力します。最終出力SHAはその再出力後の値です。実端末・実AI・PowerPoint/Jw_cadアプリは未実行であり、PASSへ拡大解釈しません。

旧007 APKは公式aapt/apksignerで検証PASS（run37342418509）。基準APK生成run37283743856、HEAD1ec046fc1582803cf49716dcfa3330b06c21714f、SHA256 89350a7e6d8471ba3bbe983dfaeefba477d6ad31519f1036105da5cf9af71d09。applicationId jp.dksc.vdraw.prototype007 / versionCode7 / versionName0.7.0 / certificate SHA256 c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855。

署名の残gateは **既存秘密鍵 NOT_RECOVERED** と **端末インストール済みAPK identity NOT_VERIFIED**。未読archive2件は正規取得経路で再試行してHTTP502、未読のままとして記録し、鍵不存在の根拠にはしていません。秘密鍵・秘密値の公開、鍵生成、APK生成、アンインストール、データ削除は行っていません。

ユーザーの次の1操作：**現在端末にインストールされている007から抽出したAPKを、1ファイル添付してください。** 設定画面や元installerの再添付だけでは、現在端末のcertificateを証明できません。この添付で既存秘密鍵を回収できるとは判定せず、鍵のgateは別途残します。

詳細は同時収録したREGRESSION-RECOVERY-20261006.json、docs/qa-releaseの独立証跡、release-signingの公式検証・調査証跡を参照してください。main / validationへの反映は行いません。
