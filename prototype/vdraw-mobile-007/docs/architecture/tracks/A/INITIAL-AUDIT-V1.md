# Track A Drawing IR initial contract review V1

instruction_id: VDRAW-4ROUTE-A-INITIAL-20261007-V1

Scope: AUDIT / CONTRACT PROPOSAL / TEST PLAN ONLY. No schema code, product code, tests, fixtures, APK, migration, or product integration created. Product Gate HOLD. Shared contract remains PROVISIONAL; this review does not independently freeze or replace it.

## GitHub start gate and current Evidence

GitHub re-read at execution start on 2026-10-07 UTC:

| Item | Observed value |
|---|---|
| own branch | work/vdraw-drawing-ir-v1 |
| own HEAD / expected HEAD | 9ae8e1b4137cbb4a65f630e2501a94af6cb826ad / equal |
| source branch / HEAD | work/vdraw007-photo-accuracy-20261006 / 6c0facb34757a54ed37d08d94505129b0341ad66 |
| stable 0.8.2 branch / HEAD | work/vdraw007-signing-release-20261006 / 15bf3371bec3f7d1e4090e7198a850c5636baf3f |
| baseline tree | 809fc6bec31125ce3ca678124db4f3da9b341021 |
| 006 subtree, baseline and release | 47cabdf70e9aebf7c64a1e028e85c476df32a169 / identical |
| source workflow run | 37416413246 / completed success |
| release workflow run | 37409871705 / completed success |
| SAVE-001 | save001-device-acceptance.json: CLOSED; explicit 0.8.2 Human acceptance; reconfirmationRequired=false |
| fixed signing | saved acceptance certificate SHA256 186ad92e96316b7a2a247c092fd3d83a94fa7a89ea406859a93b057c329a2d8d; no signing material read |
| PHOTO-PPTX-001 | next-photo-defects.json and INTEGRATION-STATUS.json: CLOSED_INDEPENDENT_QA_PASS |
| Photo accuracy | allFormalMetrics=NOT_MEASURED, realAIPhotoCount=0, Site Photo candidates=10; no re-inference/recollection |
| issue | open #1 maintains practical accuracy target; no new GitHub issue created |

Re-read TRACK-A-INITIAL-V1.md, BASELINE-V1.md, DRAWING-IR-INITIAL-CONTRACT-V1.md, PHASE1-ACCEPTANCE-V1.md and Coordinator DISPATCH-MANIFEST.json. Manifest A instruction and expected HEAD agree. Existing workflow success is reused Evidence only, not a new test result or actual CAD accuracy.

## Existing contract and reuse audit

All following paths are relative to prototype/vdraw-mobile-007, at source HEAD above. GitHub content was re-read; local snapshot was used only for line-number display.

| Source / lines / function | Observed capability | Boundary / IR consequence |
|---|---|---|
| web/src/core.js:16-20, newPage/project | vdraw-mobile/1, canvas=1200x800 y-down, UNSCALED references/mmPerUnit, revision/page/source history | Existing schema remains unchanged. IR is separate; canvas is a projection, never native source truth. |
| core.js:5,25-43, validate | finite geometry, nonnegative w/h, seven kinds, max canvas 10000, max objects 5000 | No general rotation, circle kind, open polyline, frame graph, hash binding or calibration consistency validation. Native EMU cannot be put directly into Editor canvas. IR validation must be separate and fail before projection. |
| core.js:10-13,52-59, validArc/arcPoints | validated circular box; bounded degrees; display/export samples 49 points | Reuse legacy protection. IR native arc retains sweep/convention; sampled arc is derived approximation with explicit error, never exact oracle. |
| core.js:45-46, bounds/translate | polygon vertices retained, otherwise bbox | Bbox alone cannot preserve negative-direction line endpoints or arbitrary rotation. IR uses endpoints and explicit frames. |
| web/src/vision.js:21-39, sourceFingerprint/binding/candidateContract | document/page/source binding, PNG native dimensions, containment agreement checked | sourceFingerprint explicitly noncryptographic; retain it as legacy binding, never label SHA256 provenance. Add new asset SHA256 alongside it. |
| vision.js:45-55, contain/attachCoordinates/convertedElements | reversible scale/offset between named candidate canvas and reference image | Reuse exact named-frame and contain contracts; IR transforms retain both source image and editor display frames, plus adapter outcome. |
| vision.js:61-70, receive | explicit UNSCALED, candidate kind whitelist, sourceObjectId, no silent semantic trust | Preserve route candidate safety. New fields are not automatically admitted by this whitelist; do not weaken it. |
| vision.js:86-94, adopt | provider review, validate before mutation, adoption records coordinateSpace/targetCanvas/transform/sourceBinding | Reuse transactional pattern and history. General IR→Editor needs capability assessment and loss ledger first. |
| web/src/importers.js:7-15, importFile | immutable original image/PDF, sanitized PNG, PDF native text transform | Asset/source references reusable. PDF vector/page-frame import missing; parent PDF original binding must be maintained for per-page derived records. |
| importers.js:19-35, PPTX branch | slide EMU read, limited shape/text extraction, aggregate unsupported warnings | EMU immediately normalized to 1200 width; rot/flip/group unsupported; text-bearing shape becomes text only. Need native source inventory and object-part mapping before normalizing. |
| web/src/exporters.js:27-47, pptx | native shapes/text, nonbitmap custom polygon/arc path; fixed layout 12x8; per-object name | Source-safe projection/export possible. Subject/notes say UNSCALED. No verified native semantic metadata binding exists here; object names alone are not dimension Evidence. |
| exporters.js:49-65, dxf | LINE/TEXT/MTEXT/CIRCLE/ARC/ELLIPSE/LWPOLYLINE, page offsets and y inversion | $INSUNITS=0 unitless. Current code is not mm backend or actual Jw_cad PASS. Separate IR→DXF target adapter required. |

Git source blobs: core.js=396deedd7062f2ceb89bc20bc3e850132ab2f194, vision.js=37be20846f9694cfd023c0194a32cd75cf6312fd, importers.js=33fe27ec3d1f33647967892d386b2c7148b7b84c, exporters.js=7e50082bc18da5c6167709f7c6f699cc44b7f591. These are Git blob identities, not SHA256 evidence hashes.

## Contract refinements proposed to Coordinator

The initial shared contract already has the required native geometry, units, transforms, provenance and UNKNOWN philosophy. The following tighten its validation without creating a route-specific IR.

| Topic | Proposed rule / reason |
|---|---|
| Envelope | Add explicit frames[], calibrations[], layers[], object collection per page, inventory and target-specific export evaluation references. Current prose refers to frameId and layer but does not fix referent collections. Require unique IDs and all references resolvable. |
| Unit role | physicalUnit is a vocabulary token (EMU/pt/px/mm/unitless), unitRole is SOURCE/LAYOUT/REAL_WORLD. Use LAYOUT_MM/REAL_WORLD_MM only as descriptions, not competing schema values. Numeric unit conversion proves paper size only. |
| Scale scope | CALIBRATED is scoped to explicit calibration and object/plane/page coverage; document scaleStatus is a summary, never permission to transform all objects. Mixed calibrated/uncalibrated content stays blocked for full REAL_WORLD export. |
| Requested target | Each export request declares targetFrameId, unitRole, required capability and partial-export policy. PPTX EMU→LAYOUT mm may proceed UNSCALED, REAL_WORLD mm requires evidence-backed scale coverage. Export readiness is per target, not a universal boolean. |
| Paper/PDF derivation | D requires pixel→rectified paper-plane separately from paper mm→drawing real-world scale. C requests original PDF operator snapshot before display-render derivation. Source sourceBinding remains on the original asset and page; raster/rectified assets are distinct derived assets and never overwrite native geometry. |
| Native numbers | PPTX EMU stored as original integer lexeme plus exact parsed value only when safe. Values beyond JS safe integer range are rejected or represented exactly, never silently rounded. PDF/Photo retain original numbers and precision/derivation lineage. |
| Transform | Matrix remains row-major with column vectors, composition B×A. Declare input/output unit, transform type and determinant policy. Distinguish invertible=false (blocked path) from a truth assertion. Homography additionally validates denominator across application region. Rotations define angle unit, direction, pivot and order relative to group/flip. |
| Native geometry immutability | Editing produces derived geometry plus edit event, does not mutate nativeGeometry/source hash. Display contain and CAD page placement are separate transforms. Page spacing has units/provenance. |
| SourceBinding | Require sourceAssetId + SHA256 + page/slide + object part path for parsed geometry; source object IDs alone can collide across slides. Legacy sourceFingerprint remains separate noncryptographic field. Native metadata gains trust only with verified producer/schema/source binding. |
| Object-part inventory | A text-bearing shape has independent geometry and text parts under one native object. Container count separate from drawable/part count. Chart/group child paths are not double-counted as independent parent success. |
| Loss accounting | Source intake ledger covers every inventoried item; target export ledger covers every supported object part and emitted target entity. Status partitions are disjoint. Source accounting may be complete even when target is PARTIAL/BLOCKED; count equality alone does not prove retention. |
| Descendant extraction risk | Track B independently flags importers.js:24 all(x,'sp') descendant traversal without parent transform, text run join at line 26, and connector p:cxnSp absent from line 32 aggregate. These are static silent-loss candidates, not newly reproduced failures. Inventory must enumerate sp/cxnSp/pic/graphicFrame/group/children and background/hidden policy, with parent path and shape/text parts; support cannot be inferred from presence of a child. |
| Unsupported status | Keep raw native unsupported payload reference, reason, source path, next Human action and affected target. UNSUPPORTED is disposition; HUMAN_CHECK_REQUIRED is uncertainty/action. Reject unknown enum instead of auto-correcting. |
| Confidence | Measurement status and confidence method are explicit; null is unmeasured, 0 is an actual score. Geometry parsed exactly does not imply semantic class KNOWN or calibrated truth. |
| Compatibility | IR persists independently. Editor projection is an explicit limited adapter with per-object support result. Reject a full projection if unsupported parts exist; an explicitly requested partial view retains omissions and IR original. Existing saved vdraw-mobile/1 is not migrated. |
| Extension policy | schemaVersion and approved extension namespaces fixed by A/Coordinator; route extractors cannot invent top-level keys to bypass validation. Schema validation and semantic validators are separate. |

## Formal schema outline (proposal only, no schema implementation)

Suggested schema identity: vdraw-drawing-ir/1.0.0-provisional. Final version, canonical bytes/hash and validation vocabulary must be fixed by Coordinator after review. A future version must not be called stable based on this document alone.

Top-level required: schemaVersion, contractStatus, documentId, sourceType, sourceAssets, pages, frames, calibrations, layers, issues, sourceInventory, lossLedger, relationships, evidence. Export evaluations reference a target request and IR contract version/hash.

Discriminated objects for the shared kinds line/polyline/rect/polygon/circle/ellipse/arc/text; required id/kind/frameId/nativeGeometry/drawingGeometry/sourceBinding/status/style/category/confidence. kind-specific geometry validates endpoints/radii/points/baseline and angle conventions. Rect may retain local vertices + transform rather than silently flatten rotation. Original source geometry remains optional only when the source genuinely has no parsed geometry, with an issue explaining why; a parsed PPTX object cannot omit EMU native geometry.

Cross-field semantic validators (beyond JSON Schema): reference closure; source hash matching; unit-role valid transform paths; invertibility/finite composition; calibration scope coverage; one ledger decision per source part; target entity ID coverage; no Generic text-to-dimension semantics; supported projection/export cannot drop parts; unknown/unmeasured does not become KNOWN/CALIBRATED.

Limits are bounded but route-aware. Reuse existing 30MB import / 50 PPTX slides / 20 PDF pages as compatibility evidence only; IR may need separate bounded complexity limits and cannot reuse 10000 Editor coordinate magnitude as an EMU bound.

## Component boundary and dependencies

Track A owns shared drawing-ir/ contract, schema, pure unit/frame/transform/calibration/ledger validation. This first Work writes only docs/architecture/tracks/A/.

Track B owns routes/pptx native inventory/extraction and mm DXF target; Track C PDF; D Paper; E Quality; F Photo. All bind to A version/hash. Coordinator alone stages shared core/importers/exporters/storage/render/UI/native changes. G owns independent expected values, actual Jw_cad Evidence and Round-trip gate.

No route is blocked from native source inventory/audit by schema finalization. B/C/D/F IR serialization and target integration wait for fixed common contract. E outputs evidence-backed quality evaluation for a specified asset/page/region; it does not declare geometry, scale or semantic correctness.

## Golden and meaningful test plan — NOT RUN

| Test family | Independent oracle / adverse case | Required assertion |
|---|---|---|
| U1 Paper mm vs real mm | 36000 EMU segment and Generic PPTX text “1000”; exact rational arithmetic | LAYOUT=1 mm; REAL_WORLD blocked; text remains UNKNOWN semantics. |
| U2 PDF unit | PDF UserUnit=2, crop origin not zero, rotation=90; separate manual/page-definition oracle | point×UserUnit×25.4/72 applied once; viewport raster scale excluded. |
| U3 Exact numeric source | safe-bound EMU and larger-than-safe lexeme | no numeric truncation; unsupported number explicit. |
| T1 transform order | parent translation + child scale + nonzero pivot rotation, asymmetric point set | B×A gives expected endpoint; reversed order fails. Native values unchanged. |
| T2 group/flip | nested group off/ext/chOff/chExt, flipH/V, y-axis inversion | endpoints/vertices agree with independent coordinates; orientation and signed sweep retained. |
| T3 geometric type | circle under nonuniform scale/skew, rotated rect | circle becomes appropriate ellipse representation or explicit target unsupported; never keep false circle. |
| T4 invalid mapping | NaN/Infinity, singular matrix, missing frame, zero homography denominator in valid region | BLOCKED with observed issue; no repaired answer or partial mutation. |
| C1 calibration | user reference conflicts with binding, calibration covers one plane only | HUMAN_CHECK_REQUIRED; unrelated geometry does not become CALIBRATED. |
| L1 conservation | text+shape, unsupported chart, group+children, hidden shape, rejected source path | each source part accounted exactly once; supported-target parts map to outputs; omissions cannot yield FULL PASS. |
| B1 provenance | changed source byte/hash, duplicate shape IDs across slides, missing original PDF parent | source mismatch blocked; cryptographic hashes distinct from legacy fingerprint. |
| R1 relationship | dangling id, permitted containment chain, prohibited self-reference | explicit per-relation policy, no inferred relation from lack of evidence. |
| E1 legacy adapter | existing vdraw-mobile/1 samples/candidates, negative-direction line, open polyline, rotation | existing contracts unchanged; unsupported projection explicit; exact legacy binding/contain metadata retained. |
| E2 save/edit history | native→display projection→Human edit→save/reload | native geometry and original hash unchanged; editable derivation/event trace and IR preserved. |
| Q1 target gate | one object supported by PPTX but unsupported by chosen DXF/Jw_cad target | target-specific ledger/readiness; parser success never actual-app PASS. |

Future existing tests to reuse without modification include input-001-regression.test.mjs, output-race-regression.test.mjs, vision-contract-005.test.mjs, photo-pipeline-005-007-adapter.mjs, photo-pptx-contain.test.mjs and signing/SAVE-001 tests. ENGINE-001 protection remains required; its exact suite entry must be identified in the existing regression manifest before downstream execution. Source baseline CI remains the authoritative historical execution. This initial Work has no new test run and does not claim these tests cover the new IR.

Numerical tolerances: exact unit algebra tested with rational oracle. Export arithmetic proposal ≤1 EMU equivalent remains provisional; target app/Jw_cad re-save tolerance must be independently measured and fixed with Human review. No precision threshold accepted by this Work.

## Open questions / observed blockers

1. Shared initial contract is prose PROVISIONAL; explicit frame/calibration/object/ledger collections and target-specific evaluation schema not fixed.
2. Safe native integer and unit-role coverage need normative definitions before B serialization. Supported source object parts and full/partial export partition must be fixed with B/G.
3. Existing Editor is not a general IR store: rotation/open polyline/native EMU limits require an adapter scope, not a schema rewrite.
4. IR→mm DXF backend and actual Jw_cad open/edit/save/Round-trip Evidence absent in architecture baseline. G reports actual Jw_cad unavailable in this Linux workspace; user's PC remains uninvestigated. No platform or compatibility claim is inferred.
5. Native PPTX semantic metadata is not verified by inspected exporter; no native dimension trust available from names/subject/notes alone.

Next bounded action proposed: Coordinator reviews these refinements with B/G, then dispatches Track A to implement only isolated shared drawing-ir/ schema + semantic validation + unit/frame/ledger tests, with version/hash freeze. Editor/UI/adapters/product integration and migration remain outside that next unit unless separately dispatched.

## Handoff gate

Audit/plan deliverable COMPLETE within limited scope. Architecture contract PROVISIONAL. New tests NOT_RUN. Product phase gate HOLD. Human Gate: no additional approval needed for this authorized docs-only review; actual product adoption and new migration remain Human-controlled. No Human approval substituted.
