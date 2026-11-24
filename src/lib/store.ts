/** The whole app state changes through this one small reducer. Project changes are pure functions from mutations.ts. */
import { logActivity } from "./mutations";
import { emptyState } from "./storage";
import type { AppState, Project } from "./types";

export type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "add"; project: Project }
  | { type: "select"; id: string }
  | { type: "delete"; id: string }
  | { type: "replace"; id: string; project: Project }
  | { type: "update"; id: string; at: string; log?: string; fn: (p: Project) => Project }
  | { type: "reset" };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "add":
      return { ...state, projects: [...state.projects, action.project], activeProjectId: action.project.id };
    case "select":
      return state.projects.some((p) => p.id === action.id) ? { ...state, activeProjectId: action.id } : state;
    case "delete": {
      const projects = state.projects.filter((p) => p.id !== action.id);
      const activeProjectId = state.activeProjectId === action.id ? (projects[0]?.id ?? null) : state.activeProjectId;
      return { ...state, projects, activeProjectId };
    }
    case "replace":
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.id ? action.project : p)),
        activeProjectId: state.activeProjectId === action.id ? action.project.id : state.activeProjectId,
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
      return emptyState();
  }
}
