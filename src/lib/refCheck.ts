/**
 * Verdict for one pasted reference, compared with the registry record found for it.
 *
 * Only the details the student actually supplied are compared. A bare DOI that resolves is
 * reported as "DOI found, nothing to compare", never as a match: a resolving DOI says nothing
 * about whether it is the paper the student meant. A record found by search (no DOI) is at best
 * a "possible match" for the student to confirm.
 *
 * needs_fix: the DOI's record agrees on title and first author, and only the year differs. The
 *   student may accept or reject the registry's year; nothing changes without that choice.
 * mismatch: the DOI points to a different title or first author, even if other details agree.
 */
import { normaliseDoi } from "./doi";
import { compareMetadata, type FieldCheck } from "./identity";
import type { ParsedReference } from "./refList";
import type { Biblio, RegistryRecord, Source } from "./types";

export type ListVerdict =
  | "match"
  | "doi_only"
  | "possible"
  | "needs_fix"
  | "mismatch"
  | "uncertain"
  | "no_close_match"
  | "not_found"
  | "could_not_check"
  | "web";

export function citedFromParsed(parsed: ParsedReference): Biblio {
  return {
    title: parsed.title ?? "",
    authors: parsed.firstAuthor ? [{ family: parsed.firstAuthor }] : [],
    year: parsed.year,
  };
}

export function judgeReference(parsed: ParsedReference, record: RegistryRecord, via: "doi" | "search"): { verdict: ListVerdict; fields: FieldCheck[] } {
  const supplied = new Set<FieldCheck["field"]>([
    ...(parsed.title ? (["title"] as const) : []),
    ...(parsed.firstAuthor ? (["first_author"] as const) : []),
    ...(parsed.year !== null ? (["year"] as const) : []),
  ]);
  // A pasted reference is read for its first author only, so "you cite 1 author, the registry lists 3" is an
  // artefact of parsing, not a disagreement: the first author agreeing is a match here.
  const fields = compareMetadata(citedFromParsed(parsed), record)
    .filter((f) => supplied.has(f.field))
    .map((f) => (f.field === "first_author" && f.verdict === "note" && f.message.startsWith("First author agrees") ? { ...f, verdict: "match" as const, message: "First author agrees with the registry." } : f));

  if (fields.length === 0) return { verdict: via === "doi" ? "doi_only" : "possible", fields };
  const bad = (field: FieldCheck["field"]) => fields.some((f) => f.field === field && f.verdict === "mismatch");
  const identityBad = bad("title") || bad("first_author");

  if (via === "search") {
    // A search hit is the student's paper only if title and first author agree. Otherwise it is an unrelated record.
    if (identityBad) return { verdict: "no_close_match", fields };
    // Same title and author, another year: possibly a later record or reprint. Never substituted; the student decides.
    if (bad("year")) return { verdict: "uncertain", fields };
    return { verdict: "possible", fields };
  }
  if (identityBad) return { verdict: "mismatch", fields };
  if (bad("year")) return { verdict: "needs_fix", fields };
  // Agreement on a year, or an author and a year, fits many papers. Only a compared title makes it a match.
  const titleCompared = fields.some((f) => f.field === "title");
  return { verdict: titleCompared ? "match" : "possible", fields };
}

/**
 * From several search candidates, the one that agrees with everything supplied; else one that agrees on
 * title and first author; else the first. The caller still judges it, so a poor candidate is never passed off.
 */
export function bestCandidate<T extends { record: RegistryRecord }>(parsed: ParsedReference, items: T[]): T | undefined {
  const judged = items.map((item) => ({ item, v: judgeReference(parsed, item.record, "search").verdict }));
  return (judged.find((j) => j.v === "possible") ?? judged.find((j) => j.v === "uncertain") ?? judged[0])?.item;
}

const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^retracted:\s*/, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Identity keys for duplicate detection: normalised DOI first, then title + first author + year. */
export interface DupKey {
  doi: string | null;
  title: string;
  author: string;
  year: number | null;
}

export function dupKey(doi: string | null, b: { title: string; authors: { family: string }[]; year: number | null }): DupKey {
  return { doi: doi ? normaliseDoi(doi) : null, title: norm(b.title), author: norm(b.authors[0]?.family ?? ""), year: b.year };
}

/** "same" = same DOI, or (DOI-less on either side) same title, first author and year. "possible" = same title only. */
export function sameWork(a: DupKey, b: DupKey): "same" | "possible" | null {
  if (a.doi && b.doi) return a.doi === b.doi ? "same" : null;
  if (!a.title || !b.title || a.title !== b.title) return null;
  return a.author && a.author === b.author && a.year !== null && a.year === b.year ? "same" : "possible";
}

/** The library source this pasted row duplicates, if any. */
export function libraryDuplicate(key: DupKey, sources: Source[]): { source: Source; kind: "same" | "possible" } | null {
  for (const s of sources) {
    const kind = sameWork(key, dupKey(s.doi, s.cited));
    if (kind) return { source: s, kind };
  }
  return null;
}
