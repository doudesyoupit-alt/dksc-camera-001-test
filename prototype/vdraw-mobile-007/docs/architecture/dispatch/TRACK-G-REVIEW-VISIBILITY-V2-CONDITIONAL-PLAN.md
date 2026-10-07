# Track G — conditional delta QA plan (NOT DISPATCHED)
instruction_id_reserved: VDRAW-V2-G-DXF-REVIEW-VISIBILITY-001-DELTA-20261008-V1
target_work: EXISTING_TRACK_G
expected_branch: work/vdraw-jwcad-roundtrip-qa-v1
expected_head_at_takeover: aa8ef74e572c95114489f75285f1d5c1d9b4de62
status: WAITING_FOR_FIXED_B_HANDOFF
B_corrected_head: UNRESOLVED
Do not execute this plan. Coordinator must resolve and authenticate the new B fixed HEAD/HANDOFF/Evidence/tests and live G HEAD, then append an actual [WORK_DISPATCH_V1]. No guessed head, no reuse of B377 as corrected head.

Delta scope: DXF-REVIEW-VISIBILITY-001 only; independent source-bound alpha-zero/noFill/unknown/mixed-paint disclosure and new record consistency. Read original source truth, preserved G checker and old finding without rewriting them. Verify old B377/G FAIL/Golden/test bytes preserved, correction only in declared new paths, generated geometry/raw DXF bytes invariant, all prior unit/text/unsupported/appearance/calibration disclosures remain honest. No full 8718-comparison or A/B/G rerun; carry previous numeric acceptance with exact immutable references, not new counts.
Separate named tests from actual finding resolution. Close only the new scoped finding if independent comparisons PASS with zero unknown/inconsistent relevant rows, fail 0, skip 0. Preserve old FAIL record. On uncertainty return BLOCKED/UNKNOWN.
Return new fixed G Evidence/HANDOFF/test log and bounded closure status. Actual Jw and Phase1 remain HOLD. Coordinator next priority is text 0/8, then unit/known-length, appearance, actual Jw, round-trip.
