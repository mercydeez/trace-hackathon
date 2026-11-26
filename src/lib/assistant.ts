/**
 * The research assistant's three bounded actions, as pure functions. No model is involved: requests are
 * routed by their wording, studies come from Crossref and are filtered by the request's own terms, quotes are
 * compared with stored text, and notes are stored as text. Nothing here can change a trust label.
 */
import { checkExcerpt } from "./excerpt";
import type { Evidence, RegistryRecord, Source } from "./types";

export type Intent = "find" | "quote" | "note" | "unclear";

export function routeRequest(text: string): Intent {
  const t = text.toLowerCase();
  if (/\b(save|add|keep|attach|store)\b[^"“]*\bnotes?\b/.test(t)) return "note";
  if (/\b(check|verify|confirm)\b[^"“]*\b(quote|quotation|citation)\b/.test(t)) return "quote";
  if (/["“][^"”]{8,}["”]\s*\(\s*\p{Lu}[^()]*\d{4}[a-z]?\s*\)/u.test(text)) return "quote";
  if (/\b(find|give|show|list|search|recommend|suggest|need|want)\b.*\b(stud(y|ies)|papers?|articles?|sources?|research|evidence|literature)\b/.test(t)) return "find";
  return "unclear";
}

// Request wording, counts and generic research words. What remains names the subject and outcome asked about.
const STOP = new Set(
  "a an the of on in at to for and or that which who whom how what why when where is are was were be been being it its this these those me my i we our you your please can could would will should do does did give find show list search recommend suggest need want get some any all one two three four five six seven eight nine ten several few many peer reviewed peerreviewed study studies paper papers article articles research evidence source sources literature journal journals publication publications measure measures measured measuring effect effects impact impacts improve improved improves improving affect affected affects about with from by into than then also more most such as between whether there their"
    .split(" "),
);

const stem = (w: string) => w.replace(/(?:ies)$/, "y").replace(/(?<=[^s])s$/, "");

export function specificTerms(request: string): string[] {
  const words = request
    .toLowerCase()
    .replace(/[’']s\b/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 && !STOP.has(w));
  return [...new Set(words)];
}

function wordSet(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(stem));
}

export interface Candidate {
  doi: string;
  record: RegistryRecord;
  abstract: string | null;
}

/**
 * A record answers the request only if its title or abstract contains every specific term the student used.
 * Strict on purpose: it never pads the answer to reach a requested count. Records sharing at least half the
 * terms are returned separately as "related", never as answers.
 */
export function judgeStudies<T extends Candidate>(request: string, items: T[]): { terms: string[]; answers: T[]; related: T[] } {
  const terms = specificTerms(request);
  const answers: T[] = [];
  const related: T[] = [];
  for (const item of items) {
    const words = wordSet(`${item.record.title} ${item.abstract ?? ""}`);
    const hits = terms.filter((t) => words.has(stem(t))).length;
    if (terms.length > 0 && hits === terms.length) answers.push(item);
    else if (terms.length > 0 && hits >= Math.ceil(terms.length / 2)) related.push(item);
  }
  return { terms, answers, related };
}

/** The quoted words and the (Author, Year) citation in a quote-check request. */
export function parseQuoteRequest(text: string): { quote: string | null; surname: string | null; year: number | null } {
  const quote = text.match(/["“]([^"”]{4,})["”]/)?.[1]?.trim() ?? null;
  const cite = text.match(/\(\s*(\p{Lu}[\p{L}'’-]+)[^()]*?(\d{4})[a-z]?\s*\)/u);
  return { quote, surname: cite?.[1] ?? null, year: cite ? Number(cite[2]) : null };
}

const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}]+/gu, "");

export type QuoteResult =
  | { kind: "unparsed" }
  | { kind: "no_source"; surname: string | null; year: number | null }
  | { kind: "ambiguous"; sources: Source[] }
  | { kind: "no_text"; source: Source }
  | { kind: "found"; source: Source; evidence: Evidence }
  | { kind: "not_found"; source: Source; scopes: Evidence["scope"][] };

/** Compare the quoted words with the stored text of the cited source in the library. Never confirms from memory. */
export function checkQuote(text: string, sources: Source[], evidence: Evidence[]): QuoteResult {
  const { quote, surname, year } = parseQuoteRequest(text);
  if (!quote) return { kind: "unparsed" };
  const matches = sources.filter((s) => surname !== null && norm(s.cited.authors[0]?.family ?? "") === norm(surname) && (year === null || s.cited.year === year));
  if (matches.length === 0) return { kind: "no_source", surname, year };
  if (matches.length > 1) return { kind: "ambiguous", sources: matches };
  const source = matches[0]!;
  const texts = evidence.filter((e) => e.sourceId === source.id);
  if (texts.length === 0) return { kind: "no_text", source };
  for (const e of texts) if (checkExcerpt(quote, e.text).status === "matched") return { kind: "found", source, evidence: e };
  return { kind: "not_found", source, scopes: [...new Set(texts.map((e) => e.scope))] };
}

/** The quoted note, and the library sources the rest of the request names by first author's surname. */
export function parseNoteRequest(text: string, sources: Source[]): { note: string | null; targets: Source[] } {
  const quoted = text.match(/["“]([\s\S]+)["”]/);
  const note = quoted?.[1]?.trim() || null;
  const rest = quoted ? text.replace(quoted[0], " ") : text;
  const words = new Set(rest.split(/[^\p{L}'’-]+/u).map(norm).filter(Boolean));
  const targets = sources.filter((s) => {
    const family = norm(s.cited.authors[0]?.family ?? "");
    return family.length > 1 && words.has(family);
  });
  return { note, targets };
}

/** Text that reads like an instruction to the system. Flagged to the student; stored as plain text all the same. */
export function looksLikeInstruction(note: string): boolean {
  return /^\s*(system|assistant|developer)\s*:|ignore (all |your |previous |the )*(rules|instructions)|mark (every|all)\b.*\bverified/i.test(note);
}
