import { describe, expect, it } from "vitest";
import { emptyProject } from "@/lib/mutations";
import { emptyState, parseStored } from "@/lib/storage";
import { mergeStates, reducer } from "@/lib/store";
import type { AppState } from "@/lib/types";
import { NOW } from "./helpers";

const later = "2026-11-24T12:05:00.000Z";
const stateOf = (...projects: AppState["projects"]): AppState => ({ ...emptyState(), projects, activeProjectId: projects[0]?.id ?? null });

describe("two tabs sharing one browser storage key", () => {
  it("keeps a project another tab added, and its newer edit, instead of overwriting them", () => {
    const shared = emptyProject("Shared", "Q one?", NOW);
    const added = emptyProject("Added in tab B", "Q two?", NOW);
    const edited = { ...shared, question: "Q one, edited in tab B?", updatedAt: later };
    const merged = mergeStates(stateOf(shared), stateOf(edited, added));
    expect(merged.projects.map((p) => p.name)).toEqual(["Shared", "Added in tab B"]);
    expect(merged.projects[0]!.question).toBe("Q one, edited in tab B?");
    expect(merged.activeProjectId).toBe(shared.id);
  });

  it("keeps this tab's own newer edit when the other tab is behind", () => {
    const p = emptyProject("P", "Q?", NOW);
    const mine = { ...p, question: "mine", updatedAt: later };
    expect(mergeStates(stateOf(mine), stateOf(p)).projects[0]!.question).toBe("mine");
  });

  it("returns the same state object when there is nothing new, so no save ping-pong starts", () => {
    const local = stateOf(emptyProject("P", "Q?", NOW));
    expect(mergeStates(local, local)).toBe(local);
  });

  it("does not bring back a project deleted in another tab, or after erase-all", () => {
    const a = emptyProject("A", "Qa?", NOW);
    const b = emptyProject("B", "Qb?", NOW);
    const both = stateOf(a, b);
    const afterDelete = reducer(both, { type: "delete", id: a.id });
    expect(mergeStates(both, afterDelete).projects.map((p) => p.id)).toEqual([b.id]);
    // The tab that still has A merges the other tab's state and must not re-save A.
    expect(mergeStates(afterDelete, both).projects.map((p) => p.id)).toEqual([b.id]);

    const erased = reducer(both, { type: "reset" });
    expect(mergeStates(both, erased).projects).toEqual([]);
  });

  it("does not bring back a demo project that was reset to a fresh copy", () => {
    const old = emptyProject("Old", "Q?", NOW);
    const fresh = emptyProject("Fresh", "Q?", NOW);
    const replaced = reducer(stateOf(old), { type: "replace", id: old.id, project: fresh });
    expect(mergeStates(stateOf(old), replaced).projects.map((p) => p.id)).toEqual([fresh.id]);
  });

  it("two tabs holding different edits with the same timestamp pick the same winner, so neither keeps writing back", () => {
    const p = emptyProject("P", "Q?", NOW);
    const a = { ...p, question: "version A", updatedAt: later };
    const b = { ...p, question: "version B", updatedAt: later };
    const inA = mergeStates(stateOf(a), stateOf(b)).projects[0]!.question;
    const inB = mergeStates(stateOf(b), stateOf(a)).projects[0]!.question;
    expect(inA).toBe(inB);
  });

  it("round-trips the deleted ids through storage", () => {
    const p = emptyProject("P", "Q?", NOW);
    const state = reducer(stateOf(p), { type: "delete", id: p.id });
    expect(parseStored(JSON.stringify(state)).state.deletedIds).toEqual([p.id]);
  });
});
