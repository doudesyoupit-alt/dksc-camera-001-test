# VDRAW 4-Route Coordinator 初回報告 V1

初回8項目の設計・指示作成とTrack A〜Gの初回並列Dispatch・成果回収を完了。初回監査/計画の完了であり、製品実装・受入PASSではない。

- 現在開発HEAD: 6c0facb34757a54ed37d08d94505129b0341ad66。
- 安定0.8.2 HEAD: 15bf3371bec3f7d1e4090e7198a850c5636baf3f。
- Architecture baseline: 9ae8e1b4137cbb4a65f630e2501a94af6cb826ad（コード基準は上記開発HEAD）。
- 総括branch: work/vdraw-four-route-coordinator-v1。各TrackのEvidence/HANDOFFをこの総括branchにexact blobで集約。元専用branchも維持。
- Drawing IR: 初期契約作成・専門レビュー済、正式schema/version/hashはPROVISIONAL。
- 4 Route Capability Matrix、Component ownership、専用branch方針、依存Map、Phase1 Acceptance、初回コピペ指示7件は保存済。

| Track | 担当 | 専用branch | 保存HEAD | 初回判定 |
|---|---|---|---|---|
| A | Drawing IR / Architecture Contract | work/vdraw-drawing-ir-v1 | b023fdc1a0dacd1d9280db3af2b3ad4da17f3609 | 監査/計画完了のみ |
| B | PPTX → Jw_cad | work/vdraw-pptx-jwcad-v1 | 595cb93a6b7f797cffcbcbc9caf858e695c5e932 | 監査/計画完了のみ |
| C | PDF → Jw_cad | work/vdraw-pdf-jwcad-v1 | da04782922dd48524366d8b564efc5f2ec512ff0 | 監査/計画完了のみ |
| D | Paper Drawing Camera → Jw_cad | work/vdraw-paper-camera-jwcad-v1 | 1708d4015e51285e763f58394f9e5921c4bef081 | 監査/計画完了のみ |
| E | Camera Quality / Guidance | work/vdraw-camera-quality-guide-v1 | a15bbe1e8ad9a156937d41e4bbcddfc738be0bdb | 監査/計画完了のみ |
| F | Field Photo → Editable PPTX | work/vdraw-photo-editable-pptx-v2 | d95810dca2a4ad427e40cb561734fdcb2ac8ae94 | 監査/計画完了のみ |
| G | Independent QA / Round-trip / Jw_cad | work/vdraw-jwcad-roundtrip-qa-v1 | 07eaa6a66930e4caa9d417d965e5eeda583a28cf | 監査/計画完了のみ |

- 並行開始可能: A契約、B native inventory、C/D/F route監査、E品質契約、G QA設計。Wave1は全7 TrackへDispatch済・回収済。
- IR依存: B/C/D/Fの共通IR接続、unit/frame/calibration/export。未確定部分の局所記録はPROVISIONAL。
- Phase1最優先: B（Route D PPTX→Jw_cad）。後続最小候補はA schema/validator、B OOXML inventory、G独立Golden。
- Phase1 Acceptance: 全source部品台帳とsupported silent loss0、元EMU/unit明示、line/text/position/size/angle/color/layer比較、unsupported理由、実Jw_cad Open/線選択/文字編集/図形分離/非ラスタ/保存、再編集→DXF再保存→独立比較。現在PLAN_ONLY、製品Gate HOLD。
- 現在BLOCKER: IR正式schema/hash、native inventory/EMU/loss対応、mm DXF、正式許容差、実Jw_cad/実PPTXアプリEvidence。Photo provider/GT不足はPhase1依存へ追加しない。
- 保護: 全Track差分は各文書2件だけ。006 pin、固定署名、SAVE-001 CLOSED、既存code/tests/Golden/source coordinateを保持。既存CI 55 suite PASS（新route精度には加算しない）。今回新規製品試験/実Jw_cad/実写真推論/APKは未実施。
