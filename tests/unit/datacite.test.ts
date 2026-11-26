import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/doi/route";
import { sourceIdentity } from "@/lib/identity";
import { sourceFromWork } from "@/lib/mutations";
import { normaliseDataCite } from "@/lib/server/datacite";

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Shape recorded from api.datacite.org for 10.5061/dryad.8515 on 26 Nov 2026 (trimmed to the fields TRACE reads). */
const DRYAD = {
  data: {
    attributes: {
      doi: "10.5061/DRYAD.8515",
      titles: [{ title: "Data from: A new malaria agent in African hominids." }],
      creators: [
        { name: "Ollomo, Benjamin", nameType: "Personal", givenName: "Benjamin", familyName: "Ollomo" },
        { name: "Durand, Patrick", nameType: "Personal", givenName: "Patrick", familyName: "Durand" },
      ],
      publicationYear: 2011,
      publisher: "Dryad",
      types: { citeproc: "dataset", resourceTypeGeneral: "Dataset" },
    },
  },
};

/** A fetch stub that answers by host: Crossref and DataCite are told apart, nothing else is reachable. */
function registries({ crossref, datacite }: { crossref: () => Response; datacite: () => Response | Promise<Response> }) {
  const fn = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("api.crossref.org")) return Promise.resolve(crossref());
    if (url.includes("api.datacite.org")) return Promise.resolve(datacite());
    return Promise.reject(new Error(`unexpected host: ${url}`));
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const call = async (doi: string) => {
  const res = await GET(new Request(`http://localhost/api/doi?doi=${encodeURIComponent(doi)}`, { headers: { "x-forwarded-for": `test-${doi}` } }));
  return (await res.json()) as { ok: boolean; kind?: string; message?: string; data?: { provider?: string; doi: string; note?: string } };
};

describe("DataCite fallback", () => {
  it("normalises a DataCite record and keeps its provenance", () => {
    const w = normaliseDataCite(DRYAD, "2026-11-26T08:00:00.000Z")!;
    expect(w).toMatchObject({ doi: "10.5061/dryad.8515", provider: "datacite", abstract: null });
    expect(w.record).toMatchObject({ title: "Data from: A new malaria agent in African hominids.", year: 2011, container: "Dryad", type: "dataset" });
    expect(w.record.authors[0]).toEqual({ family: "Ollomo", given: "Benjamin" });
  });

  it("is asked only after Crossref says not found, and its record is named as DataCite's", async () => {
    const f = registries({ crossref: () => new Response("Resource not found.", { status: 404 }), datacite: () => json(DRYAD) });
    const r = await call("10.5061/dryad.8515.dc1");
    expect(r.ok).toBe(true);
    expect(r.data).toMatchObject({ provider: "datacite" });
    expect(r.data?.note).toContain("DataCite");
    expect(f.mock.calls.some(([u]) => String(u).includes("api.crossref.org"))).toBe(true);

    // A source saved from it says DataCite, compares cited details as usual, and a resolving DOI alone is not a match.
    const { source } = sourceFromWork({ ...normaliseDataCite(DRYAD, "2026-11-26T08:00:00.000Z")! }, "doi_lookup", "2026-11-26T08:00:00.000Z");
    expect(source.registry?.provider).toBe("datacite");
    const id = sourceIdentity(source);
    expect(id).toMatchObject({ status: "matched", registry: "DataCite" });
    expect(id.summary).toContain("DataCite record");
    const wrongYear = sourceIdentity({ ...source, cited: { ...source.cited, year: 2025 } });
    expect(wrongYear).toMatchObject({ status: "mismatch", registry: "DataCite" });
  });

  it("does not ask DataCite when Crossref has the record, or when Crossref failed", async () => {
    const ok = registries({ crossref: () => json({ message: { DOI: "10.1126/science.1152408", title: ["T"], author: [{ family: "K" }], issued: { "date-parts": [[2008]] }, type: "journal-article" } }), datacite: () => json(DRYAD) });
    expect((await call("10.1126/science.1152408")).data?.provider).toBeUndefined();
    expect(ok.mock.calls.some(([u]) => String(u).includes("api.datacite.org"))).toBe(false);

    const down = registries({ crossref: () => new Response("slow down", { status: 429 }), datacite: () => json(DRYAD) });
    expect(await call("10.5555/crossref-rate-limited")).toMatchObject({ ok: false, kind: "rate_limited" });
    expect(down.mock.calls.some(([u]) => String(u).includes("api.datacite.org"))).toBe(false);
  });

  it("keeps not found and could not check apart when both registries are asked", async () => {
    registries({ crossref: () => new Response("Resource not found.", { status: 404 }), datacite: () => new Response("not found", { status: 404 }) });
    expect(await call("10.1234/trace-smoke-test-no-such-doi")).toMatchObject({ ok: false, kind: "not_found", message: "Neither Crossref nor DataCite has a record for this DOI." });

    // DataCite did not answer: the DOI may be registered there, so this is "could not check", never "not found".
    registries({ crossref: () => new Response("Resource not found.", { status: 404 }), datacite: () => new Response("busy", { status: 503 }) });
    const r = await call("10.5555/datacite-down");
    expect(r).toMatchObject({ ok: false, kind: "unavailable" });
    expect(r.message).toContain("DataCite could not be checked");
  });
});
