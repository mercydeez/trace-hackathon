import { describe, expect, it } from "vitest";
import { selectedEvidence } from "@/lib/approvals";
import { SAMPLE_RAW } from "@/lib/demo";
import { aiUseStatement, buildDisclosure, draftingRecord } from "@/lib/disclosure";
import { buildBrief, citedSources } from "@/lib/exportMarkdown";
import { evaluateExport, exportReadiness } from "@/lib/exportPolicy";
import { addClaims, claimsFromDraft, decideClaim, removeClaim } from "@/lib/mutations";
import { formatApa } from "@/lib/server/citations";
import type { Project } from "@/lib/types";
import { validateDraft } from "@/lib/validateDraft";
import { buildVerificationReport } from "@/lib/verificationReport";
import { NOW, reviewedDemo } from "./helpers";

/** The reviewed demo with its sample claims replaced by `n` live-AI claims from one run per entry of `runs`. */
function liveDrafts(runs: number[], discarded = 0): Project {
  let p: Project = { ...reviewedDemo(), claims: [], aiRuns: [] };
  const approved = selectedEvidence(p);
  const v = validateDraft(SAMPLE_RAW, approved);
  let used = 0;
  runs.forEach((n, r) => {
    const claims = claimsFromDraft(v.accepted.slice(used, used + n), "live_ai", "gemini-x", NOW);
    used += n;
    p = addClaims(p, claims, { id: `run_${r}`, at: NOW, mode: "live", model: "gemini-x", evidenceIds: approved.map((e) => e.id), accepted: claims.length, rejected: r === 0 ? Array(discarded).fill("It cites an unapproved ID.") : [] });
  });
  return p;
}

const statementOf = (p: Project) => aiUseStatement(p, evaluateExport(p));
const disclosureOf = (p: Project) => buildDisclosure(p, evaluateExport(p)).join(" ");

describe("AI-use statement: drafted and included are separate counts", () => {
  it("Gemini drafts three, the student rejects one and approves two: drafted three, included two, everywhere", () => {
    let p = liveDrafts([3]);
    const [a, b, c] = p.claims;
    p = decideClaim(p, a!.id, "rejected");
    p = decideClaim(p, b!.id, "approved");
    p = decideClaim(p, c!.id, "approved");
    expect(draftingRecord(p, evaluateExport(p))).toMatchObject({ drafted: 3, included: 2, approved: 2, rejected: 1, removed: 0, atLeast: false });

    const statement = statementOf(p);
    expect(statement).toContain("AI (gemini-x) drafted three claims in TRACE");
    expect(statement).toContain("I approved and included two and rejected one.");
    expect(statement).not.toContain("drafted two");

    // The same counts in the verification report and in the downloaded brief.
    expect(buildVerificationReport(p, NOW).text).toContain(statement);
    const refs = formatApa(citedSources(p).map((s) => ({ id: s.id, doi: s.doi, cited: s.cited })));
    const brief = buildBrief(p, refs, evaluateExport(p).eligible ? "reviewed" : "draft", NOW);
    expect(brief.ok && brief.markdown).toContain("drafted three claims through TRACE");
    expect(brief.ok && brief.markdown).toContain("The student approved and included two and rejected one.");
  });

  it("all drafts rejected: still discloses that AI drafted them", () => {
    let p = liveDrafts([3]);
    for (const c of p.claims) p = decideClaim(p, c.id, "rejected");
    const s = statementOf(p);
    expect(s).toContain("AI (gemini-x) drafted three claims in TRACE");
    expect(s).toContain("I rejected all three, so none is included.");
    expect(disclosureOf(p)).toContain("The student rejected all three, so none is included.");
  });

  it("adds up several runs, counts deleted drafts as removed, and reports discarded output separately", () => {
    let p = liveDrafts([2, 2], 1);
    p = removeClaim(p, p.claims[0]!.id);
    p = decideClaim(p, p.claims[0]!.id, "approved");
    const s = statementOf(p);
    expect(s).toContain("drafted four claims");
    expect(s).toContain("I included three, of which one is approved so far and removed one.");
    expect(s).toContain("TRACE discarded one further item the model returned because it broke its output rules.");
  });

  it("older projects without run links state a minimum, not a guess", () => {
    const p = liveDrafts([3]);
    const unlinked: Project = { ...p, claims: p.claims.map(({ runId: _r, ...c }) => (void _r, c)) };
    expect(statementOf(unlinked)).toContain("drafted at least three claims");
  });

  it("sample and manual work are unchanged: no AI drafting is claimed", () => {
    const s = statementOf(reviewedDemo());
    expect(s).toContain("labelled SAMPLE brief");
    expect(s).not.toContain("drafted");
  });
});

describe("export readiness: one state for the report and the buttons", () => {
  const ready = reviewedDemo();
  it("separates review status from download readiness", () => {
    const e = evaluateExport(ready);
    expect(exportReadiness(e, "ready")).toMatchObject({ state: "ready", reviewedAvailable: true, draftAvailable: true });
    expect(exportReadiness(e, "loading")).toMatchObject({ state: "formatting", label: "Review checks passed. Formatting references.", reviewedAvailable: false });
    expect(exportReadiness(e, "failed")).toMatchObject({ state: "format_failed", label: "Review checks passed. Reference formatting failed. Retry to download.", reviewedAvailable: false });
    const blocked = evaluateExport(decideClaim(ready, ready.claims[0]!.id, "pending"));
    expect(exportReadiness(blocked, "ready")).toMatchObject({ state: "review_blocked", reviewedAvailable: false, draftAvailable: true });
    const empty = evaluateExport({ ...ready, claims: [] });
    expect(exportReadiness(empty, "none")).toMatchObject({ state: "empty", reviewedAvailable: false, draftAvailable: false });
  });

  it("the report says the same as the buttons, and never promises a draft when there is nothing to export", () => {
    expect(buildVerificationReport(ready, NOW, "failed").text).toContain("**Download:** Review checks passed. Reference formatting failed. Retry to download.");
    expect(buildVerificationReport(ready, NOW, "loading").text).toContain("**Download:** Review checks passed. Formatting references.");
    expect(buildVerificationReport(ready, NOW, "ready").text).toContain("**Download:** Review checks passed. The reviewed brief is ready to download.");
    expect(buildVerificationReport(ready, NOW).text).not.toContain("ALLOWED");
    const empty = buildVerificationReport({ ...ready, claims: [] }, NOW, "none").text;
    expect(empty).toContain("No claims yet, so there is nothing to export.");
    expect(empty).not.toContain("draft can be downloaded");
  });
});
