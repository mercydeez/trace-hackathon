/**
 * The words for each check's result, shared by the on-screen chips (components/status.tsx) and the
 * verification report, so a report can never describe a check differently from the screen.
 */
import type { EffectiveDecision } from "./approvals";
import type { ExcerptCheck } from "./excerpt";
import type { Identity, IdentityStatus } from "./identity";

export const IDENTITY_LABEL: Record<IdentityStatus, string> = {
  matched: "Details match Crossref",
  mismatch: "Details disagree with Crossref",
  not_found: "Not found in Crossref",
  could_not_check: "Could not check",
  user_entered: "Not yet verified",
};

export const PARTIAL_LABEL = "Partial match: check details";

/** The trust label for a reference, naming the registry that was compared (Crossref, or DataCite). */
export function trustLabel(identity: Pick<Identity, "status" | "partial"> & { registry?: Identity["registry"] }): string {
  const label = identity.status === "matched" && identity.partial ? PARTIAL_LABEL : IDENTITY_LABEL[identity.status];
  return identity.registry === "DataCite" ? label.replace("Crossref", "DataCite") : label;
}

export function excerptLabel(check: ExcerptCheck): string {
  if (check.status === "matched") return "Excerpt found in stored text";
  if (check.status === "mismatch") return "Excerpt not in stored text";
  return "Excerpt cannot be checked";
}

export const DECISION_LABEL: Record<EffectiveDecision, string> = {
  pending: "Waiting for your decision",
  approved: "Student approved",
  rejected: "Rejected by you",
  stale: "Changed since you approved",
};
