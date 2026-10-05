# VDRAW MOBILE 007｜性能・回帰 初回監査と試験計画
記録日：2026-10-05（日本時間）  
担当branch：work/vdraw007-performance-20261005  
判定：初回資料監査完了。全回帰・実機性能・製品受入は未完了。

## 1. 基準と今回の実施範囲
- repository：doudesyoupit-alt/dksc-camera-001-test
- 読取開始HEAD：1ec046fc1582803cf49716dcfa3330b06c21714f。専用branchとの一致をGitHub refで確認。
- 総括資料の参照SHA：1e3dd26184fa967fbf6798cb749b3705c64297dd。自branchへのmergeなし。
- main読取値：1181c0aeef3a152435cf005583d09a15f209bd0d。
- validation読取値：1ec046fc1582803cf49716dcfa3330b06c21714f。
- checkpointはtagではなくbranchとして確認：VDRAW-MOBILE-007＝開始HEAD、VDRAW-MOBILE-007-UI-CHECKPOINT＝e9a56b9f65ee4679ec83cc97cf67365d89f05e82。
- UI run 37282999062：e9a56b9f…、ui-smoke job成功。APK run 37283743856：開始HEAD、debug-apk job成功。
- APK runのui-smokeはworkflow条件によりskipped。これは「51件の試験skip 0」とは別のジョブ状態。APK生成successから全回帰を推定しない。
- ローカルgit checkoutは存在しない。認証済みGitHub APIと保存済みZIPを読み取り監査した。git clone成功・ローカルbranch操作・新規テスト実行とは主張しない。
- 今回の試験実行0、5000要素再実行0、重い画像処理0、APKビルド0。アプリ・006・workflow・既存テスト・既存manifest・checkpointの編集0。
- 提出物はこの新規報告とJSON台帳のみ。禁止された再実装、reset/rebase/clean、削除、skip追加は行わない。

## 2. 原本と再利用できる証跡
保存済みVDRAW-MOBILE-007.zipを読み取り専用の監査対象として確認。
- bytes：24,863,422
- SHA256：3d91a85c663bde84ceee89fcfa2192fb443c83ace43f1f154e0e329f1b475e46
- ZIP CRC正常、515 entry。原ZIPへの書込みなし。
- CI manifest 141/141、保護manifest 34/34のSHA256がZIP内の実bytesと一致。
- 同じ対象のGit blob SHAも開始SHAツリーと全件一致。ZIPの対象実装とGit開始コードを結び付けられる。
- 主要14関数一致は総括の既存performance-summaryとCI scope logの証跡を再利用。今回は関数検査の再実行なし。
- 過去006の437 manifest一致・ZIP SHAは救出監査記録の継承値。006原本全体の再照合を今回行ったとはしない。

| 証跡 | 対象・条件 | 再利用の範囲 | 候補統合後の扱い |
|---|---|---|---|
| integration-evidence/performance-summary.json | ZIP展開ソース、Node7本47件＋Python1本4件 | 限定51 PASS / FAIL 0 / skip 0の既存記録 | 関連変更の再試験が必要。全回帰の代用不可 |
| ui-007/final/UI-smoke-results.json | 007 UI、Chromium 154.0.8037.57、合成入力、390×844など | 11群の既存ブラウザ証跡。実機・実AIではない | 保存/候補/出力/表示に変更があれば再実行 |
| ui-007/output-structure.json | 007 UIの実生成3形式の軽量内部検査 | PPTX編集可能要素、DXF LINE/TEXT等、PDF2ページ | 形式競合・所有者修正後は新規生成から検査 |
| ui-007/final/performance-sentinel.json | 5000 rect、CPU4、各shell色変更3回 | 過去UI比較。再測定なし | 条件固定後の比較に参照。実機合格の代用不可 |
| output-light-006.json / output-structure.json | 005生成ファイルを006へ継承 | 歴史的出力の内部構造・継承説明 | 007の新規生成PASSには使わない |
| final-test-summary.json等 | 005/006時点、履歴資料、BLOCKED/NOT_RUNあり | 過去条件・未完了理由 | ファイル名のfinal/PASSを007全面合格と読まない |
| APK run 37283743856 / BUILD-007.md | 指定SHAのdebug APK | 生成元、package、版、内部資産検査 | 新APKの署名互換・端末上書き・OS操作は別検証 |

APK SHA256は既存記録89350a7e6d8471ba3bbe983dfaeefba477d6ad31519f1036105da5cf9af71d09を継承。今回はAPK本体再検査なし。

## 3. テスト資産の棚卸し
ZIPにはtests直下46ファイル（実行可能45本＋requirements-inspect.txt）。baseline005とbaseline006-uiのfixtureは試験入口に数えない。全入口のSHA256・対象契約・条件・実行状態を添付JSONに記録。

重要な不足：Git開始ツリーの007 testsにある実行入口はui-theme / ui-smoke / ui-performanceの3本だけ。ZIPの残る42本とrequirementsは007 Gitツリーにない。
package.jsonのtest:core、test:native、test:visionは、それぞれGitツリーにないtestを参照する。ZIPでは存在するため、保存場所の差を製品動作のFAILと混同しない。全回帰の実行環境をGit checkoutだけで作ると試験資産が不足する。

| 区分 | 対象 | 既存実行・重複 | 未実行・次工程 |
|---|---|---|---|
| 軽量Node回帰 | core 8、history-codec 4、native-io 5、native-shell 7、ui-theme 5、vision-contract 8、vision-provider 10 | 計47件。総括既存51件のNode部分。Native/Providerは境界模擬を含む | 関連修正の最小回帰→候補SHAで再実行 |
| Pythonプロセス制限 | bounded-process-005.py | 4件。51件のPython部分 | harness変更時の最小回帰、候補全回帰で適用性を確認 |
| 大容量Node境界 | changes-006、command-update-004 | 初回既存51から除外。削除/skipなし | 候補確定後に実行。command-updateは4993追加＋sampleで5000相当 |
| 保存ブラウザ | storage-safety-006、storage-extra-006、storage-conflict等 | 005/006既存証跡。保存/Undo/破損/競合の重複あり | 007候補に結び付ける新規検証が必要 |
| 007 UI | ui-smoke-007、ui-theme-007 | theme5件は既存47とCIに重複。smoke11群は別の検証単位 | 統合候補で実行。行数・群数をNode件数へ合算しない |
| 出力・入力ブラウザ/inspect | output-quality、output-regression、photo-pipeline、recovery-input、各inspect | 既存005出力やfixture依存。PPTX/DXF/JSONのみの旧試験もある | PPTX/DXF/PDFの候補生成→内部検査→必要な外部表示 |
| 性能 | performance*.mjs、clone-profile、segment-probe、render-export、ui-performance | Node、旧世代、UI、一回測定など条件が異なる | 今回未実行。対象・データ・harnessを固定して必要分だけ開始 |
| 旧版固定・補助 | native-assets-003〜006、product、inspect_outputs、旧UI test等 | 版/package/7形式/旧selector/既存artifact前提 | 007への直接実行不可または適用性未確定。原本を保持して別経路を設計 |

独立QA45件・エンジン20件・入力8件・theme5件は部分重複がある。51＋45＋20＋8等の合算禁止。
ZIP evidenceのJSON/logには同一bytesのコピーが20群ある。場所の違いを追加検証に数えない。JSONには全20群のhashとpathを保存。
4不具合の独立再現は既存回帰PASSと別に未解決として保持する。

## 4. 006 checkerと007検証経路の分離
006保護は「006の不変性」、007機能は「候補007の挙動」として別判定する。Web DB名は同じなので、新規originと合成案件を使い、006の実案件DBへ書き込まない。

| 経路 | 対象 | 今回の判断 |
|---|---|---|
| 006 scripts/check-ci-source.py | prototype006 / version6 / 0.6.0 / 006 manifest | 006保護用。007へ流用しない |
| 007に残る同名check-ci-source.py | 実際のassertは006のまま | 007製品checkerとして無効。007 workflowから呼ばれていない |
| native-assets-003〜006.py | 各旧版のpackage、cache、資産 | 元版の履歴検査。007の誤FAILを製品不具合としない |
| 007 scripts/check-ui-scope.py | 34保護file、14関数、outputを旧UIと比較 | 007 UI刷新時の不変性証跡。機能の正しさや全回帰は検査しない |
| 007 scripts/check-apk.py | 007 APK package/code/name/SDK/plugins/web bytes | 現workflowの実APK検査。端末操作・署名互換・出力結果は別 |
| 007の機能修正後 | ENGINE/INPUT/OUTPUTで保護file/functionが意図的に変わる | 現scope checkerは正当な修正にもFAILし得る。原manifestを書換えて緑化しない |

CROSS_TEAM_ISSUE：修正後の007に現check-ui-scope.pyをそのまま必須適用すると、正当なロジック差分を止める。総括・Android・独立QAで、006不変性ゲートと007承認差分検査を分離する検証経路を決める必要がある。今回はchecker/manifestを変更しない。
開始SHAの006 subtree SHA＝47cabdf70e9aebf7c64a1e028e85c476df32a169。候補では006 subtree同一、006 workflow不変、旧checkpoint ref不変を静的に確認する。006原本の全面機能試験を繰り返さない。

## 5. 各修正に対応する最小回帰（設計のみ）
開始条件：修正branch SHA、変更file、仕様、独立QA用再現手順が提出され、共有app.jsの変更順序が総括で確定していること。現在は実行しない。

| ID・主担当 | 最小入力/操作 | 合否条件 | 関連既存試験 |
|---|---|---|---|
| ENGINE-001 / エンジン | 外部JSON→validate→renderで1e308→0、通常0→180、0/360、負角、極端有限角。NaN/Infinityも別異常系 | 異常入力を仕様どおり拒否/正規化し、処理終了。通常0→180の49点と形状維持。watchdog timeoutはFAIL。原案件/Undo/保存は不変 | core、command-update、changes-006、history-codec。大容量ケースは候補ゲート後 |
| INPUT-001 / 入力 | 2000×1000候補を1200×800へpreview/adopt、非3:2画像、回転/切出しの宣言、保存再読込→3形式 | 座標空間/変換を保持。契約で意図した相対位置一致。原ページ保持。不明/矛盾座標は安全拒否。出力も一致 | core候補、vision-contract/provider、photo-pipeline、ui-smoke。模擬と実AIを別記録 |
| OUTPUT-001 / 出力・UI | deferred PPTX生成中にPDFへ切替、写真設定/ページ設定変更、通常3形式、例外/取消 | 開始時に固定した内容・MIME・拡張子・設定・履歴が一致。失敗/取消を成功記録しない。busy解除 | native-io、ui-smoke、出力inspect、保存安全 |
| EXPORT_OWNER_RACE / 出力・UI・エンジン | A生成中にBへ切替、Aを再編集、A保存を遅延、生成失敗/共有取消 | A生成物の所有者/名称/履歴はAに結合。Bのrevision/exports/geometry不変。開始revisionと出力契約一致。現画面へ誤った保存完了を表示しない | native-io、storage-conflict/safety、UI再読込 |
| Native/表示修正 / Android・UI | pause/resume/Back、権限拒否、picker取消、keyboard/回転 | 境界模擬の既存回帰に加え実APK/実機で確認。未接続や未測定を成功表示しない | native-shell/io、ui-theme、ui-smoke、Android受入 |

機能差分に伴う試験の新設/資産の復元は次工程の担当作業。本初回でテストを作成・修正・実行しない。

## 6. 統合後の全回帰計画と開始ゲート
全回帰開始は待機中。以下が全て確定するまで実行しない。
1. 総括が統合候補SHAを固定し、3修正群・4不具合に対する独立QAの結果と検証SHAを提出。
2. 006保護を確認。P0/P1残存なし。共有app.jsの競合解決をレビュー。
3. 不足する42試験入口の利用経路を確定：原ZIPのhash付き試験資産を専用の隔離harnessとして利用するか、追加保存するかを総括が決定。既存テストの無断削除/書換えはしない。
4. 旧版専用試験・旧selector・7形式期待・保存先書込み・既存artifact依存を事前に分類。007に適用する全caseのリスト、代替case、担当、hashを独立QAと総括が固定。FAIL後に試験を外してPASS化しない。
5. 正確なNode/Python/browser/OS版、依存lock hash、fixture hash、origin、タイムアウト、出力先、実AI有無を記録。browser不在はBLOCKED。exit0だけで合格にしない。
6. 007ロジック変更後も成り立つscope/CI経路を確定。既存baseline manifestは保存。

実行順序：
- 静的006保護/候補SHA/試験資産確認。
- 最小回帰と全適用Node/Python契約試験（除外していた大容量境界も含める）。
- 保存・復元・競合・破損・履歴・offlineの007ブラウザ検証。
- 入力/候補/編集/Undo/Redo/出力の連続導線、PPTX/DXF/PDFを同一案件から新規生成。
- 新規出力の構造・座標・名称・所有者・設定・日本語・寸法・複数pageの一致を検査。対象外形状や未実装属性を架空に保証しない。
- 計画された大容量/性能比較を1回の固定条件キャンペーンで実施。重い画像は寸法/bytes/処理経路/上限を別fixtureで固定。
- APK生成後にAPK SHA/生成SHA/署名・package・Web資産を確認し、実機保存→終了→復元→3形式→共有→入力→大容量をAndroid担当と確認。

合否：
- 事前固定した全適用case：FAIL 0、skip 0、cancelled 0、timeout 0、未実行0。BLOCKED/NOT_RUNをPASSへ変換しない。
- 保存/復元で図形・座標・文字・寸法・ページ・履歴を保持し、既存案件・破損原記録・別案件を壊さない。
- PPTX/DXF/PDFの内容・MIME・拡張子・案件所有者・設定・履歴一致。ファイル存在/100bytes超だけで合格にしない。
- 5000要素操作/保存/復元が成立し、5001は定義された上限で拒否、既存5000案件不変。複数pageの上限は実schema仕様に合わせる。
- P0/P1なし、006保護成立。OS共有/実AI/外部アプリ/実機をbrowser模擬で代替しない。
- 候補コードが変われば影響を再判定し、前SHAの結果を新SHAの全回帰合格として流用しない。
- performanceの目標達成と機能回帰合格は別のゲートにする。必要な受入範囲は総括で確定。

## 7. 性能比較の条件管理
過去sentinelは5000個のrect、390×844、Chromium 154.0.8037.57、CPU倍率4、色変更3回。
- 比較006中央値171.394ms、007中央値169.803ms、比率0.990714。
- firstDisplay：比較006 368.3ms、007 325.5ms。
- harness合否は色変更比率≤1.30、初回表示≤比較値×1.35+100ms、canvas面積増加、pageerrorなし。
- 100msはこのharnessのassertではない。sentinel PASSと100ms目標未達は同時に成立する。
- 「006」条件は007のwebコピーへbaseline006-uiの5fileを戻した比較。実006全体を固定した性能比較ではない。修正後007で同じ方式を使うと双方が修正後engineになり、engine退行が隠れる。
- 色変更時間はNode側performance.nowでPlaywright click→sheet非表示まで。画面の描画完了までの時間と断定しない。
- firstDisplayはbrowser側performance.now→double requestAnimationFrame。色変更とは時計/計測終点が違う。
- sample3の中央値は限定的な比較値。p95や統計的優位を主張しない。

次工程で比較条件を固定する：
| 項目 | 固定内容・合否 |
|---|---|
| ソース | 真の006原本/commitと候補007を別origin・別copyで固定。UI-only比較も行う場合は別結果にする |
| データ | 同じfixture hash、500/2000/5000。rect sentinelと混合線/文字/寸法/複数page/画像fixtureは別結果 |
| 実行環境 | 同じbrowser build、OS、viewport390×844、DPR、CPU倍率、lock。端末比較は同じ端末/OS/WebView/向き/温度状態 |
| 操作 | 初回表示、選択、色変更、Undo/Redo、保存、復元、pan/zoom。操作終点と描画完了を分ける |
| 測定 | 過去値への直接比較は従来harness/3回条件を維持。新計測はwarm-up1回＋計測10回を固定しp50/p95/raw値を別記録。旧値と混合しない |
| 相対基準 | 従来sentinelの比率/初回表示式を同条件比較に適用。基準変更は試験前に総括・QAで固定 |
| 絶対基準 | 5000要素の色変更中央値≤100msを目標達成条件とする。旧計測条件・新描画完了条件・実機を分けて判定 |
| データ安全 | 計測前後geometry一致、save/reload一致、pageerror0、タイムアウトなし。速度だけで合格にしない |
| 大容量画像 | 入力寸法/bytes/形式/回転/縮小条件/メモリを別管理。上限外入力は安全停止し案件不変。数値予算を事前確定するまで性能合格を出さない |

性能目標は未達のまま保持。実機値は未測定。旧18case、Node CORE、UI sentinel、Androidを一つの比較表へ混ぜない。測定失敗時の反復は原因と再実行必要性を確認してから行う。

## 8. 総括への提出・残課題
提出：再利用証跡、全46資産の分類台帳、同一bytes20群、最小回帰、全回帰開始/合否条件、性能条件表。
総括へのCROSS_TEAM_ISSUE：
- PERF-REG-001：007 Git開始ツリーには42試験入口が未収録。package scripts3本の参照先も未収録。回帰の再現経路を固定する必要。
- PERF-REG-002：現UI-only scope checkerは予定される機能修正と両立しない可能性。006保護と007承認差分を分離する必要。
- PERF-REG-003：既存性能harnessの006はUI復元比較。真の006固定比較を用意しないとengine退行を検出できない。
- PERF-REG-004：全回帰に旧版checkerを無条件で含めると誤FAIL、未適用testをskip扱いするとskip0要件と矛盾。適用case/代替caseを実行前に固定する必要。
現在の待機条件：統合候補SHA・関連修正の独立QA結果が未確定。全回帰は未実行。
資料監査の完了とアプリの受入完了を区別する。main/validation反映・新APK・実機PASSは本報告の成果に含めない。
