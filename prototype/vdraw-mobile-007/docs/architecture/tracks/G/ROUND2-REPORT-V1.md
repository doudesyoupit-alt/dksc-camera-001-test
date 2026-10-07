# Track G Round 2 — Independent Source Oracle / Golden Preparation

instruction_id: VDRAW-4ROUTE-G-ROUND2-20261007-V1
branch: work/vdraw-jwcad-roundtrip-qa-v1
開始GitHub HEAD/HANDOFF: 07eaa6a66930e4caa9d417d965e5eeda583a28cf。一致、初回HANDOFFを再実行・上書きしない。
Dispatch authority: 5e1fabba4d2c640d67e780169c569d9284554ac9のTRACK-G-ROUND2-V1。Cross-review/Phase1 Acceptanceはc731860b5ecbc0031231065625c5263b90a70a3fから読取。

## 判定

**Source oracle候補とA/B契約のhash pairを独立検証後に限定凍結。Phase1製品GateはHOLD。**
凍結対象はsource inventory/原値/個別drawable partとnative affine候補のQA scopeである。正式IR adapter/mm DXF backend、supported target retention、外部Generic実app Golden、PPTX/Jw_cad実操作やround-tripの完了を意味しない。
実精度/完成率の百分率は算出しない。

- A reviewed immutable HEAD: 3e1f6892ff5c6b06644b07b8247ccd9053b978db。
- A schema: vdraw-drawing-ir/1.0.0-candidate.1、SHA256 65f43167210d86fac84c9918cfc1cd7266afb05f8a53c2c5b240d4f4584096c8。
- B reviewed immutable HEAD: d5de55e43a8a0b848a2fe676488bda346bf1a356。
- B native inventory interface SHA256 ceecb509891f34d0701cdad525ee3d8d6722dbd2ea92d94aaccfe4aecf381742。
- B module SHA256 41d2995bc8b3b62f5faa4a33e7cd914f0286e348815c6ac0f9c00c0e0f562c89。
- 上記module/schema/interfaceをGitHub immutable refから別review directoryへ取得し、exact-byte hashを独立照合。A/Bの説明や変動local working copyだけを正式根拠にしていない。

## 保存したGoldenと分母

qa/phase1/golden-manifest.json、candidate-hash-pair.jsonと各original ZIP/oracle/truthに拘束する。

| Fixture | Provenance | Original object/part counts | App verification |
|---|---|---|---|
| native-vdraw-n01 | unchanged VDRAW exporter、PptxGenJS4.0.1/JSZip3.10.1 QA harness、元Editor JSON保全 | drawable6 object / 8 parts、root infrastructure2 | NOT_RUN |
| generic-synthetic-g01 | Gのraw OOXML synthetic ZIP | 9objects=drawable7+hidden1+container1、9parts、background1、infrastructure4、unsupported3parts | NOT_RUN / 外部Generic実app原本ではない |
| generic-synthetic-g02-nested | Gのnested90deg/flipH/nonuniform-group raw OOXML synthetic ZIP | 10objects=drawable7+hidden1+container2、9parts、background1、infrastructure6、unsupported3parts | NOT_RUN / 外部Generic実app原本ではない |

Bのinventoryにはmetadata/background rowsも含むため、B countsはそれぞれ8/14/17 objectsと8/10/10 componentsになる。この違いは分母の明示的mappingで説明し、要素を削除して一致させない。hiddenはdrawable計数とは別表示し、容器/背景/metadataは個別分母。
Native packageはactual unchanged exporterを実行したQA出力。shipped vendor bundleとの同等性・native polygon/arc出力はこのGoldenで未検証。packaging type adapterと未使用native IO dependency注入を生成provenanceに明示した。
external Generic実app Golden count=0。不足primitive、flipV/多slide/master/theme等はPENDING/BLOCKEDでmanifestに残す。

## 独立OracleとFalse PASS防止

Python stdlib XML/ZIPから別解析し、手作成truthとEMU/mm換算・group corner/basisを照合。B出力をoracle truthに使わない。
完全original XML・source asset/part hash・sourcePath/nativeID/name、各objectとgeometry/text/unsupported part、native EMU/slide size、presentation relationship order/orphans、raw colors/rotation/flip/group transformsを保持する。
shape+textでgeometryしか保持しない、connector/unknown nodeを消す、同件数のduplicate IDsで埋める、背景/unsupported分母を削る反例を検出する。
B computed componentも別検査する: line type/endpoints、rect type/全四隅、circle/ellipse type/center/axis vectors/size、text placementMatrix、direct raw RGBとcolor transform、semantic UNKNOWN。原XMLが同じでもcomputedgeometry欠落/誤変換を許さない。
未作成のpolyline/polygon/arc等G-specific primitive fixturesはPENDING。対象を除外して全primitive成功を主張しない。

Source ledger accountingとtarget supported retentionは別Gate。source matchだけではtarget entity保持をNOT_EVALUATEDから変更しない。

## 実行済み検証

Exact commands/log hashes/count denominatorsはqa/phase1/evidence/verification-summary.json。

| Independent checks | Result | Denominator |
|---|---|---|
| Python source truth + omission/mutation oracle | 29 PASS / FAIL0 / BLOCKED0 / skip0 | named cases |
| Python B source-loss mutation counterexamples | 19 PASS / FAIL0 / BLOCKED0 / skip0 | named cases |
| A immutable candidate adverse cases | 12 PASS / FAIL0 / BLOCKED0 / skip0 | named cases |
| B final immutable vs G own Native/Generic2 ZIP source compare | 122+129+140 = 391 checks一致、3packages | source comparison checks。追加test case数と合算しない |

Named test合計60 PASS。QA source arithmetic budget 1e-8は候補比較だけ。raw numeric expected/actual/delta/authorityをb-compare.jsonへ保持し、実DXF/Jw_cad誤差の許容値として転用しない。
A adverse casesはshear/45deg rectangleの対角線だけの誤昇格、ellipse非一様回転の単純半径乗算、homography validRegion外、duplicate IDs、text-part置換、target分母欠落、未校正REAL_WORLD、unknown schemaを検査する。
新規制作runtime実装や既存全回帰再実行はしていない。旧55 suite PASSと今回60 named casesと実精度を混同しない。

## Tolerance / Actual App

qa/phase1/TOLERANCE-PROPOSAL-V1.mdでstage別budgetを提案。EMU原値exact、EMU→LAYOUT_mmの1/36000mm提案、DXF serialize budgetはPROPOSED、実Jw_cad stage budget=null/UNMEASURED。未知stageを0にしてtotal PASSを作らない。
角度60000/degreeはMicrosoft shape a:xfrm rot=5400000→90deg例で独立照合し、矛盾する64000記述を取り込まない。非一様groupの実Office表示は別Gateとして残す。
実PowerPoint、外部Generic作成・再保存、実Jw_cad Open/select/edit/separate/non-raster/save/re-edit/DXF compareは全てNOT_RUN。
REAL-APP-CHECKLIST-V1.mdで各actionのEvidenceを分ける。現在ユーザーへの実操作要求はしていない。

## Protection / 次の1単位

書込みはG docsと新規qa/phase1のみ。初回HANDOFF/Golden/既存tests/legacy vdraw-mobile/1/006/署名/SAVE-001/Editor/UIを変更しない。main/validation/release変更・APK・AI推論・秘密値アクセスなし。
既存006 tree47cabdf70e9aebf7c64a1e028e85c476df32a169、固定署名、SAVE-001 CLOSEDのEvidenceを保護。自branch commitはGitHub HEAD照合付きfast-forward、全changed pathsを総括へ返す。

次: 総括がこのimmutable G成果を再取得・独立再実行した後、BのIR adapter/mm DXFへ必要なsupported part mapping/追加Golden coverageを単一Dispatchで指示する。外部Generic/実PPTX/Jw_cad不足は別GateとしてHOLDを維持する。
BLOCKER: IR adapter/mm DXF未実装、G-specific remaining primitive/角度/multi-slide fixtures不足、外部Generic app Goldenなし、実PPTX/Jw_cad/round-tripなし、Human-reviewed actual-app tolerance未凍結。
