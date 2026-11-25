# Day-of playbook — Thursday 26 November 2026

New requirements arrive at the 1:15 PM briefing. There are 90 minutes, 1:30–3:00 PM, and submissions lock automatically at 3:00 PM (Rules p. 1, Submission Guidelines p. 2). The site must still follow the Phase 1 design (rubric, Day-of requirements, 8 points). Nothing below predicts what will be asked.

## The evening before

1. `git pull`, then `npm ci`.
2. `npm run typecheck && npm run lint && npm test && npm run test:e2e`. All must pass.
3. Freeze the known-good version:
   ```
   git tag pre-event
   git push origin pre-event
   ```
4. Confirm the live link works on a phone, or decide now that the demo is laptop-only and use the wording in `submissions/phase-2-submission.md`.
5. Charge the laptop. Pack the charger. Bring logins for GitHub, Vercel, Google AI Studio and the hackathon platform. Formal dress.

## Timeline

| Time | Do |
|---|---|
| 1:15–1:30 | Briefing. Write the requirements down word for word in the box below. Ask about anything ambiguous before 1:30. |
| 1:30–1:40 | Read each requirement twice. For each, name the one place in "Where to change things" (architecture doc) that it touches. Decide the smallest change that satisfies the words. Write the list in "Change checklist". |
| 1:40–2:25 | Implement, one requirement at a time. After each: `npm run typecheck && npm test`. Commit after each. |
| 2:25–2:40 | `npm run lint && npm run test:e2e`. Click through the demo script once in the browser. |
| 2:40–2:50 | Push. Wait for the deployment to go green. Open the live link in a private window and run the first two minutes of the demo on it. |
| 2:50–2:55 | Submit on the platform: repository link, prompt log, live link or laptop-only declaration. Make the repository public first. |
| 2:55–3:00 | Buffer. Do not start anything new. |

If a change is not working by **2:25**, stop, revert that change (`git revert` or `git checkout pre-event -- <file>`), and ship what works. A requirement shown honestly as "partly done, here is what remains" is better than a broken demo.

## Where a new requirement most likely lands

- **A new rule or policy** (an AI restriction, a date limit, a source type): add a field to `RulesSchema` in `src/lib/types.ts`, a control in the "Rules in force" section of `src/components/PlanStep.tsx`, and an issue in `inspectClaim` in `src/lib/exportPolicy.ts`. `tests/unit/rules.test.ts` shows the pattern.
- **A new check on claims**: a pure function beside `src/lib/claimNumbers.ts`, one issue code in `exportPolicy.ts`, one badge in `src/components/status.tsx`.
- **A new source or registry**: an adapter beside `src/lib/server/crossref.ts` returning a `WorkRecord`.

## Requirements as given (paste here at 1:15)

```
1.
2.
3.
```

## Change checklist

| # | Requirement (short) | Smallest compliant change | File(s) | Test added or updated | Done |
|---|---|---|---|---|---|
| 1 | | | | | ☐ |
| 2 | | | | | ☐ |
| 3 | | | | | ☐ |

For every change:

- ☐ It goes through the existing boundaries (one adapter, one check, one gate, one builder) rather than around them.
- ☐ `evaluateExport()` is still the only gate for a reviewed export.
- ☐ Any new sample or simulated content is labelled as such, in the UI and in exports.
- ☐ No new claim of "verified", no confidence scores.
- ☐ The four steps and the Claim Inspector from the Phase 1 deck are still recognisable.
- ☐ The prompt used is appended to `docs/prompt-log.md` with the real time.
- ☐ `docs/contributions.md` records who did what today.

## Before and after note (for the demo, 7:00–7:30)

- **Asked for:**
- **Before:**
- **After:**
- **Where the change lives:**
- **What stayed the same from the Phase 1 design:**

## If something breaks

| Problem | Action |
|---|---|
| Deployment fails | Run locally (`npm run build && npm start`), declare laptop-only at submission using the prepared wording. |
| Live AI fails or quota runs out | Demo with the labelled sample brief and say so. The app already offers it explicitly. |
| Crossref slow or down | Use the demo project's saved sources. Show the "Could not check" state as a feature. |
| No internet at all | Run on the laptop. Everything except live search and live AI works offline. |
| The build is broken at 2:40 | `git checkout pre-event`, rebuild, submit that. |
| The platform is down at 2:55 | Follow whatever the organisers announce in the lab. The written rules give an email fallback for Phase 1 only. |

## Commands

```
npm run dev                      # develop at http://localhost:3000
npm run typecheck && npm test    # fast check, about 15 seconds
npm run lint
npm run test:e2e                 # builds and runs the browser journeys, about 1 minute
npm run smoke:live               # real provider calls; needs the app running
npm run build && npm start       # production build on the laptop
```
