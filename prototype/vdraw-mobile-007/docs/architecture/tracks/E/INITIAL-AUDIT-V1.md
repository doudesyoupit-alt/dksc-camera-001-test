# Track E 初回監査・Camera Quality / Guidance 契約計画 V1

状態: READ_AUDIT_COMPLETE / CONTRACT_PROVISIONAL / IMPLEMENTATION_NOT_STARTED / PRODUCT_GATE_HOLD。
instruction_id: VDRAW-4ROUTE-E-INITIAL-20261007-V1
branch: work/vdraw-camera-quality-guide-v1
開始HEAD: 9ae8e1b4137cbb4a65f630e2501a94af6cb826ad
source branch/HEAD: work/vdraw007-photo-accuracy-20261006 / 6c0facb34757a54ed37d08d94505129b0341ad66
安定0.8.2: 15bf3371bec3f7d1e4090e7198a850c5636baf3f
確認日: 2026-10-07 JST。

## Evidenceと監査範囲

GitHubから自branch、source branch、release branch、dispatch manifest、BASELINE、初期IR契約、Phase1計画、以下原本を再取得。manifestのTrack E expected_headと開始HEADは一致。local baselineは読み取り補助で、GitHub原本を根拠とした。

| パス（prototype/vdraw-mobile-007/配下） | Git blob SHA | 用途 |
|---|---|---|
| scripts/photo-quality.py | 2254e1761c8b65dc0cec0c1fcf77a44bd3a3fe5d | 既存offline pixel heuristic |
| tests/photo-quality.test.py | 7ef1f725df3bcdaecbfec645212f7fde9f2ca192 | synthetic behavior testsのみ |
| docs/photo-accuracy/INTEGRATION-STATUS.json | 43df36a7df1ddfeccc40623bd7ad5a85ae31507c | 10枚品質結果・product gate・未測定 |
| docs/photo-accuracy/PILOT-10-RESULT.md | 63a2a254b4bd6175d1473c3e8b434c728927267f | 既存10枚の測定範囲 |
| docs/photo-accuracy/save001-device-acceptance.json | 7d34cb942dd7c16a66b2a1a6d68a0c90ae5a866c | SAVE-001 Human受入CLOSED |
| docs/architecture/DRAWING-IR-INITIAL-CONTRACT-V1.md | d712b439a119ac9fe17ed4fa69b67589fc84839c | PROVISIONAL共通契約 |
| docs/architecture/PHASE1-ACCEPTANCE-V1.md | 81592ff278ef178bb8c9481f4e04ec7bfbb5b483 | Phase1優先順 |

006 tree: 47cabdf70e9aebf7c64a1e028e85c476df32a169（GitHub tree確認）。固定証明書はsave001 Evidenceの186ad92e96316b7a2a247c092fd3d83a94fa7a89ea406859a93b057c329a2d8d。秘密値の取得・変更なし。
既存CI成功は総括BASELINEの既存証跡を参照し、本Trackで新たに実行していない。品質精度をCI成功から推定しない。
PILOTの「53 PASS」は歴史記録。最新総括BASELINEの「55 suite」は別分母。両者を混合しない。
既存Photo Golden候補10枚の取得、解析、再収集、拡大は再実行していない。

## 既存能力と欠落

| 関数/行（scripts/photo-quality.py） | 観察した能力 | 主張できないこと・欠落 |
|---|---|---|
| THRESHOLDS L14–24 | dark/bright/contrast/edge detail/resolution暫定値、入力20M px・解析1024px上限 | 校正済品質閾値、camera gate精度 |
| laplacian_variance L37–51 | 4近傍Laplacianの画素分散 | 光学blur原因の特定、被写体ROI判読性 |
| analyze_image L54–75 | EXIF orientation、白背景alpha合成、gray縮小、平均/分位点/edge測定 | 元画素全領域の局所欠落、重要文字の判読性 |
| check L79–100 | 5項目FLAGGED/NOT_FLAGGEDと値/閾値を出力 | NOT_FLAGGEDから欠陥なし・品質PASSへの昇格 |
| analyze_image L101–122 | glare/far/occlusion/motion=NOT_MEASURED、reasons有でRETAKE_REQUIRED、無でもNEEDS_REVIEW | focus/tilt/frontality/perspective/clipping/backlight/framing/corners/markerの正式測定 |
| analyze_path/main L125–156 | decoder異常はBLOCKED、例外からpath/metadata漏洩を防ぐ、新規出力のみ | BLOCKEDを画質不良や撮り直し要件と同一視すること |
| tests/photo-quality.test.py | 合成blur/dark/bright/lowcontrast/small、空壁の誤解防止、非測定、EXIF、壊れた画像、上書き禁止のbehaviorを検査 | 実写真の必要RETAKE recall / 不要RETAKE rate |

blur閾値60は正式採用値ではない。無地壁・白紙は鮮明でもedge detailが低い。模様・ノイズ・背景・JPEGやsharpenによる強いedgeは、重要ROIがぼけていてもglobal値を押し上げうる。縮小率・光量・対象サイズ・撮影機種で値が変わる。これらはコード構造からのリスク評価であり、今回実写真で測定していない。
dark/brightは画像全体の平均で、暗部つぶれ・白飛び・反射の局所遮蔽や逆光による対象欠落を証明しない。resolutionは総pixel数であり、図面の最小文字・細線や現場対象が占めるROIのpixel数ではない。
10枚中2 RETAKE_REQUIRED / 8 NEEDS_REVIEWは暫定heuristicの判断件数。Human GTがないためTP/FP/FN/TN、品質精度、必要RETAKE recall、不要RETAKE rateはNOT_MEASURED/null。

## Component境界と再利用

将来の新規quality/はpixel measurement、route policy、decision aggregation、action guidance、evidence bindingを分離する。今回はdocs/architecture/tracks/E/のみ。
- pixel measurement: 既存percentile/Laplacian/luma/oriented sizeを再利用候補とする。結果に方法/解析解像度/前処理/ROI/閾値versionを残す。
- route policy: A/B別required checks、撮影段階、task/object scopeを定義。IRを独自定義せずTrack A schema version/hashへ依存。
- decision aggregation: 欠落measurementを良好に変換しない。全体画像とcritical ROIの判断を分ける。
- guidance: reason code→具体action候補をdeterministicに生成。原因未特定のheuristicは断定を避けて確認・撮り直し候補を提示。
- Camera OS/permission/live preview/nativeは既存Android担当・総括所有。本Trackから直接変更しない。
- Track DはPaper四隅/Perspective/文字・symbol、Track Fは必要現場対象/scene ROIを供給。Eが設備や紙寸法を創作しない。
- optional AIは補助candidateのみ。最終品質GTや測定済statusをAI自己評価で作らない。

## 撮影前・中・後の契約案（PROVISIONAL）

| 段階 | Route A 現場写真 | Route B 紙住宅/電気図面 | 不足時の具体action |
|---|---|---|---|
| 前 | 必要対象・正面/同一平面・隠れる構造・必要実寸範囲を指定。全体とdetail撮影の計画 | ページ全体と四隅、対象細線/最小文字、ページ/寸法根拠を指定。紙を平らに置く | 全体と読める近接画像を分ける。必要な基準寸法を入れる |
| 中 | 目標ROI・水平垂直・距離・focus・明暗・反射・framingを確認。3Dの正面性は面単位 | 四隅とmargin、カメラを紙の正面/平行、影/反射、紙のたわみ、focusを確認 | 正面へ移動、四隅を入れる、手を固定、対象にfocus、照明/角度を調整 |
| 後 | 原本hash、orientation、pixel/ROI、遮蔽・blur・局所露出・対象の残りを確認 | 四隅/透視補正可能性、局所文字/細線、glare/影/欠け、scale根拠を確認 | 反射/影を避ける、必要部分へ近づく、全体を再撮影、測定Evidenceを追加 |

「近づく」と「全体を入れる」が競合する場合は全体＋detailの2枚を提案し、先に必要範囲を明示する。欠けた対象は背景除去で削除せずUNKNOWN/OCCLUDED/HUMAN_CHECK_REQUIREDへ。
Route Aの四隅はpage四隅ではない。複数奥行きの建物全体へ単一平面homographyを適用しない。Route Bの紙面補正が成功しても寸法根拠がなければUNSCALED。
撮影不良と実寸Evidence不足を分離する。基準寸法がないだけで画質RETAKEを乱発せずMEASUREMENT_REQUIRED等へ退避。図面上の「1000」も読めただけで実寸根拠に自動昇格しない。

## Quality report→IR接続案（Track Aレビュー待ち）

reportはsourceAsset hash/page/frame、route、stage、task/ROI、requiredChecks、measurement results、method/preprocess、thresholdVersion/calibrationEvidence、decision、reasonCodes、nextActions、unknownChecks、execution scopeを保持。
各checkにMEASURED/NOT_MEASURED/UNSUPPORTED/BLOCKEDを明示。既存FLAGGED/NOT_FLAGGEDは観測結果として保持し、IR statusとは区別。nullは未測定であり0点ではない。
必要なchecksで確認不足→HUMAN_CHECK_REQUIRED、測定不能→UNKNOWN、原本decode不能→BLOCKED。妥当な根拠で取り直し必要→RETAKE_REQUIRED。根拠なし寸法→UNSCALED/MEASUREMENT_REQUIRED。
quality confidenceはaccuracyではない。測定可能範囲だけ低品質やRETAKEを提示し、不足判定がある状態で全route適合PASSにしない。
原本pixel、orientation transform、解析縮小transform、ROI frameを保持。画像の加工は派生assetとしてbinding/履歴を残し、source geometryを書き換えない。元画像hash照合なしの品質reportを別写真へ再利用しない。
具体actionは「手ぶれです」等原因確定を避け、「細部が確認しにくい候補です。端末を固定し、必要部分にピントを合わせて撮り直してください」のように測定根拠と分離。
アルゴリズム未対応checkはUNSUPPORTED/NOT_MEASUREDのissueとnextHumanActionを出し、silent ignoreしない。

## Golden・意味のある試験計画

既存10枚はSite Photo候補として保全。Human-reviewed quality labels・critical ROI・目的別必要項目が未確定のまま正式quality Goldenとしない。今回は追加画像収集も実行しない。
計画するquality GoldenはA/B別、route task別に原本hash、機種/撮影条件（必要な非機密情報のみ）、全体/ROI、必要RETAKE yes/no/uncertain、原因、repair action、HumanレビューEvidenceを固定。GTも異論・未回答を保持し、Human回答単独を絶対正解としない。
無地壁/白紙の鮮明画像、局所blur、細線の欠け、重要文字だけblur、逆光、局所白飛び、shadow、glare、四隅欠け、斜め紙、紙のたわみ、低解像度、被写体が小さい高pixel画像、遮蔽、markerなし、複数平面を含む。
development/validation/holdoutをhashで分離し、類似/同一写真が跨がないよう管理。既存Extreme=0とholdout未凍結を補完できるまでは未評価coverageとして明示。閾値調整後の同じholdoutへの繰返し適合を正式blind評価と呼ばない。

| 指標 | 定義（GT frozen scopeで集計） | 未測定/不足の扱い |
|---|---|---|
| 必要RETAKE recall | TP / (TP+FN): GT必要RETAKEのうち正しくRETAKEを返した比率 | GT-positiveにNEEDS_REVIEW/UNKNOWNを返したものはTPにしない。別abstention件数も出す |
| 不要RETAKE rate | FP / GT-no-retake件数: 撮り直し不要画像にRETAKEを返した比率 | FP/(TP+FP)とは別指標。後者は不要判定比率/precision補数として別表記 |
| RETAKE precision | TP/(TP+FP) | 分母0はNOT_MEASURED/null、100%にしない |
| coverage/abstention | 各required check・decision・GT uncertain別の測定/未測定件数 | GT uncertainを都合よくpositive/negativeに入れない。全inventoryは別保存 |
| 重大False PASS | GT critical failを適合と返した件数＋対象id/Evidence | NEEDS_REVIEWはPASSではない。未測定から「0件達成」しない |
| 修正指示有効性/負担 | 説明適合、再撮影後改善、繰返し回数、時間 | 実撮影のbefore/after hashとレビューが必要 |

route/quality reason/機種/ROI重要度ごとに分母、全件数、未評価、精度、interval/小標本の限界を出す。実務上必要RETAKE見逃しと不要RETAKE増加のトレードオフは独立QA/Humanが決定し、現在の暫定閾値を正式PASS化しない。
future behavior tests: hash mismatch fail-closed、NOT_MEASURED保持、原本座標/縮小/ROI逆写像、route-specific四隅policy、calibration不足とquality不足分離、理由別action、contradictory guidance整理、corrupt/unsupported画像、finite metrics、境界条件、既存quality tests維持。synthetic成功は契約挙動であり実Recall測定ではない。

## 現在BLOCKER・次の1単位

観察済BLOCKER: product camera wiring NOT_CONNECTED、既存閾値PROVISIONAL、品質GT/holdout未凍結、glare/far/occlusion/motion NOT_MEASURED、camera stage/route policy未接続。実Jw_cadはEの実装必須依存ではない。
IR source binding/frame/uncertainty正式schemaとhashはTrack A待ち。Phase1 PPTX→CADをこれらのPhoto精度不足で止めない。
次の限定実装候補: Track A契約確定後、新規quality/に既存offline measurementsを参照する「report→route別review/action adapter」だけを孤立実装し、暫定値/未測定をそのまま保持する。Camera/Editor/native/shared変更、閾値正式採用、実写真解析再実行は含めない。
初回は計画のみ。新規コード/新規test実行なし。docs保存の変更範囲をGitHub compareで確認する。
正式採用はPhase1→2→3→4→5順。Eは監査・契約整備を並行可、製品GateはHOLD。Human承認代行なし。
