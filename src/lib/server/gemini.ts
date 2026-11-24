/**
 * The one live AI provider: a single structured drafting call to the Gemini API.
 *
 * Kept behind this one function so the provider can be swapped on the day without touching
 * anything else. The key stays on the server and is never logged or returned.
 *
 * Free-tier note (Gemini API terms, checked 24 Nov 2026): content sent on the free tier may be
 * used to improve Google's products and may be read by human reviewers. TRACE sends only the
 * research question and the passages the student approved.
 */
import { ApiError, GoogleGenAI } from "@google/genai";
import type { DraftResult } from "../api";
import { DRAFT_JSON_SCHEMA, type DraftPayload } from "../prompt";
import type { Outcome } from "../types";

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 2;

export function aiConfig(): { configured: boolean; model: string } {
  return {
    configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
  };
}

type Failure = Extract<Outcome<never>, { ok: false }>;

function classify(err: unknown): Failure & { retry: boolean } {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return { ok: false, kind: "rate_limited", retry: false, message: "The AI provider's rate limit or free quota was reached. Wait and retry, or continue manually." };
    }
    if (err.status === 408 || err.status >= 500) {
      return { ok: false, kind: "unavailable", retry: true, message: `The AI provider reported an error (HTTP ${err.status}).` };
    }
    if (err.status === 401 || err.status === 403) {
      return { ok: false, kind: "no_key", retry: false, message: "The AI provider refused the configured key. Check GEMINI_API_KEY on the server." };
    }
    return { ok: false, kind: "bad_request", retry: false, message: `The AI provider rejected the request (HTTP ${err.status}).` };
  }
  const name = err instanceof Error ? err.name : "";
  if (/timeout|abort/i.test(name)) {
    return { ok: false, kind: "timeout", retry: true, message: "The AI provider did not answer in time." };
  }
  return { ok: false, kind: "unavailable", retry: true, message: "The AI provider could not be reached." };
}

export async function draftWithGemini(payload: DraftPayload): Promise<Outcome<DraftResult>> {
  const key = process.env.GEMINI_API_KEY?.trim();
  const { model } = aiConfig();
  if (!key) {
    return { ok: false, kind: "no_key", message: "Live AI is not configured on this server (no GEMINI_API_KEY)." };
  }
  const client = new GoogleGenAI({ apiKey: key });

  for (let attempt = 1; ; attempt++) {
    try {
      const interaction = await client.interactions.create(
        {
          model,
          input: payload.user,
          system_instruction: payload.system,
          response_format: { type: "text", mime_type: "application/json", schema: DRAFT_JSON_SCHEMA },
          generation_config: { max_output_tokens: 2000 },
          store: false,
        },
        { timeout_ms: TIMEOUT_MS, maxRetries: 0 },
      );
      const text = interaction.output_text;
      if (!text) return { ok: false, kind: "malformed", message: "The AI provider returned no text." };
      try {
        return { ok: true, data: { raw: JSON.parse(text), model } };
      } catch {
        return { ok: false, kind: "malformed", message: "The AI provider's answer was not valid JSON." };
      }
    } catch (err) {
      const { retry, ...failure } = classify(err);
      if (!retry || attempt >= MAX_ATTEMPTS) return failure;
    }
  }
}
