import { expect, type Page } from "@playwright/test";

/**
 * Everything here that stands in for a provider is a TEST FIXTURE. The record below is synthetic
 * (10.5555 is Crossref's test prefix) and is labelled as such in its own title.
 */
export const TEST_WORK = {
  doi: "10.5555/trace.test.fixture",
  record: {
    title: "Test fixture record: quizzing in a classroom (not a real paper)",
    authors: [
      { family: "Okafor", given: "Ada" },
      { family: "Lindqvist", given: "Bo" },
    ],
    year: 2019,
    container: "Journal of Test Fixtures",
    volume: "3",
    issue: "2",
    pages: "10-20",
    type: "article-journal",
    years: { print: 2019, issued: 2019 },
  },
  abstract: "This is a test fixture abstract. Pupils who were quizzed weekly recalled more on a later test than pupils who reread their notes.",
  retrievedAt: "2026-11-24T18:00:00.000Z",
  url: "https://api.crossref.org/works/10.5555%2Ftrace.test.fixture",
};

const ok = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
const fail = (status: number, kind: string, message: string) => ({ status, contentType: "application/json", body: JSON.stringify({ ok: false, kind, message }) });

export const reply = { ok, fail };

export async function mockStatus(page: Page, configured: boolean) {
  await page.route("**/api/status", (r) => r.fulfill(ok({ ai: { configured, model: configured ? "mock-model (test fixture)" : "gemini-3.5-flash-lite" }, crossrefPolitePool: false, openAlexKey: false })));
}

export async function mockSearch(page: Page) {
  await page.route("**/api/search**", (r) => r.fulfill(ok({ items: [TEST_WORK], total: 1, query: new URL(r.request().url()).searchParams.get("q") })));
}

/** Screenshots wait for drawer animations to finish, so they show what a person sees, not a mid-transition frame. */
export const shot = (page: Page, name: string) => page.screenshot({ path: `docs/screenshots/${name}.png`, animations: "disabled" });

export const stepButton = (page: Page, name: RegExp) => page.getByRole("navigation", { name: "Steps" }).getByRole("button", { name });

export async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open the demo project" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("retrieval practice");
}

/** The project tools (demo, trap, backup, erase) live in a panel opened from the header. */
export async function openTools(page: Page) {
  await page.getByRole("button", { name: "Projects and tools" }).click();
  await expect(page.getByRole("dialog", { name: "Projects and tools" })).toBeVisible();
}

/** Open a source row in the Library and tick its passage into the evidence set. */
export async function tickEvidenceOf(page: Page, title: RegExp) {
  await page.getByRole("button", { name: title }).click();
  await page.getByLabel("Use in the evidence set").check();
}

/** Demo project with its plan approved and four abstracts approved as the evidence set, on the Brief step. */
export async function demoWithApprovedEvidence(page: Page) {
  await openDemo(page);
  await page.getByRole("button", { name: "Approve plan" }).click();
  await expect(page.getByRole("heading", { name: "Your library" })).toBeVisible();
  for (const title of [/^Test-Enhanced Learning/, /^The Critical Importance of Retrieval/, /^Rethinking the Use of Tests/, /^Improving Students/]) {
    await tickEvidenceOf(page, title);
  }
  await page.getByRole("button", { name: "Review evidence set" }).click();
  await page.getByRole("button", { name: "Approve evidence set" }).click();
  await expect(page.getByText("You approved this evidence set")).toBeVisible();
}
