/**
 * DOI handling. DOIs are case-insensitive, so comparison uses lower case, but the suffix may
 * contain almost any printable character (parentheses, angle brackets, semicolons, colons).
 * Nothing in the suffix is stripped here.
 */

const DOI_RE = /^10\.\d{4,9}\/\S+$/;

export function normaliseDoi(input: string): string | null {
  let s = input.trim();
  if (/%[0-9a-f]{2}/i.test(s)) {
    try {
      s = decodeURIComponent(s);
    } catch {
      /* keep the raw text */
    }
  }
  s = s
    .replace(/^(?:https?:\/\/)?(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim()
    .toLowerCase();
  return DOI_RE.test(s) ? s : null;
}

/**
 * A DOI pasted from the end of a sentence may carry punctuation that is not part of it, but a
 * DOI can also legitimately end in punctuation. So the caller looks up the DOI as given first,
 * and only tries this variant (and says so) when the registry does not know the original.
 */
export function withoutTrailingPunctuation(doi: string): string | null {
  const trimmed = doi.replace(/[.,;:)\]]+$/, "");
  return trimmed !== doi && DOI_RE.test(trimmed) ? trimmed : null;
}

export function doiUrl(doi: string): string {
  return `https://doi.org/${doi.split("/").map(encodeURIComponent).join("/")}`;
}

export function sameDoi(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && a.toLowerCase() === b.toLowerCase();
}
