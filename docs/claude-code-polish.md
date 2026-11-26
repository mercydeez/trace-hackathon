# Claude Code prompt: AI-use counts, report status, favicon and polish (26 November 2026)

Pasted by the owner into Claude Code, unchanged.

Act as the engineer responsible for the final TRACE release. Start from the current repository and deployed build. Fix the AI-use statement and verification report, add a favicon, clean up the browser-tab title and visible copy, and make a restrained UI polish pass. Test the fixes on the public site after deployment.
Read the repository instructions, check the working tree, and identify the current production commit and rollback target. Preserve existing work and the submitted deck. Keep the changes small enough to verify through the demo.
1. Fix the AI-use statement
Reproduce the case where Gemini drafts three claims, the student rejects one, and the report incorrectly says AI drafted only two. Distinguish how many claims AI drafted from how many were approved and included. When the recorded data supports it, say “AI drafted three claims. I approved and included two.”

* Use recorded draft runs and claim decisions. Handle multiple runs, edited or rejected claims, all-rejected drafts, manual claims, and labelled samples. For older projects with incomplete records, describe only the counts TRACE can substantiate.
* Keep the statement consistent in the copyable text, the verification report, and the downloaded brief. Report provider output discarded by validation separately where that count is recorded.
* Add a regression test for the three-drafted, two-included case and confirm the all-rejected case still discloses that AI was used.

2. Fix the verification report status
The report currently says “Reviewed export: ALLOWED” when review checks pass, even if reference formatting is still running or has failed and the download button is disabled.

* Show review status and download readiness separately. For example, “Review checks passed. Formatting references.” or “Review checks passed. Reference formatting failed. Retry to download.”
* Use the same readiness state for the report and the export controls. Cover review blocked, formatting in progress, formatting failed, and ready to download. Keep the downloaded report available when review is blocked, and avoid promising a draft download when there is nothing to export.
* Add a browser regression test that makes the formatter fail, compares the report with the disabled button, then retries and confirms both show the ready state.

3. Add the favicon and polish the UI

* Add a local TRACE favicon using the existing brand colors. Use a simple mark that stays legible at tab size. Check that it appears on both `/home` and the workspace in a fresh browser after deployment.
* Set a consistent browser-tab title of `TRACE | Research you can defend`. Remove em dashes and unnecessary punctuation from the title. Review visible interface copy for repetitive AI-style phrasing, filler, and generic marketing language. Keep necessary trust labels, disclosures, source wording, and meaningful instructions.
* Use the existing Framer Motion setup for a few transitions that draw attention to useful information. Prioritize the hero’s quote match changing to a mismatch, the Claim Inspector opening, and the export state changing after approval. If a scroll reveal helps the landing page, use one subtle reveal for the workflow section. Keep the content visible by default and respect `prefers-reduced-motion`.
* Keep Check a reference, Run the citation trap, and Open the demo project easy to find. Test keyboard navigation and phone widths. Avoid scroll hijacking, heavy parallax, and animations that delay an action or distract from the evidence.

4. Test and ship
Run lint, type checking, unit tests, the production build, and the browser suite. Verify the disclosure and report regressions in a test build before promoting it. Keep the existing Vercel release available as the rollback target.
Deploy through the repository’s existing GitHub-to-Vercel workflow. On the public site, use a fresh browser session and the built-in demo to check the favicon and tab title, Home and Resume, the citation trap, and the final export.
Run Draft with AI through the live UI using public demo evidence. Reject one generated claim, approve the remaining eligible claims, then compare the copied AI-use statement, downloaded verification report, and reviewed brief. Confirm the drafted and included counts agree. Use local browser request interception against the deployed app to simulate a formatting failure and verify the report and button still agree. Clearly distinguish that simulated failure from a real production outage. If Gemini is temporarily unavailable, report the live check as unverified and record any fixture-backed result separately.
Finish with the public link, deployed commit, rollback target, and a short table of what passed on the live site. Update the prompt log and QA notes with the results you actually observed.
