import { afterEach, describe, expect, it, vi } from "vitest";
import fixtures from "@/data/demo-sources.json";
import type { CitableInput, WorkRecord } from "@/lib/api";
import { missingForApa, toCsl } from "@/lib/csl";
import { formatApa, htmlToParts } from "@/lib/server/citations";
import { lookupCrossref, normaliseWork, searchCrossref } from "@/lib/server/crossref";
import { classify, draftWithGemini } from "@/lib/server/gemini";
import { lookupOpenAlexAbstract } from "@/lib/server/openalex";
import { buildDraftPayload } from "@/lib/prompt";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const stubFetch = (impl: (url: string) => Response | Promise<Response>) => {
  const fn = vi.fn((input: RequestInfo | URL) => Promise.resolve(impl(String(input))));
  vi.stubGlobal("fetch", fn);
  return fn;
};

// A synthetic Crossref-shaped record for adapter tests. Not a real paper.
const RAW_WORK = {
  DOI: "10.5555/TEST.Fixture",
  title: ["A <i>Test</i> Record &amp; Its Years"],
  author: [{ family: "Okafor", given: "Ada" }, { name: "Test Consortium" }],
  "container-title": ["Journal of Test Fixtures"],
  volume: "15",
  issue: "1",
  page: "20-27",
  type: "journal-article",
  "published-print": { "date-parts": [[2011, 1]] },
  "published-online": { "date-parts": [[2010, 10, 15]] },
  issued: { "date-parts": [[2010, 10, 15]] },
  abstract: "<jats:p>Some abstract text.</jats:p>",
};

describe("Crossref adapter", () => {
  it("normalises a work and keeps every year the registry lists", () => {
    const w = normaliseWork(RAW_WORK, "2026-11-24T00:00:00Z", "https://api.crossref.org/works/x")!;
    expect(w.doi).toBe("10.5555/test.fixture");
    expect(w.record.title).toBe("A Test Record & Its Years");
    expect(w.record.authors).toEqual([{ family: "Okafor", given: "Ada" }, { family: "Test Consortium", given: undefined }]);
    expect(w.record.years).toEqual({ print: 2011, online: 2010, issued: 2010 });
    expect(w.record.year).toBe(2011);
    expect(w.record.type).toBe("article-journal");
    expect(w.abstract).toBe("Some abstract text.");
  });

  it("reports a missing abstract as null, not as empty text", () => {
    const { abstract: _a, ...noAbstract } = RAW_WORK;
    void _a;
    expect(normaliseWork(noAbstract, "t", "u")!.abstract).toBeNull();
  });

  it("returns 'not_found' for an unknown DOI", async () => {
    stubFetch(() => new Response("Resource not found.", { status: 404 }));
    const r = await lookupCrossref("10.5555/unknown-1");
    expect(r).toMatchObject({ ok: false, kind: "not_found" });
  });

  it("returns 'rate_limited' on 429, never 'not_found'", async () => {
    stubFetch(() => new Response("slow down", { status: 429 }));
    expect(await lookupCrossref("10.5555/unknown-2")).toMatchObject({ ok: false, kind: "rate_limited" });
  });

  it("returns 'unavailable' on a server error after one retry", async () => {
    const f = stubFetch(() => new Response("oops", { status: 503 }));
    expect(await lookupCrossref("10.5555/unknown-3")).toMatchObject({ ok: false, kind: "unavailable" });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("returns 'timeout' when the registry does not answer", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(Object.assign(new Error("timed out"), { name: "TimeoutError" }))));
    expect(await lookupCrossref("10.5555/unknown-4")).toMatchObject({ ok: false, kind: "timeout" });
  });

  it("treats an empty search as a successful answer with no results", async () => {
    stubFetch(() => json({ message: { items: [], "total-results": 0 } }));
    const r = await searchCrossref("zzzz qqqq no such topic");
    expect(r).toEqual({ ok: true, data: { items: [], total: 0, query: "zzzz qqqq no such topic" } });
  });

  it("sends the year scope as a filter and returns normalised items", async () => {
    const f = stubFetch(() => json({ message: { items: [RAW_WORK], "total-results": 1 } }));
    const r = await searchCrossref("test record years", { yearFrom: 2005, yearTo: 2015, rows: 5 });
    expect(r.ok && r.data.items[0]!.doi).toBe("10.5555/test.fixture");
    const url = decodeURIComponent(String(f.mock.calls[0]![0]));
    expect(url).toContain("filter=from-pub-date:2005,until-pub-date:2015");
    expect(url).toContain("rows=5");
  });

  it("does not report a failed search as 'nothing found'", async () => {
    stubFetch(() => new Response("gone", { status: 404 }));
    expect(await searchCrossref("another distinct query")).toMatchObject({ ok: false, kind: "unavailable" });
  });

  it("keeps a contact email out of stored URLs", async () => {
    vi.stubEnv("CROSSREF_MAILTO", "someone@example.org");
    const f = stubFetch(() => json({ message: RAW_WORK }));
    const r = await lookupCrossref("10.5555/test.fixture");
    expect(r.ok && r.data.url).toBe("https://api.crossref.org/works/10.5555%2Ftest.fixture");
    const init = f.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(init[1].headers["User-Agent"]).toContain("mailto:someone@example.org");
  });
});

describe("OpenAlex adapter", () => {
  it("rebuilds an abstract and separates 'no abstract' from 'could not check'", async () => {
    stubFetch(() => json({ id: "W1", abstract_inverted_index: { Testing: [0], helps: [1], memory: [2] } }));
    expect(await lookupOpenAlexAbstract("10.5555/oa-1")).toMatchObject({ ok: true, data: { text: "Testing helps memory" } });

    stubFetch(() => json({ id: "W2", abstract_inverted_index: null }));
    const none = await lookupOpenAlexAbstract("10.5555/oa-2");
    expect(none).toMatchObject({ ok: false, kind: "not_found" });
    expect(!none.ok && none.message).toContain("has no abstract");

    stubFetch(() => new Response("budget exhausted", { status: 429 }));
    expect(await lookupOpenAlexAbstract("10.5555/oa-3")).toMatchObject({ ok: false, kind: "rate_limited" });
  });
});

describe("AI provider", () => {
  it("returns 'no_key' without calling anything when no key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const f = stubFetch(() => json({}));
    const r = await draftWithGemini(buildDraftPayload("Q?", [{ id: "ev_1", label: "x", text: "some passage text" }]));
    expect(r).toMatchObject({ ok: false, kind: "no_key" });
    expect(f).not.toHaveBeenCalled();
  });

  it("reads the status of the SDK's own error classes: a rejected key and a spent quota are not 'unreachable'", () => {
    // Shape recorded from @google/genai's interactions API with an invalid key (25 Nov 2026).
    const badKey = Object.assign(new Error("400 API error occurred"), { name: "BadRequestError", status: 400, body: '[{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","details":[{"reason":"API_KEY_INVALID"}]}}]' });
    expect(classify(badKey)).toMatchObject({ kind: "no_key", retry: false });
    expect(classify(Object.assign(new Error("429"), { name: "RateLimitError", status: 429 }))).toMatchObject({ kind: "rate_limited", retry: false });
    expect(classify(Object.assign(new Error("400"), { name: "BadRequestError", status: 400, body: "{}" }))).toMatchObject({ kind: "bad_request", retry: false });
    expect(classify(new TypeError("fetch failed"))).toMatchObject({ kind: "unavailable", retry: true });
  });
});

describe("APA 7 references (Citation.js)", () => {
  const works = fixtures.works as WorkRecord[];
  const inputs: CitableInput[] = works.map((w, i) => {
    const { years: _y, ...cited } = w.record;
    void _y;
    return { id: `src_demo_${i + 1}`, doi: w.doi, cited };
  });
  const refs = formatApa(inputs);
  const byId = Object.fromEntries(refs.map((r) => [r.id, r]));

  it("formats a journal article from stored metadata", () => {
    expect(byId.src_demo_2!.text).toBe(
      "Karpicke, J. D., & Roediger, H. L. (2008). The Critical Importance of Retrieval for Learning. Science, 319(5865), 966–968. https://doi.org/10.1126/science.1152408",
    );
    expect(byId.src_demo_2!.inText).toBe("(Karpicke & Roediger, 2008)");
    expect(byId.src_demo_2!.parts.filter((p) => p.italic).map((p) => p.text)).toEqual(["Science", "319"]);
  });

  it("disambiguates two works by the same authors in the same year, consistently in the list and in text", () => {
    // Known limit, recorded in docs: the CSL processor orders these by title without ignoring a
    // leading "The", so the a/b letters can differ from strict APA 7 ordering. They are consistent.
    expect(byId.src_demo_1!.text).toContain("(2006a). Test-Enhanced Learning");
    expect(byId.src_demo_3!.text).toContain("(2006b). The Power of Testing Memory");
    expect(byId.src_demo_1!.inText).toBe("(Roediger & Karpicke, 2006a)");
    expect(byId.src_demo_3!.inText).toBe("(Roediger & Karpicke, 2006b)");
  });

  it("returns the list in alphabetical order", () => {
    expect(refs.map((r) => r.text.split(",")[0])).toEqual(["Adesope", "Dunlosky", "Karpicke", "Roediger", "Roediger", "Roediger", "Rowland"]);
  });

  it("formats a hand-entered web page without inventing missing parts", () => {
    const page = { title: "Study tips", authors: [{ family: "Example Learning Centre" }], year: null, type: "webpage", container: "Example University", url: "https://example.org/tips" };
    const [undated] = formatApa([{ id: "m1", doi: null, cited: page, accessed: "2026-11-24T10:00:00.000Z" }]);
    expect(undated!.text).toBe("Example Learning Centre. (n.d.). Study tips. Example University. Retrieved November 24, 2026, from https://example.org/tips");
    expect(undated!.inText).toBe("(Example Learning Centre, n.d.)");
    const [dated] = formatApa([{ id: "m2", doi: null, cited: { ...page, year: 2024 }, accessed: "2026-11-24T10:00:00.000Z" }]);
    expect(dated!.text).toBe("Example Learning Centre. (2024). Study tips. Example University. https://example.org/tips");
  });

  it("lists what a reference is missing", () => {
    expect(missingForApa({ title: "", authors: [], year: null, type: "article-journal" }, null)).toEqual(["author", "year", "title", "journal name", "DOI or URL"]);
    expect(missingForApa(inputs[0]!.cited, inputs[0]!.doi)).toEqual([]);
  });

  it("builds CSL-JSON only from stored fields", () => {
    expect(toCsl(inputs[1]!)).toMatchObject({ id: "src_demo_2", type: "article-journal", DOI: "10.1126/science.1152408", issued: { "date-parts": [[2008]] } });
  });

  it("turns formatter HTML into plain and italic runs with entities decoded", () => {
    expect(htmlToParts('<div class="csl-entry">A &#38; B. <i>Journal</i>, <i>3</i>(2).</div>\n')).toEqual([
      { text: "A & B. ", italic: false },
      { text: "Journal", italic: true },
      { text: ", ", italic: false },
      { text: "3", italic: true },
      { text: "(2).", italic: false },
    ]);
  });
});
