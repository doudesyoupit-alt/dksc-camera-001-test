# 実写真→実用図面評価契約 v1

基準製品: `15bf3371bec3f7d1e4090e7198a850c5636baf3f` / 0.8.2 / versionCode 10。
0.8.2配布物はACCEPTED。SAVE-001実機受入はOPEN。ユーザー確認前にCLOSEDへ変更しない。
本branchは監査・評価準備のみ。製品アプリ、署名、Secrets、006は変更しない。

## 最上位目標と報告

最終目標は実務精度100%。目標を90/95/99%へ下げない。重大False PASSは0。
コード・UI・fixture成功を製品完成率へ換算しない。未測定はnull/N/Aであり0%や100%ではない。
写真→実AI→編集可能図面→元写真Overlay→人間確認→少数修正→実用出力を全体の成功単位とする。
寸法はUNSCALEDを既定とし、根拠のないmm生成を禁止。CALIBRATEDはUSER_INPUT/KNOWN_OBJECT/MARKER/SCALE/AR/MULTI_VIEW、原資料hash・対象範囲・単位・不確実性を保持して検証する。既存製品の写真全域校正は未実装。

正式報告は実写真総数・実AI枚数・難度別枚数、Recall/Precision/IoU/輪郭・位置・角度・形状/OCR/寸法/UNKNOWN適正率/重大見逃し・誤認識/無修正率/修正回数・時間/PPTX・DXF忠実度/Round-trip/端末別/実用図面成功率を先に置く。自動回帰・FAIL/BLOCKED/skip/P0/P1/006はその後。ベンチマーク準備CIの成功は認識精度PASSを意味しない。

## データ分割と漏洩防止

認可済みの施工実写真だけを正式資産にする。UI画面・アイコン・出力図面・合成画像は除外。
Development/Validation/Blind Holdoutを固定し、原写真SHAと正規化PNG SHA双方の重複を拒否。同じ撮影対象・現場・連写・別crop・再圧縮はcaptureGroupを共有し、splitを跨がせない。別ファイル名での水増しを禁止。似た写真の検出は人間確認も必須。
Easy/Normal/Hard/Extremeは推論前に決める。10枚は故障探索pilotであり母集団精度の証明ではない。Easyだけの結果で全体を主張しない。
初期10枚の割当はpilot-plan.json。12対象を複数対象写真で包含する計画。10枚へ届いたかは実ファイル・GTを検証後に数える。計画slotは実写真枚数へ含めない。
50→100→数百は基本Failure修正後。Holdout失敗を修正に使った場合は既知Validationへ移し、別の未閲覧Holdoutを確保しversionを更新。平均値だけでなく写真単位の悪化でreleaseを停止する。

## 認可と安全な実プロバイダ経路

画像は原本を保全し評価専用コピーをEXIF補正・RGB PNG化・最大辺1600へ正規化。出力メタデータは除去。これは製品importerとの同等性の証明ではない。GT/Overlayはcanonical-photo-pixelsに固定。
写真利用・外部送信・費用の認可を写真単位で明示する。既存の署名5Secretsとは別の私用provider設定を環境から読む。秘密値はブラウザ/repo/log/artifactに保存しない。読み取り診断は存在booleanとmissing名のみ。
server/photo-eval-provider.mjsは既存Claude→SAM adapterを再利用。明示的--execute-real-aiと写真単位同意が揃った時だけ実fetch。自動再試行・採用・学習・補正差分の外部送信なし。GTはproviderに送らない。redirectは拒否。候補hash、写真hash、model、実network呼出し・stage・応答statusを記録。
実行証跡はLOCAL_RUNNER_RECORDED_NOT_PROVIDER_ATTESTEDであり暗号学的provider証明ではない。executionKind文字列だけの自己申告を正式精度証拠にしない。runner/test権限を分離しCI run・コードhashと原成果をQAが照合する。
この準備versionでは信頼したcapture/GT本人証跡と認証済み実行成果を照合するauthorityは未実装。実写真総数/実AI枚数は正式には0、formalMetricsは全てnullを維持する。JSON自己申告とhash整合はclaimedPhotoRecords/claimedProviderRecordsと写真単位diagnosticsだけに記録する。合成10枚を手書きの200応答証跡で実AIへ昇格できない。authority実装後も全Holdout完測と指標別coverageが揃うまで正式平均を出さない。
canonical PNGは外部送信前にIHDR/IDAT/IENDのみを許容しCRC・RGB8・非interlace・最大1600・zlib decode長とscanline filterを検査。EXIF/text/ICC等metadata入りを拒否。手動quality確認は自動Camera Quality Gateの代替として製品合格へ計上しない。runnerはmanualQualityApproved=trueを必須とし、1写真1run lockを送信前に作成。失敗時も自動再試行しない。
この環境の4設定は未設定。接続済みと主張しない。認可画像・正解GTがない状態で実推論しない。

## Ground Truthと写真ごとの評価

GTは人間のHUMAN_CONFIRMED、reviewerId、photoId、canonicalSHA256、coverageReviewed、realPhotoVerified、photoOrigin、width/height、canonical-photo-pixels、objectsとqualityReviewが必要。対象にid/category/kind/x/y/w/h/points/text/angleDeg/uncertainty/criticalを付与。見えていない部分を創作しない。
KNOWN/UNCERTAIN/UNKNOWN/OCCLUDED/LOW_QUALITY/RETAKE_REQUIRED/NEEDS_REVIEW/MEASUREMENT_REQUIRED/HUMAN_CHECK_REQUIREDを扱う。上流の不確実性を下流で自動CONFIRMEDへ昇格しない。現providerにはstage別confidence契約がなく不足として記録する。
物体は同一座標の実輪郭をpixel mask化しIoUを測る。bbox IoUを輪郭IoUへ読み替えない。対応は一対一最大対応数・IoU、誤分類は検出とは分離。対応用閾値は故障探索用で製品合格基準ではない。
位置・輪郭誤差はcanonical px。mmは校正根拠・同一面・誤差伝播が検証できる時だけ別評価。角度は注釈された無向方向を180°周期で比較。OCRは日本語NFC CER、空の注釈から精度を作らない。UNKNOWN適正率は人間GTの不確実性を基準にし、UNKNOWNの乱用をRecall・分類・無修正率と併記する。
無対象のGT、予測ゼロ、未解析・撮り直しを100%合格へ変換しない。正式精度はFROZEN Blind Holdout中心。指標ごとに測定枚数/全Holdout枚数を併記し、不完全な集計から完成を主張しない。

## Overlay・人間修正・実用出力

元写真へAI輪郭（赤）とGT（緑）を重ねる。Overlay SHAを人間reviewへ結び付ける。図面単体の採用操作は一致確認の証明にならない。
reviewはphoto/推論/Overlay hash、overlayReviewed、correctionCount/correctionTimeSeconds、全corrections差分を要求。差分に対象id、分類/輪郭/位置/色/文字/形状のbefore/after、操作時間を保存。ユーザー承認なしの外部送信・自動学習は禁止。
製品のAdopt→Editor→Save/Reload→PPTX/DXF/PDF座標忠実度は実写真ごとに追跡。生成ファイルのhash・図形数・位置/形状/文字/サイズ/角度を検査し、PowerPoint/CAD等の実アプリで編集可能性・警告なしを確認。未実施はnull。PPTX/DXF Round-tripと複数端末評価は現時点で未実証。
非3:2写真のPPTX includePhoto伸長は次期releaseの修正必須課題。既存53回帰がPASSでも写真Overlay忠実度の証明ではない。

## Release Hard Gate

SAVE-001実機未受入、実UI AI未接続、品質gate未実装、重大見逃し/誤分類/False PASS、根拠なし実寸、座標破壊、重大Round-trip破損、人間Overlay未確認、未測定の重要指標はreleaseを停止。
評価環境は測定結果を出すが新APKを承認しない。正式成功率の分母は全認可済みHoldout写真。拒否/UNKNOWN/未処理を除外しない。モデル/Prompt/OCR/Geometry/Coordinate変更時は全Goldenを再実行し写真単位diffをQAする。
次工程: 0.8.2 SAF一項目確認→実写真/正解GT/実providerの確保→pilot10枚→原因別修正・独立QA→50枚。AI側で可能な監査と試験をユーザーへ返さない。
