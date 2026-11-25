/**
 * Approvals are derived, not stored as flags.
 *
 * Each approval records a fingerprint of exactly what was approved. Whether an approval still
 * holds is computed by comparing that fingerprint with the current content. Editing a question,
 * a plan, an evidence passage or a claim therefore invalidates the dependent approvals without
 * any code having to remember to do so.
 */
import { hashText } from "./text";
import { DEFAULT_RULES, type Claim, type Evidence, type Project } from "./types";

type PlanBits = Pick<Project, "question" | "plan"> & { rules?: Project["rules"] };
type EvidenceBits = PlanBits & Pick<Project, "evidence" | "evidenceSet">;

function rulesChanged(rules: Project["rules"] | undefined): boolean {
  return rules !== undefined && JSON.stringify(rules) !== JSON.stringify(DEFAULT_RULES);
}

export function planFingerprint(p: PlanBits): string {
  return hashText(
    // Rules are part of what the student approves: changing them asks for the plan to be approved again.
    // Default rules add nothing, so approvals made before rules existed still hold.
    JSON.stringify([p.question.trim(), p.plan.terms, p.plan.yearFrom, p.plan.yearTo, p.plan.scopeNote.trim(), ...(rulesChanged(p.rules) ? [p.rules] : [])]),
  );
}

export function isPlanApproved(p: PlanBits): boolean {
  return p.plan.approvedFingerprint !== null && p.plan.approvedFingerprint === planFingerprint(p);
}

export function evidenceSetFingerprint(p: EvidenceBits): string {
  const items = p.evidenceSet.ids
    .map((id) => [id, p.evidence.find((e) => e.id === id)?.version ?? "missing"])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return hashText(JSON.stringify([planFingerprint(p), items]));
}

export function isEvidenceSetApproved(p: EvidenceBits): boolean {
  return (
    isPlanApproved(p) &&
    p.evidenceSet.ids.length > 0 &&
    p.evidenceSet.approvedFingerprint !== null &&
    p.evidenceSet.approvedFingerprint === evidenceSetFingerprint(p)
  );
}

/** Evidence currently selected for synthesis, in selection order, skipping anything deleted. */
export function selectedEvidence(p: EvidenceBits): Evidence[] {
  return p.evidenceSet.ids.flatMap((id) => p.evidence.find((e) => e.id === id) ?? []);
}

type ClaimBits = EvidenceBits & Pick<Project, "sources">;

export function claimFingerprint(p: ClaimBits, c: Claim): string {
  const evidence = c.evidenceId ? p.evidence.find((e) => e.id === c.evidenceId) : undefined;
  const version = c.evidenceId ? (evidence?.version ?? "missing") : null;
  // A source without a DOI has no registry check, so its cited details are part of what was approved:
  // editing its title, authors or year makes the approval stale. Sources with a DOI are compared with
  // Crossref on every render instead (identity check), so correcting them does not reset approvals.
  const source = evidence ? p.sources.find((s) => s.id === evidence.sourceId) : undefined;
  const cited = source && !source.doi ? source.cited : null;
  return hashText(JSON.stringify([planFingerprint(p), c.text.trim(), c.kind, c.evidenceId, c.excerpt.trim(), version, c.limitations.trim(), cited]));
}

export type EffectiveDecision = "pending" | "approved" | "rejected" | "stale";

/** "stale" = approved once, but the claim, its limitations, its evidence, its source's details, or the question changed afterwards. */
export function claimDecision(p: ClaimBits, c: Claim): EffectiveDecision {
  if (c.decision !== "approved") return c.decision;
  return c.approvedFingerprint === claimFingerprint(p, c) ? "approved" : "stale";
}
