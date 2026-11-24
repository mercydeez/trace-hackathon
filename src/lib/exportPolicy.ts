/**
 * The single gate for a reviewed export, and the single description of a claim's status.
 *
 * The UI reads `inspectClaim` to draw the Claim Inspector and `evaluateExport` to enable the
 * reviewed export; `exportMarkdown.ts` calls `evaluateExport` again and refuses to build a
 * reviewed brief when it fails. There is no second, weaker check anywhere else.
 */
import { claimDecision, isEvidenceSetApproved, isPlanApproved, type EffectiveDecision } from "./approvals";
import { checkExcerpt, type ExcerptCheck } from "./excerpt";
import { sourceIdentity, type Identity } from "./identity";
import type { Claim, Evidence, Project, Source } from "./types";

export type IssueCode =
  | "plan_unapproved"
  | "evidence_set_unapproved"
  | "no_claims"
  | "evidence_missing"
  | "evidence_unapproved"
  | "quote_mismatch"
  | "quote_not_checkable"
  | "claim_pending"
  | "claim_stale"
  | "identity_mismatch";

export interface Issue {
  code: IssueCode;
  message: string;
  claimId?: string;
  sourceId?: string;
}

export interface ClaimInspection {
  claim: Claim;
  number: number;
  source: Source | null;
  evidence: Evidence | null;
  /** 1. Reference identity. Null for an inference, which cites nothing. */
  identity: Identity | null;
  /** 2. Evidence access. */
  access: "abstract" | "user_pasted" | "none";
  /** 3. Excerpt integrity. */
  excerpt: ExcerptCheck;
  /** 4. Support assessment is `claim.support`: model-suggested, never computed here. */
  /** 5. Student decision. */
  decision: EffectiveDecision;
  inApprovedSet: boolean;
  issues: Issue[];
}

const NOT_CHECKABLE_TEXT: Record<string, string> = {
  no_evidence: "there is no stored source text",
  no_excerpt: "no excerpt is given",
  too_short: "the excerpt is too short to mean anything",
};

export function inspectClaim(project: Project, claim: Claim): ClaimInspection {
  const number = project.claims.findIndex((c) => c.id === claim.id) + 1;
  const evidence = claim.evidenceId ? (project.evidence.find((e) => e.id === claim.evidenceId) ?? null) : null;
  const source = evidence ? (project.sources.find((s) => s.id === evidence.sourceId) ?? null) : null;
  const identity = source ? sourceIdentity(source) : null;
  const decision = claimDecision(project, claim);
  const inSet = evidence !== null && project.evidenceSet.ids.includes(evidence.id);
  const inApprovedSet = inSet && isEvidenceSetApproved(project);
  const excerpt: ExcerptCheck =
    claim.kind === "inference"
      ? { status: "not_checkable", reason: "no_evidence" }
      : checkExcerpt(claim.excerpt, evidence?.text);

  const issues: Issue[] = [];
  const add = (code: IssueCode, message: string, sourceId?: string) =>
    issues.push({ code, message: `Claim ${number}: ${message}`, claimId: claim.id, sourceId });

  if (claim.decision !== "rejected") {
    if (claim.kind === "evidence") {
      if (!evidence) {
        add("evidence_missing", "the evidence it cites is no longer in this project.");
      } else {
        // Whether the set as a whole is approved is one project-level blocker, not one per claim.
        if (!inSet) add("evidence_unapproved", "it cites evidence that is not in the evidence set.");
        if (excerpt.status === "mismatch") add("quote_mismatch", "the excerpt is not in the stored source text.");
        if (excerpt.status === "not_checkable") {
          add("quote_not_checkable", `the excerpt cannot be checked because ${NOT_CHECKABLE_TEXT[excerpt.reason]}.`);
        }
        if (identity?.status === "mismatch") {
          add("identity_mismatch", "the reference details disagree with Crossref.", source?.id);
        }
      }
    }
    if (decision === "pending") add("claim_pending", "waiting for your decision.");
    if (decision === "stale") add("claim_stale", "changed after you approved it. Review it again.");
  }

  return {
    claim,
    number,
    source,
    evidence,
    identity,
    access: evidence ? evidence.scope : "none",
    excerpt,
    decision,
    inApprovedSet,
    issues,
  };
}

export interface ExportEvaluation {
  eligible: boolean;
  blockers: Issue[];
  inspections: ClaimInspection[];
  counts: {
    total: number;
    linked: number;
    inference: number;
    needsReview: number;
    approved: number;
    rejected: number;
  };
  summary: string;
}

export function evaluateExport(project: Project): ExportEvaluation {
  const inspections = project.claims.map((c) => inspectClaim(project, c));
  const live = inspections.filter((i) => i.claim.decision !== "rejected");
  const blockers: Issue[] = [];

  if (!isPlanApproved(project)) {
    blockers.push({ code: "plan_unapproved", message: "The search plan is not approved for the current question and scope." });
  }
  if (!isEvidenceSetApproved(project)) {
    blockers.push({
      code: "evidence_set_unapproved",
      message: "The evidence set is not approved, or it changed after you approved it.",
    });
  }
  if (live.length === 0) blockers.push({ code: "no_claims", message: "There are no claims to export." });
  for (const i of live) blockers.push(...i.issues);

  const counts = {
    total: live.length,
    linked: live.filter((i) => i.claim.kind === "evidence" && i.excerpt.status === "matched").length,
    inference: live.filter((i) => i.claim.kind === "inference").length,
    needsReview: live.filter((i) => i.issues.length > 0).length,
    approved: live.filter((i) => i.decision === "approved").length,
    rejected: inspections.length - live.length,
  };

  const parts = [`${counts.linked} of ${counts.total} claim${counts.total === 1 ? "" : "s"} linked to a stored passage`];
  if (counts.inference) parts.push(`${counts.inference} marked as inference`);
  parts.push(counts.needsReview ? `${counts.needsReview} need${counts.needsReview === 1 ? "s" : ""} review` : "none need review");
  if (counts.rejected) parts.push(`${counts.rejected} rejected`);

  return { eligible: blockers.length === 0, blockers, inspections, counts, summary: parts.join("; ") };
}
