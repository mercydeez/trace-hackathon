/**
 * Browser-local persistence. One key, one versioned document.
 * This is storage on this browser only: not a cloud backup, not synced, cleared with site data.
 */
import { AppStateSchema, SCHEMA_VERSION, type AppState } from "./types";

export const STORAGE_KEY = "trace.state";
export const QUARANTINE_PREFIX = "trace.quarantine.";

export type StorageProblem = "corrupt" | "version" | null;

export function emptyState(): AppState {
  return { version: SCHEMA_VERSION, projects: [], activeProjectId: null };
}

/** Pure: turn whatever was stored into a usable state, and say if the stored data had to be set aside. */
export function parseStored(raw: string | null): { state: AppState; problem: StorageProblem } {
  if (raw === null || raw === "") return { state: emptyState(), problem: null };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { state: emptyState(), problem: "corrupt" };
  }
  const version = typeof json === "object" && json !== null ? (json as { version?: unknown }).version : undefined;
  if (version !== SCHEMA_VERSION) {
    // ponytail: no migrations yet (only one schema version exists). Unknown versions are kept, not converted.
    return { state: emptyState(), problem: typeof version === "number" ? "version" : "corrupt" };
  }
  const parsed = AppStateSchema.safeParse(json);
  if (!parsed.success) return { state: emptyState(), problem: "corrupt" };
  const state = parsed.data;
  if (state.activeProjectId && !state.projects.some((p) => p.id === state.activeProjectId)) {
    state.activeProjectId = state.projects[0]?.id ?? null;
  }
  return { state, problem: null };
}

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Unreadable data is moved aside under a quarantine key rather than deleted, so it can still be recovered by hand. */
export function loadState(storage: KV): { state: AppState; problem: StorageProblem } {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: emptyState(), problem: null };
  }
  const result = parseStored(raw);
  if (result.problem && raw) {
    try {
      storage.setItem(`${QUARANTINE_PREFIX}${Date.now()}`, raw);
      storage.removeItem(STORAGE_KEY);
    } catch {
      /* storage full or blocked: nothing more can be done here */
    }
  }
  return result;
}

export function saveState(storage: KV, state: AppState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
