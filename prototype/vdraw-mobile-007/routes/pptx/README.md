# Native PPTX inventory V1

Isolated source inventory only. No Editor/importer/exporter/UI changes, Drawing IR adapter, DXF, APK or Jw_cad acceptance.

`readNativePptx(bytes, {JSZip, DOMParser, XMLSerializer, crypto, origin})` accepts actual ZIP bytes. Browser defaults use already shipped JSZip and native browser XML/digest APIs. Node verification injects installed JSZip and a **test-only strict SAX/XML-js generic DOM adapter**; no new production dependency. Browser/app execution is NOT_RUN in this environment.

The machine-readable interface is `inventory-contract.json`. Its SHA256 is bound in returned `contract` and Round2 HANDOFF. Every original native xfrm decimal string and serialized source XML remain separate from computed geometry; no 1200×800 normalization occurs.

Objects include part/package hash, part/XML path, native id, role, native XML/xfrm/text/style, matrix+chain, components and issues. Source object counts and component counts use separate ledgers. Group metadata/container, hidden, unknown and explicit background policies remain visible. `unsupportedLedger` is a source-bound view of unsupported components with reasons/action. `accountingComplete` measures internal inventory parity only; it does **not** prove independent raw-source coverage or target retention. `EXTRACTED` means isolated source extraction only, not target export PASS.

Shape+text yields geometry and text components. Text keeps ordered runs, paragraphs and explicit breaks; no arbitrary newline between runs. Raw run/rPr XML (including font/color children) remains preserved; font/baseline/anchor/theme resolution is explicitly unfinished. Simple custom line polygons are parsed; arbitrary preset polygons/curves/compound paths are unsupported and retained in native XML.

Coordinates use column vectors and row-major matrices: parent multiplied by local. Candidate group mapping first maps chOff/chExt into off/ext, then rotates/flips about off+ext/2. Positive 5400000 is candidate clockwise 90 degrees (raw/60000) in the y-down source frame. Full affine rect quads and ellipse axis vectors are retained; nonuniform parent scaling combined with rotation is marked HUMAN_CHECK_REQUIRED because Office shape-rendering semantics are not verified by a general affine candidate. Source geometry is never reduced to an axis-aligned bounding box.

Primary provenance checked 2026-10-07:

- Microsoft ISO/IEC remarks for ChildOffset/ChildExtents: child rectangle participates in grouping/scaling/rotation. https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.childoffset?view=openxml-3.0.1 and https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.childextents?view=openxml-3.0.1
- Microsoft DrawingML Primer (OOXML Part 3, group transformation sections): child bounding rectangle maps into group bounding rectangle, but composed shape visual behavior needs careful treatment. https://download.microsoft.com/download/e/1/4/e14fb96f-83b8-4a2a-84db-7fa8acbe061a/Office%20Open%20XML%20Part%203%20-%20Primer.pdf
- Microsoft TransformGroup page has conflicting rotation prose (1/64000); this is not used as sole angle authority. Raw angle is retained, 5400000→90 is explicitly tested, standards/native app fidelity remains a separate QA gate.
- Microsoft AnimateRotation ISO/IEC remarks bind ST_Angle to 60000 per degree, with negative values counterclockwise: https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.animaterotation?view=openxml-3.0.1

Slide EMU→mm is layout only. Real-world scale remains UNSCALED. Generic text such as 1000 does not become dimension/pipe/equipment semantics. Native origin labels are caller-reported and do not prove semantic metadata.

Run source inventory tests with:

`node --test prototype/vdraw-mobile-007/routes/pptx/tests/native-inventory.test.mjs`

`CODEX_PRIMARY_RUNTIME_NODE_MODULES` locates available test dependencies. Frozen synthetic native ZIP fixtures and hashes are in `fixtures/manifest.json`; their source generator is retained. No real app or practical accuracy claim follows from these fixtures. Missing/unsafe source or package data rejects atomically with error code/source. Every product gate remains HOLD.
