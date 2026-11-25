import { describe, expect, it } from "vitest";
import { POST as draftRoute } from "@/app/api/draft/route";
import { claimDecision, isPlanApproved } from "@/lib/approvals";
import { buildDisclosure } from "@/lib/disclosure";
import { evaluateExport } from "@/lib/exportPolicy";
import { addClaims, approveEvidenceSet, approvePlan, claimsFromDraft, decideClaim, setRules } from "@/lib/mutations";
import { parseStored } from "@/lib/storage";
import { DEFAULT_RULES, type Project } from "@/lib/types";
import { NOW, reviewedDemo } from "./helpers";

const codes = (p: Project) => evaluateExport(p).blockers.map((b) => b.code);

/** Re-approve everything after a rule change, so only the rule's own effect remains. */
function reapprove(p: Project): Project {
  let q = approveEvidenceSet(approvePlan(p, NOW), NOW);
  for (const c of q.claims) if (c.decision !== "rejected") q = decideClaim(q, c.id, "approved");
  return q;
}

describe("rules in force", () => {
  it("default rules leave existing approvals intact", () => {
    const p = reviewedDemo();
    expect(p.rules).toEqual(DEFAULT_RULES);
    expect(evaluateExport(p).eligible).toBe(true);
  });

  it("changing a rule asks for the plan, evidence set and claims to be approved again", () => {
    const p = setRules(reviewedDemo(), { minYear: 2010 });
    expect(isPlanApproved(p)).toBe(false);
    expect(p.claims.every((c) => claimDecision(p, c) === "stale")).toBe(true);
  });

  it("a minimum publication year blocks claims whose source is older, and names the year", () => {
    const p = reapprove(setRules(reviewedDemo(), { minYear: 2010 }));
    const blockers = evaluateExport(p).blockers.filter((b) => b.code === "rule_min_year");
    // Sample claims 1 and 2 cite 2006 and 2008 papers; 3 and 4 cite 2017 and 2013.
    expect(blockers.map((b) => b.message)).toEqual([
      "Claim 1: its source is from 2006, but the rules in force require 2010 or later.",
      "Claim 2: its source is from 2008, but the rules in force require 2010 or later.",
    ]);
  });

  it("switching AI drafting off blocks live-AI claims until they are rejected, but not sample or own claims", () => {
    let p = reviewedDemo();
    const live = claimsFromDraft(
      [{ text: "Tests enhance later retention.", kind: "evidence", evidenceId: "ev_demo_3", excerpt: "Tests enhance later retention more than additional study of the material", support: "supports", limitations: "" }],
      "live_ai",
      "test-model",
      NOW,
    );
    p = addClaims(p, live);
    p = reapprove(setRules(p, { aiDrafting: "off" }));
    expect(codes(p)).toEqual(["rule_ai_off"]);
    p = decideClaim(p, live[0]!.id, "rejected");
    expect(evaluateExport(p).eligible).toBe(true);
  });

  it("states the rules in the AI-use disclosure", () => {
    const p = reapprove(setRules(reviewedDemo(), { aiDrafting: "off", minYear: 2000 }));
    const d = buildDisclosure(p, evaluateExport(p)).join(" ");
    expect(d).toContain("AI drafting switched off; sources published in 2000 or later; retracted sources blocked.");
  });

  it("projects saved before rules existed load with the default rules", () => {
    const { rules: _r, ...old } = reviewedDemo();
    void _r;
    const { state, problem } = parseStored(JSON.stringify({ version: 1, projects: [old], activeProjectId: old.id }));
    expect(problem).toBeNull();
    expect(state.projects[0]!.rules).toEqual(DEFAULT_RULES);
    expect(evaluateExport(state.projects[0]!).eligible).toBe(true);
  });

  it("the draft route refuses to call the AI provider when the rules switch drafting off", async () => {
    const res = await draftRoute(
      new Request("http://localhost/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aiDrafting: "off", question: "Q?", evidence: [{ id: "ev_1", label: "x", text: "some passage text" }] }),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, kind: "bad_request", message: expect.stringContaining("switched off") });
  });
});
