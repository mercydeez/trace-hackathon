/** Outbound HTTP for the provider adapters: fixed hosts only, a timeout, and at most one retry. */
import { NextResponse } from "next/server";
import { HTTP_STATUS } from "../api";
import type { Outcome } from "../types";

const ALLOWED_HOSTS = new Set(["api.crossref.org", "api.openalex.org", "api.datacite.org"]);

export interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

async function once(url: string, opts: FetchOptions): Promise<Outcome<unknown>> {
  let res: Response;
  try {
    res = await fetch(url, { headers: opts.headers, signal: AbortSignal.timeout(opts.timeoutMs ?? 8000) });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    return name === "TimeoutError" || name === "AbortError"
      ? { ok: false, kind: "timeout", message: "The provider did not answer in time." }
      : { ok: false, kind: "unavailable", message: "The provider could not be reached." };
  }
  if (res.status === 404) return { ok: false, kind: "not_found", message: "The provider has no record for this request." };
  if (res.status === 429) return { ok: false, kind: "rate_limited", message: "The provider is rate limiting requests. Wait a moment and try again." };
  if (res.status >= 500) return { ok: false, kind: "unavailable", message: `The provider reported an error (HTTP ${res.status}).` };
  if (!res.ok) return { ok: false, kind: "bad_request", message: `The provider rejected the request (HTTP ${res.status}).` };
  try {
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, kind: "malformed", message: "The provider sent an answer that could not be read." };
  }
}

export async function fetchJson(url: string, opts: FetchOptions = {}): Promise<Outcome<unknown>> {
  if (!ALLOWED_HOSTS.has(new URL(url).hostname)) {
    return { ok: false, kind: "bad_request", message: "That host is not one TRACE is allowed to call." };
  }
  const retries = opts.retries ?? 1;
  for (let attempt = 0; ; attempt++) {
    const outcome = await once(url, opts);
    const retryable = !outcome.ok && (outcome.kind === "timeout" || outcome.kind === "unavailable");
    if (!retryable || attempt >= retries) return outcome;
    await new Promise((r) => setTimeout(r, 400));
  }
}

/**
 * Runs calls one at a time with a minimum gap, to respect a provider's rate limit.
 * ponytail: per-process only. On serverless each instance has its own queue, so this is
 * courtesy, not a guarantee. A shared store would be needed for a real limit.
 */
export function serialQueue() {
  let chain: Promise<unknown> = Promise.resolve();
  let nextAllowed = 0;
  return function schedule<T>(gapMs: number, fn: () => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
      const wait = nextAllowed - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      try {
        return await fn();
      } finally {
        nextAllowed = Date.now() + gapMs;
      }
    });
    chain = run.catch(() => undefined);
    return run;
  };
}

/** Small best-effort cache of successful answers. Lost on restart; never shared between instances. */
export function ttlCache<T>(ttlMs: number, max: number) {
  const store = new Map<string, { at: number; value: T }>();
  return {
    get(key: string): T | undefined {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (Date.now() - hit.at > ttlMs) {
        store.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key: string, value: T) {
      if (store.size >= max) store.delete(store.keys().next().value as string);
      store.set(key, { at: Date.now(), value });
    },
  };
}

/**
 * Fixed-window request counter per key.
 * ponytail: in-memory and per-instance, so it slows abuse on one server but is not durable protection.
 */
export function rateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { start: number; count: number }>();
  return function allow(key: string): boolean {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      if (hits.size > 500) hits.clear();
      hits.set(key, { start: now, count: 1 });
      return true;
    }
    entry.count++;
    return entry.count <= limit;
  };
}

export function respond<T>(outcome: Outcome<T>): NextResponse {
  return NextResponse.json(outcome, {
    status: outcome.ok ? 200 : HTTP_STATUS[outcome.kind],
    headers: { "Cache-Control": "no-store" },
  });
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
