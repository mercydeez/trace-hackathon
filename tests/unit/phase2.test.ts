import { describe, expect, it } from "vitest";
import { selectedEvidence } from "@/lib/approvals";
import { SAMPLE_RAW } from "@/lib/demo";
import { aiUseStatement, buildDisclosure, passagesSentFor } from "@/lib/disclosure";
import { evaluateExport } from "@/lib/exportPolicy";
import { sourceIdentity } from "@/lib/identity";
import { addClaims, addSource, claimsFromDraft, decideClaim, manualSource, setWriting, updateClaim } from "@/lib/mutations";
import { referenceListEligibility } from "@/lib/referenceList";
import type { Project } from "@/lib/types";
import { screenDraft, validateDraft } from "@/lib/validateDraft";
import { NOW, reviewedDemo } from "./helpers";

/** The reviewed demo with its sample claims replaced by live-AI claims from a two-passage run, plus an unrelated larger run. */
function liveProject(): Project {
  const base = reviewedDemo();
  let p: Project = { ...base, claims: [], aiRuns: [] };
  const approved = selectedEvidence(p);
  // An earlier run that sent every passage but whose claims were all deleted: it must not be counted.
  p = { ...p, aiRuns: [{ id: "run_old", at: NOW, mode: "live", model: "gemini-x", evidenceIds: approved.map((e) => e.id), accepted: 0, rejected: [] }] };
  const two = approved.slice(0, 2).map((e) => e.id);
  const v = validateDraft(SAMPLE_RAW, approved.filter((e) => two.includes(e.id)));
  p = addClaims(p, claimsFromDraft(v.accepted, "live_ai", "gemini-x", NOW), { id: "run_new", at: NOW, mode: "live", model: "gemini-x", evidenceIds: two, accepted: v.accepted.length, rejected: [] });
  return p;
}

describe("trust labels", () => {
  it("a fuzzy title is a partial match, not a verified one, while the gate still treats it as matched", () => {
    const p = reviewedDemo();
    // The longest demo title: one extra word keeps word overlap above the 0.8 threshold.
    const s = [...p.sources].sort((a, b) => b.cited.title.split(" ").length - a.cited.title.split(" ").length)[0]!;
    const fuzzy = { ...s, cited: { ...s.cited, title: `${s.cited.title} revisited` } };
    const id = sourceIdentity(fuzzy);
    expect(id.status).toBe("matched");
    expect(id.partial).toBe(true);
    expect(sourceIdentity(s).partial).toBe(false);
  });
});

describe("Not yet verified references stay out of trusted output", () => {
  it("an in-text citation of a hand-entered reference blocks the reviewed export", () => {
    let p = reviewedDemo();
    p = addSource(p, manualSource({ title: "The violet stapler theorem for interstellar note-taking", authors: [{ family: "Imaginary", given: "A." }], year: 2025, type: "article-journal" }, null, NOW), null);
    p = setWriting(p, "Note-taking is interstellar (Imaginary, 2025).");
    const e = evaluateExport(p);
    expect(e.eligible).toBe(false);
    expect(e.blockers.some((b) => b.message.includes("Not yet verified"))).toBe(true);
  });

  it("the APA 7 list includes only verified references and counts the rest with reasons", () => {
    let p = reviewedDemo();
    p = addSource(p, manualSource({ title: "Hand-entered page", authors: [{ family: "Org" }], year: 2024, type: "webpage" }, null, NOW), null);
    const wrong = { ...p.sources[0]!, id: "src_wrong", doi: "10.9999/wrong", cited: { ...p.sources[0]!.cited, year: 2025 } };
    p = { ...p, sources: [...p.sources, wrong] };
    const r = referenceListEligibility(p.sources);
    expect(r.eligible).toHaveLength(7);
    expect(r.excluded.map((x) => x.reason).sort()).toEqual(["details disagree with Crossref", "not yet verified"]);
    expect(r.summary).toBe("2 excluded: 1 not yet verified, 1 details disagree with Crossref");
  });
});

describe("server-side screening of a provider answer", () => {
  it("drops items the validator rejects, keeps their reasons, and passes the rest unchanged", () => {
    const good = { text: "Testing beat restudying.", kind: "evidence", evidenceId: "ev_1", excerpt: "prior testing produced greater retention", support: "supports", limitations: "" };
    const raw = {
      claims: [
        good,
        { ...good, evidenceId: "ev_invented" },
        { ...good, doi: "10.9999/fake", author: "Imaginary" },
      ],
    };
    const s = screenDraft(raw, [{ id: "ev_1" }]);
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.raw.claims).toEqual([good]);
    expect(s.rejected.map((r) => r.reason)).toEqual([expect.stringContaining("not in the approved evidence set"), expect.stringContaining("fields the model may not supply")]);
    // What the server lets through still passes the browser's own validation.
    expect(validateDraft(s.raw, [{ id: "ev_1" }]).accepted).toHaveLength(1);
  });

  it("refuses an answer that is not usable at all", () => {
    expect(screenDraft("not json", [{ id: "ev_1" }])).toEqual({ ok: false, fatal: "The model's answer was not valid JSON." });
    expect(screenDraft({ notClaims: [] }, [{ id: "ev_1" }]).ok).toBe(false);
  });
});

describe("AI-use statement", () => {
  it("counts only the passages sent in the run that produced the included claims", () => {
    const p = liveProject();
    expect(passagesSentFor(p, p.claims)).toBe(2);
    const d = buildDisclosure(p, evaluateExport(p)).join(" ");
    expect(d).toContain("2 passages that the student had approved");
    expect(d).not.toContain(`${p.evidence.length} passages`);
  });

  it("states live drafting, its model and passages, and does not claim approval before it happened", () => {
    const p = liveProject();
    const s = aiUseStatement(p, evaluateExport(p));
    expect(s).toContain("AI (gemini-x) drafted three claims in TRACE");
    expect(s).toContain("from two source passages I had approved");
    expect(s).toContain("I included three, none approved yet.");
    expect(s).toMatch(/I have approved 0 of \d+ claims so far/);
    expect(s).not.toContain("I reviewed and approved");
  });

  it("states approval only when every included claim is approved, and mentions edits", () => {
    let p = liveProject();
    const first = p.claims[0]!;
    p = updateClaim(p, first.id, { text: `${first.text} (edited)` });
    for (const c of p.claims) p = decideClaim(p, c.id, "approved");
    const s = aiUseStatement(p, evaluateExport(p));
    expect(s).toContain(`I reviewed and approved all ${p.claims.length} claims`);
    expect(s).toContain("I approved and included three.");
    expect(s).toContain("I edited one of the included claims.");
  });

  it("labels sample output as sample, and says when no AI drafted anything", () => {
    const sample = reviewedDemo();
    const s1 = aiUseStatement(sample, evaluateExport(sample));
    expect(s1).toContain("labelled SAMPLE brief");
    expect(s1).toContain("not the result of a live AI call");
    expect(s1).not.toContain("I used TRACE with a generative AI model");

    const manual: Project = { ...reviewedDemo(), claims: reviewedDemo().claims.map((c) => ({ ...c, origin: "manual" as const })) };
    const s2 = aiUseStatement(manual, evaluateExport(manual));
    expect(s2).toContain("No generative AI drafted any claim.");
  });

  it("leaves the passage count out when the producing run was not recorded", () => {
    const p = liveProject();
    const unlinked = { ...p, claims: p.claims.map(({ runId: _r, ...c }) => (void _r, c)) };
    expect(passagesSentFor(unlinked, unlinked.claims)).toBeNull();
    const s = aiUseStatement(unlinked, evaluateExport(unlinked));
    // Without run records TRACE can only vouch for a minimum and cannot name the passages.
    expect(s).toContain("AI (gemini-x) drafted at least three claims in TRACE, from passages I had approved;");
  });
});
