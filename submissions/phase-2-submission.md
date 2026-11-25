# Phase 2 submission — text to enter on the platform

Deadline: before the automatic lock at 3:00 PM, Thursday 26 November 2026. Fill in the bracketed parts on the day. Enter only what is true at that moment.

## 1. Code repository

```
https://github.com/mercydeez/trace-hackathon
```

Make the repository public before submitting, and open it in a private window to confirm.

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
