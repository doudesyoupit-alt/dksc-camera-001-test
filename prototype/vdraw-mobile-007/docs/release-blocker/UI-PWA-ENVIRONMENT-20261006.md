# Ordinary-profile PWA regression environment

Parent source: `57e0351c3aa4b1469bb116e68e8daf9286907f9c`. Dedicated branch: `work/vdraw007-ui-pwa-environment-20261006`.

Strict CI run `37345005037` retained a real failing PWA result: Chrome 154 returned `installabilityErrors: [{errorId: "in-incognito"}]` for Playwright's non-persistent context. Editing, saving, offline reload, and all seven exports preceding that assertion passed. This is an environment mismatch for measuring ordinary-profile PWA installability; the result was not discarded.

New `tests/product-007-adapter-v4.mjs` changes only browser launch to `launchPersistentContext` using a newly created temporary profile directory and changes cleanup to close that context. The original viewport, touch setting, download acceptance, headless mode, executable path, and browser arguments remain unchanged. Every product assertion and threshold remains intact, including `assert.equal(installation.installabilityErrors.length,0)`. No error is ignored or filtered, and no result is forced to PASS.

The reverse replacement reconstructs v3 byte for byte, whose Git blob SHA was independently checked against the parent source. All 25 assertion calls remain. No runtime source, 006 source, old adapter, test, checkpoint, or APK is changed.

Local Chromium 153 ordinary-profile execution passes all 16 original logged checks with zero page/console errors and no installability errors. This is local evidence only. The same Chrome 154 strict full CI run remains mandatory to confirm the environment fix under the browser that reported `in-incognito`. Generated browser-profile contents and large logs are not committed.
