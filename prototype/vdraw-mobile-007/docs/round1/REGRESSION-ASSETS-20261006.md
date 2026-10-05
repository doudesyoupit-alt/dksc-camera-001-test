# VDRAW MOBILE 007 回帰資産復元・実行契約

Repository: doudesyoupit-alt/dksc-camera-001-test  
Branch: work/vdraw007-regression-assets-round1-20261006  
開始HEAD: 9c1dcdf8d87e32a9f0d86996c210a8a4b7ebb2fc

## 判定

回帰資産の未収録47ファイルを原文のまま復元する。機能修正、006変更、既存入口の削除・編集、skip追加、APK生成は行わない。本担当の完了は資産の再現可能性の回復であり、P1解消・全回帰合格を意味しない。

## 永続資産と一時成果の分離

原ZIP SHA256: `3d91a85c663bde84ceee89fcfa2192fb443c83ace43f1f154e0e329f1b475e46`。

ZIP tests以下は55ファイル。直接入口45（mjs/py）、Python検査用requirements 1、baseline005 engine fixtures 4、baseline006 UI fixtures 5。開始GitにはUI入口3とbaseline006 UI fixtures5の計8しか存在しなかった。差分47 = 実行入口42 + requirements1 + baseline005 fixture4をすべて原文復元する。各入口を読み、恒久的な操作/保存/出力/入力/性能/構造検査であること、生成データ自体ではないことを確認した。

生成log、evidenceのJSON/画像、出力PPTX/DXF/PDF/XLSX、APK、ZIP、node_modules、run copy、Python cacheはGit追加しない。入力画像や候補の多くは各harness内でその実行時に合成される。evidence/vision-protocol-fixture.jsonもprovider testが生成する一時依存であり、古い出力をfixtureとして混入させない。

`tests/regression-manifest-round1.json` は全55資産のSHA256、開始Git有無、45元入口のcommandと依存、分類、旧版との対応を記録する。SHA検査は全資産がZIP原文と一致したことを確認する。テスト数減少なし、assertion編集0。

## 旧版入口の適用性

| 元入口 | 現007検証 | 理由 |
|---|---|---|
| native-assets-003/004/005/006.py | 新native-assets-007.py | 元入口は各過去applicationId/Java package/PWA cache名を固定している。007に旧IDを要求すると版違いで失敗する。新入口は007のidentity、keyboard、rotation、backup、mixed-content、SW境界を検査し、`--check-assets`でweb/Android同梱asset全39ファイルとconfigの一致を別に検査する。 |
| storage-extra-005.mjs | storage-extra-006.mjs | 005→006 DB名正規化後、require/executable fallbackと出力名以外はassertion/ownership内容同一。007の保存エンジンは006 DB名を維持している。既存006入口をそのまま実行する。 |
| gestures-update.mjs | 新gestures-update-007.mjs | PWA 002 cache/version文字列のみ007へ置き換える。全assertion、selector、操作、保存→更新→再読込検証を保持する。元入口は原文のまま保存。 |

この対応は「失敗したテストを消す/skipする」ものではない。旧版限定identityは原入口の対象が007と異なるため事前に識別する。現版の同じ契約を対応入口で検査する。対応入口がFAIL/BLOCKEDなら全回帰不合格。版に依存しない41現版入口をmanifestから順次実行する。加えて専門担当の新`*.test.mjs`を自動発見する。

`native-io-005.test.mjs` はcache path `vdraw-005-exports/`を要求するが007実装自体がそのpathを保持するため適用可能。storage-extra-006も006 DB名が実007の契約であり、ラベルだけを機械的に007へ書き換えない。

## 実行順と出力依存

Node core/commands/history/native/vision/UI → bounded process/native static/Node性能 → product → output-regression → recovery-input → vision-flow→protocol inspector → photo-pipeline/output-quality→output structure → product/output-regression成果のPPTX/DXF/PDF/XLSX inspector → render-export→inspector → gesture/storage/UI/smoke → 大容量性能/診断。

依存ファイルは同一run copyで先行入口が生成したものだけ使用する。先行入口BLOCKED/FAILは後段にもBLOCKEDとして記録する。出力inspectを過去成果でPASSにすることはない。

## runner

プロジェクト007ディレクトリで以下を実行する。`--source-sha`は取得済み候補の実SHAを総括が渡す。runnerは渡したSHAのコードを取得/検証する機能を持たず、総括が候補取得とGit差分確認を行う。

```sh
python3 scripts/run-regression-round1.py --profile assets --source-sha <candidate-HEAD>
python3 scripts/run-regression-round1.py --profile limited --source-sha <candidate-HEAD>
VDRAW_CHROMIUM=/absolute/path/to/chrome python3 scripts/run-regression-round1.py --profile full --source-sha <candidate-HEAD> --include-native-assets
```

runnerは独立temp directoryへsource/tests/scripts/nativeをコピーし、evidenceを空で作る。原テスト/既存evidenceは変更しない。`/tmp/chromium`固定の元入口を実行する場合だけ、その実行用コピー内の`executablePath:'/tmp/chromium'`を`executablePath:process.env.VDRAW_CHROMIUM`へ変換し、変換一覧をsummaryに記録する。assertion/selectorは変更しない。既存/tmp/chromiumは上書きしない。

full出力にはPASS/FAIL/BLOCKED/skipと`suiteComplete`を別記する。BLOCKEDが1つでもあれば非zero終了。元performance-final-006の「ブラウザなしでもexit0」という挙動は生成evidenceのBLOCKED verdictを読むことで不合格へ扱う。limited PASS/skip0をfull PASSへ読み替えない。各logと生成evidenceはrun directoryに保管し、Gitに追加しない。

## 性能・006保護は別ゲート

`ui-performance-007.mjs`はcandidate engineのままUI5ファイルだけ006へ戻す比較であり、P1修正後は真の006を示さない。`performance-final-006.mjs`の006ラベルも現在candidate engineを指す。両方を実行してもtrue006性能比較完了とは判定しない。

manifestの`true006Reference`に開始Git006 web全blob SHA、006 subtree SHA、5 UI fixture mappingを記録した。fixture5はGit006 blob完全一致を確認。真の006は修正前の不変sourceからGit006 webで列挙されたファイルだけを作り、差分4filesをこのfixtureから復元し、全Git blobを確認して形成する。修正後candidateにUIだけ差替えて006と表示することは禁止。比較は実006と実候補を同browser、viewport390x844、CPU条件、500/2000/5000、操作・反復回数を固定して実行する。Node CORE時間をChromium UI時間やAndroid実機時間と比較しない。

既存scripts/check-ui-scope.py/保護manifestは007 UIだけの変更を許す古いscope契約である。今回の承認済みengine/input/output修正へ適用して偽PASSになるよう変更しない。006 subtreeのGit SHA不変を総括が独立確認し、007差分は担当境界/承認内容として確認する。check-ci-source.pyも歴史的な固定source digestゲートであり、今回追加テストを含む収録完全性は新inventoryで検証する。

## 今回の検証

- ZIP→local 全55資産SHA一致、元45入口をmanifestから欠落なし、Python/JavaScript syntax: PASS。
- runner assets profile（開始HEAD）: PASS1 / FAIL0 / BLOCKED0 / skip0、suiteComplete=false。
- native-assets-007 source/static＋同梱asset parity（開始HEAD）: PASS、web39files一致。
- newrunner Python syntax／newPWA入口Node syntax: PASS。
- P1修正後の限定・全回帰: 総括の候補統合待ち。実装前全回帰は先行実施しない。

## 環境BLOCKER

NODE/Python利用可。Python inspector依存ezdxf/openpyxl/fitzインストール済み。Runtime Playwright利用可、Chromium実行ファイルなし。`/tmp/chromium`は空placeholder。標準CLI `playwright install chromium`を通常権限で1回試行したが配布は0MiB、ZIP中央ディレクトリ欠落で失敗（CLI既定の内部5再試行すべて同症状）。繰り返し取得しない。

`BROWSER_EXECUTABLE_UNAVAILABLE`によりブラウザ25現版入口は現環境BLOCKED。必要な環境手段は許可された経路で取得済みChromium binaryの配置、またはブラウザ入りの認証済みCIで候補SHAを固定してこのmanifest実行。存在する旧workflowのsuccess/job skippedや旧51 PASSは今回full結果ではない。Android adb/device、署名更新互換性は別担当の証明待ち。
