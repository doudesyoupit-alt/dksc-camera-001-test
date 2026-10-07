# 依存関係Map V1

監査は独立並行、製品接続はIRとPhase Gateに従う。実装完了を示す図ではない。

```mermaid
flowchart TD
  IR["A: 共通IR契約"] --> PPTX["B: PPTX経路"]
  IR --> PDF["C: PDF経路"]
  IR --> PAPER["D: 紙図面経路"]
  IR --> PHOTO["F: 現場写真経路"]
  QUALITY["E: 品質契約"] --> PAPER
  QUALITY --> PHOTO
  PPTX --> QA["G: 実Jw_cadとRound-trip"]
  QA --> GATE["総括: Phase 1判定"]
  GATE --> LATER["Phase 2以降の正式採用"]
```

- A確定前: B/C/D/Fの監査、native inventory抽出設計、E品質設計、G試験計画は可能。
- A確定後: version/hashを指定したRoute adapterと物理unit exportを接続。
- phase採用: 1=PPTX、2=PDF、3=Paper、4=Quality高度化、5=Photo、6=Multi-view。先行監査やisolated prototypeは採用済みを意味しない。
- Gの実アプリ確認は制作担当のsynthetic/OOXML/DXF parse成功と分離。実操作未実施ならGate HOLD。
