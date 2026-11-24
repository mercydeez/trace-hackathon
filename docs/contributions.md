# Contributions

A record of who actually did what. Only real contributions are listed. Update it as work happens; do not add anything in advance.

## Team

Four members were assigned (Rules p. 1: teams cannot change without the organisers' approval; every member is expected to contribute and may be questioned). As of 24 November 2026, one member is active.

| Member | Role so far | Contributions (dated) |
|---|---|---|
| Member 1 (active builder; add name) | Direction, prompts, review, submission | 24 Nov 2026: chose the TRACE concept and constraints; wrote and ran the build prompt in Claude Code; answered the three set-up questions; approved the build plan. *(Add: review of the app, deck upload, deployment, live AI key, as they happen.)* |
| Member 2 (add name) | — | None recorded. |
| Member 3 (add name) | — | None recorded. |
| Member 4 (add name) | — | None recorded. |

## AI assistance

The application code, tests, documentation and the Phase 1 deck were produced with Claude Code (model Claude Fable 5.2) from the prompts in `docs/prompt-log.md`, under the active builder's direction. The sample brief in `src/data/sample-brief.json` was written with the same model during development and is labelled as sample output wherever it appears. Team members are responsible for understanding and being able to explain what was built.

## Action needed: tell the organisers

The rules expect every member to contribute, and 12 Phase 2 points depend partly on "every member contributes". If teammates remain unavailable, tell the organisers before the event rather than presenting a solo build as a team effort. This file must not be edited to suggest participation that did not happen.

## Small, real handoffs for returning teammates

Each takes 30–60 minutes, needs no coding, and produces something that can be recorded here truthfully.

**1. Adversarial QA.** Open the app and try to make it lie. Suggested attacks: paste a DOI with a typo; save a source and edit its year; write a claim with a quote that is almost right; approve a claim and then edit it; approve an evidence set and then remove a passage; load the sample and look for anywhere it is not labelled. Write each finding in `docs/qa-report.md` under "Manual findings" with the date and your name.

**2. Deck and compliance review.** Read `submissions/phase-1-deck.pptx` against the rubric table in `docs/rubric-map.md` and against the running app. Flag any statement on a slide that the app does not actually do, and anything that reads as unclear without a presenter. Check the six-slide limit and the 9:00 AM deadline arrangements in `docs/submission-checklist.md`.

**3. Demo rehearsal and Q&A.** Run `docs/demo-and-qa.md` against a stopwatch twice. Take the Q&A list and practise answering three questions each in your own words, including "why not just Zotero or Elicit?" and "what are the limits?". Note which parts of the demo each person will present.
