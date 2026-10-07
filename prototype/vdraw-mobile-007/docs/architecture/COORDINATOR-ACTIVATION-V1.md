# Coordinator正式起動・最新状態再確認 V1

4-Route Architecture Parallel Coordinator V1を正式方針として継続。
今回の依頼10項目は既存GitHub成果で全て満たされているため、再作成せず最新内容/HEAD/HANDOFFを再取得して確認した。
総括自身による専門実装なし、初回指示再実行なし、main/validation/006の変更なし。

## 最新基準
総括branch: work/vdraw-four-route-coordinator-v1
再取得時HEAD: d8e6c58d53c6a91c0c3bf6f0c33c6a56fd25bd38
開発branch/HEAD: work/vdraw007-photo-accuracy-20261006 / 6c0facb34757a54ed37d08d94505129b0341ad66
安定branch/HEAD: work/vdraw007-signing-release-20261006 / 15bf3371bec3f7d1e4090e7198a850c5636baf3f
安定version 0.8.2 / versionCode 10。SAVE-001 Human実機受入CLOSED。固定署名・006保護維持。
Architecture baseline: 9ae8e1b4137cbb4a65f630e2501a94af6cb826ad。
この文書とREVALIDATION JSONを含むcommitが正式な起動再確認記録。commit自身のHEADはGitHub branchから解決する。

## 依頼10項目の所在
全pathは prototype/vdraw-mobile-007/docs/architecture/ 配下。

| 項目 | 保存済成果 | 最新確認 |
|---|---|---|
| 1 branch / HEAD | 本文と ACTIVATION-REVALIDATION-V1.json | 総括・開発・全Track再取得 |
| 2 安定0.8.2 | BASELINE-V1.md / BASELINE-EVIDENCE-V1.json | release HEAD / accepted CI / SAVE001再取得 |
| 3 既存資産 / Contract | BASELINE-V1.md / CROSS-TRACK-REVIEW-V1.md | 全existing product/test/Golden blob不変、006 tree一致 |
| 4 Capability Matrix | BASELINE-V1.md | Route A/B/C/D別能力と欠落保存済 |
| 5 Drawing IR | DRAWING-IR-INITIAL-CONTRACT-V1.md / tracks/A/INITIAL-AUDIT-V1.md | 初期契約あり、正式schema PROVISIONAL |
| 6 A〜G責任境界 | BASELINE-V1.md / dispatch/DISPATCH-MANIFEST.json | 共通ファイルは総括統合、専用ownership確認 |
| 7 専用branch | dispatch/DISPATCH-MANIFEST.json / 本表 | 7 branchとHANDOFF HEAD一致 |
| 8 依存Map | DEPENDENCY-MAP-V1.md | IR依存とPhase順を維持 |
| 9 Phase1 Acceptance | PHASE1-ACCEPTANCE-V1.md / tracks/G/INITIAL-AUDIT-V1.md | PLAN_ONLY / 実Jw_cad NOT_RUN / Gate HOLD |
| 10 初回コピペ指示 | dispatch/TRACK-A〜G-INITIAL-V1.md | 7件保存済・完了receipt確認済 |

## A〜Gの責任・専用branch
| Track | 責任 | branch | 最新HEAD |
|---|---|---|---|
| A | Drawing IR / Architecture Contract | work/vdraw-drawing-ir-v1 | b023fdc1a0dacd1d9280db3af2b3ad4da17f3609 |
| B | PPTX → Jw_cad | work/vdraw-pptx-jwcad-v1 | 595cb93a6b7f797cffcbcbc9caf858e695c5e932 |
| C | PDF → Jw_cad | work/vdraw-pdf-jwcad-v1 | da04782922dd48524366d8b564efc5f2ec512ff0 |
| D | Paper Drawing Camera → Jw_cad | work/vdraw-paper-camera-jwcad-v1 | 1708d4015e51285e763f58394f9e5921c4bef081 |
| E | Camera Quality / Guidance | work/vdraw-camera-quality-guide-v1 | a15bbe1e8ad9a156937d41e4bbcddfc738be0bdb |
| F | Field Photo → Editable PPTX | work/vdraw-photo-editable-pptx-v2 | d95810dca2a4ad427e40cb561734fdcb2ac8ae94 |
| G | Independent QA / Round-trip / Jw_cad | work/vdraw-jwcad-roundtrip-qa-v1 | 07eaa6a66930e4caa9d417d965e5eeda583a28cf |

全初回監査・引継ぎは保存済み。既存instruction_idはCOMPLETED_DO_NOT_RERUN。後続指示では必ず新ID/最新HEADを指定する。
コピペ指示7件は記録として保全する。完了済み初回指示を新Workへ再送して同じ監査を重複させない。

## 並列開始してよいWorkの範囲
以下は後続Dispatchに含められる範囲。今回の起動確認で実装を開始したという意味ではない。

| Track | IR確定前に独立して進められる範囲 |
|---|---|
| A | 共通schema・semantic validator・unit/frame/ledger契約試験。最優先の契約確定担当 |
| B | native OOXML inventory・EMU原値・source object/part loss ledger。IR/DXF/UI未接続の孤立範囲。Phase1最優先 |
| G | Native/Generic原本inventory・独立座標oracle・Golden/受入設計。正式IR結果判定・閾値凍結は依存後 |
| C | 原PDF native operator/frame snapshotの準備。display renderからgeometryを推定しない |
| D | 手動四隅/planar補正の数学的準備。target aspect根拠不足はPROVISIONAL、実寸根拠なしUNSCALED |
| E | 品質measurement/理由/具体actionの契約準備。閾値は暫定、未測定を適合へ変換しない |
| F | 既存10枚の資産参照・source-transform mapping準備。再収集/再推論なし |

最初の後続WaveはA/B/Gを優先候補とする。C/D/E/Fを全て同時実装へ広げず、監査成果を保全し正式採用Phase順を維持。

## IR確定待ちのWork
B/C/D/Fの正式IR serialization/adapter/Editor接続、EのIR source/frame/status binding、IR→mm DXFの正式接続はAのschema/version/hash確定待ち。
Gは受入設計を並行可能だが、最終IR適合・B候補end-to-endは確定契約と実装HEAD待ち。
同じTrackに「独立して進められる部分」と「IR待ち部分」がある。Work全体を一律BLOCKEDにしない。
製品採用はPhase1 PPTX→Jw_cad、Phase2 PDF、Phase3 Paper、Phase4 Guide、Phase5 Photo、Phase6 Multi-viewの順。

## Phase1 Acceptanceと現在BLOCKER
必須: supported primitive silent loss0、native EMU/sourceBinding/unit保持、line/text/position/size/angle/color/layer比較、unsupported object理由付き明示。
実Jw_cadでOpen/線選択/文字編集/図形分離/非ラスタ/保存を確認し、再編集→DXF再保存→独立比較まで行う。
紙面LAYOUT mmと現場REAL_WORLD mmを分離。Generic文字をdimension semanticへ推測昇格しない。
BLOCKER: 正式IR、native inventory/EMU/loss ledger、新mm DXF、正式許容差、実Jw_cad/実PPTXアプリEvidence。現時点でPhase1 HOLD。
既存CI成功と55 suite履歴は新route実精度に加算しない。今回新試験/新推論/APKなし。
