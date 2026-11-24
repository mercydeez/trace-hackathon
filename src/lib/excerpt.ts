/**
 * Excerpt integrity: is the quoted excerpt actually present in the stored evidence text?
 *
 * This is deterministic string matching. A match shows that the words are in the stored text.
 * It does not show that the paper is right, or that the claim follows from the words.
 *
 * Harmless differences are normalised away (Unicode forms, curly quotes, dash variants,
 * whitespace, invisible characters, letter case). Digits, negations and punctuation are kept,
 * so "1 week" never matches "2 weeks" and "did not" never matches "did".
 */

export const MIN_EXCERPT_CHARS = 12;

const SINGLE_QUOTES = /[‘’‚‛′`´]/g;
const DOUBLE_QUOTES = /[“”„‟″«»]/g;
const DASHES = /[‐‑‒–—―−]/g;
const INVISIBLE = /[­​‌‍⁠﻿]/;

export type ExcerptCheck =
  | { status: "matched"; start: number; end: number }
  | { status: "mismatch"; nearest: { start: number; end: number } | null }
  | { status: "not_checkable"; reason: "no_evidence" | "no_excerpt" | "too_short" };

/** Normalised text plus, for every normalised character, the index of the original character it came from. */
export function normaliseWithMap(input: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  let i = 0;
  for (const ch of input) {
    const start = i;
    i += ch.length;
    if (INVISIBLE.test(ch)) continue;
    const out = ch
      .normalize("NFKC")
      .replace(SINGLE_QUOTES, "'")
      .replace(DOUBLE_QUOTES, '"')
      .replace(DASHES, "-")
      .toLowerCase();
    for (const o of out) {
      const c = /\s/.test(o) ? " " : o;
      if (c === " " && (norm.length === 0 || norm.endsWith(" "))) continue;
      norm += c;
      for (let k = 0; k < c.length; k++) map.push(start);
    }
  }
  while (norm.endsWith(" ")) {
    norm = norm.slice(0, -1);
    map.pop();
  }
  return { norm, map };
}

/** Drop wrapping quotation marks and ellipses a writer or model may add around a quotation. */
export function cleanExcerpt(excerpt: string): string {
  const wrap = "(?:[\"'‘’“”«»]|\\.{3}|…|\\s)+";
  return excerpt.replace(new RegExp(`^${wrap}`), "").replace(new RegExp(`${wrap}$`), "");
}

function originalEnd(original: string, map: number[], lastNormIndex: number): number {
  const at = map[lastNormIndex] ?? 0;
  const cp = original.codePointAt(at) ?? 0;
  return at + (cp > 0xffff ? 2 : 1);
}

/** Longest run of characters the two strings share; used only to point at the closest real passage. */
function longestCommonSubstring(a: string, b: string): { aStart: number; length: number } {
  let prev = new Uint16Array(b.length + 1);
  let cur = new Uint16Array(b.length + 1);
  let best = 0;
  let bestEnd = 0;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        const len = (prev[j - 1] ?? 0) + 1;
        cur[j] = len;
        if (len > best) {
          best = len;
          bestEnd = i;
        }
      } else {
        cur[j] = 0;
      }
    }
    [prev, cur] = [cur, prev];
  }
  return { aStart: bestEnd - best, length: best };
}

export function checkExcerpt(excerpt: string, evidenceText: string | null | undefined): ExcerptCheck {
  if (!evidenceText || !evidenceText.trim()) return { status: "not_checkable", reason: "no_evidence" };
  const cleaned = cleanExcerpt(excerpt);
  if (!cleaned) return { status: "not_checkable", reason: "no_excerpt" };
  const ex = normaliseWithMap(cleaned);
  if (ex.norm.length < MIN_EXCERPT_CHARS) return { status: "not_checkable", reason: "too_short" };

  const ev = normaliseWithMap(evidenceText);
  const at = ev.norm.indexOf(ex.norm);
  if (at >= 0) {
    return {
      status: "matched",
      start: ev.map[at] ?? 0,
      end: originalEnd(evidenceText, ev.map, at + ex.norm.length - 1),
    };
  }

  // ponytail: contiguous excerpts only; no support for quotations joined with an ellipsis.
  const lcs = longestCommonSubstring(ev.norm, ex.norm);
  const nearest =
    lcs.length >= MIN_EXCERPT_CHARS
      ? {
          start: ev.map[lcs.aStart] ?? 0,
          end: originalEnd(evidenceText, ev.map, lcs.aStart + lcs.length - 1),
        }
      : null;
  return { status: "mismatch", nearest };
}
