/** Shapes shared by the API routes and the browser, plus the browser-side fetch helper. */
import type { Biblio, Outcome, RegistryRecord } from "./types";

/** One work as returned by the registry, already normalised. `url` never contains contact details. */
export interface WorkRecord {
  doi: string;
  record: RegistryRecord;
  /** Plain-text abstract when the registry has one, otherwise null. */
  abstract: string | null;
  retrievedAt: string;
  url: string;
  /** Set when the record found is not for exactly the DOI that was typed. */
  note?: string;
}

export interface SearchResult {
  items: WorkRecord[];
  total: number;
  query: string;
}

export interface AbstractResult {
  text: string;
  retrievedAt: string;
  url: string;
}

export interface DraftResult {
  raw: unknown;
  model: string;
}

export interface CitableInput {
  id: string;
  doi: string | null;
  cited: Biblio;
  /** ISO date the student saved the source. Used as the retrieval date APA 7 asks for on undated web pages. */
  accessed?: string;
}

export interface FormattedReference {
  id: string;
  /** The APA 7 reference split into plain and italic runs, for safe rendering without HTML injection. */
  parts: { text: string; italic: boolean }[];
  text: string;
  inText: string;
}

export interface StatusResult {
  ai: { configured: boolean; model: string };
  crossrefPolitePool: boolean;
  openAlexKey: boolean;
}

export const HTTP_STATUS: Record<Exclude<Outcome<never>, { ok: true }>["kind"], number> = {
  not_found: 404,
  rate_limited: 429,
  timeout: 504,
  unavailable: 502,
  no_key: 503,
  malformed: 502,
  bad_request: 400,
};

/** Browser side: call one of TRACE's own routes. A failed request is "unavailable", never "not found". */
export async function callApi<T>(path: string, init?: RequestInit): Promise<Outcome<T>> {
  try {
    const res = await fetch(path, init);
    const body = (await res.json()) as Outcome<T>;
    if (body && typeof body === "object" && "ok" in body) return body;
    return { ok: false, kind: "malformed", message: "The TRACE server sent an answer that could not be read." };
  } catch {
    return {
      ok: false,
      kind: "unavailable",
      message: "Could not reach the TRACE server. Check the connection and try again.",
    };
  }
}
