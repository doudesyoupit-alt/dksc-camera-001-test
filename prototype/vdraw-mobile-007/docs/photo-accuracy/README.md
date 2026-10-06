# Photo100 第一次ネット実写真10枚

SAVE-001は0.8.2実機SAF確認によりCLOSED。PHOTO-PPTX-001はcontain修正・限定回帰・独立QA済み。製品release APKは0.8.2を保持し、このbranchは新APKや署名鍵を生成しません。

取得10枚／実AI0枚。Easy1・Normal4・Hard5・Extreme0。Development6・Validation2・Blind Holdout候補2（未凍結）。画像の取得ライセンスとhashはinternet-source-registry.json、再配布creditはINTERNET-PHOTO-LICENSES.md。注釈済み・watermark・向きなどのsource制限を保持します。

```sh
python3 -m pip install -r scripts/photo-eval-requirements.txt
python3 scripts/photo-golden-acquire.py --seed docs/photo-accuracy/internet-pilot-seed.json --output evidence/photo-pilot
python3 tests/photo-internet-safety.test.py
python3 scripts/photo-pilot.py --manifest docs/photo-accuracy/golden-manifest.json --dataset-root evidence/photo-pilot --output evidence/photo-accuracy
node scripts/photo-pptx-pilot.mjs --dataset-root evidence/photo-pilot --output evidence/photo-accuracy/export-assay.json
node server/photo-eval-provider.mjs
```

acquireだけが公開Commons画像を取得します。原JPEGを保持、EXIF向き適用・RGB・max1600・metadata除去のPNGを別に生成。元画像とcanonical hashは固定pin不一致で停止します。その他はローカル処理で外部AI送信0。既存出力を再利用する場合、原本hash不一致を上書きで隠さないでください。

品質は暫定画素heuristic。2枚RETAKE_REQUIRED、8枚NEEDS_REVIEW。Camera本番接続・撮影品質判定精度・glare/far/occlusion/motion精度は未測定。PPTX10枚のcontain／native矩形配置PASSは輸出座標検査のみで、写真認識、PPTX総合忠実度、Office開封、Round-trip成功の証拠にはしません。

Scene／Detection／Segmentationは製品から未接続、私用HTTP adapterはPARTIAL。OCR未実装、GeometryはHEURISTIC/PARTIAL。GTなし、推論候補なし、元写真とのAI Overlayなし、修正回数・時間なし。各写真の段階別BLOCKED／未測定をPILOT-10-RESULT.jsonに保持。正式KPIは全NOT_MEASURED、Releaseおよび100枚への拡張はHOLDです。

実provider、写真の外部送信／費用認可、品質確認、信頼したGTが揃った場合だけ既存photo-eval-provider.mjs --execute-real-aiを明示実行します。模擬応答を実推論へ昇格しません。実寸根拠なしはUNSCALED、Human correctionは分類／輪郭／位置／色／文字／形状差分のledgerへ記録し、外部送信や自動学習は承認なしで実行しません。

現在CI結果は当該commitのVDRAW Photo Accuracy Integration runが原本です。INTEGRATION-STATUS.jsonの試験数はlocal独立QAスナップショットで、認識完成率に加算しません。追加のユーザー実機操作は不要です。
