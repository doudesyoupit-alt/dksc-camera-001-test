# Track G Round3 independent candidate.1 qualification

B fixed HEAD: `4e6e23e31ed0f2e62ef57647518cf65ab6f8dd22`. Adapter SHA256 `5393fbcceee252072f58cd10ebb021586b70b9b7dafa4649dcbc9a296a4ead73`. A candidate.1 HEAD `3e1f6892ff5c6b06644b07b8247ccd9053b978db`, schema/validator unchanged.

Independent verdict: **SOURCE_TO_IR_PRODUCT_CONNECTION_BLOCKED**. Source accounting and geometry sidecar match the original package/XML/EMU; all four packages produce **zero drawable IR**. Correct ledger accounting and numerical sidecar conversion do not complete PPTX → drawable IR or qualify DXF/Jw_cad.

| Fixed fixture | Original objects (excludes metadata/background) | Components (excludes background) | Geometry / text denominator | Sidecar geometry candidates | Drawable IR | Comparison checks |
|---|---:|---:|---:|---:|---:|---:|
| native-vdraw-n01 | 6 | 8 | 6 / 2 | 6 | 0 | 500 |
| generic-synthetic-g01 | 9 | 9 | 5 / 1 | 5 | 0 | 520 |
| generic-synthetic-g02-nested | 10 | 9 | 5 / 1 | 4 | 0 | 499 |
| synthetic-g03-expanded | 15 | 17 | 12 / 4 | 8 | 0 | 899 |

Totals: **77 new named tests PASS** (31 source truth, 19 normalized source checker, 13 numerical IR oracle, 14 fixed-B adverse cases), **2418 source/sidecar comparison checks PASS**, **4 saved IR structural validations PASS**, FAIL 0, skip 0. Named tests, comparison checks and structural documents are separate denominators. Original Round2 60/391 checks and B35 tests were reused, not rerun or added to these totals. No real application accuracy is inferred.

New synthetic fixture and design/source truth were committed at `478383bf506123b97b0b94d1d9fbba84af34295f` before inspecting B adapter results. Source view checker commit `8f8c7e440b49a0002e1470a5ed92ea95706417d9`, independent numerical preparation `1960ea230abdd6b2af33b55df12ba67177f01c70`. Old G 36 source files matched GitHub blob identities; fixed B local 37 implementation/evidence files matched GitHub tree, and 25 files matched B Evidence SHA256. New G files only.

Independent comparisons read original XML and full transform matrices, source type/roles/native raw identity, paragraph/run/br text, direct color/rotation/flip, complete ordered primitive points, basis matrices, physical extents, relationship slide order, source/component/IR ledger identities and reason/Human action. Geometry-sidecar page EMU and y-UP CAD layout mm are compared to independently derived original-source endpoints/vertices. CAD conversion uses x=EMU/36000, y=pageHeightMM−EMU/36000; it is paper/layout MM, not real-world calibration. Arithmetic bounds 1e-7 EMU and 1e-10 layout mm are QA numerical bounds only, not actual-app acceptance.

Arc/curve/triangle/future source, asymmetric generic nested affine, raw theme/master/background and unresolved text/style are retained in immutable source/native package + explicit ledger; they do not become invented drawable defaults. Raw theme/master part bytes remain recoverable through original asset SHA256; the adapter does not resolve or independently surface those dependency styles as target truth. External Generic app packages=0, actual PPTX app=NOT_RUN, real Jw_cad=NOT_RUN, round-trip=NOT_RUN, product Gate HOLD.

The blocking candidate.1 fields are mandatory numeric `style.width`, `style.opacity`, nonnullable `style.dash`, and paint null values without a distinction between explicit no-fill and unresolved source paint. Missing explicit alpha/dash/width causes even directly known geometry to remain sidecar-only. The narrow candidate.2 change may retain known geometry with null unresolved style fields plus per-field state/provenance; unknown attributes must keep target FULL blocked, must preserve original inventory denominator, and must never establish REAL_WORLD or actual-app PASS. Text anchor/baseline/font remain unresolved; do not broaden nullable text geometry without a separate contract/test/QA decision. G did not modify A or B.

`qa/phase1/round3/MM-DXF-ORACLE-INTERFACE-V1.md` prepares the independent numerical DXF oracle interface and actual Jw_cad checklist only. A writer can be prepared separately, but candidate.1 product connection and actual Jw_cad Gate remain blocked. Keep candidate.1 immutable, independently review A candidate.2 at its fixed HEAD, then dispatch a bounded B adapter delta and independent G comparison using the same frozen source truth. C/D/E/F stay held.
