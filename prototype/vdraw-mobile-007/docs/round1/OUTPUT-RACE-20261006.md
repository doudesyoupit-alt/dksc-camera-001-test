# OUTPUT-001 / EXPORT_OWNER_RACE — P1 round 1

Repository: `doudesyoupit-alt/dksc-camera-001-test`  
Branch: `work/vdraw007-fix-output-race-20261006`  
Start HEAD: `9c1dcdf8d87e32a9f0d86996c210a8a4b7ebb2fc`

## Change and ownership

Only `web/src/app.js` export handling and new `web/src/export-jobs.js` change runtime behavior. Exporters, storage, native bridge, candidate adoption, diagram engine and 006 are unchanged.

Each accepted export has a unique job ID and an immutable, deep-frozen clone of the start document plus format, effective options, project ID, revision, filename, extension, MIME, history timestamp and delivery intent. Naming and history no longer consult mutable settings after asynchronous generation. Blob MIME is checked before delivery.

One export owns the generation/delivery/persistence slot. Repeated clicks and concurrent calls are ignored while that job owns it. Slot release compares the exact token; a late old completion cannot release a newer job. Export view rebuilds restore the busy status and disabled save/share controls.

Before OS delivery and before recording history, owner validation compares editor session, original document reference, project ID, revision and serialized content. This catches A→B→A, updated Editor document references, and in-place changes without a revision bump. If changed before delivery, delivery is canceled; the current document is untouched. If changed while the OS is already handling delivery, no history is written and the UI explicitly reports delivery without history. External delivery cannot be recalled. No stale start-document snapshot is saved over newer geometry or Undo/Redo. After history persistence, a changed editor session receives no old export-screen navigation or success message.

Only history metadata is appended synchronously to the validated current document before using the existing owner-aware save path. Native return `share-requested` is described as handoff, never receiver save completion. Download is described as started. OS cancellation, rejection, generation failure, MIME mismatch and unrecognized delivery results add no successful history.

## Executed verification

`node --test tests/output-race-regression.test.mjs`: **27 PASS / 0 FAIL / 0 skip**.

This executes the actual `app.js` output function in a VM with deferred generation, OS and persistence boundaries for PPTX, DXF and PDF; immutable snapshots, settings changes, repeated calls, ownership transitions, edited geometry, persistence owner changes, failed generation, wrong MIME, cancellation, rejected sharing and history-save failure are checked. The nativeIO implementation is exercised through injected plugin boundaries. Real bundled PPTX and PDF packagers create documents from frozen snapshots; PPTX ZIP/title and PDF page-count/title are inspected. PDF font/image/canvas IO is a one-pixel fixture, so this does not certify visual raster quality or physical OS behavior. DXF uses the real exporter and validates its structure/MIME.

`node --test tests/native-io-005.test.mjs tests/core.test.mjs`: **13 PASS / 0 FAIL / 0 skip**. These pre-existing immutable archive assets remain unchanged; their Git restoration is owned by the regression-assets specialist.

Total executed in this work: **40 PASS / 0 FAIL / 0 skip**. Independent QA, integration regression, full regression and Android physical acceptance are separate gates. This producer report does not mark either P1 resolved.

## CROSS_TEAM_ISSUE / limits

- `CROSS_TEAM_INTEGRATION_OFFLINE`: add `./src/export-jobs.js` to 007 SW precache, together with Input's new module, and advance the 007 cache version during integration. Do not change 006. This work deliberately leaves `sw.js` unchanged to avoid shared ownership conflicts.
- `app.js` is shared with Input. Merge only owned export/import/initialization hunks; do not choose an entire file via ours/theirs.
- Signature compatibility remains Android's responsibility. No APK is generated.
- Full JSON content validation during ownership checks has an O(document size) cost; this is deliberately fail-closed and should be covered by the large-case performance gate.
- Existing asynchronous storage queue behavior is not rewritten. The export implementation appends history to current state and calls the existing owner-aware save routine.
