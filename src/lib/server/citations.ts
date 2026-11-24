/**
 * APA 7 formatting with Citation.js (CSL engine + the bundled "apa" style, APA 7th edition).
 * References are produced from stored metadata only. No language model writes any part of them.
 */
import { Cite } from "@citation-js/core";
import "@citation-js/plugin-csl";
import type { CitableInput, FormattedReference } from "../api";
import { toCsl } from "../csl";

const OPTIONS = { template: "apa", lang: "en-US" } as const;

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/** Citeproc HTML -> runs of plain and italic text, so the UI never has to inject HTML. */
export function htmlToParts(html: string): FormattedReference["parts"] {
  const parts: FormattedReference["parts"] = [];
  let italic = false;
  for (const token of html.split(/(<\/?i>)/i)) {
    if (/^<i>$/i.test(token)) italic = true;
    else if (/^<\/i>$/i.test(token)) italic = false;
    else {
      const text = decode(token.replace(/<[^>]+>/g, ""));
      if (text) parts.push({ text, italic });
    }
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (first) first.text = first.text.trimStart();
  if (last) last.text = last.text.trimEnd();
  return parts.filter((p) => p.text);
}

export function formatApa(inputs: CitableInput[]): FormattedReference[] {
  if (inputs.length === 0) return [];
  const cite = new Cite(inputs.map(toCsl));
  // Entries come back in bibliography (alphabetical) order, with year suffixes (2006a, 2006b) already applied.
  const entries = cite.format("bibliography", { ...OPTIONS, format: "html", asEntryArray: true }) as [string, string][];
  const ids = inputs.map((i) => i.id);
  return entries.map(([id, html]) => {
    const parts = htmlToParts(html);
    // The other references are passed as context: without them the processor cannot know that two
    // works share authors and year, and would print "(2006)" for both instead of 2006a / 2006b.
    const inText = String(
      cite.format("citation", { ...OPTIONS, format: "text", entry: id, citationsPost: ids.filter((x) => x !== id) }),
    ).trim();
    return { id, parts, text: parts.map((p) => p.text).join(""), inText };
  });
}
