# Phase 1 Stage Budget Proposal V1

状態: PROPOSED / 人による最終受入閾値の承認なし。Source inventory QAと実DXF/Jw_cad精度を区別する。

| Stage | Quantity | Proposed budget / policy | Current Evidence |
|---|---|---|---|
| Original OOXML | EMU integers, source hash/object identity/parts | Exact raw lexeme and original XML/hash retention。情報欠落0 | 独立原本oracle |
| Native transform | endpoint/vertex/basis/matrix | arithmetic QA comparison absolute 1e-8 in compared native units; raw expected/actual/delta保存。unit conversion精度とは別 | synthetic matrices and native exporter output |
| EMU→layout mm | native integer/36000 | 1 EMU相当=1/36000 mm以内の初期提案。現場実寸は証明しない | A candidate contract QAのみ |
| Target DXF serialization | coordinates | 0.001 layout mmを検討用budgetとして提案。backend精度を実測して固定、未実測値でPASS不可 | NOT_IMPLEMENTED / UNMEASURED |
| Jw_cad import/edit/save→DXF | coordinates/angle/text/color/topology | budget=null。実version/読込設定/出力丸めの実測後、Human-reviewed policyを凍結 | NOT_RUN |
| Total round-trip | position/size/angle | stage budget和＋app quantization。未知stageを0と扱わない | BLOCKED |

角度原値の整数はexact、rot/60000度はraw値と併記する。60000の係数はMicrosoftのshape a:xfrm rot=5400000→90度例で独立照合。native angleとmatrix orientation、flip、異方scale、group transformを別々に保存し、bounding-box対角線だけでrotation保持を証明しない。
角度のserialize/Jw_cad誤差は未測定。提案1/60000度はnative表現の1単位であり、実アプリの許容誤差として自動採用しない。360度wrapで誤差を比較する。

Textは内容/codepoint/paragraph/run/brと元XMLを保持。line endingの正規化が必要なら元のraw値とpolicyを別保存し、黙って空白や改行を追加削除しない。文字anchor/baseline/height/font代替は別の実アプリ指標としてUNMEASURED。
Topologyはentity欠落、vertex欠落、open/closed誤り、duplicate、dangling source/part identityを距離epsilonで免責しない。polygon/quadsは全vertexとbasisを検査する。
Raw stroke/fill/text/theme色branchと変換要素を原XMLから保持。テーマ/継承/フォント未解決はHUMAN_CHECK_REQUIREDであり、黒などの既定値へ置換してfaithful exportを主張しない。
原本のunsupported背景/画像等も別分母へ固定。完全accountingとsupported retentionは異なるGate。

Primary reference（2026-10-07取得）:
https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.bodyproperties.rotation?view=openxml-3.0.1
このページのshape a:xfrm例はrot=5400000を90度clockwiseとする。TransformGroup別ページの64000記述とは矛盾があるため、64000をoracleに採用しない。非一様groupでの実Office表示は別途NOT_RUN。
