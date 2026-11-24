"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { callApi, type CitableInput, type FormattedReference, type StatusResult } from "@/lib/api";
import { loadState, saveState, emptyState, type StorageProblem } from "@/lib/storage";
import { reducer } from "@/lib/store";
import type { AppState, Project, Source } from "@/lib/types";

interface Ctx {
  /** False until the browser's saved state has been read. Nothing is rendered from storage before that. */
  ready: boolean;
  state: AppState;
  project: Project | null;
  storageProblem: StorageProblem;
  saveFailed: boolean;
  status: StatusResult | null;
  /** Apply a pure change to the open project, optionally recording a line in its local activity history. */
  update: (fn: (p: Project) => Project, log?: string) => void;
  addProject: (p: Project) => void;
  selectProject: (id: string) => void;
  deleteProject: (id: string) => void;
  replaceProject: (id: string, p: Project) => void;
  resetAll: () => void;
  dismissStorageProblem: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [ready, setReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState<StorageProblem>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [status, setStatus] = useState<StatusResult | null>(null);

  useEffect(() => {
    // Reading localStorage must wait for the browser; this is the one place state is loaded from outside React.
    const loaded = loadState(window.localStorage);
    dispatch({ type: "hydrate", state: loaded.state });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStorageProblem(loaded.problem);
    setReady(true);
    void callApi<StatusResult>("/api/status").then((r) => r.ok && setStatus(r.data));
  }, []);

  useEffect(() => {
    if (!ready) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveFailed(!saveState(window.localStorage, state));
  }, [state, ready]);

  const activeId = state.activeProjectId;
  const project = useMemo(() => state.projects.find((p) => p.id === activeId) ?? null, [state.projects, activeId]);

  const update = useCallback(
    (fn: (p: Project) => Project, log?: string) => {
      if (activeId) dispatch({ type: "update", id: activeId, at: new Date().toISOString(), log, fn });
    },
    [activeId],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      state,
      project,
      storageProblem,
      saveFailed,
      status,
      update,
      addProject: (p) => dispatch({ type: "add", project: p }),
      selectProject: (id) => dispatch({ type: "select", id }),
      deleteProject: (id) => dispatch({ type: "delete", id }),
      replaceProject: (id, p) => dispatch({ type: "replace", id, project: p }),
      resetAll: () => dispatch({ type: "reset" }),
      dismissStorageProblem: () => setStorageProblem(null),
    }),
    [ready, state, project, storageProblem, saveFailed, status, update],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** The open project. Components that call this are only rendered when one is open. */
export function useProject(): Project {
  const { project } = useStore();
  if (!project) throw new Error("No project is open");
  return project;
}

export interface References {
  byId: Map<string, FormattedReference>;
  ordered: FormattedReference[];
  state: "idle" | "loading" | "ok" | "error";
  message: string | null;
}

const NO_REFS: References = { byId: new Map(), ordered: [], state: "idle", message: null };

/**
 * APA 7 references for a set of sources, formatted on the server by Citation.js.
 * "list" formats them as one reference list; "each" formats every source by itself.
 */
export function useReferences(sources: Source[], mode: "list" | "each"): References {
  // The request body as a string: the effect below then re-runs only when the content changes,
  // not whenever a caller passes a freshly built array.
  const body =
    sources.length === 0
      ? ""
      : JSON.stringify({ mode, items: sources.map((s): CitableInput => ({ id: s.id, doi: s.doi, cited: s.cited, accessed: s.addedAt })) });
  const [result, setResult] = useState<{ body: string; refs: References }>({ body: "", refs: NO_REFS });

  useEffect(() => {
    if (!body) return;
    let current = true;
    const timer = setTimeout(async () => {
      const r = await callApi<FormattedReference[]>("/api/cite", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!current) return;
      setResult({
        body,
        refs: r.ok
          ? { byId: new Map(r.data.map((x) => [x.id, x])), ordered: r.data, state: "ok", message: null }
          : { ...NO_REFS, state: "error", message: r.message },
      });
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [body]);

  if (!body) return NO_REFS;
  // While a newer set is being formatted, keep showing the last list but say it is loading.
  return result.body === body ? result.refs : { ...result.refs, state: "loading" };
}
