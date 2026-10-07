[WORK_DISPATCH_V1]
# Phase1 Round3 / Track G — independent source→IR qualification and target-oracle preparation

instruction_id: VDRAW-PHASE1-G-ADAPTER-QA-20261007-V1
project: dksc-camera-001-test
target_work: Track G continuation
expected_branch: work/vdraw-jwcad-roundtrip-qa-v1
expected_head: 7835d3588fdb53131a113e9fb1fba797d28c6a89

Continue existing G oracle/Golden; do not rebuild A/B/G or re-run completed Round2. IR pin: {"branch":"work/vdraw-drawing-ir-v1","head":"3e1f6892ff5c6b06644b07b8247ccd9053b978db","version":"vdraw-drawing-ir/1.0.0-candidate.1","schema_sha256":"65f43167210d86fac84c9918cfc1cd7266afb05f8a53c2c5b240d4f4584096c8","validator_sha256":"8b9ab5443647f89c6b07dbe5ce13c9980a81ff2bf2b5ad1e5705b0407eefbd6e","wire_contractStatus":"CANDIDATE","scope":"IMMUTABLE_CANDIDATE_FOR_ISOLATED_PHASE1_ONLY"}. B base: d5de55e43a8a0b848a2fe676488bda346bf1a356. Track B adapter completion HEAD will be provided by Coordinator; no moving branch/assumed implementation as oracle. First prepare independent new coverage/expectations; then inspect fixed adapter bytes against original XML and G source oracle. B output is result, never source truth.

Expand new isolated fixtures/oracle for open/closed polyline and polygon, negative offset/direction, 0/90/359 angles, flipV/nested asymmetric affine, unsupported arc/curve and geometry+text, multi-slide order/identity, raw theme/master inheritance and background. Mark synthetic packages honestly; external Generic app = 0 remains unproven. All source objects/components preserved or explicitly ledgered; count parity alone insufficient. Independently check type, exact text/paragraph/run/br, full endpoints/vertices/basis, position/size/rotation/flip, raw/resolved color distinction, EMU→layout MM, UNSCALED, source binding/hash, object/component/target denominator and unsupported reasons/Human actions. Mutated same-count output, erased text, unknown objects, erased ledger reasons, label-only unit and real-world promotion must fail. Freeze fixture source bytes and truth before adapter comparison. Arithmetic tolerances are QA bounds only; actual-app acceptance remains unset.

Prepare independent numerical mm-DXF oracle interface/plan and real-Jw_cad checklist without claiming backend or round-trip PASS. Backend will be dispatched only after source→IR Gate. Return new immutable HEAD plus named test count separately from comparison checks, source fixtures/hash/truth, raw expected/actual/delta, scope-specific Gate and blocker in new tracks/G/HANDOFF-ROUND3-V1.json + EVIDENCE-ROUND3-V1.json. Do not edit A/B implementation. Human real-app final judgment remains HOLD.

Constraints:
- No main/validation/release/006/signing/SAVE001 changes or re-confirmation
- No reset --hard, rebase, git clean, deletes, overwritten checkpoints, old Golden/test removal or new skips
- No legacy importer/exporter/editor/storage/UI changes; no APK; no AI API; C/D/E/F held
- Preserve original source XML/EMU/identity/part ledger and all previous evidence
- No Human approval substitution; actual Jw_cad and product Gate HOLD
- Re-fetch expected branch HEAD and immutable dependencies; mismatch -> BLOCKED, never force
- Completed Round2 tests reused; only necessary new/change-related checks, no redevelopment
