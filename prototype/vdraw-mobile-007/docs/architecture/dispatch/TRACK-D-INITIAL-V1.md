[WORK_DISPATCH_V1]
instruction_id: VDRAW-4ROUTE-D-INITIAL-20261007-V1
project: dksc-camera-001-test
target_work: Track D / Paper Drawing Camera → Jw_cad
expected_branch: work/vdraw-paper-camera-jwcad-v1
expected_head: INITIAL_BASELINE_COMMIT_RESOLVED_IN_DISPATCH_MANIFEST
source_branch: work/vdraw007-photo-accuracy-20261006
source_head: 6c0facb34757a54ed37d08d94505129b0341ad66
task: paper-route-audit
execution_scope: Wave1 initial audit/contract/test plan only
Human Gate: product adoption HOLD; no Human approval substitution

開始時にGitHubから自branch/HEAD、source branch/HEAD、architecture docs、Evidence/test/006/SAVE-001/signing/issuesを再取得する。
expected_headは同階層DISPATCH-MANIFEST.jsonのTrack entryの値を正とする。進行済みなら新HEAD/HANDOFFを確認して重複実行しない。差異を上書きしない。
共通文書: docs/architecture/BASELINE-V1.md、DRAWING-IR-INITIAL-CONTRACT-V1.md、PHASE1-ACCEPTANCE-V1.md。

担当:
四隅/Perspective/Lens/denoise/line/circle/OCR/symbol/scale Evidence監査。根拠なし寸法生成・mm化は禁止。初回監査のみ。
Ownership:
将来新規 routes/paper/。今回は docs/architecture/tracks/D/ のみ。
他担当共通ファイルの変更は提案のみ。共通IR未確定領域はPROVISIONAL。独自IR禁止。
- main/validation/release/006変更禁止
- 固定署名/秘密値取得変更禁止
- SAVE-001/ENGINE-001/INPUT-001/OUTPUT-001/EXPORT_OWNER_RACE/coordinate/sourceBinding保護
- reset --hard/rebase/git clean/既存成果削除/Golden削除/test削除/skip追加禁止
- unsupported silent drop/AI Ground Truth/根拠なしmm/Vector不要Raster化/表示のみJw_cad PASS禁止
- APK生成/製品統合禁止
- 既存Work停止・再作成・保存済み成果再実行禁止

初回成果:
既存能力と欠落をsource path/関数/行/Evidence付きで整理。
新規component境界、再利用候補、unsupportedとfail-closed、必要Golden/意味のあるtest、IR依存、blocker、次の1実装単位を提示。
実装を実行しない。schema/testについてもまず契約案/計画を返す。
GitHubへ自branchの docs/architecture/tracks/D/INITIAL-AUDIT-V1.md と HANDOFF.jsonを保存する。
保存はbranch head比較付きfast-forward。競合時に上書き禁止。

[WORK_HANDOFF_V1]
instruction_id: VDRAW-4ROUTE-D-INITIAL-20261007-V1
project: dksc-camera-001-test
track: D
branch: work/vdraw-paper-camera-jwcad-v1
expected_base_head: <manifest expected_head>
head: <latest branch head after saving>
Evidence: <paths and hashes>
test: <existing evidence / new run / not run を区別>
product_phase_gate: HOLD
Human Gate: <必要/不要と対象scope>
blocker: <observed only>
next_action: <single bounded action>
