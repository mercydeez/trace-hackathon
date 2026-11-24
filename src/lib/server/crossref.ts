/**
 * Crossref REST API adapter: bibliographic search and DOI lookup.
 *
 * Public pool limits observed on 24 Nov 2026: 1 request/second for queries, concurrency 1.
 * Setting CROSSREF_MAILTO moves requests to the faster "polite pool"; the address goes only in
 * the User-Agent header, never into stored URLs.
 */
import { z } from "zod";
import type { SearchResult, WorkRecord } from "../api";
import { jatsToText } from "../text";
import type { Outcome, RegistryRecord } from "../types";
import { fetchJson, serialQueue, ttlCache } from "./http";

const BASE = "https://api.crossref.org";
const SELECT = "DOI,title,author,container-title,volume,issue,page,type,published-print,published-online,issued,abstract,URL";

const schedule = serialQueue();
const cache = ttlCache<unknown>(10 * 60_000, 200);

function headers(): Record<string, string> {
  const mailto = process.env.CROSSREF_MAILTO?.trim();
  return { "User-Agent": `TRACE-hackathon/0.1 (student research demo${mailto ? `; mailto:${mailto}` : ""})` };
}

const DateSchema = z.object({ "date-parts": z.array(z.array(z.number().nullable())) }).optional();
const WorkSchema = z.object({
  DOI: z.string(),
  title: z.array(z.string()).optional(),
  author: z.array(z.object({ family: z.string().optional(), given: z.string().optional(), name: z.string().optional() })).optional(),
  "container-title": z.array(z.string()).optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  page: z.string().optional(),
  type: z.string().optional(),
  "published-print": DateSchema,
  "published-online": DateSchema,
  issued: DateSchema,
  abstract: z.string().optional(),
  URL: z.string().optional(),
});

/** Crossref work types -> CSL types used by the APA formatter. */
const CSL_TYPE: Record<string, string> = {
  "journal-article": "article-journal",
  "book-chapter": "chapter",
  book: "book",
  monograph: "book",
  "edited-book": "book",
  "proceedings-article": "paper-conference",
  "posted-content": "article",
  report: "report",
  dissertation: "thesis",
  dataset: "dataset",
};

function plain(s: string | undefined): string {
  return s ? jatsToText(s).replace(/\s+/g, " ").trim() : "";
}

function yearOf(d: z.infer<typeof DateSchema>): number | undefined {
  const y = d?.["date-parts"]?.[0]?.[0];
  return typeof y === "number" ? y : undefined;
}

export function normaliseWork(raw: unknown, retrievedAt: string, url: string): WorkRecord | null {
  const parsed = WorkSchema.safeParse(raw);
  if (!parsed.success) return null;
  const w = parsed.data;
  const years = { print: yearOf(w["published-print"]), online: yearOf(w["published-online"]), issued: yearOf(w.issued) };
  const record: RegistryRecord = {
    title: plain(w.title?.[0]),
    authors: (w.author ?? [])
      .map((a) => ({ family: (a.family ?? a.name ?? "").trim(), given: a.given?.trim() || undefined }))
      .filter((a) => a.family),
    // The print (volume/issue) year is the default citation year; every listed year is kept for the identity check.
    year: years.print ?? years.issued ?? years.online ?? null,
    container: plain(w["container-title"]?.[0]) || undefined,
    volume: w.volume,
    issue: w.issue,
    pages: w.page,
    type: CSL_TYPE[w.type ?? ""] ?? "article",
    url: w.URL,
    years: JSON.parse(JSON.stringify(years)),
  };
  const abstract = w.abstract ? jatsToText(w.abstract) : "";
  return { doi: w.DOI.toLowerCase(), record, abstract: abstract || null, retrievedAt, url };
}

async function get(url: string, gapMs: number): Promise<Outcome<unknown>> {
  const cached = cache.get(url);
  if (cached !== undefined) return { ok: true, data: cached };
  const outcome = await schedule(gapMs, () => fetchJson(url, { headers: headers() }));
  if (outcome.ok) cache.set(url, outcome.data);
  return outcome;
}

export interface SearchOptions {
  rows?: number;
  yearFrom?: number | null;
  yearTo?: number | null;
}

export async function searchCrossref(query: string, opts: SearchOptions = {}): Promise<Outcome<SearchResult>> {
  const params = new URLSearchParams({
    "query.bibliographic": query,
    rows: String(Math.min(Math.max(opts.rows ?? 10, 1), 20)),
    select: SELECT,
  });
  const filters: string[] = [];
  if (opts.yearFrom) filters.push(`from-pub-date:${opts.yearFrom}`);
  if (opts.yearTo) filters.push(`until-pub-date:${opts.yearTo}`);
  if (filters.length) params.set("filter", filters.join(","));
  const url = `${BASE}/works?${params}`;

  const outcome = await get(url, 1100);
  if (!outcome.ok) {
    // A search that fails is "could not check". Only a successful empty list means "nothing found".
    return outcome.kind === "not_found"
      ? { ok: false, kind: "unavailable", message: "Crossref search is not available right now." }
      : outcome;
  }
  const message = (outcome.data as { message?: { items?: unknown[]; "total-results"?: number } }).message;
  if (!message || !Array.isArray(message.items)) {
    return { ok: false, kind: "malformed", message: "Crossref sent an answer that could not be read." };
  }
  const retrievedAt = new Date().toISOString();
  const items = message.items.flatMap((i) => normaliseWork(i, retrievedAt, url) ?? []);
  return { ok: true, data: { items, total: message["total-results"] ?? items.length, query } };
}

export async function lookupCrossref(doi: string): Promise<Outcome<WorkRecord>> {
  const url = `${BASE}/works/${encodeURIComponent(doi)}`;
  const outcome = await get(url, 250);
  if (!outcome.ok) {
    return outcome.kind === "not_found"
      ? { ok: false, kind: "not_found", message: "Crossref has no record for this DOI." }
      : outcome;
  }
  const work = normaliseWork((outcome.data as { message?: unknown }).message, new Date().toISOString(), url);
  return work ? { ok: true, data: work } : { ok: false, kind: "malformed", message: "Crossref sent a record that could not be read." };
}
