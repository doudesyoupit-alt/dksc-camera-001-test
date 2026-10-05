# VDRAW MOBILE 007 総括・Integration管理記録
記録日：2026-10-05（日本時間）
状態：7専門担当の体制固定と初回監査を完了。アプリ修正・新APK・実機受入は未完了。

## 基準と原本
- repository：doudesyoupit-alt/dksc-camera-001-test
- 正常基準：VDRAW-MOBILE-006。原本・既存checkpointは変更しない。
- 開発対象：VDRAW-MOBILE-007
- 開始コードHEAD：1ec046fc1582803cf49716dcfa3330b06c21714f
- main：1181c0aeef3a152435cf005583d09a15f209bd0d
- validation：1ec046fc1582803cf49716dcfa3330b06c21714f
- VDRAW-MOBILE-007 checkpoint：1ec046fc1582803cf49716dcfa3330b06c21714f
- VDRAW-MOBILE-007-UI-CHECKPOINT：e9a56b9f65ee4679ec83cc97cf67365d89f05e82
- 統合branch：work/vdraw007-integration-20261005
- 新規8branchは既存007 HEADから作成し、再照会でHEAD一致を確認。
- 今回は既存ZIPを別作業領域に展開して監査。展開ソースに.gitはなく、ローカルgit履歴があるとは主張しない。
- 原本ZIP SHA256：3d91a85c663bde84ceee89fcfa2192fb443c83ace43f1f154e0e329f1b475e46（24,863,422 bytes）、CRC正常。
- 今回のアプリコード編集0、パッチ適用0、APKビルド0。統合branchへの変更は本管理記録と独立QA・回帰の証跡のみ。
- main・validation・旧checkpointへの更新0。

## チームと担当境界
全専門branchの開始HEADは上記007と同じ。総括はこのWorkで担当の指示、成果回収、相互検証、差し戻し、統合、APK、実機受入管理を行う。ユーザーに担当管理を戻さない。子担当は必要な工程で起動する。本記録の保存はバックグラウンド常時実行の設定ではない。

| 担当 | 専用branch | 主な責任・今回の状態 |
|---|---|---|
| UI / UX | work/vdraw007-ui-ux-20261005 | theme-007.css/ui-theme.js/app.js表示層。初回読取監査完了。OS keyboard、安全領域、TalkBackは未確認 |
| 図面編集エンジン | work/vdraw007-engine-20261005 | core/commands/history/storage/render。20関連テストPASS。ENGINE-001修正主担当 |
| 入力・トレース | work/vdraw007-input-trace-20261005 | importers/device/vision/provider。8模擬契約試験PASS。INPUT-001修正主担当 |
| 出力・共有 | work/vdraw007-output-share-20261005 | exporters/native-ioと出力所有者契約。既存実出力の内部構造照合。OUTPUT-001とEXPORT_OWNER_RACE修正主担当 |
| Android実機 | work/vdraw007-android-20261005 | package/署名/更新/lifecycle/OS picker/共有/Back。原本APK・証明書情報監査完了。実機は未実行 |
| 独立QA / Debug | work/vdraw007-qa-debug-20261005 | 制作者から独立して再現と判定。軽量45件PASS、4不具合を独立再現。実機PASSとはしない |
| 性能・回帰 | work/vdraw007-performance-20261005 | manifest、保護関数、軽量回帰、性能証跡。51件PASS。全回帰と実機性能は未完了 |

app.jsに入力・表示・出力の接点が集中するため、担当が同時に広範囲編集しない。共有ファイルの変更は総括が順序と責任範囲を固定する。初回担当監査は完了しており、修正作業は未着手。下記の差し戻しと完了条件を担当へ通知済み。

## 開発・統合ルール
1. 既存006/007を再実装しない。006と既存成果・checkpointを保全する。
2. main・validationの直接変更は禁止。担当は専用branchのみで作業する。
3. reset --hard、rebase、git clean、既存成果削除、checkpoint上書き、テスト削除、skip追加は禁止。
4. 他担当領域の大規模変更はせず、CROSS_TEAM_ISSUEとして総括へ返す。
5. 制作者の自己申告で完了にしない。独立QAが実際の挙動を確認する。
6. P0＝データ破壊/重大クラッシュ/既存案件破壊/保存破壊/重大出力破壊、P1＝主要機能不良/反応なし/保存・再読込・出力不能/操作停止、P2＝UI/文言/余白/操作性/視認性。
7. P0/P1が残る間はvalidation反映禁止。
8. 前回PASS・今回PASS・模擬境界・実AI・実ブラウザ・Android実機を明確に分ける。
9. 006と007のDB名は同じ。Androidは別package/sandbox。Web QAは別origin・新規合成案件を使い、006の実データに書き込まない。

工程は、現状確認→問題分解→担当決定→完了条件付き指示→branch成果回収→開始基準との差分→変更競合確認→独立QA→差し戻し→統合branch→関連テスト→全回帰→APK→実機受入→不具合再分配。

## 独立QAで確認した不具合
P0確定検出0、P1 4件（修正単位は3群）、P2確定0。これは未確認項目を含む全体のゼロ保証ではない。以下は未修正。Android実機で再現済みとは主張しない。

| ID | 分類・再現範囲 | 結果 | 主担当 |
|---|---|---|---|
| ENGINE-001 | P1、外部JSON→実エンジン描画 | startAngle=1e308/endAngle=0の円弧を受理後、arcPointsの繰返し加算が終了しない。通常0→180は49点PASS、異常値は子processが2秒timeout | 図面編集エンジン |
| OUTPUT-001 | P1、元output/exportBusy関数＋deferred生成、OS境界模擬 | PPTX生成中にPDFへ切替えるとPPTX MIMEをDrawing.pdf名で渡し、履歴format/写真設定も変更後の値で誤記録 | 出力・共有、UI協力 |
| EXPORT_OWNER_RACE | P1、元output関数＋deferred生成、案件切替模擬 | Aの生成物を案件B.pptx名で渡し、Bのexports/revisionへ記録。図形geometry破壊は未実証 | 出力・共有、UI/エンジン協力 |
| INPUT-001 | P1、元VisionJobsと候補preview、合成provider入力 | coordinateSpaceが脱落。2000×1000で確認した候補を1200×800へ採用し、相対位置が0.3/0.4→0.5/0.5に変化。原ページは保持 | 入力・トレース、UI/エンジン協力 |

007差分に起因した退行か、006からの継承不具合かは分ける。ENGINE-001/INPUT-001は006継承経路。OUTPUT系も007追加差分に起因したと断定しない。

### 差し戻しの完了条件
- ENGINE-001：角度処理を有限時間にし、0/180/360/負角/極端な有限値の仕様を定義。通常描画と既存案件schemaを維持。独立QAで外部JSON→描画の停止が解消し、既存関連回帰も通る。
- OUTPUT系2件：開始案件ID/revision/format/設定を固定。await中の形式/設定/案件切替と取消でも内容・名称・履歴・所有者が一致。他案件を誤更新しない。deferred再現と通常PPTX/DXF/PDFを検証。
- INPUT-001：座標系と参照画像変換の契約を揃える。非3:2画像でpreview/adopt/exportの相対位置一致、原ページ保持、保存再読込後も一致を独立QAで確認。AI未接続を完了としない。
- Android署名：現行debug秘密鍵の所在を確認。候補APKの証明書一致まで上書き可能と扱わない。鍵がない場合、package変更や移行を無断決定しない。アンインストール・アプリデータ消去で回避しない。
- Android checker：check-ci-source.py/native-assets-006.pyは006専用。007 workflowが実際に呼ぶ検査経路を確認。現行007 workflowはcheck-ui-scope.py/check-apk.pyを使用し、check-ci-source.py呼出は今回検索で未検出。旧checkerを007へ適用した誤FAILを製品不具合扱いしない。元006 checkerやmanifestを不一致隠蔽のために書き換えない。

## テスト結果と保護確認
性能・回帰担当の今回実行：Node7ファイル47 PASS＋Python bounded-process4 PASS＝51 PASS、FAIL 0、skip 0。
Node対象：core、history-codec-005、native-io-005、native-shell、ui-theme-007、vision-contract-005、vision-provider。
5000要素境界を含むchanges-006とcommand-update-004は今回未実行。テスト削除・skip追加はなく、全回帰PASSとはしない。
独立QA45件、エンジン20件、入力8件は上記と重複するため合算しない。追加不具合4件を既存回帰PASSで打ち消さない。

- CI-SOURCE-MANIFEST：141/141一致。
- BASELINE-LOGIC-MANIFEST：34/34一致。
- 主要14保護関数：14/14一致。outputはbusy/error表示以外同一。
- 展開ソース515ファイルの監査前後：追加/削除/変更0。
- 006原本の最新の全面再照合は今回未実行。前回救出で006 ZIP SHA/CRC、437 manifestファイル一致を記録済み。
- ブラウザ11群PASSは前回証跡。今回実ブラウザはNOT_RUN。
- 過去007の5000要素・色変更中央値169.803ms、100ms目標未達。今回再測定なし、Android実機値ではない。
- 実Claude/SAM、実写真精度、実PowerPoint/Jw_cad、OS共有、実カメラ、実keyboardは未確認。

## APK・更新互換性
- APK：VDRAW-MOBILE-007-debug.apk（既存原本、今回再ビルドなし）
- bytes：13,141,918
- SHA256：89350a7e6d8471ba3bbe983dfaeefba477d6ad31519f1036105da5cf9af71d09
- packageId：jp.dksc.vdraw.prototype007、versionCode 7、versionName 0.7.0
- minSdk 24、targetSdk 36
- 対応コードHEAD：1ec046fc1582803cf49716dcfa3330b06c21714f
- v2 blockから抽出した署名証明書SHA256：c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855
- 署名の暗号学的検証は今回未実行。秘密鍵の固定・永続保存設定は確認できず、次回Actions APKとの上書き互換性は未保証。
- 006はjp.dksc.vdraw.prototype006で別sandbox。旧アプリ・案件を保持する。
- Androidの保存/共有はCache→Share.share経路。受取先での恒久保存を実際に確認する。

## 実機受入と完了ゲート
ユーザーから007起動済みとの報告を継承。それ以上の実機合格は記録しない。

正式導線：
起動→白紙作成→線作成→寸法入力→文字入力→保存→アプリ終了→再起動→案件再読込→PPTX→DXF→PDF→Android共有→写真→画像→PDF入力→カメラ→大容量案件。

実機受入可能の条件：
関連FAIL 0、全回帰FAIL 0/skip 0、P0 0/P1 0、006保護、007主要機能の実機PASS、APK SHAとbranch/HEAD/APK/テスト記録。
現在はP1残存、全回帰未完了、主要実機未確認のため不成立。validation反映禁止、新APK作成・配布は次回検証ゲートに従う。

次にユーザーが確認する1項目：
007で新規白紙に線1本を作成し「端末保存済み」を確認→アプリ終了→再起動→同じ案件の線が残るか。
既存006案件を試験用に使わない。

## 総括報告
- 現在地：体制固定・原本確認・7担当の初回監査完了。
- 完了：8専用branch、APK/ZIP SHA確認、独立QA、限定51件回帰、担当への差し戻し登録。
- 残り：P1修正3群、署名更新検証、必要な統合/全回帰/APK、実機受入。
- P0/P1/P2：確定検出0/4/0。未確認UI・署名等の候補は別管理。
- 担当Work：7担当の初回監査は終了。次工程はエンジン・出力・入力修正、Android署名、独立QA再検証。常時実行中とはしない。
- 次の実機1項目：保存→終了→再起動→案件再読込。
- 進捗率：体制構築7/7＝100%。アプリ全体は受入項目未確認が多く算定保留。見た目/コード実装率から全体進捗を推定しない。
