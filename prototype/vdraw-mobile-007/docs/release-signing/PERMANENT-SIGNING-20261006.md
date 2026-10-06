# VDRAW 007 permanent signing contract

The owner reported the current installed identity on 2026-10-06:
`jp.dksc.vdraw.prototype007`, versionName `0.7.0`, versionCode `7`,
certificate SHA256 `c10b89c8b61d4d295de1717d23d593dffd5231d5d33828e5924c42d1e2843855`.
`CURRENT_INSTALLED_IDENTITY = VERIFIED_USER_REPORTED`.
The old private key is not recovered. Its search is closed.
`LEGACY_TO_PERMANENT_UPDATE_COMPATIBLE = NOT_PROVEN`.
Certificate equality alone never proves possession of the private key.

## Provisioning prerequisite and key custody

No permanent private key has been generated in this work. The current GitHub
connector excludes Secrets APIs and offers no Secrets write tool. No authenticated
CLI is available. Generating a key in a transient workspace before establishing
durable custody would not satisfy the owner's preservation requirement.

Provisioning must first establish a trusted Secrets-write route and an independent,
durable encrypted vault. Neither a repository nor a CI artifact is a key backup.
Use a dedicated PKCS12 RSA key (4096 bits, validity 10000 days), a unique alias,
and high-entropy passwords. PKCS12 store/key passwords must match for this
Gradle/JDK setup. Generate outside the repository in an owner-only directory.
Pass passwords through environment variables, never command arguments or logs.
Keep both the encrypted keystore and its recovery credentials in managed custody.
Before recording preservation, recover an independent backup and re-export its
certificate to verify the same SHA256. Retain a public receipt containing only
vault reference, encrypted archive SHA256 and recoveryVerification PASS.

Repository Actions Secrets contract:

| Name | Content |
| --- | --- |
| VDRAW_SIGNING_KEYSTORE_B64 | Base64-encoded permanent PKCS12 keystore |
| VDRAW_SIGNING_STORE_PASSWORD | PKCS12 password |
| VDRAW_SIGNING_KEY_ALIAS | Dedicated alias |
| VDRAW_SIGNING_KEY_PASSWORD | Matching PKCS12 key password |
| VDRAW_SIGNING_CERT_SHA256 | Lowercase certificate SHA256 |

Only the public certificate and public preservation receipt are recorded in
`scripts/permanent-signing-policy.json`. The pin must differ from the legacy
certificate. With missing Secrets, pin, or recovery receipt, CI reports BLOCKED.
Do not enter private values into chat, git, workflow inputs or artifact files.
Actions Secrets are encrypted inputs, not an independently recoverable backup.

## Build and acceptance

The separate inspector keeps its existing independent signing configuration.
Only VDRAW release tasks opt into `vdrawPermanentSigning=true`; a release task
without this flag fails. The five Secrets restore a mode-0600 keystore in a
mode-0700 directory under RUNNER_TEMP, outside the repository. Official keytool
checks its public certificate before Gradle uses it. The signing build disables
Gradle caches and removes temporary key material with an always-run cleanup.
No private key is uploaded, committed, or included in the APK artifacts.

APK A: versionCode 8, versionName 0.8.0.
APK B: versionCode 9, versionName 0.8.1.
Both keep package `jp.dksc.vdraw.prototype007`. Public A/B reports record actual
manifest values, APK SHA256, certificate SHA256, workflow run and source HEAD.
Official apksigner must verify the single pinned signer and v2 signature.

The emulator installs A and its CI-only instrumentation APK, uses the actual
VDRAW project constructor and LocalStore to save a two-element drawing, then
runs `adb install -r` for B. The test verifies the installed version/certificate,
private application marker, identical project JSON and identical WebView origin.
No uninstall, clear-data command, downgrade or fallback install is used.
The instrumentation APK is excluded from the final accepted delivery artifact.

The full regression reuses the approved checkpoint's unmodified runner, manifest
and product tests. It preserves the 006 tree and all product source blobs; only
the three explicitly named Android signing/instrumentation files are permitted
to differ. Accepted delivery requires every independent gate to pass. Presence
of a Secrets readiness report is not a claim that keys or APKs are accepted.

## Device migration after acceptance

Current user-device uninstall and data deletion are not authorized in this work.
Only after fixed A/B acceptance, ask whether the current 007 has saved projects.
If it does, verify a backup and recovery route before proposing replacement.
If it has no saved data, a single legacy uninstall followed by the accepted
fixed-signed installation can be proposed for a later explicitly authorized
step. Future fixed-signed versions use an increasing versionCode and the same
pinned key. A->B evidence does not prove compatibility with the legacy 007.
