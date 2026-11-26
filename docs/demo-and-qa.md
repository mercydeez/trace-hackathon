# Demo script and Q&A preparation

Eight minutes of demo, two minutes of questions, strictly timed (Rules p. 2). Present from the submitted live link; use the laptop only if that was declared at submission.

## Before you walk up

1. Open the submitted URL in a fresh browser profile so the welcome screen shows.
2. Run the live smoke test before presenting. Use the labelled sample if live drafting is unavailable.
3. Prepare a local production server on the presentation laptop. Its stored fixtures, citation formatting and export work without internet access while that server is running.

## Judging walkthrough: the five requirements (about 4 minutes)

Use this when a judge asks to see the requirements one by one, or as the opening half of the demo. Start on the welcome screen of the live site in a fresh browser.

| Step | Do | Say |
|---|---|---|
| 1 | **Check a reference**. Enter DOI `10.1234/trace-smoke-test-no-such-doi` and press **Check DOI**. | "An invented DOI: *Not found in Crossref*, and there is no add button. Not found isn't proof it's fake, so we don't call it fake. We just don't trust it." |
| 2 | **Check a list** tab. Paste `Imaginary, A. (2025). The violet stapler theorem for interstellar note-taking.` and press **Check 1 reference**. | "A made-up citation with no DOI. Crossref's closest record doesn't match, so *No close match*, and nothing can be added." |
| 3 | **By DOI** tab. DOI `10.1126/science.1152408`, Year `2025`, **Check DOI**. Point at the library count in the sidebar. | "A real paper with the wrong year. *Details disagree with Crossref*, field by field, and only the first author's surname is compared, as the screen says. Checking never changes the library: still 7 sources." |
| 4 | Open **What the labels mean**. | "Every reference and claim carries one of these labels. Each is evidence about one check, never a general 'verified'." |
| 5 | Plan → **Approve plan** → Library. Tick **Use in the evidence set** on three abstracts → **Review evidence set** → **Approve evidence set**. | "The student decides what the AI may see." |
| 6 | **Draft with AI**, or **Load sample brief (not live AI)** if Google is busy. Inspect claim 1, then **Approve**. | "Separate labels: who wrote it, whether the reference matches Crossref, whether the quote is in the stored text, and the student's decision." |
| 7 | Library → **Copy APA 7 reference list** (or Download). | "The whole library as an APA 7 list, formatted by Citation.js from Crossref's records. Unverified references are left out and counted." |
| 8 | Brief → **Copy AI-use statement**. Paste it into a text box or email. | "A paste-ready statement built from what actually happened. It says 'reviewed and approved' only once every claim is approved." |

| 9 | Brief → **Verification report** (beside the export buttons). Open the file. | "One page from the same checks as the export gate: each reference and the registry that confirmed it, each quote check, each decision, and whether the reviewed export is allowed or blocked." |
| 10 | Click **Home** (or the TRACE logo), then **Resume project**. | "Home is always one click away, and resuming returns to the same project and step. Nothing is lost: the work is saved in this browser." |

If the network is slow, steps 1–3 can fail as **Could not check**: say "a timeout is no evidence either way" and continue with step 4. Steps 4–10 work with the stored demo data.

**If a judge asks about a DOI Crossref doesn't have:** check `10.5061/dryad.8515` (a Dryad dataset). "Crossref is asked first. When it has no record, TRACE asks DataCite and labels the result *Found in DataCite*. If DataCite is down, that's *Could not check*, never *Not found*."

## The eight minutes

| Time | Do | Say |
|---|---|---|
| 0:00 | Point at the welcome comparison and click **Run the citation trap**. | "One changed word can make a citation misleading. This labelled test copy uses the same checks as a normal project." |
| 0:30 | Inspect claim 1. Replace the quote using the real passage. Show the claim still says “one month.” Correct the claim and approve it. | "TRACE found the corrected quote. The claim still has a timing error, so I need to correct and approve it too." |
| 1:30 | Inspect claim 2. Use Crossref's year and first author, then download the reviewed test copy. | "The DOI resolves. The cited year and author differ from the registry. Now I've fixed both, and the reviewed test copy can be downloaded." |
| 2:15 | In **Projects and tools**, open the normal demo. Approve the plan and search Crossref. Save a result if search is available. | "This is the normal student workflow. I choose the search terms and see whether each source has text I can use." |
| 3:15 | In Library, show a reference, add a tag, and choose four passages. | "I can organise the library and see which record and passage support each citation." |
| 4:15 | Open **Review evidence set**, preview the model request, approve the set and draft. | "I approve the passages before drafting. We can use live Gemini or the clearly labelled sample, and both go through the same checks." |
| 5:15 | Inspect and approve the remaining claims. Open the reviewed file and show the provenance and AI-use disclosure. | "The file shows the words we kept, where they came from and what TRACE’s AI did." |
| 6:20 | If time allows, edit an approved claim to make the approval stale. | "When I edit the claim, TRACE asks me to approve it again before I can export it as reviewed." |
| 7:00 | Show the day-of change if required. | "We were asked for ___. Here's where it changes the workflow." |
| 7:30 | Close on limits. | "This demo uses abstracts. Text matching checks the stored words. The student interprets the evidence and approves the brief." |

If time is short, skip the stale-approval example and open the test export you downloaded at 1:30.

For the labelled sample, select **Test-Enhanced Learning**, **The Critical Importance of Retrieval for Learning**, **Rethinking the Use of Tests**, and **Improving Students’ Learning With Effective Learning Techniques**. Keep this list beside the demo laptop.

### Optional beats if a judge asks for more (about 30 seconds each)

- **Check a reference list** (Discover → Check a list): paste a reference list with one bare DOI and one wrong year. "A DOI that resolves is reported as 'nothing to compare', never as confirmed. The wrong year is named field by field."
- **Retraction**: add DOI `10.1016/S0140-6736(97)11096-0` by DOI. "Its details match Crossref, and it is retracted. Two different questions, two different labels, and the export is blocked."
- **Write and cite** (Brief → Your text): insert a citation from the picker, then type one from memory such as "(Smith & Jones, 2020)". "Every in-text citation is checked against the project as you type. An invented one blocks the reviewed export."
- **Rules in force** (Plan step): switch AI drafting off. "This is where an assignment's AI policy goes. The draft button, the server and the export gate all enforce it, and the disclosure states it."

## Two minutes of questions

**"A DOI resolves. Isn't that verified?"**
It tells you the reference exists and whether the cited details match the registry. It says nothing about whether the claim is in the paper. That is why identity and excerpt integrity are separate checks, and why the trap uses a real DOI.

**"You only read abstracts. Isn't that weak?"**
Yes, and we label it on every claim and in the export. It is a declared scope: abstracts are what free registries reliably provide. A student can paste a passage from the full text; it is then labelled as pasted and not checked against the publication. We would rather be narrow and honest than broad and wrong.

**"Why not just use Zotero or Elicit?"**
They are better products. Zotero already looks up DOIs and Elicit already links claims to quotes. We don't claim those as new. What we show is a small, inspectable workflow: the quote check is deterministic and visible, five statuses stay separate, approvals expire when content changes, and one gate enforces it at export.

**"What if the AI or the internet is down?"**
Search shows "Could not check", never "not found". Without AI you can write claims by hand and link them to passages; the checks and export work the same. The sample brief is a separate, labelled action. A failed call adds nothing and substitutes nothing.

**"What does the student control?"**
The plan, which passages can be used, every claim individually, every correction to reference details, and the export. There is no "approve all" and nothing is approved automatically.

**"How do you stop the model inventing a reference?"**
It has no way to write one. Its answer may contain only an evidence ID from the approved set, a claim, an excerpt and limitations. Any other field causes rejection. References are formatted from stored registry metadata by Citation.js.

**"What about instructions hidden in a paper's text?"**
Passages are sent as delimited data with an instruction to treat them as content, the model has no tools, and whatever it returns must still pass the same validation. An answer that obeyed an injected instruction would cite an ID or field we reject.

**"Is the support rating reliable?"**
No, and it is labelled as the AI's suggestion that can be wrong. TRACE never computes or scores support itself.

**"Where is the data stored? Privacy?"**
In the browser's local storage. No accounts or tracking. Search terms go to Crossref; the question and approved passages go to the AI provider only when the student asks for a draft. On Gemini's free tier Google may use that content, which the app states.

**"Is the audit trail tamper-proof?"**
No. It is a local convenience history and we say so.

**"Another team checks DOIs against four registries. Why only Crossref?"**
Breadth is useful, but a DOI that resolves says nothing about whether it is the paper you meant. We compare the details you cite with the record, and we never call a bare DOI "confirmed". Retraction notices come through Crossref from Retraction Watch.

**"What changed today?"**
Answer from the before/after note in `docs/day-of-playbook.md`.

**"Who built what?"**
Answer truthfully from `docs/contributions.md`.

## AI quiz: revision topics

Team quiz at 3:15 PM, five minutes, one answer per question (Rules p. 2). The questions are not known; these are sensible areas to refresh, not predictions.

- What a large language model is; tokens, context window, training versus inference.
- Hallucination: why models produce fluent but false statements, including invented citations.
- Retrieval-augmented generation and grounding; why grounding reduces but does not remove errors.
- Prompt injection and why retrieved text must be treated as data.
- Structured output and schema validation.
- Human-in-the-loop, AI agents versus fixed pipelines.
- Bias in training data and in search results; privacy and data-use terms of AI services.
- Academic integrity with AI: disclosure, authorship, accountability.
- Scholarly infrastructure: DOI, Crossref, OpenAlex, what a reference manager does, APA 7 basics.
- Current mainstream AI tools and what each is mainly used for.
