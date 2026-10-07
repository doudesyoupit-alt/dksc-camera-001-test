# Real PPTX / Jw_cad Acceptance Checklist V1

全項目 NOT_RUN、Evidenceなし。チェックシートを作成したことは実アプリPASSではない。現在ユーザー操作を要求しない。

| ID | Actual operation | Required Evidence | Status |
|---|---|---|---|
| APP-01 | 実PowerPoint/選定PPTXアプリでNativeと外部Genericを開く | app/version/OS/settings/source hashes/slide order | NOT_RUN |
| APP-02 | 線/図形/textを個別選択・編集しPPTX保存 | before/after original hashes、編集targetと内容、画像補助 | NOT_RUN |
| JW-01 | candidate DXFを実Jw_cadへOpen | app/version/Windows/settings/DXF hash/file | NOT_RUN |
| JW-02 | 線選択・図形分離・文字編集を行う | action別Evidence、editable item IDs、ラスタ依存なし | NOT_RUN |
| JW-03 | unit/reference segment/size/rotationを確認 | LAYOUT_mmとREAL_WORLD scope別、raw numeric values | NOT_RUN |
| JW-04 | 日本語/改行/height/font、ellipse/circle/closed polygonを確認 | 保持/変換/欠落をobjectとpart別集計 | NOT_RUN |
| JW-05 | layer/color/線種を確認 | raw→mapped→saved値、unsupported明示 | NOT_RUN |
| JW-06 | 既知line移動/text変更後に保存して再編集する | explicit edit manifest、before/after file hashes | NOT_RUN |
| JW-07 | DXF再保存→未編集/編集対象別に独立比較する | 再保存原本、entity/part mapping、numeric diff、topology/text差、tolerance authority | NOT_RUN |
| JW-08 | G報告を総括がGitHub再取得しHuman最終判断する | immutable source/implementation/QA HEAD、承認Evidence | HOLD |

単純なOpen成功は選択/編集/保存互換の証明にならない。parserやsyntheticの成功は実Jw_cadと同じ主張へ昇格しない。
実Jw_cad未測定の日本語TEXT/MTEXT、ELLIPSE、truecolor、DXF version/INSUNITS・CAD y-up変換は全て対象に残す。
既存SAVE-001の0.8.2実機SAF受入CLOSEDは再利用し、同じ確認を再要求しない。製品統合・APK生成はこのQA Round2の範囲外。
