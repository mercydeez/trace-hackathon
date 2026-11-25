# Contributions

A record of who actually did what. Only real contributions are listed. Update it as work happens; do not add anything in advance.

## Team

Four members were assigned (Rules p. 1: teams cannot change without the organisers' approval; every member is expected to contribute and may be questioned). On 24 November 2026 one member was active. On 25 November 2026 Atharva reported three active members: Atharva, Maitrayee and Shirley. Atharva builds the product before the event; Maitrayee and Shirley will present it.

| Member | Role so far | Contributions (dated) |
|---|---|---|
| Atharva (builder) | Direction, prompts, review, deployment, submission | 24 Nov 2026: chose the TRACE concept and constraints; wrote and ran the build prompt in Claude Code; answered the set-up questions; approved the build plan. 24–25 Nov: directed the redesign, competitor analysis, new checks, writing space and audit through the prompts in `docs/prompt-log.md`; supplied the Gemini key; reviewed the app. |
| Maitrayee | Presenter (planned) | None recorded yet. Planned: study the presenter guide, rehearse the demo, present and take questions. Record what actually happens, with dates. |
| Shirley | Presenter (planned) | None recorded yet. Planned: study the presenter guide, rehearse the demo, present and take questions. Record what actually happens, with dates. |
| Fourth assigned member (if still on the team) | — | None recorded. |

## AI assistance

The application code, tests, documentation and the Phase 1 deck were produced with Claude Code (Claude Fable 5.2 on 24 Nov, Claude Opus 5.5 from 25 Nov) from the prompts in `docs/prompt-log.md`, under Atharva's direction. The sample brief in `src/data/sample-brief.json` was written with the same model during development and is labelled as sample output wherever it appears. Team members are responsible for understanding and being able to explain what was built.

## Action needed: tell the organisers

The rules expect every member to contribute, and 12 Phase 2 points depend partly on "every member contributes". If teammates remain unavailable, tell the organisers before the event rather than presenting a solo build as a team effort. This file must not be edited to suggest participation that did not happen.

## Small, real handoffs for returning teammates

Each takes 30–60 minutes, needs no coding, and produces something that can be recorded here truthfully.

**1. Adversarial QA.** Open the app and try to make it lie. Suggested attacks: paste a DOI with a typo; save a source and edit its year; write a claim with a quote that is almost right; approve a claim and then edit it; approve an evidence set and then remove a passage; load the sample and look for anywhere it is not labelled. Write each finding in `docs/qa-report.md` under "Manual findings" with the date and your name.

**2. Deck and compliance review.** Read `submissions/phase-1-deck.pptx` against the rubric table in `docs/rubric-map.md` and against the running app. Flag any statement on a slide that the app does not actually do, and anything that reads as unclear without a presenter. Check the six-slide limit and the 9:00 AM deadline arrangements in `docs/submission-checklist.md`.

**3. Demo rehearsal and Q&A.** Run `docs/demo-and-qa.md` against a stopwatch twice. Take the Q&A list and practise answering three questions each in your own words, including "why not just Zotero or Elicit?" and "what are the limits?". Note which parts of the demo each person will present.
