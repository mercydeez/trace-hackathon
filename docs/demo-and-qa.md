# Demo script and Q&A preparation

Eight minutes of demo, two minutes of questions, strictly timed (Rules p. 2). Present from the submitted live link; use the laptop only if that was declared at submission.

## Before you walk up

1. Open the site. In the sidebar choose **Erase all TRACE data here**, so the welcome screen shows.
2. Check the sidebar line "Live AI drafting": **On** means the live path is available; **Not configured** means use the labelled sample and say so.
3. Have a second tab ready with the same site in case the first misbehaves.
4. Network down? Everything except live search and live AI still works: the demo project, the sample brief, the trap, the checks and the export are all local.

## The eight minutes

| Time | Do | Say |
|---|---|---|
| 0:00 | Welcome screen. | "AI can give a real author the wrong paper, or quote a sentence that isn't in the source. Most checkers stop at 'does this DOI exist?'. Our point is one sentence: a real DOI does not make a claim supported. TRACE checks the two separately, and the student signs off." |
| 0:45 | **Open the demo project.** Point at the question and the four numbered steps. | "One page, four steps, and the status under each step is computed, not decorative." |
| 1:00 | Plan step. Show the terms; note "suggested by a simple rule, not by AI". Press **Approve plan**. | "First checkpoint. Search is locked until I approve the plan, and if I change the question later, everything downstream asks for approval again." |
| 1:15 | Discover. Press **Search Crossref**. Point at "Abstract available" versus "No abstract in Crossref". Save one result. | "This is a live registry search. We show whether there is any text to work from, because no source text means no AI summary." |
| 1:50 | Still in Discover: **Add a source you already have → By DOI**. Paste `10.1126/science.1152408`. | "Already in the library, so nothing is added: duplicates are blocked by DOI." (Optional: type a made-up DOI to show "Not found in Crossref. This does not show the paper is fake.") |
| 2:15 | Library. Open "Test-Enhanced Learning". Show the APA reference, the identity table, add a tag, tick **Use in the evidence set**. Tick three more abstracts. | "References are built from registry metadata by a citation formatter, never written by AI. Each source shows whether its details match Crossref and what text we actually hold: here, the abstract only." |
| 3:00 | **Review evidence set.** Open "Show exactly what would be sent". Press **Approve evidence set**. | "Second checkpoint. This is the complete request. My notes and the rest of my library are not sent." |
| 3:15 | **Draft with AI** if live AI is on; otherwise **Load sample brief (not live AI)**. | Live: "One call, at most five claims, each tied to an ID from my approved set." Sample: "No key on this server, so this is our sample brief. It is labelled as a sample here, on every claim, and in the export, and it goes through the same checks." |
| 3:40 | Click **Inspect evidence** on claim 1. Point at the marked passage, then the five checks. | "The inspector shows the exact words in the stored abstract. Five separate questions: is the reference what it says it is, what text do we hold, is the quote really there, what does the AI think, and what did I decide. No single 'verified' badge." |
| 4:15 | Approve the claims. Scroll to Review and export. **Download reviewed brief** and open it. | "Third and fourth checkpoints. The export has the brief, APA 7 references, where each excerpt came from, limitations, and an AI-use disclosure generated from what actually happened." |
| 5:00 | In the inspector, open **Edit this claim** and change a word. | "I edited an approved claim. The approval is now stale and the reviewed export is closed again. Only a file marked DRAFT can leave." |
| 5:15 | Sidebar: **Run the citation trap.** Read the red banner aloud. | "This is a labelled test copy with two planted errors. Nothing is hard-coded: it is ordinary project data going through the same validators." |
| 5:40 | Inspect claim 1. Point at "1 month" in the claim and the amber-marked "…or 1 week later" in the source. | "**The paper is real. That does not make this claim supported.** The quote says one month; the abstract says one week." |
| 6:10 | Select the real sentence in the source text, press **Use selected text as the excerpt**, correct the claim wording, approve. | "I fix it from the real passage. One blocker gone, one left." |
| 6:30 | Inspect claim 2. Show the identity table: year and first author disagree. Press **Use Crossref's year**; still blocked. Press **Use Crossref's first author**. | "Real DOI, wrong details. TRACE shows the disagreement and does not repair it silently. Fixing the year alone is not enough: each issue clears only when it is actually resolved." |
| 7:00 | Reviewed export is enabled again. | "Now the gate opens." |
| 7:00–7:30 | Day-of change (fill in on the day). | "This afternoon we were asked for ___. We changed ___, in one place, and the design from our deck is unchanged." |
| 7:30 | Close on limits. | "What we don't claim: we read abstracts, not full papers; a text match is not proof the paper is right; the AI's support rating can be wrong; and this is not plagiarism detection. The student stays responsible, and the tool says so." |

If time is short, drop 1:50 and 5:00. Never drop 5:15–7:00.

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
