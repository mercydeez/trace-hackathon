# Submission checklist

Platform: `https://ai-hackathon-tau-green.vercel.app/`. Sign in with the SP Jain email and the team code sent to the team. Any member can upload; the latest upload before each deadline counts (Submission Guidelines pp. 1–2).

## Phase 1 — deck, before 9:00 AM, Thursday 26 November 2026

Late decks are not scored. Aim to upload on Wednesday evening.

- ☐ `npm run deck` run after the final status values were set in `submissions/deck/build-deck.mjs`.
- ☐ `submissions/phase-1-deck.pptx` opens in PowerPoint and has **exactly 6 slides**.
- ☐ Slide 6's status line shows real values: no "to be confirmed", no number that was not produced by an actual test run.
- ☐ Every statement on the slides is true of the repository as it stands. Compare with `docs/qa-report.md`.
- ☐ All five areas are visibly labelled: Workflow, Architecture, Ethical considerations, Governance, Guardrails.
- ☐ Nothing essential is only in speaker notes (there are none).
- ☐ Signed in on the platform with the SP Jain email and team code.
- ☐ Deck uploaded. Confirmation seen. Screenshot of the confirmation kept.
- ☐ If the platform is unavailable: email the deck to the organisers **before 9:00 AM**, as the guidelines allow, and keep the sent email.

## Phase 2 — website, before the 3:00 PM lock, Thursday 26 November 2026

All three items are required.

**1. Code repository**
- ☐ Repository is `github.com/mercydeez/trace-hackathon`.
- ☐ Switched from private to **public** (Settings → General → Danger Zone → Change visibility), or the organisers were added as collaborators.
- ☐ Opened in a private browser window to confirm it loads without signing in.
- ☐ `inputs/`, `.env.local` and any key are not in the repository (`git ls-files | findstr /i "inputs .env.local"` prints nothing).
- ☐ Day-of changes are committed and pushed.

**2. Prompt log**
- ☐ `docs/prompt-log.md` is in chronological order and includes today's prompts with real times.
- ☐ The link or file is submitted in the form the platform asks for.

**3. Website link, if possible**
- ☐ Live link opens in a private window and the demo project loads.
- ☐ Sidebar shows the true state of live AI ("On" with the model, or "Not configured").
- ☐ If there is **no** live link: the laptop-only wording from `submissions/phase-2-submission.md` is entered, and the laptop runs `npm run build && npm start`.

**Honesty checks before pressing submit**
- ☐ Sample output is labelled wherever it appears.
- ☐ The submission text does not say "deployed", "live AI" or "tested" unless that is true right now.
- ☐ `docs/contributions.md` reflects who actually did what.

## Deployment (Vercel), when you are ready

Needs your own Vercel login; not done by the build assistant.

1. Push the repository to GitHub (already done as a private repository).
2. At `vercel.com`, **Add New → Project**, import `mercydeez/trace-hackathon`. Framework preset: Next.js. No build settings need changing.
3. Under **Environment Variables**, add `GEMINI_API_KEY` (and, optionally, `GEMINI_MODEL`, `CROSSREF_MAILTO`, `OPENALEX_API_KEY`). Never commit them.
4. Deploy. Open the URL, open the demo project, run a search, and check the sidebar's "Live AI drafting" line.
5. Run the live smoke test against it: `$env:TRACE_URL="https://<your-url>"; npm run smoke:live`.
6. Record the URL in `submissions/phase-2-submission.md` and on slide 6 of the deck if the deck has not been uploaded yet.

Vercel's Hobby plan is for personal, non-commercial use. Rate limiting and caching in this app are in memory and per instance on Vercel; see the architecture document.

## On the day

- ☐ Arrive by 1:15 PM, Simulation Lab, 2nd floor. Late teams lose build time.
- ☐ Charged laptop and charger. Tool logins. Formal dress.
- ☐ `docs/day-of-playbook.md` open.
