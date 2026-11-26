/**
 * DataCite: the fallback registry for DOIs Crossref has no record of (datasets, repositories, many
 * theses and preprints). Crossref stays the primary path; DataCite is asked only after Crossref says
 * "not found". The record keeps its provenance, so the identity check names DataCite, not Crossref.
 * A record found here only establishes that the DOI resolves; cited details are compared as usual.
 */
import { z } from "zod";
import type { WorkRecord } from "../api";
import type { Outcome, RegistryRecord } from "../types";
import { fetchJson, ttlCache } from "./http";

const BASE = "https://api.datacite.org/dois";
const cache = ttlCache<WorkRecord>(15 * 60_000, 200);

const CreatorSchema = z.object({
  name: z.string().optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  nameType: z.string().optional(),
});
const AttributesSchema = z.object({
  doi: z.string(),
  titles: z.array(z.object({ title: z.string() })).optional(),
  creators: z.array(CreatorSchema).optional(),
  publicationYear: z.union([z.number(), z.string()]).nullable().optional(),
  publisher: z.union([z.string(), z.object({ name: z.string() })]).nullable().optional(),
  types: z.object({ citeproc: z.string().optional(), resourceTypeGeneral: z.string().optional() }).optional(),
});

function familyOf(c: z.infer<typeof CreatorSchema>): string {
  if (c.familyName?.trim()) return c.familyName.trim();
  const name = c.name?.trim() ?? "";
  // "Surname, Given" for people; an organisation's whole name otherwise.
  return c.nameType === "Personal" && name.includes(",") ? name.split(",")[0]!.trim() : name;
}

export function normaliseDataCite(raw: unknown, retrievedAt: string): WorkRecord | null {
  const parsed = AttributesSchema.safeParse((raw as { data?: { attributes?: unknown } } | null)?.data?.attributes);
  if (!parsed.success) return null;
  const a = parsed.data;
  const year = a.publicationYear === null || a.publicationYear === undefined || a.publicationYear === "" ? null : Number(a.publicationYear);
  const validYear = year !== null && Number.isInteger(year) && year >= 1000 ? year : null;
  const record: RegistryRecord = {
    title: a.titles?.[0]?.title.replace(/\s+/g, " ").trim() ?? "",
    authors: (a.creators ?? [])
      .map((c) => ({ family: familyOf(c), given: c.familyName ? c.givenName?.trim() || undefined : undefined }))
      .filter((c) => c.family),
    year: validYear,
    container: (typeof a.publisher === "string" ? a.publisher : a.publisher?.name)?.trim() || undefined,
    type: a.types?.citeproc || "dataset",
    years: validYear === null ? {} : { issued: validYear },
  };
  // Abstracts are not taken from DataCite: evidence text keeps the Crossref/OpenAlex/student provenance it has today.
  return { doi: a.doi.toLowerCase(), record, abstract: null, retrievedAt, url: `${BASE}/${encodeURIComponent(a.doi)}`, provider: "datacite" };
}

export async function lookupDataCite(doi: string): Promise<Outcome<WorkRecord>> {
  const url = `${BASE}/${encodeURIComponent(doi)}`;
  const cached = cache.get(url);
  if (cached) return { ok: true, data: cached };
  const outcome = await fetchJson(url, { timeoutMs: 8000 });
  if (!outcome.ok) {
    return outcome.kind === "not_found" ? { ok: false, kind: "not_found", message: "DataCite has no record for this DOI." } : outcome;
  }
  const work = normaliseDataCite(outcome.data, new Date().toISOString());
  if (!work) return { ok: false, kind: "malformed", message: "DataCite sent a record that could not be read." };
  cache.set(url, work);
  return { ok: true, data: work };
}
