/**
 * In-text citations in the student's own writing, and whether each one points at a source in the project.
 *
 * Recognises author–date forms used by APA and Harvard:
 *   parenthetical  (Roediger & Karpicke, 2006b) · (Adesope et al., 2017; Dunlosky et al., 2013) · (Rowland 2014, p. 3)
 *   narrative      Roediger and Karpicke (2006) · Adesope et al. (2017)
 * A citation matches a source when the first author's surname and the year agree. The a/b letter is
 * compared separately and only produces a note, because letters depend on the final reference list.
 *
 * ponytail: author–date only. Numeric styles ([1]) and citations without a year are not recognised.
 */
import type { Source } from "./types";

export interface FoundCitation {
  raw: string;
  /** Offset of `raw` in the text. */
  start: number;
  firstAuthor: string;
  year: number | null;
  suffix: string;
}

export interface CitationMatch extends FoundCitation {
  sourceId: string | null;
  /** More than one source has this first author and year, and the letter did not decide between them. */
  ambiguous: boolean;
}

const NAME = String.raw`\p{Lu}[\p{L}'’\-]+(?:\s(?:van|von|de|der|den|du|da|di|la|le)\s\p{Lu}[\p{L}'’\-]+)?`;
const YEAR = String.raw`(?:1[89]\d\d|20\d\d)[a-z]?|n\.d\.`;

function norm(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function parseYear(y: string): { year: number | null; suffix: string } {
  if (y === "n.d.") return { year: null, suffix: "" };
  return { year: Number(y.slice(0, 4)), suffix: y.slice(4) };
}

/** One author–date part such as "Roediger & Karpicke, 2006b" or "Adesope et al. 2017, p. 4". */
const PART = new RegExp(String.raw`^\s*(?:e\.g\.,?\s*|see\s+|cf\.\s*)?(${NAME})(?:\s*(?:,|&|and)\s*${NAME})*(?:\s+et\s+al\.?)?,?\s+(${YEAR})\b`, "u");
const PARENS = /\(([^()]{4,240})\)/g;
const NARRATIVE = new RegExp(String.raw`(${NAME})(?:\s+(?:&|and)\s+${NAME}|\s+et\s+al\.?)?\s+\((${YEAR})(?:,\s*p+\.\s*[\d\-–]+)?\)`, "gu");

export function findCitations(text: string): FoundCitation[] {
  const found: FoundCitation[] = [];
  const taken: [number, number][] = [];

  for (const m of text.matchAll(PARENS)) {
    const inner = m[1] ?? "";
    const start = m.index ?? 0;
    let offset = start + 1;
    let any = false;
    for (const part of inner.split(";")) {
      const pm = part.match(PART);
      if (pm && pm[1] && pm[2]) {
        const { year, suffix } = parseYear(pm[2]);
        found.push({ raw: part.trim(), start: offset + (part.length - part.trimStart().length), firstAuthor: pm[1], year, suffix });
        any = true;
      }
      offset += part.length + 1;
    }
    if (any) taken.push([start, start + m[0].length]);
  }

  for (const m of text.matchAll(NARRATIVE)) {
    const start = m.index ?? 0;
    if (taken.some(([a, b]) => start >= a && start < b)) continue;
    const { year, suffix } = parseYear(m[2] ?? "");
    found.push({ raw: m[0], start, firstAuthor: m[1] ?? "", year, suffix });
  }

  return found.sort((a, b) => a.start - b.start);
}

/**
 * `letters` maps a source id to the a/b letter the formatted reference list gives it. When two sources
 * share a first author and year, the citation's letter picks between them.
 */
export function matchCitations(found: FoundCitation[], sources: Source[], letters: Map<string, string> = new Map()): CitationMatch[] {
  return found.map((f) => {
    const candidates = sources.filter((s) => norm(s.cited.authors[0]?.family ?? "") === norm(f.firstAuthor) && s.cited.year === f.year);
    if (candidates.length <= 1) return { ...f, sourceId: candidates[0]?.id ?? null, ambiguous: false };
    const byLetter = f.suffix ? candidates.find((s) => letters.get(s.id) === f.suffix) : undefined;
    return { ...f, sourceId: (byLetter ?? candidates[0])!.id, ambiguous: !byLetter };
  });
}

/** The a/b letter a reference list gives a source, read from its formatted in-text citation, e.g. "(Roediger & Karpicke, 2006b)" → "b". */
export function suffixOf(inText: string): string {
  return inText.match(/(?:1[89]\d\d|20\d\d)([a-z]?)\)?\s*$/)?.[1] ?? "";
}
