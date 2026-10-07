# Drawing IR V1 isolated freeze candidate

Version: `vdraw-drawing-ir/1.0.0-candidate.1`.
Schema exact-byte SHA256: `65f43167210d86fac84c9918cfc1cd7266afb05f8a53c2c5b240d4f4584096c8`.
Status: FREEZE_CANDIDATE_PENDING_INDEPENDENT_REVIEW. This immutable candidate is an isolated common contract, not Editor, DXF, Jw_cad or product acceptance. No extra Human approval requirement is introduced for isolated contract adoption; Coordinator decides after independent review. Human final product adoption stays HOLD.

## Files / commands

`schema.json`: strict JSON Schema 2020-12 using only the checked subset. `build-schema.py`: deterministic stdlib-only source generator. `version.mjs`: version/hash binding. `validate.mjs`: pure dependency-free structural and semantic validator, exact layout unit helpers and matrix composition. `tests/fixtures.mjs`, `tests/contract.test.mjs`: synthetic fixtures and named positive/negative contract cases. No legacy imports or product dependencies.

From repository root:

```sh
python prototype/vdraw-mobile-007/drawing-ir/build-schema.py
node --test prototype/vdraw-mobile-007/drawing-ir/tests/contract.test.mjs
```

Node runtime used for verification: v24.19.0; JSON import attributes are required. Browser/Android runtime integration has NOT been performed. No root package/dependency changes.

`validateStructure(ir)` returns structural schema errors only. `validateDrawingIR(ir)` adds cross-reference, binding, unit, frame, calibration, geometry, source/target accounting validation. Return `.ok` means IR_CONTRACT_ONLY with `productGate: HOLD`. No mutations, migrations, repair, network fetch, AI or hidden inference. Unknown schema, nonfinite/unsafe coordinates, dangling references and unexplained loss fail closed. This is a checked implementation of the schema's used keyword subset, not a universal JSON Schema library; tests verify keyword coverage and structural/semantic distinction.

## Canonical data and unit policy

- Envelope includes sourceAssets/pages/frames/calibrations/transforms/layers/objects/sourceInventory/sourceLedger/relationships/issues/exportEvaluations/evidence.
- `physicalUnit`: EMU/PT/PX/MM/UNSCALED. `unitRole`: SOURCE/LAYOUT/REAL_WORLD. Uppercase unit vocabulary follows Round2 dispatch; previous prose lowercase pt/px/mm is descriptive only.
- Native SOURCE frames are exactly EMU for PPTX, PT for PDF, PX for Photo/Paper, and carry matching pageId. UNSCALED is a declared abstract derived unit with no physical conversion; it cannot substitute for known source coordinates. `scaleStatus` remains independent: UNSCALED does not erase native PPTX/PDF paper unit.
- `layoutMM`: EMU/36000; PT×25.4/72×UserUnit; MM unchanged. UserUnit belongs only to PDF PT. PX/UNSCALED have no implicit mm conversion. Native EMU/PT layout transform has explicit matrix evidence; it does not establish REAL_WORLD scale.
- Photo/Paper pixel→MM and any SOURCE→REAL_WORLD transform require referenced scoped calibration and matching ratio/unit/Evidence method. Paper-plane rectification, paper layout size and real-world scale are separate transforms. A document CALIBRATED summary cannot expand calibration to unrelated objects.
- sourceBinding is `{sourceAssetId,sha256,pageId,nativeObjectId,partPath}`. Part identity prevents same shape ID collisions across pages and shape/text parts. Asset SHA256 is cryptographic content identity; legacy noncryptographic fingerprints are not relabeled hashes.
- `nativeNumbers` record exact lexical values and nativeGeometry JSON pointer paths. EMU geometry coordinates require safe integer lexemes/value consistency and complete numeric coverage. Angle fields are degrees with explicit direction/convention and retain numeric lexeme separately. PDF PT keeps lexeme plus parsed finite numeric value and numeric coverage; original payload stays immutable at source URI. Native coordinate data never passes through 1200×800 first.

## Geometry / transform policy

Matrices are row-major, column-vector, composition NEXT_TIMES_PREVIOUS; explicit frames and referenced transform chains connect native to derived geometry. Native geometry remains unchanged when derived geometry changes. `rotation` is preserved source declaration metadata (DEG, CW/CCW, pivot); it is never applied a second time by validator/exporter. Any source rotation/flip/group operation used to produce drawingGeometry must exist in the transform chain and independent source-reader oracle. An IR schema cannot infer an omitted transform from a self-consistent, incorrect source declaration.

Represented/validated primitive coverage:

- line: both endpoints, including negative direction/zero-width, retained.
- polyline/polygon: complete ordered vertex list and closure retained.
- rect→rect: positive axis-aligned affine transformation only; all four corners compared. Rotation/reflection/shear uses exact ordered rect→polygon quad or is unsupported, not a false bounding rectangle.
- circle→circle/ellipse and ellipse: transformed native basis axes must remain orthogonal; radii, center and derived orientation validated. Rotated ellipse under nonuniform scale causing nonorthogonal axes and general skew are rejected. A future principal-axis solution needs a new tested capability; no naive radii×scale acceptance.
- arc: native center/radii, similarity transform, start/sweep/direction validated; nonuniform/general curve/homography transformation rejected.
- text: content/runs/newlines/font identity, anchors/baseline and size compared; non-similarity transform rejected. Actual font substitution/rendering/editability is a target/app Gate.
- Homography requires pole-free denominator over validRegion and every native endpoint/vertex or conservative curve bound inside that region. Curve homography is currently unsupported; perspective lines/polygons retain explicit region.

Arithmetic comparison tolerance is 32×machine epsilon×max(1, compared magnitudes), a floating evaluation consistency bound. It is not the pending actual DXF/Jw_cad physical tolerance and not a statement of practical accuracy. G independently checks exact/rational fixture expectations and later actual-app error.

## Accounting / evidence authority

sourceInventory distinguishes CONTAINER/DRAWABLE_PART/BACKGROUND/HIDDEN/NON_DRAWABLE and preserves source paths, unsupported reasons and next Human actions. Container parent references cannot substitute for geometry/text drawable parts. sourceLedger must account for every inventoried item, once. Supported drawable parts require source-bound objects. Unsupported/explicit exclusions retain reasons; policy exclusion requires Evidence.

Each target export evaluation fixes target frame/unitRole, required supported drawable part IDs, distinct retention ledger and output entity mappings. Complete source accounting does not imply target retention. Duplicate/dropped component, denominator narrowing, omitted target mapping or unexplained entity rejects. Unresolved unsupported source or partial retention cannot declare FULL. FULL is only a submitted structural retention claim verified within IR, never Jw_cad/product PASS.

The validator does not parse the original asset or dereference Evidence URIs. If an original component is omitted from BOTH inventory and objects, internal validation cannot discover it. Original-source completeness belongs B's native OOXML reader and G's independent oracle. Hash content match, producer authority, Human observation validity and genuinely trusted Evidence must be verified outside this pure module. An arbitrary METHOD string is not proof of authority.

Category/semanticColor meaning requires referenced VERIFIED_SEMANTIC Evidence; calibration requires CALIBRATION_<provenance> method; KNOWN relationships require VERIFIED_RELATIONSHIP method. Honest UNKNOWN relationships retain binding/Evidence and are not inferred true. These method requirements enforce structure, not authentication of the referenced reviewer. MODEL_SCORE is not actual accuracy; UNMEASURED confidence is null, never fabricated zero/100%.

## Freeze and future blockers

Candidate freeze blockers: independent G/Coordinator review of these fixed schema/runtime bytes and original blob protection is still pending at A handoff. No known A test failure remains. Unsupported geometry classes are intentional frozen capability boundaries, not reasons to imply universal geometry support.

Future Gate blockers (do not block isolated contract candidate): native-reader→shared-IR adapter, Editor projection and save/reload adapter, mm DXF backend, actual Jw_cad Open/select/edit/save/Round-trip, Human-reviewed physical tolerance, actual OCR/Camera/Photo precision. All remain NOT_RUN/NOT_IMPLEMENTED here. Existing vdraw-mobile/1, 006, fixed signing, SAVE-001, Golden and all existing product source/tests remain unchanged.
