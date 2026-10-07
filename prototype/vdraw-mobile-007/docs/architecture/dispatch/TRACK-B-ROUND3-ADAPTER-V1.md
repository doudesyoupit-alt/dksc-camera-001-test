[WORK_DISPATCH_V1]
# Phase1 Round3 / Track B — native inventory → pinned Drawing IR adapter

instruction_id: VDRAW-PHASE1-B-ADAPTER-20261007-V1
project: dksc-camera-001-test
target_work: Track B continuation
expected_branch: work/vdraw-pptx-jwcad-v1
expected_head: d5de55e43a8a0b848a2fe676488bda346bf1a356

Continue from existing inventory, do not rebuild A/B/G or rerun completed Round2 work. Read immutable B HANDOFF/Evidence and Coordinator Round2 acceptance at 002daf4a74e1070b5094c4b5f5132e683133c06c. IR pin: {"branch":"work/vdraw-drawing-ir-v1","head":"3e1f6892ff5c6b06644b07b8247ccd9053b978db","version":"vdraw-drawing-ir/1.0.0-candidate.1","schema_sha256":"65f43167210d86fac84c9918cfc1cd7266afb05f8a53c2c5b240d4f4584096c8","validator_sha256":"8b9ab5443647f89c6b07dbe5ce13c9980a81ff2bf2b5ad1e5705b0407eefbd6e","wire_contractStatus":"CANDIDATE","scope":"IMMUTABLE_CANDIDATE_FOR_ISOLATED_PHASE1_ONLY"}. G source oracle: 7835d3588fdb53131a113e9fb1fba797d28c6a89.

Implement only a new isolated adapter, capability contract, new focused tests and new Round3 evidence. Import exact pinned A bytes selectively if necessary; no merge. Inventory reader remains unchanged. Each source object/component/background/container/hidden item must map to sourceInventory/sourceLedger, represented primitive or explicit unsupported/exclusion record with reason and next Human action. Never narrow supported-target denominators to obtain PASS. Keep native source coordinates, lexemes, XML, asset/part hash and page order; geometry and text components on one source object remain distinct. Source layout conversion is 36000 EMU = 1 layout MM. UNSCALED remains UNSCALED; no real-world calibration fabricated. Source top-left/y-down and CAD y-up conversion must be explicit reversible frames, not ad-hoc sign flipping. Multiple slides have separate page/frame identities; no overlap/aggregation without explicit policy.

Use pinned validator unchanged. Preserve complete native group affine chain; all polygon vertices and basis vectors required. Rect rotation/shear cannot be asserted from bbox diagonal. Ellipse nonsimilarity/skew, curves, text anchor/baseline/font/theme unresolved: explicit limitation/unsupported ledger, no arbitrary approximation or resolved black/default text. Text codepoints/run/paragraph/br preserved; dimension-like text not automatically a dimension. Test omission, duplicate source identity, missing text component, group transform, rotation/flip/nonuniform, negative directions, unsafe coordinates, unknown schema, unsupported reason/action missing, unit-role mismatch. Tests must exercise adapter and validate its IR; not merely copy implementation expectations.

Return immutable saved HEAD, schema/hash, capability/part manifest, focused test log/hash, example IR for fixed G fixtures, unsupported ledger and blocker in new tracks/B/HANDOFF-ROUND3-V1.json + EVIDENCE-ROUND3-V1.json. No fake containing self-SHA. Need G independent source→IR validation before downstream mm DXF authorization. DXF implementation is the next bounded dispatch after that Gate, not enabled in this instruction.

Constraints:
- No main/validation/release/006/signing/SAVE001 changes or re-confirmation
- No reset --hard, rebase, git clean, deletes, overwritten checkpoints, old Golden/test removal or new skips
- No legacy importer/exporter/editor/storage/UI changes; no APK; no AI API; C/D/E/F held
- Preserve original source XML/EMU/identity/part ledger and all previous evidence
- No Human approval substitution; actual Jw_cad and product Gate HOLD
- Re-fetch expected branch HEAD and immutable dependencies; mismatch -> BLOCKED, never force
- Completed Round2 tests reused; only necessary new/change-related checks, no redevelopment
