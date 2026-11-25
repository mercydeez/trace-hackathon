# Phase 1 deck — content source

Six slides, judged without a presentation (Submission Guidelines p.1). This file is the wording source for `submissions/phase-1-deck.pptx`; the generator is `submissions/deck/build-deck.mjs`. Rubric area covered by each slide is noted in brackets. Everything stated as built must be true of the repository at the time the deck is uploaded.

---

## Slide 1 — TRACE: Research you can defend. [framing; supports Workflow and Guardrails]

**Subtitle:** A reference manager and a bounded AI research assistant. Find real sources, inspect the evidence, approve its use, and export a cited brief with an honest AI-use disclosure.

**The problem (from the brief).** AI tools give a real author the wrong paper, cite a DOI that does not exist, quote a sentence that is not in the source, or state a guess as a fact. A polished assignment hides these errors, and the student is responsible for every one.

**Our position.** *A real DOI does not make a claim supported.* Checking that a reference exists is only the first of five questions. TRACE answers them separately and never merges them into one green tick:

1. **Reference identity** — do the cited title, first author and year agree with Crossref's record for that DOI?
2. **Evidence access** — abstract, a passage the student pasted, or no text at all.
3. **Excerpt integrity** — is the quoted excerpt really in the stored text? (exact text match)
4. **Support assessment** — the AI's own suggestion, labelled as fallible.
5. **Student decision** — pending, approved, rejected, or stale after an edit.

**Who it is for.** A student writing a short evidence-based assignment who wants the speed of AI but has to defend every citation.

**What they leave with.** A brief in which every claim links to a stored source passage, APA 7 references built from registry metadata, and a disclosure of exactly what AI did.

**What is not new (footer).** Elicit and SciSpace already link AI claims to source quotes, and Zotero already looks up DOIs. TRACE's contribution is a small workflow in which the checks are deterministic, shown one by one, and enforced at export.

---

## Slide 2 — Workflow: the student decides, code checks, AI drafts once [Workflow, 8 pts]

**Headline:** Eight steps, three roles, four human checkpoints.

| # | Step | Who | What happens |
|---|---|---|---|
| 1 | Ask | Student | Writes the research question. |
| 2 | Plan | Code + Student | Rule-based search terms (no AI); the student edits terms and year scope and sets the rules in force. **Checkpoint 1: approve the plan and its rules.** |
| 3 | Discover | Code — FIND | Live Crossref search. Each result shows title, authors, year, venue, DOI and whether an abstract exists. |
| 4 | Organise | Student | Save to the library, tag, annotate, filter. Add by DOI. Check a citation someone gave you, or a pasted reference list. Duplicate DOIs are blocked. |
| 5 | Approve evidence | Student | Select passages and see exactly what will be sent to the model. **Checkpoint 2: approve the evidence set.** No source text means no AI summary. |
| 6 | Draft | AI — DRAFT | One structured call returns at most 5 claim cards, each with an evidence ID and a verbatim excerpt. Without AI: write claims by hand, or load a clearly labelled sample. |
| 7 | Check and inspect | Code — CHECK, then Student | Code validates every claim. The student opens the Claim Inspector, edits or rejects. **Checkpoint 3: approve each claim.** |
| 8 | Export | Code + Student | The export gate re-checks everything at that moment. **Checkpoint 4.** Reviewed brief, or a file marked DRAFT. |

**Three roles.** FIND = code calling scholarly APIs. DRAFT = one AI model call over approved evidence only. CHECK = deterministic code. We call these steps, not agents: only one of them is an AI model, and none of them acts on its own.

**The checking step.** Step 7 runs automatically on every claim, and again inside step 8.

**Edits propagate.** Changing the question, the scope, a passage or a claim makes every approval that depended on it stale. Nothing stays approved by accident.

---

## Slide 3 — Architecture: one small web app [Architecture, 6 pts]

**Headline:** The browser holds the student's work. The server only relays to three providers.

**Browser (Next.js + React).**
- Workspace: Plan · Discover · Library and evidence · Brief and export · Claim Inspector.
- Domain core in plain TypeScript, unit-tested: excerpt check, identity comparison, approvals, AI-output validator, export gate.
- Reference storage: the project (sources, tags, notes, evidence, claims, approvals) is saved in the browser's local storage, versioned, with JSON backup and restore. No accounts, no database.

**Server routes (same app).**
- `/api/search`, `/api/doi` → Crossref REST API: metadata and abstracts.
- `/api/abstract` → OpenAlex: abstract by DOI when Crossref has none.
- `/api/draft` → Gemini API: one structured call. The key never reaches the browser.
- `/api/cite` → Citation.js with the APA 7th-edition CSL style, running on our server.

**What leaves the browser.** Search terms and DOIs go to Crossref and OpenAlex. The research question and the approved passages go to Gemini. Nothing else: no personal data, no analytics. Google's free tier may use submitted content to improve its products, so the app says so and sends only public abstracts or text the student approved.

**Failure is reported as what it is.**

| Situation | What the student sees |
|---|---|
| DOI unknown to Crossref | "Not found in Crossref. This does not show the paper is fake." |
| Timeout or rate limit | "Could not check." Never "Not found". |
| No abstract available | Saved as metadata only; no AI summary is offered. |
| No AI key, or the AI call fails | Retry, write manually, or load the labelled sample. Never a silent substitute. |
| Model cites an unknown ID or adds a DOI | That item is rejected and shown as rejected. |
| Paper retracted | Shown as Retracted beside identity; blocked at export by default. |

**Realistic to change in 90 minutes.** One file per provider, one pure function per check, one export gate. A new rule touches one function and its test.

---

## Slide 4 — Guardrails: code paths, not promises [Guardrails, 6 pts]

**Headline:** Eight risks, the code path for each, and one test case that shows them working.

| What could go wrong | Mechanism in TRACE |
|---|---|
| An invented reference | References are built only from stored registry metadata by a CSL formatter. The AI's output schema has no title, author, year or DOI field; extra fields cause rejection. |
| Citing a source the student never approved | ID allow-list: the model may return only evidence IDs from the approved set. Anything else is rejected and shown. |
| A quote that is not in the source | Deterministic excerpt match against the stored text. Curly quotes, spacing and case are tolerated; numbers, negations and punctuation are not. The real passage is highlighted. |
| A claim that says more than its quote | Claim-details check: numbers and negations in the claim must also appear in the excerpt it quotes, or reviewed export is blocked. Deterministic, no AI. |
| A real DOI with the wrong details, or a retracted paper | Cited title, first author and year are compared with the Crossref record; disagreements are shown, never silently repaired. Crossref retraction notices (largely Retraction Watch data) give a separate "Retracted" status, blocked at export by default. |
| A guess stated as fact | Points without a source passage are marked "inference". Support ratings are labelled "AI-suggested, can be wrong". No confidence scores, no global "Verified" badge. |
| A stale approval, or unreviewed work leaving the tool | Approvals store a fingerprint; any later edit makes them "stale". One export gate re-checks IDs, quotes, claim details, approvals, mismatches and project rules; anything else downloads as DRAFT. |
| A failure dressed up as success | "Not found" and "Could not check" are different states. Sample output is labelled in the workspace, on each claim and in the export. Hard limits: 6 passages, 5 claims, 1 AI call, 1 retry. Source text is treated as data, never as instructions. |

**The citation trap (in the demo).** A labelled test copy of the demo project with two planted errors:

1. A real DOI with an altered year and author order → **identity mismatch**.
2. A real source with a quotation changed from "1 week" to "1 month" → **quote mismatch**.

Both are caught by the same validators used in normal work. Reviewed export is blocked. Fixing one error clears only that error.

Fix only the quote and the claim's "one month" is still blocked.

> **The paper is real. That does not make this claim supported.**

---

## Slide 5 — Ethics and governance [Ethical considerations 5 pts, Governance 5 pts]

**Headline:** Each risk has a design response. The student stays accountable, and AI use is disclosed from what actually happened.

**Ethical considerations: risk → response**

| Risk | How the design handles it |
|---|---|
| Invented citations | Sources enter only through Crossref search, DOI lookup, or as references clearly labelled "entered by hand, not checked". AI never writes a reference. |
| False or overstated claims | Each claim is tied to an excerpt that is text-matched; unsupported points are labelled inference; every claim carries a limitations line; "abstract only" is always shown. |
| Plagiarism | Excerpts are kept as quotations with their source, in the workspace and in the export. TRACE does not detect plagiarism and says so. |
| Privacy | No accounts, tracking or personal data. Work stays in the browser. Only the question and approved passages reach the AI provider, and its data-use terms are shown. |
| Biased or narrow sources | Search terms and scope are visible and student-approved; every source shows where it came from; the export states it is not a systematic review; missing abstracts are flagged, not hidden. |
| Over-reliance on AI | AI drafts at most five short claims, only after two human approvals. Every claim needs its own decision. A full manual path works with no AI. |
| Copyright | Only metadata, abstracts and short excerpts are stored. No full-text ingestion. |
| Instructions hidden in source text | Passages are delimited as data, the model has no tools, and its output is validated against the allow-list. |

**Governance**

- **Accountability.** The student is the author and approves the plan, the evidence set and every claim. TRACE never approves on the student's behalf. The export states that the student reviewed each claim and remains responsible. The builders answer for the tool doing what it says: the checks are unit-tested, the limits documented.
- **AI disclosure.** Generated from recorded activity, not a fixed paragraph: which claims were AI-drafted (model named), which are sample output, which the student wrote; what was sent to the model; what was rejected; what the checks do and do not show.
- **Rules and policies followed.** Project rules: set by the student in the Plan step to match the assignment's policy: AI drafting on (approved passages only) or off, oldest publication year, block retracted sources. The export gate, the draft button and the server enforce them; the disclosure lists them. Hackathon rules: sample content labelled, no invented references, no personal or confidential data, prompt log kept. Provider terms: Crossref rate limits, OpenAlex budget, Gemini free-tier terms. SP Jain's academic-integrity and AI-use policies apply to how a student uses the output; their text was not supplied to us, so TRACE enforces disclosure and human sign-off rather than quoting clauses. We will confirm specifics with the organisers.
- **What TRACE does not claim.** Plagiarism detection, that sources are correct, institutional approval, or a tamper-proof audit trail. The activity history is local and for convenience.

---

## Slide 6 — MVP scope, proof and limits [Architecture realism; supports Workflow and Guardrails]

**Headline:** A narrow MVP that runs end to end, states its limits, and is built to absorb new requirements.

**In the MVP**
- The eight-step journey on one page.
- Live Crossref search and DOI lookup; OpenAlex abstract fallback.
- Library with tags, notes, filters and duplicate prevention.
- Evidence approval with a preview of what is sent.
- One live AI provider (Gemini), a full manual path, a labelled sample brief.
- Claim Inspector and citation trap.
- Writing space with live citation checks; list check; retraction flag; project rules. APA 7 or Harvard references.
- APA 7 references (Citation.js); Markdown brief; JSON backup; browser-local storage.

**Deliberately out of scope**
Accounts and collaboration; PDF or full-text ingestion; browser extension; plagiarism detection; systematic-review coverage.

**Acceptance criteria we demonstrate (each has an automated test)**
- Search → save → tag → reload → approve → brief → inspect → export runs end to end.
- A model answer that cites an unknown ID, or carries a DOI or author field, is rejected.
- An altered number or a dropped negation in a quotation fails the check.
- A claim stating a number its excerpt lacks, or an in-text citation with no source, is blocked.
- Editing a claim, a passage or the question makes approvals stale and blocks reviewed export.
- A timeout shows "Could not check", never "Not found".
- Sample output stays labelled through to the exported file.

**Honest limits**
- Evidence is abstract-only unless the student pastes a passage.
- A text match shows the words are in the stored text, not that the paper is right or the reading follows.
- The AI's support rating can be wrong.
- Crossref lacks abstracts for many papers.
- Browser storage is not a backup.
- Titles keep the registry's capitalisation; APA 7 wants sentence case.

**Ready for day-of requirements**

| If asked for… | We change… |
|---|---|
| Another source or AI provider | one adapter file |
| A new check or trust label | one pure function, plus the export gate |
| A new rule or policy | one field in Rules in force, plus the export gate |
| Another citation style | one CSL style name |
| Another export format | one builder function |
| A new workflow step | one tab and one approval fingerprint |

**Status line:** 155 of 155 unit tests and 15 of 15 browser journey tests passing on 25 Nov 2026; live AI call verified: yes, 25 Nov (gemini-3.5-flash-lite, free tier; drafted claims cited only supplied evidence IDs and their excerpts were found verbatim); deployed: not yet.
