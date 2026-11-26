# Claude Code prompt: final release (26 November 2026)

Pasted by the owner into Claude Code, unchanged.

Act as the senior engineer responsible for the final TRACE release. Work in the existing Next.js and TypeScript repository. Fix the navigation, audit and harden the backend, polish the core screens, add a small verification report, and deploy the verified build to the existing Vercel project.
Start by reading the repo instructions, checking Git status, and finding the current production release. Preserve existing working-tree changes. Reproduce reported problems, identify their root causes, and implement focused fixes. Use the comparison with Paper Trail as product context. Verify every finding against TRACE’s own code before changing it.
1. Make the landing page reachable from the workspace
The reported bug is that once a student opens the demo or a project, there is no obvious way back to the landing page.

* Add a visible Home link in the desktop and mobile workspace. Make the TRACE wordmark link home too. Keep Home accessible when the project navigation collapses on a phone.
* Give the landing page a stable URL that opens it even when a project is saved. Use existing navigation conventions and preserve the current resume behavior for returning users. Reuse the existing landing component.
* Make it easy to resume the same project from Home. Returning home must preserve the active project, pending review decisions, notes, and changes the app has saved.
* Test fresh visits, workspace → Home → resume, direct landing URL visits with stored projects, refresh, and browser Back/Forward. Check keyboard focus and mobile navigation.

2. Audit and harden the backend
Trace discovery, DOI lookup, pasted references, manual entry, evidence approval, AI drafting, claim review, and every export path. Fix reproducible defects. Add targeted regression tests for any broken trust or persistence rule.

* Reference checks and saving. Keep checks read-only until the student explicitly approves an add. A fake DOI, no close match, registry outage, or stale lookup must never become a trusted reference. Distinguish a DOI that resolves from a citation whose supplied details match. On a mismatch, show which fields differ and require a deliberate correction. Name the fields actually compared.
* Provider failures. Exercise 404s, timeouts, rate limits, and partial responses. Preserve the difference between Not found and Could not check. Verify that fast input changes and out-of-order responses cannot show stale results or enable an add for the wrong reference.
* Registry coverage. Evaluate a DataCite fallback for DOI records Crossref cannot find. Add it only if the existing verification model can preserve registry provenance and distinguish resolver success, metadata match, and unavailable providers. Test a known DataCite record and the existing Crossref cases. Keep Crossref the primary path. A resolving DOI by itself cannot confirm a citation.
* AI and evidence. Verify server-side screening of structured model output and client-side revalidation against the current evidence set. Check that invented citation fields and unapproved evidence IDs are rejected. If the student changes the approved passages while drafting, stale output must not enter as reviewed work. Keep model failure, manual work, and labelled samples distinct.
* Approval and export. Verify that edits to a claim or its evidence invalidate the relevant approval. Exercise blocked and reviewed export paths, missing or unverified records, retractions under the configured rule, and APA 7 formatting. The AI-use statement must reflect the actual source of each claim and the approvals recorded. Keep the distinction between quote matching, claim support, and student approval visible.

3. Polish the UI and add a verification report
Keep the existing editorial landing page and interactive quote comparison. Focus the UI work on navigation, legible mobile layouts, understandable empty and error states, and clear next actions. In the inspector, show the original passage, highlighted mismatch, and reason the export is blocked together. Keep motion subtle and respect reduced-motion settings.
Add Download verification report beside the export controls. Generate a compact Markdown or text report from the same validators and state that power the Claim Inspector and export gate. Include the reference verdict and named registry, evidence origin, quote match result, student decision, any current export blockers, and the AI-use statement. Label sample and citation-trap projects clearly. A report can document a blocked project, but it must say that the reviewed export is blocked. Keep the report free of raw prompts, API payloads, and complete passages.
4. Verify and deploy

* Run lint, type checks, unit tests, the production build, and the Chrome browser suite. Validate the core journey at desktop and phone widths.
* Rehearse from a fresh browser session. Show fake DOI → real DOI with wrong details → explicit approval → Citation Trap → repair the quote while the claim still fails → correct and reapprove → APA 7 and AI-use statement → Home → resume the same project.
* Deploy through the repo’s existing GitHub-to-Vercel workflow. Confirm the public URL serves the new release and run production smoke checks. Verify Home and resume, a fake DOI, and the reviewed export on the public build. Exercise live AI when the provider is available, and identify any fixture-backed or skipped checks accurately.
* Finish with the public URL, deployed commit, rollback target, issues fixed, tests run, and remaining limitations. Update the prompt log and submission notes to reflect what actually shipped. Keep the submitted deck intact.
