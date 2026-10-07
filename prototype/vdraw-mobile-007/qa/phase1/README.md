# Independent Phase 1 Golden / Source Loss Oracle V1

G-owned QA-only fixtures/tools/evidence。Production importer/exporter、IR schema/adapter、DXF backendを実装しない。
Generic2件はGがraw OOXMLで作ったsynthetic ZIPであり、外部PowerPoint/LibreOffice作成データを取得した実証ではない。実外部Generic Golden数=0。
Native1件はGitHub source HEAD 6c0facb34757a54ed37d08d94505129b0341ad66のexporters.jsを一字も変更せずVMに読み、PptxGenJS 4.0.1 + JSZip 3.10.1で生成したQA出力。repo内shipped vendor bundleとのbyte-equivalence/実アプリ同等性は未確認。
photoなしのためunused native IO moduleのみdependency injectionし、出力typeをBlob→uint8arrayへ適合した。native polygon/arc writerはこのfixtureで実行していない。原Exporterと元Editor JSON、依存version、生成手順をEvidenceに残す。

## Dependencies and commands

Python3 stdlib（zipfile/xml.etree/unittest/hashlib）。NodeはJSON module import attributesとvm.SourceTextModuleが使えるversion（今回v24.19.0）。生成は `--experimental-vm-modules` が必要。
Node runtime依存: PptxGenJS4.0.1、JSZip3.10.1。B test-only DOM adapterはxml-js1.6.11依存。CODEX_PRIMARY_RUNTIME_NODE_MODULESでインストール済みmodule rootを明示する。ネットワークやAndroid native bridgeは使用しない。

A_ROOTはreviewされたimmutable A candidateからschema.json/version.mjs/validate.mjs/tests/fixtures.mjsを揃えたdirectory、B_ROOTはimmutable Bのnative-inventory.mjs/inventory-contract.json/tests/node-xml-adapter.mjsを揃えたdirectoryとする。candidate-hash-pair.jsonのexact-byte hashes一致が前提。
QA_ROOT=prototype/vdraw-mobile-007/qa/phase1（コマンドはrepository rootから）。

```bash
python -m unittest discover -s prototype/vdraw-mobile-007/qa/phase1/tools -p 'test_*.py' -v
VDRAW_IR_ROOT="$A_ROOT" node --test prototype/vdraw-mobile-007/qa/phase1/tools/test_ir_independent.mjs
node prototype/vdraw-mobile-007/qa/phase1/tools/run-b-extraction.mjs "$B_ROOT" prototype/vdraw-mobile-007/qa/phase1/fixtures prototype/vdraw-mobile-007/qa/phase1/evidence
python prototype/vdraw-mobile-007/qa/phase1/tools/compare_b_inventory.py prototype/vdraw-mobile-007/qa/phase1/fixtures/generic-synthetic-g01.pptx prototype/vdraw-mobile-007/qa/phase1/evidence/generic-synthetic-g01.b-result.json prototype/vdraw-mobile-007/qa/phase1/evidence/generic-synthetic-g01.b-compare.json
```

Native/G02も同じcompareコマンドのfilenameを交換。B resultsは被検体出力であり、oracle expectedはoriginal ZIP/手計算truthからPythonで独立計算する。Bのoutput座標をGround Truthへ採用しない。
`generate-generic.py`はdeterministic fixturesを再生成する任意recipe。Native再生成は生成時刻によるpackage byte差があり得るため、正式入力は凍結PPTXを使用する。元source rootのweb/src/core.js/render.js/exporters.js（改変なし）を用意して:

```bash
node --experimental-vm-modules prototype/vdraw-mobile-007/qa/phase1/tools/generate-native.mjs "$VDRAW_SOURCE_ROOT" "$TEMP_OUTPUT_ROOT"
```

Oracleのsource xmlPathは独立にqualified-tag sibling indexを構成。container、hidden、background、root metadataを別分母にする。source不明future-objectのnonstandard direct cNvPrのIDはraw XML/pathで保全し、通常native IDの意味へ推測昇格しない。
Presentation relationship順を保持し、XMLファイルのlexical sortは全source inventoryを回る順にだけ使う。orphan slideを独立台帳へ残す。実multi-slide/map/master/theme対応はcoverage PENDINGであり、1枚fixtureの成功を全pptxへ一般化しない。

## Acceptance scope

source inventory matchだけではsupported target entity retentionやJw_cad PASSにならない。全numeric raw deltaとbudget authorityを分離し、app/tolerance unknownはnull/HOLDを維持する。Phase1製品Gate=HOLD。
未実装/未対象fixtureのcoverageはgolden-manifest.jsonへPENDING/BLOCKEDのまま残し、分母を削って成功率を宣言しない。
