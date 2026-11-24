/**
 * Approvals are derived, not stored as flags.
 *
 * Each approval records a fingerprint of exactly what was approved. Whether an approval still
 * holds is computed by comparing that fingerprint with the current content. Editing a question,
 * a plan, an evidence passage or a claim therefore invalidates the dependent approvals without
 * any code having to remember to do so.
 */
import { hashText } from "./text";
import type { Claim, Evidence, Project } from "./types";

type PlanBits = Pick<Project, "question" | "plan">;
type EvidenceBits = PlanBits & Pick<Project, "evidence" | "evidenceSet">;

export function planFingerprint(p: PlanBits): string {
  return hashText(
    JSON.stringify([p.question.trim(), p.plan.terms, p.plan.yearFrom, p.plan.yearTo, p.plan.scopeNote.trim()]),
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

export function claimFingerprint(p: EvidenceBits, c: Claim): string {
  const version = c.evidenceId ? (p.evidence.find((e) => e.id === c.evidenceId)?.version ?? "missing") : null;
  return hashText(JSON.stringify([planFingerprint(p), c.text.trim(), c.kind, c.evidenceId, c.excerpt.trim(), version]));
}

export type EffectiveDecision = "pending" | "approved" | "rejected" | "stale";

/** "stale" = approved once, but the claim, its evidence, or the question changed afterwards. */
export function claimDecision(p: EvidenceBits, c: Claim): EffectiveDecision {
  if (c.decision !== "approved") return c.decision;
  return c.approvedFingerprint === claimFingerprint(p, c) ? "approved" : "stale";
}
