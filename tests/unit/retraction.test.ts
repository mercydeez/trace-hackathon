import { describe, expect, it } from "vitest";
import { evaluateExport, inspectClaim } from "@/lib/exportPolicy";
import { sourceIdentity } from "@/lib/identity";
import { approveEvidenceSet, approvePlan, decideClaim, setRules, sourceFromWork } from "@/lib/mutations";
import { normaliseWork } from "@/lib/server/crossref";
import type { Project } from "@/lib/types";
import { NOW, reviewedDemo } from "./helpers";

/**
 * TEST FIXTURE in the shape of a Crossref work with an `updated-by` retraction notice, modelled on the
 * real record observed on 25 Nov 2026 for a retracted paper. Synthetic DOI under Crossref's test prefix.
 */
const RETRACTED_WORK = {
  DOI: "10.5555/trace.retracted.fixture",
  title: ["RETRACTED: A test fixture paper (not a real paper)"],
  author: [{ family: "Okafor", given: "Ada" }],
  "container-title": ["Journal of Test Fixtures"],
  type: "journal-article",
  "published-print": { "date-parts": [[1998]] },
  issued: { "date-parts": [[1998]] },
  "updated-by": [
    { DOI: "10.5555/trace.correction", type: "correction", source: "retraction-watch", updated: { "date-time": "2004-03-06T00:00:00Z" } },
    { DOI: "10.5555/trace.retraction.notice", type: "retraction", source: "retraction-watch", updated: { "date-time": "2010-02-06T00:00:00Z" } },
  ],
};

describe("retraction notices", () => {
  it("are read from Crossref's updated-by, ignoring corrections", () => {
    const w = normaliseWork(RETRACTED_WORK, NOW, "https://api.crossref.org/works/x")!;
    expect(w.record.retraction).toEqual({ kind: "retraction", noticeDoi: "10.5555/trace.retraction.notice", date: "2010-02-06", source: "retraction-watch" });
  });

  it("a work with only a correction is not marked retracted", () => {
    const w = normaliseWork({ ...RETRACTED_WORK, "updated-by": [RETRACTED_WORK["updated-by"][0]] }, NOW, "u")!;
    expect(w.record.retraction).toBeUndefined();
  });

  it("stay on the registry snapshot, separate from the details check", () => {
    const { source } = sourceFromWork(normaliseWork(RETRACTED_WORK, NOW, "u")!, "doi_lookup", NOW);
    expect(source.cited).not.toHaveProperty("retraction");
    const id = sourceIdentity(source);
    expect(id.status).toBe("matched");
    expect(id.retraction?.kind).toBe("retraction");
  });

  function withRetractedSource(): Project {
    let p = reviewedDemo();
    p = {
      ...p,
      sources: p.sources.map((s) =>
        s.id === "src_demo_4" && s.registry ? { ...s, registry: { ...s.registry, record: { ...s.registry.record, retraction: { kind: "retraction" as const, noticeDoi: "10.5555/notice", date: "2020-01-01", source: "retraction-watch" } } } } : s,
      ),
    };
    return p;
  }

  it("block a reviewed export under the default rules, and name the year", () => {
    const p = withRetractedSource();
    const blocker = evaluateExport(p).blockers.find((b) => b.code === "source_retracted");
    expect(blocker?.message).toBe("Claim 3: its source has a retraction notice in Crossref (2020). Remove the source or reject the claim.");
  });

  it("do not block when the rules allow retracted sources, but the status still shows", () => {
    let p = setRules(withRetractedSource(), { blockRetracted: false });
    p = approveEvidenceSet(approvePlan(p, NOW), NOW);
    for (const c of p.claims) p = decideClaim(p, c.id, "approved");
    expect(evaluateExport(p).eligible).toBe(true);
    expect(inspectClaim(p, p.claims[2]!).identity?.retraction?.kind).toBe("retraction");
  });
});
