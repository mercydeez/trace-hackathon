import { describe, expect, it } from "vitest";
import { claimDecision, isEvidenceSetApproved, isPlanApproved, selectedEvidence } from "@/lib/approvals";
import { buildDemoProject, sampleAvailable, SAMPLE_RAW } from "@/lib/demo";
import { checkExcerpt } from "@/lib/excerpt";
import { buildBrief } from "@/lib/exportMarkdown";
import { evaluateExport, inspectClaim } from "@/lib/exportPolicy";
import { sourceIdentity } from "@/lib/identity";
import {
  addClaims,
  addSource,
  approveEvidenceSet,
  approvePlan,
  claimsFromDraft,
  decideClaim,
  emptyProject,
  findDuplicate,
  manualClaim,
  manualSource,
  pastedEvidence,
  addEvidence,
  removeEvidence,
  removeSource,
  setPlan,
  setQuestion,
  toggleEvidence,
  updateClaim,
  updateCited,
  updateEvidenceText,
  takeRegistryValue,
} from "@/lib/mutations";
import { buildTrapProject } from "@/lib/trap";
import { validateDraft } from "@/lib/validateDraft";
import { NOW, reviewedDemo } from "./helpers";

const codes = (p: Parameters<typeof evaluateExport>[0]) => evaluateExport(p).blockers.map((b) => b.code);

describe("demo fixtures and sample brief", () => {
  it("ships real records: every source has a DOI, a registry snapshot, and a retrieval date", () => {
    const p = buildDemoProject(NOW);
    expect(p.sources).toHaveLength(7);
    expect(p.evidence).toHaveLength(5);
    for (const s of p.sources) {
      expect(s.doi).toMatch(/^10\./);
      expect(s.registry?.retrievedAt).toMatch(/^2026-/);
      expect(sourceIdentity(s).status).toBe("matched");
    }
  });

  it("starts with nothing approved and no claims", () => {
    const p = buildDemoProject(NOW);
    expect(isPlanApproved(p)).toBe(false);
    expect(isEvidenceSetApproved(p)).toBe(false);
    expect(p.claims).toHaveLength(0);
    expect(codes(p)).toEqual(["plan_unapproved", "evidence_set_unapproved", "no_claims"]);
  });

  it("every sample excerpt is found verbatim in its stored abstract", () => {
    const p = reviewedDemo();
    const evidenceClaims = p.claims.filter((c) => c.kind === "evidence");
    expect(evidenceClaims).toHaveLength(4);
    for (const c of evidenceClaims) {
      const ev = p.evidence.find((e) => e.id === c.evidenceId);
      expect(checkExcerpt(c.excerpt, ev?.text).status).toBe("matched");
    }
    expect(p.claims.filter((c) => c.kind === "inference")).toHaveLength(1);
    expect(p.claims.every((c) => c.origin === "sample")).toBe(true);
  });

  it("loads the sample through the normal validator, so unapproved evidence is rejected there too", () => {
    let p = approvePlan(buildDemoProject(NOW), NOW);
    p = toggleEvidence(p, "ev_demo_1");
    const v = validateDraft(SAMPLE_RAW, selectedEvidence(p));
    expect(v.accepted.map((a) => a.evidenceId)).toEqual(["ev_demo_1", null]);
    expect(v.rejected).toHaveLength(3);
    expect(v.rejected[0]!.reason).toContain("not in the approved evidence set");
  });

  it("offers the sample only where the demo evidence exists", () => {
    expect(sampleAvailable(buildDemoProject(NOW))).toBe(true);
    expect(sampleAvailable(emptyProject("Mine", "Q?", NOW))).toBe(false);
  });
});

describe("approvals are invalidated by changes", () => {
  it("a reviewed project is eligible for export", () => {
    const e = evaluateExport(reviewedDemo());
    expect(e.blockers).toEqual([]);
    expect(e.eligible).toBe(true);
    expect(e.summary).toBe("4 of 5 claims linked to a stored passage; 1 marked as inference; none need review");
  });

  it("changing the question or scope invalidates the plan, the evidence set, and claim approvals", () => {
    const base = reviewedDemo();
    for (const changed of [setQuestion(base, "A different question?"), setPlan(base, { yearFrom: 2010 }), setPlan(base, { terms: ["sleep"] })]) {
      expect(isPlanApproved(changed)).toBe(false);
      expect(isEvidenceSetApproved(changed)).toBe(false);
      expect(changed.claims.every((c) => claimDecision(changed, c) === "stale")).toBe(true);
      expect(evaluateExport(changed).eligible).toBe(false);
    }
  });

  it("re-approving the plan alone does not restore downstream approvals", () => {
    const p = approvePlan(setQuestion(reviewedDemo(), "A different question?"), NOW);
    expect(isPlanApproved(p)).toBe(true);
    expect(isEvidenceSetApproved(p)).toBe(false);
    expect(codes(p)).toContain("claim_stale");
  });

  it("changing the evidence selection invalidates the evidence-set approval", () => {
    const p = toggleEvidence(reviewedDemo(), "ev_demo_3");
    expect(isEvidenceSetApproved(p)).toBe(false);
    expect(codes(p)).toContain("evidence_set_unapproved");
  });

  it("editing evidence text invalidates the set and the claims that rely on it, and re-runs the quote check", () => {
    const base = reviewedDemo();
    const p = updateEvidenceText(base, "ev_demo_2", "Completely different text that no longer contains the quotation.");
    expect(isEvidenceSetApproved(p)).toBe(false);
    const claim = p.claims.find((c) => c.evidenceId === "ev_demo_2")!;
    expect(claimDecision(p, claim)).toBe("stale");
    expect(inspectClaim(p, claim).excerpt.status).toBe("mismatch");
    // Claims on untouched evidence keep their approval.
    const other = p.claims.find((c) => c.evidenceId === "ev_demo_1")!;
    expect(claimDecision(p, other)).toBe("approved");
  });

  it("editing a claim makes its approval stale", () => {
    const base = reviewedDemo();
    const id = base.claims[0]!.id;
    for (const patch of [{ text: "Changed wording." }, { excerpt: "prior testing produced substantially greater retention" }, { evidenceId: "ev_demo_3" }, { limitations: "None at all." }]) {
      const p = updateClaim(base, id, patch);
      expect(claimDecision(p, p.claims[0]!)).toBe("stale");
      expect(p.claims[0]!.edited).toBe(true);
      expect(codes(p)).toContain("claim_stale");
    }
  });

  it("editing a source without a DOI makes its claims' approvals stale; correcting a DOI source to Crossref does not", () => {
    const base = reviewedDemo();
    const claim = base.claims.find((c) => c.evidenceId === "ev_demo_1")!;
    const sourceId = base.evidence.find((e) => e.id === "ev_demo_1")!.sourceId;
    const noDoi = { ...base, sources: base.sources.map((s) => (s.id === sourceId ? { ...s, doi: null } : s)) };
    // Approve again with the source as it now is (no DOI), then edit its year.
    const approved = decideClaim(noDoi, claim.id, "approved");
    expect(claimDecision(approved, approved.claims.find((c) => c.id === claim.id)!)).toBe("approved");
    const edited = updateCited(approved, sourceId, { year: 1999 });
    expect(claimDecision(edited, edited.claims.find((c) => c.id === claim.id)!)).toBe("stale");
    // With a DOI, the identity check covers the details, so the approval itself is unaffected.
    const doiEdit = updateCited(base, sourceId, { year: 1999 });
    expect(claimDecision(doiEdit, doiEdit.claims.find((c) => c.id === claim.id)!)).toBe("approved");
  });

  it("removing evidence or a source leaves the citing claim visibly broken, not silently fine", () => {
    const base = reviewedDemo();
    expect(codes(removeEvidence(base, "ev_demo_1"))).toContain("evidence_missing");
    const noSource = removeSource(base, "src_demo_1");
    expect(noSource.evidence.some((e) => e.sourceId === "src_demo_1")).toBe(false);
    expect(noSource.evidenceSet.ids).not.toContain("ev_demo_1");
    expect(codes(noSource)).toContain("evidence_missing");
  });

  it("a rejected claim is left out and does not block export", () => {
    let p = reviewedDemo();
    p = decideClaim(updateClaim(p, p.claims[4]!.id, { text: "Edited inference." }), p.claims[4]!.id, "rejected");
    const e = evaluateExport(p);
    expect(e.eligible).toBe(true);
    expect(e.counts).toMatchObject({ total: 4, rejected: 1, inference: 0 });
  });
});

describe("manual work without AI", () => {
  it("supports a hand-written claim on a pasted passage, but keeps its Not yet verified reference out of a reviewed export", () => {
    let p = emptyProject("Mine", "Does sleep help memory?", NOW);
    const src = manualSource({ title: "A hand-entered web page", authors: [{ family: "Example Org" }], year: 2024, type: "webpage", url: "https://example.org/x" }, null, NOW);
    p = addSource(p, src, null);
    const ev = pastedEvidence(src.id, "Sleep after study was followed by better recall in this hypothetical test passage.", "", NOW);
    expect(ev.provenance.note).toContain("has not checked this text against the publication");
    expect(ev.locator).toBe("Location not given");
    p = addEvidence(p, ev);
    p = approvePlan(p, NOW);
    p = approveEvidenceSet(toggleEvidence(p, ev.id), NOW);
    const c = manualClaim(NOW);
    p = addClaims(p, [c]);
    p = updateClaim(p, c.id, { text: "Sleep after study helped recall.", evidenceId: ev.id, excerpt: "followed by better recall" });
    p = decideClaim(p, c.id, "approved");
    const e = evaluateExport(p);
    // Everything else is in order: the only blocker is the unverified reference.
    expect(e.eligible).toBe(false);
    expect(e.blockers.map((b) => b.code)).toEqual(["identity_unverified"]);
    // A draft export still works.
    expect(buildBrief(p, null, "draft", NOW).ok).toBe(true);
    const i = e.inspections[0]!;
    expect(i.identity?.status).toBe("user_entered");
    expect(i.access).toBe("user_pasted");
    expect(i.claim.origin).toBe("manual");
    expect(i.claim.support).toBeNull();
  });

  it("an evidence claim with no source text cannot be checked and blocks export", () => {
    let p = reviewedDemo();
    const c = manualClaim(NOW);
    p = addClaims(p, [c]);
    p = decideClaim(updateClaim(p, c.id, { text: "A claim with nothing behind it." }), c.id, "approved");
    expect(codes(p)).toContain("evidence_missing");
  });

  it("prevents duplicates by DOI, ignoring case", () => {
    const p = buildDemoProject(NOW);
    const dup = manualSource(p.sources[0]!.cited, p.sources[0]!.doi!.toUpperCase(), NOW);
    expect(findDuplicate(p, dup)?.id).toBe("src_demo_1");
    expect(addSource(p, dup, null).sources).toHaveLength(7);
  });
});

describe("citation trap", () => {
  it("fails through the normal validators, with no status stored on the data", () => {
    const p = buildTrapProject(NOW);
    expect(p.kind).toBe("trap");
    expect(codes(p).sort()).toEqual(["claim_pending", "identity_mismatch", "quote_mismatch"]);
    const altered = p.sources.find((s) => s.testCorruption)!;
    expect(altered.doi).toBe("10.1126/science.1152408");
    const id = sourceIdentity(altered);
    expect(id.status).toBe("mismatch");
    expect(id.fields.filter((f) => f.verdict === "mismatch").map((f) => f.field)).toEqual(["first_author", "year"]);
    expect(inspectClaim(p, p.claims[0]!).excerpt.status).toBe("mismatch");
    expect(p.claims[0]!.testCorruption).toContain("deliberately changed");
  });

  it("clears only the issue that was actually fixed", () => {
    let p = buildTrapProject(NOW);
    const altered = p.sources.find((s) => s.testCorruption)!;

    p = takeRegistryValue(p, altered.id, "year");
    expect(sourceIdentity(p.sources.find((s) => s.id === altered.id)!).status).toBe("mismatch");
    expect(codes(p)).toContain("identity_mismatch");

    p = takeRegistryValue(p, altered.id, "first_author");
    expect(sourceIdentity(p.sources.find((s) => s.id === altered.id)!).status).toBe("matched");
    expect(codes(p).sort()).toEqual(["claim_pending", "quote_mismatch"]);

    const bad = p.claims[0]!;
    p = updateClaim(p, bad.id, {
      text: "Students who took practice recall tests remembered more than students who restudied on a test one week later.",
      excerpt: "Students then took a final retention test 5 min, 2 days, or 1 week later.",
    });
    expect(codes(p)).toEqual(["claim_pending"]);

    p = decideClaim(p, bad.id, "approved");
    expect(evaluateExport(p).eligible).toBe(true);
  });
});

describe("claim details (numbers and negations) in the gate", () => {
  it("flags a claim that states a number its excerpt does not contain, even when the quotation itself is genuine", () => {
    let p = buildTrapProject(NOW);
    const bad = p.claims[0]!;
    // The student fixes the quotation from the real passage but leaves "one month" in the claim.
    p = updateClaim(p, bad.id, { excerpt: "Students then took a final retention test 5 min, 2 days, or 1 week later." });
    expect(inspectClaim(p, p.claims[0]!).excerpt.status).toBe("matched");
    const issues = inspectClaim(p, p.claims[0]!).issues.map((x) => x.code);
    expect(issues).toContain("claim_detail_unsupported");
    expect(evaluateExport(p).blockers.find((b) => b.code === "claim_detail_unsupported")?.message).toContain("one month");
  });

  it("clears once the claim matches the excerpt, or the claim is marked as inference", () => {
    let p = buildTrapProject(NOW);
    const id = p.claims[0]!.id;
    p = updateClaim(p, id, { excerpt: "Students then took a final retention test 5 min, 2 days, or 1 week later." });
    const fixed = updateClaim(p, id, { text: "Students were given a final test up to one week later." });
    expect(inspectClaim(fixed, fixed.claims[0]!).issues.map((x) => x.code)).not.toContain("claim_detail_unsupported");
    const inference = updateClaim(p, id, { kind: "inference" });
    expect(inspectClaim(inference, inference.claims[0]!).issues.map((x) => x.code)).not.toContain("claim_detail_unsupported");
  });

  it("leaves every sample claim free of detail issues", () => {
    const p = reviewedDemo();
    for (const c of p.claims) expect(inspectClaim(p, c).details).toEqual([]);
  });
});

describe("mixing origins", () => {
  it("keeps sample, live and manual claims distinguishable", () => {
    let p = reviewedDemo();
    const live = claimsFromDraft(
      [{ text: "Tests enhance later retention more than additional study.", kind: "evidence", evidenceId: "ev_demo_3", excerpt: "Tests enhance later retention more than additional study of the material", support: "supports", limitations: "" }],
      "live_ai",
      "test-model",
      NOW,
    );
    p = addClaims(p, live);
    expect(p.claims.map((c) => c.origin)).toEqual(["sample", "sample", "sample", "sample", "sample", "live_ai"]);
    expect(codes(p)).toEqual(["claim_pending"]);
  });
});
