# Bounded-process test observer race adapter — 2026-10-06

Base: `57e0351c3aa4b1469bb116e68e8daf9286907f9c`.

CI run `37345005037` full regression failed the descendant cleanup check with `FileNotFoundError` at `/proc/3048/stat`: the original observer first checked `exists()` and then read a file that disappeared between those operations. The limited suite had passed the same four checks. This is test observation TOCTOU; the production process-group cleanup is unchanged.

The new adapter imports the original module and inherits three tests unchanged. It overrides only the descendant test, preserving the original subprocess command, timeout 0.4 seconds, whole-call limit 3 seconds, 20 observations at 0.02-second intervals, zombie interpretation, and live-child failure text. It reads stat directly. An ENOENT is accepted only when the PID directory has vanished; an existing PID with missing stat, permission failures, other I/O errors, and malformed data propagate as errors. The original test remains byte-exact. There is no added skip decorator; a non-POSIX environment fails the check.

Validation: actual adapted suite **4 PASS / 0 FAIL / 0 skip**. Controlled disappearance reproduces original FAIL and adapted PASS. An actual surviving child produces the original `child process remained alive after timeout` failure; its temporary process is then killed and waited for. Additional checks reject permission/parse/I/O errors and missing stat with an existing PID, accept zombie as before, and reject a live process. The companion JSON records source hashes and bounds.

Raw test SHA256: `88e4b72883afae131949a8027e980cfb094a25fa5275b1406272609ad05adac7`.
Production SHA256: `e47de980610b02e3174afa94bac686c35fc4defa8548197d0cd2d26c38cfb4ee`.

Independent QA `/root/qa_release` reviewed the bounds and independently executed the adapter: **4 PASS / 0 FAIL / 0 skip**. Its separate negative controls confirmed vanished-PID acceptance and rejection of existing-PID ENOENT, permission/I/O/parse failures, and an actual surviving child with the original failure message. QA approved publication; its evidence belongs to `work/vdraw007-qa-release-20261006`. The Regression Environment owner must explicitly map the original four obligations to the adapter command while preserving the archived original; neither the permanent asset inventory nor the test obligation count may decrease. This correction does not claim the full browser regression or release gate PASS.
