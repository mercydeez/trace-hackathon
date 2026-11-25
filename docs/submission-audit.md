# TRACE submission audit

25 November 2026 · Dubai

TRACE helps a student find and organise sources, approve evidence, draft and inspect claims, and export a brief with citations and an AI-use disclosure. This review uses the organiser’s problem statement, rules and rubric, and assumes an eight-minute judged presentation plus a short period of public MVP use.

## Rubric coverage

| Criterion | Points | Evidence and action |
| --- | ---: | --- |
| Phase 1 deck | 30 | Six slides cover workflow, architecture, ethics, governance and guardrails. Upload the PowerPoint by **9:00 AM Dubai time on 26 November**. |
| Working MVP | 15 | The browser journey covers question, plan, search, saving, tags, evidence approval, review and export. Keep a local production server ready for the demo. |
| Research and citation | 12 | Crossref search and DOI lookup, reference-list checks, an organised library, in-text citation matching and APA 7 or Harvard export. Checked same-author/year suffixes against both formatted reference styles. |
| Honesty and verification | 10 | The labelled citation trap uses ordinary project data. It catches the changed quote and mismatched DOI metadata independently and prevents reviewed export. |
| Day-of requirements | 8 | The supplied rules say additional requirements are revealed at **1:15 PM**. Check the latest organiser instructions and map any new requirement to an observable change. |
| User experience | 8 | The welcome screen demonstrates the exact quote change. Review opens on the claims, with direct access to evidence and blockers. The inspector adapts to laptop and phone layouts. |
| Presentation and Q&A | 12 | Show a failed check, its correction, and a real export. Agree on delivery and Q&A roles and log each member’s actual contribution. The slot is eight minutes plus two minutes for questions. |
| Team quiz | 5 | The written schedule places it at **3:15 PM**. |

Phase 2 locks at **3:00 PM Dubai time on 26 November**. Submit the accessible repo and chronological prompt log, plus the working site URL if available. The guidelines also provide a laptop-only fallback. Repo access, upload and hosted smoke testing still need to be confirmed by the team. [Submission checklist](submission-checklist.md)

## Fixed in this pass

1. **The best demo was buried.** The welcome screen now opens the labelled citation trap directly. Existing claims load first in Brief, and the export bar links to blockers. The workspace uses a quiet plum palette, clearer contrast, and short control feedback. The mobile export bar uses compact labels.
2. **A reviewed export could appear ready while its references were unavailable.** Readiness now requires a formatted entry for each cited source. A failed formatter exposes a retry. Draft status and its AI-use disclosure now reflect the actual export mode, including unformatted references.
3. **A pasted passage could outlive its source record, or a DOI could go unconfirmed.** Both cases now block a reviewed claim. Writing citations with unconfirmed DOIs are flagged too. An explicit negative Crossref recheck takes precedence over the saved match. Known retraction notices remain visible from the saved record.
4. **An in-flight AI draft could arrive after the evidence changed.** Requests are tied to the approved snapshot. A changed plan or evidence set discards the returned draft, and leaving the Brief step cancels its request in the browser.
5. **A failed browser recovery could overwrite the original.** TRACE leaves the original intact if it cannot keep a recovery copy, surfaces save failures in the workspace, and allows backup restore from the welcome screen.
6. **Exports could point to the wrong claim or citation.** Explicit claim numbers survive gaps caused by rejected claims. The writing checker rejects an unassigned year letter or an explicitly wrong coauthor. The export aligns year letters with the actual reference list and shows when it adjusted the exported copy. The saved writing remains as entered.
7. **The final release audit found stale tabs, inconsistent reference style and avoidable quota use.** TRACE merges saved changes per project across tabs and shows a notice when the open project changes. The Claim Inspector uses the project’s citation style. The drafting request sends the passage length shown in the preview, and invalid requests leave the shared model allowance untouched.

## Findings to carry forward

1. **Citation recognition is limited to common author–date forms.** Numeric references are outside the writing checker’s scope. Same-surname authors, complex organisation names and non-Latin author names deserve broader coverage if the project moves beyond the demo. [Writing matcher](../src/lib/inText.ts)
2. **Live search can stall at the wrong moment.** Crossref search timed out on the first smoke run and passed on retry. The search UI distinguishes a timeout from no results. Lead with the local trap and use the seeded demo or a DOI lookup if keyword search is slow. [Demo walkthrough](demo-and-qa.md)
3. **Concurrent edits to one project still use the latest saved version.** Separate projects and deletions are reconciled across tabs. For the same project, each save covers the whole project, so edits made at the same time can replace each other. Use one tab per project in the demo. [Merge rules](../src/lib/store.ts)
4. **A public deployment can exhaust its shared AI quota.** The app has per-instance limits and no accounts. Keep the labelled sample and the manual path available for the demo. Set a host-level quota or another shared limit before depending on live AI during sustained public use. [Draft route](../src/app/api/draft/route.ts)
5. **The checks have a defined scope.** An excerpt match proves the words occur in the stored passage. The numbers and negations check is a heuristic. Most evidence is abstract-only, pasted passages have student-supplied provenance, and a manual source without a DOI is labelled as hand-entered. The institution's policy text still needs to come from the organisers if they require specific clauses. [Architecture and governance](architecture-and-governance.md)

## Demo opening

Open **Run the citation trap**. Inspect claim 1 and show “one month” beside the stored “one week.” Correct the quote alone and show that the claim still says “one month.” Correct the claim and approve it. Then inspect the second flagged claim, compare the cited details with Crossref, and use the registry values. Download the reviewed test copy and point to its provenance and disclosure. Continue with the normal demo project to show source discovery and library organisation.
