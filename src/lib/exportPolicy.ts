/**
 * The single gate for a reviewed export, and the single description of a claim's status.
 *
 * The UI reads `inspectClaim` to draw the Claim Inspector and `evaluateExport` to enable the
 * reviewed export; `exportMarkdown.ts` calls `evaluateExport` again and refuses to build a
 * reviewed brief when it fails. There is no second, weaker check anywhere else.
 */
import { claimDecision, isEvidenceSetApproved, isPlanApproved, type EffectiveDecision } from "./approvals";
import { checkClaimDetails, type DetailIssue } from "./claimNumbers";
import { checkExcerpt, type ExcerptCheck } from "./excerpt";
import { sourceIdentity, type Identity } from "./identity";
import { findCitations, matchCitations, type CitationMatch } from "./inText";
import type { Claim, Evidence, Project, Source } from "./types";

export type IssueCode =
  | "plan_unapproved"
  | "evidence_set_unapproved"
  | "no_claims"
  | "claim_empty"
  | "evidence_missing"
  | "source_missing"
  | "evidence_unapproved"
  | "quote_mismatch"
  | "quote_not_checkable"
  | "claim_detail_unsupported"
  | "rule_ai_off"
  | "source_retracted"
  | "text_citation_unknown"
  | "text_citation_flagged"
  | "text_citation_ambiguous"
  | "rule_min_year"
  | "claim_pending"
  | "claim_stale"
  | "identity_mismatch"
  | "identity_unconfirmed";

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
  /** Part of 3: numbers and negations stated in the claim that its excerpt does not contain. */
  details: DetailIssue[];
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

  // Numbers and negations in the claim must appear in the excerpt it quotes. Deterministic; see claimNumbers.ts.
  const details = claim.kind === "evidence" && claim.excerpt.trim() ? checkClaimDetails(claim.text, claim.excerpt) : [];

  const issues: Issue[] = [];
  const add = (code: IssueCode, message: string, sourceId?: string) =>
    issues.push({ code, message: `Claim ${number}: ${message}`, claimId: claim.id, sourceId });

  if (claim.decision !== "rejected") {
    if (!claim.text.trim()) add("claim_empty", "it has no text yet.");
    if (claim.kind === "evidence") {
      if (!evidence) {
        add("evidence_missing", "the evidence it cites is no longer in this project.");
      } else {
        if (!source) add("source_missing", "the passage is missing its source record. Link the claim to another passage or reject it.");
        // Whether the set as a whole is approved is one project-level blocker, not one per claim.
        if (!inSet) add("evidence_unapproved", "it cites evidence that is not in the evidence set.");
        if (excerpt.status === "mismatch") add("quote_mismatch", "the excerpt is not in the stored source text.");
        if (excerpt.status === "not_checkable") {
          add("quote_not_checkable", `the excerpt cannot be checked because ${NOT_CHECKABLE_TEXT[excerpt.reason]}.`);
        }
        for (const d of details) add("claim_detail_unsupported", d.message.replace(/^The claim/, "the claim"));
        if (identity?.status === "mismatch") {
          add("identity_mismatch", "the reference details disagree with Crossref.", source?.id);
        } else if (source?.doi && identity?.status !== "matched") {
          add(
            "identity_unconfirmed",
            source.lookup.status === "not_found"
              ? "Crossref has no record of its DOI. That does not make the paper fake (it may be registered elsewhere, such as DataCite), but TRACE cannot compare its details. Check the DOI and recheck it in the Library, or link the claim to another source."
              : "its DOI has not been confirmed with Crossref yet (the registry may have been unreachable). Use \"Check against Crossref again\" in the Library or the Claim Inspector.",
            source.id,
          );
        }
      }
    }
    const retraction = identity?.retraction;
    if (retraction && project.rules.blockRetracted) {
      add(
        "source_retracted",
        `its source has a ${retraction.kind} notice in Crossref${retraction.date ? ` (${retraction.date.slice(0, 4)})` : ""}. Remove the source or reject the claim.`,
        source?.id,
      );
    }
    // Rules in force (set by the student in the Plan step).
    if (project.rules.aiDrafting === "off" && claim.origin === "live_ai") {
      add("rule_ai_off", "it was drafted by AI, but the rules in force switch AI drafting off. Write it yourself or reject it.");
    }
    const minYear = project.rules.minYear;
    if (minYear !== null && source && (source.cited.year === null || source.cited.year < minYear)) {
      add("rule_min_year", `its source is from ${source.cited.year ?? "an unknown year"}, but the rules in force require ${minYear} or later.`, source.id);
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
    details,
    decision,
    inApprovedSet,
    issues,
  };
}

/** In-text citations in the student's writing, each matched to a source in the project (or not). */
export function textCitations(project: Project): CitationMatch[] {
  return project.writing.trim() ? matchCitations(findCitations(project.writing), project.sources) : [];
}

/** A citation in the student's own text must point at a source in the project, and that source must pass its checks. */
function textIssues(project: Project, cites: CitationMatch[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const c of cites) {
    if (seen.has(c.raw)) continue;
    seen.add(c.raw);
    if (c.ambiguous) {
      issues.push({ code: "text_citation_ambiguous", message: `Your text cites "${c.raw}", which matches more than one source in this project. Add the letter the reference list uses (for example ${c.year}a or ${c.year}b).` });
      continue;
    }
    if (!c.sourceId) {
      issues.push({ code: "text_citation_unknown", message: `Your text cites "${c.raw}", which is not a source in this project. Add the source, correct the citation, or remove it.` });
      continue;
    }
    const source = project.sources.find((s) => s.id === c.sourceId);
    const id = source ? sourceIdentity(source) : null;
    const minYear = project.rules.minYear;
    if (id?.status === "mismatch") {
      issues.push({ code: "text_citation_flagged", message: `Your text cites "${c.raw}", whose reference details disagree with Crossref.`, sourceId: c.sourceId });
    } else if (source?.doi && id?.status !== "matched") {
      issues.push({ code: "text_citation_flagged", message: `Your text cites "${c.raw}", whose DOI ${source.lookup.status === "not_found" ? "Crossref has no record of (that does not make it fake)" : "could not be checked against Crossref"}. Recheck it in the Library, or remove the citation.`, sourceId: c.sourceId });
    } else if (id?.retraction && project.rules.blockRetracted) {
      issues.push({ code: "text_citation_flagged", message: `Your text cites "${c.raw}", which has a ${id.retraction.kind} notice in Crossref.`, sourceId: c.sourceId });
    } else if (source && minYear !== null && (source.cited.year === null || source.cited.year < minYear)) {
      issues.push({ code: "rule_min_year", message: `Your text cites "${c.raw}", from ${source.cited.year ?? "an unknown year"}, but the rules in force require ${minYear} or later.`, sourceId: c.sourceId });
    }
  }
  return issues;
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
  blockers.push(...textIssues(project, textCitations(project)));

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
