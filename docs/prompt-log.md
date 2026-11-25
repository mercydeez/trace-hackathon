# Development prompt log

The main AI prompts used to plan and build TRACE, in the order they were used. Entries are recorded as they happen. Nothing here is reconstructed from memory or invented; where a detail is unknown it says so.

Tool used throughout: Claude Code (desktop app), model **Claude Fable 5.2** (`claude-fable-5-2`).

---

## 1 — Build prompt

- **Date:** 2026-11-24 (session opened in the evening, Gulf time; the exact minute the message was sent was not captured)
- **Model:** Claude Fable 5.2 (`claude-fable-5-2`), Claude Code desktop, session started in plan mode
- **Sent with:** a file reference to `TRACE_Hackathon_Starter_Kit.zip` (the kit this folder was extracted from)

The message was the text of the kit file `MASTER_PROMPT.md`, pasted as one request. In the pasted form the title line was absent and the ten section headings appeared as upper-case plain text (for example `1. READ THE AUTHORITATIVE INPUTS AND PRESERVE CONTEXT`) rather than Markdown headings. The assistant compared the two in-session and found no difference in wording. The file is reproduced here verbatim:

~~~text
# TRACE: one-shot hackathon build prompt

You are my autonomous lead engineer, product designer, research-integrity reviewer, and hackathon delivery partner. Build the actual project, not merely a plan or a visual prototype.

I am the only currently active builder in an assigned four-person college team. Optimise for a solo-maintainable, impressive hackathon MVP, not a full SaaS platform. Aim for the strongest defensible submission against the actual rubric; do not promise a win. Prebuilding is explicitly encouraged. We must arrive with a working website and use the event's 90 minutes for surprise requirements.

## 1. Read the authoritative inputs and preserve context

Read every page, including tables, of these files in inputs/ or the conversation attachments:
- AI_Club_Hackathon_2026_Problem_Statement.pdf
- AI_Club_Hackathon_2026_Rules_and_Regulations.pdf
- AI_Club_Hackathon_2026_Submission_Guidelines_and_Rubrics.pdf

The PDFs override this prompt wherever they conflict. Record requirements with filename and page references. Do not invent unseen rules, judging preferences, institutional policies, or teammate contributions. If an attachment is inaccessible, record that explicitly and use the brief below without pretending to have read it.

Reuse the current trace-hackathon directory if present; otherwise create it. Inspect existing files before changing anything. Never overwrite unrelated work. Keep the input PDFs private and outside the public application/public Git history.

Immediately create CLAUDE.md and PROGRESS.md. Persist the product decisions, commands, environment requirements, implementation status, unresolved risks, actual test results, and next action. Update them after meaningful milestones so a new session can continue without chat history. Save this exact prompt as the first entry in the chronological development prompt log, with the actual date and known model. Never fabricate missing prompts or timestamps.

Competition brief:
- Challenge: a website combining reference management and an AI research assistant. Students must find, organise, and cite real sources, trace claims to evidence, and retain final control.
- Phase 1: submit one PowerPoint deck, maximum six slides, before 9:00 AM on Thursday 26 November 2026. Late decks are not scored; slides after six are not read. It is judged without a presentation and must explain workflow, architecture, ethical considerations, governance, and practical guardrails.
- Phase 1 is 30 points: workflow 8, architecture 6, ethics 5, governance 5, guardrails 6.
- Arrive at 1:15 PM on 26 November, Simulation Lab, second floor. New requirements are revealed during the 1:15-1:30 briefing. Adaptation is 1:30-3:00 PM. Submit before the 3:00 PM lock; subsequent changes do not count.
- Phase 2 is 65 points: working MVP 15, research/citation features 12, honesty/verification visibly working 10, day-of requirements 8, UX 8, presentation/Q&A 12. Higher Phase 2 score breaks a tie.
- Presentation: eight minutes of demo plus two minutes of questions. The five-minute team AI quiz begins at 3:15 PM and contributes up to five additional points.
- Phase 2 submission: accessible GitHub repository, chronological main AI prompt log, and live website link where possible. A laptop-only demo is allowed if explicitly declared. Document this fallback rather than claiming deployment.
- Submission platform: https://ai-hackathon-tau-green.vercel.app/ using the SP Jain email/team code. Latest pre-deadline deck upload counts. If the platform fails, Phase 1 permits emailing organisers before 9:00 AM.
- Any AI/software tools may be used. Organisers provide no API keys or subscriptions; avoid a paid dependency. Clearly label every sample/simulated output. No copied team work, confidential information, or personal data. Follow the institution's academic-integrity and AI-use policies; their full text is not supplied here.
- Assigned teams cannot change without organiser approval. Every member is expected to contribute and may be questioned. Record actual contributions and prepare legitimate small handoffs for returning teammates; do not invent participation.

## 2. Research briefly, use relevant skills, then implement

First inspect your available tools and skills. Use relevant PDF-reading, frontend-design, webapp-testing/browser automation, and PowerPoint skills where genuinely available. For missing skills, consult Anthropic's official skills repository and documentation. Inspect instructions, scripts, provenance, and licensing before installing anything locally. Do not bulk-install random skills, run unreviewed remote scripts, or pretend a skill/browser/terminal is available.

Use a focused research pass, not an endless market report. Inspect the official sites/docs for Zotero, Mendeley, ResearchRabbit, SciSpace, and Elicit. Identify established capabilities, then explain our narrow demonstration advantage without claiming unique features that competitors already offer.

Verify current Crossref/OpenAlex API access, endpoints, coverage, abstracts, rate limits, and key requirements. Verify the chosen AI provider's current model, free access, privacy terms, and SDK. Check the actual citation library/style version. Record useful URLs, access dates, and decisions in docs/research-and-decisions.md. Never invent web findings or package APIs. If browsing fails, report what was not checked and implement a clearly labelled fallback.

Use the smallest useful skill/tool set. Prefer stable compatible packages and one lockfile. Do not spend the build installing infrastructure instead of solving the problem.

## 3. Product decision: TRACE

Build TRACE, with the tagline: "Research you can defend."

Core promise: find a source, inspect the evidence, approve its use, and export a citation-backed research brief with an honest AI-use disclosure.

Our differentiator is a visible, enforceable claim-to-evidence trail, not another chatbot that generates plausible references. A real DOI does not establish that a claim is supported. The interface must make that distinction obvious.

One excellent journey:
Research question -> approve search plan -> discover sources -> save/organise -> approve evidence set -> generate a short grounded brief -> inspect and challenge claims -> human review -> export.

Use a student-relevant demonstration question such as: "Does retrieval practice improve long-term retention compared with rereading?" Obtain a small, real, usable evidence set during development. Do not invent its papers, findings, abstracts, or DOIs. Confirm the chosen sources actually have usable accessible evidence before building the demo around them.

P0 is this complete journey plus its citation trap, persistence, tests, deployment readiness, and submission materials. Do not add authentication, billing, organisations, collaboration, vector databases, autonomous-agent frameworks, knowledge graphs, browser extensions, rich-text editing suites, OCR, or full-paper ingestion to P0. Treat papers with available abstracts as a declared MVP scope. Any stretch feature comes only after P0 works and must earn its complexity.

## 4. Implement the core journey

A. Question and plan
Accept a question. Show an editable, compact plan with search terms and scope. A deterministic plan is acceptable when AI is unavailable; do not label it AI-generated. Require explicit approval. Changing the question/scope invalidates downstream approvals.

B. Discover and organise
Use Crossref for live scholarly search and DOI metadata lookup. Add OpenAlex only if it materially improves abstract availability and its current access requirements are handled. Avoid unnecessary provider integrations.

Show a manageable result list with title, authors, publication year, venue, DOI/link, abstract availability, and provenance. Support adding by DOI, saving to a local project/collection, tags, notes, filtering, deletion, and duplicate prevention. Preserve meaningful DOI suffix characters when normalising.

Compare supplied citation metadata with registry metadata. Display disagreements instead of silently repairing and marking them verified. Handle online/print year differences conservatively. A database miss means "Not found in the checked provider", not "This paper is fake". Timeouts/rate limits mean "Could not check", never "Not found".

Manual web references may be a small secondary input, but label them user-entered/unverified. Never treat a title match, valid URL, or DOI resolution as proof of the entire reference or its scientific quality.

Persist projects, sources, tags, notes, approvals, and draft state locally. Handle hydration, corrupt storage, schema versions, reset, and reload. Clearly disclose that this is browser-local storage, not cloud backup.

C. Evidence and source approval
Keep metadata and source text separate. For each evidence item store source ID, original excerpt, content scope, locator, retrieval/provenance details, and text version. Abstract-only evidence must say "Abstract only"; do not invent page numbers. A user-pasted passage must say its authenticity has not been checked against the publication.

The student selects and approves a bounded evidence set before synthesis. Show exactly what will be sent to the model. No source text means no source-based summary: offer metadata-only saving or additional evidence, not generated guesses. Invalidate affected checks after evidence/source edits, removals, or changed selections.

D. Bounded AI synthesis
Use one lightweight sequential pipeline, not agent infrastructure:
- Find: database/API retrieval and normalisation.
- Draft: one structured AI call over approved evidence only.
- Check: deterministic validation; optionally one separate model review for support/limitations.

Describe actual mechanisms honestly. Do not call deterministic functions autonomous AI agents. Cap input sources, text length, output claims, calls, and retries. Generate roughly 3-5 editable claim cards, not a long essay.

The AI may return only existing source/evidence IDs from the approved set, with claim text, a short supporting excerpt, limitations, and any proposed inference. Validate with a typed schema. Reject unknown IDs, missing evidence, fabricated bibliographic fields, malformed output, and unapproved citations. Construct reference text from stored canonical metadata, never from the language model.

Treat retrieved text as untrusted data, not instructions. Do not give document content tool authority. Keep API keys server-side and never in browser bundles, logs, screenshots, or commits.

Implement one live AI provider: reuse an already configured usable key where appropriate; otherwise favour a currently documented Gemini free-tier-capable model after checking availability and terms. Do not assume my Claude subscription automatically supplies the application's runtime API credentials. Isolate the provider behind a small function; do not build a provider platform.

Without a key, keep real search, metadata checks, library management, manual claim/evidence linking, citation formatting, and export usable. Offer an explicit "Load sample AI brief" action for the seeded demo. Sample output must remain labelled in the workspace, individual output provenance, and exports. Never silently substitute sample output after a live call fails. Provide retry/manual/sample choices with honest status.

E. Claim Inspector: the signature interaction
Clicking a claim or citation opens an evidence panel showing the exact passage, source details, and the limits of the check.

Keep these dimensions separate:
1. Reference identity: metadata matched, mismatch, not found in provider, could not check, or user-entered.
2. Evidence access: abstract, retrieved full text if genuinely available, user-provided text, or no text.
3. Excerpt integrity: matched to the stored text, quote mismatch, or not checkable.
4. Support assessment: model-suggested support/partial support/insufficient evidence, visibly labelled fallible.
5. Student decision: pending, approved, rejected, or stale after an edit.

Deterministically validate excerpt membership against the exact evidence version. Normalise harmless Unicode/whitespace differences without dropping numbers, negations, or meaningful punctuation. Store enough offsets/mapping to highlight the real passage. A matching quotation proves text correspondence, not that the paper is correct or that the interpretation follows.

Do not show a universal green "Verified" badge or invented confidence scores. Show computed counts such as "4 claims linked; 1 needs review". Unsupported points remain unresolved or explicitly marked inference; never manufacture a supporting citation.

F. Review and export
Use a central, tested export-eligibility function, not only disabled buttons. Recheck IDs, quote matches, approvals, evidence versions, and unresolved mismatches when exporting. An edited claim must lose stale approval. Provide a clearly marked draft download for unresolved work; it must never masquerade as a reviewed brief.

For the reviewed export, include the student-approved brief, deterministic APA 7 references, source links, evidence/provenance notes, limitations, and an AI-use disclosure describing what actually occurred. Distinguish live AI, sample output, and manual writing. Use a maintained CSL/citation formatter with a confirmed APA 7 style, not model-written APA. Validate missing metadata honestly.

Provide practical Markdown/text export and a project JSON backup; avoid adding document-generation infrastructure to the app. The student remains accountable. Never claim plagiarism detection, research correctness, institutional approval, or a tamper-proof audit trail.

## 5. The citation-trap demonstration

Create a clearly labelled test-case action that works on a disposable copy of the demo project.

Demonstrate two failures through the SAME validation functions used in normal operation:
- A real DOI paired with deliberately altered citation metadata triggers an identity mismatch.
- A deliberately altered quote or numerical detail is absent from the stored source passage and triggers quote mismatch/unsupported evidence, even though the source itself is real.

The UI explains the failure, blocks reviewed export, and lets the student inspect the real evidence and correct/remove the bad content. Rerunning the checks clears only the resolved issues. Do not hardcode a red badge or canned success story. Clearly identify intentionally corrupted content as a test, never as a real research finding.

Use this as the demo's memorable moment: "The paper is real. That does not make this claim supported."

## 6. Visual direction: polished research workspace

Design a distinctive, credible academic workbench, not a generic AI landing page, chatbot clone, or dashboard full of meaningless metrics.

Use a warm off-white canvas, white sidebar, ink-coloured text, restrained deep-emerald primary actions, thin neutral borders, and small semantic status accents. Pair a refined editorial heading font with a highly readable UI sans serif; use local/system fallbacks so fonts cannot break offline demos. No neon gradients, glassmorphism, decorative blobs, oversized rounded cards, or stock illustrations.

At desktop size: a compact sidebar for projects/library; a spacious main work area; and a contextual right-hand Claim Inspector that opens when relevant. Use simple tabs/steps for Discover, Library, and Brief rather than many routes. Put the research question and current stage at the top. Hide secondary details progressively, not necessary evidence.

Make the source rows, claim cards, typography, alignment, evidence highlighting, and empty/loading/error states excellent. Source inspection should feel immediate. Use restrained transitions, accessible contrast, visible keyboard focus, keyboard navigation, text-plus-icon statuses, and reduced-motion support. Every visible control must work or explicitly explain why it is unavailable.

Verify at 1440x900, a typical 1366x768 laptop/projector viewport, and a narrow mobile viewport. Collapse the inspector into a drawer on smaller screens. Do not sacrifice readability to fit everything into one screenshot. Inspect actual browser screenshots and iterate; do not merely describe a beautiful UI.

## 7. Lean implementation and durable project files

Default to one current stable Next.js/React/TypeScript application, Tailwind, selective shadcn/ui components, Lucide icons, schema validation, and browser-local persistence. Use server routes for provider calls and client components only where needed. Keep domain types, provider adapters, citation formatting, checks, and UI separate enough to change during the event. Use a small reducer/store and simple functions, not a framework within the framework.

Use strict input limits, sensible timeouts, bounded retries, safe text rendering, and best-effort caching. Do not fetch arbitrary user URLs server-side; use known scholarly API endpoints. Document deployment limits and any non-durable rate limiting/cache rather than claiming production-grade protection. No confidential data, telemetry by default, or secrets in public files. Explain which data leaves the browser and the selected provider's actual privacy limitations.

Create these meaningful files/directories, adapting names only where technically justified:
- README.md: exact install/run/test/deploy instructions, setup modes, limitations.
- CLAUDE.md and PROGRESS.md: durable project context and current state.
- package.json, one lockfile, .env.example, .gitignore, framework/TypeScript/test configuration.
- src/app/: working workspace and necessary API routes.
- src/components/: workspace, source library, claim cards, inspector, export UI.
- src/lib/: types/schemas, provider adapter(s), storage, citations, evidence validation, workflow and export policy.
- src/data/: small real-source fixtures plus explicitly labelled sample outputs, with provenance.
- tests/: unit/integration checks and one main browser journey.
- docs/competition-brief.md and docs/rubric-map.md.
- docs/research-and-decisions.md and docs/architecture-and-governance.md.
- docs/prompt-log.md, docs/contributions.md, docs/qa-report.md.
- docs/demo-and-qa.md, docs/day-of-playbook.md, docs/submission-checklist.md.
- submissions/phase-1-deck.pptx and its editable generation source.
- submissions/phase-1-content.md and submissions/phase-2-submission.md.

Do not generate empty documentation for appearances. Keep docs concise, accurate, and synchronised with the implementation. Record software attribution. Exclude secrets, private inputs, dependency folders, build products, and local research data from Git as appropriate. Preserve necessary public demo fixtures without mislabelling their origin.

## 8. Build the submission, not just the app

Create the six-slide Phase 1 deck early enough to submit, then align it with the actual implemented design. Use an available PowerPoint skill or a small reproducible generator. Produce a real PPTX, not just text called a deck. Render/check slides if tools permit; document any unperformed inspection.

Suggested six-slide structure:
1. Student problem, TRACE's focused promise, and target user.
2. End-to-end workflow, actual AI/code roles, checking step, and human checkpoints.
3. Architecture/data flow, storage, external providers, and honest failure modes.
4. Guardrails demonstrated through the claim inspector and citation trap.
5. Ethics and governance: risks, concrete mitigations, accountability, privacy, AI disclosure, source bias, copyright, academic integrity, and over-reliance.
6. MVP scope, demonstrable acceptance criteria, limitations, and how modular boundaries accommodate day-of requirements.

Make the slides readable without spoken explanation. Include all five required areas visibly, not only in speaker notes. Label planned versus implemented capabilities honestly. Do not invent SP Jain policy clauses; identify any policy text still requiring organiser confirmation.

Map every rubric row to an actual feature/document, demo step, and test/evidence where relevant. Include a timed eight-minute walkthrough and concise two-minute Q&A preparation. Cover: metadata versus truth, abstract-only limitations, why not just Zotero/Elicit, what happens without internet/AI, what the student controls, and what changed on the day. Add brief AI-quiz revision topics, not invented quiz questions represented as official.

Prepare small legitimate handoffs for returning teammates: adversarial QA, deck/compliance review, demo rehearsal/Q&A. Keep the solo-build route operational. Record actual contributions only and flag the organiser-approval issue rather than assuming solo participation is permitted.

## 9. Testing and day-of resilience

Implement before polishing optional extras. Use deterministic, clearly labelled fixtures in automated tests; do not make the test suite depend on a live paid API. Separately smoke-test available live integrations.

At minimum verify:
- Clean installation, typecheck, lint, tests, and production build.
- Search -> save -> tag/note -> reload -> source approval -> brief -> inspect -> export.
- DOI deduplication, metadata mismatch, ambiguous year, missing abstract, empty search, and unavailable provider versus not-found distinctions.
- Unknown/unapproved source IDs and malformed model output are rejected.
- Altered quotations/numbers fail; valid excerpts match; retrieved instructions do not gain tool authority.
- Editing/removing evidence or claims invalidates approval and blocks stale reviewed exports.
- Manual/unverified sources never gain registry-confirmed status automatically.
- Missing key, timeout, rate limit, and offline operation do not silently become fake live AI.
- Sample/cached provenance survives export; bibliography/disclosure reflect the actual sources and mode.
- Browser persistence, draft/project export, reset confirmation, responsive layout, keyboard access, and all main buttons.

Capture actual browser screenshots, inspect them, and fix defects. Report checks as passed, failed, or not run; never claim tests or deployment you did not execute. The local activity history is a convenience, not a tamper-resistant compliance system.

Prepare a resettable demo project and labelled cached/sample fallback for network failure. Fresh unknown searches must not return canned demo data as if it were live. Make the app usable from the laptop, and ready for a simple deployment. Deploy only when credentials/authorisation are available; otherwise give exact remaining steps and the permitted laptop-only submission wording.

In the day-of playbook, reserve time to inspect the new requirements, implement the smallest compliant change, regression-test, redeploy if applicable, and submit BEFORE 3:00 PM. Freeze a known-good pre-event version. Include a place to paste the new requirements, a change checklist, and a before/after demo note. Preserve the Phase 1 design; do not predict the undisclosed requirements as facts.

## 10. Execute and deliver

Give a short initial plan, make reasonable reversible decisions, and begin creating files immediately. Continue through implementation, checks, UI refinement, and submission assets rather than stopping after research or asking for permission at every step. Ask only for genuinely blocking credentials/authorisations; otherwise maintain the honest fallback and keep building.

Prioritise: end-to-end function, demonstrable integrity, usable source organisation/citations, clear human control, polished UX, then extras. If time/context becomes constrained, cut extras and preserve tested P0. Persist a precise checkpoint; never pretend unfinished work is complete.

Your final handoff must state: what runs; the launch commands; where the deck, prompt log and submission files are; real/live versus sample/manual capabilities; actual test results; remaining secrets/deployment/organiser actions; and any material limitations. Do not claim the result guarantees winning, eliminates hallucinations, or is production-ready.

Start now by inspecting the three PDFs, saving durable context, making the concise rubric-driven plan, and building TRACE.
~~~

## 2 — Clarifying answers (question dialog)

- **Date:** 2026-11-24, about 22:20 (+04:00)
- **Model:** Claude Fable 5.2

Before finalising its plan the assistant asked three questions. The answers selected were:

1. *No AI API key is set on this machine. How should TRACE's live AI drafting be set up?* → **"I'll add a Gemini key (Recommended)"**
2. *Phase 2 needs a GitHub repository the organisers can open. What should I do with Git during the build?* → **"Private repo, push as I go (Recommended)"**
3. *Two GitHub accounts are logged in on this machine. Which should own the TRACE repository if I create one?* → **"mercydeez"**

## 3 — Plan approval

- **Date:** 2026-11-24, about 22:27 (+04:00)
- **Model:** Claude Fable 5.2

The assistant presented a written build plan (stack, simplifications, build order, verification, items needing the user). The user approved it without edits. No further instruction text was typed.

## 4 — API key added

- **Date:** 2026-11-25, morning (+04:00); the exact minute was not captured
- **Model:** the user switched the session to **Claude Opus 5.5** (`claude-opus-5-5`) with `/model` before sending this message

> I have pasted the api key in the env.example

The key itself is not reproduced here. The assistant moved it from the tracked `.env.example` to the git-ignored `.env.local` before anything was committed, restored `.env.example`, and then verified live AI drafting (results in `docs/qa-report.md`).

## 5 — Problem statement explained

- **Date:** 2026-11-25, morning (+04:00)
- **Model:** Claude Opus 5.5

> Before deploying the project, first simply explain me what the problem statement is

The assistant summarised the organisers' Problem Statement PDF in plain language. No files changed.

## 6 — SaaS-style redesign

- **Date:** 2026-11-25, about 11:05 (+04:00)
- **Model:** Claude Opus 5.5

> Okay i got the the problem statement now, the hackathon is on but the UI of this project is not at all user friendly, make it like a saas, remember how did we designed our student LMS? the exact same way, it should look premium, user interactive, users should feel better to interact with this

The assistant tagged the last tested version as `pre-redesign`, read the design system of an older student LMS build on this machine, and began restyling TRACE to match. (That was the wrong LMS design; see entry 7.)

## 7 — Correction: use mockup G

- **Date:** 2026-11-25, about 11:15 (+04:00)
- **Model:** Claude Opus 5.5

> Wtf stop, you are copyting the wrong LMS design, search for the LMS mockup G whic we created, it was a html file, or the code which is running on the localhost 5180

The assistant found the approved "mockup G" (Learners Campus) prototype and the student redesign build, and began applying that look instead.

## 8 — Change of plan: ReproSense look

- **Date:** 2026-11-25, about 11:25 (+04:00)
- **Model:** Claude Opus 5.5

> https://reprosense.vercel.app/ change of planm, change the UI according to thid website, subtle animation, same screen , font and the poppins colours which looks smooth

The assistant read the live site's fonts, colour tokens, card and motion styles, and switched TRACE to them: Plus Jakarta Sans, a plum/pink palette, and a floating glass header with pill navigation.

## 9 — Light theme only

- **Date:** 2026-11-25, about 11:28 (+04:00)
- **Model:** Claude Opus 5.5

> dont waste your time on dark light themes, keep it light only

Only the light palette was implemented; there is no theme switch.
## 10 — Workbench redesign and competitor analysis

- **Date:** 2026-11-25, about 11:50 (+04:00)
- **Model:** Claude Opus 5.5
- **Sent with:** a file reference to `Ai-Club-Hackathon-main.zip` (a competitor team's repository, downloaded by the user from GitHub)

> Looks very shit, the UI is also not very perfect, you have added colours but the spaces, layout architecure is very bad, use all the design and frontend skills available and make accordingly.. Also i have added a github repository which i downloaded from one our our competitors girhub, check what have he done, his UI, Whos logic is right and how can we overcome them

The assistant read the competitor's zip in memory only (nothing extracted or copied into this repository) and audited TRACE's layout. It asked three questions; the answers were: keep the ReproSense look; a three-pane workbench layout; full scope including new features. A written plan was approved. The redesign and four features (claim-details check, project rules, retraction flag, reference-list check) were then built from TRACE's own code; only ideas were taken from the competitor analysis, in line with the event's no-copying rule.
## 11 — Problem-statement check

- **Date:** 2026-11-25, about 12:30 (+04:00)
- **Model:** Claude Opus 5.5

> Is this problem satisfying the problem statement?

The assistant mapped each requirement in the Problem Statement to TRACE. Its main gap: there was nowhere to "insert citations while you write". No files changed.

## 12 — Judge's view

- **Date:** 2026-11-25, about 12:35 (+04:00)
- **Model:** Claude Opus 5.5

> Assume that you are the Jury for this hackathon, make this the best project ever made in a hackathon

The assistant scored TRACE against the rubric as a judge would. It then built a writing space that checks in-text citations against the project's sources as the student types, and added Harvard as a second reference style. It asked for Vercel access to provide the live link the rules expect.
## 13 — Build everything before the event; teammates present

- **Date:** 2026-11-25, about 13:10 (+04:00)
- **Model:** Claude Opus 5.5

> I have to more active members, so what I will do is i will build the entire project, rules have changed as we have to complete everything before the hackathon and in the hackathon just prepare for the presentation, I will build everything and tell the other 2-3 members to present, yup thats my goal... me Atharva, Maitrayee  and Shirley and 3 members currently, i will handover them the deployed sit with ppt and a pdf which gives them understanding of the entire project... I will keep it building until it becomes the best,  Start Audit and build

## 14 — Submission audit and presentation UI

- **Date:** 25 November 2026, about 14:45 Dubai time
- **Tool:** Codex

> [http://localhost:3000/](http://localhost:3000/) This is a hakathon project which i have to submit tomorrow, audit, review entire project and find the missing gaps,bugs, findings as there atr 7-8 groups and we have to standout, fix the UI, make it professional Sasa like stripe and apple, with good effects but a simple and non cluttered view so that it can be presented properly, do everything and give me a prompt for claude code to fix this, i have attched the rules and problem statemtn here

Codex checked TRACE against the organiser PDFs, brought the citation trap onto the welcome screen, moved active claims above drafting controls, and fixed defects in reviewed export, late draft handling and local recovery. The [audit](submission-audit.md) records the findings. The [Claude Code follow-up prompt](claude-code-final-pass.md) is ready to use.

## 15 — Final audit and production deployment request

- **Date:** 25 November 2026, about 16:40 Dubai time
- **Tools:** Codex and Claude Code

> give a prompt for claude to do a final audit, because once deployed i wont work on it and i will share this directly in the group, tell it to audit and do all the things fix bugs and make it a final deployable, use claude in chrome and deploy for me

Codex updated the [final release prompt](claude-code-final-pass.md) and invoked Claude Code on an isolated copy of the current source. The audit copy excluded local credentials and private organiser files. Claude identified cross-tab storage issues, inconsistent reference style and avoidable drafting quota usage. Codex reviewed the patches and verified them with 179 unit tests and 16 Chrome browser tests. The hosted release is pending Vercel sign-in.

## 16 — Final release run in Claude Code

- **Date:** 25 November 2026, about 16:50 Dubai time
- **Model:** Claude Opus 5.5 (Claude Code)

The owner pasted the release prompt saved in [claude-code-final-pass.md](claude-code-final-pass.md) unchanged, and chose a Vercel GitHub import through Claude in Chrome, with the owner adding the Gemini key on the host. Claude Code verified the working tree from a clean install. A separate review agent audited the patch. Claude Code fixed the defects it could reproduce, ran the browser checks, and prepared the release. Results are in [the QA report](qa-report.md).