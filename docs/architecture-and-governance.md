# Architecture and governance

## Shape of the system

One Next.js application. The browser holds all of the student's work; the server exists only to relay requests to three providers and to run the reference formatter.

```
Browser (React)                              Server routes (Node)                External
┌──────────────────────────────────┐         ┌───────────────────────────┐
│ Workspace UI   src/components/   │  JSON   │ /api/search  /api/doi     │──► Crossref REST API
│ Domain core    src/lib/*.ts      │◄───────►│ /api/abstract             │──► OpenAlex
│ Project state  localStorage      │         │ /api/draft                │──► Gemini API
│ (one versioned key)              │         │ /api/cite  (Citation.js)  │    (runs locally)
└──────────────────────────────────┘         │ /api/status               │
                                             └───────────────────────────┘
```

### The pipeline: three steps, one of them AI

| Step | What it is | Where |
|---|---|---|
| Find | Code. Crossref search and DOI lookup, normalised into one record shape. | `src/lib/server/crossref.ts`, `openalex.ts` |
| Draft | One language-model call over the approved passages only, constrained to a JSON schema. | `src/lib/prompt.ts`, `src/lib/server/gemini.ts` |
| Check | Code. Deterministic validation of the model's answer, of every excerpt, of reference details, and of approvals. | `validateDraft.ts`, `excerpt.ts`, `identity.ts`, `approvals.ts`, `exportPolicy.ts` |

These are sequential steps, not autonomous agents. Only Draft is a model, it runs once per request, and it has no tools.

### Domain core (pure functions, unit-tested)

| File | Responsibility |
|---|---|
| `types.ts` | zod schemas for the stored project; the `Outcome` type every provider call returns |
| `doi.ts` | DOI normalisation that preserves suffix characters |
| `text.ts` | JATS → text, OpenAlex index → text, change-detection hash |
| `excerpt.ts` | Excerpt integrity: normalised exact matching with offsets for highlighting |
| `identity.ts` | Reference identity: cited details against the stored registry record |
| `approvals.ts` | Fingerprints for the plan, the evidence set and each claim |
| `plan.ts` | Rule-based search terms |
| `prompt.ts` | The single model request, also used for the on-screen preview |
| `validateDraft.ts` | Strict validation of model output against the approved evidence |
| `exportPolicy.ts` | `inspectClaim` (the five dimensions) and `evaluateExport` (the gate) |
| `exportMarkdown.ts`, `disclosure.ts` | Reviewed brief, draft, AI-use disclosure, JSON backup |
| `mutations.ts`, `store.ts` | Every state change as a pure function, applied by one reducer |
| `storage.ts` | Versioned localStorage with quarantine of unreadable data |
| `demo.ts`, `trap.ts` | Seeded demo project and the citation-trap test copy |

### Data that leaves the browser

| To | What | When |
|---|---|---|
| TRACE server → Crossref | search terms, year range, DOIs | on search, add-by-DOI, re-check |
| TRACE server → OpenAlex | a DOI | when the student asks for an abstract |
| TRACE server → Gemini | the fixed instructions, the research question, the approved passages and a short author-year label for each | when the student presses "Draft with AI" |
| TRACE server (Citation.js) | bibliographic details of sources | to format references; goes no further |

Notes, tags, the activity history, unapproved passages and the rest of the library are never sent to an AI provider. There are no accounts, cookies, analytics or telemetry. On Gemini's free tier, submitted content may be used by Google to improve its products and may be read by reviewers; the app shows this beside the payload preview.

### Failure modes

| Situation | Outcome kind | What the student sees |
|---|---|---|
| DOI unknown to Crossref | `not_found` | "Not found in Crossref. This does not show the paper is fake…" with the option to save it marked as not confirmed |
| Timeout, 5xx, network failure | `timeout` / `unavailable` | "Could not check." One automatic retry, then the message. Never "not found". |
| Rate limited | `rate_limited` | "Could not check… rate limiting". No retry. |
| Search returns nothing | `ok`, empty list | "Crossref returned no results", with the note that this is not evidence of absence |
| No abstract | — | "No source text"; the source can be kept as a reference, and no summary is offered |
| No AI key | `no_key` | "Draft with AI" is disabled and says why; manual claims and the labelled sample remain |
| AI call fails or returns malformed JSON | any failure | "The AI draft did not happen… Nothing was added", with Retry / Write myself / Load sample as explicit choices |
| Model cites an unknown ID or adds bibliographic fields | — | That item is listed as rejected with the reason; it is not added |
| Reference formatter fails | `unavailable` | Reviewed export is refused; a draft lists references as UNFORMATTED |
| Saved data unreadable or from another version | — | Moved to a quarantine key, the student is told, the app starts fresh |

### Limits

6 passages per evidence set; 6,000 characters per passage sent; 20,000 characters in total; 5 claims per draft; 600 characters per claim or excerpt; 1 model call with at most 1 retry; 8 s timeout on registry calls and 25 s on the model call; 10 search results.

### Security and deployment notes

- `GEMINI_API_KEY` is read only on the server and is never returned, logged or placed in a URL.
- The server fetches only `api.crossref.org` and `api.openalex.org` (allow-list in `src/lib/server/http.ts`) and the Gemini API through its SDK. It never fetches a URL supplied by a user.
- Text from sources and from the model is rendered as text. No HTML is injected; APA italics are rebuilt from plain and italic runs.
- Request counters and the Crossref queue are in memory and per server instance. On a serverless host they reset on cold start and are not shared between instances. They are a courtesy to providers and a brake on accidental loops, not abuse protection.
- The response cache is in memory, best effort, ten minutes.
- This is a hackathon MVP and is not production-ready.

## Governance

**Accountability.** The student is the author. The student approves the search plan, the evidence set and every claim individually; TRACE never approves on their behalf and has no "approve all". The export states that the student reviewed each claim and remains responsible. The builders are accountable for the tool behaving as described: the checks are covered by automated tests and the limits are written down here.

**AI disclosure.** Each export ends with a disclosure computed from the project's recorded activity (`src/lib/disclosure.ts`): how many claims were drafted by a model and which model, how many come from the built-in sample, how many the student wrote, how many were edited afterwards, what was sent to the model, how many model items were rejected, and what the automatic checks do and do not establish. Sample output is labelled as sample in the workspace, on each claim and in the export, and cannot be presented as a live AI result.

**Rules and policies followed.**

- Hackathon rules: sample or simulated content is labelled; no invented references; no personal or confidential data; a prompt log is kept (`docs/prompt-log.md`).
- Provider terms: Crossref rate limits and etiquette; OpenAlex's budget; the Gemini API terms for the free tier.
- SP Jain's academic-integrity and AI-use policies govern how a student may use the output. **Their text was not supplied to this project.** TRACE therefore does not quote or interpret them; it supports compliance generically, through source traceability, human sign-off and disclosure. Any clause that must be referenced should be confirmed with the organisers.

**What TRACE does not claim.** It does not detect plagiarism, establish that a source is correct, decide that a claim follows from its excerpt, carry institutional approval, or keep a tamper-proof audit trail. The activity history is stored in the browser, can be cleared, and is a convenience.

## Where to change things

| Need | Change |
|---|---|
| A different AI provider | replace `src/lib/server/gemini.ts`; keep the `Outcome<DraftResult>` return |
| Another scholarly source | add an adapter beside `crossref.ts` and a route; return a `WorkRecord` |
| A new check or trust label | one function in `src/lib/`, one issue code in `exportPolicy.ts`, one badge in `src/components/status.tsx` |
| Another citation style | the `template` name in `src/lib/server/citations.ts` (bundled: `apa`, `vancouver`, `harvard1`) |
| Another export format | a builder beside `buildBrief` in `exportMarkdown.ts` |
| A new approval checkpoint | a fingerprint in `approvals.ts` and a blocker in `evaluateExport` |
| Tighter or looser limits | `LIMITS` in `src/lib/prompt.ts` |
