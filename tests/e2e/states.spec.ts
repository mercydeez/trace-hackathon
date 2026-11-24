import { expect, test } from "@playwright/test";
import { mockStatus, openDemo, reply, shot, stepButton, TEST_WORK } from "./helpers";

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

test("add by DOI: not found, could not check, duplicate, and a citation whose details disagree", async ({ page }) => {
  await approvedDemoOnDiscover(page);
  const doi = page.getByLabel("DOI", { exact: true });

  // Duplicate of a saved source: nothing is added, and no request is needed to know it.
  await doi.fill("https://doi.org/10.1126/SCIENCE.1152408");
  await page.getByRole("button", { name: "Look up and save" }).click();
  await expect(page.getByText("Already in your library")).toBeVisible();

  // Not a DOI at all.
  await doi.fill("not a doi");
  await page.getByRole("button", { name: "Look up and save" }).click();
  await expect(page.getByText("That does not look like a DOI.")).toBeVisible();

  // Unknown to the registry: not the same as fake.
  await page.route("**/api/doi**", (r) => r.fulfill(reply.fail(404, "not_found", "Crossref has no record for this DOI.")));
  await doi.fill("10.5555/unknown.to.crossref");
  await page.getByRole("button", { name: "Look up and save" }).click();
  await expect(page.getByText("Not found in Crossref. This does not show the paper is fake")).toBeVisible();
  await page.getByRole("button", { name: "Save it anyway, marked as not confirmed" }).click();
  await expect(page.getByText("Saved without a registry record.")).toBeVisible();

  // The registry did not answer: "could not check", never "not found".
  await page.unroute("**/api/doi**");
  await page.route("**/api/doi**", (r) => r.fulfill(reply.fail(429, "rate_limited", "The provider is rate limiting requests. Wait a moment and try again.")));
  await doi.fill("10.5555/another.one");
  await page.getByRole("button", { name: "Look up and save" }).click();
  await expect(page.getByText("Could not check. The provider is rate limiting requests.")).toBeVisible();
  await expect(page.getByRole("tabpanel").getByText("Not found in Crossref")).toHaveCount(0);

  // A citation someone supplied, with the wrong year: saved as given, disagreement shown.
  await page.unroute("**/api/doi**");
  await page.route("**/api/doi**", (r) => r.fulfill(reply.ok(TEST_WORK)));
  await doi.fill(TEST_WORK.doi);
  await page.getByLabel("Title as given").fill(TEST_WORK.record.title);
  await page.getByLabel("First author's surname").fill("Okafor");
  await page.getByLabel("Year", { exact: true }).fill("2009");
  await page.getByRole("button", { name: "Look up and compare" }).click();
  await expect(page.getByText("1 cited detail(s) disagree with the Crossref record")).toBeVisible();
  await expect(page.getByText("Details disagree with Crossref")).toBeVisible();

  // Both appear in the Library with honest labels.
  await stepButton(page, /Library and evidence/).click();
  await expect(page.getByText("9 of 9 sources shown")).toBeVisible();
  await expect(page.getByText("Not found in Crossref", { exact: true })).toBeVisible();
  await expect(page.getByText("Details disagree with Crossref", { exact: true })).toBeVisible();
});

test("a hand-entered reference stays labelled as not checked, and a source without text is not summarised", async ({ page }) => {
  await approvedDemoOnDiscover(page);
  await page.getByRole("tab", { name: "By hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Study tips for first-year students");
  await page.getByLabel("Authors").fill("Example Learning Centre");
  await page.getByLabel("Journal, site or publisher").fill("Example University");
  await page.getByLabel("Web address").fill("https://example.org/study-tips");
  await page.getByRole("button", { name: "Save as entered" }).click();
  await expect(page.getByText("It will stay labelled as not checked.")).toBeVisible();

  await stepButton(page, /Library and evidence/).click();
  await page.getByRole("button", { name: /^Study tips for first-year students/ }).click();
  await expect(page.getByText("Entered by hand, not checked").first()).toBeVisible();
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
  await expect(notice).toContainText("set aside, not deleted");
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.some((k) => k.startsWith("trace.quarantine."))).toBe(true);
  await page.getByRole("button", { name: "Open the demo project" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("retrieval practice");
});

test("erasing everything asks first, and backup then restore brings a project back", async ({ page }) => {
  await openDemo(page);
  const [backup] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download project backup" }).click()]);
  expect(backup.suggestedFilename()).toBe("trace-project-demo-retrieval-practice.json");
  const path = await backup.path();

  await page.getByRole("button", { name: "Erase all TRACE data here" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Every project in this browser will be deleted");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("retrieval practice");

  await page.getByRole("button", { name: "Erase all TRACE data here" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Erase everything" }).click();
  await expect(page.getByRole("heading", { name: "Research you can defend." })).toBeVisible();

  await page.getByRole("button", { name: "Open the demo project" }).click();
  await page.getByLabel("Backup file to restore").setInputFiles(path);
  await expect(page.getByText("Restored “Demo: retrieval practice (imported)”.")).toBeVisible();
});

test("keyboard: the first action is reachable and works without a mouse", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Research you can defend." })).toBeVisible();
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
    await openDemo(page);
    if (size.width < 1024) await page.getByRole("button", { name: "Projects and tools" }).click();
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
