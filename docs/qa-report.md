# QA report

Results of checks that were actually run. Each line is **passed**, **failed** or **not run**. Nothing is listed as passed without a run behind it.

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

## Not run, or not verified

- **A live AI call.** The adapter is written against the SDK's own type definitions and the provider's documented request shape, and the surrounding path is tested with a mocked provider, but no real Gemini request has been made. Run `npm run smoke:live` after adding a key.
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
