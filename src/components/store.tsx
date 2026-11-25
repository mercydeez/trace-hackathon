"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { callApi, type CitableInput, type FormattedReference, type StatusResult } from "@/lib/api";
import { loadState, parseStored, saveState, emptyState, STORAGE_KEY, type StorageProblem } from "@/lib/storage";
import { mergeStates, reducer } from "@/lib/store";
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
  /** True after another tab saved a newer version of a project open here; its version was loaded. */
  syncNotice: boolean;
  dismissSyncNotice: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [ready, setReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState<StorageProblem>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [syncNotice, setSyncNotice] = useState(false);
  const hydrated = useRef(false);
  const writeBlocked = useRef(false);
  const [status, setStatus] = useState<StatusResult | null>(null);

  useEffect(() => {
    // Reading localStorage must wait for the browser; this is the one place state is loaded from outside React.
    if (hydrated.current) return;
    hydrated.current = true;
    const loaded = loadState();
    writeBlocked.current = loaded.writeBlocked === true;
    dispatch({ type: "hydrate", state: loaded.state });
    setStorageProblem(loaded.problem);
    setReady(true);
    void callApi<StatusResult>("/api/status").then((r) => r.ok && setStatus(r.data));
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSaveFailed(writeBlocked.current || !saveState(state));
  }, [state, ready]);

  // Another tab saved. Fold its work into this tab instead of overwriting it on this tab's next save.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  useEffect(() => {
    const content = (s: AppState) => JSON.stringify([s.projects, s.deletedIds ?? []]);
    const syncFrom = (raw: string | null) => {
      if (!hydrated.current || raw === null) return;
      const remote = parseStored(raw);
      if (remote.problem) return;
      const local = latest.current;
      const open = local.projects.find((p) => p.id === local.activeProjectId);
      if (open && remote.state.projects.some((p) => p.id === open.id && p.updatedAt > open.updatedAt)) setSyncNotice(true);
      const merged = mergeStates(local, remote.state);
      if (merged !== local) {
        dispatch({ type: "merge", state: remote.state }); // the save effect then writes the merged state
      } else if (!writeBlocked.current && content(merged) !== content(remote.state)) {
        // The other tab saved an older picture (it had missed this tab's changes). Nothing changes here,
        // so no save would follow: write this tab's state back, or the other tab's copy would stand.
        // Compared without activeProjectId, which differs per tab, so two tabs cannot ping-pong.
        saveState(merged);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.storageArea === window.localStorage) syncFrom(e.newValue);
    };
    // A page restored from the back-forward cache missed every storage event while it was away.
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      try {
        syncFrom(window.localStorage.getItem(STORAGE_KEY));
      } catch {
        /* storage blocked: nothing to sync */
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

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
      syncNotice,
      dismissSyncNotice: () => setSyncNotice(false),
    }),
    [ready, state, project, storageProblem, saveFailed, syncNotice, status, update],
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
export function useReferences(sources: Source[], mode: "list" | "each", style: "apa" | "harvard1" = "apa", attempt = 0): References {
  // The request body as a string: the effect below then re-runs only when the content changes,
  // not whenever a caller passes a freshly built array.
  const body =
    sources.length === 0
      ? ""
      : JSON.stringify({ mode, style, items: sources.map((s): CitableInput => ({ id: s.id, doi: s.doi, cited: s.cited, accessed: s.addedAt })) });
  const [result, setResult] = useState<{ body: string; attempt: number; refs: References }>({ body: "", attempt: 0, refs: NO_REFS });

  useEffect(() => {
    if (!body) return;
    const request = new AbortController();
    const timer = setTimeout(async () => {
      const r = await callApi<FormattedReference[]>("/api/cite", { method: "POST", signal: request.signal, headers: { "Content-Type": "application/json" }, body });
      if (request.signal.aborted) return;
      setResult({
        body,
        attempt,
        refs: r.ok
          ? { byId: new Map(r.data.map((x) => [x.id, x])), ordered: r.data, state: "ok", message: null }
          : { ...NO_REFS, state: "error", message: r.message },
      });
    }, 200);
    return () => {
      request.abort();
      clearTimeout(timer);
    };
  }, [body, attempt]);

  if (!body) return NO_REFS;
  return result.body === body && result.attempt === attempt ? result.refs : { ...NO_REFS, state: "loading" };
}
