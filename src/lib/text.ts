/** Small text helpers shared by client and server. No dependencies. */

/**
 * Change-detection hash (cyrb53). Used for evidence versions and approval fingerprints.
 * ponytail: not cryptographic; swap for SHA-256 if tamper resistance ever becomes a goal.
 */
export function hashText(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

export function newId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_${Array.from(bytes, (b) => (b % 36).toString(36)).join("")}`;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1]?.toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/**
 * Crossref deposits abstracts as JATS XML. Remove the markup and keep the words.
 * A bare "Abstract" heading is dropped; other section headings become "Heading: ".
 */
export function jatsToText(jats: string): string {
  const text = jats
    .replace(/<jats:title>\s*abstract\s*<\/jats:title>/gi, " ")
    .replace(/<jats:title>([\s\S]*?)<\/jats:title>/gi, "$1: ")
    .replace(/<\/jats:p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

/** OpenAlex ships abstracts as word -> positions. Rebuild the running text. */
export function invertedIndexToText(index: Record<string, number[]>): string {
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) words[pos] = word;
  }
  return words.filter((w) => w !== undefined).join(" ").trim();
}

export function formatAuthorsShort(authors: { family: string }[], year: number | null): string {
  const y = year ?? "n.d.";
  const [a, b] = authors;
  if (!a) return `Unknown author (${y})`;
  if (authors.length === 1) return `${a.family} (${y})`;
  if (authors.length === 2 && b) return `${a.family} & ${b.family} (${y})`;
  return `${a.family} et al. (${y})`;
}
