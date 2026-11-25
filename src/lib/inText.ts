/**
 * In-text citations in the student's own writing, and whether each one points at a source in the project.
 *
 * Recognises author–date forms used by APA and Harvard:
 *   parenthetical  (Roediger & Karpicke, 2006b) · (Adesope et al., 2017; Dunlosky et al., 2013) · (Rowland 2014, p. 3)
 *                  (World Health Organization, 2020) · (van der Berg, n.d.) · (Smith, Jones, & Brown, 2020)
 *                  (Roediger & Karpicke, 2006a, 2006b) · (see also Smith, 2020) · (as cited in Smith, 2020)
 *   narrative      Roediger and Karpicke (2006) · Adesope et al. (2017) · Smith's (2020) · Smith, Jones and Brown (2020)
 * A citation matches the lead surname, any named coauthors and the year. When two sources share
 * the authors and year, the a/b letter decides.
 *
 * Anything in brackets that has capitalised words before a year is treated as a citation. It is better to
 * flag "(Table 3, 2020)" as unknown than to let an invented "(Fabricated, n.d.)" pass unread.
 *
 * ponytail: author–date only. Numeric styles ([1]) are not recognised.
 */
import type { Source } from "./types";

export interface FoundCitation {
  raw: string;
  /** Start of the citation and exact position of its year token in the original text. */
  start: number;
  yearStart: number;
  firstAuthor: string;
  coauthors: string[];
  year: number | null;
  suffix: string;
}

export interface CitationMatch extends FoundCitation {
  sourceId: string | null;
  /** More than one source has this first author and year, and the letter did not decide between them. */
  ambiguous: boolean;
}

const PARTICLE = String.raw`(?:van|von|de|der|den|du|da|di|la|le|del|dos|ten|ter)`;
const WORD = String.raw`\p{Lu}[\p{L}'’\-]*`;
const NAME = String.raw`(?:${PARTICLE}\s+)*${WORD}`;
const YEAR = String.raw`(?:(?:1[89]\d\d|20\d\d)[a-z]?(?![\p{L}\d])|n\.d\.|in\s+press)`;
const YEARS = String.raw`${YEAR}(?:\s*,\s*${YEAR})*`;
const YEAR_G = new RegExp(YEAR, "gu");
const YEAR_ONE = new RegExp(YEAR, "u");

/** Leading words that introduce a citation rather than name an author. */
const PREFIX = /^(?:e\.g\.,?|i\.e\.,?|cf\.,?|see(?:\s+also)?,?|as\s+cited\s+in|cited\s+in|for\s+(?:a\s+)?review,?\s+see|reviewed\s+in|quoted\s+in)\s+/iu;
/** Capitalised words that start a bracket but are not authors. */
const NOT_AUTHOR = new Set(
  "january february march april may june july august september october november december spring summer autumn fall winter table figure fig phase study experiment chapter section appendix wave cohort n m sd p pp vol no ed eds".split(" "),
);
/** Sentence words that can stand before a narrative citation: "However, Smith (2020)", "In Smith (2020)". */
const SENTENCE_WORDS = new Set(
  "however therefore thus moreover furthermore similarly additionally also in for as but and yet still here there this these that recently notably indeed finally first second third overall likewise conversely meanwhile nevertheless nonetheless consequently hence accordingly while whereas although though since because when after before unlike like following per by from with see according so then later earlier today only even both each all most many some our their his her its one two a an the it we they he she what which who why how if where unless not no".split(" "),
);

function norm(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function parseYear(y: string): { year: number | null; suffix: string } {
  if (y === "n.d." || /^in\s+press$/i.test(y)) return { year: null, suffix: "" };
  return { year: Number(y.slice(0, 4)), suffix: y.slice(4) };
}

function authorNames(authors: string): string[] {
  return authors
    .replace(/['’]s$/u, "")
    .split(/\s*(?:,|&|\band\b|\bet\s+al\.?)\s*/u)
    .map((n) => n.trim())
    .filter(Boolean);
}

/** The first author named in an author list such as "Smith, Jones, & Brown", "Adesope et al." or "World Health Organization". */
/** `authorDate`: the bracket has the shape of a citation ("x, 2020", "x & y 2020", "x et al. 2020"), so even a lowercase lead is an author. */
function leadAuthor(authors: string, narrative: boolean, authorDate = false): string | null {
  const names = authorNames(authors);
  for (const name of names) {
    let words = name.split(/\s+/);
    // In running text, drop sentence words before the name: "However Smith" → "Smith".
    if (narrative) while (words.length > 1 && SENTENCE_WORDS.has(words[0]!.toLowerCase())) words = words.slice(1);
    if (narrative && words.length === 1 && SENTENCE_WORDS.has(words[0]!.toLowerCase())) continue;
    const lead = words.join(" ").replace(/['’]s$/u, "");
    if (NOT_AUTHOR.has(words[0]!.replace(/\.$/, "").toLowerCase())) return null;
    if (new RegExp(`^${NAME}(?:\\s+${NAME})*$`, "u").test(lead)) return lead;
    // In brackets, an author TRACE cannot read ("U.S. Dept. of Ed.") is still a citation: it is kept as
    // written, matches no source, and is flagged rather than silently skipped.
    if (narrative) return null;
    if (/^\p{Lu}/u.test(lead)) return lead;
    // Lowercase leads: "al-Rashid", "d’Fake", "ibn Fake", or anything written as "name, 2020". Unknown ones are flagged, not skipped.
    const nameLike = authorDate || /^\p{Ll}{1,4}(?:[-’']|\s+)\p{Lu}/u.test(lead);
    return nameLike && !SENTENCE_WORDS.has(words[0]!.toLowerCase()) ? lead : null;
  }
  return null;
}

/** One bracketed part such as "Roediger & Karpicke, 2006a, 2006b" or "see Adesope et al. 2017, p. 4". */
function parsePart(part: string) {
  const text = part.trimStart().replace(PREFIX, "");
  const at = text.search(YEAR_ONE);
  if (at <= 0) return null;
  const authors = text.slice(0, at).replace(/[\s,]+$/u, "");
  const authorDate = /,\s*$/u.test(text.slice(0, at)) || /&|\bet\s+al\b/u.test(authors);
  const firstAuthor = leadAuthor(authors, false, authorDate);
  if (!firstAuthor) return null;
  // Years run until the first thing that is not a year: a page number, a colon, a note.
  const run = text.slice(at).match(new RegExp(`^${YEARS}`, "u"))?.[0] ?? "";
  return { authors, firstAuthor, coauthors: authorNames(authors).slice(1), years: [...run.matchAll(YEAR_G)], yearOffset: part.length - text.length + at };
}

const PARENS = /\(([^()]{4,240})\)/g;
const NARRATIVE = new RegExp(
  String.raw`(${NAME}(?:(?:\s*,\s*|,?\s+(?:&|and)\s+|\s+)${NAME})*(?:\s+et\s+al\.?)?(?:['’]s)?)\s+\((${YEARS})(?:\s*,\s*(?:p|pp|para)\.\s*[\d\-–]+)?\)`,
  "gu",
);

export function findCitations(text: string): FoundCitation[] {
  const found: FoundCitation[] = [];
  const taken: [number, number][] = [];

  for (const m of text.matchAll(PARENS)) {
    const inner = m[1] ?? "";
    const start = m.index ?? 0;
    let offset = start + 1;
    let any = false;
    for (const part of inner.split(";")) {
      const parsed = parsePart(part);
      if (parsed) {
        const partStart = offset + (part.length - part.trimStart().length);
        for (const year of parsed.years) {
          const [token] = year;
          const raw = parsed.years.length > 1 ? `${parsed.authors}, ${token}` : part.trim();
          found.push({ raw, start: partStart, yearStart: offset + parsed.yearOffset + year.index, firstAuthor: parsed.firstAuthor, coauthors: parsed.coauthors, ...parseYear(token) });
        }
        any = true;
      }
      offset += part.length + 1;
    }
    if (any) taken.push([start, start + m[0].length]);
  }

  for (const m of text.matchAll(NARRATIVE)) {
    const start = m.index ?? 0;
    if (taken.some(([a, b]) => start >= a && start < b)) continue;
    const firstAuthor = leadAuthor(m[1] ?? "", true);
    if (!firstAuthor) continue;
    // Start the citation at its first author, after any sentence words the pattern took in.
    const skip = Math.max(0, m[0].indexOf(firstAuthor));
    const years = [...(m[2] ?? "").matchAll(YEAR_G)];
    const coauthors = authorNames(m[1]?.slice(skip) ?? "").slice(1);
    for (const year of years) {
      found.push({ raw: years.length > 1 ? `${firstAuthor} (${year[0]})` : m[0].slice(skip), start: start + skip, yearStart: start + m[0].indexOf("(") + 1 + year.index, firstAuthor, coauthors, ...parseYear(year[0]) });
    }
  }

  return found.sort((a, b) => a.start - b.start);
}

/**
 * The a/b letter each source gets in an author–date reference list: works with the same authors and
 * year are ordered by title and lettered in that order (APA 7, 9.47). Computed from stored details, so
 * the export gate, the export and the writing space all read the same letters.
 * ponytail: author lists compared in full; APA's "add more names" rule for et al. collisions is not modelled.
 */
export function yearLetters(sources: Source[]): Map<string, string> {
  const groups = new Map<string, Source[]>();
  for (const s of sources) {
    if (!s.cited.authors.length) continue;
    const key = `${s.cited.authors.map((a) => norm(a.family)).join("|")}#${s.cited.year ?? "nd"}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const letters = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    [...group]
      .sort((a, b) => a.cited.title.toLowerCase().localeCompare(b.cited.title.toLowerCase()))
      .forEach((s, n) => letters.set(s.id, String.fromCharCode(97 + n)));
  }
  return letters;
}

/** Matches each citation to a source. Same-author, same-year sources are told apart by their letter. */
export function matchCitations(found: FoundCitation[], sources: Source[], letters: Map<string, string> = yearLetters(sources)): CitationMatch[] {
  return found.map((f) => {
    // "Recent Rowland" may be a sentence word plus a surname: try the full name, then shorter endings of it.
    const words = f.firstAuthor.split(/\s+/);
    let candidates: Source[] = [];
    for (let n = 0; n < words.length && candidates.length === 0; n++) {
      const name = norm(words.slice(n).join(" "));
      candidates = sources.filter((s) => norm(s.cited.authors[0]?.family ?? "") === name && s.cited.year === f.year);
    }
    if (f.coauthors.length) {
      candidates = candidates.filter((s) => f.coauthors.every((coauthor, index) => norm(coauthor) === norm(s.cited.authors[index + 1]?.family ?? "")));
    }
    if (f.suffix) {
      const matching = candidates.filter((s) => letters.get(s.id) === f.suffix);
      return { ...f, sourceId: matching.length === 1 ? matching[0]!.id : null, ambiguous: matching.length > 1 };
    }
    return { ...f, sourceId: candidates.length === 1 ? candidates[0]!.id : null, ambiguous: candidates.length > 1 };
  });
}

/** The a/b letter a reference list gives a source, read from its formatted in-text citation, e.g. "(Roediger & Karpicke, 2006b)" → "b". */
export function suffixOf(inText: string): string {
  return inText.match(/(?:1[89]\d\d|20\d\d)([a-z]?)\)?\s*$/)?.[1] ?? "";
}
