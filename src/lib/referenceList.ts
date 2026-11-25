/**
 * Which saved sources may appear in a stand-alone APA 7 reference list.
 *
 * Only references whose cited details agree with Crossref and that carry no retraction notice are
 * listed. Everything else is counted with its reason, so nothing is dropped silently.
 */
import { sourceIdentity } from "./identity";
import type { Source } from "./types";

export type ExclusionReason = "not yet verified" | "details disagree with Crossref" | "not found in Crossref" | "could not be checked" | "retracted";

export interface ReferenceListEligibility {
  eligible: Source[];
  excluded: { source: Source; reason: ExclusionReason }[];
  /** e.g. "2 excluded: 1 not yet verified, 1 details disagree with Crossref". Empty when nothing is excluded. */
  summary: string;
}

export function referenceListEligibility(sources: Source[]): ReferenceListEligibility {
  const eligible: Source[] = [];
  const excluded: ReferenceListEligibility["excluded"] = [];
  for (const source of sources) {
    const id = sourceIdentity(source);
    const reason: ExclusionReason | null =
      id.retraction ? "retracted"
      : id.status === "matched" ? null
      : id.status === "mismatch" ? "details disagree with Crossref"
      : id.status === "not_found" ? "not found in Crossref"
      : id.status === "could_not_check" ? "could not be checked"
      : "not yet verified";
    if (reason) excluded.push({ source, reason });
    else eligible.push(source);
  }
  const counts = new Map<ExclusionReason, number>();
  for (const e of excluded) counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
  const summary = excluded.length ? `${excluded.length} excluded: ${[...counts].map(([r, n]) => `${n} ${r}`).join(", ")}` : "";
  return { eligible, excluded, summary };
}
