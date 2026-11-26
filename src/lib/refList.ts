/**
 * Pasted reference lists → structured guesses for a bulk lookup. No network here.
 *
 * Every field is a guess from free text and is null when the text does not make it clear.
 * The guesses only shape the registry query; the registry record is what gets compared.
 */
import { normaliseDoi } from "@/lib/doi";

export interface ParsedReference {
  raw: string;
  doi: string | null;
  year: number | null;
  firstAuthor: string | null;
  title: string | null;
  query: string;
  /** A web page (a URL, no DOI, no year): shown as "Web source · Not checked", never looked up as a paper. */
  web?: boolean;
}

export const MAX_REFERENCES = 15;

const DOI_IN_TEXT = /10\.\d{4,9}\/\S+/;
const URL = /\b(?:https?:\/\/|www\.|(?:dx\.)?doi\.org\/)\S+/gi;
const DOI_LINE = /^(?:(?:https?:\/\/)?(?:dx\.)?doi\.org\/|doi:\s*)?10\.\d{4,9}\/\S+$/i;
// "[1]", "1." / "1)", and letter markers "A." / "B)" (a single capital, so "Kahneman, D." is not one).
const LIST_MARKER = /^(?:\[\d+\]|\d+[.)]|[A-Z][.)])\s+/;
// "Roediger, H. L." / "Van Gogh, V." / "Roediger H.L." / "Roediger HL,". Organisations do not match.
const AUTHOR_START = /^(\p{Lu}[\p{L}'’-]+(?: \p{Lu}[\p{L}'’-]+)?)(?:,\s*\p{Lu}\.|\s+\p{Lu}\.(?:\s?\p{Lu}\.)*|\s+\p{Lu}{1,3},)/u;

function startsReference(line: string): boolean {
  return LIST_MARKER.test(line) || AUTHOR_START.test(line);
}

/**
 * One reference per chunk. Blank lines always separate. Otherwise a line joins the one before
 * unless it looks like a new reference (author start or list marker), or it is a DOI line and
 * the chunk already has a DOI (so a list of bare DOIs stays one per line).
 */
// ponytail: layout heuristic. An organisation author ("World Health Organization. (2020)") on the line
// right after another reference gets joined to it; a blank line between references avoids that.
export function splitReferences(text: string): string[] {
  const chunks: string[] = [];
  let current: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      if (current) chunks.push(current);
      current = null;
      continue;
    }
    const continues =
      current !== null &&
      (/(?:[,&;:]|\band)$/.test(current) ||
        (DOI_LINE.test(line) ? !DOI_IN_TEXT.test(current) : !startsReference(line)));
    if (current !== null && continues) current = `${current} ${line}`;
    else {
      if (current) chunks.push(current);
      current = line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function findDoi(raw: string): string | null {
  const match = raw.match(DOI_IN_TEXT);
  if (!match) return null;
  let doi = match[0];
  // Strip sentence punctuation; keep a closing bracket that the DOI itself opened, e.g. 10.1002/(SICI)…
  for (;;) {
    const last = doi.at(-1);
    if (last === "." || last === "," || last === ";") doi = doi.slice(0, -1);
    else if (last === ")" && doi.split("(").length < doi.split(")").length) doi = doi.slice(0, -1);
    else if (last === "]" && doi.split("[").length < doi.split("]").length) doi = doi.slice(0, -1);
    else break;
  }
  return normaliseDoi(doi);
}

// APA "(2006)." / "(2006, March 3)." / "(2006a)", Harvard "(2006) " or ", 2006."
const YEAR = /\((\d{4})[a-z]?(?:,[^)]*)?\)\.?|,\s(\d{4})[a-z]?\./;

function findTitle(afterYear: string): string | null {
  // Up to the first sentence end followed by a capital (the container) or the end of the text.
  const m = afterYear.match(/^(.+?)([.?!])(?:\s+(?=[\p{Lu}\d])|\s*$)/u);
  if (!m?.[1]) return null;
  const title = (m[2] === "." ? m[1] : m[1] + m[2]).trim();
  return title.length >= 3 ? title : null;
}

// Vancouver-style compact form: "LECUN Y, BENGIO Y, HINTON G. Deep Learning. Nature 2015;521:436-44."
const COMPACT_YEAR = /\b((?:19|20)\d{2});/;
const COMPACT_AUTHORS = /^(?:\p{Lu}[\p{L}'’-]+ \p{Lu}{1,3}(?:, |\. ))+/u;

export function parseReference(raw: string): ParsedReference {
  const doi = findDoi(raw);
  const text = raw.trim().replace(LIST_MARKER, "");
  const clean = text.replace(URL, " ").replace(/\bdoi:\s*/gi, " ").replace(new RegExp(DOI_IN_TEXT, "g"), " ").replace(/\s+/g, " ").trim();
  const query = clean.slice(0, 300);

  const yearMatch = clean.match(YEAR);
  let yearValue = Number(yearMatch?.[1] ?? yearMatch?.[2]);
  let title: string | null = null;
  if (yearMatch && yearValue >= 1900 && yearValue <= 2099) {
    title = findTitle(clean.slice((yearMatch.index ?? 0) + yearMatch[0].length).trim());
  } else {
    const compact = clean.match(COMPACT_YEAR);
    const authors = clean.match(COMPACT_AUTHORS);
    if (compact && authors) {
      yearValue = Number(compact[1]);
      title = findTitle(clean.slice(authors[0].length).trim());
    }
  }
  const year = yearValue >= 1900 && yearValue <= 2099 ? yearValue : null;

  return {
    raw,
    doi,
    year,
    firstAuthor: clean.match(AUTHOR_START)?.[1] ?? null,
    title,
    query,
    web: !doi && year === null && /\b(?:https?:\/\/|www\.)/i.test(raw),
  };
}
