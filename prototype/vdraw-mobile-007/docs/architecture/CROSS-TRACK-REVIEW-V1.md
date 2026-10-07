# 総括Cross-Trackレビュー V1

状態: INITIAL_REVIEW_COMPLETE / COMMON_IR_PROVISIONAL / PRODUCT_GATE_HOLD。

## 共通IRへ反映する設計判断
Track Aの提案に従い、frames/calibrations/layers/sourceInventory/target export evaluationsのcollectionを明示する。
source-native geometryは不変で保持し、Editorは能力を限定したprojectionとする。既存vdraw-mobile/1を拡張・移行しない。
unitはEMU/pt/px/mm/unitless、unitRoleはSOURCE/LAYOUT/REAL_WORLDを別fieldにする。
source ledgerの全件説明とtarget ledgerの全supported part保持を別Gateにする。単純な件数一致をloss0の証拠にしない。
shape+textとgroup/container、connector、hidden/master/backgroundを別inventory roleで扱う。
source object idのcollisionをslide/page/part path/hashで防ぐ。
target exportReadinessはsource型とtarget frameとcapability別。PPTXで表示できることをCAD対応へ昇格しない。
以上は共通契約のレビュー済み方針。正式schema/version/hashの実装・検証・凍結は次のTrack A単位に残す。

## Track間調整
- B: 最初の孤立実装はOOXML inventory＋EMU原値＋object/part loss ledger。DXF/UI接続は後続。
- C: 原PDF native operatorはdisplay render前にsnapshot。packed path→Path2D書換はstatic risk所見であり、実PDF再現済みとは主張しない。
- D: 四隅だけでaspectやmmを作らない。pixel→rectified plane、紙面LAYOUT mm、対象REAL_WORLD mmを段階別にする。
- E: Site Photo global blur/brightnessをPaperの適合判定へ流用しない。白地と重要線/文字ROIの飽和を分け、必要RETAKE recallと不要RETAKE rateを独立測定。
- F: 既存写真10枚を保全。camera/image recognitionとeditable export能力を分ける。未接続ProviderはPhase1必須依存ではない。
- G: 実Jw_cad未実施をNOT_RUNとして保持し、group/text/connector分母漏れや日本語/ELLIPSE/MTEXT/truecolor/unitを実アプリGateに置く。

## Unitの整合
Photo/Paperに実寸根拠がなければREAL_WORLD mm生成は禁止。既知紙サイズ等の確かなlayout EvidenceがあればLAYOUT mm変換は別scopeで設計可能。
UNSCALEDは現場実寸の校正不足を示す。native PPTX/PDFの紙面unitの既知性を失わない。
Dの「UNSCALEDはunitlessのみ」はPaper pixel根拠しかない現状に限定して読む。layout sizeのEvidenceが揃う将来はAのunitRole別target policyを適用する。
Generic文字「1000」を寸法semanticや校正根拠へ自動昇格しない。

## Phase1の追加Acceptance
source inventoryでp:cxnSpを含む全spTree children、text-bearing shapeのgeometry/text parts、group parent transforms、run/paragraph/br、missing relationship/theme/fontを照合する。
source integer原値と精度、transform order/pivot/flip、負方向line endpoints、target entity coverageを独立比較する。
既存DXFのINSUNITS=0契約を壊さず、新mm backendを別経路にする。単位headerだけでJw_cad compatibleとしない。
実Jw_cad Open/線選択/文字編集/図形分離/非ラスタ/保存/再編集→DXF保存→比較を必須とする。許容誤差は提案段階であり正式Acceptanceにしない。

## Gateと後続
Wave1は7 Trackの初回監査・契約・試験計画を回収するScope。アプリコード統合やAPKは含まない。
Phase1最優先B。Aのschema/semantic validator/unit-frame-ledger testsとB inventoryは独立に実装可能だが、共通IR接続は正式version/hash後。
C/D/E/Fは監査成果保存状態で保留し、全Trackの同時製品統合を行わない。
後続実装は今回作成済のcopy instructionsとは別instruction_id/expected HEAD付きDispatchを必要とする。
Human最終製品判断を代理しない。初回docs保存に追加承認は必要ない。
