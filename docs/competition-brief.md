# Competition brief

Requirements extracted from the three organiser PDFs, read in full on 24 November 2026. The PDFs themselves are kept private in `inputs/` (git-ignored) and remain authoritative. Abbreviations: **PS** = Problem Statement (2 pages), **RR** = Rules and Regulations (3 pages), **SG** = Submission Guidelines and Rubrics (3 pages).

## The challenge

- Build a website that helps researchers manage references and cite sources honestly, and that also acts as an AI research assistant. (PS p.1)
- Expected: the organisation of a reference manager plus the speed of AI, without invented references. A student can find, organise and cite sources, trust that every reference is real and every claim can be traced to its source, and stays in charge of final decisions. (PS p.1)
- Named failure modes: a real author given the wrong paper, a DOI that does not exist, a quoted sentence that is not in the source, a guess stated as fact. The student is responsible for every one. (PS p.1)
- Tools to learn from: Mendeley, Zotero, EndNote, ResearchRabbit, SciSpace. (PS p.1)
- Optional starting ideas: a small team of AI agents with clear roles; a citation checker using Crossref/OpenAlex; trust labels per claim; an honest "Not found"; approval checkpoints; APA 7 export plus a statement of how AI was used. Teams need not use any of them. (PS p.2)

## Schedule

| When | What | Source |
|---|---|---|
| Tue 24 Nov, 5:00 PM | Problem statement released | RR p.1 |
| Thu 26 Nov, 9:00 AM | Phase 1 deck deadline | RR p.1, SG p.1 |
| Thu 26 Nov, 1:15–1:30 PM | Check-in, briefing, Phase 2 requirements revealed, chit draw. Simulation Lab, 2nd floor | RR p.1 |
| 1:30–3:00 PM | Development: adapt to the new requirements (90 minutes) | RR p.1 |
| 3:00 PM | Phase 2 submissions close; lock is automatic | RR p.1, SG p.2 |
| 3:15–3:20 PM | AI quiz, played as teams | RR p.1 |
| 3:20–4:40 PM | Presentations | RR p.1 |
| 4:50–5:00 PM | Results | RR p.1 |

Timings may be adjusted on the day. (RR p.1)

## Phase 1 — ideation deck

- One PowerPoint deck, no more than 6 slides; later slides are not read; late decks are not scored. (SG p.1)
- Judged before the event without a presentation, so it must be clear on its own. (SG p.1)
- Must cover five areas (SG p.1):
  1. **Workflow** — how a student moves through the site, which AI agents or steps do what and in what order, where the student stays in control, where answers are checked.
  2. **Architecture** — the parts of the system and how they connect (website, AI, sources, reference storage).
  3. **Ethical considerations** — invented citations, plagiarism, privacy, biased sources, over-reliance on AI, and how the design handles each.
  4. **Governance** — who is accountable for the output, how AI use is disclosed, which rules or policies the site follows.
  5. **Guardrails** — the specific mechanisms that keep the site honest.
- Upload on the hackathon platform (`https://ai-hackathon-tau-green.vercel.app/`), signing in with the SP Jain email and team code. Any member can upload; the latest upload before the deadline counts. If the platform is unavailable, email the deck to the organisers before 9:00 AM. (SG p.1)

## Phase 2 — website MVP

Submit all three before 3:00 PM on the same platform (SG p.1–2):

1. Link to a working GitHub repository the organisers can open.
2. Prompt log: the main AI prompts used to plan and build, in order.
3. Live website link if possible. If it only runs on a laptop, say so at submission and demo from the laptop.

Good to know (SG p.2): build before the event; judges look at how well the team adapts to day-of requirements; one core journey that works beats many features that do not; sample AI output must be labelled as a sample; the website should still follow the Phase 1 design.

## Rubric (100 points)

**Phase 1 — 30 points** (SG p.2)

| Criterion | What judges look for | Points |
|---|---|---|
| Workflow | Clear roles and order of steps or agents, human checkpoints, a checking step | 8 |
| Architecture | Components and data flow are clear, and realistic to build in 90 minutes | 6 |
| Ethical considerations | Real risks identified, with a response to each | 5 |
| Governance | Accountability, AI disclosure and policies are defined | 5 |
| Guardrails | Specific, practical mechanisms against invented references and false claims | 6 |

**AI quiz — 5 points** (SG p.3): 1st 5, 2nd 4, 3rd 3, 4th 2, every other participating team 1. One answer per question per team, at most 5 minutes. (RR p.2)

**Phase 2 — 65 points** (SG p.3)

| Criterion | What judges look for | Points |
|---|---|---|
| Working MVP | The MVP works and the core journey runs end to end in the demo | 15 |
| Research and citation features | How well the website helps find, organise and cite sources | 12 |
| Honesty and verification in action | At least one guardrail or checking feature visibly working | 10 |
| Day-of requirements | Requirements given on the day are implemented, while the website still follows the Phase 1 design | 8 |
| User experience | A student could use it without instructions | 8 |
| Presentation and Q&A | A clear demo, strong answers, and every member contributes | 12 |

Scores are averaged across judges; a tie goes to the higher Phase 2 score. (SG p.2)

## Rules that shape the build

- Compete only in the assigned team; teams cannot change without organiser approval. Every member is expected to contribute and may be questioned. (RR p.1)
- Any AI or software tools may be used. No paid API keys or subscriptions are required or provided; teams may use free APIs. (RR p.2)
- Keep a record of AI prompts; it is submitted. (RR p.2)
- Never present invented references or sample outputs as real; label sample or simulated content clearly. (RR p.2)
- Do not copy another team's work; do not use confidential or personal data. (RR p.2)
- Follow SP Jain's academic-integrity and AI-use policies. (RR p.2) **The text of those policies was not supplied to this project.** Nothing in TRACE quotes or paraphrases them; confirm with the organisers if a specific clause must be referenced.
- 8-minute demo plus 2 minutes of questions, strictly timed. Present from the live link submitted. Changes after 3:00 PM are not considered. (RR p.2)
- Rule breaches may cost points or lead to disqualification. (RR p.2)
- Bring a charged laptop with charger, tool logins, formal dress. (RR p.3)

## Two readings worth keeping in view

- "Present from the live link you submitted" (RR p.2) makes a live deployment the expected path; the laptop-only route (SG p.2) is a declared fallback, not an equal option.
- Architecture is scored on being "realistic to build in 90 minutes" (SG p.2), so the deck should show a small modular system.

## Team situation (as stated by the active builder on 24 Nov 2026)

One of four assigned members is currently active. The rules expect every member to contribute and judges may question anyone; 12 Phase 2 points include "every member contributes". This needs to be raised with the organisers. `docs/contributions.md` records actual contributions only.
