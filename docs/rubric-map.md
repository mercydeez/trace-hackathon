# Rubric map

Every rubric row (Submission Guidelines pp. 2–3), what answers it, where it appears in the demo, and the evidence behind it. Test names refer to `tests/unit/*.test.ts` and `tests/e2e/*.spec.ts`. Demo times refer to `docs/demo-and-qa.md`.

## Phase 1: ideation deck (30 points)

| Criterion (points) | What judges look for | Where the deck answers it | Backed by |
|---|---|---|---|
| Workflow (8) | Clear roles and order of steps or agents, human checkpoints, a checking step | Slide 2: eight numbered steps, role chips (Student / Code / AI), four checkpoints, "the checking step", "edits propagate" | The stepper and approvals in the app; `approvals.ts`; workflow tests |
| Architecture (6) | Components and data flow are clear, and realistic to build in 90 minutes | Slide 3: browser, server routes, three providers, what leaves the browser, failure table, "realistic to change in 90 minutes". Slide 6: scope and the day-of table | `docs/architecture-and-governance.md`; one adapter per provider in `src/lib/server/` |
| Ethical considerations (5) | Real risks identified, with a response to each | Slide 5, left: eight risks, each with the design response | The behaviours listed are implemented and tested (see Phase 2 rows) |
| Governance (5) | Accountability, AI disclosure and policies are defined | Slide 5, right: accountability, AI disclosure, rules and policies followed, what TRACE does not claim | `disclosure.ts` and its tests; export files |
| Guardrails (6) | Specific, practical mechanisms against invented references and false claims | Slide 4: eight mechanisms and the citation trap. Slide 1: the five separate checks | `validateDraft.ts`, `excerpt.ts`, `identity.ts`, `exportPolicy.ts`, `trap.ts` and their tests |

## AI quiz (5 points)

Not something the product answers. Revision topics are in `docs/demo-and-qa.md`.

## Phase 2: website MVP and presentation (65 points)

| Criterion (points) | What judges look for | Feature | Demo step | Evidence |
|---|---|---|---|---|
| Working MVP (15) | The MVP works and the core journey runs end to end | Plan → Discover → Library and evidence → Brief and export, on one page, with persistence | 0:45–5:00 | e2e "main journey…"; production build; live smoke script |
| Research and citation features (12) | How well it helps find, organise and cite sources | Live Crossref search; check a pasted reference list; add by DOI; check a citation; hand entry; tags, notes, filters, duplicate prevention; OpenAlex abstract fallback; APA 7 references with a/b disambiguation; copy reference; Markdown brief; JSON backup | 1:15–3:00, 5:00 | e2e main journey, "add by DOI…", "a hand-entered reference…"; unit "APA 7 references", "DOI normalisation", "Crossref adapter" |
| Honesty and verification in action (10) | At least one guardrail or checking feature visibly working | Claim Inspector with five separate checks; claim-details (numbers and negations) check; retraction flag; rules in force; excerpt highlighted in the stored passage; identity table; rejected model output listed; export gate; **citation trap** | 3:15–4:15 and 5:15–7:00 | e2e "citation trap…", "live AI path…"; unit "excerpt integrity", "reference identity", "model output validation", "citation trap", "approvals are invalidated by changes" |
| Day-of requirements (8) | New requirements implemented while still following the Phase 1 design | Modular boundaries: one adapter, one check, one gate, one builder; "Rules in force" as the landing spot for new policies | 7:00–7:30 | `docs/day-of-playbook.md`; "Where to change things" in the architecture doc; **to be shown on the day** |
| User experience (8) | A student could use it without instructions | Numbered steps with live status; plain-language states; every disabled control says why; empty, loading and error states; keyboard focus; drawer on small screens | throughout | e2e "keyboard…", "responsive at…", "damaged browser storage…"; screenshots in `docs/screenshots/` |
| Presentation and Q&A (12) | A clear demo, strong answers, every member contributes | Timed script, Q&A answers, handoffs for teammates | 0:00–8:00 + 2:00 | `docs/demo-and-qa.md`, `docs/contributions.md` |

## Honesty rules from the Rules and Regulations (p. 2)

| Rule | How it is met |
|---|---|
| Keep a record of AI prompts | `docs/prompt-log.md`, chronological, real dates and model |
| Never present invented references or sample outputs as real; label samples | Demo sources are real Crossref records with retrieval dates. The sample brief is labelled in `src/data/sample-brief.json`, on its button, on every claim, in the export and in the disclosure. Test fixtures in automated tests carry "test fixture" in their own titles |
| No copied work, no confidential or personal data | Original code; public bibliographic data only; organiser PDFs are git-ignored because they contain phone numbers |
| Follow SP Jain's academic-integrity and AI-use policies | Supported through traceability, human sign-off and disclosure. Policy text not supplied; nothing is quoted |
