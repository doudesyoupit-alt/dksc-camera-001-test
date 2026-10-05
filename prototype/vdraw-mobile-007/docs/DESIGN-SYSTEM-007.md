# VDRAW Mobile 007 Design System

視認性→操作速度→情報階層→統一感→高級感→装飾の順で判断する。明るいneutral surfaceと濃いink、操作色teal。CADの図面色・選択描画色は変更しない。

|Role|Token / rule|
|--|--|
|Page Title|28px / 1.35 / 700|
|Section Title|18px / 1.5 / 650|
|Body|16px / 1.65|
|Caption|13px / 1.55、重要操作には使用しない|
|Button|15px / 1.4 / 650、min-height48px|
|Numeric / Dimension|28px / tabular-nums / min-height64px|
|Spacing|4 / 8 / 12 / 16 / 24 / 32px|
|Radius|Button/Input12、Card16、Sheet20、Dialog16|
|Background / Surface|#F4F6F6 / #FFFFFF|
|Primary / Secondary|#174F57 / #EAF2F2|
|Text / Text Secondary|#172B32 / #52646C|
|Success / Warning / Error|#216348 / #805408 / #A43135、必ず文字・形と併用|
|Border / Disabled|#CCD7DA / #E8ECEE、disabledラベルは読める濃さ|
|Focus|3px primary outline + 2px offset|
|Motion|100–140ms opacity/transformのみ、reduced-motionでは無効|

既存inline SVG icon体系を継承。新しいfont/icon/libraryなし。影はsheetの軽量境界だけ。SVG canvasのfilter/animation/新しい計算なし。

Homeは主要CTA→入力方法→続きから編集→最近の図面。Editorは56px header、48px view strip、68px bottom toolsを基準とし、詳細はsheet。寸法はnumeric+mm+確定/キャンセル、名前・適用注意は補助情報。候補は元資料/図面/重ねると対象を確認し、採用して修正・保留・破棄を明確化する。

Traceには実際のVisionJobs/trial stage状態だけを利用する。認証未接続、未実行、処理中、完了、失敗を区別し、時間経過による偽%やfake progressionを入れない。実AI認識・候補採用ロジックは変更しない。

006 CORE/commands/storage/render/importers/exporters/vision/device/native/Provider/trial計測はbyte不変を目標にする。app.jsの表示関数とUI action adapterのみ変更し、座標・寸法・保存・出力関数は保持する。007 APKは別applicationIdで共存用、DB schema/nameは006から不変でアプリsandboxを分離する。Web確認は別originを使用する。
