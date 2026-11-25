/**
 * Verdict for one pasted reference, compared with the registry record found for it.
 *
 * Only the details the student actually supplied are compared. A bare DOI that resolves is
 * reported as "DOI found, nothing to compare", never as a match: a resolving DOI says nothing
 * about whether it is the paper the student meant. A record found by search (no DOI) is at best
 * a "possible match" for the student to confirm.
 */
import { compareMetadata, type FieldCheck } from "./identity";
import type { ParsedReference } from "./refList";
import type { Biblio, RegistryRecord } from "./types";

export type ListVerdict = "match" | "doi_only" | "possible" | "mismatch" | "no_close_match" | "not_found" | "could_not_check";

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
  const fields = compareMetadata(citedFromParsed(parsed), record).filter((f) => supplied.has(f.field));

  if (fields.length === 0) return { verdict: via === "doi" ? "doi_only" : "possible", fields };
  const mismatched = fields.filter((f) => f.verdict === "mismatch");
  if (via === "search" && mismatched.some((f) => f.field === "title")) return { verdict: "no_close_match", fields };
  if (mismatched.length) return { verdict: "mismatch", fields };
  // Agreement on a year, or an author and a year, fits many papers. Only a compared title makes it a match.
  const titleCompared = fields.some((f) => f.field === "title");
  return { verdict: via === "doi" && titleCompared ? "match" : "possible", fields };
}
