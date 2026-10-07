# Track C / PDF → Jw_cad 初回監査 V1

instruction_id: VDRAW-4ROUTE-C-INITIAL-20261007-V1
repository: doudesyoupit-alt/dksc-camera-001-test
branch: work/vdraw-pdf-jwcad-v1
開始HEAD: 9ae8e1b4137cbb4a65f630e2501a94af6cb826ad
source branch HEAD: 6c0facb34757a54ed37d08d94505129b0341ad66
確認日: 2026-10-07 JST
状態: AUDIT_COMPLETE / IMPLEMENTATION_NOT_RUN / PHASE2_HOLD

## Scope / 現在地
初回は読取り監査と設計・試験計画だけ。製品コード、shared、Android、006、署名、保存、main、validation、release、既存tests/Goldenを変更していない。新テスト・実PDF変換・実Jw_cad・OCR・AI・APK生成は実行していない。本文は実装PASS、Jw_cad互換PASS、実精度の証拠ではない。

自branch HEADはGitHub refでexpected HEADに一致。総括manifestのTrack C expected_headも同値。総括branchの観測HEADは615ec928dc880e1fbbec6f1c2702ed5c8c253476。architecture baseline commitは9ae8e1b4137cbb4a65f630e2501a94af6cb826ad。IR契約はPROVISIONAL。phase1 PPTX routeの正式採用を優先し、Track Cがphase2へ先行採用されることはない。

## Read Evidence
pathはprototype/vdraw-mobile-007/を基点に表す。hashはGit blob SHA、SHA256とは区別する。

| Source | Git blob SHA / Evidence | 読取り結果 |
|---|---|---|
| docs/architecture/dispatch/TRACK-C-INITIAL-V1.md | aa577ee446be227e50871b3b741516e3e663c28c | 初回audit only、ownership C docsのみ |
| docs/architecture/BASELINE-V1.md | b17e4b99d6445c035d2fa7e4cbaf50a24c3aaab0 | 4 Route、既存保護、phase order |
| docs/architecture/DRAWING-IR-INITIAL-CONTRACT-V1.md | d712b439a119ac9fe17ed4fa69b67589fc84839c | PDF native unit/frame、LAYOUT/REAL_WORLD分離 |
| docs/architecture/dispatch/DISPATCH-MANIFEST.json | 0cb2f44b4fa93da9d57a9d59979153489d92a2dd | 総括ref再取得、Track C expected HEAD一致 |
| web/src/importers.js | 33fe27ec3d1f33647967892d386b2c7148b7b84c | GitHub baseline読取り。PDF分岐L10–15 |
| web/src/exporters.js | 7e50082bc18da5c6167709f7c6f699cc44b7f591 | L49–65 DXF、L77 raster PDF output。今回は新PDF CAD pathとの整合監査のみ |
| web/vendor/pdf.mjs | 18ef923aca905c9897db648c146923ea2630f206 | GitHub全文読取り。PDF.js 5.6.205 / ada343803 |
| web/vendor/pdf.worker.mjs | 049a23c3e6d54fd17cb5844d8da3834d4944dd2a | tree blob存在確認のみ。GitHub contents全文・rangeが空応答。本文未監査 |
| tests/input-001-regression.test.mjs | 3fc3becef762ee123e269c82db7a7dd5702be029 | candidate frame/sourceBinding/save-reloadの既存合成契約。今回再実行なし、PDF CAD検証ではない |
| docs/photo-accuracy/save001-device-acceptance.json | 7d34cb942dd7c16a66b2a1a6d68a0c90ae5a866c | SAVE-001 CLOSED / 0.8.2 Human SAF受入、再質問不要 |
| docs/photo-accuracy/INTEGRATION-STATUS.json | 43df36a7df1ddfeccc40623bd7ad5a85ae31507c | PHOTO-PPTX-001 CLOSED、署名維持、実写真accuracy未測定 |
| docs/photo-accuracy/next-photo-defects.json | bcff59e29ceb9c4968e7a6d6f9ae694a7207b3b0 | PHOTO-PPTX-001 CLOSED_INDEPENDENT_QA_PASS |
| docs/photo-accuracy/next-phase-independent-qa.json | 96a204fd5f8a783f5c7fe89fb934ddc768c97201 | 歴史的limited QA。古いCI_PENDINGはbaselineの最新exact-commit CIより優先しない |

保護Evidenceは総括baselineのexact source CI run37416413246、55 suite PASS / FAIL0 / BLOCKED0 / skip0、006 subtree47cabdf70e9aebf7c64a1e028e85c476df32a169を既存Evidenceとして参照する。55はsuite数。新PDF routeの試験を実行した証拠ではない。固定証明書はSAVE受入JSONの186ad92e96316b7a2a247c092fd3d83a94fa7a89ea406859a93b057c329a2d8dを参照し、秘密値は取得しない。

## 現行Capability / Gap
| 項目 | 現行実装で確認できたもの | 新CAD routeに不足 |
|---|---|---|
| source original | importFile L7でoriginal data URL保持。page sourceはL14 original:null | root sourceへの明示link/hash/sourceBinding。既定JSON exportはoriginalを省略するため解析可能性を再評価 |
| PDF parser | L10–11 bundled PDF.js、isEvalSupported:false | native operator inventory、精度/対応範囲評価 |
| page count / size | 30MB制約L5、20page制約L12、viewport寸法L13 | native page frame/view/UserUnit/rotationのpersistent Evidence、MediaBox/CropBox個別 |
| reference render | L13 render scale=min(2,1600/max(width,height))、PNG canvas ceil | 画面参照として維持。CAD geometryの根拠にしない |
| native text | L14 text、transform、width、heightのみ | fontName/styles/dir/hasEOL/lang、baseline/rotation/encoding、source item mapping、missing-font |
| vector geometry | L15 warningで編集取込未接続を明示 | path/graphics state/CTM/clip/form/group/native vector採取 |
| scale | raster canvasはpixel y-down | source native→LAYOUT_MM transform、校正Evidence。layout mmと現場mmの分離 |
| classification | ext pdfのみ、Vector/Raster分類なし | page/region Vector/Raster/Mixed/UNKNOWN、空page理由 |
| DXF | exporter L53 INSUNITS=0、L56以降Editor elementsのみ | PDF native objects→共通IR→B所有mm DXF。新CAD loss ledger |
| dimension / semantic | native stringのみ | Generic PDF文字を寸法/設備へ勝手に意味付けしない |

注: VDRAW自身の現行PDF export (exporters L77) は全page PNGを埋める説明用raster。そこへnative vector/textが復元できると期待してはならない。逆方向で真のVector PDFを先にPNG化することも禁止。

## Bundled PDF.js 再利用とバージョン依存
確認Source: web/vendor/pdf.mjs。
- L15026–15084 PDFPageProxyのrotate、userUnit、view、getViewport。viewは利用できるがMediaBoxとCropBoxを個別に返すpublic getterはこの確認範囲にない。raw dictionaryが読めると推測しない。
- L1217–1299 PageViewport: scale *= userUnit、rotation 0/90/180/270、y反転、offset、viewBox、transformを扱う。rawDimsはviewBox差分・origin。変換計算の再利用候補だがreference render用scaleをCAD実寸へ流用しない。
- L15236–15268 getOperatorList: fnArray/argsArray/lastChunk/separateAnnots。呼出しintentとannotationModeをinventoryに固定する。
- L15269–15302 streamTextContent/getTextContent: itemsとstyles/langを返す。現行importerが保持していない属性もそのままnative Evidenceに保存する計画。
- L237–335 OPS: graphics state、path、text、form、group、image/mask、optional/marked contentなど。OPS番号はbundle pinに拘束し、別versionへ暗黙互換扱いしない。
- L1812–1839 makePathFromDrawOPS: packed pathのmoveTo/lineTo/cubic/quadratic/close。円/楕円は元PDFでBezier曲線になり得るため、circleへ推測昇格しない。curve対応が未実装ならraw pathを保存しUNSUPPORTED。
- L11355–11372 constructPath: data[0]のpacked pathをPath2Dへ置換する。**同じpage proxyでrender済みoperator listを後から解析するとraw path coordinatesが失われる可能性がある。** getOperatorList後render前にraw numeric operator snapshotを確保するか、CAD解析と参照renderのdocument/proxyを隔離する設計が必要。今回実PDFで再現していないためrisk finding。
- L12012–12038 FormXObjectはmatrix/BBox clipとsave/restore。bboxを図形そのものにしてはならない。
- L11149以降 setGState: alpha/blend/SMask等。unsupported graphics stateが形状の見え方に影響する場合は当該scopeをHUMAN_CHECK_REQUIREDにする。
- L11463以降 rawFillPath/clip、L14969以降optionalContentConfig、L26777 exportsも確認。
- operatorListは最適化された描画命令。original PDFのobject reference/stream offsetと一対一とは限らない。page+operator index+form scope+source hashをderived bindingと明記し、native original object IDを捏造しない。
- workerはfile存在/hashのみ確認。今回のconnector空応答は本文監査の取得制約であり、既存workerやPDF.jsの能力欠如とは判定しない。Parser normalization、MediaBox/CropBox継承・intersection、警告やunsupportedの前処理欠落を本文で確認できていない。operator countだけで「原PDF全object silent loss0」を保証しない。

既存pdf-lib.min.jsはtreeで存在する。MediaBox/CropBox等のraw metadata読取りへの再利用候補だが、今回そのAPI/backendは未監査。PDF.js private _pageInfoへ直接依存する案は採用しない。

## Proposed boundary / 共通IR依存
将来は新規 web/src/routes/pdf/ に孤立実装する。既存importers.js/exporters.jsには初回patchを出さない。
1. source-reader: immutable original bytes/hashと各pageを確保。raw unreadable/encrypted/malformed/resource limitはBLOCKED。
2. inventory/frame: native page/region inventory、public rotate/userUnit/view、operator snapshot、full text Evidence。MediaBox/CropBox原値を取得できない時はmissing Evidenceを明示。
3. native-decoder: save/restoreとCTM、Form、paint/path/text/visibilityをdecode。recognized countとunknown scopeを照合。
4. classifier: raw EvidenceでVector/Raster/Mixed/UNKNOWNを判定。判定不能をRasterへ落とさない。
5. IR adapter: Track Aのversion/hash確定後、source frame→drawing frame。nativeGeometry/sourceBindingを無損失保持。
6. fallback adapter: Raster regionのみTrack D/Eのimage pipelineへ連携。scale/quality/OCR未接続はUNKNOWN/BLOCKED。
7. export: Track B所有mm DXF backendへ接続。Engine UI/save contract変更はCoordinator別統合scope。

Aへ必要な確定事項: PDF page raw unitとpt/UserUnitの区別、native curveのUNSUPPORTED保管、text baseline/fontMissing、effective clip/visibilityのpolicy、LAYOUT_MMとREAL_WORLD_MM、page/region型、operator derived sourceBinding、scope付loss ledger、empty page outcome、unknown source schema/versionのfail-closed。

Bとの契約: mm DXFはLAYOUT_MM exportとREAL_WORLD_MM exportを区別。IR UNSCALEDでもlayout mmは可能、現場実寸出力要求は根拠不足でBLOCKED。line/polyline/textとstyle支援をBから得る。未対応curve/clipの処理をCが独自IRで迂回しない。

## Vector/Raster/Mixed/UNKNOWN分類案 (PROVISIONAL)
| class | 判定Evidence | native/fallback policy |
|---|---|---|
| Vector | visible native drawable paths/textを取得し、meaningful raster regionが無い | native path/text直接処理、全page raster再認識禁止 |
| Raster | visible meaningful image regions、native geometry/textなし、unsupported/hidden/invisibleの未解決なし | image region+CTMを保持、quality→geometry/OCR。mm実寸推測なし |
| Mixed | visible native paths/textとmeaningful rasterを併存 | vectorはnative保持、Raster regionだけfallback、region関係保持 |
| UNKNOWN | unreadable/unsupported/reconciliation不足、visibility/clip不明、hidden OCRのみ等 | HUMAN_CHECK_REQUIRED/BLOCKED。便宜的Raster化しない |

全文OCR層付きscanは単純にVectorにはしない。text rendering mode3等の不可視文字、OCG、clip、alpha、font-outlineを区別。class MIXEDはcontent encodingの併存、semantic truthを保証しない。空pageはUNKNOWN＋reason EMPTY_PAGEを記録し、画像なし=Vectorという分岐を避ける。文書分類はpage別結果を保持し単一classだけで情報を捨てない。小さなlogo画像があるVector住宅図面はnative geometryを維持し、logo raster regionを明示する。

OCRはRaster region内で文字が必要・native textが不足/encoding unusableの場合だけ。既存native textが可読なVector PDFには不要。OCR推測値はEvidence source/method/confidence null許容/statusを伴いHumanへ返す。数字や「1000」をdimension/calibrationへ自動昇格しない。

## Unit / Frame
- native coordinatesをPDF source frameとして保持し、数値を画像sizeへ正規化しない。
- UserUnitは1 native unitあたりUserUnit × 25.4/72 mm。PageViewportが既にUserUnitを適用するので二重掛け禁止。
- viewBox origin、Crop/Media raw boxes、page rotation、y axis、CTM、Form transform、clipを別段階で記録。
- source→LAYOUT_MM transform、Editor preview、reference PNGへtransform、CAD y-up transformを分離する。矩形回転後のbboxでは端点/パスを再生成しない。
- 曲線のflattenを将来許す場合もdeterministic tolerance、適用座標/unit、nativeCurve、error boundを残しLOSS/approximationとして表示。現時点でloss0 PASSにしない。
- 全pageのCAD配置offsetはlayout明示Evidenceに残し、現行exporterのcanvas幅+100を物理寸法offsetへ流用しない。
- REAL_WORLD_MM校正は別Evidence/scope確認。PDF縮尺ラベル・dimension文字は検証なしにauthorityにしない。

## Operator / Object Loss Ledger
page原本hash、parser version、intent/annotation/OCG policy、operator index/type/raw args、state/CTM/clip/form scope、native bbox、decoded object ids、IR/export ids/count、status/disposition、理由、nextHumanActionを保存する。画像、OCR text、visible native text、path、container/state、annotationは別分母で集計する。

SUPPORTED_EXPORTED / UNSUPPORTED / REJECTED / HUMAN_CHECK_REQUIRED / policyで明示非出力のinventoryを保持。透明/非表示/clip除外も黙って消さない。fnArrayとargsArray count一致、decode disposition全index被覆、drawable/object count照合を必須とする。ただしそれは**PDF.jsで観測できたoperator集合の範囲**。原本全operator conservationはworker前処理の監査とraw EvidenceなしでPASSにしない。

曲線、shading、pattern、clip、alpha/SMask、Type3字体、unknown form/annotation、unsupported operator、image maskはnative scopeごとに問題を記録。依存stateが分からない後続paintも隔離し、黙ってdefault styleに補正しない。unsupportedが残るpartial exportは部分出力と明示できるがFULL PASS不可。

## Golden / Test Plan (未実行)
| fixture群 | meaningful assertion / 負例 |
|---|---|
| Vector住宅図面・電気図面 | native line/text、geometryと数・bbox、source hash/page/operator binding。PNG認識経由0 |
| Source-native unit/frame | nonzero origin、UserUnit1/2、Crop≠Media、rotation0/90/180/270、ctm、Form nested。known point→layout mm→inverse比較 |
| Paths | line/rect/closed polygon、cubic/quad curve、fill+stroke、dash、zero length、negative direction。unsupported原データ保持 |
| Text | 日本語・縦書き・font fallback/missing・Unicode/glyph mapping・rotation・baseline・multiline・invisible OCR。可視と抽出を分離 |
| Raster/Mixed | scan-only、scan+hidden OCR、Vector+logo、native geometry+raster region、empty。分類Evidenceとfallback region限定 |
| Graphic-state loss | clipping/even-odd、OCG hidden、alpha、SMask、pattern、unknown op、Form BBox。loss ledgerに理由・count、FULL PASS拒否 |
| Render mutation | getOperatorList前/後renderでraw packed coordinatesが保存されること。Path2D-only input拒否、CAD parse reference render隔離 |
| Bad PDF/resource | corrupt/encrypted/unreadable、page limit/file limit、nonfinite/singular frame。Fail-closed、既存doc無変異 |
| Persistence/adapters | original omission時CAD再解析不可の明示、native fields/sourceBinding保存復元、既存INPUT-001 contract保持 |
| DXF/Jw_cad | mm header/geometry/text/color/layer audit、実Open/選択/編集/保存、再export→座標/寸法比較。Gが独立判定 |

最初の検証はoperator snapshotとframe読取りを中心に小さい原本Goldensを凍結する。synthetic known valuesは変換契約を評価し、実PDFの編集精度へ加算しない。実Jw_cadはNOT_RUN。既存PDF原本を新規収集するscopeやモデル推論scopeへ無断拡大しない。

## Observed BLOCKER / 次の1単位
1. A共通IRがPROVISIONAL、unitRole/curve/page-scope/binding型未凍結。
2. 現行PDF sourceにnative path/frame persistent contractが無い。新CAD parser/runtime未実装。
3. worker本文はGitHub内容APIが空のため未監査。PDF.js normalized operator lossとraw Media/Crop継承を保証できない。
4. renderがraw packed pathをPath2Dへ変換するriskを実PDFで未検証。
5. Vector/Raster/Mixed原本Golden、独立mm DXF・実Jw_cadEvidenceがこのTrackには無い。

次の1単位: 後続Dispatchが許可した場合に限り、新規routes/pdfの**read-only native inventory/frame extractor PoC**を孤立作成する。operator snapshotをrender前に保持し、userUnit/rotate/view/full textと未知operator ledgerを取得するところまで。IR接続・Geometry推測・OCR・DXF・製品統合は含めない。worker本文取得/正確なMediaBox/CropBoxの方法をEvidence化し、取得不可ならUNKNOWNを保持。phase2採用はphase1受入後、G実Jw_cad検証後にCoordinatorが判断する。
