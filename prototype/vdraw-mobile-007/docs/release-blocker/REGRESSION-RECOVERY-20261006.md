# Release regression recovery — 2026-10-06

Tested source: `e1292b62499701c8fe2558f9c76d334dcfb5ef8e`, branch `work/vdraw007-regression-environment-20261006`. Approved runtime checkpoint `b2f9351b6418f2b552d95b96132650a297ea0afe` remains unchanged. GitHub Actions run `37347164239`, job `111888511462` succeeded.

Targeted gate: **18 PASS / 0 FAIL / 0 BLOCKED / 0 skip**, 180 actual unit cases. Full gate: **52 PASS / 0 FAIL / 0 BLOCKED / 0 skip**, 183 actual Node/Python unit cases plus browser/inspection/static obligations. All 29 formerly environment-blocked entries now have individual PASS evidence in the companion JSON, including eight explicit version/environment mappings. Twenty-seven per-entry fresh verdict snapshots preserve colliding performance output filenames separately.

Original 55 archive assets and all 45 archive executable entries remain byte-exact. The unchanged asset checker passed. The 006 subtree remains `47cabdf70e9aebf7c64a1e028e85c476df32a169`; 195 protected runtime and pre-existing checkpoint test blobs match. Test blobs in 007/tests increased from 75 at b2 to 81 at the tested source; these file counts are distinct from case counts.

CI3 real failures remain preserved. QA-approved PWA owner `4d798ed2ebf3d1ec14a5831ee55abcb19b018f80` uses a fresh ordinary persistent profile, preserving all 25 assertions including zero installability errors. Chrome 154 now executed all 16 product groups with zero PWA, page and console errors. QA-approved bounded observer owner `df7c9522b2e6b8c98a377aafdf1887f9d03f4664` inherits three tests and preserves the fourth test bounds; actual four-case PASS and independent negative controls reject surviving descendants and I/O/parse failures. Production process logic and old tests are unchanged.

The actual immutable 006-versus-007 performance gate verified 37 baseline web blobs, preserved all thresholds and passed with color ratio 1.0521881264. The separate performance-final-006-reference gate is explicitly historical 006/005 fixture evidence; it does not certify 007 runtime. Current 007 performance gates and the actual 006 comparison provide that coverage.

Artifact `11361790491`, 25,854,598 bytes, SHA256 `ee3e7cd4f05fae0478e27da619dbd9f3b637faded6853445540a8021f758401d`. Generated large logs, profiles and outputs stay in the retained Actions artifact. This documentation-only checkpoint must preserve the tested runtime, tests, harness, manifest and workflow exactly.

The artifact source-copy check is distinct from Git protection: 115 of 121 inspected runtime blobs were byte-exact, four hidden placeholders were omitted by the upload action, and capacitor sync regenerated two configuration files. The app configuration JSON is semantically identical with only tab serialization; generated Gradle paths change exactly eight historical 002 dependency references to current checkout node_modules. No claim is made that every artifact blob is identical to the repository. All 40 synchronized Android web assets match the current web source.

No APK was generated. Software regression PASS does not prove Android device acceptance or signing update compatibility. Fixture/protocol runs do not claim real AI or opening outputs in Microsoft PowerPoint/JwCad. Independent QA must approve the artifact before release-checkpoint adoption.
