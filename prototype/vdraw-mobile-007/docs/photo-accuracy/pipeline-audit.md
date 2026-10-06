# VDRAW 実写真→編集可能図面パイプライン読取監査

基準 HEAD：`15bf3371bec3f7d1e4090e7198a850c5636baf3f`。既存成果は変更していません。監査はコードと既存証跡の確認のみです。

実写真評価入力：0枚（既存 photo-pipeline 証跡）。実AI成功証跡：0件。実写真精度：未測定。

UI/保存/出力の動作PASSを写真認識精度へ読み替えません。私用Node Claude→SAM送信adapterはありますが製品UIのdraftは常時未接続です。この実行環境の必要4設定は存在booleanがすべてfalseでした。外部環境については判定していません。

## 分類

REALは実処理の存在を示し、実AI接続成功・認識精度の合格を意味しません。製品の実行経路と潜在adapter、MOCK/FIXTURE証跡を分離します。

|段階|製品経路|部品実装|現在確認できる範囲|
|---|---|---|---|
|Camera|REAL|REAL|Native Capacitor Camera / web capture input → importFile。撮影と認識品質評価は別。|
|Image Quality|NOT_IMPLEMENTED|NOT_IMPLEMENTED|48MP上限、長辺2000pxへのPNG変換のみ。Blur/glare/darkness/occlusion/retake判定なし。|
|Scene Understanding|NOT_IMPLEMENTED|REAL|Node private Claude adapter は実API送信コードあり。製品UIはUNCONNECTED/BLOCKED、接続実績なし。テストはfetch注入MOCK。|
|Detection|NOT_IMPLEMENTED|REAL|独立detectorはなくClaude scene.objectsのカテゴリと概略bbox。実推論の検出Precision/Recallは未測定。|
|Segmentation|NOT_IMPLEMENTED|REAL|私用SAM wrapperへのHTTP契約はあり。model/checkpoint/CUDA実装・稼働証跡なし。rankMasksは最高score mask選択。|
|OCR|NOT_IMPLEMENTED|NOT_IMPLEMENTED|写真OCR専用経路なし。PDFのnativeText抽出はREAL構造読み取りで写真OCRではない。SAM geometry text型受入はOCR実装を意味しない。|
|Line Detection|NOT_IMPLEMENTED|NOT_IMPLEMENTED|手動line図形と外部geometry line型はあるが画像からの専用Line検出なし。|
|Geometry Fitting|HEURISTIC|HEURISTIC|SAM提供polygon/bboxをローカルallowlistでeditable elementへ変換。primitive fitting/自動校正/画像から幾何推定の専用実装なし。|
|coordinateSpace Conversion|REAL|REAL|named drawing frame、PNG実寸sourceBinding、contain referenceImageTransform、uniform scale+offsetを固定。試験はsynthetic PNG header/fixture。|
|Candidate|REAL|REAL|result JSON手動受信、source/page/bounds照合、pending候補。operation-sampleとprotocol-fixtureラベル別。|
|Adopt|REAL|REAL|reviewed必要、atomic新規ページ採用、元図面保持。UI採用押下がreviewedを付与。Overlay閲覧は必須でない。|
|Editor|REAL|REAL|基本図形/文字/円弧/多角形と編集Undo/Redo。object rotation・scene graphなし。|
|Save / Reload|REAL|REAL|IndexedDB、SHA256 checksum、CAS、checkpoint、履歴で保存復元。候補sourceBindingはJSON保存される。|
|PPTX|REAL|REAL|editable OOXML図形/文字、polygon/arc custom geometry生成。構造検査はfixture。PowerPoint実アプリ/実写真忠実度なし。|
|DXF|REAL|REAL|native entityの単位なしDXF生成、ezdxf audit fixture。製品DXF importなし、Jw_cad未実行。|
|PDF|REAL|REAL|閲覧用ラスタPDF、editable CAD/vector roundtripではない。|
|Overlay|REAL|REAL|元作業PNGと図形をcontainでSVG重ね表示。定量IoU/位置角度輪郭スコアなし、adopt必須チェックなし。|

## 根拠と不足

### PHOTO-001 REAL_AI_NOT_CONNECTED

製品UIのdraftは毎回BLOCKED。私用Node adapter存在を製品の実AI接続PASSへ読み替え不可。

根拠：prototype/vdraw-mobile-007/web/src/vision.js:57-60, prototype/vdraw-mobile-007/server/vision-provider.mjs:15, prototype/vdraw-mobile-007/serve.py:1-8。

### PHOTO-002 REAL_PHOTO_ACCURACY_UNMEASURED

既存photo-pipeline証跡realAI=false、realPhotoInputs=0。12工程SUCCESSはsynthetic+mockの接続/編集回帰であり認識精度でない。

根拠：prototype/vdraw-mobile-007/tests/photo-pipeline-005-007-adapter.mjs:7-13, prototype/vdraw-mobile-007/tests/photo-pipeline-005-007-adapter.mjs:19-22, prototype/vdraw-mobile-007/evidence/photo-pipeline-results.json:33-34。

### PHOTO-003 CAMERA_QUALITY_GATE_MISSING

取り込み/画像サイズ制限と品質判定を区別する必要あり。撮影画像の劣化理由・撮り直し案内・品質判定KPI未実装。

根拠：prototype/vdraw-mobile-007/web/src/device.js:11-12。

### PHOTO-004 UNCERTAINTY_CONTRACT_MISSING

scene schemaはid/name/category/color/bboxのみ、stage別confidence/statusなし。未知対象は保持されるがKNOWN/UNCERTAIN/OCCLUDED等伝播なし。UNKNOWN→CONFIRMED自動昇格は発見なし（CONFIRMED型自体なし）。

根拠：prototype/vdraw-mobile-007/server/scene-schema.mjs:3, prototype/vdraw-mobile-007/server/vision-provider.mjs:34, prototype/vdraw-mobile-007/web/src/vision.js:67-69。

### PHOTO-005 REAL_PROVENANCE_SELF_DECLARATION

executionKindはインポートJSONの自己申告。モデル接続レシート/暗号署名/送信原画像hash照合なし。candidate sourceFingerprintは受信時の現sourceから生成する変更検知で、実AI/元入力の証明ではない。

根拠：prototype/vdraw-mobile-007/web/src/vision.js:21-25, prototype/vdraw-mobile-007/web/src/vision.js:46-50, prototype/vdraw-mobile-007/web/src/vision.js:62-70, prototype/vdraw-mobile-007/web/src/trial-recorder.js:40。

### PHOTO-006 CANDIDATE_PROVENANCE_DROPPED

providerがcandidate.provenance model/samModel/usageを付与するがVisionJobs.receiveのreceivedにはコピーされない。外部resultのrecordは診断ledgerへ一部伝達されるが候補自体のprovenanceなし。

根拠：prototype/vdraw-mobile-007/server/vision-provider.mjs:67, prototype/vdraw-mobile-007/web/src/vision.js:69, prototype/vdraw-mobile-007/web/src/trial-recorder.js:9-16。

### PHOTO-007 OVERLAY_NOT_REQUIRED

candidatePreview初期view=drawing。採用ボタン押下がreviewedを記録し、写真/Overlayを実際に確認したことを必須にしない。操作成功は一致精度のPASSではない。

根拠：prototype/vdraw-mobile-007/web/src/app.js:65-66, prototype/vdraw-mobile-007/web/src/app.js:133-136。

### PHOTO-008 PPTX_PHOTO_ASPECT_MISMATCH

PPTX includePhotoは写真をpage.canvas全域へ直接伸長。採用後の固定1200x800ページで非3:2写真があるとSVG containとの差が生じる。例1000x2000写真→SVG x=400,w=400,h=800だがPPTX背景photo x=0,w=1200,h=800相当。実写真未実行だがコード上の条件と変換差は確認済。既存構造試験はpic0のみ。

根拠：prototype/vdraw-mobile-007/web/src/vision.js:45-55, prototype/vdraw-mobile-007/web/src/vision.js:89-90, prototype/vdraw-mobile-007/web/src/render.js:12, prototype/vdraw-mobile-007/web/src/exporters.js:11-12, prototype/vdraw-mobile-007/tests/output-structure-005.py:12。

### PHOTO-009 EXIF_AND_PERSPECTIVE_NOT_EVALUATED

createImageBitmap from-imageとNative correctOrientationに頼るEXIF正規化は存在するが実EXIF fixture/レンズ/回転/端末別精度検証なし。Homography/Perspective/lens distortion補正なし。AIには斜め対象を直角化しないpromptのみ。

根拠：prototype/vdraw-mobile-007/web/src/device.js:11, prototype/vdraw-mobile-007/web/src/native-io.js:4, prototype/vdraw-mobile-007/server/vision-provider.mjs:59, prototype/vdraw-mobile-007/tests/input-001-regression.test.mjs:9-10。

### PHOTO-010 SCALE_CALIBRATION_NOT_IMPLEMENTED

page UNSCALED、AI候補UNSCALED固定とallowlistによるmodel calibration排除は保護済。UI実測mmは対象辺のみMANUAL/doesNotCalibratePage。CALIBRATED/provenance各方式未実装。

根拠：prototype/vdraw-mobile-007/web/src/core.js:17, prototype/vdraw-mobile-007/server/vision-provider.mjs:27-34, prototype/vdraw-mobile-007/web/src/app.js:123, prototype/vdraw-mobile-007/web/src/exporters.js:35。

### PHOTO-011 GEOMETRY_AND_SCENE_GRAPH_GATES_MISSING

bounds/有限値/型/polygon点数/円弧円形の形式検査は存在するが、自己交差/duplicate/微小線/接続/平行/直角/接線/関係graph検証なし。SAM scoreは最高順位選択にのみ使用しconfidenceは出力から失われる。

根拠：prototype/vdraw-mobile-007/web/src/core.js:25-43, prototype/vdraw-mobile-007/server/vision-provider.mjs:25-33, prototype/vdraw-mobile-007/server/sam-contract.mjs:9-15。

### PHOTO-012 ROUND_TRIP_INCOMPLETE

PPTX基本型importはあるがrotation/group/画像/非閉路arc等未対応。DXF製品importなし。PPTX/DXF生成→再読込→再編集→再出力の写真単位忠実度KPIなし。

根拠：prototype/vdraw-mobile-007/web/src/importers.js:24-36, prototype/vdraw-mobile-007/tests/recovery-input.mjs:5, prototype/vdraw-mobile-007/tests/output-structure-005.py:35。

### PHOTO-013 HUMAN_CORRECTION_LEDGER_PARTIAL

counts/color/shape/classと作業時間を集計するが座標/文字/色/形状before-after構造差分の永続記録なし。operatorActionCountはadoptも含む。無修正はfirstEdit=null時にcorrectionTimeMs=nullで0ms断定不可。

根拠：prototype/vdraw-mobile-007/web/src/trial-recorder.js:31-40, prototype/vdraw-mobile-007/web/src/commands.js:9-22。

### PHOTO-014 MULTIVIEW_AND_GOLDEN_NOT_REGISTERED

複数source/pagesは資料保持であり同一対象multi-view identity統合ではない。Development/Validation/Blind split、difficulty/対象/条件annotation、実写真hash認可台帳なし。

根拠：prototype/vdraw-mobile-007/web/src/core.js:20, prototype/vdraw-mobile-007/web/src/importers.js:7-15, prototype/vdraw-mobile-007/server/photo-trial.mjs:9-12。

## 既存保護を維持する点

INPUT-001のsourceBinding/coordinateSpace/referenceImageTransformと原本保持、新規採用ページ、UNSCALED固定、AI calibration allowlist排除、SAVE-001のSAF保存/共有分離を継続維持します。未知対象カテゴリは採用後も保持します。UNKNOWN→CONFIRMED自動昇格は監査範囲で発見していませんが、段階別不確実性伝播の契約は未実装です。

## 次工程判定

オフライン評価環境・Golden仕様構築へ進行可能です。実AI10枚正式評価は、写真の利用認可とground truth・provider接続実証・外部送信/費用認可が揃うまでBLOCKEDです。認識率は未測定のままです。0.8.2 SAVE-001実機SAF受入はユーザーの1操作結果待ちであり、本監査からCLOSEDへ変更しません。
