# Research and decisions

Everything here was checked on **24 November 2026** unless a line says otherwise. "Observed" means seen in a real response from this machine; "documented" means read on the provider's own page. Items that could not be checked are marked. External pages inform the design; they are not hackathon rules.

## Existing tools, and what TRACE does not claim

Read from the tools' own sites. Several SciSpace product pages could not be fetched (empty page or HTTP 403), so SciSpace is described from its own Academy guides.

| Tool | Established capability (source) |
|---|---|
| Zotero | Browser connector, collections, tags, 9,000+ citation styles; "Add Item by Identifier" takes a DOI and pulls metadata from Crossref; flags retracted items using Retraction Watch data. `zotero.org`, `zotero.org/support/adding_items_to_zotero`, `zotero.org/blog/retracted-item-notifications/` |
| Mendeley | Web Importer, nested collections, PDF annotation, Mendeley Cite for Word. `mendeley.com/reference-management/reference-manager`, `mendeley.com/reference-management/mendeley-cite` |
| ResearchRabbit | Recommends related papers from a seed set. `researchrabbit.ai` |
| SciSpace | Chat with PDF where answers link to the supporting passage; a Citation Verifier giving a line-by-line audit of claims and unsupported citations with edits the user approves; literature review tables; citation generator. `learn.scispace.com/guide/read-a-paper-with-chat-pdf`, `learn.scispace.com/guide/audit-citations-with-citation-verifier`. **Not checked:** `scispace.com` product pages. |
| Elicit | Reports in which "Every claim links to the exact quote from the source paper"; states that its models are imperfect and that it does not judge a paper's trustworthiness. `elicit.com/solutions/reports`, `support.elicit.com/en/articles/549569` |

**Consequence.** Linking an AI claim to a source quote, auditing citations before submission, and DOI metadata lookup all exist already. TRACE claims none of them as new. Its narrow demonstration advantage is a small workflow where:

- the excerpt check is deterministic string matching that the student can see and reproduce, not another model's opinion;
- five status dimensions are kept apart instead of merged into one badge;
- approvals are tied to content fingerprints, so edits invalidate them;
- one export gate enforces all of it, and anything else leaves as a file marked DRAFT.

These points were not found on the official pages read. That shows only that the pages do not mention them, not that the products lack them.

## Scholarly data

### Crossref REST API (search, DOI lookup, abstracts)

- Endpoints used: `GET https://api.crossref.org/works?query.bibliographic=…&rows=…&select=…&filter=from-pub-date:…,until-pub-date:…` and `GET https://api.crossref.org/works/{doi}`.
- No key required. Documented limits (access-and-authentication page, last updated 16 Oct 2025): public pool 5 requests/second for single-DOI lookups and 1/second for queries, concurrency 1; polite pool (a `mailto`) 10 and 3 per second, concurrency 3; HTTP 429 when exceeded.
- Observed response headers on a query: `x-rate-limit-limit: 1`, `x-rate-limit-interval: 1s`, `x-concurrency-limit: 1`, `x-api-pool: public-array`.
- Abstracts are deposited by publishers as JATS XML and are optional. Observed: 5 of 10 candidate papers for the demo topic had a usable abstract; one had only a 94-character teaser; four had none. Crossref's documentation notes that some abstracts may be subject to copyright.
- **Decisions.** Server-side queue that sends one Crossref request at a time with a 1.1 s gap after a query. Optional `CROSSREF_MAILTO` for the polite pool, sent only in the `User-Agent` header and never stored in a URL. A registry match is treated as agreement of citation details only, never as evidence that a claim is supported.

### OpenAlex (abstract fallback only)

- Documented (`help.openalex.org/api/authentication/`, `help.openalex.org/access/example-costs/`): no key required; without a key a budget of $0.10/day; single-work lookups are free, searches cost $1 per 1,000; with a free key $1/day. Abstracts are returned as `abstract_inverted_index` (word → positions).
- Observed: a DOI lookup works without a key; headers reported `X-RateLimit-Limit-USD: 0.1` and a search cost of 0.001. Through the app, OpenAlex returned a 1,137-character abstract for Rowland (2014), which Crossref lacks.
- **Decision.** Use OpenAlex for one thing: a free single-work lookup when the student presses "Look for an abstract in OpenAlex". Not used for search. The stored text is labelled as rebuilt from a word-position index.

### Demo evidence set

Real records, fetched through the app's own `/api/doi` route by `scripts/fetch-fixtures.mjs` and stored in `src/data/demo-sources.json` with retrieval time and API URL:

| Source | DOI | Abstract in Crossref |
|---|---|---|
| Roediger & Karpicke (2006), Test-Enhanced Learning | 10.1111/j.1467-9280.2006.01693.x | yes |
| Karpicke & Roediger (2008) | 10.1126/science.1152408 | yes |
| Roediger & Karpicke (2006), The Power of Testing Memory | 10.1111/j.1745-6916.2006.00012.x | yes |
| Adesope, Trevisan & Sundararajan (2017) | 10.3102/0034654316689306 | yes |
| Dunlosky et al. (2013) | 10.1177/1529100612453266 | yes |
| Rowland (2014) | 10.1037/a0037559 | no (kept as a metadata-only case) |
| Roediger & Butler (2011) | 10.1016/j.tics.2010.09.003 | no (kept as a metadata-only case) |

Abstract text is redistributed as retrieved from Crossref's open API for a small educational demo; copyright in the abstracts remains with the publishers.

## AI provider

- **Chosen: Google Gemini API, model `gemini-3.5-flash-lite`** (override with `GEMINI_MODEL`). Documented on `aistudio.google.com/docs/models` and `/pricing` (the `ai.google.dev` URLs redirect there): listed as Stable, with a free tier, and recommended for new projects alongside Gemini 4 Hydrogen. `gemini-2.5-flash` and `gemini-2.5-pro` are deprecated and re-routed from 1 Dec 2026; `gemini-2.0-flash` is shut down.
- SDK: `@google/genai` 3.6.1. The documented call for schema-constrained JSON is `client.interactions.create({ model, input, system_instruction, response_format: { type: "text", mime_type: "application/json", schema }, generation_config })`, reading `interaction.output_text`. The parameter names, `store`, `timeout_ms` and `maxRetries` were confirmed against the SDK's own type definitions in `node_modules`. The docs say newer models ignore `temperature`, so none is sent.
- Free-tier rate limits are not published on the rate-limits page (it points to AI Studio).
- Privacy (Gemini API terms, effective 23 Mar 2026): on the free tier, content may be used to improve Google's products and human reviewers may read it; users are told not to send sensitive data. Apps offered to users in the EEA, Switzerland or the UK must use paid services.
- **Decisions.** One function, `draftWithGemini`, behind `/api/draft`. `store: false`, one call, at most one retry on timeout or server error, none on 429. The app sends only the research question and the passages the student approved, shows that payload in full beforehand, and states the free-tier data-use position next to it.
- **Not verified:** a real call. No key was available on the build machine when this was written. See `docs/qa-report.md` for the current state.

## Citation formatting

- `@citation-js/core` and `@citation-js/plugin-csl` 0.9.0 (MIT). The bundled `apa` template is "APA Style 7th edition" (plugin `styles.json`, updated 14 Feb 2026). The engine underneath is `citeproc` 2.4.63, licensed CPAL-1.0 OR AGPL-1.0.
- Runs on the server (`/api/cite`) to avoid bundling the engine for the browser.
- Behaviour found by testing, and what TRACE does about it:
  - In-text citations are only disambiguated (2006a, 2006b) against other citations the processor is told about. TRACE passes the whole reference list as context.
  - The a/b order follows the processor's title sort, which does not ignore a leading "The"; strict APA 7 does. The letters are consistent between the list and the text, but may differ from a hand-built list.
  - Titles keep the registry's capitalisation. APA 7 asks for sentence case. The app and the export say so.
  - An undated web page needs a retrieval date. TRACE passes the date the student saved the source.

## Stack, as installed

| Package | Version | Licence |
|---|---|---|
| next | 16.4.6 | MIT |
| react, react-dom | 19.3.1 | MIT |
| tailwindcss, @tailwindcss/postcss | 4.3.5 | MIT |
| zod | 4.6.7 | MIT |
| lucide-react | 1.79.0 | ISC |
| @citation-js/core, @citation-js/plugin-csl | 0.9.0 | MIT |
| citeproc (dependency of plugin-csl) | 2.4.63 | CPAL-1.0 OR AGPL-1.0 |
| @google/genai | 3.6.1 | Apache-2.0 |
| @fontsource-variable/literata | 5.3.0 | OFL-1.1 |
| @fontsource-variable/atkinson-hyperlegible-next | 5.3.0 | OFL-1.1 |
| typescript | 6.0.3 | Apache-2.0 |
| vitest | 5.1.1 | MIT |
| @playwright/test | 1.65.1 | Apache-2.0 |
| eslint, eslint-config-next | 9.39.5, 16.4.6 | MIT |
| pptxgenjs (deck generator only) | 4.0.1 | MIT |

Node 22.12 or later is required (plugin-csl and vitest). Fonts are self-hosted from the npm packages, so nothing is fetched from a font CDN at build or run time.

## Design decisions that depart from the build prompt's defaults

| Decision | Why |
|---|---|
| No shadcn CLI or Radix; a handful of local primitives and native `<dialog>` | Fewer dependencies and install steps for a solo build. The platform dialog provides focus trapping, Escape and backdrop. |
| OpenAlex only as a DOI abstract fallback | It adds abstracts Crossref lacks at no cost; search through it would spend a small daily budget for little gain. |
| Approvals derived from fingerprints | No code path can leave an approval standing after the content changes. |
| Identity check as a pure function over a stored registry snapshot | The comparison works offline and in the citation trap, with the snapshot's retrieval date shown. |
| The model returns `evidenceId` only | Source and reference text can then only come from stored metadata. |
| Project = collection | Tags, notes and filters organise sources; nested folders were not needed for one journey. |
| APA formatting on the server | Keeps the CSL engine out of the browser bundle. |
| Browser tests run in the installed Edge | No browser download; set `PW_CHANNEL=chromium` to use Playwright's own. |

## Tools and skills used to build

Claude Code with Claude Fable 5.2. Skills used: `frontend-design` (design pass) and Anthropic's `pptx` skill (deck, by a sub-agent). The three organiser PDFs were read directly. No skill or script was installed from an outside repository.
