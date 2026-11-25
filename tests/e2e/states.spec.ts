import { expect, test } from "@playwright/test";
import { mockStatus, openDemo, reply, shot, stepButton, TEST_WORK, openTools } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockStatus(page, false);
});

async function approvedDemoOnDiscover(page: import("@playwright/test").Page) {
  await openDemo(page);
  await page.getByRole("button", { name: "Approve plan" }).click();
  await stepButton(page, /Discover/).click();
}

test("search: a timeout is 'could not check', an empty result is an empty result", async ({ page }) => {
  await page.route("**/api/search**", (r) => r.fulfill(reply.fail(504, "timeout", "The provider did not answer in time.")));
  await approvedDemoOnDiscover(page);
  await page.getByRole("button", { name: "Search Crossref", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not check" })).toContainText("Could not check. The provider did not answer in time.");
  await expect(page.getByText("Crossref returned no results")).toHaveCount(0);

  await page.unroute("**/api/search**");
  await page.route("**/api/search**", (r) => r.fulfill(reply.ok({ items: [], total: 0, query: "zzzz" })));
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Crossref returned no results")).toBeVisible();
  await expect(page.getByText("not evidence that nothing has been published")).toBeVisible();
});

test("check by DOI is read-only: duplicate, not found, could not check, wrong details, then an explicit corrected add", async ({ page }) => {
  await approvedDemoOnDiscover(page);
  const panel = page.getByRole("tabpanel");
  const doi = page.getByLabel("DOI", { exact: true });
  const check = page.getByRole("button", { name: "Check DOI" });
  const libraryCount = (n: number) => expect(stepButton(page, /Library and evidence/)).toContainText(`${n} sources`);
  await libraryCount(7);

  // A DOI already saved: the comparison is shown, nothing is saved again, the saved record is untouched.
  // TEST FIXTURE: the synthetic record from helpers.ts, given the DOI of a demo source.
  await page.route("**/api/doi**", (r) => r.fulfill(reply.ok({ ...TEST_WORK, doi: "10.1126/science.1152408" })));
  await doi.fill("https://doi.org/10.1126/SCIENCE.1152408");
  await check.click();
  await expect(panel.getByText("In your library")).toBeVisible();
  await expect(panel.getByText("Your saved record was not changed.")).toBeVisible();
  await expect(panel.getByRole("button", { name: /add/i })).toHaveCount(0);

  // Not a DOI at all.
  await doi.fill("not a doi");
  await check.click();
  await expect(page.getByText("That does not look like a DOI.")).toBeVisible();

  // Unknown to the registry: not the same as fake, and nothing to add.
  await page.unroute("**/api/doi**");
  await page.route("**/api/doi**", (r) => r.fulfill(reply.fail(404, "not_found", "Crossref has no record for this DOI.")));
  await doi.fill("10.1234/trace-smoke-test-no-such-doi");
  await check.click();
  await expect(page.getByText("Not found in Crossref. This does not show the paper is fake")).toBeVisible();
  await expect(panel.getByRole("button", { name: /add|save/i })).toHaveCount(0);

  // The registry did not answer: "could not check", never "not found", and no evidence either way.
  await page.unroute("**/api/doi**");
  await page.route("**/api/doi**", (r) => r.fulfill(reply.fail(429, "rate_limited", "The provider is rate limiting requests. Wait a moment and try again.")));
  await doi.fill("10.5555/another.one");
  await check.click();
  await expect(page.getByText("Could not check. The provider is rate limiting requests.")).toBeVisible();
  await expect(page.getByText("A timeout or usage limit is no evidence that the paper does not exist.")).toBeVisible();
  await expect(panel.getByText("Not found in Crossref")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "Try again" })).toBeVisible();

  // A citation with the wrong year: a mismatch, no trusted add, the library unchanged.
  await page.unroute("**/api/doi**");
  await page.route("**/api/doi**", (r) => r.fulfill(reply.ok(TEST_WORK)));
  await doi.fill(TEST_WORK.doi);
  await page.getByLabel("Title as given").fill(TEST_WORK.record.title);
  await page.getByLabel("First author's surname").fill("Okafor");
  await page.getByLabel("Year", { exact: true }).fill("2025");
  await check.click();
  await expect(panel.getByText("Details disagree with Crossref", { exact: true })).toBeVisible();
  await expect(panel.getByRole("status").getByText("First author's surname", { exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Add to library" })).toHaveCount(0);
  await libraryCount(7);

  // Editing the input hides the stale result until it is checked again.
  await page.getByLabel("Year", { exact: true }).fill("2024");
  await expect(panel.getByText("Details disagree with Crossref", { exact: true })).toHaveCount(0);
  await page.getByLabel("Year", { exact: true }).fill("2025");
  await check.click();

  // Only an explicit corrected selection adds it, with Crossref's details.
  await panel.getByRole("button", { name: "Use Crossref’s details and add" }).click();
  await expect(panel.getByText("with Crossref’s details")).toBeVisible();
  await libraryCount(8);
  await stepButton(page, /Library and evidence/).click();
  await expect(page.getByText("8 of 8 sources shown")).toBeVisible();
  await page.getByRole("button", { name: new RegExp(`^${TEST_WORK.record.title.slice(0, 20)}`) }).click();
  await expect(page.getByText("Details match Crossref", { exact: true }).filter({ visible: true }).last()).toBeVisible();
});

test("a hand-entered reference stays labelled Not yet verified, and a source without text is not summarised", async ({ page }) => {
  await approvedDemoOnDiscover(page);
  await page.getByRole("tab", { name: "By hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Study tips for first-year students");
  await page.getByLabel("Authors").fill("Example Learning Centre");
  await page.getByLabel("Journal, site or publisher").fill("Example University");
  await page.getByLabel("Web address").fill("https://example.org/study-tips");
  await page.getByRole("button", { name: "Add as Not yet verified" }).click();
  await expect(page.getByText("It stays labelled Not yet verified.")).toBeVisible();

  await stepButton(page, /Library and evidence/).click();
  await page.getByRole("button", { name: /^Study tips for first-year students/ }).click();
  await expect(page.getByText("Not yet verified", { exact: true }).first()).toBeVisible();
  // It is left out of the APA 7 reference list, and the exclusion is counted.
  await expect(page.getByText("1 excluded: 1 not yet verified")).toBeVisible();
  await expect(page.getByText("Entered by hand. Not checked against any registry.")).toBeVisible();
  await expect(page.getByText("This reference is missing: year.")).toBeVisible();
  await expect(page.getByText("TRACE will not summarise it or let a claim quote it")).toBeVisible();
  await expect(page.getByText("Example Learning Centre. (n.d.). Study tips for first-year students.")).toBeVisible();
});

test("damaged browser storage is set aside and the app still opens", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("trace.state", "{this is not valid json");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/");
  const notice = page.getByRole("alert").filter({ hasText: "The work saved in this browser" });
  await expect(notice).toContainText("was damaged and could not be opened");
  await expect(notice).toContainText("kept a recovery copy");
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.some((k) => k.startsWith("trace.quarantine."))).toBe(true);
  await page.getByRole("button", { name: "Open the demo project" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("retrieval practice");
});

test("erasing everything asks first, and backup then restore brings a project back", async ({ page }) => {
  await openDemo(page);
  await openTools(page);
  const [backup] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download project backup" }).click()]);
  expect(backup.suggestedFilename()).toBe("trace-project-demo-retrieval-practice.json");
  const path = await backup.path();

  await page.getByRole("button", { name: "Erase all TRACE data here" }).click();
  const dialog = page.getByRole("dialog", { name: "Erase all TRACE data in this browser?" });
  await expect(dialog).toContainText("Every project in this browser will be deleted");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("retrieval practice");

  await page.getByRole("button", { name: "Erase all TRACE data here" }).click();
  await page.getByRole("dialog", { name: "Erase all TRACE data in this browser?" }).getByRole("button", { name: "Erase everything" }).click();
  await expect(page.getByRole("heading", { name: "Research you can defend." })).toBeVisible();

  await page.getByRole("button", { name: "Open the demo project" }).click();
  await openTools(page);
  await page.getByLabel("Backup file to restore").setInputFiles(path);
  // A successful restore opens the restored project and closes the panel.
  await expect(page.getByText("Demo: retrieval practice (imported)").first()).toBeVisible();
});

test("a second tab's saved edit appears with a notice", async ({ page, context }) => {
  await openDemo(page);
  const other = await context.newPage();
  await mockStatus(other, false);
  await other.goto("/");
  const changed = "Does retrieval practice improve recall after a week?";
  await other.getByRole("textbox", { name: "Question", exact: true }).fill(changed);
  await expect(page.getByRole("textbox", { name: "Question", exact: true })).toHaveValue(changed);
  await expect(page.getByRole("status").filter({ hasText: "Another tab saved a newer version" })).toBeVisible();
});

test("keyboard: the demo is reachable and works without a mouse", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Research you can defend." })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Projects and tools" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Start a project" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Open the demo project" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("retrieval practice");
  // Focus is visible: the focused control has a drawn outline.
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
  expect(outline).not.toBe("none");
});

for (const size of [
  { name: "laptop-1366x768", width: 1366, height: 768 },
  { name: "mobile-390x844", width: 390, height: 844 },
]) {
  test(`responsive at ${size.name}: the trap and its inspector are usable`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/");
    await page.getByRole("button", { name: "Run the citation trap" }).click();
    await expect(page.getByText("Citation-trap test copy.")).toBeVisible();
    await shot(page, `10-${size.name}-brief`);

    // No sideways scrolling of the page at this width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Inspect claim 1" }).click();
    if (size.width >= 1200) {
      await expect(page.getByRole("complementary", { name: "Claim Inspector" }).getByText("Excerpt not in stored text").first()).toBeVisible();
    } else {
      // Below 1200px the inspector is a drawer that closes with Escape.
      const drawer = page.getByRole("dialog", { name: "Claim Inspector" });
      await expect(drawer.getByText("Excerpt not in stored text").first()).toBeVisible();
      await shot(page, `11-${size.name}-inspector`);
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      return;
    }
    await shot(page, `11-${size.name}-inspector`);
  });
}
