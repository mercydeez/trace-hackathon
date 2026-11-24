import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { demoWithApprovedEvidence, mockSearch, mockStatus, openDemo, shot, stepButton, tickEvidenceOf } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockStatus(page, false);
});

test("main journey: plan, discover, save, organise, reload, approve evidence, brief, inspect, export", async ({ page }) => {
  await mockSearch(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Research you can defend." })).toBeVisible();
  await shot(page, "01-welcome");

  await page.getByRole("button", { name: "Open the demo project" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("retrieval practice");
  await shot(page, "02-plan");

  // Searching is held back until the plan is approved.
  await stepButton(page, /Discover/).click();
  await expect(page.getByRole("button", { name: "Search Crossref", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Go to the plan" }).click();
  await page.getByRole("button", { name: "Approve plan" }).click();
  await expect(page.getByRole("heading", { name: "Your library" })).toBeVisible();

  // Discover and save.
  await stepButton(page, /Discover/).click();
  await page.getByRole("button", { name: "Search Crossref", exact: true }).click();
  await expect(page.getByText("Test fixture record: quizzing in a classroom")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("In your library")).toBeVisible();
  await shot(page, "03-discover");

  // Organise: tag, note, choose evidence.
  await stepButton(page, /Library and evidence/).click();
  await expect(page.getByText("8 of 8 sources shown")).toBeVisible();
  await page.getByRole("button", { name: /^Test-Enhanced Learning/ }).click();
  await page.getByLabel("Add a tag to Test-Enhanced Learning").fill("Key-Paper");
  await page.getByRole("button", { name: "Add tag" }).click();
  await page.getByLabel("Note", { exact: true }).fill("Start here: the classic experiment.");
  await page.getByLabel("Note", { exact: true }).blur();
  await page.getByLabel("Use in the evidence set").check();
  await expect(page.getByText("Karpicke, J. D. (2006). Test-Enhanced Learning.")).toBeVisible();
  await shot(page, "04-library");

  // Reload: everything is still there.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your library" })).toBeVisible();
  await expect(page.getByText("8 of 8 sources shown")).toBeVisible();
  await page.getByRole("button", { name: /^Test-Enhanced Learning/ }).click();
  await expect(page.getByRole("listitem").filter({ hasText: /^key-paper/ })).toBeVisible();
  await expect(page.getByLabel("Note", { exact: true })).toHaveValue("Start here: the classic experiment.");
  await expect(page.getByLabel("Use in the evidence set")).toBeChecked();

  // Filter by tag.
  await page.getByLabel("Tag", { exact: true }).selectOption("key-paper");
  await expect(page.getByText("1 of 8 sources shown")).toBeVisible();
  await page.getByLabel("Tag", { exact: true }).selectOption("");

  for (const title of [/^The Critical Importance of Retrieval/, /^Rethinking the Use of Tests/, /^Improving Students/]) {
    await tickEvidenceOf(page, title);
  }
  await page.getByRole("button", { name: "Review evidence set" }).click();

  // Approve the evidence set, after seeing exactly what would be sent.
  await page.getByText("Show exactly what would be sent to the AI model").click();
  await expect(page.getByText("<<<EVIDENCE evidenceId=ev_demo_1")).toBeVisible();
  await page.getByRole("button", { name: "Approve evidence set" }).click();

  // No key configured: live drafting is unavailable and says so. The labelled sample is a separate, explicit action.
  await expect(page.getByRole("button", { name: "Draft with AI" })).toBeDisabled();
  await page.getByRole("button", { name: "Load sample brief (not live AI)" }).click();
  await expect(page.getByText("5 claims added from the sample brief")).toBeVisible();
  await expect(page.getByText("Sample, not live AI")).toHaveCount(5);

  // Inspect a claim against its passage.
  await page.getByRole("button", { name: "Inspect claim 1" }).click();
  const inspector = page.getByRole("complementary", { name: "Claim Inspector" });
  await expect(inspector.getByText("Excerpt found in stored text").first()).toBeVisible();
  await expect(inspector.locator("mark.match")).toContainText("prior testing produced substantially greater retention than studying");
  await expect(inspector.getByText("Details match Crossref", { exact: true })).toBeVisible();
  await expect(inspector.getByText("Abstract only", { exact: true })).toBeVisible();
  await shot(page, "05-claim-inspector");

  // Reviewed export is blocked until every claim has a decision.
  const reviewed = page.getByRole("button", { name: "Download reviewed brief" });
  await expect(reviewed).toBeDisabled();
  await inspector.getByRole("button", { name: "Approve claim" }).click();
  for (const n of [2, 3, 4, 5]) await page.getByRole("button", { name: `Approve claim ${n}` }).click();
  await expect(reviewed).toBeEnabled();
  await reviewed.scrollIntoViewIfNeeded();
  await shot(page, "06-review-and-export");

  const [download] = await Promise.all([page.waitForEvent("download"), reviewed.click()]);
  expect(download.suggestedFilename()).toMatch(/^trace-brief-.*-reviewed\.md$/);
  const md = await readFile(await download.path(), "utf8");
  expect(md).not.toContain("DRAFT");
  expect(md).toContain("## References (APA 7)");
  expect(md).toContain("Roediger, H. L., & Karpicke, J. D. (2006). Test-Enhanced Learning. *Psychological Science*");
  expect(md).toContain("SAMPLE output, not a live AI call");
  expect(md).toContain("## AI-use disclosure");
  expect(md).toContain("not the result of a live AI call");
  expect(md).toContain("abstract only, from Crossref");

  // Editing an approved claim makes the approval stale and closes the gate again.
  await inspector.getByText("Edit this claim").click();
  await inspector.getByLabel("Claim", { exact: true }).fill("A quietly reworded claim.");
  await expect(inspector.getByText("Changed since you approved").first()).toBeVisible();
  await expect(reviewed).toBeDisabled();
  await expect(page.getByText("Claim 1: changed after you approved it.")).toBeVisible();

  // A draft can still be downloaded, and it says it is a draft.
  const [draft] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download draft, marked as not reviewed" }).click()]);
  expect(draft.suggestedFilename()).toMatch(/-DRAFT\.md$/);
  expect(await readFile(await draft.path(), "utf8")).toMatch(/^> \*\*DRAFT — NOT REVIEWED\.\*\*/);
});

test("citation trap: real DOI and real source, altered details and quotation are caught and clear one by one", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Run the citation trap" }).click();
  await expect(page.getByText("Citation-trap test copy.")).toBeVisible();
  await expect(page.getByText("3 points to resolve before this can be exported as reviewed")).toBeVisible();
  const reviewed = page.getByRole("button", { name: "Download reviewed brief" });
  await expect(reviewed).toBeDisabled();

  // The quotation: the source is real, the words are not in it.
  await page.getByRole("button", { name: "Inspect claim 1" }).click();
  const inspector = page.getByRole("complementary", { name: "Claim Inspector" });
  await expect(inspector.getByText("Excerpt not in stored text").first()).toBeVisible();
  await expect(inspector.locator("mark.near")).toContainText("final retention test 5 min, 2 days, or 1");
  await expect(inspector.getByText("deliberately changed")).toBeVisible();
  await expect(inspector.getByRole("button", { name: "Approve claim" })).toBeDisabled();
  await shot(page, "07-trap-quote-mismatch");

  // Correct the quotation from the real passage: select the words in the stored text and use them.
  await inspector.getByLabel("Stored source text").evaluate((el, sentence) => {
    const start = (el.textContent ?? "").indexOf(sentence);
    const end = start + sentence.length;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let pos = 0;
    let started = false;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const len = node.textContent?.length ?? 0;
      if (!started && start < pos + len) {
        range.setStart(node, start - pos);
        started = true;
      }
      if (started && end <= pos + len) {
        range.setEnd(node, end - pos);
        break;
      }
      pos += len;
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  }, "Students then took a final retention test 5 min, 2 days, or 1 week later.");
  await inspector.getByRole("button", { name: "Use selected text as the excerpt" }).click();
  await expect(inspector.getByLabel("Excerpt that supports it")).toHaveValue("Students then took a final retention test 5 min, 2 days, or 1 week later.");
  await inspector.getByLabel("Claim", { exact: true }).fill("Students who took practice recall tests were given a final test up to one week later.");
  await expect(inspector.getByText("Excerpt found in stored text").first()).toBeVisible();
  await inspector.getByRole("button", { name: "Approve claim" }).click();
  await expect(page.getByText("1 point to resolve before this can be exported as reviewed")).toBeVisible();
  await expect(reviewed).toBeDisabled();

  // The reference: the DOI is real, the cited details are not what Crossref records.
  await page.getByRole("button", { name: "Inspect claim 2" }).click();
  await expect(inspector.getByText("Details disagree with Crossref", { exact: true })).toBeVisible();
  await shot(page, "08-trap-identity-mismatch");
  await inspector.getByRole("button", { name: "Use Crossref’s year" }).click();
  await expect(inspector.getByText("Details disagree with Crossref", { exact: true })).toBeVisible();
  await expect(reviewed).toBeDisabled();
  await inspector.getByRole("button", { name: "Use Crossref’s first author" }).click();
  await expect(inspector.getByText("Details match Crossref", { exact: true })).toBeVisible();
  await expect(reviewed).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent("download"), reviewed.click()]);
  expect(download.suggestedFilename()).toMatch(/^trace-TEST-COPY-/);
  expect(await readFile(await download.path(), "utf8")).toContain("CITATION-TRAP TEST COPY");
});

test("live AI path (provider mocked): bad output is rejected in view, and a failed call adds nothing", async ({ page }) => {
  await mockStatus(page, true);
  // TEST FIXTURE standing in for a model answer: one valid claim, one unknown ID, one with a forbidden field.
  const answer = {
    model: "mock-model (test fixture)",
    raw: {
      claims: [
        { text: "On delayed tests, prior testing gave greater retention than studying.", kind: "evidence", evidenceId: "ev_demo_1", excerpt: "on the delayed tests, prior testing produced substantially greater retention than studying", support: "supports", limitations: "Abstract only." },
        { text: "A claim citing a passage that was never approved.", kind: "evidence", evidenceId: "ev_invented_9", excerpt: "something plausible", support: "supports", limitations: "" },
        { text: "A claim that smuggles in a reference.", kind: "evidence", evidenceId: "ev_demo_1", excerpt: "Testing is a powerful means of improving learning", support: "supports", limitations: "", doi: "10.9999/fabricated" },
      ],
    },
  };
  await page.route("**/api/draft", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: answer }) }));
  await demoWithApprovedEvidence(page);

  await page.getByRole("button", { name: "Draft with AI" }).click();
  await expect(page.getByText("1 claim added, each waiting for your decision. 2 items were rejected and not added:")).toBeVisible();
  await expect(page.getByText("which is not in the approved evidence set")).toBeVisible();
  await expect(page.getByText("fields the model may not supply: doi")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Inspect claim/ })).toHaveCount(1);
  await expect(page.getByText("AI draft", { exact: true })).toBeVisible();
  await shot(page, "09-ai-output-rejected");

  // The provider now fails. Nothing is added, nothing is substituted, and the student chooses what to do.
  await page.unroute("**/api/draft");
  await page.route("**/api/draft", (r) => r.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ ok: false, kind: "rate_limited", message: "The AI provider's rate limit or free quota was reached." }) }));
  await page.getByRole("button", { name: "Draft with AI" }).click();
  await expect(page.getByText("The AI draft did not happen.")).toBeVisible();
  await expect(page.getByText("Nothing was added to your brief.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try the AI draft again" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Inspect claim/ })).toHaveCount(1);
  await expect(page.getByText("Sample, not live AI")).toHaveCount(0);
});
