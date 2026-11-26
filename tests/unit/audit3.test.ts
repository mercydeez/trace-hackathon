import { describe, expect, it } from "vitest";
import { aiUseStatement, buildDisclosure } from "@/lib/disclosure";
import { buildBrief, citedSources } from "@/lib/exportMarkdown";
import { evaluateExport } from "@/lib/exportPolicy";
import { compareMetadata } from "@/lib/identity";
import { addClaims, approveEvidenceSet, approvePlan, decideClaim, manualClaim, updateClaim } from "@/lib/mutations";
import { judgeReference } from "@/lib/refCheck";
import { parseReference } from "@/lib/refList";
import { formatApa } from "@/lib/server/citations";
import { normaliseDataCite } from "@/lib/server/datacite";
import type { Project } from "@/lib/types";
import { NOW, reviewedDemo, TEST_RECORD } from "./helpers";

describe("reference checks compare only what was supplied", () => {
  it("a resolving DOI with only a year typed is a possible match, never a full match; with nothing usable it is DOI-only", () => {
    const yearOnly = judgeReference({ raw: "", doi: "10.5555/x", title: null, firstAuthor: null, year: 2011, query: "" }, TEST_RECORD, "doi");
    expect(yearOnly.verdict).toBe("possible");
    const nothing = judgeReference({ raw: "", doi: "10.5555/x", title: null, firstAuthor: null, year: null, query: "" }, TEST_RECORD, "doi");
    expect(nothing.verdict).toBe("doi_only");
  });

  it("a search hit whose author differs, with no title to agree, is no close match, not a correctable mismatch", () => {
    const r = judgeReference(parseReference("Smith, J. Retrieval practice in classrooms and beyond"), TEST_RECORD, "search");
    expect(r.verdict).toBe("no_close_match");
  });

  it("a search hit with an agreeing title but a wrong year stays a correctable mismatch", () => {
    const r = judgeReference(parseReference(`Okafor, A. (1999). ${TEST_RECORD.title}.`), TEST_RECORD, "search");
    expect(r.verdict).toBe("mismatch");
  });

  it("a registry record with no title is a point to check, not a title mismatch", () => {
    const [title] = compareMetadata({ title: "Something", authors: [], year: null }, { ...TEST_RECORD, title: "" });
    expect(title).toMatchObject({ verdict: "note", message: "The registry lists no title, so the title cannot be compared." });
  });

  it("an empty DataCite year is no year, not year 0", () => {
    const w = normaliseDataCite({ data: { attributes: { doi: "10.5061/x", titles: [{ title: "T" }], publicationYear: "" } } }, NOW)!;
    expect(w.record.year).toBeNull();
    expect(w.record.years).toEqual({});
  });
});

describe("AI-use wording follows what actually happened", () => {
  it("says AI drafting was used when every AI claim was rejected, instead of 'no AI'", () => {
    let p: Project = { ...reviewedDemo(), claims: [] };
    p = { ...p, aiRuns: [{ id: "run_live", at: NOW, mode: "live", model: "gemini-x", evidenceIds: p.evidenceSet.ids, accepted: 0, rejected: ["It cites an unapproved ID."] }] };
    const c = manualClaim(NOW);
    p = addClaims(p, [c]);
    p = updateClaim(p, c.id, { kind: "inference", text: "My own reasoning." });
    p = decideClaim(p, c.id, "approved");
    const statement = aiUseStatement(p, evaluateExport(p));
    expect(statement).toContain("AI drafting was used in this project, but none of its claims are included here.");
    expect(statement).not.toContain("No generative AI drafted any claim.");
    expect(buildDisclosure(p, evaluateExport(p)).join(" ")).toContain("TRACE rejected 1 AI-drafted item");
  });

  it("does not call items rejected from the labelled sample 'AI-drafted'", () => {
    const p = reviewedDemo();
    const withRejectedSample = { ...p, aiRuns: p.aiRuns.map((r) => ({ ...r, rejected: ["Over the limit of 5 claims."] })) };
    expect(buildDisclosure(withRejectedSample, evaluateExport(withRejectedSample)).join(" ")).not.toContain("AI-drafted item");
  });
});

describe("retracted sources allowed by the rules are still flagged in the reviewed brief", () => {
  it("prints a retraction notice next to the claim's provenance", () => {
    let p = reviewedDemo();
    const target = p.sources[0]!;
    p = {
      ...p,
      rules: { ...p.rules, blockRetracted: false },
      sources: p.sources.map((s) => (s.id === target.id && s.registry ? { ...s, registry: { ...s.registry, record: { ...s.registry.record, retraction: { kind: "retraction" as const, noticeDoi: null, date: "2010-02-06", source: null } } } } : s)),
    };
    // Changing the rules asks for the plan, the evidence set and each claim to be approved again.
    p = approveEvidenceSet(approvePlan(p, NOW), NOW);
    for (const c of p.claims) p = decideClaim(p, c.id, "approved");
    expect(evaluateExport(p).blockers).toEqual([]);
    const refs = formatApa(citedSources(p).map((s) => ({ id: s.id, doi: s.doi, cited: s.cited })));
    const r = buildBrief(p, refs, "reviewed", NOW);
    expect(r.ok && r.markdown).toContain("**RETRACTION NOTICE:** the registry lists a retraction notice (2010-02-06)");
  });
});
