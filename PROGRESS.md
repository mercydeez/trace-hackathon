# Progress

Last updated: 2026-11-24 23:25 (+04:00)

## Status

| Step | State |
|---|---|
| 1. Durable context, prompt log, competition brief | done |
| 2. Git repo + private remote (`github.com/mercydeez/trace-hackathon`) | done |
| 3. Scaffold + dependencies | done |
| 4. Core library + unit tests | done |
| 5. Real fixtures, sample brief, citation trap | done |
| 6. Server routes + adapters | done; live AI call **not verified** (no key) |
| 7. Phase 1 deck (6 slides, rendered and read) | done; **not uploaded** |
| 8. Workspace UI | done |
| 9. Browser tests + screenshot review | done |
| 10. Docs + submission pack | done |
| 11. Final verification from a clean install | done |

## Actual test results (full run, 24 Nov 2026, 23:15–23:21 +04:00)

- `npm ci`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed, 0 warnings
- `npm test`: 94 of 94 passed
- `npm run build`: passed
- `npm run test:e2e`: 11 of 11 passed (production build, Edge)
- `npm run smoke:live`: 6 of 6 run checks passed; live AI draft not run (no key)
- Deck: 6 slides, rendered through PowerPoint, all slides read

Details: `docs/qa-report.md`.

## Waiting on the user

1. **Upload the deck** (`submissions/phase-1-deck.pptx`) before 9:00 AM on Thu 26 Nov. Steps: `docs/submission-checklist.md`.
2. **Gemini key**: put `GEMINI_API_KEY=...` in `.env.local`, restart, run `npm run smoke:live`. Then update slide 6's status in `submissions/deck/build-deck.mjs` and run `npm run deck` if the deck is not uploaded yet.
3. **Deploy** (Vercel login needed). Steps in `docs/submission-checklist.md`. The rules say to present from the submitted live link; laptop-only wording is ready as the fallback.
4. **Make the repository public** at submission time.
5. **Tell the organisers** about inactive teammates; fill in names in `docs/contributions.md`.
6. **Rehearse** `docs/demo-and-qa.md` against a stopwatch.

## Open risks

- Live AI path has never made a real request. Until it does, plan to demo with the labelled sample and say so.
- Not deployed.
- Solo build in a four-person team; "every member contributes" is part of a 12-point rubric row.
- SP Jain policy text not supplied; nothing in the app or deck quotes it.
- Tested in Edge only.

## Next action

After the user adds a key: run the live smoke test, try "Draft with AI" in the demo project, fix whatever the real response shape reveals, record the result in `docs/qa-report.md`, and update slide 6. On the day: follow `docs/day-of-playbook.md`.
