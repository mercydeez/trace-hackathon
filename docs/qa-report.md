# QA report

Results of checks that were actually run. Each line is **passed**, **failed** or **not run**. Nothing is listed as passed without a run behind it.

## Production deployment · 25 November 2026, about 17:20 Dubai time

- **URL:** https://trace-hackathon.vercel.app. Vercel Hobby, GitHub import of `mercydeez/trace-hackathon`, branch `main`.
- **Release:** commit `3d32bb1`, tagged `release-2026-11-25`. First production deployment `6dw5K7Y4m7miQwvnGHEjyZQZD4yv`, built in 41 s, with no Gemini key.
- **Rollback target:** deployment `6dw5K7Y4m7miQwvnGHEjyZQZD4yv`, the verified no-key release. Use Vercel → Deployments → Instant Rollback.
- **Build context:** the Git commit. `.env.local` and `inputs/` are git-ignored and absent. Only the Next.js output is served: `/docs/prompt-log.md`, `/.env.example`, `/package.json`, `/CLAUDE.md` and the deck all return 404.

| Check on production, clean browser session with no Vercel login | Result |
| --- | --- |
| HTTPS, public, no login wall | **Passed** |
| Headers | `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` present |
| `/api/status` with no key | `configured: false`, so the sample and manual paths apply |
| Core demo, desktop | **Passed**: plan, live Crossref search (10 results), save, evidence approval, labelled sample brief, approval, reviewed brief downloaded with APA 7 references and SAMPLE provenance |
| Citation trap | **Passed**. Quote corrected, and the numbers check still flagged "one month". Claim corrected and approved. Crossref's first author and year used. Reviewed test copy downloaded (`trace-TEST-COPY-…-reviewed.md`, with its banner) |
| Mobile, 375 px | No horizontal overflow; the Claim Inspector opens full width |
| `npm run smoke:live` against production | 6 passed, 1 failed, 1 skipped. The failure is the OpenAlex abstract fallback: **rate-limited** (HTTP 429) from Vercel's shared addresses, reported honestly as "could not check". A manual retry succeeded once. The live AI draft was skipped because no key was set. |

### With live AI · about 17:45 Dubai time

The owner added `GEMINI_API_KEY` (Production) in the Vercel dashboard. A Git push of `093b588`, which changed docs only, was **blocked** by Vercel. The Hobby plan does not deploy commits to a private repository from an author outside the account. The owner then redeployed the verified release from the dashboard, after Vercel's email verification.

- **Current production:** deployment `3ubHyssr1ba1nDaaB6g9PJqHVS4H` (release `3d32bb1`, with the key).
- **Rollback target:** `6dw5K7Y4m7miQwvnGHEjyZQZD4yv`, the same code without the key. Use Vercel → Deployments → Instant Rollback.

| Check | Result |
| --- | --- |
| `/api/status` | `configured: true`, model `gemini-3.5-flash-lite` |
| `npm run smoke:live` against production | 7 passed (status, Crossref search, DOI, unknown DOI, retraction, OpenAlex fallback, APA 7). The live draft returned **HTTP 503 from Google** on that run. A direct retry a few seconds later returned a valid draft. |
| Live draft in the app, clean session | After Google's intermittent 503s, each shown as "The AI draft did not happen… Nothing was added", a retry added **3 claims, all excerpts found in the stored text**, labelled "AI draft", with model `gemini-3.5-flash-lite` named |

Known limit: the free Gemini model sometimes answers 503 under load, and a retry usually succeeds. For the demo, keep "Load sample brief (not live AI)" as the fallback.

Known limit added by hosting: anonymous OpenAlex calls from Vercel are often throttled. Setting `OPENALEX_API_KEY`, a free key from openalex.org, gives the site its own budget. It only matters when Crossref has no abstract for a paper.

## Release verification in the working tree · 25 November 2026, 16:50–17:10 Dubai time

Run by Claude Code (Claude Opus 5.5) on the full working tree, with the earlier Codex pass preserved.

| Check | Result |
| --- | --- |
| `npm ci` (clean install) | **Passed**. `npm audit --omit=dev`: 0 vulnerabilities in production dependencies. |
| Lint, TypeScript | **Passed** |
| Unit suite | **Passed**, 182 of 182 in 13 files (179 before this run, plus 3 new regression tests) |
| `npm run build` | **Passed** |
| Browser suite (`npm run test:e2e`, production build, Edge) | **Passed**, 16 of 16, after the fixes below |
| Manual, local production build, 1366×768, **invalid** Gemini key | Live Crossref search, save, evidence approval: passed. "Draft with AI" failed safely: "Nothing was added", with retry and manual options; nothing was substituted. Labelled sample brief, approval, reviewed export: passed, with SAMPLE provenance on each claim and in the disclosure. Citation trap: the quote was corrected and the numbers check still flagged "one month"; the claim was then corrected and approved; Crossref's first author and year were used; the reviewed test copy downloaded as `trace-TEST-COPY-…-reviewed.md` with its test-copy banner. |
| Manual, local production build, 375×812, **no** Gemini key | `/api/status` reports not configured. "Draft with AI" is disabled with an explanation. The sample brief is labelled. The reviewed export downloaded, and the trap inspector opens as a full-width drawer. No horizontal overflow on welcome, plan or brief. |
| Response headers | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` are present. |

Defects reproduced and fixed in this run, each with a regression test:

1. **A rejected Gemini key was reported as "could not be reached" and retried.** The SDK's interactions API throws its own error classes (for example `BadRequestError`, HTTP 400 `API_KEY_INVALID`), not `ApiError`. A spent quota (429) took the same wrong path. `classify` in `src/lib/server/gemini.ts` now reads the HTTP status of any SDK error. Reproduced with a dummy key against the live API.
2. **Invented in-text citations with a lowercase or "in press" author passed the reviewed export**, for example "(al-Rashid, 2020)", "(fake, 2020)" and "(Fake, in press)". The bracket parser now reads them, so they are checked. Ordinary brackets such as "(around 2020)" are still ignored.
3. **A stale tab could leave storage holding its older copy.** This happened after a tab returned from the back-forward cache and saved only a project switch. Storage could bring back a deleted project or lose a new one. The receiving tab now writes its merged state back when storage holds less than it does. Pages restored from that cache now resync, and same-timestamp edits break ties deterministically, so two tabs cannot keep overwriting each other.
4. **The deleted-project memory was capped at 100 ids**, so after more than 100 deletions a project could reappear from a stale tab. The cap is now 1000.
5. **An unconfirmed DOI blocked the export with an unclear message.** The message now separates "Crossref has no record (not fake; maybe DataCite)" from "could not be checked yet", and says how to recheck.

Known limits carried forward: AI-drafting and rate limits are per server instance. Concurrent edits to the same project in two tabs keep the newer whole project. Citation recognition covers author–date forms only.

## Final release verification · 25 November 2026

Claude Code audited an isolated copy of the application. Its accepted fixes were reviewed and applied to the workspace. Chrome automation for Claude was unavailable, so the production verification used the repository’s browser tests with the installed Google Chrome.

| Check | Result |
| --- | --- |
| Clean installation, lint and TypeScript | **Passed** in an isolated copy without a local API key. |
| Unit suite | **Passed** 179 of 179, including cross-tab merge and deletion. |
| Production build and Chrome suite | **Passed** 16 of 16. The new two-tab test confirms one tab displays a newer saved edit and its notice. |
| Production headers and missing Gemini key | **Passed**. The app reported AI as unconfigured, and the draft route returned `no_key`. |
| Production dependency audit | **Passed**. npm reported zero known vulnerabilities. |
| Hosted verification | **Pending** Vercel account sign-in. |

## Submission audit run · 25 November 2026

| Check | Result |
| --- | --- |
| Unit tests | **Passed** 173 of 173 via `npm test -- --pool=threads --maxWorkers=2`. This includes coauthor and year-suffix checks in both reference styles. The restricted Windows runner blocked forked workers. |
| Production build and browser journeys | **Passed** 15 of 15 in Edge. The suite built the app and verified the full demo, citation trap, formatter retry, backup restore, keyboard navigation, and 1366×768 and 390×844 layouts. |
| Development-mode storage recovery | **Passed** after making browser-state hydration idempotent. |
| Lint and TypeScript | **Passed**. The production build ran TypeScript checks. |
| Live smoke | **Passed** all eight checks on retry. Crossref keyword search timed out on the first run. DOI lookup, OpenAlex, citation formatting and live Gemini passed. |
| Phase 1 deck | **Passed** PowerPoint rendered six slides and reported no overflowing text or out-of-bounds objects. |

## Full run: 24 November 2026, 23:15–23:21 (+04:00)

Machine: Windows 11, Node 22.21.0, npm 10.8.2. Browser tests in Microsoft Edge (installed), driven by Playwright 1.65.1. Run from a clean install.

| Check | Command | Result |
|---|---|---|
| Clean installation | `npm ci` | **passed** (455 packages, 27 s; one deprecation warning for eslint 9) |
| Type checking | `npm run typecheck` | **passed** (0 errors; TypeScript 6.0.3, strict, `noUncheckedIndexedAccess`) |
| Lint | `npm run lint` | **passed** (0 errors, 0 warnings) |
| Unit tests | `npm test` | **passed**: 94 of 94 tests in 5 files |
| Production build | `npm run build` | **passed** (Next.js 16.4.6; 1 static page, 6 API routes) |
| Browser journeys | `npm run test:e2e` | **passed**: 11 of 11, against the production build |
| Live providers | `npm run smoke:live` | **passed**: 6 of 6 checks that ran; 1 **not run** (live AI: no key) |
| Deck | `npm run deck`, then PowerPoint render | **passed**: 6 slides; all six rendered to PNG and read |

**Re-run after the last interface adjustments, 24 November 2026, about 23:35 (+04:00):** typecheck **passed**, lint **passed**, unit tests **passed** 94 of 94, browser journeys **passed** 11 of 11 (which rebuilds the production app). `npm ci` and the live smoke test were **not run** again after those adjustments; they do not touch the files that changed.

### What the unit tests cover (94)

- **DOI handling**: prefixes and case, suffix characters preserved, percent-encoding, invalid input, trailing-punctuation variant offered rather than applied, duplicate detection.
- **Text**: JATS to text, OpenAlex index to text, hashing.
- **Plan and model request**: rule-based terms; empty-input refusal; passage and size caps; truncation reported; passages delimited as data, and a passage cannot close its own delimiter.
- **Excerpt integrity**: verbatim match with offsets; tolerance for quotes, dashes, spacing and case; failure on an altered number, a dropped negation, changed punctuation; "not checkable" cases; closest-passage hint.
- **Reference identity**: match; wrong title, first author or year; online/print year difference treated as a note; small title and venue differences as notes; hand-entered references never confirmed; "not found" kept apart from "could not check"; earlier snapshot retained when a refresh fails.
- **Workflow and approvals**: demo fixtures are real records with retrieval dates; every sample excerpt matches its stored abstract; the sample goes through the normal validator; question, scope, selection, evidence-text and claim edits make dependent approvals stale; removing evidence or a source leaves the claim flagged; rejected claims are excluded; a fully manual path with a pasted passage; an unsupported evidence claim blocks export.
- **Citation trap**: three blockers arise from the normal validators; fixing the year alone leaves the author mismatch; each fix clears only its own issue.
- **Model output validation**: unknown ID, unapproved ID, extra bibliographic fields, malformed JSON, missing evidence or excerpt, inference rules, claim cap, output that obeyed an injected instruction, a misquoting claim kept and caught by the gate.
- **Export and disclosure**: reviewed brief only when the gate passes; refusal when anything is unresolved or references are unformatted; draft marking; sample provenance in the file and the disclosure; live, manual and edited claims described as they happened; "no AI" stated when true; trap exports labelled; backup round trip and rejection of damaged backups.
- **Storage**: empty start, reload, corrupt data quarantined, other schema version quarantined, dangling pointer repaired, failed save reported.
- **Providers (network mocked)**: Crossref normalisation and years; missing abstract; 404, 429, 5xx with one retry, timeout; empty search; year filter; a failed search is not "nothing found"; contact email kept out of stored URLs; OpenAlex "no abstract" versus "could not check"; no key means no call.
- **APA 7 (real Citation.js)**: journal article output; a/b disambiguation consistent in list and text; alphabetical order; undated and dated web pages; missing-field report; HTML to plain and italic runs.

### What the browser journeys cover (11)

Provider routes are replaced by labelled test fixtures; `/api/cite` runs for real.

1. **Main journey**: welcome → demo → search locked until the plan is approved → search → save → tag and note → reload (persisted) → tag filter → evidence set with payload preview → approve → live AI unavailable and saying so → labelled sample → Claim Inspector → approvals → reviewed export (file contents checked) → edit makes approval stale → draft export marked DRAFT.
2. **Citation trap**: three blockers; quote mismatch with closest passage marked; excerpt corrected by selecting text in the stored passage; identity mismatch cleared one field at a time; export labelled as a test copy.
3. **Live AI path with a mocked provider**: one valid claim added, two items rejected with reasons shown; a failed call adds nothing and substitutes nothing.
4. **Search states**: timeout is "could not check"; empty result is an empty result.
5. **Add by DOI**: duplicate, invalid, not found (and saved as not confirmed), rate limited, citation whose details disagree.
6. **Hand-entered reference**: stays labelled as not checked; missing fields listed; no summary offered.
7. **Damaged storage**: quarantined, the student is told, the app opens.
8. **Erase and restore**: confirmation dialog, cancel, erase, restore from backup.
9. **Keyboard**: first action reachable and operable; focus outline drawn.
10. **1366×768**: trap and inspector usable; no sideways page scroll.
11. **390×844**: sidebar and inspector as drawers; inspector closes with Escape; no sideways page scroll.

### Live smoke test (real network)

| Check | Result |
|---|---|
| `/api/status` | **passed** (AI configured: false) |
| Crossref search, "retrieval practice long-term retention rereading" | **passed** (5 items returned) |
| Crossref DOI lookup, 10.1126/science.1152408 | **passed** (2008, abstract present) |
| Unknown DOI | **passed** (HTTP 404, `not_found`) |
| OpenAlex abstract, 10.1037/a0037559 | **passed** (1,137 characters) |
| APA 7 formatting through `/api/cite` | **passed** |
| Live Gemini draft | **not run**: no `GEMINI_API_KEY` on the build machine |

### Screenshots reviewed

Captured by the browser tests into `docs/screenshots/` at 1440×900, 1366×768 and 390×844, and inspected by eye. Defects found and fixed during review:

- Reference formatting was requested repeatedly in a loop (a new array on every render re-triggered the request). Fixed; the request now depends on the content only.
- The in-text citation fallback showed doubled brackets. Fixed.
- The inspector opened at its checks rather than at the source passage, and scrolled the whole panel to the marked text. Reordered so the passage comes first and only the passage box scrolls.
- On mobile the drawer's passage did not scroll to the marked words. Fixed.
- A mobile screenshot caught the drawer mid-animation; screenshots now wait for animations to finish.
- The reference-identity table was cramped inside the narrow inspector. There it is now a stacked list of only the details that need attention.
- Opening a second claim kept the previous claim's scroll position. Each claim now opens at the top of the inspector.

## Independent code audit and fixes: 25 November 2026, about 14:30 (+04:00)

A separate read-only review agent audited `src/lib`, the API routes and the components, then reproduced each finding with a throwaway test. Fixed and covered by new tests:

| Finding | Severity | Fix |
|---|---|---|
| Invented in-text citations in forms the parser did not read (organisations, "n.d.", "van der", Oxford comma, a second year, "see also", "as cited in") passed the reviewed export | High | Parser rewritten: any bracket with capitalised words before a year is read as a citation; unreadable authors are kept as written and flagged |
| The a/b letter was ignored at the export gate, so "2006b" counted as the "a" paper and dropped from the reference list | High | Letters computed once from stored details (`yearLetters`) and used by gate, export and writing space; an unlettered citation that fits two sources blocks export. A test confirms the letters equal Citation.js's |
| Editing a claim's limitations, or a hand-entered source's details, kept the approval | Medium | Both are in the claim fingerprint (source details only for sources without a DOI; DOI sources stay covered by the identity check) |
| Citations in the student's text skipped the minimum-year rule | Medium | Same rule applied in the text check |
| A DRAFT export's disclosure said every claim was approved and every citation matched | Medium | Those two lines now follow the export evaluation |
| `/api/cite` had no rate limit or size cap; `/api/draft` could drain the shared Gemini quota | Medium | Rate limit and 300 KB cap on `/api/cite`; a daily cap across all visitors on `/api/draft` (per server instance) |
| A pasted reference with a DOI and only a year was reported as "Details match" | Medium-low | A match now needs the title compared; otherwise "possible match" |
| A draft answer was validated against the evidence set from when the button was pressed | Low | Validated against the set as it is when the answer arrives |

Also fixed from the manual walk-through: switching steps kept the old scroll position.

Checked and fine (per the audit): the key is never logged or returned; outbound calls go to an allow-list of hosts; no injected HTML; no "Verified" badge; sample output labelled everywhere; "not found" and "could not check" kept apart.

Not changed (accepted limits): rate limits are per server instance; an excerpt as short as 12 characters can match generic text; heavy simultaneous Crossref search on one instance can queue into timeouts.

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint` | **passed** |
| `npm test` | **passed**, 166 of 166 in 12 files |
| `npm run test:e2e` | **passed**, 15 of 15 |

## Writing space and Harvard style: 25 November 2026, about 12:50 (+04:00)

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint` | **passed** |
| `npm test` | **passed**, 155 of 155 in 12 files. New tests cover finding and matching in-text citations, including two works by the same authors in one year; an unknown citation blocking export; text and references in the export; Harvard formatting. |
| `npm run test:e2e` | **passed**, 15 of 15. New journey: insert a citation, catch an invented one, export the text with its references. |
| Deck | 6 slides; status line updated; rendered and read |
## Workbench redesign and new features: 25 November 2026, about 12:00–12:20 (+04:00)

The previous redesign is tagged `pre-workbench`.

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint` | **passed** |
| `npm test` | **passed**, 141 of 141 in 10 files (new: claim details, reference-list parsing and verdicts, rules, retraction) |
| `npm run test:e2e` | **passed**, 14 of 14 (new: check a reference list; AI drafting switched off by the rules; numbers check on a half-repaired trap claim) |
| `npm run smoke:live` | **passed**, 8 of 8: Crossref search and DOI lookup, unknown DOI is "not found", a real retraction notice read from Crossref (Wakefield et al. 1998, retracted 2010), OpenAlex abstract, APA formatting, and a live Gemini draft |
| Design detector (`impeccable detect`) on the changed components | **passed**, no findings |
| Screenshots at 1440×900, 1366×768 and 390×844 | reviewed once; fixed: cut-off "Projects and tools" in the rail, one-line step states, a stretched term input, quote-mark spacing |

Two sample claims were corrected because the new claim-details check found they stated details their excerpts did not contain: claim 1 now quotes the sentence that names the delays, and claim 4 no longer says "ten" techniques.
## Visual redesign: 25 November 2026, about 11:40 (+04:00)

The interface was restyled to match ReproSense, light theme only:
- Plus Jakarta Sans and a plum/pink palette, with soft colour washes behind the page.
- A floating glass header with the four steps as pill navigation.
- A summary band with live counts and a "next step" button.
- White cards and short 0.15–0.28 s motion.

The sidebar's contents (projects, demo, citation trap, backup, erase) moved into a "Projects and tools" panel opened from the header. Workflow, check wording and logic are unchanged. The last tested version before the redesign is tagged `pre-redesign`.

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint` | **passed** |
| `npm test` | **passed**, 94 of 94 |
| `npm run test:e2e` | **passed**, 11 of 11 in the final full run. One earlier run had a single "browser has been closed" failure in the live-AI journey; that journey passed on two immediate re-runs and in the next full run. |

Defects found and fixed during the redesign:
- A nested confirm dialog's close event also closed the tools panel behind it. Each dialog now reacts only to its own close event.
- Hidden screen-reader text in the step pills widened the page on phones.
- A long button label overflowed a 390 px card.
- The header and content were misaligned while the inspector was open.

The browser tests were updated for the new location of the project tools: they now open "Projects and tools" first at every screen size. The restore check now looks for the restored project's name instead of the panel message.

## Live AI verification: 25 November 2026, about 10:45 (+04:00)

A free-tier Gemini key was added to `.env.local` (git-ignored; it was briefly pasted into the tracked `.env.example`, moved out before any commit, and never appeared in a commit or push). The dev server was restarted.

| Check | Result |
|---|---|
| `npm run smoke:live`, all 7 checks | **passed**. Live draft from `gemini-3.5-flash-lite` over 2 abstracts: 2 claims, 2 of 2 cite a supplied ID, 2 of 2 excerpts are byte-for-byte in their passage |
| "Draft with AI" in the app: demo project, plan approved, 4 abstracts approved | **passed**. 4 claims added, 0 rejected; all 4 show "Excerpt found in stored text" |
| Reviewed export after approving the 4 claims | **passed**. Not marked DRAFT; the disclosure states that 4 claims were drafted by `gemini-3.5-flash-lite` from 4 approved passages |

This is one run on one evidence set. It shows the path works; it does not show the model always quotes exactly. When it does not, the excerpt check flags the claim and the gate blocks the reviewed export, which the automated tests cover with a mocked provider.

## Not run, or not verified

- **Deployment.** Not deployed. The production build runs locally.
- **Browsers other than Edge (Chromium).** Firefox and Safari were not tested.
- **Screen readers.** Roles, labels and focus order were written with care and partly exercised by role-based test selectors, but no screen-reader session was run.
- **The deck in Google Slides or Keynote.** Checked in desktop PowerPoint only.
- **Load, abuse and concurrency.** Not tested; rate limiting is in memory and per instance.

## Manual findings

Add dated findings from hands-on testing here (see the adversarial QA handoff in `docs/contributions.md`).

| Date | Who | What was tried | What happened | Fixed? |
|---|---|---|---|---|
| | | | | |
