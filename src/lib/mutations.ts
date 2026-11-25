/**
 * Every change to a project is one of these pure functions: (project, ...) -> new project.
 * None of them touches an approval flag to "invalidate" it. Approvals are fingerprints
 * (approvals.ts), so they stop holding by themselves when the content they cover changes.
 */
import type { WorkRecord } from "./api";
import { claimFingerprint, evidenceSetFingerprint, planFingerprint } from "./approvals";
import { sameDoi } from "./doi";
import type { IdentityField } from "./identity";
import { suggestPlan } from "./plan";
import { hashText, newId } from "./text";
import { DEFAULT_RULES, type AiRun, type Biblio, type Claim, type Evidence, type Lookup, type Plan, type Project, type RegistrySnapshot, type Source, type Rules } from "./types";
import type { AcceptedDraftClaim } from "./validateDraft";

export const MAX_ACTIVITY = 200;

export function emptyProject(name: string, question: string, now: string): Project {
  return {
    id: newId("prj"),
    name,
    kind: "user",
    question,
    plan: suggestPlan(question),
    rules: { ...DEFAULT_RULES },
    writing: "",
    citationStyle: "apa",
    sources: [],
    evidence: [],
    evidenceSet: { ids: [], approvedFingerprint: null, approvedAt: null },
    claims: [],
    aiRuns: [],
    activity: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function logActivity(p: Project, at: string, text: string): Project {
  return { ...p, updatedAt: at, activity: [{ at, text }, ...p.activity].slice(0, MAX_ACTIVITY) };
}

// --- Question and plan -------------------------------------------------------------------

export function setQuestion(p: Project, question: string): Project {
  return { ...p, question };
}

export function setPlan(p: Project, patch: Partial<Pick<Plan, "terms" | "yearFrom" | "yearTo" | "scopeNote">>): Project {
  return { ...p, plan: { ...p.plan, ...patch } };
}

export function setWriting(p: Project, writing: string): Project {
  return { ...p, writing: writing.slice(0, 40000) };
}

export function setCitationStyle(p: Project, citationStyle: Project["citationStyle"]): Project {
  return { ...p, citationStyle };
}

export function setRules(p: Project, patch: Partial<Rules>): Project {
  return { ...p, rules: { ...p.rules, ...patch } };
}

export function approvePlan(p: Project, at: string): Project {
  return { ...p, plan: { ...p.plan, approvedFingerprint: planFingerprint(p), approvedAt: at } };
}

// --- Sources -----------------------------------------------------------------------------

function biblioOf(record: WorkRecord["record"]): Biblio {
  // Registry-only fields (every listed year, any retraction notice) stay on the snapshot, not on what is cited.
  const { years: _years, retraction: _retraction, ...biblio } = record;
  void _years;
  void _retraction;
  return biblio;
}

export function abstractEvidence(sourceId: string, text: string, provider: "crossref" | "openalex", retrievedAt: string, url: string): Evidence {
  return {
    id: newId("ev"),
    sourceId,
    text,
    scope: "abstract",
    locator: "Abstract",
    provenance: {
      provider,
      retrievedAt,
      url,
      note:
        provider === "crossref"
          ? "Abstract as deposited with Crossref, markup removed."
          : "Abstract rebuilt from OpenAlex's word-position index; spacing and punctuation may differ slightly from the publisher's version.",
    },
    version: hashText(text),
  };
}

/** A registry record becomes a source whose cited details start as a copy of that record. */
export function sourceFromWork(work: WorkRecord, origin: Source["origin"], now: string): { source: Source; evidence: Evidence | null } {
  const source: Source = {
    id: newId("src"),
    doi: work.doi,
    origin,
    cited: biblioOf(work.record),
    registry: { provider: "crossref", retrievedAt: work.retrievedAt, url: work.url, record: work.record },
    lookup: { status: "found", checkedAt: work.retrievedAt },
    tags: [],
    note: "",
    addedAt: now,
  };
  const evidence = work.abstract ? abstractEvidence(source.id, work.abstract, "crossref", work.retrievedAt, work.url) : null;
  return { source, evidence };
}

/** A reference typed in by the student. It is never marked as checked unless a registry lookup actually ran. */
export function manualSource(cited: Biblio, doi: string | null, now: string): Source {
  return {
    id: newId("src"),
    doi,
    origin: "manual",
    cited,
    registry: null,
    lookup: { status: "not_attempted", checkedAt: null },
    tags: [],
    note: "",
    addedAt: now,
  };
}

function normTitle(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** The existing source this would duplicate, if any: same DOI, or (without DOIs) same title and year. */
export function findDuplicate(p: Project, candidate: Pick<Source, "doi" | "cited">): Source | undefined {
  return p.sources.find((s) =>
    candidate.doi || s.doi
      ? sameDoi(s.doi, candidate.doi)
      : normTitle(s.cited.title) === normTitle(candidate.cited.title) && s.cited.year === candidate.cited.year,
  );
}

export function addSource(p: Project, source: Source, evidence: Evidence | null): Project {
  if (findDuplicate(p, source)) return p;
  return { ...p, sources: [...p.sources, source], evidence: evidence ? [...p.evidence, evidence] : p.evidence };
}

function patchSource(p: Project, id: string, fn: (s: Source) => Source): Project {
  return { ...p, sources: p.sources.map((s) => (s.id === id ? fn(s) : s)) };
}

export function updateCited(p: Project, id: string, patch: Partial<Biblio>): Project {
  return patchSource(p, id, (s) => ({ ...s, cited: { ...s.cited, ...patch } }));
}

/** The student chooses to take one detail from the registry record. Explicit and logged; never automatic. */
export function takeRegistryValue(p: Project, id: string, field: IdentityField): Project {
  return patchSource(p, id, (s) => {
    const r = s.registry?.record;
    if (!r) return s;
    const patch: Partial<Biblio> =
      field === "title"
        ? { title: r.title }
        : field === "first_author"
          ? { authors: r.authors }
          : field === "year"
            ? { year: r.year }
            : { container: r.container, volume: r.volume, issue: r.issue, pages: r.pages };
    return { ...s, cited: { ...s.cited, ...patch } };
  });
}

export function setRegistry(p: Project, id: string, registry: RegistrySnapshot | null, lookup: Lookup): Project {
  // A failed refresh keeps the earlier snapshot, so "could not check" never erases what was known.
  return patchSource(p, id, (s) => ({ ...s, registry: registry ?? s.registry, lookup }));
}

export function setTags(p: Project, id: string, tags: string[]): Project {
  const clean = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  return patchSource(p, id, (s) => ({ ...s, tags: clean }));
}

export function setNote(p: Project, id: string, note: string): Project {
  return patchSource(p, id, (s) => ({ ...s, note: note.slice(0, 2000) }));
}

/** Removes the source and its evidence. Claims that cited it are kept and show as needing attention. */
export function removeSource(p: Project, id: string): Project {
  const gone = new Set(p.evidence.filter((e) => e.sourceId === id).map((e) => e.id));
  return {
    ...p,
    sources: p.sources.filter((s) => s.id !== id),
    evidence: p.evidence.filter((e) => !gone.has(e.id)),
    evidenceSet: { ...p.evidenceSet, ids: p.evidenceSet.ids.filter((e) => !gone.has(e)) },
  };
}

// --- Evidence ----------------------------------------------------------------------------

export function pastedEvidence(sourceId: string, text: string, locator: string, now: string): Evidence {
  return {
    id: newId("ev"),
    sourceId,
    text,
    scope: "user_pasted",
    locator: locator.trim() || "Location not given",
    provenance: {
      provider: "user",
      retrievedAt: now,
      note: "Pasted by the student. TRACE has not checked this text against the publication.",
    },
    version: hashText(text),
  };
}

export function addEvidence(p: Project, evidence: Evidence): Project {
  return { ...p, evidence: [...p.evidence, evidence] };
}

export function updateEvidenceText(p: Project, id: string, text: string): Project {
  return { ...p, evidence: p.evidence.map((e) => (e.id === id ? { ...e, text, version: hashText(text) } : e)) };
}

export function removeEvidence(p: Project, id: string): Project {
  return {
    ...p,
    evidence: p.evidence.filter((e) => e.id !== id),
    evidenceSet: { ...p.evidenceSet, ids: p.evidenceSet.ids.filter((e) => e !== id) },
  };
}

export function toggleEvidence(p: Project, id: string): Project {
  const ids = p.evidenceSet.ids.includes(id) ? p.evidenceSet.ids.filter((e) => e !== id) : [...p.evidenceSet.ids, id];
  return { ...p, evidenceSet: { ...p.evidenceSet, ids } };
}

export function approveEvidenceSet(p: Project, at: string): Project {
  return { ...p, evidenceSet: { ...p.evidenceSet, approvedFingerprint: evidenceSetFingerprint(p), approvedAt: at } };
}

// --- Claims ------------------------------------------------------------------------------

export function claimsFromDraft(accepted: AcceptedDraftClaim[], origin: "live_ai" | "sample", model: string | null, now: string): Claim[] {
  return accepted.map((a) => ({
    id: newId("cl"),
    text: a.text,
    kind: a.kind,
    evidenceId: a.evidenceId,
    excerpt: a.excerpt,
    support: a.support,
    limitations: a.limitations,
    origin,
    model: model ?? undefined,
    edited: false,
    decision: "pending",
    approvedFingerprint: null,
    createdAt: now,
  }));
}

export function manualClaim(now: string): Claim {
  return {
    id: newId("cl"),
    text: "",
    kind: "evidence",
    evidenceId: null,
    excerpt: "",
    support: null,
    limitations: "",
    origin: "manual",
    edited: false,
    decision: "pending",
    approvedFingerprint: null,
    createdAt: now,
  };
}

export function addClaims(p: Project, claims: Claim[], run?: AiRun): Project {
  return { ...p, claims: [...p.claims, ...claims], aiRuns: run ? [...p.aiRuns, run] : p.aiRuns };
}

export function updateClaim(p: Project, id: string, patch: Partial<Pick<Claim, "text" | "excerpt" | "evidenceId" | "kind" | "limitations">>): Project {
  return {
    ...p,
    claims: p.claims.map((c) => {
      if (c.id !== id) return c;
      const next = { ...c, ...patch };
      if (next.kind === "inference") {
        next.evidenceId = null;
        next.excerpt = "";
      }
      // A hand-written claim is "edited" from the start in the sense that matters: it is the student's wording.
      next.edited = c.origin === "manual" ? false : true;
      return next;
    }),
  };
}

export function decideClaim(p: Project, id: string, decision: Claim["decision"]): Project {
  return {
    ...p,
    claims: p.claims.map((c) =>
      c.id === id ? { ...c, decision, approvedFingerprint: decision === "approved" ? claimFingerprint(p, c) : null } : c,
    ),
  };
}

export function removeClaim(p: Project, id: string): Project {
  return { ...p, claims: p.claims.filter((c) => c.id !== id) };
}
