# VDRAW Drawing IR 初期契約 V1
契約状態: PROVISIONAL。これは総括の初期契約であり、schema実装PASS/製品採用を意味しない。Track Aがレビューし、version/hashを固定する。

## Envelope
schemaVersion, contractStatus, documentId, sourceType(PHOTO/PAPER/PDF/PPTX), sourceAssets[], pages[], issues[], lossLedger[], exportReadiness, relationships[], evidence[]を保持。
各sourceAsset: id、contentHash(SHA256)、mediaType、page/slide、immutable original reference、derived reference、変換履歴、license/provenance。
sourceBindingはsourceAssetId/hash/page-or-slide/objectId/path/bbox/evidenceIdへ拘束。既存sourceBindingはadapterで保持し新contractへ暗黙置換しない。

## Coordinate / Unit
sourceCoordinateSystemとdrawingCoordinateSystemはid、unit、origin、axes、yAxis、extent、pageIndexを明示。
SOURCE: PPTX=EMU、PDF=point/native(ページUserUnit等を含む)、Photo/Paper=pixel。数値原本を失わずnativeGeometryにも保持。
Drawing座標は用途別frame。Editor表示用とCAD layout mm frameを分け、1200×800を全Routeの真実にしない。
known conversions: PPTX 914400 EMU=1 inch=25.4 mm、1 mm=36000 EMU。PDF 72 pt=1 inch、1 pt=25.4/72 mm。PDFのページUserUnit/rotation/crop/media boxを変換履歴へ保存。
PPTX/PDFの紙面mmはLAYOUT_MM。対象物の現場実寸はREAL_WORLD_MM。紙面寸法を現場寸法と誤認しない。
physicalUnitはmm/pt/EMU/px/unitless等を明示し、unitRole=SOURCE/LAYOUT/REAL_WORLDとphysicalScaleEvidenceを区別する。
UNSCALEDでもnative PPTX/PDFの紙面mm変換は可能。ただし実寸CADという表示は禁止。実寸を要求するexportは校正不足でBLOCKED。
Photo/Paper pixelをmmへ推測変換しない。一般写真の単一基準寸法は同一平面/範囲内に限定し、隠れた3D全体へ拡張しない。

## Scale
scaleStatus=UNSCALED/CALIBRATED。
calibrationProvenanceはUSER_INPUT/KNOWN_OBJECT/DRAWING_DIMENSION/MARKER/SCALE/AR/MULTI_VIEW。
校正のscope(page/plane/object/segment)、reference sourceBinding、入力/測定値とunit、誰がいつ確認、method、uncertainty/tolerance、適用/除外範囲、evidenceHashを保持。
CALIBRATEDはreferenceや変換値が全て揃い検証可能な範囲だけ。USER_INPUTも絶対正解とはせずEvidenceと矛盾すればHUMAN_CHECK_REQUIRED。
Generic PPTX上の文字「1000」を自動dimension化・校正根拠化しない。Native PPTXのmetadataもorigin/hash/schema確認なしで権威化しない。

## Transforms
fromFrameId/toFrameId/type/matrix/convention/order/invertible/provenance/sourceBinding/errorBoundsを明示。
2D affine: column vector [x,y,1], row-major保存matrix、composition=後段matrix×前段matrix。perspectiveはhomographyとvalid regionを分ける。
Groupのoff/ext/chOff/chExt、rot、flip、page y反転、EMU→mm、CAD y-up変換を段階別に残す。表示containはsource geometryを変更しない。
反転・非一様scale・skewでcircleがellipseになる場合、primitiveを適正変換。表現不可はUNSUPPORTED issueとして保持。
非有限値、特異行列、frame欠落、provenance不足はfail-closed。丸めはexport境界のみ、誤差を記録。overlay inverse mappingを検証する。

## Objects
id、kind(line/polyline/rect/polygon/circle/ellipse/arc/text)、nativeGeometry、drawingGeometry、frameId、sourceBinding、transforms、layer、category、rotation、style、semanticColor、confidence、status、relationshipsを保持。
lineは2 endpointを保持(負方向/zero widthをbboxだけで失わない)。polylineはpoints/closed、polygonはclosed ring、circleはcenter/radius、ellipseはcenter/radii/orientation、arcはcenter/radius-or-radii/start/end/sweep/conventionを明示。
textはcontent/run/lineBreaks、position/baseline/anchor、font family/size/unit、rotation/style/encoding、missing fontを保持。文字boxとbaselineは区別。
styleはstroke/fill/width/unit/dash/opacity/theme-resolutionEvidence。semanticColorの意味は明示metadata/Evidenceがない限りUNKNOWN。色の視覚値と意味を混同しない。
layersは元情報がなければsynthetic layerとしてprovenanceを明示する。categoryはUNKNOWNが許容。
dimensionは今回primitive追加ではなく、明示Evidence付きannotation/relationshipとして別保管。Generic shape/textをdimension/pipe/equipmentへ推測昇格しない。
confidenceはvalue nullまたは[0,1]、method/source/calibrated flagを保持。未測定はnull、AI confidenceは正解率ではない。

## Uncertainty / Unsupported / Loss
status=KNOWN/UNCERTAIN/UNKNOWN/OCCLUDED/LOW_QUALITY/RETAKE_REQUIRED/MEASUREMENT_REQUIRED/HUMAN_CHECK_REQUIRED。
UNSUPPORTEDは別issue disposition。人が確認すべき項目はobject status=HUMAN_CHECK_REQUIRED＋issueCode=UNSUPPORTED_OPERATOR/OBJECT等。
unsupportedを削除せずnative object/source位置/理由/nextHumanActionを記録。不可読sourceは明示BLOCKED。
lossLedgerは入力object/path単位でSUPPORTED_EXPORTED/UNSUPPORTED/REJECTED/HUMAN_CHECK_REQUIRED、output ids/count、理由、sourceBindingを保持。
input countと判定countの一致を要求し、group/containerとleaf/drawableを別分母にする。textを含むshapeはshape+text双方の保持を照合。
unsupportedが残ったpartial exportは明示可能だがFULL PASS不可。意図的非表示/hidden/slide背景等もpolicyとinventoryに残す。

## Relationships
CONNECTED_TO/CONTAINS/INSIDE/ADJACENT_TO/ALIGNED_WITH等。subject/object ids、Evidence、status、confidence、method、scopeを保持。
関係の不存在/不明をfalse/trueへ推測変換しない。重複・dangling・自己参照/循環はrelationship別policyで検査する。

## Compatibility
既存vdraw-mobile/1は保持。IR→Editorで未対応primitiveを黙って欠落させない。
既存coordinateSpace/candidateCanvas/referenceImageTransform、sourceBinding、photo aspect、save/reloadを二重保持するadapterテストが必要。
未知schemaVersionはfail-closed、旧保存データのmigrationは別Scope/Human Gate。既存test削除/skip追加禁止。

## Track Aに求めるcontract test plan
unit factor/EMU保持/pt UserUnit、transform composition/group rotation/reflection、round-trip epsilon、unknown calibration、missing binding、object count conservation、generic semantic UNKNOWN、unsupported明示、既存Editor contract差分なし。
初回は正式schema案とopen questionsを返す。実装を通すためのGate緩和は禁止。
