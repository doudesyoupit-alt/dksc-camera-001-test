# Track D — Paper Drawing Camera → Jw_cad 初回読取り監査 V1

[WORK_HANDOFF_V1]
instruction_id: VDRAW-4ROUTE-D-INITIAL-20261007-V1
project: dksc-camera-001-test
track: D
branch: work/vdraw-paper-camera-jwcad-v1
expected_base_head: 9ae8e1b4137cbb4a65f630e2501a94af6cb826ad
status: AUDIT_COMPLETE_IMPLEMENTATION_NOT_STARTED
product_phase_gate: HOLD
Human Gate: このdocs-only監査の保存は不要。製品採用はHuman判断を保持。

## 1. 基準と監査範囲

2026-10-07 JSTにGitHubから自branch HEADを取得し、manifest expected_headと一致を確認した。source開発branch HEADは6c0facb34757a54ed37d08d94505129b0341ad66、安定0.8.2 release HEADは15bf3371bec3f7d1e4090e7198a850c5636baf3fのまま。
総括manifest/BASELINE/IRはwork/vdraw-four-route-coordinator-v1の615ec928dc880e1fbbec6f1c2702ed5c8c253476から読取った。全pathはprototype/vdraw-mobile-007/配下。
BASELINE docs-only親commitは9ae8e1b4137cbb4a65f630e2501a94af6cb826ad。
初回はソース・既存Evidence・Git tree監査と基盤計画のみ。コード、schema、testを実装せず、実画像解析・再収集・推論・APK・実Jw_cad操作は実行しない。

GitHubで再確認した保護/既存状態:
- 006 subtree SHA: 47cabdf70e9aebf7c64a1e028e85c476df32a169。自branch baselineと安定releaseで同一。
- SAVE-001: docs/photo-accuracy/save001-device-acceptance.json status=CLOSED、reconfirmationRequired=false。Human実機SAF受入を再質問しない。
- 固定証明書SHA256: 186ad92e96316b7a2a247c092fd3d83a94fa7a89ea406859a93b057c329a2d8d。秘密値を取得していない。
- 開発CI run 37416413246: completed/success、head_shaが現在開発HEADと一致。BASELINEに記載された55 suite PASSは既存ソフトウェア回帰EvidenceでありPaper実精度ではない。個別assertion数へ換算しない。
- INTEGRATION-STATUS.json: PHOTO-PPTX-001=CLOSED_INDEPENDENT_QA_PASS、allFormalMetrics=NOT_MEASURED、productCameraGate=NOT_CONNECTED、cameraQuality=OFFLINE_HEURISTIC_ONLY。
- pipeline-audit.jsonはHISTORICAL_PRE_PHOTO100_NEXT_PHASE_AUDIT。SAVE-001未完などの古い記述は上記最新ファイルへ昇格させず、段階実装監査の補助情報に限定。
- 現在open GitHub issueは#1（共通最上位目標）。Paper専用完了Evidenceは見つからない。
- Site Photo既存10枚は保全。Paper Goldenの代替やPaper精度の分母に使用しない。

## 2. 既存能力と未成立部分

以下はsource開発HEADに固定した読取り結果。画像形式取込や図形表現が存在しても、画像からの自動認識実装とは扱わない。

| Stage | 現在の状態 | Evidence / 関数・行 | 再利用または不足 |
|---|---|---|---|
| Camera入力 | REAL入出力境界 | web/src/device.js capturePhoto L14、app.js camera action L95 | native capture→importFile。OS/権限や実機検査は別責任。認識品質を保証しない |
| 原本・作業画像 | REAL | importers.js importFile L6–9、device.js sanitizeImage L10–12 | 原本data URL保存＋作業PNG・画像方向反映。48MP拒否と長辺2000pxへの縮小。元の高品質座標とのscale/orientation履歴を新経路では追加する必要 |
| 四隅検出・手動四隅契約 | NOT_IMPLEMENTED_IN_AUDITED_RUNTIME | importers.js image branch L9、vision.js L57–60、treeに専用paper routeなし | ページ輪郭・四隅・corner order/coverage/scoreなし。画像取込を四隅認識PASSにしない |
| Perspective補正 | NOT_IMPLEMENTED_IN_AUDITED_RUNTIME | vision.js contain/convertedElements L45–55 | 既存はuniform scale＋offset。homography/projective warpなし |
| Lens補正 | NOT_IMPLEMENTED_IN_AUDITED_RUNTIME | device.js sanitizeImage L10–12、quality.py L54–122 | orientationとresampleのみ。レンズprofile・radial/tangential係数・検証Evidenceなし |
| denoise/binarization | NOT_IMPLEMENTED_AS_PAPER_PIPELINE | quality.py analyze_image L54–75 | grayscale/Lanczosは品質計測前処理。Paper線やOCRのためのdenoiseと混同しない |
| Line/Rect/Circle抽出 | NOT_IMPLEMENTED_AS_IMAGE_DETECTOR | core.js validKinds L5、element L23–24、vision.js receive L61–71 | 手動line/rect/ellipse/arc表現はREAL。Hough/輪郭/primitive fitによる検出経路は未成立 |
| OCR | NOT_IMPLEMENTED_FOR_PAPER | REAL-AI-PATH-STATUS.json OCR、importers.js PDF getTextContent L13–14 | PDF native text取得はPaper OCRではない。文字候補受入だけでは認識と扱わない |
| 電気symbol認識 | NOT_IMPLEMENTED_IN_AUDITED_RUNTIME | core.js classes L4、候補allowlist vision.js L65–69 | 設備など分類はあるが記号辞書、規格/legend binding、照合Evidenceなし |
| Scale Evidence | 部分的な手入力の記録のみ | core.js newPage L17、app.js dimensionSheet L62 / add-dimension L123 | pageはUNSCALED。dimensionはMANUAL、selected-edge-only、planeId=null、doesNotCalibratePage=true。mmPerUnit確定処理として再利用不可 |
| Quality | HEURISTIC_PARTIAL_OFFLINE | scripts/photo-quality.py L54–122 | blur/dark/bright/lowcontrast/resolutionのpixel heuristic。glare/far/occlusion/motionはNOT_MEASURED。製品Camera未接続、Paper四隅・framing・skew未計測 |
| Source binding/座標保護 | REAL契約 | vision.js binding/candidateContract L25–44、convertedElements L51–55、adopt L86–97 | page/source/fingerprint/canvas/containを保持。既存fingerprintはchange detector、SHA256原本証明ではない。新IR adapterで破壊禁止 |
| 手動修正/保存 | REAL既存基盤 | core.js＋BASELINE-V1.md、既存save/restore契約 | 各専門担当の実装へ書込まない。新IR→Editor非対応primitiveはissueとして保持 |
| DXF出力 | REAL unitless renderer | exporters.js dxf L49–65、$INSUNITS=0 L53 | LINE/TEXT/MTEXT/CIRCLE/ELLIPSE/ARC/LWPOLYLINE等の既存出力。mm exportではなく、実Jw_cad読込/編集/保存のPASS Evidenceもなし |

検査したlocal source 5ファイルはGit blob計算でbaseline/tree.jsonのSHAと一致し、GitHub baseline treeでも対応entryを確認した。
- web/src/importers.js: 33fe27ec3d1f33647967892d386b2c7148b7b84c
- web/src/vision.js: 37be20846f9694cfd023c0194a32cd75cf6312fd
- web/src/core.js: 396deedd7062f2ceb89bc20bc3e850132ab2f194
- web/src/exporters.js: 7e50082bc18da5c6167709f7c6f699cc44b7f591
- scripts/photo-quality.py: 2254e1761c8b65dc0cec0c1fcf77a44bd3a3fe5d
GitHubから直接読取: device.js blob 286266d9727ceefcb35cde7afee38fc9d202316c、app.js blob 553b205bf48d0629cae82e91402f77a9194f829c。

## 3. 推奨component境界（計画のみ）

Owner D: 将来 routes/paper/。今回の変更はdocs/architecture/tracks/D/のみ。
- intake: immutable source asset ID/hash、原本pixel frame、EXIF/orientation、作業画像導出scale、ページ識別を記録する。
- page geometry: Eからcorner evidence/品質verdictを受ける。自動候補→人の修正→validated planar region。順序・重複・自己交差・非凸・面積・framingを検査。
- rectification: 明示されたcorner source frameとtarget frameへhomography。逆行列/condition/errorBounds/validRegionを記録。crop原本や高品質pixelは保存し、表示containと分離。
- extraction: deterministic denoise/line/circle/contour候補。構造を潰すclean-upや断線補完は無根拠で採用しない。OCR/symbolは後続の別実装単位とする。
- scale evidence resolver: Aのcalibration contractへ従い、page/plane/object/segment別に確認・矛盾・不足を返す。
- IR adapter: Aの確定version/hashを参照し、Paper独自schemaを増設しない。UNCERTAIN/UNKNOWN/unsupportedとsource bboxを保持。
- export adapter: Bのmm DXF backendへ渡す。UNSCALEDは明示unitless出力のみ、実寸要求はBLOCKED。Gが実Jw_cad受入を担当。

Shared既存importers/core/vision/exporters/app/native/assetsへ直接変更しない。必要差分は総括へpatch提案し、別統合branchで判断する。

## 4. 校正と単位の必須契約

共通IR契約はPROVISIONAL。以下はTrack Aへ返す条件であり、独自IR確定ではない。
1. 原画像pixel→oriented pixel→working image→rectified paper plane→drawing/CAD frameの各段変換を別に記録する。原本高品質座標を2000pxまたは1200×800のcanvasに置換しない。
2. 四隅だけではmmも真のpage aspect ratioも確定しない。target width/heightに根拠がなければrectified frameはPROVISIONAL/unitless。紙が平面である条件を残す。
3. 根拠付き紙サイズはLAYOUT_MMを与え得るが、住宅・配管・電気図面の現場実寸REAL_WORLD_MMではない。複写拡大/縮小、印刷fit、紙折れ、非均一撮影変形を検査する。
4. 印刷縮尺「1:100」やOCR「1000」の文字だけで実寸化しない。DRAWING_DIMENSION候補は原図寸法線/対象segmentとの対応、unit、確認者、reference hash、適用範囲を必要とする。元図のnot-to-scale注記や矛盾を保持する。
5. USER_INPUTは対象segmentや同一検証平面に限定。正の数が入力された事実だけでpage CALIBRATEDへ変更しない。選択対象なし/参照欠落/矛盾の場合はHUMAN_CHECK_REQUIREDまたはMEASUREMENT_REQUIRED。
6. 同一平面上にない対象や曲がった/折れた紙、別ページには単一基準を伝播しない。独立scopeのEvidenceを要求する。
7. 任意の固定レンズ係数を自動適用しない。lens未知のまま校正精度を保証しない。profile/schema/hash/対象端末と適用範囲をA/Eと協議する。
8. OCR/AI confidenceは真実確率ではない。意味不明記号はgeometry候補＋category UNKNOWN、semantic UNKNOWNを維持する。

## 5. E / A / B / Gへの依存と質問

| Owner | 要求 | 不足時の処理 |
|---|---|---|
| A | PAPER pixel frame＋homography validRegion、calibration scope、LAYOUT/REAL_WORLD unit role、issue/lossLedger共通契約version/hash | IR接続はHOLD、局所契約はPROVISIONAL |
| E | Paper専用page全体/四隅/framing/blur/glare/focus/resolution/skew/lens品質verdict、metric/status/method/nextHumanAction、verdict source hash binding | 不明をPASSにせずHUMAN_CHECK_REQUIRED。測定済の強い欠陥はRETAKE_REQUIRED |
| B | scaleStatusとunitRoleを受けるDXF backend、unsupported entity方針、mmとunitlessの明示 | 実寸DXF export BLOCKED |
| G | Paper Goldenのreview権威、失敗分母固定、位置/文字/寸法/overlay、Jw_cad実読込/選択/編集/保存Evidence | 検出実精度とJw_cad互換性はNOT_MEASURED/NOT_RUN |

Eへの具体的差戻し条件: 白い紙は平均輝度が高いため、Site Photo brightMeanLumaAbove等をそのままPaperに使うと不要RETAKEを増やし得る。白地面積と文字/線ROIの飽和を分離し、読取に必要な線消失/反射/局所blurを評価する。現在のglobal heuristicをPaper認識成功の判定にしない。
紙のcurve/foldは単一homographyで補正可能と推測しない。必要なら平置き再撮影を指示する。

## 6. 失敗・unsupported・Humanへの具体的返却

| 観測/不足 | 状態 | nextHumanAction例 |
|---|---|---|
| ページ切れ/四隅が見えない | RETAKE_REQUIREDまたはHUMAN_CHECK_REQUIRED（検出確度を区別） | 紙全体と四隅を画面に入れて再撮影 |
| cornerが重複/交差/ほぼ一直線、singular H | BLOCKED issue＋HUMAN_CHECK_REQUIRED | 4点を順に修正、正面から再撮影 |
| 紙が曲がる/折れる/重なり別平面 | HUMAN_CHECK_REQUIRED / RETAKE_REQUIRED | 平らに置き、ページごとに撮影 |
| 必要線・文字を反射/手/影が隠す | OCCLUDED / LOW_QUALITY / RETAKE_REQUIRED | 反射と影を避け、全図が見える照明/位置へ |
| 未確認lens/局所歪み | UNCERTAIN / HUMAN_CHECK_REQUIRED | 標準レンズで正面から再撮影、または検証済profileを指定 |
| scale evidenceなし | UNSCALED / MEASUREMENT_REQUIRED | 基準寸法と対応する両端点・unitを指定 |
| OCR誤読/寸法対応不明/縮尺矛盾 | UNKNOWN / HUMAN_CHECK_REQUIRED | 原図の文字・寸法線・適用対象を確認 |
| 未知symbol/破線/複雑線/underflow/microline | UNSUPPORTED issue＋HUMAN_CHECK_REQUIRED | 原画像の対象位置と理由を提示し、人が確認/修正 |

known defectを未検出に落とさず、未測定項目を正常へ変換しない。partial outputでは未対応ROI/objectと欠落ledgerを残す。未認識領域を自動削除しない。
Rasterでは入力primitiveの真の個数は通常未知。DXF出力個数照合だけでsilent loss=0や画像全要素Recall=100%と宣言せず、Golden source annotationの必要線/文字/記号/寸法と照合する。認識候補数とは別の分母を固定する。

## 7. Goldenおよび意味のある試験計画（未実行）

Paper専用Goldenは、この監査で凍結済み/承認済みとは確認できない。既存Site Photo10枚を削除/再収集せず別カテゴリで保全する。
Gと設計すべきminimumセット:
- 正面flat紙の住宅図面＋電気図面、斜め四隅、portrait/landscape/EXIF90度、遠距離の細線、小文字、日本語/数字/単位。
- 切れた四隅、複数紙/背景の四角、反射/影/白飛び/黒潰れ、手/定規の遮蔽、blur、wide-angle局所歪み、曲がり/折れ/コピー伸縮。
- 実寸根拠なし、紙サイズのみ、縮尺注記のみ、既知dimension対応あり、矛盾する2基準、独立ページ/別平面へ誤伝播。
- 閉領域/円/ellipse/重なり線/破線/電気symbol/未知記号/消えやすい細線。不要物除去で必要線が消える失敗例。
- 比較可能な元Vectorを印刷→撮影したpaired Golden。ただしsynthetic warpはtransform数学試験のみで実Camera accuracyには加算しない。

各実画像にasset hash、原本pixel/frame、Human annotationとconfidence、required primitive/text、corner points、scale evidence scope、quality defect、unknown/occluded ROI、split、review statusを固定する。失敗画像・未取得を分母から除外しない。

| Test | 期待する安全/精度確認 | 実施状況 |
|---|---|---|
| manual corners ordering/degenerate/duplicate/out-of-bounds/wrong source hash | invalid入力をfail-closed、元画像/案件state非変更 | NOT_RUN |
| H compose/inverse＋EXIF/sanitize/containの経路比較 | source⇄rectified overlay復元、axis/rotation/reflection誤りを検出、許容誤差をGoldenから事前設定 | NOT_RUN |
| paper-only LAYOUT mm vs represented REAL_WORLD mm | 紙サイズから現場寸法を作らない、UNSCALED mm要求をBLOCKED | NOT_RUN |
| single dimension scope / missing source / inconsistent references | page全域/別平面へ校正伝播0、Human check保持 | NOT_RUN |
| quality failure Golden＋clean white-paper controls | 必要RETAKE recallと不要RETAKE rateを分けて計測、unknownをPASSにしない | NOT_RUN |
| line/rect/circle/text/symbol/source annotation coverage | 必要対象Recall、unsupported/occluded ROI保持、失敗分母固定 | NOT_RUN |
| OCR exact content / geometric text baseline | 内容/位置/読み順を分離、dimension semantic化をHuman scopeで限定 | NOT_RUN |
| IR→Editor adapter＋save/reload | sourceBinding/coordinateSpace/candidateCanvas/referenceImageTransform/aspect保護、旧schema未破壊 | NOT_RUN |
| calibrated Paper→DXF→実Jw_cad edit/save→DXF comparison | entity編集可能/ラスタ化なし、単位/線/文字/位置/寸法/再保存照合 | NOT_RUN |

Thresholdや成功率の仮値を製品Acceptanceとして採用しない。Gが基準Toleranceと評価項目を事前固定し、重大False PASS0、実精度NOT_MEASUREDからEvidenceで更新する。
既存55 suite等はINHERITED_EVIDENCE_ONLY。今回実行したソフト試験0、実Paper画像推論0、Jw_cad操作0。read-only blob一致確認はソース同定検査でありPaper機能testではない。

## 8. 現在BLOCKERと次の限定実装単位

観測された未完:
- 共通IR正式schema/version/hash未確定（Aレビュー待ち）。
- 品質判定がoffline heuristicで、製品/Paper specificのcorner/coverage/局所品質が未成立（E待ち）。
- Paper四隅/rectification/line/circle/OCR/symbol/scaleEvidence pipeline未実装。
- Paper専用Human Golden/validated accuracy未確認。
- mm DXFと実Jw_cad受入Evidenceは本基準で未成立（B/G）。Phase1→2→3の製品Gateを維持する。

次の1実装単位候補:
総括の新Dispatch後、routes/paper/に「manual four-corner intake＋planar rectificationの局所module」を孤立実装する。
入力: pinned original pixel frame/hash、同一page上の手動4点、E品質verdict、根拠があればtarget aspect ratio。
出力: PROVISIONAL rectified pixel/unitless frame、explicit homography＋inverse＋validRegion/errorBounds、原本座標保持、scaleStatus=UNSCALED。
自動corners/OCR/symbol/mm推測/Editor/Camera OS wiring/製品統合はこの単位に入れない。invalid geometry/source bindingを拒否する意味のあるtestだけを同時実装し、real Camera精度を主張しない。
A確定後のadapter接続、E実品質の接続、B/G DXF採用は別Dispatch。Phase1 PASS前にPaperを製品採用しない。
