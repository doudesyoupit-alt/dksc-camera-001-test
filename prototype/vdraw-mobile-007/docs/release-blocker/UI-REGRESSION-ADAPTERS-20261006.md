# VDRAW 007 UI regression adapters

Dedicated branch: `work/vdraw007-ui-regression-adapters-20261006`; parent: `70f9b5be972573906328e5d72b0318473ff5fa1c`.

Six new test entries retain the original executable tests byte for byte. No production code, 006 code, threshold, skip, or test deletion is included. `tests/ui-regression-adapter-diff-evidence.json` records every approved edit and inverse-edit byte identity; assertion-call counts remain 25/9/18/2/16/15 before and after.

- product: open the visible enclosing object-details summary; choose line/text in the already opened add-shape sheet; choose photo in the already opened new-drawing sheet. These operations avoid duplicate toolbar/home controls.
- render-export: open object-details summary before stroke-color entry.
- photo-pipeline: open object-details summary before class selection.
- output-quality: choose the original footer close button in the object sheet.
- UI-state: map the exact 007 loading/saving/saved copy; choose the visible sheet header close button; leave the new trace sheet through its manual-edit footer action and reopen display settings before the original candidate assertions.
- vision-flow: map the exact 007 mock label and explicitly assert the shared 006 storage namespace. The legacy-002 exclusion and all other assertions remain intact.

Independent QA reviewed details, insert, photo, close, trace, and copy mappings. Browser comparison uses an immutable reference containing exactly 37 baseline-006 web blobs, verified independently against Git manifest SHA values; 007 uses unchanged runtime/test source from the parent commit. Executable browser is Chromium 153. This is browser verification, not Android device acceptance or real AI verification.

Actual results: 006 PASS for all six entries. 007 PASS for product/render-export/photo-pipeline/output-quality/UI-state. The vision-flow adapter still FAILS after successful candidate adoption, edit, Undo/Redo, save/reload, and three exports: stored candidate reopening from the adopted page cannot render the candidate and cannot reach discard. Independent QA reproduced `INPUT_CANDIDATE_POST_ADOPTION_PREVIEW_BLOCKED`. No page-switch workaround or weakened assertion was added. A production fix and rerun are required before release.

Full logs and artifacts remain in the isolated execution folders; only compact evidence and persistent adapter files are committed. Browser-launch path substitution for inherited hardcoded `/tmp/chromium` occurs in the isolated execution copies only, identically for 006 and 007.
