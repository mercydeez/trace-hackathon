# TRACE — project context for any coding session

**TRACE — "Research you can defend."** A hackathon MVP (AI Club Hackathon 2026, SP Jain) combining a reference manager with a bounded AI research assistant. A student finds real sources, inspects the evidence, approves its use, and exports a citation-backed brief with an honest AI-use disclosure.

Read `PROGRESS.md` first for current state and the next action. The organiser PDFs in `inputs/` are authoritative and override everything here.

## Deadlines (Thursday 26 November 2026, Gulf time)

- **Before 9:00 AM** — upload `submissions/phase-1-deck.pptx` (max 6 slides) to the hackathon platform. Late decks are not scored.
- **1:15 PM** — arrive, Simulation Lab, 2nd floor. New requirements revealed 1:15–1:30.
- **1:30–3:00 PM** — adapt. **3:00 PM lock**: repo link, prompt log, live link (or declared laptop-only).
- 3:15 PM team AI quiz, then 8-minute demo + 2 minutes of questions.

## Non-negotiable product rules

1. A real DOI does not make a claim supported. Keep five dimensions separate: reference identity, evidence access, excerpt integrity, support assessment (model-suggested, fallible), student decision.
2. No universal "Verified" badge, no invented confidence scores. Show computed counts.
3. Bibliographic text is built from stored metadata by Citation.js (APA 7), never by the language model.
4. The model may only return `evidenceId`s from the student-approved evidence set. Anything else is rejected and shown as rejected.
5. Sample output is always labelled as sample — in the workspace, on each claim, and in exports. Never substitute sample output silently after a failed live call.
6. "Not found in Crossref" is not "fake". Timeouts and rate limits are "Could not check", never "Not found".
7. Reviewed export goes through `evaluateExport()` in `src/lib/exportPolicy.ts`. Do not add a second gate or bypass it.
8. Never claim plagiarism detection, research correctness, institutional approval, or a tamper-proof audit trail.
9. Do not invent sources, abstracts, quotes, SP Jain policy text, test results, or teammate contributions.

## Stack and decisions

- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind 4, zod 4, lucide-react. npm with one `package-lock.json`. Node >= 22.12.
- Browser-local persistence (one versioned localStorage key). No auth, no database, no telemetry.
- Server routes only for provider calls: Crossref (search + DOI), OpenAlex (free DOI-singleton abstract fallback only), Gemini (one structured drafting call), Citation.js (APA 7).
- Local UI primitives and native `<dialog>`; no shadcn CLI or Radix (deliberate — fewer moving parts).
- Visual style follows ReproSense (reprosense.vercel.app), light theme only: Plus Jakarta Sans, plum/pink tokens in `src/app/globals.css`. Project tools live in the "Projects and tools" panel opened from the header.
- Approvals are **derived from fingerprints**, not stored flags: an edit can never leave a stale approval.
- Identity check is a pure function over stored data: `compareMetadata(cited, registrySnapshot)`.
- Project = collection; tags, notes and filters organise sources.

Full reasoning and source URLs: `docs/research-and-decisions.md`. Architecture: `docs/architecture-and-governance.md`.

## Commands

```
npm install          # first time
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm test             # unit tests (vitest), no network
npm run test:e2e     # Playwright journeys, API mocked with fixtures
npm run smoke:live   # real Crossref/OpenAlex/Gemini calls; needs network
npm run build && npm start
npm run deck         # regenerate submissions/phase-1-deck.pptx
```

## Environment

Copy `.env.example` to `.env.local`. All optional; the app runs without any of them.

- `GEMINI_API_KEY` — enables live drafting. Server-side only. Never commit, log, or paste into chat.
- `GEMINI_MODEL` — defaults to the model recorded in `docs/research-and-decisions.md`.
- `CROSSREF_MAILTO` — optional contact email for Crossref's polite pool.
- `OPENALEX_API_KEY` — optional; raises the OpenAlex daily budget.

## Repository hygiene

- `inputs/` (organiser PDFs, contain phone numbers) is git-ignored. Never copy contact details into public files.
- Repo: `github.com/mercydeez/trace-hackathon`, private until submission, then public.
- Append every main user prompt to `docs/prompt-log.md` in order, with the real date and model. Never reconstruct or invent entries.
- Update `PROGRESS.md` after each milestone with actual results only.

## Layout

```
src/app/            page + API routes
src/components/     workspace UI
src/lib/            domain core (pure, tested); src/lib/server/ = provider adapters
src/data/           real fixtures + labelled sample output
tests/              unit (vitest) and e2e (Playwright)
docs/               brief, rubric map, decisions, architecture, prompt log, QA, playbooks
submissions/        Phase 1 deck + generator, Phase 2 submission text
scripts/            fixture fetch, live smoke test
```
