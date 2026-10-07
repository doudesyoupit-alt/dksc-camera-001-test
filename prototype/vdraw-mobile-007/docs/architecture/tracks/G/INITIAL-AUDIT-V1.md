# Track G — Independent Phase 1 QA Initial Audit V1

状態: INITIAL_PLAN_COMPLETE / PLAN_ONLY。Phase 1 PRODUCT_GATE=HOLD、実Jw_cad=NOT_RUN / UNMEASURED。
instruction_id: VDRAW-4ROUTE-G-INITIAL-20261007-V1
branch: work/vdraw-jwcad-roundtrip-qa-v1
開始HEAD: 9ae8e1b4137cbb4a65f630e2501a94af6cb826ad（GitHub再取得一致）。
source branch/HEAD: work/vdraw007-photo-accuracy-20261006 / 6c0facb34757a54ed37d08d94505129b0341ad66（GitHub再取得一致）。
release branch/HEAD: work/vdraw007-signing-release-20261006 / 15bf3371bec3f7d1e4090e7198a850c5636baf3f（GitHub再取得一致）。
総括dispatch manifest: docs/architecture/dispatch/DISPATCH-MANIFEST.json。総括初期契約に従い、新規独自IRは定義しない。

## 1. 監査結論と検証範囲

既存Editor、保存、署名、写真contain修正の保護Evidenceを再利用する。これらをPPTX→mm DXF→実Jw_cad互換の証明へ昇格しない。
Route Dはnative OOXML入口、既存DXF出力を再利用できるが、source-native単位・group変換・完全inventory・mm出力・実アプリround-tripのEvidenceが不足する。
初回は既存コード読取り、GitHub状態再取得、独立受入計画のみ。制作コード・schema・test実装なし、新規test実行なし、APK生成なし、写真再収集/推論なし。

GitHubへ再取得したEvidence:
- 開発CI 37416413246: completed/success、head_sha=6c0facb34757a54ed37d08d94505129b0341ad66。
- 安定版CI 37409871705: completed/success、head_sha=15bf3371bec3f7d1e4090e7198a850c5636baf3f。
- full-regression 55 suite PASS / FAIL 0 / BLOCKED 0 / skip 0は総括BASELINE-V1とbaseline-evidence.jsonの既存集計。今回再実行せず、suite数とassertion数を混同しない。
- 現branch recursive treeはtruncated=false。006 subtree=47cabdf70e9aebf7c64a1e028e85c476df32a169。
- SAVE-001受入JSONを最新source branchから再取得: CLOSED、0.8.2実機SAF確認、reconfirmationRequired=false。
- 固定証明書SHA256=186ad92e96316b7a2a247c092fd3d83a94fa7a89ea406859a93b057c329a2d8d。秘密値にはアクセスしていない。
- GitHub open issueは#1「共通最上位目標」。個別Photo/PPTX不具合はdocs/photo-accuracyの台帳を正とする。
- PHOTO-PPTX-001=CLOSED_INDEPENDENT_QA_PASS。実PowerPoint/PPTXアプリround-trip、実Jw_cad、写真認識精度は別途未実施。

## 2. 独立コード監査

全行番号は上記source HEADの prototype/vdraw-mobile-007 配下。コード読取りの欠落候補であり、今回新規再現testを実行したという主張ではない。

| Source | 確認できた既存能力 / 欠落 | QAへの影響 |
|---|---|---|
| web/src/importers.js:19–25 | slide cx/cyを読み取るが1200幅へ正規化、native EMU/object別bindingをIRへ保持する経路は未成立 | 異なるslide幅で同じ1200座標へ収束する反例、EMU→mmを独立oracleで検証 |
| importers.js:24,32 | descendant spのみ処理。p:cxnSpのinventory/unsupported計数がない | connectorをinput分母から消さない。leaf countとcomponent countを別固定 |
| importers.js:24,27,32 | descendantsのspは読むがparent grpSpのoff/ext/chOff/chExt/rotationを適用せず、groupは別途unsupported加算 | nested groupで画面の位置とimport geometryが違う候補。group container unsupportedだけでchildren fidelity PASSにしない |
| importers.js:24 | rot/flipはunsupported countへ退避 | object ID/位置/理由つきledgerが必要。count warningのみでは欠落説明のEvidenceにならない |
| importers.js:26,28–31 | textを持つshapeはtext分岐のみとなりshape geometryを保持しない。全tを改行join | shape+text双方のcomponent保存、runとparagraphとexplicit breakの分離が必須 |
| importers.js:29–31 | 単一closed custom polygon、rect/ellipse/lineを限定取込 | open polyline/複雑pathは明示unsupported、closed判定とvertex順序を監査 |
| web/src/exporters.js:27–36 | VDRAW native PPTXは基本図形/文字、12×8 inch配置、UNSCALED note | この紙面layout mmを現場実寸として扱わない。Notes/author/objectNameだけで強いsemantic provenanceにしない |
| exporters.js:32,35,38–46 | bbox経由の基本shape、polygon/arc native custom geometry。rotate=0 | 負方向line・arc・shapeの実際のOOXMLをGoldenに凍結し、writer実装そのものをoracleにしない |
| exporters.js:49–65 | LINE/TEXT/MTEXT/ARC/CIRCLE/ELLIPSE/LWPOLYLINE、page y反転と並置offsetあり | primitive用の再利用候補。Jw_cadがentity・日本語・色を保持することはまだ未検証 |
| exporters.js:53 | $INSUNITS=0、Editor座標をそのまま出力 | 既存unitless経路は保持。新mm経路のheader/数値/実Jw_cad寸法を別々に検証 |
| exporters.js:57–60,63 | truecolor=420、TEXT/MTEXT encoding、ELLIPSE出力あり | 最新実Jw_cadが対応するとは仮定しない。実versionで選択/編集/保存を検証 |
| web/src/core.js:16–43 | vdraw-mobile/1、canvas/geometry/管理情報validation、UNSCALED保存 | 新IRをEditor schemaと暗黙交換しない。既存save/reloadデータと既存validationを保護 |
| web/src/vision.js:28–43,77–94 | sourceBinding/candidate frame/contain/採用前validation | source asset SHA256と既存binding双方を維持。Fingerprintは変更検知であり暗号学的原本証明ではない（21–25） |

source blob SHA（GitHub tree）: importers.js=33fe27ec3d1f33647967892d386b2c7148b7b84c、exporters.js=7e50082bc18da5c6167709f7c6f699cc44b7f591、core.js=396deedd7062f2ceb89bc20bc3e850132ab2f194、vision.js=37be20846f9694cfd023c0194a32cd75cf6312fd。

## 3. Component境界とGate依存

Track Aが共通IR/schema/version/hashを確定する。Track Bが新規routes/pptx/、object loss ledger、mm DXF backendを実装する。Gは実装コードを修正せず、独立Golden/oracle/数値比較/実アプリ証跡を所有する。
Gの将来QA成果は独立qa/を想定するが、今回追加はdocs/architecture/tracks/G/のみ。既存importers/exporters・core・Android・testには変更しない。
B/C/D/Fへ独自IR追加は禁止。IR未確定項目はPROVISIONAL、schema未確定/threshold未承認の項目はPASS判定不可。
Gの実Jw_cad受入はA version/hash確定、B candidate immutable HEAD、DXF static audit後。PDF/Paper/Photoの進捗をPhase1前提に追加しない。

## 4. Golden設計（まだ作成・実行していない）

NativeとGenericのGoldens・分母・合格主張を分離する。Nativeは実VDRAW exporterの出力原本と元Editor JSONを固定し、両者の独立照合を行う。metadata origin/schema/hashを確認できないNativeはsemantic UNKNOWNとして扱う。Genericの図形・文字からdimension/pipe/equipment意味を作らない。
各Goldenにはsource SHA256、作者app/version、source approval、slide EMU、source OOXML object/path、leaf/component/container/background inventory、expected endpoints/vertices/text baseline/run/geometry、supported/unsupported policy versionを固定する。初回実装が読める件数を分母にしない。

| Golden群 | 最小coverage | 独立oracleと反例 |
|---|---|---|
| NATIVE-N01 | 実VDRAW line/rect/ellipse/circle/polygon/text/dimension注記/arc | 元Editorと実OOXMLを独立照合。native writerの欠落も別台帳へ |
| GENERIC-G01 | 横/縦/斜線、負方向line、zero extent、負offset、非標準slide | source endpoint整数、手計算unit変換、page y反転 |
| GENERIC-G02 | ASCII/日本語、同一paragraph複数run、改行、空paragraph、shape+text | codepoint・run・paragraph・shapeを個別照合。run全改行joinを検出 |
| GENERIC-G03 | rot正負/90/359、flipH/V、basic/nested group、非一様scale | parent→child matrixを独立構成。circle→ellipse化を照合 |
| GENERIC-G04 | open/closed polyline、polygon、connector p:cxnSp、複数custom paths | 完全inventoryでconnector消失、closed誤認、複数path切捨てを検出 |
| GENERIC-G05 | direct/theme色、font/layout/master継承、hidden、多slide | layer/colorの意味はUNKNOWN許容、視覚値との混同を検出 |
| NEGATIVE-X01 | image/table/chart/SmartArt/curve、未知namespace、壊れたrelationships | silent drop=0、source path/理由/actionをledger、FULL PASS不可 |
| NEGATIVE-X02 | NaN/Infinity/特異matrix、欠けたbinding、未知schema、矛盾calibration | BLOCKED/HUMAN_CHECK_REQUIRED、値自動修復なし |
| REGRESSION-R01 | 旧案件save/reload、既存candidate/contain/photo aspect、IO/Undo/Race | 既存Goldenを再利用。新経路が旧schema/履歴を破壊しない |

Multi-slideはpage並置offsetとgapの単位を契約化し、同一shapeのslide間同座標とglobal CAD座標を区別する。Bのlayout仕様決定前はPROVISIONAL。
PPTX実アプリの画像比較は補助Evidence。OOXML数値正しいだけでPowerPoint編集互換PASSにしない。実PowerPoint/同等検証対象appの名称/version、選択/編集/再保存原本hashが必要。

## 5. Loss accountingとFalse PASS防止

inventory key=(asset hash, slide/path, OOXML object ID, component kind)。group containerとleaf drawableとtext componentsを別分母にする。shape+textは1 object/2 componentsとして両方照合し、textしかexportしていないことをobject1件保持と誤認しない。
leaf/componentごとにSUPPORTED_EXPORTED、UNSUPPORTED、REJECTED、HUMAN_CHECK_REQUIREDを1つ記録し、output IDs/count/sourceBinding/reasonを持たせる。count conservationに加え、重複key・unclassified key・output未bindingを検出する。
p:cxnSp、hidden、background、master/layout referenceなども入力台帳に残す。対象policy外を明示し、その数を消して合格率を上げない。
unsupportedは明示したpartial exportを許容できるがFULL PASSではない。unsupported warningの総件数だけ、画面表示だけ、parser成功だけ、synthetic成功だけではPhase1 PASSにしない。

## 6. Unit・数値tolerance契約案

LAYOUT_MMとREAL_WORLD_MMを明確に分離。EMU/36000で求まるPPTX紙面mmはUNSCALEDでも保持可能。建物実寸のmmはcalibration Evidence/対象scopeなしに生成禁止。文字「1000」を自動dimension/scaleにしない。
例: source line delta=914400 EMU→layout 25.4 mm。これは25.4 mmの建物部材ではない。negative/zero extentのlineはendpointとして保持する。CAD INSUNITSだけでunit証明せず、実Jw_cadの測定値を比べる。

| 比較項目 | 初期提案 / 必須条件 | 現在状態 |
|---|---|---|
| source EMU/native numeric | 原本整数のexact保持、productionとは別計算 | PLAN |
| pure EMU→mm | epsilon<=1 EMU相当=1/36000 mm。精度実測と丸め位置を記録 | PROVISIONAL / A・G review後固定 |
| geometry endpoint/vertex/center/radii | page/group transform別誤差、max/RMS/p95、worst object、方向反転を保持 | epsilon未確定 |
| rotation | wrapを考慮したangle差、reflection/matrixも別評価 | epsilon未確定 |
| text | 内容・codepoint・paragraph境界の意図しない差0。位置/高さ/anchor/代替font差別計測 | geometry epsilon未確定 |
| color/layer | direct/theme raw値とmappingを分離、unsupported明示、semantic UNKNOWN許容 | 実Jw_cad mapping未測定 |
| Jw_cad再保存 | app/versionごとのquantization・出力限界を測定後、Human-reviewed tolerance凍結 | UNMEASURED |

未編集部分のerrorを意図的編集で隠さない。bad vertex/micro-line/duplicate/entity splitは数値距離に加えtopologyで監査。toleranceを結果後に広げて合格化しない。閾値未確定はHOLD、明らかな情報欠落/誤unitはFAIL。precisionの指標とsupport coverageを別々に報告する。

## 7. 実Jw_cad環境の限定確認

read-only確認範囲: 本Linux workspaceのplatform、PATHのwine/wine64/Jw_win/Jw_win.exe、workspace配下の名前にjww/jwcad/jw_winを含む既存ファイル。
観察: Linux-6.18.44-x86_64、wine/wine64/Jw_win/Jw_win.exe=None、workspace一致ファイルなし。Windows/Jw_cad実行環境をここでは確認できなかった。
ユーザーのPC、他workspace、リモートWindowsは調査していない。「どこにも存在しない」とは判断しない。実Jw_cad操作はNOT_RUN、Phase1はDEVICE_JWCAD_EVIDENCE_REQUIREDでHOLD。アプリinstall・remote接続・wine導入・PC操作依頼は今回実行しない。

実装candidate成立後、必要実操作を次の最小checksheetにまとめる（現在は実行指示ではない）:
1. Goldenとcandidate DXFのhash、Windows/実Jw_cad version、用紙/縮尺/読込設定を記録する。
2. DXFをOpenし、線を個別選択、複数図形を別々に選択、文字を文字として編集、ラスタ依存がないことを記録する。
3. 基準lineの紙面/geometry長さ、text高さ/日本語/改行、ellipse/circle/closed polygon、color/layerを確認する。
4. 指定lineを明示deltaで移動、指定textを既知文字列へ編集。編集対象ID/期待変化を保存する。
5. DXF再保存しbefore/after原本を回収する。保存形式、entity変換・分割、encodingを記録する。
6. 未編集部分の数値/内容差と意図的編集部分の差を別比較する。画面は補助、出力原本hash必須。
全項目の実操作Evidenceが揃うまで実Jw_cad/Open/edit/save/round-tripはUNMEASURED。人の「開けた」だけで全項目PASSにしない。

## 8. Round-trip Evidence仕様案

request: instruction_id、expected branch/head、source hash、implementation immutable HEAD、IR version/hash、QA oracle version/hash、Golden manifest version/hash、policy/tolerance version/authority。
static: inventory全件/分母、source native coordinates、transform chain、layout/real unit scope、unsupported ledger、DXF file hash/header/entity counts/content。
app: OS/version/app name/version/settings、operator、日時、checklist item毎status/evidence hash、スクリーンショット、操作記録、before/after file hash。
compare: stable source bindings、output mapping、intentional edit manifest、未編集/編集別numeric diff、text codepoint diff、color/layer/entity変更、round-trip loss ledger。
verdict: PASS/FAIL/BLOCKED/NOT_RUN/UNMEASUREDをscope別に記録。human_gate.required/approval_evidence、limitations、next_actionを残す。空evidenceをPASS扱いしない。

## 9. 保護と回帰

今回のcommitはG docs追加だけで、006 subtreeと全production source/test/signing blobはparentから不変をtree差分で確認する。既存testは削除せずskip追加なし。
後続B統合時は対象HEADに拘束して006 pin、permanent signing gradle/policy/workflows、android/web同期、旧test inventoryを比較する。秘密取得やAPK再生成はQA目的だけで自動実行しない。
対象既存tests: tests/engine-001-regression.test.mjs、input-001-regression.test.mjs、output-race-regression.test.mjs（OUTPUT-001 / EXPORT_OWNER_RACE）、candidate-preview-regression.test.mjs、photo-pptx関連、core/native/storage/command/historyとsourceBinding/candidateCanvas/referenceImageTransform/save reload。
正確なtest名・存在・実行範囲はGitHub tree/既存regression runner manifestを正式分母にする。今回55 suite既存PASSは再利用したEvidenceであり、新経路合格として加算しない。
SAVE-001はCLOSEDを維持し同じ実機確認を再要求しない。契約を変更した別scopeの操作検証は総括が影響を判定する。

## 10. 次の1作業単位とBLOCKER

次: Aのversion/hash固定とBの独立候補仕様を受領後、G専用のNative/Generic小規模Golden inventory・独立EMU→mm oracle・loss accounting manifestを凍結する。制作runtime実装や製品統合は含めない。
現在BLOCKER: IR schema/hash PROVISIONAL、native inventory/group/text loss対策とmm DXF未実装、epsilon/tolerance未確定、実Jw_cad環境/Evidenceなし、実PPTX編集/再保存Evidenceなし。
初回計画保存は既存authorization scope内。製品採用/phase progressionはHOLD、Human最終判断を代理しない。
