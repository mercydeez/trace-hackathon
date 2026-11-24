import { selectedEvidence } from "@/lib/approvals";
import { buildDemoProject, SAMPLE_RAW } from "@/lib/demo";
import { addClaims, approveEvidenceSet, approvePlan, claimsFromDraft, decideClaim, toggleEvidence } from "@/lib/mutations";
import type { Project, RegistryRecord } from "@/lib/types";
import { validateDraft } from "@/lib/validateDraft";

export const NOW = "2026-11-24T12:00:00.000Z";

/** Demo project taken through the whole journey with the labelled sample brief: everything approved. */
export function reviewedDemo(): Project {
  let p = buildDemoProject(NOW);
  p = approvePlan(p, NOW);
  for (const e of p.evidence) p = toggleEvidence(p, e.id);
  p = approveEvidenceSet(p, NOW);
  const v = validateDraft(SAMPLE_RAW, selectedEvidence(p));
  p = addClaims(p, claimsFromDraft(v.accepted, "sample", null, NOW), {
    id: "run_1",
    at: NOW,
    mode: "sample",
    model: null,
    evidenceIds: p.evidenceSet.ids,
    accepted: v.accepted.length,
    rejected: v.rejected.map((r) => r.reason),
  });
  for (const c of p.claims) p = decideClaim(p, c.id, "approved");
  return p;
}

/** A synthetic registry record for tests only. Not a real paper. */
export const TEST_RECORD: RegistryRecord = {
  title: "A Test Record About Memory: Online and Print Years Differ",
  authors: [
    { family: "Okafor", given: "Ada" },
    { family: "Lindqvist", given: "Bo" },
  ],
  year: 2011,
  container: "Journal of Test Fixtures",
  volume: "15",
  issue: "1",
  pages: "20-27",
  type: "article-journal",
  years: { print: 2011, online: 2010, issued: 2010 },
};
