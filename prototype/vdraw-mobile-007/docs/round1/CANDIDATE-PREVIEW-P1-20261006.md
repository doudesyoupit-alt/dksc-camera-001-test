# Saved candidate review P1 correction

Baseline: `70f9b5be972573906328e5d72b0318473ff5fa1c`. Branch: `work/vdraw007-fix-candidate-preview-20261006`.

Stored candidate opening after adoption previously checked the adopted active page against the original candidate page binding, then threw before rendering the review and discard controls.

For read-only review, an unchanged, uniquely identified stored candidate resolves its original bound page. The same coordinate frame, dimensions, source fingerprint, source/page IDs and geometry contract are still validated. The returned page is cloned. Unstored candidates and adoption retain the original strict active-page contract. No page is selected or modified by review.

The candidate sheet catches unsafe preview errors to display a warning and explicit discard controls; malformed target entries are omitted from target buttons. Discard changes the candidate status only and keeps original and edited adopted pages. No automatic discard occurs.

Producer verification: 119 focused Node cases PASS, FAIL 0, skip 0, including unchanged independent QA 31 cases and 8 new unit cases. Real Chromium browser flow confirms save/reload, three review modes, wrong-page re-adoption rejection, original/manual edited page preservation, explicit discard, missing binding and null-element warning/discard. Page errors 0; external requests 0. Browser evidence is not Android or provider acceptance.

Existing tests are unchanged. New tests: `tests/candidate-preview-regression.test.mjs` and `tests/candidate-preview-flow.mjs`. Browser run: `VDRAW_CHROMIUM=<working Chromium> node tests/candidate-preview-flow.mjs`. A standard Playwright install works when the environment override is omitted.

Independent QA formal HEAD review and full integration regression remain required. No APK generated.
