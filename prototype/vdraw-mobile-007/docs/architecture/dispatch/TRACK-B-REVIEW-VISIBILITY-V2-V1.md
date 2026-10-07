[WORK_DISPATCH_V1]
# Track B — DXF-REVIEW-VISIBILITY-001 append-only correction
instruction_id: VDRAW-V2-B-DXF-REVIEW-VISIBILITY-001-20261008-V1
parent_instruction_id: VDRAW-COORDINATOR-V2-EMERGENCY-TAKEOVER-20261008
repository: doudesyoupit-alt/dksc-camera-001-test
target_work: EXISTING_TRACK_B
expected_branch: work/vdraw-pptx-jwcad-v1
expected_head: 377afdc9c34e60a01a6cb0aebf33099875c9470c
coordinator_branch: work/vdraw-four-route-coordinator-v2
A_pin: 32fac121b5a7df53cde79e0be515581a9dc8496d
G_finding_pin: aa8ef74e572c95114489f75285f1d5c1d9b4de62
human_approval_required: false
scope: VISIBILITY_AND_DISCLOSURE_DELTA_ONLY
product_gate: HOLD

Start by re-fetching branch HEAD, this fixed dispatch, B HANDOFF/Evidence/tests and G finding at fixed commits. Expected HEAD mismatch means report conflict; no overwrite/reset/rebase. Check existing claim/receipt/HANDOFF for this instruction_id; never duplicate execution or reclaim an unknown/running task. This targets existing Track B only; do not create a replacement specialist.

Authoritative finding:
G aa8ef74e572c95114489f75285f1d5c1d9b4de62, prototype/vdraw-mobile-007/qa/phase1/mm-dxf-review-v2/evidence/B377-review-visibility-finding-v1.json
SHA256 dc7ebbc9257f4966295b191bba8a7cee0a02e9698aa0ef9189a6ef6db092618b
Native sourceHash 20e0ed7f5791a57a94afacad7d10dacf38f27b9b4219fb1f223f7cfc05eea4c2;
inventoryId source-5-part-0; sourceKey ppt/slides/slide1.xml#/p:sld/p:cSld/p:spTree/p:sp[4].
Original fill and stroke alpha explicitly 0, raw lexeme 0, encoding OOXML_ALPHA_100000. Generated foreground outline drops opacity; per-component reviewVisibilityOverride=false contradicts that policy. Expected true with source-bound reason. Geometry numeric QA remains PASS in a separate scope. No actual-render visibility claim.

Allowed delta:
1. Append a new versioned metadata/policy overlay or narrowly scoped wrapper that reuses the frozen V1 backend; no geometry backend rewrite. All existing B377 paths/blobs and saved outputs remain byte-for-byte intact. Preserve source/IR/calibration frames, transform/math, entity IDs/counts/order, coordinate values and raw DXF bytes.
2. Correct alpha-zero disclosure from explicit source-bound evidence, including stroke and fill resolution. Preserve distinct explicit noFill, known alpha-zero, unknown opacity and mixed paint cases. Unknown is UNKNOWN/HUMAN_CHECK_REQUIRED, never a fabricated alpha/known state; opaque/mixed cases must not be labelled proven invisible. An alpha-zero case and noFill case need explicit reason and provenance, not an unbound forced boolean.
3. Keep reviewVisibilityOverride consistent in new loss ledger and manifest/disclosure. State generated review appearance, unsupported items, text 0/8, source appearance NOT_RETAINED, PARTIAL_HUMAN_CHECK_REQUIRED, UNSCALED, UNIT_HEADER_METADATA_UNAVAILABLE, realJw NOT_RUN and product HOLD. Visibility policy correction is not text/appearance retention.
4. Append new Evidence, HANDOFF and focused delta tests under new paths (e.g. tracks/B/visibility-delta-v2/ and versioned route files). Declare precise supersedes references; never reinterpret/replace the old failed evidence. Publish changed-path list, SHA256/Git blob hashes, preserved-old-blob comparison, exact fixed result HEAD, all source/inventory/property denominators, raw-output-byte invariance and complete affected record set.
5. Focused tests only: original alpha-zero witness, noFill, unknown, opaque/mixed paint distinctions; emitted vs excluded component flag/reason; missing/forged source provenance; disclosure consistency and unchanged geometry/DXF bytes. No rerun of original A/B/G suites or adapter/reader, no Golden regeneration. Explicitly separate new tests from carried-forward numeric results.

Return [WORK_HANDOFF_V1] for this exact instruction, branch/start/final HEAD, Evidence and tests, blockers/Human Gate, corrected record identities and module/evidence hashes. Coordinator V2 collects and dispatches G ONLY AFTER corrected fixed B Evidence is available. B does not self-approve or issue G.

Prohibited: old Coordinator branch writes; main/validation/006/signing/SAVE-001 changes or checks; C/D/E/F work; reset --hard/rebase/git clean; Golden/test deletion; skip; unrequested APK/merge/release; False PASS. Retain old FAIL and existing checkpoints.
