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
    ].join("\n"),
  );
  await page.getByRole("button", { name: /^Check 3 references/ }).click();
  const results = page.getByRole("list", { name: "Checked references" });
  await expect(results.locator(":scope > li")).toHaveCount(3);
  await expect(results.locator(":scope > li").nth(0)).toContainText("DOI found, nothing to compare");
  await expect(results.locator(":scope > li").nth(1)).toContainText("Details disagree with Crossref");
  await expect(results.locator(":scope > li").nth(1)).toContainText(`Year: given “${year - 3}”`);
  await expect(results.locator(":scope > li").nth(2)).toContainText("Possible match, check it");
  await expect(results).not.toContainText("confirmed");
  await shot(page, "12-check-a-list");

  await results.locator(":scope > li").nth(1).getByRole("button", { name: "Add to library" }).click();
  await expect(results.locator(":scope > li").nth(1)).toContainText("In your library");
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
