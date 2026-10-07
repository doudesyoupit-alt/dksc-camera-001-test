# Track B Round2 isolated native inventory

instruction_id: VDRAW-4ROUTE-B-ROUND2-20261007-V1
Status: IMPLEMENTED_INVENTORY_SCOPE_ONLY / PRODUCT_GATE_HOLD

Native PPTX ZIP bytes are inspected with existing JSZip and injected browser XML/digest capabilities. The new routes/pptx module retains original EMU/xfrm strings, slide physical size, package/part/XML/object identity, parent group order/pivot/flip and full affine geometry. Separate source and component ledgers preserve connectors, geometry+text, paragraph/run/br, hidden/unknown/background, reasons and Human actions. No legacy importer/exporter, existing tests, Golden, signing, Android, Editor, shared IR or CAD outputs were changed.

34 named source-inventory tests PASS / FAIL 0 / BLOCKED 0 / skip 0. Four tests execute the unchanged pinned legacy importer with only Node device/DOM boundaries injected, reproducing group coordinate omission, cxnSp silent omission, text+shape geometry loss and artificial run newlines. Six fixed synthetic native ZIP packages are preserved with SHA256 manifests. Exact commands, denominator, logs, artifacts and prior failed adapter witness are in round2-evidence/TEST-RESULTS-V1.json.

Basic group source mapping is tested independently: off + (child - chOff) * ext/chExt. Matrix convention is row-major/column vector, parent * local, rotation candidate raw/60000; raw 5400000 is 90 degrees. Complex nonuniform group plus rotation retains full rect quad/ellipse axes and native chain with HUMAN_CHECK_REQUIRED. Browser/Office/Jw_cad remains NOT_RUN; synthetic extraction is not practical accuracy or native app visual acceptance. Color/theme/font/text layout inheritance is preserved rather than claimed resolved. Native source labels do not establish authoritative semantic metadata.

Shared IR candidate is Evidence only: A immutable 3e1f6892ff5c6b06644b07b8247ccd9053b978db, schema version vdraw-drawing-ir/1.0.0-candidate.1, SHA256 65f43167210d86fac84c9918cfc1cd7266afb05f8a53c2c5b240d4f4584096c8. No adapter exists in this round. Source contract hash and implementation hash are recorded in HANDOFF-ROUND2-V1.json. Initial HANDOFF is preserved.

Next bounded action: coordinator receives independent G inventory/False PASS results before dispatching a pinned common-IR adapter unit. Phase1 product acceptance, target retention, mm DXF and Jw_cad roundtrip remain HOLD/NOT_EVALUATED.
