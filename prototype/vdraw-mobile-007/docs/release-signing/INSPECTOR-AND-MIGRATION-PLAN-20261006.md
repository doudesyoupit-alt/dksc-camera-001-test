# 007 installed signature inspection and permanent signing migration

Repository: doudesyoupit-alt/dksc-camera-001-test
Branch: work/vdraw007-signing-release-20261006
Inherited HEAD: 525a1cd1eb6c3eccc3353f97b6d0e74e059843eb (matched remote before writes)

This continuation adds an independent, permission-free native inspection app. It does not recreate or amend prior signing investigations. Previous baseline apksigner verification run37342418509 remains the authoritative verification. Every pre-existing blob, including 006/007 application code, prior docs, checkpoint and workflow, must remain identical. main and validation are not changed.

## Inspector contract

- Application ID: jp.dksc.vdraw.signatureinspector (different from VDRAW).
- Launcher label: VDRAW 署名確認. Version: 1 / 1.0.0. Minimum API28, target36.
- Exact `<queries><package>` for jp.dksc.vdraw.prototype007; no QUERY_ALL_PACKAGES or any other permission.
- Only reads PackageManager.getPackageInfo with GET_SIGNING_CERTIFICATES, versionName, longVersionCode, and current APK signer certificate DER bytes. SHA256 uses the Java standard MessageDigest API.
- getApkContentsSigners intentionally retrieves **current signers**, rather than accepting historical rotation certificates as the current certificate. All current signers are displayed; only a single exact baseline signer plus version7/0.7.0 is reported as baseline identity match.
- API33+ uses PackageInfoFlags; older API28+ uses the int flag overload. System bar/cutout insets are accommodated on API30+ and legacy window insets on earlier versions.
- No APK extraction, files or preferences, data read/write, network, VDRAW launch, install/uninstall, shell, providers, or credential access in the inspection app. Results are on-screen and selectable, with no automatic sharing or persistence. It only queries the same Android user/profile as the inspector.
- Missing/inaccessible package or missing signer cannot produce a match. This is OS metadata observation, not byte equality of installed APK with the downloaded APK; APK SHA256 is deliberately not claimed.
- Independent standard Android debug signing for this inspection build. Its key is not the VDRAW permanent key, and its signer must differ from baseline VDRAW. It is not a permanent-update product.

User flow: install inspection APK, open VDRAW 署名確認, press 007の署名を確認. Device result remains NOT_VERIFIED until the user supplies the displayed result. A screen capture of this result can then establish observed metadata; it is not a cryptographic remote device attestation.

## CI validation

Dedicated push workflow is scoped to this existing branch and new inspector files. Read-only repository/actions permissions. Build/lint, eight unit tests (known SHA256, exact identity and negative certificate/version/multiple/null signer cases), official apksigner and aapt verification of built APK, zero merged permissions, and independent signer check.

Disposable hosted emulator tests on API29 and35 install the **existing** baseline artifact11333531784 from run37283743856, after exact baseline APK SHA256 verification. This APK is not rebuilt. Tests read actual installed metadata and baseline signer and press the real native button. A second negative test removes the fixture **only from the disposable emulator** and checks missing-package behavior. These operations never connect to the user device; ADB is not required of the user.

Accepted-delivery artifact is generated only after build and both emulator jobs succeed. This does not count as real-device acceptance, overall007 regression, or existing007 UPDATE_COMPATIBLE.

Official API references:
- https://developer.android.com/reference/android/content/pm/PackageManager
- https://developer.android.com/reference/android/content/pm/SigningInfo
- https://developer.android.com/training/package-visibility/declaring

## Subsequent migration plan (not executed in this continuation)

Even an exact installed baseline certificate match leaves existing007 UPDATE_COMPATIBLE **BLOCKED** while its private key is NOT_RECOVERED. A public certificate or APK cannot provide the signing private key. An inspector APK signing key never resolves this block.

1. Generate a new dedicated VDRAW permanent signing key in a secure authorized signing environment. Use an explicit release signingConfig for jp.dksc.vdraw.prototype007, not a runner-generated debug keystore. Record only the public certificate fingerprint. Record the old-to-new certificate change as a migration, not an update.
2. Store keystore and password securely through GitHub Secrets or equivalent secure store, and retain a separately encrypted recovery backup with controlled access. No secrets, base64 key values, passwords or tokens in chat, logs, Git commits, build reports or downloadable artifacts. Do not generate a key until a supported safe persistence route is ready; current GitHub connector has no secrets-write tool.
3. Restore key into a temporary CI signing directory, fail closed on missing secrets/fingerprint mismatch, use environment-backed signingConfig, remove temporary key at job end, and upload public APK/evidence only. Never make assembleDebug silently generate a new VDRAW key as fallback.
4. After implementation/QA release gates independently pass, create a fixed-signature VDRAW APK with versionCode >=8 and versionName reflecting that build. Official apksigner/aapt checks must confirm applicationId, actual version, intended new certificate, APK SHA256 and source HEAD/run.
5. On a disposable emulator, install fixed-signed version8, save a representative valid project, update to fixed-signed version9 using the same stored key, and prove PackageManager signature identity plus data/project reopen and output consistency. Compare both public certificate fingerprints. This proves new-to-new compatibility only, never old007-to-new8 compatibility.
6. Before any real-device migration, determine whether current007 contains saved projects or unfinished work. The permission-free inspector cannot inspect private project data and must not imply zero projects.
7. If projects exist, produce an application-supported backup/export, check completeness and reopen/import using a non-destructive test environment. If export/recovery is unavailable or unverified, hold migration. Retain all old APKs and snapshots.
8. **Current instruction prohibits uninstalling existing007 and deleting data.** A once-only old007 uninstall remains a future explicitly authorized user action after verified backup and readiness; it is not authorized here. No automation or inspector control may remove the app. Android uninstall itself removes private data, so backup verification must precede this step.
9. Install fixed-signature version8, restore verified backup if needed, check projects and functions on the user device, then use same-key version9 for a real update acceptance when appropriate. Never delete recovery evidence after this transition.

Current statuses: user installed007 identity NOT_VERIFIED; old007 private key NOT_RECOVERED; old007 updateCompatibility BLOCKED; permanent VDRAW key NOT_CREATED; real-device uninstall/data-change NOT_PERFORMED.
