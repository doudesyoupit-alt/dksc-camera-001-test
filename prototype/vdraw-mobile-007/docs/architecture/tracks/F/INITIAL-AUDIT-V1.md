# Track F — Field Photo → Editable PPTX 初回監査 V1

instruction_id: VDRAW-4ROUTE-F-INITIAL-20261007-V1  
確認日: 2026-10-07 JST  
branch: work/vdraw-photo-editable-pptx-v2  
開始HEAD: 9ae8e1b4137cbb4a65f630e2501a94af6cb826ad  
source HEAD: 6c0facb34757a54ed37d08d94505129b0341ad66  
Architecture baseline: 9ae8e1b4137cbb4a65f630e2501a94af6cb826ad  
判定: AUDIT_COMPLETE_PLAN_ONLY / Phase5製品採用HOLD。

## 1. Gateと監査範囲

GitHubから専用branchとsource branchの最新HEADを再取得し、expected HEAD・dispatch manifestと一致を確認した。baseline docs、初期IR、既存Evidenceを再取得した。
今回はdocs/architecture/tracks/F/配下の監査・引継ぎだけを保存する。製品コード、provider推論、画像再収集、Golden編集、APK、製品統合を実行しない。
IRはTrack Aの正式version/hash確定前のPROVISIONAL。Quality契約はTrack Eの確定前のPROVISIONAL。Fは独自IRを定義しない。
Phase1（PPTX→実Jw_cad）PASS前にPhase5を正式採用しない。実Jw_cad環境/Evidence不足はPhase1の総括Gateであり、Photo providerの不足をPhase1依存へ追加しない。

## 2. 確認できた能力と欠落

行番号はsource HEADのsnapshot基準。ローカル4 source fileのGit blob hashはGit treeと一致を照合済み。

| 段階 | 再利用候補・根拠 | 確認範囲 | 欠落・限界 |
|---|---|---|---|
| Photo入力 | web/src/importers.js importFile:7–9 | 原本とsanitized PNGを分離、sourceId、取込後canvas | 元画素→EXIF正規化→resize履歴のIR接続未成立。Golden canonical最大1600とproduct sanitize最大2000は同一とみなせない |
| Frame / sourceBinding | web/src/vision.js pngDimensions:13–19、binding:28–34、candidateContract:35–43 | 実PNG寸法、document/page/source/fingerprint照合、named drawing frameとcontain検査 | sourceFingerprintは変更検出用で暗号学的推論証明ではない。original/canonical SHA256、transform chain追加はA contractに従う |
| Runtime候補生成 | web/src/vision.js VisionJobs.draft:59–60、REAL-AI-PATH-STATUS.json | draftはUNCONNECTED→BLOCKED、手動作図経路あり | 製品の写真→構造自動抽出は未接続。独立画像line/circle/perspective/OCR/semantic解析の実精度証明なし |
| 候補受信 | web/src/vision.js receive:61–70 | allowlist、100対象上限、UNSCALED、source対応、validate | 外部executionKindは自己申告。model provenance、stage uncertainty、confidenceを候補へ一貫伝播するIR adapter未成立 |
| 採用 | web/src/vision.js adopt:86–94、convertedElements:52–55 | reviewed、atomic新規page、元図面保持、contain対応uniform変換 | reviewedはOverlay閲覧・GT一致の証明ではない。1200×800の採用pageは表示frameであり全Routeの原本座標ではない |
| Editor | web/src/core.js validKinds:5、newPage:16–17、element:22–23、validate:25–44 | rect/ellipse/line/polygon/text/dimension/arc、既存Undo/Redo基盤 | IR polyline/circle/ellipse orientation/rotation/status/relationshipの完全保持未成立。circleは等幅ellipseに限る。未知primitiveをrect等に黙って変換しない |
| Editable PPTX | web/src/exporters.js pptx:27–48 | native shape/text、polygon/arc custom geometry、独立objectName、任意写真添付 | arbitrary object rotationはrotate:0。arcはarcPointsによる49点近似。誤差ledger・native semantic metadataの完全round-tripは未証明 |
| Photo contain | web/src/exporters.js photoContain:10–25、pptx:30、next-photo-defects.json | PHOTO-PPTX-001=CLOSED_INDEPENDENT_QA_PASS、実PNG寸法でaspect保持 | 修正を再実装しない。実画像に合成登録rectを置いた10例は配置assayであり写真構造抽出の精度ではない |
| Overlay / correction | pipeline-audit.md PHOTO-007/013、PILOT-10-RESULT.md | SVG contain overlayと既存操作記録の潜在基盤 | before/after構造差分、対象別修正量、実作業時間、GT比較が未測定 |
| 保存 / 保護 | save001-device-acceptance.json、BASELINE-V1.md | SAVE-001=CLOSED、固定署名、006 tree pin維持 | 保存成功を画像認識PASSへ読み替えない。原本・候補保存schemaの暗黙移行禁止 |

Photo categoryの細分類（屋根/軒/外壁/基礎/窓/メーター/EV機器/配管等）は既存の粗いclassesだけで検証できない。
屋根・配管に見えるという意味判断と、画像上のline/polygon保持は別に評価する。
Scene graph、multi-view、隠れた構造の補完は初回対象外。見えない接続・裏側・寸法を創作しない。

## 3. 既存Golden資産の保全

正式dataset: vdraw-internet-pilot-20261006-v1。NET-001〜010の10枚をSite Photo Golden候補として維持する。
golden-manifest.jsonはDRAFT。development 6 / validation 2 / blind-holdout 2。全10枚groundTruthStatus=NOT_ANNOTATED、productImporterParity=NOT_PROVEN。
Easy 1 / Normal 4 / Hard 5 / Extreme 0は暫定難易度。blind holdoutはNOT_FROZEN_NO_GROUND_TRUTH。
original/canonical SHA256、source revision、作者、license、sourceEvidence SHA256、split/captureGroup、校正UNSCALEDを変更しない。
Public domain、CC0、CC BY-SA 2.5/3.0/4.0、CC BY 2.0の既存台帳を参照し、再収集・再承認・再ハッシュで置換しない。
manifestのexternalTransferApproved=false / costApproved=falseを維持。今回外部画像送信・費用・自動学習は0。
NET-001の焼込ラベル/赤矢印、NET-006の既補正履歴、NET-008の横向き/透かしをlimitationsとして保全する。焼込ラベルを一般OCR成功やblind認識成功へ換算しない。
原本写真のbinaryはこのWorkでダウンロード・視認・再hashしていない。既存取得とhash/LicenseのEvidenceを再取得した監査であり、現binaryを新規に検証したという主張はしない。

## 4. 新規component境界と再利用方針（計画のみ）

将来所有: routes/photo/。共有web/src/importers.js・vision.js・core.js・exporters.js・render.js、Android assetsは総括統合時のみ変更する。
- Source adapter: immutable original + working/canonical pixels + frame/hash/EXIF/resize transformをTrack A envelopeへ対応させる。Editor表示containを原本geometryに焼き込まない。
- Deterministic geometry stage: contour/line/corner/circle/color boundary/perspective候補をpixelで保持。geometryの存在をsemantic設備の確定にしない。
- Optional semantic adapter: AI利用時も候補/Evidence/uncertaintyの同一契約を通す。クラウド不可でもSource/Geometry/Human Correction/PPTX経路は進行可能な設計にする。
- Structure inventory / exclusion ledger: 必要・不要・不明のobject-level判定を記録。削除の対象・理由・mask境界・覆われる必要構造・復帰方法を保持する。既知の不要物だけの限定非表示をHumanへ提示し、原本と元geometryは保持。
- IR→Editor adapter: 既存vdraw-mobile/1を保ち、sourceBinding/coordinateSpace/candidateCanvas/referenceImageTransformを二重保持。未対応primitiveはissue+HUMAN_CHECK_REQUIRED。unsupportedの消失は許可しない。
- Editable PPTX export adapter: 既存native exporterを再利用。geometry/type/text/style/sourceBinding対応とlossLedgerを照合。写真貼付のみをeditable structures完成にしない。

必要対象: 建物/屋根/軒/外壁/基礎/立上り/窓/ドア/分電盤/メーター/EV充電器/ボックス/ポール/配管/配線/設備。
不要候補: 人物/車/工具/背景/不要植栽/影/一時障害物。ただしカテゴリ一致だけで削除しない。
影・車・植栽のmaskが配管/機器を覆うケースはHUMAN_CHECK_REQUIRED。UNKNOWN/UNCERTAIN/OCCLUDEDを不要へ自動昇格しない。
KNOWNは可視事実と根拠があるscopeだけ。写真pixel→mmはcalibration Evidenceなしで禁止。単一基準寸法を別平面や隠れた3Dへ拡張しない。

## 5. KPIと分母（すべて実評価NOT_MEASURED）

| 指標 | 独立した定義・Evidence | 未測定時 |
|---|---|---|
| 必要対象Recall | 凍結GTの可視必要対象を分母、対応objectと必要構造保持を確認。critical class/画像難易度別も報告 | null。合成登録rect・手動作図を検出TPに計上しない |
| 不要除去Precision | 実際に非表示/除去した候補を分母、凍結GTで不要と確認された対象を分子。必要対象誤除去を別途critical lossとして数える | null。除去0件ならN/A、100%とはしない |
| Geometry Accuracy | 元pixel frameへinverse mappingしてposition/angle/contour/IoU/shapeを比較。category正解と別採点 | null。display transformのPASSを形状正解にしない |
| Overlay | original→canonical→IR→Editor→PPTXの変換鎖、aspectと境界誤差、採用前Human観察Evidence | null。写真表示だけではPASSにしない |
| Human Correction Cost | before/after object diff、add/delete/geometry/text/style/category修正件数、実計時/観察coverage | null。操作未記録を修正0件/0秒へ変換しない |
| Critical loss / False PASS | 必要機器・配線等の重大消失、UNKNOWNの確定昇格、Evidence不足PASS | null。未観察を0へ置換しない |
| Export fidelity | native独立object/text選択・編集・保存・再読込、元IR対応とobject conservation | null。OOXML存在と実Office編集を別判定 |

可視必要対象とOCCLUDED/不可視対象はscopeを分ける。不可視の必要対象は状態保持の評価対象とし、未見領域の推測を検出成功にしない。
Missing canonical、missing result、unsupportedで分母を減らさない。pinned GT/split snapshotがない場合は正式KPI計算を開始しない。
単一の総合成功率へ先に合算しない。品質のretake必要見逃し/不要retakeはTrack Eの分母と整合させる。

## 6. Golden / test計画（今回はNOT_RUN）

1. Source-native adapter contract: 非3:2/portrait/landscape/EXIF/異なるcanonicalサイズでnative画素を保持、containを分離、inverse transformでpixel復元。source/page/hash mismatch・不明transformでfail-closed。
2. Compatibility: 既存INPUT-001/sourceBinding、candidateCanvas/referenceImageTransform、save/reload、adopt atomic、EXPORT_OWNER_RACEの保護。native座標を1200×800で上書きしない。
3. Conservation: required objectとtextのexport対応、unsupported/partial issue、circle/arc/rotation/polylineのEditor境界、非表示ledger。必要構造を影/車/植栽として消す反例。
4. Uncertainty: UNKNOWN/UNCERTAIN/OCCLUDED/LOW_QUALITY/RETAKE_REQUIRED/MEASUREMENT_REQUIRED/HUMAN_CHECK_REQUIREDの保持。semantic/実寸推測禁止。AI confidenceは正解率でない。
5. Human correction: before/afterとsession timingの境界、未計測null、adopt操作と修正を区別。GT未確認や欠損resultで正式分母を縮小しない。
6. Existing ten: 再収集不要。凍結GT/holdout/信頼できるEvidenceが揃った後に既存bytesで評価し、Photo/PPTX・Overlay・機器保持・修正負担を分離する。Phase1前の製品採用なし。
7. PPTX実アプリ: Gの独立受入で対象選択/文字編集/独立図形/保存/再読込を確認。未実行ならNOT_RUN。合成geometryのOOXML assayと実写真構造の精度を別ledgerにする。

## 7. 既存試験Evidenceと保護

既存exact source CIはBASELINE-V1.mdにrun 37416413246 success、55 suites PASS / FAIL 0 / BLOCKED 0 / skip 0として記録されている。これは総括baselineから継承したEvidenceで、このWorkで再実行/個別suite再取得していない。
INTEGRATION-STATUS.jsonの65 synthetic safety、7 inventory、54 existing contract、6 contain、10実写真配置例は各scopeの履歴。suite数/個別assertion数を合計して実写真精度へ換算しない。
PILOT-10-PPTX-ASSAY.jsonはPASS_COORDINATE_ASSAY_ONLY、realPhotoContainerCount=10、recognitionEvaluationPhotoCount=0、realAIPhotoCount=0、Office実アプリNOT_RUN。GTは参照されていない。
歴史的pipeline-audit.mdのPHOTO-008および旧SAVE-001待ちは、現行next-photo-defects.json/SAVE受入/最終CIを優先して更新解釈する。
006 subtree=47cabdf70e9aebf7c64a1e028e85c476df32a169。固定証明書SHA256=186ad92e96316b7a2a247c092fd3d83a94fa7a89ea406859a93b057c329a2d8d。
このWorkでは秘密値を取得せず、006/SAVE/signing/ENGINE-001/INPUT-001/OUTPUT-001/EXPORT_OWNER_RACEを変更しない。新規test実行NOT_RUN、既存test/skip変更0。

## 8. Evidence index

全pathはprototype/vdraw-mobile-007/からの相対。Git blob SHAは改変検知用の参照で、実精度の証明ではない。

| path | Git blob SHA / SHA256 |
|---|---|
| web/src/importers.js | blob 33fe27ec3d1f33647967892d386b2c7148b7b84c / SHA256 771f1db99a4cf674b684cabfeeee896fddbebbb253203f3502ef2aaead73d7c3 |
| web/src/vision.js | blob 37be20846f9694cfd023c0194a32cd75cf6312fd / SHA256 d918e467f25fdfea31c7312b6ee145ec400b01dd39bc2d7cc48a52536cb459bb |
| web/src/exporters.js | blob 7e50082bc18da5c6167709f7c6f699cc44b7f591 / SHA256 9b6ce6d50d373dfed80bdc853e301fe867faf0e7adaa49775207209b74347632 |
| web/src/core.js | blob 396deedd7062f2ceb89bc20bc3e850132ab2f194 / SHA256 94f5ae9ffe1c4459a673cf83f864efbfa3d74ef39b4dd8b504925499eeca023d |
| docs/photo-accuracy/golden-manifest.json | blob 2c9e78ad6175020a660424c1ea9072f53ef3a462 |
| docs/photo-accuracy/internet-source-registry.json | blob f0549d66937ec6d455a2749b15dd2483b3d6babd |
| docs/photo-accuracy/INTERNET-PHOTO-LICENSES.md | blob 537a1e16c9d73d36a6d4daa384d29f74f8fd78ba |
| docs/photo-accuracy/INTEGRATION-STATUS.json | blob 43df36a7df1ddfeccc40623bd7ad5a85ae31507c |
| docs/photo-accuracy/REAL-AI-PATH-STATUS.json | blob cb354daa81b0f196783267826a79bc1e30aa500c |
| docs/photo-accuracy/PILOT-10-PPTX-ASSAY.json | blob a69c23c626afba52778cc00c3b19ce781f465c91 |
| docs/photo-accuracy/save001-device-acceptance.json | blob 7d34cb942dd7c16a66b2a1a6d68a0c90ae5a866c |
| docs/photo-accuracy/next-photo-defects.json | blob bcff59e29ceb9c4968e7a6d6f9ae694a7207b3b0 |
| docs/photo-accuracy/next-phase-independent-qa.json | blob 96a204fd5f8a783f5c7fe89fb934ddc768c97201 |
| docs/architecture/DRAWING-IR-INITIAL-CONTRACT-V1.md | blob d712b439a119ac9fe17ed4fa69b67589fc84839c |

## 9. Blocker・依存・次の1単位

観察された不足: A正式schema/version未固定、E品質契約未確定/製品未接続、image-derived geometry未成立、GT未annotate/holdout未凍結、productImporterParity未証明、Office実編集/round-trip未実施、正式KPI全null。
既存Scene/SAMクラウド未接続は現行AI経路の不足であり、製品Runtimeの必須条件にしない。Fの先行基盤はAIなしで構築可能。
次の単一実装候補（まだ実行しない）: A schema確定後、routes/photo/source-ir-adapterを孤立実装し、既存manual/fixture構造をPhoto pixel-native IRへ変換して既存Editorへ戻す契約試験だけ行う。
入力は既存source metadataとmanual geometry。新規認識・semantic推測・provider・再収集・製品UI接続は含めない。source原本とtransform/hash/binding保持、UNSCALED、unsupported ledgerが受入条件。
Fによるschema拡張・Eの品質判定代行は行わず、open questionは総括→A/Eへ返す。監査保存にHuman Gate不要、製品採用/正式実精度判定はHOLD。
