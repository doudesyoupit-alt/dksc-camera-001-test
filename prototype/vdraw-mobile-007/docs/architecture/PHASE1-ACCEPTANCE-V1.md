# Phase 1 Acceptance Test Plan V1
対象: Route D PPTX→native OOXML→Drawing IR→mm DXF→実Jw_cad。
状態: PLAN_ONLY / PRODUCT_GATE_HOLD / 実Jw_cad UNMEASURED。

## Golden
Native PPTX、Generic PPTXを分離。原本SHA256、作成app/version、slide size/EMU、source object一覧、expected geometry、verified ground truth、supported set、unsupported setを固定。
line(縦/横/斜め/負方向)、polyline(open/closed)、rect、circle/ellipse、simple polygon、text(日本語/ASCII/改行)、rotation(正負/0/90/359)、nested/basic group、color(theme/direct/opacity)、multi-slide、非標準slide sizeを含む。
hidden、flipH/V、negative offsets、zero-length line、placeholder/master/theme inheritance、text+shape、connector、unsupported image/table/chart/SmartArt/complex curve等をloss ledgerで扱う。
欠落オブジェクト数の分母を固定。supported/unsupported/container/backgroundを別集計し、再分類で合格率を上げない。
Native exportのmetadata有無を調査し、未存在はGeneric同様に扱う。semantic metadataはschema/origin/hashが検証できた範囲だけ利用。

## Gate順
1. Import inventory: 全objectのsourceBinding・native EMU保持、supported判定とloss ledger件数照合。
2. IR: schema/finite coordinates/frame/unit/transform/calibrationの検証。
3. DXF static audit: entity対応、mm conversion、header/unit evidence、encoding/font、layer/color、unsupported一覧。
4. Independent numerical compare: endpoints/vertices/text baseline/size/angles/page offset。native原本から別計算し、制作コードをoracleにしない。
5. 実Jw_cad: Open、線選択、文字編集、図形分離、非ラスタ、保存。app/version/OS/操作/入出力hash/screenshotsを記録。
6. Round-trip: PPTX→DXF→Jw_cad→再編集→DXF保存→compare。意図的編集対象と未編集対象を分離。
7. Regression/006/signing/SAVE-001/INPUT/OUTPUT/RACE/座標/写真aspect/save reloadの保護。
8. G独立報告→Coordinator GitHub再取得→Phase1判定。Human最終判断を代理しない。

## 指標
supported primitive silent loss=0は必須。text内容の差、position/size/angle/unit誤りはobject別に記録。
line/text/position/size/angleは100%へ接近という開発目標。受入閾値・epsilon未確定をPASSにしない。
初期提案: 純EMU→mm arithmeticは1 EMU相当以内、PPTX生成/読取差は独立に測定、DXF/Jw_cad再保存誤差は実app観察後にHuman-reviewed toleranceとして固定。提案値はまだ正式閾値ではない。
色はraw RGB/theme解決/semantic color/source layer→CAD対応を比較。未対応色は明示。
日本語文字encoding、フォント代替、text高さ/改行/文字位置、Jw_cadによるINSUNITS解釈を実appで確認。headerを書いただけで単位互換PASSにしない。
PPTX上のslide/layout mmと現場実寸を区別。Generic dimension semantic推定0。

## 受入Evidence schema案
instruction_id、source_branch/source_head、implementation_head、IR contract version/hash、golden id/hash、input object ledger、DXF audit、app name/version/OS、action checklist、before/after file hash、numeric diff、tolerance authority、tests(pass/fail/blocked/skipと分母)、protection、Human Gate、limitations、next_action。
NOT_RUN/UNMEASURED/BLOCKEDを明示。画面表示だけ、DXF parserだけ、syntheticだけでJw_cad PASS不可。

## 初回環境不足の扱い
実Jw_cad操作環境がなければDEVICE_JWCAD_EVIDENCE_REQUIREDとしてGate HOLD。Linuxで代替parserが成功しても同一主張へ昇格しない。
スマホ中心運用に合わせ、Gは必要な実操作を最小限のチェックシートへ集約。今はユーザーへ再インストール/データ削除等を求めない。
