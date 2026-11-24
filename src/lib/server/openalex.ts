/**
 * OpenAlex adapter, used for one thing only: fetching an abstract by DOI when Crossref has none.
 * Single-work lookups are free of charge on OpenAlex's budget (checked 24 Nov 2026); search is not used.
 * OpenAlex ships abstracts as an inverted index, so the text here is rebuilt from word positions.
 */
import type { AbstractResult } from "../api";
import { invertedIndexToText } from "../text";
import type { Outcome } from "../types";
import { fetchJson, serialQueue, ttlCache } from "./http";

const schedule = serialQueue();
const cache = ttlCache<AbstractResult>(10 * 60_000, 100);

export async function lookupOpenAlexAbstract(doi: string): Promise<Outcome<AbstractResult>> {
  const path = doi.split("/").map(encodeURIComponent).join("/");
  // The stored URL is the public one; an API key, if any, is added only to the outgoing request.
  const url = `https://api.openalex.org/works/doi:${path}?select=id,abstract_inverted_index`;
  const hit = cache.get(url);
  if (hit) return { ok: true, data: hit };

  const key = process.env.OPENALEX_API_KEY?.trim();
  const outcome = await schedule(150, () => fetchJson(key ? `${url}&api_key=${encodeURIComponent(key)}` : url));
  if (!outcome.ok) {
    return outcome.kind === "not_found"
      ? { ok: false, kind: "not_found", message: "OpenAlex has no record for this DOI." }
      : outcome;
  }
  const index = (outcome.data as { abstract_inverted_index?: Record<string, number[]> | null }).abstract_inverted_index;
  const text = index ? invertedIndexToText(index) : "";
  if (!text) return { ok: false, kind: "not_found", message: "OpenAlex knows this DOI but has no abstract for it." };
  const result = { text, retrievedAt: new Date().toISOString(), url };
  cache.set(url, result);
  return { ok: true, data: result };
}
