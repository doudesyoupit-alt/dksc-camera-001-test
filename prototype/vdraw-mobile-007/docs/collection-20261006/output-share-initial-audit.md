# VDRAW MOBILE 007 出力・共有 初回監査報告
記録：2026-10-05の初回指示に対応
状態：読取監査・最小修正方針・試験設計完了／実装修正・再生成・実機検証は未実施
宛先：総括。CROSS_TEAM_ISSUEは本書で提出用に整理。別Workへの自動送信は行っていない。

## 1. 基準・変更実績

- repository：doudesyoupit-alt/dksc-camera-001-test
- 専用branch：work/vdraw007-output-share-20261005
- 開始・終了照会：HEAD 1ec046fc1582803cf49716dcfa3330b06c21714f。比較 identical / ahead 0 / behind 0。
- 総括資料読取時HEAD：1e3dd26184fa967fbf6798cb749b3705c64297dd。自branchへmergeしていない。
- 正常基準006。今回、アプリコード変更・commit・push・再生成・APKビルド・ブラウザ試験・Android試験は0。
- main／validation／006／既存checkpoint／既存成果／テストは変更していない。
- Git treeの再帰一覧はtruncated=false。AGENTS.mdは一覧内に存在せず。
- APK生成run 37283743856はsuccess、head_shaは開始基準と一致。APK本体の再取得・再ビルド・署名検証は今回実施していない。
- 006と007のexporters.js、native-io.js、storage.jsはGit blob SHA一致。007固有の退行と断定しない。
- 確定P1：OUTPUT-001、EXPORT_OWNER_RACEの2件、共通の修正群。P0の全体ゼロ保証はしない。

## 2. 参照証跡と今回の確認

総括branchの以下を読んだ。
- prototype/vdraw-mobile-007/docs/INTEGRATION-20261005.md
- docs/integration-evidence-20261005/output-001-independent.json
- docs/integration-evidence-20261005/export-owner-race-independent.json
- docs/integration-evidence-20261005/qa-initial-audit.json

既存VDRAW-MOBILE-007.zipのSHA256：
3d91a85c663bde84ceee89fcfa2192fb443c83ace43f1f154e0e329f1b475e46

ZIP内の既存UI smoke結果・output-structure.json・実出力3ファイルを読取確認。再生成していない。3ファイルのサイズとSHA256は既存検査記録に一致。内部構造PASSは既存の検査結果を継承したもので、今回Office/CAD/PDFビューアを起動して得たPASSではない。

| 形式・既存ファイル | bytes | SHA256 |
|---|---:|---|
| UI-smoke-007.pptx | 52025 | cf5daf32dd411fb91482c005fb7ab97514bbd5004709c4b3839def445b1fd371 |
| UI-smoke-007.dxf | 1158 | 57011f2e5f2e25c49a08763b629fe7b6f59eb629bcf75e7e8901ed0f9eff27d1 |
| UI-smoke-007.pdf | 16373 | efadb5535c871c0947a1e1f813eebfbb6c07f391d3fcfaa12f63cb9ac36162e1 |

ZIPの主要6ソースについてGit blob SHAを照合。exporters/native-io/storage/app/device/ui-themeは開始基準の読取結果と一致。ローカル監査コピー作成時に付いた末尾改行1個による初回比較不一致は、ZIP bytesのGit blob SHA照合で切り分けた。製品ソース差分や製品試験FAILではない。

## 3. 形式別の確認範囲

| 形式 | 既存の実出力・内部確認 | 実用確認・残り |
|---|---|---|
| PPTX | 007合成案件をChromium UIから出力。ZIP CRC/XML、2スライド、shape 5／line 2／picture 0、文字「新しい文字」「2400 mm（手入力・対象のみ）」、透明な文字背景、UI選択枠なし。一枚画像への平坦化なし | PowerPointで開く・図形/文字編集・保存再読込はNOT_RUN。写真ON、円弧/多角形、実案件、Android受取先は007 smokeで未確認 |
| DXF | 007合成案件UI出力。LINE 2／TEXT 2／LWPOLYLINE 1、ページ別レイヤ、INSUNITS=0。未校正・単位なし | Jw_cad/対象CADで開く・編集・日本語表示・保存再読込はNOT_RUN。CIRCLE/ARC/MTEXT等は旧005証跡に存在するが007の再試験PASSに数えない |
| PDF | 007合成案件UI出力、2ページとして解析された既存記録。コード上は各ページのPNGを配置する説明用ラスタPDF | PDFビューア表示、文字欠け・余白・ページ方向・写真ON・印刷・Android受取先はNOT_RUN。編集可能なCAD図面とは扱わない |
| PNG / SVG | exportFileの分岐・現在ページ出力・MIMEを静的確認 | 今回の実出力照合なし。表示・写真ON/OFF・複数ページ範囲は未確認 |
| XLSX | 全ページ対象一覧とMIMEを静的確認 | 今回の実出力照合なし。Excel表示・日本語・数値・列の実用確認は未確認 |
| JSON | clone後、既定でoriginal削除。includeOriginalの分岐とMIMEを静的確認 | 今回の実出力照合なし。設定切替race、原本含有、復元・履歴一致は未確認 |

写真設定includePhotoはPPTX/PDF/PNG/SVGで利用され、DXF/XLSXでは出力内容に使われない。includeOriginalはJSONだけに適用される。履歴は「選択設定」と「実際に適用された設定」の意味を揃える必要がある。今回勝手にschema変更しない。

| 拡張子 | exporterのBlob.type |
|---|---|
| .pptx | application/vnd.openxmlformats-officedocument.presentationml.presentation |
| .dxf | application/dxf |
| .pdf | application/pdf |
| .png | image/png |
| .svg | image/svg+xml |
| .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| .json | application/json |

ブラウザではFileにblob.typeを渡す。Android native-ioはCacheファイルURIをShareへ渡し、明示的MIME引数を渡していない。Android OS Intentと受取先の認識MIMEは未確認。

## 4. 2問題の共通原因

app.jsのoutput（開始基準70〜72行）：
1. clone(doc())で図面内容だけを固定し、形式・設定の値をexportFileへ渡す。
2. await measuredExport後、名称を現在のdoc().title、拡張子を現在のformatから作る。
3. await downloadOrShare後、現在のdoc()へ現在のformat/設定/revisionで履歴を追加し、現在案件をsaveする。

awaitを跨ぐ処理で、生成に使った状態と完了処理の状態が一致する保証がない。exporters.js自体より、呼出側の出力ジョブ契約が主原因。

| 問題 | 既存独立再現 | 今回の判定 |
|---|---|---|
| OUTPUT-001 | PPTX生成待機中にPDF・写真ONへ変更。PPTX MIMEをDrawing.pdf名で受渡し、履歴がPDF/写真ONになる | 実コードと証跡が整合。P1未修正 |
| EXPORT_OWNER_RACE | A生成待機中にBへ変更。A内容を案件B.pptx名で受渡し、Bのexports/revisionへ記録・保存 | 実コードと証跡が整合。P1未修正。図形geometry破壊までは実証なし |

既存再現は元関数抽出＋deferred生成＋OS/案件切替模擬。実ブラウザ・Androidで同じ操作を再現したPASS/FAILとは区別する。

exportBusyは出力アクションボタンだけ無効化する。形式・設定は変更可能で、exportScreen再描画時にbusy表示も再適用されない。busyだけに依存して整合性を保証できない。

追加の同系列リスク：共有OS待機中の案件切替、同じ案件IDを閉じて再度開くA→B→A、生成中の名称/図形/revision変更、完了後のexportScreenによる別案件画面の上書き。今回は静的候補であり、新しい実機再現済み不具合として数えない。

## 5. 最小修正案（未適用）

出力を開始した同期区間、最初のawaitより前に、ひとつのジョブとして以下を固定する。

ownerEditorの参照、ownerId、sourceRevision、cloneした図面、activePageId、title、format、includePhoto、JSONに限るincludeOriginal、share/download意図、サニタイズ済みname、operationId。

- 生成・名前・拡張子・MIME照合・履歴の形式/適用設定/元revisionは、固定ジョブだけから作る。
- snapshotだけをexportFileへ渡す。完了時に開始snapshot全体を現行案件へ上書きしない。
- 最小の所有者方針として、受渡し前にeditor参照・案件ID・revisionを再確認。生成中に案件/編集session/図面revisionが変わったら受渡しを中止する。形式/設定だけの変更は次回用とし、進行ジョブには反映しない。
- OS受渡し後にも所有者参照・ID・revisionを確認。変わっていたら現在案件への履歴書込、save、exportScreenを行わず「受渡し済み／履歴未記録」と明示する。既に行った外部受渡しを取消済みと偽らない。
- 所有者が一致する場合だけ、ownerEditorの現行docへ元revisionを持つ履歴を同期的に追加し、ownerを固定して保存する。await保存後の画面更新にもowner照合を入れる。
- 保存失敗は、生成/受渡しの結果と履歴保存の結果を分ける。別案件へ移し替えない。再試行で重複履歴を作らない。
- 取消tokenは受渡し前にチェック。ネイティブ共有開始後は外部操作を強制撤回できると扱わない。
- 同IDでも別Editor/sessionなら別所有者として扱う。ownerIdだけの比較ではA→B→Aを防げない。
- 背景で元案件Aへ履歴を必ず記録する仕様を選ぶ場合は、最新Aに履歴だけを原子的に追記し、checksum/revisionを確認する別の設計が必要。保持した古いAや開始snapshotをstore.saveへ渡すだけでは、A再読込後の編集を上書きし得る。これは最小案には含めず総括判断へ返す。

形式/設定のUIロックは補助策。上記固定と所有者照合を省略してはならない。

## 6. 変更範囲とCROSS_TEAM_ISSUE

| 境界 | 提案・総括に返す事項 |
|---|---|
| 出力担当 exporters.js | 既存シリアライザを再実装しない。固定ジョブを受け取る小さな契約/MIME照合が必要か判断。開始図面複製が二重にならないようにする |
| 出力担当 native-io.js | Cache→Shareの「share-requested」を維持。書込失敗・URI欠落・取消で成功扱いしない。OSの曖昧な取消結果を成功へ変換しない |
| CROSS_TEAM_ISSUE_UI_OUTPUT_OWNER | 修正中心は共有app.jsのoutput、完了画面更新、busy再描画。UI担当と総括が編集順序を決定。出力担当単独でapp.jsを編集しない |
| CROSS_TEAM_ISSUE_UI_SHARE_STATUS | 履歴ではshare-requestedを受渡しと表示しているが、完了toastは「ファイルを作成し、履歴を端末に保存しました」。共有先保存の成功と受け取られない表示に揃える。Web sharedも受取先恒久保存の証明ではない |
| CROSS_TEAM_ISSUE_ANDROID_SHARE_RECEIPT | Nativeでは「保存」「共有」が共にos.share。MIME、取消の戻り値、受取アプリ、Cache URI読み出し、OS Back/中断/復帰、受取先保存後の再表示をAndroid担当が確認 |
| CROSS_TEAM_ISSUE_ENGINE_HISTORY | 背景履歴追記を要求する場合のみ、最新案件/Editor identity/undo/revision/checksum/保存queueの契約をエンジン担当と調整。既存storage全体の変更を先行しない |
| CROSS_TEAM_ISSUE_QA_EVIDENCE | deferred再現を維持し、独立QAが修正差分と反例を確認。内部構造PASSでraceを打ち消さない |

## 7. 必要テスト（設計のみ・今回未実行）

PPTX/DXF/PDFそれぞれで、区別可能な案件A/B、タイトル、線/文字/寸法、複数ページ、revisionを用意。006実案件は使わない。

| 操作・注入 | 必須判定 |
|---|---|
| 生成待機中にpptx→pdf→dxfなど形式変更 | 元内容・拡張子・MIME・履歴formatが開始形式で一致 |
| 待機中に写真ON/OFF、JSON原本ON/OFF | 元ジョブ設定と実含有が一致。特に意図しない原本添付なし |
| 待機中に案件A→B、A→B→A | 最小案では受渡し前に中止。Bのexports/revision/図形/checksumが変わらない |
| 生成中に案件名・activePage・図形/revision変更 | 最小案のrevision変更時中止。名前だけ現在値から再取得しない |
| 共有await中にA→B、A→B→A、同A編集 | 別案件へ記録なし、古いA上書きなし、受渡し後なら履歴未記録を正確に表示。別画面をexportScreenで奪わない |
| 生成中の取消→遅延resolve/reject | token後の受渡し/成功履歴なし。finallyでbusy解除 |
| OS共有取消・AbortError・Native一般的cancel rejection | 成功/恒久保存と表示しない。既存履歴に成功追記なし。実機で返り値を確認 |
| exporter失敗／字体読込失敗 | OS受渡しなし、成功履歴なし、復帰・再試行可能 |
| Filesystem書込失敗・URI欠落 | Shareを呼ばない、成功記録なし |
| 履歴保存で容量不足/tx abort/checksum競合 | 外部受渡し結果と履歴保存失敗を分離。既存案件を保全。再試行の重複なし |
| 連打・形式変更による再描画 | 同時出力1ジョブ、busy表示整合、完了後解除 |
| 通常出力・保存・再起動・履歴再読込 | ownerId、元revision、設定、形式、状態が一致 |
| 日本語名・禁止文字・長い名・空名 | name/拡張子/MIME一致、Native検証エラーが明示、案件名は勝手に変更しない |
| 受取先で保存→共有UIを閉じる→別途開く | 受取先アプリ名と保存場所を記録し、受取先に残ったファイルの内容/形式/名称を確認 |

実用受入：
- PowerPoint：PPTXを開いて日本語・図形・線・寸法・ページを照合、図形と文字を編集し、保存再読込。
- 対象CAD：DXFのページ別配置・レイヤ・座標・日本語・対象entityを照合。未校正の単位なし仕様を維持。
- PDFビューア：全ページ・日本語・写真・方向・寸法・線を目視し、保存後再表示。
- Android：受渡し前後の名称/MIME/読出URI、取消、受取先での恒久保存・再表示。共有画面が開いただけでは合格にしない。
- 証跡はコードHEAD、APK SHA/package/version、試験fixture ID/revision、設定、ファイルbytes/SHA、受取アプリ、保存結果を結びつける。
- 内部検証、ブラウザ合成試験、OS模擬、実アプリ、実機を別欄で記録する。

## 8. 完了判定

初回監査の完了条件は充足。形式別の範囲/未確認、2問題の共通原因、最小変更範囲、取消/保存失敗を含む必要テストを整理した。
製品受入は未完了。P1 2件は未修正、PowerPoint/CAD/PDFビューアとAndroid受取先は未確認。
初回の指示どおり修正・新出力・重い描画試験は行わない。次工程は総括が共有app.jsの編集責任と所有者方針を固定した後に実装する。
