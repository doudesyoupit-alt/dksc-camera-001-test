# VDRAW 4-Route Architecture Baseline V1

状態: INITIAL_CONTRACT_PROVISIONAL / 製品採用なし。
Repository: doudesyoupit-alt/dksc-camera-001-test
開発branch: work/vdraw007-photo-accuracy-20261006
開発HEAD: 6c0facb34757a54ed37d08d94505129b0341ad66
安定製品branch: work/vdraw007-signing-release-20261006
安定製品0.8.2 HEAD: 15bf3371bec3f7d1e4090e7198a850c5636baf3f
総括branch: work/vdraw-four-route-coordinator-v1
確認日: 2026-10-07 JST。コードを再作成せず、GitHubの正式Evidenceを根拠とする。

## 最新Evidence
- 開発CI run 37416413246: success。full-regression job 112115894172のsummaryはsuiteComplete=true、55 suite PASS / FAIL 0 / BLOCKED 0 / skip 0。55はsuite数であり個別assertion数・実写真精度ではない。
- photo-integration job 112115894356: success。006/signing/oldTests保護、Android web exporter parity、10枚取得・native OOXML配置assayを通過。
- 安定版CI run 37409871705: success。署名設定、readiness、0.8.2 APK、emulator update、accepted deliveryがsuccess。
- SAVE-001: docs/photo-accuracy/save001-device-acceptance.jsonでHuman実機受入CLOSED。再確認不要。
- 固定証明書SHA256: 186ad92e96316b7a2a247c092fd3d83a94fa7a89ea406859a93b057c329a2d8d。秘密値取得なし。
- 006 subtree: 47cabdf70e9aebf7c64a1e028e85c476df32a169。開発・安定版で同一。保護対象差分なし。
- PHOTO-PPTX-001: next-photo-defects.jsonとINTEGRATION-STATUS.jsonでCLOSED_INDEPENDENT_QA_PASS。旧FIX.mdの「QA待ち」は歴史記録。最終CI成功が上書き根拠。
- ネット実写真10枚: Site Photo Golden候補として保全。実AI 0、正式認識精度NOT_MEASURED、blind holdout未凍結。100枚拡大HOLD。
- GitHub open issue #1: 最上位目標。Photo/PPTXの個別不具合台帳は上記docs側に存在する。
- main: 1181c0aeef3a152435cf005583d09a15f209bd0d / validation: 1ec046fc1582803cf49716dcfa3330b06c21714f。変更禁止。
- Git tree全件にAGENTS.mdなし。本確認は指示された開発HEADに限定。

## 製品原則
4 Routeは共通Drawing IRへ収束。既存Android、Editor、Undo/Redo、保存/復元、SAF、共有、PPTX/DXF、座標契約、Goldenを維持。
Runtimeは画像処理→Geometry→輪郭/Line/Circle/Corner→Color boundary→Perspective→OCR→Pattern→Rule→Scene Graph→Human Correctionを優先。AIはOPTIONAL。
開発AIの成功例はEvidence→Golden再現→固定ロジック可能性評価へ接続し、AI結果をGround Truthにしない。
UNKNOWN/Human退避、重大False PASS 0、重大見逃し0へ接近。未測定を0点・成功率100%へ変換しない。

## 4 Route Capability Matrix
| Route | 既存取得/出力 | 現在確認できた能力 | 欠落/制約 | 正式採用Phase |
|---|---|---|---|---|
| A PHOTO→PPTX | 原本+sanitized PNG、候補採用、native PPTX | Editable基本図形/文字のexport、写真contain修正 | 実写真からの認識Runtime未接続、実精度未測定、Overlay/Human GT必要 | 5 |
| B PAPER→CAD | 画像取込、unitless DXF | 手動編集基盤を再利用可能 | 四隅補正/Geometry/OCR/symbol/校正Evidence未成立 | 3 |
| C PDF→CAD | 原本、raster参照、native text | PDF.js page/textを取得 | native vector path未取込、混在分類未実装、mm DXF未接続 | 2 |
| D PPTX→CAD | OOXML基本sp取込、unitless DXF | line/rect/ellipse/text/単純閉polygonの限定取込 | EMUを1200幅へ正規化、rot/flip/group未対応、object単位のloss ledgerなし、実Jw_cad未検証 | 1 |

既存PDFの画面参照用renderは維持可能。新CAD経路のVector抽出をその画像から始めることは禁止。
既存PPTXのunsupported件数warningは保持するが、CAD受入では各objectのsourceBinding・理由・件数照合が必要。
現行Editorのvdraw-mobile/1とDrawing IRは別contract。schema破壊・暗黙移行は行わずadapterで接続する。

## Component Ownership
| Component | Owner | Shared-file rule |
|---|---|---|
| 共通IR/schema/unit/transform/provenance | A | B/C/D/Fによる独自IR変更禁止 |
| 新規PPTX routeとDXF mm backend | B | 既存importers/exportersは総括統合時だけ変更 |
| 新規PDF route | C | PDF参照UIは維持、shared importer直接変更禁止 |
| 新規Paper route | D | 品質判定はEへ依頼 |
| 新規Quality/Guidance | E | Camera OS/permission/native変更は追加Human scope確認 |
| 新規Photo route | F | Phase1前に製品採用禁止 |
| Golden/Qa/Round-trip独立受入 | G | 制作担当の自己採点を合格証拠にしない |
| app.js/core.js/render.js/storage.js/native/assets統合 | Coordinator | wave1は全て読取り。patch提案→担当間調整→別統合branch→G |

## Branch方針
全専用branchは最新開発HEADを親に持つ総括docs-only baseline commitから分岐する。既存branchがあれば最新HEAD/HANDOFFを読み、上書きしない。
- Track A: work/vdraw-drawing-ir-v1
- Track B: work/vdraw-pptx-jwcad-v1
- Track C: work/vdraw-pdf-jwcad-v1
- Track D: work/vdraw-paper-camera-jwcad-v1
- Track E: work/vdraw-camera-quality-guide-v1
- Track F: work/vdraw-photo-editable-pptx-v2
- Track G: work/vdraw-jwcad-roundtrip-qa-v1
指示中の「6 Track」は列挙A〜Gに合わせ7 Trackとして解釈。総括自身は専門実装しない。

## 依存関係・統合順
- Aの初期契約レビューとGのGate設計は独立開始可能。
- B/C/D/Fの監査・source-native抽出計画、Eの品質設計はA確定を待たず開始可能。
- B/C/D/FのIR接続・unit exportはAのversion/hash確定後。未確定領域はPROVISIONALで局所化。
- DとFはEのquality verdictを利用。quality不明はPASSにしない。
- Phase1: A→B孤立実装→G実Jw_cad/Round-trip→Coordinator判断。
- Phase2 C、Phase3 D、Phase4 E、Phase5 F、Phase6 Multi-viewの正式採用順を維持。
- Wave1の終了条件はread audit/contract/test plan/HANDOFF。製品統合・APK生成なし。

## 現在BLOCKER
Phase1: IR正式schema未確定、PPTX native unit保持とobject loss ledger未実装、mm DXF未実装、実Jw_cad実行/保存Evidenceなし。
Photoのprovider/GT不足はPhase1の必須依存にしない。PPTX構造解析はAI必須ではない。
この初回では全実装を開始しない。各Trackの後続実装Dispatchは成果レビュー後に出す。
