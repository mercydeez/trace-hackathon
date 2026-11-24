/**
 * The citation trap: a disposable TEST COPY of the demo project with two deliberate corruptions.
 *
 *   1. A real DOI whose cited details were altered (wrong year, authors in the wrong order).
 *   2. A quotation with one detail altered, attached to a real source.
 *
 * Nothing here sets a status. The copy is ordinary project data; the failures appear because the
 * normal validators (compareMetadata, checkExcerpt, evaluateExport) run on it, and they clear
 * one by one as the student corrects each item. The corrupted items carry a `testCorruption`
 * note so they are never mistaken for research findings.
 */
import { buildDemoProject, SAMPLE_RAW } from "./demo";
import { approveEvidenceSet, approvePlan, claimsFromDraft, decideClaim, logActivity } from "./mutations";
import type { Project } from "./types";
import { validateDraft } from "./validateDraft";

const ALTERED_DOI = "10.1126/science.1152408";

export function buildTrapProject(now: string): Project {
  let p: Project = { ...buildDemoProject(now), kind: "trap", name: "Citation trap (test copy)", activity: [] };

  // Start from a fully reviewed state so the only problems are the two planted ones.
  p = approvePlan(p, now);
  p = { ...p, evidenceSet: { ...p.evidenceSet, ids: p.evidence.map((e) => e.id) } };
  p = approveEvidenceSet(p, now);
  const { accepted } = validateDraft(SAMPLE_RAW, p.evidence);
  p = { ...p, claims: claimsFromDraft(accepted, "sample", null, now) };
  for (const c of p.claims) p = decideClaim(p, c.id, "approved");

  // Corruption 1: real DOI, altered citation details.
  p = {
    ...p,
    sources: p.sources.map((s) =>
      s.doi === ALTERED_DOI
        ? {
            ...s,
            origin: "citation_check" as const,
            cited: { ...s.cited, year: 2011, authors: [...s.cited.authors].reverse() },
            testCorruption:
              "Test case. The DOI is real, but the cited year and the order of the authors were deliberately changed.",
          }
        : s,
    ),
  };

  // Corruption 2: a quotation with one detail changed, on a real source.
  const first = p.claims[0];
  if (first) {
    p = {
      ...p,
      claims: p.claims.map((c) =>
        c.id === first.id
          ? {
              ...c,
              text: "Students who took practice recall tests remembered more than students who restudied, even on a test one month later.",
              excerpt: "Students then took a final retention test 5 min, 2 days, or 1 month later.",
              decision: "pending" as const,
              approvedFingerprint: null,
              testCorruption:
                "Test case. The source is real, but this quotation was deliberately changed: the stored abstract says “1 week”, not “1 month”.",
            }
          : c,
      ),
    };
  }

  return logActivity(
    p,
    now,
    "Citation-trap test copy created. Two items were deliberately corrupted to exercise the checks; they are not research findings.",
  );
}
