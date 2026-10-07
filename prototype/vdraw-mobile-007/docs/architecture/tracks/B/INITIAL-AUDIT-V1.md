# Track B 初回監査 / PPTX → Jw_cad V1

[WORK_HANDOFF_V1]
instruction_id: VDRAW-4ROUTE-B-INITIAL-20261007-V1
branch: work/vdraw-pptx-jwcad-v1
expected_base_head: 9ae8e1b4137cbb4a65f630e2501a94af6cb826ad
source_head: 6c0facb34757a54ed37d08d94505129b0341ad66
状態: INITIAL_AUDIT_COMPLETE / IMPLEMENTATION_NOT_STARTED / PHASE1_HOLD
確認日: 2026-10-07 JST

## 1. 確認基準とEvidence

GitHub branch APIで専用branch HEADがexpected_base_headと一致することを確認。
開発branchのHEADは6c0facb34757a54ed37d08d94505129b0341ad66、安定releaseは15bf3371bec3f7d1e4090e7198a850c5636baf3fのまま。
総括branchのdispatch/DISPATCH-MANIFEST.jsonはTrack Bのexpected_headを9ae8e1b4137cbb4a65f630e2501a94af6cb826ad、scopeを監査/契約/試験計画だけと指定。今回はこのscopeを守る。

以下のpathは全てprototype/vdraw-mobile-007/をprefixとする。

| Evidence | Git blob SHA / 内容 |
|---|---|
| docs/architecture/dispatch/TRACK-B-INITIAL-V1.md | 685182e6edcb385fb4c162968560d258a861911e |
| docs/architecture/dispatch/DISPATCH-MANIFEST.json | 0cb2f44b4fa93da9d57a9d59979153489d92a2dd |
| docs/architecture/BASELINE-V1.md | b17e4b99d6445c035d2fa7e4cbaf50a24c3aaab0 |
| docs/architecture/DRAWING-IR-INITIAL-CONTRACT-V1.md | d712b439a119ac9fe17ed4fa69b67589fc84839c / PROVISIONAL |
| docs/architecture/PHASE1-ACCEPTANCE-V1.md | 81592ff278ef178bb8c9481f4e04ec7bfbb5b483 / PLAN_ONLY |
| web/src/importers.js | 33fe27ec3d1f33647967892d386b2c7148b7b84c |
| web/src/exporters.js | 7e50082bc18da5c6167709f7c6f699cc44b7f591 |
| web/src/core.js | 396deedd7062f2ceb89bc20bc3e850132ab2f194 |
| docs/photo-accuracy/INTEGRATION-STATUS.json | 43df36a7df1ddfeccc40623bd7ad5a85ae31507c |
| docs/photo-accuracy/save001-device-acceptance.json | 7d34cb942dd7c16a66b2a1a6d68a0c90ae5a866c / Human CLOSED |
| docs/photo-accuracy/next-photo-defects.json | bcff59e29ceb9c4968e7a6d6f9ae694a7207b3b0 / PHOTO-PPTX-001 CLOSED_INDEPENDENT_QA_PASS |

GitHubから3つのsource fileを再取得し、ローカルbaselineのGit blob SHA一致を確認した。以下の行番号は当該固定HEADのsourceに対応。
Git tree 809fc6bec31125ce3ca678124db4f3da9b341021をrecursiveで再取得し、006 subtree=47cabdf70e9aebf7c64a1e028e85c476df32a169を確認（truncated=false）。
GitHub Actions run 37416413246はhead_sha=開発HEAD、completed/successを再取得。55 suite PASS / FAIL 0 / BLOCKED 0 / skip 0の集計は総括BASELINEから参照し、このTrackで再実行・再集計していない。
SAVE-001は既存Human実機受入、固定証明書SHA256は186ad92e96316b7a2a247c092fd3d83a94fa7a89ea406859a93b057c329a2d8d。秘密値にはアクセスしていない。
Site Photo 10枚と既存Photo成果は変更せず、Photo実認識精度はNOT_MEASUREDのまま。Phase1の前提にAI Providerを追加しない。

## 2. 既存能力と欠落

| 対象 / source箇所 | 読取りで確認した既存能力 | Phase1に必要な差分 |
|---|---|---|
| importers.js importFile:7-8,17-22 | 原PPTXのdata URL保持、JSZip/XML利用、presentation relationships順でslideを列挙 | SHA256/sourceAsset binding、part/object単位inventory、relationship欠落をfilterで隠さない。slide size欠落を既定値で確定しない |
| importers.js:19,23-25 | sldSz cx/cy取得、aspectを保持した1200幅canvasへ換算 | 変換前EMU/off/ext/path値を保持。Editor display frameとLAYOUT_MM frameを分離し、transform factorを明示 |
| importers.js:24 | spのrot/flipをunsupported件数に加算 | rotation/flipの値とobject id/pathをledgerへ保存し、対応後は親子matrixとendpointへ適用。0/90/負角/359を検証 |
| importers.js:24,27,32 | descendant検索all(x,'sp')とgroup数warning | group子spが親group transformなしで取り込まれる可能性をsource inspectionで確認。直接子走査で階層inventoryを作る。grpSpのoff/ext/chOff/chExtを別frameとして保持 |
| importers.js:26,28 | a:tを抽出、font/colorを一部取得、editable textを生成 | 各runを改行joinするため同一paragraphのrun分割で文字内容を変える。paragraph/br/runを区別し、baseline/anchor/bodyPr/font/theme/rotationも保持 |
| importers.js:28-31 | textまたはshapeの択一処理 | textを持つrect等ではtextだけ取り込みshape geometryが欠落。1 source shapeからgeometry+textの複数IR/output idsを対応付ける |
| importers.js:29-31 | rect/ellipse/line、単一閉custGeom polygonを限定取込 | open polyline、circle識別、custom path command順序、複数subpath、arc/cubic/quadraticを明示分類。unsupported commandを未検査のまま線へ flattenしない |
| importers.js:24,32 | sp/pic/graphicFrame/grpSpを処理/集計 | p:cxnSpはsp走査にも末尾unsupported集計にも含まれずsilent loss候補。spTree直接子を未知tagまで総数照合し、connector/ole/alternate content/hiddenを漏らさない |
| importers.js:26,28,31 | direct srgbClrと一部stroke/fillを取得 | theme/master/layout inheritance、scheme color/alpha/dash、missing fontの未対応をledgerへ。既定色を原色の確定Evidenceにしない |
| exporters.js pptx:27-47 | 12×8 inch slide、native editable sp/text、polygon/arc custom geometry、写真contain | 出力author/subject/objectName/notesのみでは校正semanticの証拠にならない。現行generatorに検証可能なIR/schema/hash metadata出力を確認できない |
| exporters.js dxf:49-65 | LINE/LWPOLYLINE/CIRCLE/ELLIPSE/ARC/TEXT/MTEXT、layer/truecolor、y反転 | canvas座標、INSUNITS=0、page offset=canvas width+100。LAYOUT_MM/CALIBRATED実寸frameとunit evidenceを持つ新backendが必要 |
| exporters.js dxf:51,58-60 | 非ASCIIをUnicode escape、改行TEXT/MTEXT | 日本語/サロゲート/改行/font/anchor/Jw_cad再保存を実appで確認。escape書込みだけでJw互換PASS不可 |
| core.js:5,15-23,25-44 | 旧vdraw-mobile/1契約、rect/ellipse/line/polygon/text/dimension/arc、保存用validation | rotation/group/polyline/native EMUの共通IRは別schemaで保持。core schemaを改変しない。旧Editorへ表現不能なobjectをdropするadapterは禁止 |

上表の欠落はコードの読取り所見であり、生成fixtureによる不具合再現PASS/FAILではない。
現行warningの「件数以上」は個別objectのloss ledgerとは異なる。container、leaf、text run、drawable、backgroundを混在させず分母を固定する。
既存原PPTX保持は原本Evidenceの再利用候補であり、正しいgeometryの抽出・Jw_cad受入を証明しない。

## 3. Native / Generic と単位

VDRAW生成PPTXは出自を示すケースとして分離する。ただしauthor='VDRAW'、subject、objectName、寸法labelは改変可能であり、schema/origin/hash検証の代用にしない。
現行exporterに校正を機械検証できるsemantic metadataは確認できないため、当面Native候補もgeometry/text抽出はGenericと同じ安全契約を適用する。
Genericの文字「1000」や矢印線を寸法・配管・設備へ昇格しない。category/semanticColorはUNKNOWNを許容。

IR初期契約に従い1 mm=36000 EMU。slide紙面のmm変換はLAYOUT_MMであり現場寸法ではない。
UNSCALEDでも紙面mm DXFという明示出力は設計可能。REAL_WORLD_MM exportを要求された場合、適用scope付き校正Evidenceが不足すればBLOCKED。
Native由来の対象限定dimension metadataを将来利用するときも、ページ全体へscaleを推測適用しない。
EMU→layout-mm、親group/子group/shape transform、CAD y-up、slide配置は独立した変換としてsourceBinding/provenance/orderを残す。
bboxだけをline endpointの代用にしない。反転、負方向線、non-uniform scalingを保持する。円が楕円へ変化すれば適切なprimitiveへ変換する。

## 4. Component境界 / 再利用方針

Ownershipは将来routes/pptx/、今回はdocs/architecture/tracks/B/のみ。
共通drawing-ir/schema/unit/transform規約はA。route内で新しい最終IRを独自定義しない。
PPTX-specific native extraction recordは原本inventoryとして局所保持できるが、IR adapterの契約状態はPROVISIONAL、A確定schema version/hashへ接続するまで正式IR PASS不可。

次段で想定する分離:
1. package-reader: ZIP/relationships/slide part解決、bounded byte/object/page制限、source hash。
2. native-inventory: source shape/containerを漏れなく列挙、EMU原値、source path/object id、object-role、supported disposition、issues。
3. geometry-resolver: preset/custom geometry、group/rotation/flipのtransform。native値を上書きしない。
4. text/style-resolver: content/run/paragraphとtheme/font/anchor情報。未解決はissueを返す。
5. ir-adapter: Aのschema/version/hashに拘束。native inventoryをsourceBindingとlossLedgerへ接続。
6. mm-dxf-emitter: valid IRとexport frameだけを受け、LAYOUT/REAL_WORLDのscopeを分離。Gとのcompatibility profile確認後にentity encodingを固定。

既存JSZip/DOMParser利用、presentation順序解決、原本保持、PPTX native shape出力、DXF entity配置の考え方は再利用候補。
ただしimporters/exportersを直接書き換えたり、このauditでfunctionを移動したりしない。
旧DXFはunitless contractとして維持する。既存tests/output-structure-005.pyはINSUNITS=0をassertしており、新mm backendに置換すると既存Contractを壊す。
将来新CAD routeのentry pointを追加するときはCoordinatorの別integration scopeで接続し、web/Android assets parity、EXPORT_OWNER_RACE、保存所有権を守る。
DXF backendをC/Dにも利用させる共通componentの配置はCoordinator/Aと決定する。Bだけで共有所有権を確定しない。

## 5. Unsupported / Fail-closed

入力native object/pathはすべてinventoryへ残す。未知XML tag、missing relationship、missing/nonfinite coordinate、特異matrix、異常group extent、unsupported shape/path、未解決theme/text inheritanceを理由別issueにする。
unsupported自体を削除せずsourceBindingとnextHumanActionを保持。full export readinessはHOLD/BLOCKED。ユーザーがpartial出力を選べる契約の詳細はA/Coordinatorに確認する。
containerとdrawableを別分母とし、shape+textは1入力→複数出力対応で照合。非表示/背景/masterもpolicy付きinventoryに含める。
source hash、slide path、cNvPr id、part内XML pathを組み合わせ、name重複・id衝突を区別する。人が付けたobjectNameだけに依存しない。
malformed/missing native geometryを1200×800、黒、既定位置、scale推測で補正しない。unknownと未測定を0/1の成功率へ変換しない。

## 6. Golden / meaningful test計画（未作成・未実施）

| Family | 原本と期待値の固定内容 | 主な測定 |
|---|---|---|
| B-G01 Native basic | VDRAW出力、元Editor JSON、PPTX hash、EMU geometry、生成version | 対応supported objectのinventory、shape+text、metadata非権威化 |
| B-G02 Generic basic | 外部作成app/version、直線縦横斜め負方向、rect/circle/ellipse/open polyline/polygon | endpoint/vertex/primitive/position/size/angle、semantic UNKNOWN |
| B-G03 Text | 日本語、ASCII、複数run同paragraph、a:br、複数paragraph、空文字、font | text内容/改行/run、baseline/anchor、高さ、文字化け |
| B-G04 Transform | 正負rotation、90/359、flipH/V、basic/nested group、chOff/chExt、nonuniform scale | 独立計算matrixとround-trip inverse、親子座標、circle→ellipse |
| B-G05 Style | RGB/theme/master/layout、opacity/dash、hidden、text付き塗図形 | missing style issue、意味色UNKNOWN、drawing count保存 |
| B-G06 Inventory loss | connector、image、chart/table、SmartArt、複雑path、alternate content、unknown tag | 全inventory分母固定、silent loss=0、supported/unsupported/container分離 |
| B-G07 Package limits | 欠落part/relationship、duplicate ids、異常ZIP展開量、missing size、特異group | atomic fail-closed、理由/source path、原本無変更 |
| B-G08 Page units | 非標準slide size、portrait、multi-slide、negative offsets、outside slide | EMU保持、layout mm、明示page offset、実寸への誤昇格0 |
| B-G09 DXF profiles | mm header/entity/layer/color、TEXT/MTEXT、ellipse/arc、日本語 | parser static auditは限定scope。Jw_cad互換はG実appが別判定 |
| B-G10 Jw round-trip | app/version/OS、before/after hash、選択/文字変更/保存、screenshots | line/text editable、非ラスタ、保存、意図的編集以外の座標差 |

Goldenは原本SHA256、作成app/version、slide/object ledger、expected native geometry、supported集合、unsupported集合、検証者を固定する。
生成処理をoracleにせず、Gが原OOXMLから独立計算する。fixture成功を実務精度100%に換算しない。
epsilonはPHASE1-ACCEPTANCE-V1.mdの提案値のまま。Jw round-trip許容差、日本語font/encoding、entity support、truecolor/layer対応はG実app測定とHuman確認後に固定。
Jw環境が無ければDEVICE_JWCAD_EVIDENCE_REQUIRED。DXF parserや画面表示だけではOpen/edit/save/round-tripをPASSにしない。

## 7. 既存試験Evidence / 未実施区分

再取得した既存testのGit blob:
- tests/input-001-regression.test.mjs = 3fc3becef762ee123e269c82db7a7dd5702be029
- tests/output-quality-005.mjs = f5fc569a7d8c8d761d8a6d04c4f7307476565092
- tests/output-structure-005.py = dc8c6e3121bb93b0d75066fa27a5b2bcefdac199
- tests/output-regression.mjs = 0f2fe415bb5bba5ceebd4e4b0dfcc121f1416555
- tests/photo-pptx-contain.test.mjs = ff542395e4b3ab345f9093167154bf0fe9e8a690

input testはsourceBinding/coordinateSpace/candidate frame/contain/save-reload保護。output structure testはsupported CORE entityとnative spを検査し、Jw_cad/MicrosoftPowerPointをNOT_RUNと明示。photo contain testはsynthetic placement保護。
このTrackでは実装なし、新testなし、fixture生成なし、全回帰再実行なし。今回の読取り/hash照合は製品精度試験ではない。
Phase1新規PASS=0を達成率として表示しない。状態はNOT_RUN / UNMEASUREDで保持。

## 8. IR依存 / Blocker / 次の1実装単位

Observed blockers:
- IR schema/version/hashがPROVISIONAL。B/C/D/F共通接続は確定待ち。
- native inventoryとper-object loss ledger、EMU/group/text保持が未実装。
- 専用mm DXF backendが未実装。旧backendはunitlessである。
- 実Jw_cadの読み込み・編集・保存・round-trip Evidenceは未取得。日本語/entity/unit対応はUNMEASURED。
- Phase1受入の正式toleranceは未確定。

次の単一bounded unit提案:
B-IMPL-001: 新規routes/pptx/にnative OOXML inventory readerを孤立実装する。
入力はPPTX bytes、出力はPROVISIONALなnative inventory/Evidenceのみ。slide/path/object/container/drawableの全数、原EMU/off/ext/chOff/chExt/rot/flip、text paragraph/run、source hash/path/idと理由付きunsupported ledgerを保持する。
fixtureはbasic、connector、group、text+shape、missing relationshipを最小組で固定し、欠落検出/原値保持/atomic fail-closedを測定する。
まだDXF、Editor/UI、既存importers/exporters、Android asset、IR最終adapter、製品統合を接続しない。
共通IR確定前でもinventoryは監査資料として実装可能。最終IR接続の前にA version/hashレビューを必須とする。
この提案の実装開始はCoordinatorの後続Dispatchを待つ。今回Human追加承認は不要なdocs-only scope。製品採用はHOLD、Humanの最終判断を代行しない。
