# PHOTO-PPTX-001 — PPTX写真添付のcontain修正

開始基準：`f2fefee33377d41be22dc417356d5140e1fbbfca`。
状態：修正・限定回帰完了、独立QA待ち。

非3:2写真を1200×800の採用ページへ添付すると、従来PPTXは写真をページ全域へ伸長し、SVGの`xMidYMid meet`と図形の位置関係がずれていました。

`web/src/exporters.js`で実作業PNGのIHDR寸法を読み、ページ座標でcontainを計算してから既存のスライド倍率・余白へ合成します。図形の座標・描画・採用処理は変更していません。PNG署名、IHDR長さ・寸法・CRC、画像chunk境界、IDAT/IENDを検査します。不明・不正な寸法からページサイズへの推測やstretchは行いません。

`includePhoto=false`は従来の画像なし出力を維持します。作業画像のない白紙ページは従来どおり図形だけを出力します。写真のある不正データは写真添付時のみ明示エラーとします。

## 限定検証

新規6件の合成試験で、正方形・縦長・横長・非3:2の実PNGを使用し、以下を検査しました。

- 実VisionJobsの候補preview→adoptでcontainを保持。
- 実LocalStoreのchecksum・save→loadSessionを通した候補、図形、元画像の不変性。IndexedDB境界のみメモリへ注入。
- sourceBinding / coordinateSpace / referenceImageTransformの不変性。
- 配布コード同梱PptxGenJS / JSZipによる実PPTX生成。
- 元ページ・採用ページのOOXML picture offset/extentを独立contain計算と比較（許容差1 EMU）。
- 図形OOXMLの位置・サイズが写真有無で同一、元写真アスペクト比保持。
- 不正PNG・寸法破損・欠落chunkは添付出力を拒否。

実行：`node --test tests/photo-pptx-contain.test.mjs tests/input-001-regression.test.mjs tests/output-race-regression.test.mjs`

結果：59 PASS / FAIL 0 / skip 0。新規写真contain試験6件、INPUT-001既存試験26件、OUTPUT/所有者競合既存試験27件。

Node実行環境に合わせpackagerの出力容器のみuint8arrayへ変更し、実生成OOXMLを検査しています。ブラウザIndexedDBの実機検証、Microsoft PowerPointでの開封、実写真精度評価を行ったとは主張しません。入力はすべて合成、実AI使用0件、実写真評価0枚です。

旧`tests/photo-pptx-audit.mjs`は修正前の故障再現コードとして変更せず保持しました。修正後の成功判定には新規contain試験を使用します。006・main・validation・恒久署名には変更していません。
