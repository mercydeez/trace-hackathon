/**
 * Reference identity: do the details the student cites agree with the registry record for that DOI?
 *
 * A match means the cited title, first author and year agree with Crossref's record. It does not
 * mean the paper is good, or that any claim about it is supported. Nothing here repairs metadata:
 * disagreements are reported, and only an explicit student action changes the cited values.
 */
import type { Biblio, RegistryRecord, Source } from "./types";

export type IdentityStatus = "matched" | "mismatch" | "not_found" | "could_not_check" | "user_entered";
export type IdentityField = "title" | "first_author" | "year" | "venue";
export type RegistryName = "Crossref" | "DataCite";

export interface FieldCheck {
  field: IdentityField;
  verdict: "match" | "note" | "mismatch";
  cited: string;
  registry: string;
  message: string;
}

export interface Identity {
  status: IdentityStatus;
  /** Separate from the details check: a real, correctly cited paper can still be retracted. */
  retraction: RegistryRecord["retraction"] | null;
  fields: FieldCheck[];
  summary: string;
  registryRetrievedAt: string | null;
  /** The registry whose record was compared: Crossref, or DataCite when Crossref has none. Null when nothing was compared. */
  registry: RegistryName | null;
  /**
   * Matched, but the title, first author or year is only a near match (wording, author count, an
   * alternative year). Shown as "partial" rather than a verified match; the export gate is unaffected.
   */
  partial: boolean;
}

function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function jaccard(a: string, b: string): number {
  const A = new Set(a.split(" ").filter(Boolean));
  const B = new Set(b.split(" ").filter(Boolean));
  if (A.size === 0 && B.size === 0) return 1;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / (A.size + B.size - shared);
}

function checkTitle(cited: Biblio, reg: RegistryRecord): FieldCheck {
  const a = norm(cited.title);
  const b = norm(reg.title);
  const base = { field: "title" as const, cited: cited.title || "(none)", registry: reg.title || "(none)" };
  if (b === "") return { ...base, verdict: "note", message: "The registry lists no title, so the title cannot be compared." };
  if (a === b && a !== "") return { ...base, verdict: "match", message: "Title agrees with the registry." };
  if (a !== "" && jaccard(a, b) >= 0.8) {
    return { ...base, verdict: "note", message: "Title differs slightly from the registry. Check the wording." };
  }
  // Registries often store the subtitle separately ("Test-Enhanced Learning" for "Test-enhanced learning: Taking
  // memory tests…"). The same main title is a point to check, not a different paper.
  const main = (s: string) => norm(s.split(/:\s/)[0] ?? s);
  if (a !== "" && main(cited.title) !== "" && main(cited.title) === main(reg.title)) {
    return { ...base, verdict: "note", message: "Main title agrees; the subtitle differs or is missing in the registry. Check the wording." };
  }
  return { ...base, verdict: "mismatch", message: "Title does not match the registry record for this DOI." };
}

function checkFirstAuthor(cited: Biblio, reg: RegistryRecord): FieldCheck {
  const c = cited.authors[0]?.family ?? "";
  const r = reg.authors[0]?.family ?? "";
  const base = { field: "first_author" as const, cited: c || "(none)", registry: r || "(none)" };
  if (r === "") {
    return { ...base, verdict: "note", message: "The registry lists no authors, so the first author cannot be compared." };
  }
  if (norm(c) !== norm(r)) {
    return { ...base, verdict: "mismatch", message: "First author does not match the registry record for this DOI." };
  }
  if (cited.authors.length !== reg.authors.length) {
    return {
      ...base,
      verdict: "note",
      message: `First author agrees, but you cite ${cited.authors.length} author(s) and the registry lists ${reg.authors.length}.`,
    };
  }
  return { ...base, verdict: "match", message: "First author agrees with the registry." };
}

function checkYear(cited: Biblio, reg: RegistryRecord): FieldCheck {
  const labelled = (["print", "online", "issued"] as const)
    .filter((k) => reg.years[k] !== undefined)
    .map((k) => ({ kind: k, year: reg.years[k] as number }));
  const distinct = [...new Set(labelled.map((l) => l.year))];
  const registry = labelled.length ? labelled.map((l) => `${l.kind} ${l.year}`).join(", ") : "(none)";
  const base = { field: "year" as const, cited: cited.year === null ? "(none)" : String(cited.year), registry };

  if (distinct.length === 0) {
    return { ...base, verdict: "note", message: "The registry lists no publication year, so the year cannot be compared." };
  }
  if (cited.year === null) {
    return { ...base, verdict: "note", message: "No year is cited. The registry lists one." };
  }
  if (!distinct.includes(cited.year)) {
    return { ...base, verdict: "mismatch", message: "Year does not match any date the registry lists for this DOI." };
  }
  if (distinct.length > 1) {
    const which = labelled.filter((l) => l.year === cited.year).map((l) => l.kind).join("/");
    return {
      ...base,
      verdict: "note",
      message: `The registry lists more than one year. Your year matches the ${which} date. Check which one your citation style wants.`,
    };
  }
  return { ...base, verdict: "match", message: "Year agrees with the registry." };
}

function checkVenue(cited: Biblio, reg: RegistryRecord): FieldCheck {
  const a = norm(cited.container ?? "");
  const b = norm(reg.container ?? "");
  const base = { field: "venue" as const, cited: cited.container || "(none)", registry: reg.container || "(none)" };
  if (a === b) return { ...base, verdict: "match", message: "Venue agrees with the registry." };
  // Journal names are often abbreviated, so a difference is flagged for a look rather than treated as a failure.
  return { ...base, verdict: "note", message: "Venue is written differently from the registry. It may be an abbreviation." };
}

export function compareMetadata(cited: Biblio, registry: RegistryRecord): FieldCheck[] {
  return [checkTitle(cited, registry), checkFirstAuthor(cited, registry), checkYear(cited, registry), checkVenue(cited, registry)];
}

export function sourceIdentity(source: Source): Identity {
  if (!source.doi) {
    return {
      status: "user_entered",
      registry: null,
      partial: false,
      fields: [],
      summary: "Entered by hand. Not checked against any registry.",
      registryRetrievedAt: null,
      retraction: null,
    };
  }
  if (source.registry && source.lookup.status !== "not_found") {
    const fields = compareMetadata(source.cited, source.registry.record);
    const mismatches = fields.filter((f) => f.verdict === "mismatch").length;
    const notes = fields.filter((f) => f.verdict === "note").length;
    const stale = source.lookup.status === "could_not_check" ? " The last refresh failed, so this uses the earlier record." : "";
    const date = source.registry.retrievedAt.slice(0, 10);
    const registry: RegistryName = source.registry.provider === "datacite" ? "DataCite" : "Crossref";
    return {
      status: mismatches ? "mismatch" : "matched",
      registry,
      partial: !mismatches && fields.some((f) => f.verdict === "note" && f.field !== "venue"),
      fields,
      summary: mismatches
        ? `${mismatches} cited detail(s) disagree with the ${registry} record retrieved ${date}.${stale}`
        : `Cited details agree with the ${registry} record retrieved ${date}${notes ? `, with ${notes} point(s) to check` : ""}.${stale}`,
      registryRetrievedAt: source.registry.retrievedAt,
      retraction: source.registry.record.retraction ?? null,
    };
  }
  if (source.lookup.status === "not_found") {
    return {
      status: "not_found",
      registry: null,
      partial: false,
      fields: [],
      summary:
        "Not found in Crossref. That does not show the paper is fake: it may be registered elsewhere, or the DOI may be mistyped.",
      registryRetrievedAt: source.registry?.retrievedAt ?? null,
      retraction: source.registry?.record.retraction ?? null,
    };
  }
  if (source.lookup.status === "could_not_check") {
    return {
      status: "could_not_check",
      registry: null,
      partial: false,
      fields: [],
      summary: `Could not check: ${source.lookup.detail ?? "the registry did not answer"}. Try again later.`,
      registryRetrievedAt: null,
      retraction: null,
    };
  }
  return {
    status: "user_entered",
      registry: null,
      partial: false,
    fields: [],
    summary: "A DOI is recorded but has not been checked against the registry yet.",
    registryRetrievedAt: null,
    retraction: null,
  };
}
