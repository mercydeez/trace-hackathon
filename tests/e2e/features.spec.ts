import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { demoWithApprovedEvidence, mockStatus, openDemo, openTools, reply, shot, stepButton, TEST_WORK } from "./helpers";

test("check a reference list: a bare DOI is never 'confirmed', a wrong year is caught, a search hit is only a possible match", async ({ page }) => {
  await mockStatus(page, false);
  // TEST FIXTURES: the registry answers come from the labelled synthetic record in helpers.ts.
  await page.route("**/api/doi**", (r) => r.fulfill(reply.ok(TEST_WORK)));
  await page.route("**/api/search**", (r) => r.fulfill(reply.ok({ items: [TEST_WORK], total: 1, query: "q" })));
  await openDemo(page);
  await page.getByRole("button", { name: "Approve plan" }).click();
  await stepButton(page, /Discover/).click();
  await page.getByRole("tab", { name: "Check a list" }).click();

  const year = TEST_WORK.record.year;
  await page.getByLabel("Reference list").fill(
    [
      `https://doi.org/${TEST_WORK.doi}`,
      "",
      `Okafor, A., & Lindqvist, B. (${year - 3}). ${TEST_WORK.record.title}. Journal of Test Fixtures, 3(2), 10-20. https://doi.org/${TEST_WORK.doi}`,
      "",
      `Okafor, A., & Lindqvist, B. (${year}). ${TEST_WORK.record.title}. Journal of Test Fixtures, 3(2), 10-20.`,
      "",
      // A fabricated reference with no DOI: the search's closest record is unrelated.
      "Imaginary, A. (2025). The violet stapler theorem for interstellar note-taking.",
    ].join("\n"),
  );
  await page.getByRole("button", { name: /^Check 4 references/ }).click();
  const results = page.getByRole("list", { name: "Checked references" });
  const row = (n: number) => results.locator(":scope > li").nth(n);
  await expect(results.locator(":scope > li")).toHaveCount(4);
  await expect(row(0)).toContainText("DOI found, nothing to compare");
  await expect(row(0).getByRole("button", { name: "Add to library" })).toBeVisible();
  await expect(row(1)).toContainText("Details disagree with Crossref");
  await expect(row(1)).toContainText(`Year: given “${year - 3}”`);
  await expect(row(1).getByRole("button", { name: "Add to library" })).toHaveCount(0);
  await expect(row(2)).toContainText("Possible match, check it");
  await expect(row(2).getByRole("button", { name: "This is the paper: add Crossref’s record" })).toBeVisible();
  // The fabricated reference: no close match, and nothing can be added from it.
  await expect(row(3)).toContainText("No close match in Crossref");
  await expect(row(3).getByRole("button")).toHaveCount(0);
  await expect(row(3)).toContainText("Nothing can be added from this result.");
  await expect(results).not.toContainText("confirmed");
  await shot(page, "12-check-a-list");

  // A wrong year is added only by explicitly taking Crossref's details.
  await row(1).getByRole("button", { name: "Use Crossref’s details and add" }).click();
  await expect(row(1)).toContainText("In your library");

  // Editing the list hides results that no longer belong to it.
  await page.getByLabel("Reference list").fill("Something else entirely (2020).");
  await expect(results).toHaveCount(0);
});

test("Library APA 7 list and the copyable AI-use statement", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockStatus(page, false);
  await demoWithApprovedEvidence(page);

  // The AI-use statement follows what was recorded: sample claims, none approved yet.
  const statement = page.getByTestId("ai-use-statement");
  await page.getByRole("button", { name: "Load sample brief (not live AI)" }).click();
  await expect(statement).toContainText("labelled SAMPLE brief");
  await expect(statement).toContainText("I have approved 0 of");
  await page.getByRole("button", { name: "Copy AI-use statement" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("labelled SAMPLE brief");
  expect(copied).toContain("References were formatted from registry records by Citation.js");

  // The whole library as an APA 7 list, before or without any claim.
  await stepButton(page, /Library and evidence/).click();
  const list = page.getByRole("list", { name: "APA 7 reference list" });
  await expect(list.locator("li")).toHaveCount(7);
  await page.getByRole("button", { name: "Copy APA 7 reference list" }).click();
  // The system clipboard may turn line breaks into CRLF (Windows); compare the text, not the line endings.
  const apa = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
  expect(apa).toContain("Roediger, H. L., & Karpicke, J. D. (2006a).");
  expect(apa).toContain("https://doi.org/10.1126/science.1152408");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download APA 7 reference list" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^references-apa7-\d{4}-\d{2}-\d{2}\.txt$/);
  const file = (await readFile((await download.path())!, "utf8")).replace(/\r\n/g, "\n");
  expect(file.trim()).toBe(apa.trim());
  await shot(page, "15-apa-list");
});

test("rules: switching AI drafting off disables the draft button and is stated in the export", async ({ page }) => {
  await mockStatus(page, true);
  await demoWithApprovedEvidence(page);
  await expect(page.getByRole("button", { name: "Draft with AI" })).toBeEnabled();

  await stepButton(page, /^Plan/).click();
  await page.getByLabel("AI drafting").selectOption("off");
  // A rule change asks for the plan to be approved again.
  await expect(page.getByRole("button", { name: "Approve plan" })).toBeEnabled();
  await page.getByRole("button", { name: "Approve plan" }).click();

  await stepButton(page, /Brief and export/).click();
  await page.getByRole("button", { name: "Approve evidence set" }).click();
  await expect(page.getByRole("button", { name: "Draft with AI" })).toBeDisabled();
  await expect(page.getByText("AI drafting is switched off in this project's rules")).toBeVisible();

  await page.getByRole("button", { name: "Load sample brief (not live AI)" }).click();
  await page.getByRole("button", { name: "Preview the file" }).click();
  await expect(page.getByLabel("Preview of the exported file")).toContainText("Rules in force for this project: AI drafting switched off");
});

test("numbers check: repairing only the quotation in the trap still leaves the claim's 'one month' flagged", async ({ page }) => {
  await mockStatus(page, false);
  await openDemo(page);
  await openTools(page);
  await page.getByRole("button", { name: "Run the citation trap" }).click();
  await page.getByRole("button", { name: "Inspect claim 1" }).click();
  const inspector = page.getByRole("complementary", { name: "Claim Inspector" });
  await inspector.getByLabel("Excerpt that supports it").fill("Students then took a final retention test 5 min, 2 days, or 1 week later.");
  await expect(inspector.getByText("Excerpt found in stored text").first()).toBeVisible();
  await expect(inspector.getByText("Details in the claim that the excerpt does not contain")).toBeVisible();
  await expect(inspector.getByText('The claim says "one month", but the excerpt does not mention one month.', { exact: true })).toBeVisible();
  await expect(inspector.getByRole("button", { name: "Approve claim" })).toBeDisabled();
  await shot(page, "13-numbers-check");

  await inspector.getByLabel("Claim", { exact: true }).fill("Students were given a final test up to one week later.");
  await expect(inspector.getByText("Every number and negation in the claim also appears in the excerpt.")).toBeVisible();
  await expect(inspector.getByRole("button", { name: "Approve claim" })).toBeEnabled();
});

test("writing space: insert a citation, catch an invented one, and export the text with its references", async ({ page }) => {
  await mockStatus(page, false);
  await demoWithApprovedEvidence(page);
  await page.getByRole("button", { name: "Load sample brief (not live AI)" }).click();
  for (const n of [1, 2, 3, 4, 5]) await page.getByRole("button", { name: `Approve claim ${n}` }).click();

  const text = page.getByLabel("Your text", { exact: true });
  await text.fill("Self-testing beats rereading for long-term retention");
  await page.getByLabel("Source to cite").selectOption("src_demo_2"); // Karpicke & Roediger (2008), a real demo source
  await page.getByRole("button", { name: "Insert citation" }).click();
  await expect(text).toHaveValue("Self-testing beats rereading for long-term retention (Karpicke & Roediger, 2008)");

  // A citation the student typed from memory, with no source behind it.
  await text.press("End");
  await text.pressSequentially(". Others agree (Smith & Jones, 2020).");
  const checks = page.getByRole("list", { name: "Citations in your text" });
  await expect(checks).toContainText("Not a source in this project");
  await expect(checks).toContainText("Matches a source in this project");
  await expect(page.getByRole("button", { name: "Download reviewed brief" })).toBeDisabled();
  await expect(page.getByText('Your text cites "Smith & Jones, 2020", which is not a source in this project.').first()).toBeVisible();
  await shot(page, "14-writing-space");

  await text.fill("Self-testing beats rereading for long-term retention (Karpicke & Roediger, 2008). A meta-analysis agrees (Rowland, 2014).");
  await expect(checks).not.toContainText("Not a source in this project");
  const reviewed = page.getByRole("button", { name: "Download reviewed brief" });
  await expect(reviewed).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), reviewed.click()]);
  const md = await readFile(await download.path(), "utf8");
  expect(md).toContain("## Your text");
  expect(md).toContain("A meta-analysis agrees (Rowland, 2014).");
  expect(md).toContain("Rowland, C. A. (2014).");
  expect(md).toContain("TRACE did not generate any of it");
});
test("welcome: 'Check a reference' opens straight at a read-only DOI check", async ({ page }) => {
  await mockStatus(page, false);
  await page.route("**/api/doi**", (r) => r.fulfill(reply.fail(404, "not_found", "Crossref has no record for this DOI.")));
  await page.goto("/");
  await page.getByRole("button", { name: "Check a reference" }).click();
  await page.getByLabel("DOI", { exact: true }).fill("10.1234/trace-smoke-test-no-such-doi");
  await page.getByRole("button", { name: "Check DOI" }).click();
  await expect(page.getByText("Not found in Crossref. This does not show the paper is fake")).toBeVisible();
  await expect(stepButton(page, /Library and evidence/)).toContainText("7 sources");
});