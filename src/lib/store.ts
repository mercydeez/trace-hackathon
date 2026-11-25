/** The whole app state changes through this one small reducer. Project changes are pure functions from mutations.ts. */
import { logActivity } from "./mutations";
import { emptyState } from "./storage";
import type { AppState, Project } from "./types";

export type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "merge"; state: AppState }
  | { type: "add"; project: Project }
  | { type: "select"; id: string }
  | { type: "delete"; id: string }
  | { type: "replace"; id: string; project: Project }
  | { type: "update"; id: string; at: string; log?: string; fn: (p: Project) => Project }
  | { type: "reset" };

// Ids are ~20 characters, so even the cap costs only a few kilobytes of storage. A project older than
// the cap could reappear only if a tab that still held it stayed open through this many deletions.
const MAX_DELETED_IDS = 1000;
const withDeleted = (state: AppState, ...ids: string[]) => [...(state.deletedIds ?? []), ...ids].slice(-MAX_DELETED_IDS);

/**
 * Fold another tab's saved state into this tab's. Two tabs share one browser storage key, so each save
 * would otherwise replace the other tab's work. Per project the newer `updatedAt` wins, projects that
 * exist in only one tab are kept, and deleted ids stay deleted. Returns `local` itself when nothing changed.
 * ponytail: whole-project last-writer-wins. Edits to one project made in two tabs inside the same
 * moment still overwrite each other; field-level merging would be needed to go further.
 */
export function mergeStates(local: AppState, remote: AppState): AppState {
  const gone = new Set([...(local.deletedIds ?? []), ...(remote.deletedIds ?? [])]);
  const remoteById = new Map(remote.projects.map((p) => [p.id, p]));
  const projects = local.projects.map((p) => {
    const r = remoteById.get(p.id);
    if (!r || r.updatedAt < p.updatedAt) return p;
    if (r.updatedAt > p.updatedAt) return r;
    // Same timestamp, different content: both tabs must pick the same winner, or they would keep writing back.
    const [mine, theirs] = [JSON.stringify(p), JSON.stringify(r)];
    return theirs > mine ? r : p;
  });
  const have = new Set(projects.map((p) => p.id));
  projects.push(...remote.projects.filter((p) => !have.has(p.id)));
  const kept = projects.filter((p) => !gone.has(p.id));
  const exists = (id: string | null) => id !== null && kept.some((p) => p.id === id);
  const activeProjectId = exists(local.activeProjectId) ? local.activeProjectId : exists(remote.activeProjectId) ? remote.activeProjectId : (kept[0]?.id ?? null);
  const deletedIds = [...gone].slice(-MAX_DELETED_IDS);
  const merged: AppState = { ...local, projects: kept, activeProjectId, ...(deletedIds.length ? { deletedIds } : {}) };
  return JSON.stringify(merged) === JSON.stringify(local) ? local : merged;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "merge":
      return mergeStates(state, action.state);
    case "add":
      return { ...state, projects: [...state.projects, action.project], activeProjectId: action.project.id };
    case "select":
      return state.projects.some((p) => p.id === action.id) ? { ...state, activeProjectId: action.id } : state;
    case "delete": {
      const projects = state.projects.filter((p) => p.id !== action.id);
      const activeProjectId = state.activeProjectId === action.id ? (projects[0]?.id ?? null) : state.activeProjectId;
      return { ...state, projects, activeProjectId, deletedIds: withDeleted(state, action.id) };
    }
    case "replace":
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.id ? action.project : p)),
        activeProjectId: state.activeProjectId === action.id ? action.project.id : state.activeProjectId,
        // A replacement with a new id retires the old one, so another tab does not restore it.
        ...(action.project.id !== action.id ? { deletedIds: withDeleted(state, action.id) } : {}),
      };
    case "update":
      return {
        ...state,
        projects: state.projects.map((p) => {
          if (p.id !== action.id) return p;
          const next = action.fn(p);
          // A log line is recorded even when the project itself is unchanged (for example, an export).
          if (action.log) return logActivity(next, action.at, action.log);
          return next === p ? p : { ...next, updatedAt: action.at };
        }),
      };
    case "reset":
      return { ...emptyState(), deletedIds: withDeleted(state, ...state.projects.map((p) => p.id)) };
  }
}
