# Drawing IR candidate.2 — unknown appearance contract delta

Version `vdraw-drawing-ir/1.0.0-candidate.2`; isolated candidate, pending G independent review. Product gate HOLD. Candidate.1 files are immutable. Only this separate directory and Round3 evidence files are new.

Known primitive geometry may be source SUPPORTED / REPRESENTED while appearance remains unknown. This declares geometry representation only, not appearance fidelity or successful DXF/Jw_cad retention. All original inventory/component denominators remain required. No geometry, transform, physical-unit or calibration algorithm changed. Text still requires the original complete geometry and font contract; unsupported text stays source-ledgered.

`validateStructure` checks schema shape. `validateDrawingIR` also enforces semantic value/state/provenance and export gates. Structural acceptance alone never implies faithful retention. The schema retains its original checked keyword subset.

Each style has mandatory `resolution` entries for stroke, fill, width, dash, opacity. Each entry has state, evidenceIds, sourceBinding, propertyPath, rawLexeme, encoding, reason, policyId. Per-field source evidence must reference an existing SOURCE_XML Evidence record with the source asset SHA256, and sourceBinding must exactly match the object. EXPLICIT raw lexical parsing must match the actual field value. Width remains in native source units; no appearance width conversion is inferred. propertyPath identifies source attribute location; source package/native inventory keeps original XML. The validator validates internal identity and lexical consistency; independent source oracle must verify actual XML at the specified location. No pure JSON validator can authenticate an untrusted caller's claimed source or Human approval.

| State | Value and provenance requirements |
| --- | --- |
| EXPLICIT | Raw lexeme and supported encoding parse exactly to value; source Evidence and identity required; reason and policyId null. |
| UNRESOLVED | Value and raw lexeme null; encoding UNRESOLVED; reason required; no default policy; object UNKNOWN or HUMAN_CHECK_REQUIRED and source-bound STYLE_UNRESOLVED_<field> issue required. |
| NOT_APPLICABLE | Value/raw lexeme null; reason and source Evidence required. Only width/dash under explicit noFill stroke, or opacity when both stroke/fill are explicitly noFill. |
| SPEC_DEFAULT | Vocabulary reserved; rejected in candidate.2 because no independently validated policy and applicability Evidence is adopted. |

Explicit noFill is `{state: EXPLICIT, encoding: OOXML_NO_FILL, rawLexeme: "noFill"}` with a null stroke/fill value. Unknown paint uses UNRESOLVED with null rawLexeme. These must never be conflated.

Supported explicit lexical encodings: HEX_RGB (six native hexadecimal digits), OOXML_NO_FILL, NUMBER (finite nonnegative lexical number), DASH_JSON (explicit nonnegative numeric array; synthetic/general adapter encoding only), OOXML_ALPHA_100000 (native integer alpha divided by 100000). This candidate does not resolve theme colors, preset dash inheritance, font/layout defaults or specification defaults. Adapters retain such properties UNRESOLVED.

FULL export readiness rejects unresolved style or issues containing UNSUPPORTED/UNRESOLVED as well as all original omissions, unsupported source parts and calibration/unit gates. PARTIAL/BLOCKED may report honest accounting without declaring faithful output. Product gate remains HOLD even on a valid contract. Geometry source retention and target appearance fidelity are separate.

Focused checks: `node --test prototype/vdraw-mobile-007/drawing-ir/candidate-2/tests/style-unknown.test.mjs`. No completed candidate.1 regression or product work is rerun. New test fixtures clone pinned candidate.1 synthetic inputs and add only required style provenance. No product imports, dependency changes, UI/editor/storage/signing/APK integration or actual Jw_cad run.
