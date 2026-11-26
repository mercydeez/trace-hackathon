# Claude Code prompt: qualifying or challenging passage, then freeze (26 November 2026)

Pasted by the owner into Claude Code, unchanged.

Implement one final feature in the existing TRACE repository. Let a student attach a second evidence passage to a claim and label it Qualifies or Challenges. Show both passages in the Claim Inspector, require fresh approval when either changes, and carry both into the reviewed brief. After verification and deployment, freeze the project.
Start by reading the repository instructions and tracing the existing Claim Inspector, evidence selection, approval fingerprints, export gate, verification report, and saved-project schema. Record the current production commit and rollback target. Preserve existing local changes and saved projects.
Add a second passage to a claim

* In the Claim Inspector, add Add qualifying or challenging passage. Let the student choose a passage from a source already saved in the project, using the existing evidence selection and provenance rules.
* Let the student choose Qualifies for evidence that limits where or when the claim applies, or Challenges for evidence that points against it. The student chooses the label and can change it or remove the passage. Keep this feature manual.
* Show the supporting passage and the second passage side by side on desktop and stacked on phones. For each, show the source, evidence origin, excerpt, and existing check result. Make it clear that Qualifies and Challenges are the student’s judgments.
* Preserve the existing workflow for claims with one passage. Older saved projects must open with their existing approvals intact.

Require fresh review and export both passages

* Extend the existing approval fingerprint and export gate. Adding, removing, replacing, or editing either attached passage, or changing the second passage’s label, must make the previous approval stale. Use the existing stale status and reapproval action. A missing passage or source must be shown as a blocker for reviewed export.
* In the reviewed brief, show the supporting passage and the qualifying or challenging passage under the claim, with their labels, source references, and provenance. Include both cited sources in the bibliography and list the source once if both passages come from it.
* Update the verification report to show both passages’ check results, their roles, and the student’s approval status. Reuse the existing report conventions for how much text is shown. Keep draft exports clearly labelled.

Verify, release, and freeze

1. Add targeted regression tests for adding and removing the second passage, switching its label, editing either passage after approval, and a missing linked source. Verify that older projects and single-passage claims still work.
2. Run lint, type checks, unit tests, the production build, and the browser suite. On desktop and phone, use a labelled demo to show approve → change a passage or label → reviewed export blocks → reapprove → export includes both passages. Open the downloaded brief and report to verify their contents.
3. Once the checks pass, deploy through the existing GitHub-to-Vercel workflow. Repeat the core scenario on the public site, verify the existing citation trap and APA 7 export, and confirm the public URL serves the final build.
4. Record the final commit, live URL, rollback target, and observed test results in the QA notes and prompt log. That is the freeze point. Stop feature work and polishing after the verified release. If a release-blocking regression occurs, use the recorded rollback target and report the blocker. Leave the hackathon deck and submitted materials intact.
