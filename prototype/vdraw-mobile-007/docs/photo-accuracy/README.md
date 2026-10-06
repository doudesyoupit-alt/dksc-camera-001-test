# 評価準備の実行

製品releaseは0.8.2のまま保持。このbranchは新APKを生成しません。

```sh
python3 -m pip install -r scripts/photo-eval-requirements.txt
python3 scripts/photo-eval.py preflight --manifest docs/photo-accuracy/golden-manifest.json --dataset-root /private/approved-golden --output evidence/photo-accuracy
node server/photo-eval-provider.mjs
```

上記はネットワーク要求0。現manifestは写真0枚なのでaccuracy-report.jsonはBLOCKED、精度nullです。準備試験のPASSを認識精度PASSへ変更しません。

認可された写真を受領後、原本をそのまま保全し正規化PNGを別pathへ作ります。

```sh
python3 scripts/photo-eval.py normalize --image /private/approved-golden/originals/PHOTO.jpg --output /private/approved-golden/canonical/PHOTO.png
```

元写真・canonical SHA、固定split/難度/captureGroup/device、HUMAN_CONFIRMED正解注釈をmanifestへ登録します。GTの形式と認可はGOLDEN-SET-SPEC.md参照。原写真とprivate datasetはrepoへcommitしません。

実provider設定と写真単位認可が揃った場合のみ:

```sh
node server/photo-eval-provider.mjs --execute-real-ai --manifest /private/approved-golden/manifest.json --photo-id PHOTO --dataset-root /private/approved-golden --output-directory /private/approved-golden/runs/RUN
python3 scripts/photo-eval.py evaluate --manifest /private/approved-golden/manifest.json --dataset-root /private/approved-golden --output /private/approved-golden/evaluations/RUN
```

runnerの候補/provider-run SHAをmanifestへ登録してからevaluateします。最初のevaluateで元写真Overlayと測定値を出し、人間確認後にOverlay SHA・推論SHAを結んだreviewを登録して再評価します。修正は最終成功率の分母から除外しません。既存製品未接続・品質/校正/Round-trip不足のため現段階のrunnerはreleaseを承認しません。
