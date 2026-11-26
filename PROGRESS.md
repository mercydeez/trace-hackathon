# Progress

Last updated: 26 November 2026, about 13:40 Dubai time (freeze point)

## Status

| Step | State |
|---|---|
| 1. Durable context, prompt log, competition brief | done |
| 2. Git repo + private remote (`github.com/mercydeez/trace-hackathon`) | done |
| 3. Scaffold + dependencies | done |
| 4. Core library + unit tests | done |
| 5. Real fixtures, sample brief, citation trap | done |
| 6. Server routes + adapters | done; live AI call verified 25 Nov |
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
- 25 Nov 2026, ~10:45: with a key in `.env.local`, `npm run smoke:live` passed 7 of 7 including a real Gemini draft; "Draft with AI" in the app added 4 claims, all quotes found in the stored abstracts; reviewed export disclosure named the model
- Deck: 6 slides, rendered through PowerPoint, all slides read
- 25 Nov 2026, ~12:50: writing space with live citation checks and Harvard style. 155/155 unit, 15/15 journeys.
- 25 Nov 2026, ~14:30: independent code audit; 8 findings fixed (see docs/qa-report.md). Presenter guide PDF for Maitrayee and Shirley (submissions/TRACE-presenter-guide.pdf). 166/166 unit, 15/15 journeys.
- Team plan (stated by Atharva, 25 Nov): Atharva finishes the build before the event; Maitrayee and Shirley present. Atharva reported that the rules changed so everything is built beforehand; the organiser PDFs in inputs/ have not been updated to say so, so the day-of playbook stays ready.
- 25 Nov 2026, ~12:20: three-pane workbench + claim-details check, project rules, retraction flag, reference-list check. 141/141 unit, 14/14 journeys, 8/8 live smoke checks, design detector clean. Pre-workbench version tagged `pre-workbench`.
- 25 Nov 2026, ~11:40: after the ReproSense-style redesign, typecheck, lint, 94/94 unit and 11/11 browser journeys passed. The pre-redesign version is tagged `pre-redesign`.

- 25 Nov 2026, 16:50–17:10: release verification of the full working tree in Claude Code. npm ci, lint, typecheck, 182/182 unit, build and 16/16 journeys passed; manual desktop (invalid key) and mobile (no key) runs passed; 5 defects fixed (see docs/qa-report.md).
- 25 Nov 2026, ~17:45: **deployed** to https://trace-hackathon.vercel.app (release `3d32bb1`, tag `release-2026-11-25`; production deployment `3ubHyssr1ba1nDaaB6g9PJqHVS4H` with the Gemini key; rollback target `6dw5K7Y4m7miQwvnGHEjyZQZD4yv`). Verified in a clean session: core demo, trap and reviewed test copy, mobile, and a live AI draft. Note: Vercel Hobby blocks Git-push deploys while the repo is private, because commits come from a non-owner author; redeploy from the dashboard until the repo is public.
- 25 Nov 2026, ~23:30: **Phase 2 judging requirements** shipped (commit `9b97481`, deployment `4WectjuLoxHFoXPjF1Bt4YWg5m5G`): read-only checks with an explicit Add, Not yet verified kept out of trusted output, trust labels with a legend, a Library APA 7 list, and a copyable AI-use statement. 192/192 unit, 18/18 journeys, 8/8 live smoke on production, and the signed-out production walkthrough all passed. Repo Git author is now the owner's GitHub identity, so pushes deploy. The repo is still private, so organiser access is the owner's choice.
- 26 Nov 2026, ~11:40: **final release** `ae65b11` (deployment `ExQLWp9XoWZpi8GmNz4QaDASAGmW`; rollback `7XwGQBch4yTtDofvqfEBjEfYUQp8`). Added Home navigation and `/home` with resume, a DataCite fallback, 7 audit fixes, a verification report and inspector polish. 207/207 unit, 22/22 journeys, 8/9 live smoke (OpenAlex rate-limited on Vercel), and the full production rehearsal passed.
- 26 Nov 2026, ~12:15: **polish release** `6428a91` (deployment `FXRWhgUVndm8ffzzvbL3FAeB4vwt`; rollback `ExQLWp9XoWZpi8GmNz4QaDASAGmW`): AI-use statement separates drafted from included; one export-readiness state for the buttons and the report; favicon; tab title; motion. 214/214 unit, 22/22 journeys, 9/9 live smoke; live Gemini (3 drafted, 1 rejected, 2 included) consistent across statement, report and brief.
- 26 Nov 2026, ~13:40: **final feature and FREEZE**. App commit `edc2895` (deployment `Cu7VqquvRtYuAgdEWNnPrWN1M1ny`; rollback `3FRKisLLjuBWwYkLWBd5YheF8zMK`, commit `fba2a71`). A student can attach a qualifying or challenging second passage to a claim. It is part of the approval fingerprint and the export gate, and it is carried into the brief, the bibliography and the report. 226/226 unit and 23/23 journeys passed locally; on the public site, 6/6 journeys and the phone scenario passed. Feature work and polish stop here; only a rollback for a release-blocking regression is allowed.

Details: `docs/qa-report.md`.

The submission audit pass tightened the export gate, improved the citation-trap presentation, and updated the Phase 1 deck. The production suite passed all 15 journeys, with 173 unit tests passing. The live smoke passed all eight checks after a Crossref search timeout on the first attempt. Remaining findings and the Claude Code follow-up are in [the audit](docs/submission-audit.md).

## Waiting on the user

1. **Upload the deck** (`submissions/phase-1-deck.pptx`) before 9:00 AM on Thu 26 Nov. Steps: `docs/submission-checklist.md`.
2. **Gemini key**: done and verified locally. For deployment, add the same key as an environment variable on the host. Keep it only in `.env.local` locally, never in `.env.example`.
3. **Deploy** (Vercel login needed). Steps in `docs/submission-checklist.md`. The rules say to present from the submitted live link; laptop-only wording is ready as the fallback.
4. **Make the repository public** at submission time.
5. **Tell the organisers** about inactive teammates; fill in names in `docs/contributions.md`.
6. **Rehearse** `docs/demo-and-qa.md` against a stopwatch.

## Open risks

- Not deployed.
- Solo build in a four-person team; "every member contributes" is part of a 12-point rubric row.
- SP Jain policy text not supplied; nothing in the app or deck quotes it.
- Tested in Edge only.

## Next action

Upload the deck; deploy with `GEMINI_API_KEY` set on the host and run `npm run smoke:live` against the live URL. On the day: follow `docs/day-of-playbook.md`.
