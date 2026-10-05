# VDRAW MOBILE 007 P1修正ラウンド1 統括報告 20261006

既知4件のP1は独立ソフトウェアQAで解消。新APK・validation反映はBLOCKED（全回帰未完了、署名更新互換性未証明）。実機受入完了ではない。

## 統合基準・成果

repository：doudesyoupit-alt/dksc-camera-001-test
開始基準：9c1dcdf8d87e32a9f0d86996c210a8a4b7ebb2fc
新checkpoint branch：work/vdraw007-integration-round1-20261006
実際の回帰試験候補HEAD：25825894400b18fe7567dd4bbd07ae4331ae1168
独立QAコード候補HEAD：3b9a37f146c728e65a8998b6f5e21edeb6c37313
本報告の追加はdocsのみ。5既存runtime＋新export-jobs＋SWは独立QA候補から不変とSHA256で照合。現在の基準branch work/vdraw007-integration-20261006は9c1のまま保持。

| 担当 | 専用branch | 採用HEAD |
|---|---|---|
| Engine | work/vdraw007-fix-engine-001-20261006 | a1464c1abbf27bba5d8fc04b94165fbe7a32fe84 |
| Input | work/vdraw007-fix-input-001-20261006 | c8cffe8950ed39faa2efa9842ac26f8b753516c2 |
| Output | work/vdraw007-fix-output-race-20261006 | d0cc49833482855469e341ca557a68a68d4f4c45 |
| IndependentQA | work/vdraw007-qa-round2-20261006 | 15d223faa98cd97ae53a72b4daa13b5ffd681624 |
| Regression | work/vdraw007-regression-assets-round1-20261006 | 03610a3e6f8ab59bb74c5366724fd0528c65f494 |
| Android | work/vdraw007-signing-audit-round1-20261006 | 50730045d4979b68b06cc9b2afb18f36baf72e0f |

各commitをGitHub compareと変更ファイルのローカルGit blob照合で回収。制作側のPASS文言のみで採用完了にしない。変更は007の所有領域と新テスト/資料のみ。Android MDは末尾改行1byteだけローカルと異なることを確認し、リモートblobを正本として採用した。

統合順：Engine→Input→Output→SW結合修正→恒久回帰資産→独立QA→Android公開資料。Input/Outputが共有するapp.jsは基準を挟んだ三者mergeで双方の変更を保持し、実コードテストで確認。新export-jobs.jsがofflineで欠けないようSW precacheへ追加し007専用cacheを更新。既存006 SW/案件DBへの変更なし。

## 4件のP1と責任範囲

| ID | 修正内容 | 独立QA結果 |
|---|---|---|
| ENGINE-001 | 入力/import/Editor/保存復元で非有限・極端角度・異常span・不正arcを原子的拒否。点生成は定数回処理。raw不正arcは描画/選択/hitを安全省略。正常/負角/全周/720度を維持 | 元1e308・1e20条件 BEFORE FAIL→AFTER PASS |
| INPUT-001 | sourceWidth/Height、coordinateSpace、元案件/ページ/画像binding、contain scale/offset保持。previewは候補frame、採用は対象frameへ明示変換。未知/欠落/別画像・別ページを拒否 | 元2000×1000→1200×800条件 BEFORE FAIL→AFTER PASS |
| OUTPUT-001 | 形式・設定・図面・file名/ext/MIME・履歴を開始immutable snapshotに固定。途中UI変更をjobへ混入させない | PPTX/DXF/PDF各snapshot・途中設定変更 BEFORE FAIL→AFTER PASS |
| EXPORT_OWNER_RACE | 一意job IDとsingle-flight ownership。A→B→A、revision/図形編集、OS受渡し/保存待ちの所有者切替でも別案件へ結果・履歴・画面を上書きしない | 元案件A生成→案件B切替、および追加境界 BEFORE FAIL→AFTER PASS |

既存正しい図形/入力の回帰、保存復元・Undo/Redo、実PPTX/PDF/DXF packagerを対象試験で確認。PDF画像描画/OS共有はfixtureまたはplugin境界模擬を含み、実ファイルアプリ/実Androidの品質PASSではない。

## 独立QAの前後証跡

同じV2 harness SHA256：
c18515bde6f5b8ab7e92c3f9c56ef53fcbe21ba68c19c57c8750dc865d297e48

31ケース：BEFORE 6 PASS / FAIL 25 / skip 0 → AFTER 31 PASS / FAIL 0 / skip 0。
原4件の再現条件を変えず再検証。正常対照を維持し、制作テストのコピーだけに依存しない。

V1はAFTER 26 PASS / FAIL 5で、不正rawarcの安全な[]拒否を許容しないQA契約だった。これを隠さず元コードtxt・元結果・BEFOREを保存。総括が安全な拒否を認める判定訂正をQAへ差し戻した。V2も31ケース、正常arcの49有限点・描画・hit条件を維持。無効arcは[]/明示例外と安全省略を検証。ケース削除/skip追加なし。V2を同じSHAでBEFORE/AFTER両方実行した。

証跡：evidence/qa-round2/BEFORE-baseline-9c1-v2.json、AFTER-3b9a37f-v2.json、AFTER-3b9a37f-exact-original.json。QA資料とV1原文fixtureも保持。

## 関連・全回帰

限定回帰：
- Node：167 PASS / FAIL 0 / skip 0。
- Python bounded-process：4 PASS / FAIL 0 / skip 0。
- 計171単体ケース（31独立QAを含む）。Android source静的検証は別途PASS。
- 16入口 PASS / FAIL 0 / BLOCKED 0 / skip 0。担当別試験数やBEFORE/AFTER/全回帰を重複加算しない。
- offline imported application graphもPASS。実ブラウザオフライン動作の代替とはしない。

全回帰を同じ候補SHAで実行：
- 17入口 PASS / FAIL 0 / BLOCKED 29 / skip 0。
- BLOCKED：browser25入口＋生成出力に依存するinspector4入口。
- browser executableなし。通常権限Playwright取得が0MiB/不正ZIPで失敗。再取得を繰り返さない。
- Node core性能harnessはPASS。ただし真の006対007 browser性能比較はNOT_RUN。
- suiteComplete=false。FAIL0/skip0だけで全回帰合格とは扱わない。原UI-only checker/保護manifestを書換えて007修正差分を隠さない。将来ビルドでは006不変確認と007承認差分検査の区別が必要。

恒久資産：
Git未収録47件（42実行入口、requirements1、baseline005fixture4）を原ZIPとバイト一致で復元。007版checker/マニフェスト/runner追加。過去45入口は保持し、旧版固定6入口の007適用対応を実行前manifestへ明記。原入口を削除・skip化しない。生成log/export/APK/node_modulesは収録しない。原55資産のSHA整合検査PASS。runnerは新*.test.mjsを自動発見し、環境BLOCKEDをPASS扱いしない。

## 006・既存成果保護

006 subtree：47cabdf70e9aebf7c64a1e028e85c476df32a169 → 47cabdf70e9aebf7c64a1e028e85c476df32a169（一致）。
既存Git test blob18件：内容/数を維持。全tests配下blobは74件へ増加。
main / validation / 既存checkpoint / 既存7担当branch / 前回統合branchは不変。新修正/調査/統合branchのみ更新。reset/rebase/clean/既存成果削除/checkpoint上書き/test削除/skip追加なし。
006保護はGitソース不変PASS。未実行の006実機/全性能回帰をPASSへ拡張しない。

## 署名・APK

旧APKのManifest/v2公開証明書・run/job記録を直接照合：
- applicationId jp.dksc.vdraw.prototype007、versionCode 7、versionName 0.7.0。
- SHA256 89350a7e6d8471ba3bbe983dfaeefba477d6ad31519f1036105da5cf9af71d09
- 公開証明書SHA256 c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855
- 旧生成run37283743856、生成元validation1ec046fc1582803cf49716dcfa3330b06c21714f。

これは配布参照APKの確認。実端末のinstalled identity/証明書はNOT_VERIFIED。既存秘密鍵はNOT_RECOVERED。固定signingConfigs/鍵復元・保全step/配布鍵artifactが確認できず、上書き更新互換性はBLOCKED。新鍵作成/アンインストール/データ消去なし。

P0検出0 / 既知P1残0（今回ソフトウェア検証範囲）/ P2未確定。
署名互換性と全回帰が揃うまで新APKを作らない。新workflow起動なし、APK NOT_GENERATED、validation反映なし。
