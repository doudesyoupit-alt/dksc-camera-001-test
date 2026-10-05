# VDRAW MOBILE 007 成果回収・統合判定 20261006

判定：BLOCKED。7担当の成果は初回監査であり、4件のP1に対する実装修正は提出されていない。監査資料のみ統合。全回帰・新APK・validation反映へ進まない。

## 基準と統合

- repository：doudesyoupit-alt/dksc-camera-001-test
- 正式007開始点：1ec046fc1582803cf49716dcfa3330b06c21714f。validationとVDRAW-MOBILE-007 checkpointが一致することをGitHub APIで確認。
- 統合branch：work/vdraw007-integration-20261006。上記基準から新規作成し、性能担当の資料commit 43a8635c1bb9e52847b00e6a98a732395dec5269 をfast-forwardで採用。
- 採用commit：43a8635c1bb9e52847b00e6a98a732395dec5269（docs 2件のみ）。本回収記録も独立したdocs commitとして保存する。
- 不採用commit：なし。6担当には開始基準以降のcommitが存在せず、修正成果として採用できるcommitもない。
- 既存integration-20261005と各担当branchは変更しない。本報告を含むcommitのGitHub permalinkが収集HEADの記録になる。

## 7担当の実体

| 担当 | branch | HEAD | commit / 変更ファイル / 追加テスト | 報告回収 |
|---|---|---|---|---|
| UI / UX | work/vdraw007-ui-ux-20261005 | 1ec046fc1582803cf49716dcfa3330b06c21714f | 0 / 0 / 0 | 会話要約のみ・今回原本未回収 |
| Engine | work/vdraw007-engine-20261005 | 1ec046fc1582803cf49716dcfa3330b06c21714f | 0 / 0 / 0 | 原本回収 |
| Input / Trace | work/vdraw007-input-trace-20261005 | 1ec046fc1582803cf49716dcfa3330b06c21714f | 0 / 0 / 0 | 原本回収 |
| Output / Share | work/vdraw007-output-share-20261005 | 1ec046fc1582803cf49716dcfa3330b06c21714f | 0 / 0 / 0 | 原本回収 |
| Android | work/vdraw007-android-20261005 | 1ec046fc1582803cf49716dcfa3330b06c21714f | 0 / 0 / 0 | 原本回収 |
| 独立QA / Debug | work/vdraw007-qa-debug-20261005 | 1ec046fc1582803cf49716dcfa3330b06c21714f | 0 / 0 / 0 | 会話要約のみ・今回原本未回収 |
| Performance / Regression | work/vdraw007-performance-20261005 | 43a8635c1bb9e52847b00e6a98a732395dec5269 | 1 / 2 / 0 | 原本回収 |

同一HEADの6branchは開始基準とのdiffが空で、commit一覧・変更ファイル・追加テストも空。性能branchはcompareで1 commit、docs/PERFORMANCE-REGRESSION-20261005.mdおよびdocs/PERFORMANCE-REGRESSION-EVIDENCE-20261005.jsonの追加のみを確認。コード・テスト・workflow変更は0。制作担当の完了文言を修正完了や実機PASSとして扱わない。

Engine/Input/Output/Androidの今回原本はcollection-20261006配下へコピーし、出典IDをledger.jsonに記録。Performanceは元commitで保持。UI/QAの新Work全文はGit・ファイル検索で回収できず、2026-10-05の会話検索で得た担当完了要約を二次資料として別記。従前の独立QA証跡と今回の独立再検証をこれとは区別する。

## 独立確認と未解決P1

総括が原本ZIPのcore.js / vision.js / app.jsのGit blob SHAを実計算し、リモート開始ツリーと一致を確認。独立QAも3件のSHAを別途再計算して一致を確認した。QAはリモートbranch HEADを独自照会したとは主張せず、総括の確認とローカル実挙動を区別している。

| ID | 責任担当 | 今回の独立実挙動 | 状態 |
|---|---|---|---|
| ENGINE-001 | Engine | 外部JSONで異常円弧角度を受理し、描画が隔離processの2秒上限で停止。正常円弧は49点・有限値でreturn | P1未修正 |
| INPUT-001 | Input、UI、Engine、Output | coordinateSpace喪失。2000×1000候補を1200×800へ採用すると相対位置0.3/0.4が0.5/0.5に変化 | P1未修正 |
| OUTPUT-001 | Output、UI | PPTX生成中の形式/写真設定変更でPPTX内容がpdf拡張子・PDF/写真ON履歴になる | P1未修正 |
| EXPORT_OWNER_RACE | Output、UI、Engine契約 | 案件A生成中にBへ切替え、A内容をB名で受渡し、B履歴へ保存 | P1未修正 |

再現方法は隔離Node/processおよび実関数＋模擬OS境界。Android実機、ブラウザUI、実AI、PowerPoint/CAD等の実アプリの確認を代替しない。JSON証跡で実行範囲と観測値を保持する。

今回新規独立QA：
- 基準blob照合：PASS 3 / FAIL 0。
- 不具合受入ケース：PASS 0 / FAIL 4 / skip 0。
- 正常円弧の対照：PASS 1 / FAIL 0。
- 製品挙動の計5ケースとしてはPASS 1 / FAIL 4 / skip 0。照合3件を機能テスト数へ加算しない。
- 全回帰・ブラウザUI・Android実機：NOT_RUN。P1残存による停止であり、テストへのskip追加ではない。
- 既存の限定51 PASS / FAIL 0 / skip 0は2026-10-05の記録。今回の実行結果でも全回帰結果でもない。重複する担当試験数を合算しない。

P0：実行範囲で検出0。未確認領域を含むゼロ保証はしない。
P1：確定4件。OUTPUT-001とEXPORT_OWNER_RACEは共通修正群。
P2：確定件数を増やす独立再現なし。移動/選択表示、focus復帰、文字拡大等は候補として保持。
AndroidのAND-SIGN-01は別途、更新署名のP1相当BLOCKER。製品の4不具合へ重複加算しない。

## 責任境界・CROSS_TEAM_ISSUE・BLOCKER

実提出diffは性能docs追加のみのため、コード越境やコード変更同士の競合はない。修正は未着手。将来app.jsを複数担当が編集する場合は以下を総括が調整する。

- Engine：arcPointsの定数回正規化と通常/負角/全周/720度の互換条件。CT-ENGINE-OUTPUT（PPTX/SVG/PDFとDXF表現）、CT-ENGINE-INPUT（外部JSON）、保存/Undo契約。
- Input：coordinateSpace・候補canvas・source/page binding・参照画像transform。INPUT-001-UI / ENGINE / EXPORT、INPUT-SOURCE-LIFECYCLE。未知frameを誤適用しない条件を先に合意。実provider接続はBLOCKED/未実証。
- Output：形式/設定/document owner/revisionを出力jobへ固定。A→B→Aと編集競合も独立QAで検証。UI_OUTPUT_OWNER / UI_SHARE_STATUS / ANDROID_SHARE_RECEIPT / ENGINE_HISTORY / QA_EVIDENCE。
- UI：共有app.jsの出力busy再描画とcandidate previewをOutput/Inputの後に調整。busy表示解除、共有受渡しと保存完了の文言は未確定候補。
- Android：AND-SIGN-01（更新鍵保全未確認）。AND-SHARE-01/02、AND-BACK-01、AND-LIFE-01、AND-CAM-01は実機未確認候補。既存APKの署名公開証明書のみでは同一鍵更新を保証できない。アンインストールやデータ消去で回避しない。
- QA：4 P1修正後、別担当の実挙動で再検証。今回原本未回収の範囲は完成証拠にしない。
- Performance：PERF-REG-001（Git未収録harness）、002（UI-only scope checkerと正当な007修正の境界）、003（真の006性能比較）、004（旧版checkerの適用性）。checker/manifestを書換えて不一致を隠さない。

将来修正の依存順はEngine角度修正→Input frame契約→Output job所有権→UI共通app.js調整→Android連携→独立QA→Performance/全回帰。EngineとInput契約の調査、署名鍵確認、harness収集は並行可能。今回は修正commitが無いため機能変更のmergeを行わない。

## テスト資産と006保護

開始Gitの007/testsは8 blob：UI試験入口3本＋006 UI fixture5件。原本ZIPには55 test配下ファイル：直接46件（実行入口45本＋requirements1件）とfixture9件。差分は実行入口42本、requirements1件、baseline005 fixture4件がGit未収録。package test:core/test:native/test:visionの参照先もGitに存在しない。資産は原本ZIPに保存され、今回削除/skip追加はないが、全回帰の再現経路は未確定。詳細はtest-inventory.json。

006保護の開始subtree SHA：47cabdf70e9aebf7c64a1e028e85c476df32a169。
統合差分は007 docs配下のみ。main、validation、006、checkpoint、各担当branch、既存統合branchは変更しない。統合後に006 subtreeと既存test blobの同一性、既存ref不変を別途照合する。006機能/性能の全回帰は未実施で、ソース保全と区別する。

## APK・実機受入

新APK：NOT_GENERATED。workflow起動なし。FAIL 4/P1 4、全回帰未完了、署名鍵未確認のため受入ゲート未達。

既存APKのみ：
- VDRAW-MOBILE-007-debug.apk / validation / 1ec046fc1582803cf49716dcfa3330b06c21714f
- workflow run 37283743856
- SHA256 89350a7e6d8471ba3bbe983dfaeefba477d6ad31519f1036105da5cf9af71d09
- applicationId jp.dksc.vdraw.prototype007 / versionCode 7 / versionName 0.7.0
- 端末からAPK/証明書を取得していないため、インストール済み実体との完全一致は未確認。

ユーザー申告済みPASS：既存007起動、ホーム、「新しい図面」ボトムシート。
次の実機確認1項目：既存007で「新しい図面」→「白紙」を選び、編集画面が表示されること。既存PASS項目を再受入し直す指示ではなく、未確認の次項目のみ。
