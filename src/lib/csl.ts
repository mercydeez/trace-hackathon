/** Stored metadata -> CSL-JSON, plus an honest list of what a reference is missing. Pure; no formatter here. */
import type { CitableInput } from "./api";
import { doiUrl } from "./doi";
import type { Biblio } from "./types";

export const SOURCE_TYPES: { value: string; label: string }[] = [
  { value: "article-journal", label: "Journal article" },
  { value: "webpage", label: "Web page" },
  { value: "book", label: "Book" },
  { value: "chapter", label: "Book chapter" },
  { value: "report", label: "Report" },
  { value: "article", label: "Preprint or other" },
];

export function toCsl(input: CitableInput): Record<string, unknown> {
  const c = input.cited;
  const item: Record<string, unknown> = {
    id: input.id,
    type: c.type ?? (input.doi ? "article-journal" : "document"),
    title: c.title,
    author: c.authors.map((a) => (a.given ? { family: a.family, given: a.given } : { literal: a.family })),
  };
  if (c.year !== null) item.issued = { "date-parts": [[c.year]] };
  if (c.container) item["container-title"] = c.container;
  if (c.volume) item.volume = c.volume;
  if (c.issue) item.issue = c.issue;
  if (c.pages) item.page = c.pages;
  if (input.doi) item.DOI = input.doi;
  else if (c.url) item.URL = c.url;
  // An undated page needs a real retrieval date ("Retrieved ..., from URL"); the save date is the one we know.
  const accessed = c.year === null && !input.doi && c.url ? input.accessed?.slice(0, 10).split("-").map(Number) : undefined;
  if (accessed?.length === 3 && accessed.every(Number.isFinite)) item.accessed = { "date-parts": [accessed] };
  return item;
}

/** What an APA 7 reference needs that this record does not have. Shown to the student; nothing is guessed. */
export function missingForApa(cited: Biblio, doi: string | null): string[] {
  const missing: string[] = [];
  if (cited.authors.length === 0) missing.push("author");
  if (cited.year === null) missing.push("year");
  if (!cited.title.trim()) missing.push("title");
  const type = cited.type ?? "article-journal";
  if ((type === "article-journal" || type === "webpage") && !cited.container?.trim()) {
    missing.push(type === "webpage" ? "site name" : "journal name");
  }
  if (!doi && !cited.url?.trim()) missing.push("DOI or URL");
  return missing;
}

export function sourceLink(doi: string | null, cited: Biblio): string | null {
  if (doi) return doiUrl(doi);
  return cited.url && /^https?:\/\//i.test(cited.url) ? cited.url : null;
}
