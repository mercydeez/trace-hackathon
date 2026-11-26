# Phase 2 submission — text to enter on the platform

Deadline: before the automatic lock at 3:00 PM, Thursday 26 November 2026. Fill in the bracketed parts on the day. Enter only what is true at that moment.

## 1. Code repository

```
https://github.com/mercydeez/trace-hackathon
```

Make the repository public before submitting, and open it in a private window to confirm.

**Checked 25 Nov 2026, about 23:20:** while the repository is private, both this URL and the prompt-log URL return **404** to a signed-out visitor. Before submitting, the owner either makes it public (Settings → General → Danger Zone → Change visibility) or adds the organisers as collaborators. Choose one and then re-check in a private window.

## 2. Prompt log

```
https://github.com/mercydeez/trace-hackathon/blob/main/docs/prompt-log.md
```

The log is chronological and includes the build prompt, the set-up answers, the plan approval, and the prompts used on the day.

## 3. Website link

**If deployed** (use this):

```
https://trace-hackathon.vercel.app
```

Final release, verified on the public site on 26 Nov 2026 at about 13:40: app commit `edc2895` (Vercel deployment `Cu7VqquvRtYuAgdEWNnPrWN1M1ny`). This is the freeze point; see the QA report. The landing page is also at https://trace-hackathon.vercel.app/home. Rollback: Vercel → Deployments → Instant Rollback to `3FRKisLLjuBWwYkLWBd5YheF8zMK` (commit `fba2a71`, app release `6428a91`).

### The five judging requirements: demo action and evidence

| Requirement | Demo action on the live site | Evidence (actual results, 25 Nov 2026) |
|---|---|---|
| 1. Verification is read-only; only an explicit Add changes the library | Welcome → **Check a reference** → check DOI `10.1126/science.1152408` with year 2025. The library count stays at 7. Then a wrong-year DOI that is not yet saved: the only action is **Use Crossref's details and add** | Browser test "check by DOI is read-only…" passed. On production: count stayed 7, then went 7 → 8 only on the explicit add. A stale result hides when the input changes; out-of-order answers are dropped. |
| 2. Fake references stay out of trusted output | Check DOI `10.1234/trace-smoke-test-no-such-doi`. In **Check a list**, paste `Imaginary, A. (2025). The violet stapler theorem for interstellar note-taking.` | On production: **Not found in Crossref** with no add button, and **No close match in Crossref** with no buttons. Hand-entered references are **Not yet verified**: they block a reviewed export (unit test) and are left out of the APA list with a count (browser test). A timeout shows **Could not check**, "no evidence that the paper does not exist" (browser test, mocked 429). |
| 3. A trust label on every reference and claim, with a legend | Open "What the labels mean" in Discover, Library or Brief. Point at the search rows, DOI preview, list rows, Library rows, Brief reference list and each claim card | Claim card on production: **Sample, not live AI · Details match Crossref · Excerpt found in stored text · Student approved**. A fuzzy title shows **Partial match: check details** (unit test). The comparison names **First author's surname**. |
| 4. APA 7 reference list from the Library | Library → **Copy APA 7 reference list** or **Download APA 7 reference list** | On production: 8 references shown, and `references-apa7-2026-11-25.txt` downloaded with 8 entries. The browser test checks that the copied and downloaded text match. Excluded records are counted with reasons. Formatting errors offer a retry, and a refused clipboard shows selectable text. |
| 5. Copyable AI-use statement | Brief and export → **Copy AI-use statement** | On production, after approving all 4 sample claims: "…labelled SAMPLE brief… I reviewed and approved all 4 claims…". Before approval it says "I have approved 0 of 3 claims so far" (phone run). Passage counts come from the run that produced the claims (unit test). |

The table above was verified on 25 Nov (`9b97481`); every row still passes on the final release.

Totals for the final release (26 Nov, `ae65b11`): 207 of 207 unit tests, 22 of 22 browser journeys, and 8 of 9 live smoke checks against production, including a real Gemini draft and the DataCite fallback. The one failure is the OpenAlex abstract fallback, rate-limited on Vercel and reported as rate limited, not as not found.

### Also in the final release (26 Nov)

| Addition | Demo action | Evidence |
|---|---|---|
| Home and resume | In the workspace, click **Home** (or the TRACE wordmark) to reach `/home`, then **Resume project** | Browser tests cover Back, Forward, refresh, the same step on resume and the phone layout. On production, Resume returned to the same trap project and step. |
| DataCite fallback | Check DOI `10.5061/dryad.8515` (a Dryad dataset that is not in Crossref) | Labelled **Found in DataCite**; live smoke check passed. Crossref stays primary, and an outage is "Could not check". |
| Verification report | Brief → **Verification report**, beside the export buttons | Built from the export gate and inspector checks. It says "Reviewed export: BLOCKED" or "ALLOWED", and labels sample and trap projects (unit and browser tests). |
| Inspector clarity | Open claim 1 in the citation trap | "Blocks the reviewed export" box, then the cited quote beside the real sentence, with "month" highlighted |
| Qualifying or challenging passage | In the demo, open a claim → **Add qualifying or challenging passage** → choose a passage, label it **Qualifies** or **Challenges**, quote it → **Approve again** | Both passages are shown side by side, each with its own checks. Any change, including only the label, makes the approval stale and blocks the reviewed export until it is approved again. The reviewed brief, reference list and verification report carry both passages. Passed 23 of 23 browser tests locally, and the same journey on the public site at desktop and phone sizes. |

**If not deployed** (use this wording instead, as the guidelines allow):

```
No live link. TRACE runs on our laptop only, and we will demo from the laptop.
To run it: clone the repository, then `npm ci`, `npm run build`, `npm start`, and open http://localhost:3000.
```

## Short description (if the platform has a field for one)

```
TRACE — Research you can defend. A reference manager with a bounded AI research assistant.
A student searches Crossref, organises sources, approves the passages to work from, and gets
at most five short claims, each tied to a stored passage. Five checks are kept separate:
reference identity, evidence access, excerpt integrity, AI-suggested support, and the
student's decision. A single export gate produces a reviewed brief with APA 7 references,
provenance and an AI-use disclosure; anything unresolved can only leave as a file marked DRAFT.
```

## What is live, what is sample, what is manual

State this plainly if asked, and keep it accurate.

| Capability | Status |
|---|---|
| Crossref search and DOI lookup | Live calls to the public Crossref API |
| OpenAlex abstract fallback | Live call, on request |
| APA 7 references | Produced by Citation.js on the server from stored metadata |
| Excerpt, identity, approval and export checks | Deterministic code, run in the browser |
| AI drafting | Live Gemini call with model gemini-3.5-flash-lite (free tier; occasional HTTP 503 from Google, retry or use the labelled sample) |
| Sample brief | Sample output written during development, labelled as a sample everywhere, offered only in the demo project |
| Demo sources | Real Crossref records saved on 24 November 2026 |
| Citation trap | A labelled test copy with two deliberately corrupted items |
| Storage | The browser's local storage; no accounts, no server database |

## Day-of requirements

```
[List each requirement given at 1:15 PM and, for each, one line on what was changed and where.]
```

## Known limits (say these before you are asked)

Abstract-only evidence unless the student pastes a passage. A matched excerpt shows the words are in the stored text, not that the paper is right or that the claim follows. The AI's support rating can be wrong. No plagiarism detection. Local storage is not a backup. Not production-ready.
