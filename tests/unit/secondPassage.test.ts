import { describe, expect, it } from "vitest";
import { claimDecision, claimFingerprint } from "@/lib/approvals";
import { buildBrief, citedSources } from "@/lib/exportMarkdown";
import { evaluateExport } from "@/lib/exportPolicy";
import { decideClaim, removeSource, setSecondPassage, updateClaim, updateEvidenceText } from "@/lib/mutations";
import { AppStateSchema, ProjectSchema, type Project } from "@/lib/types";
import { buildVerificationReport } from "@/lib/verificationReport";
import { NOW, reviewedDemo } from "./helpers";

/** A whole sentence of `text` long enough to be a checkable excerpt. */
function sentenceOf(text: string): string {
  return (text.match(/[^.]{40,}\./)?.[0] ?? text.slice(0, 80)).trim();
}

/**
 * The reviewed demo, with a "qualifies" passage on claim 1 taken from another source in the evidence set,
 * then approved again. `same` takes it from claim 1's own source instead.
 */
function withSecond(same = false): { p: Project; claimId: string; evidenceId: string } {
  let p = reviewedDemo();
  const claim = p.claims[0]!;
  const own = p.evidence.find((e) => e.id === claim.evidenceId)!;
  const other = same ? own : p.evidence.find((e) => e.sourceId !== own.sourceId && p.evidenceSet.ids.includes(e.id))!;
  p = setSecondPassage(p, claim.id, { role: "qualifies", evidenceId: other.id, excerpt: sentenceOf(other.text) });
  p = decideClaim(p, claim.id, "approved");
  return { p, claimId: claim.id, evidenceId: other.id };
}

const decision = (p: Project, id: string) => claimDecision(p, p.claims.find((c) => c.id === id)!);
const brief = (p: Project) => buildBrief(p, null, "draft", NOW);

describe("second passage: approvals", () => {
  it("claims without a second passage keep their fingerprint, so older saved approvals stay approved", () => {
    const p = reviewedDemo();
    for (const c of p.claims) {
      expect(claimFingerprint(p, c)).toBe(claimFingerprint(p, { ...c, second: undefined }));
      expect(claimDecision(p, c)).toBe("approved");
    }
    // A project saved before second passages existed has no `second` key at all, and still parses and holds.
    const saved = JSON.parse(JSON.stringify({ version: 1, projects: [p], activeProjectId: p.id }));
    for (const c of saved.projects[0].claims) expect("second" in c).toBe(false);
    const loaded = AppStateSchema.parse(saved).projects[0]!;
    expect(loaded.claims.every((c) => claimDecision(loaded, c) === "approved")).toBe(true);
    expect(evaluateExport(loaded).eligible).toBe(true);
  });

  it("adding a second passage makes the approval stale; approving again passes the gate", () => {
    const p0 = reviewedDemo();
    const id = p0.claims[0]!.id;
    const other = p0.evidence.find((e) => e.sourceId !== p0.evidence.find((x) => x.id === p0.claims[0]!.evidenceId)!.sourceId)!;
    const p1 = setSecondPassage(p0, id, { evidenceId: other.id, excerpt: sentenceOf(other.text) });
    expect(decision(p1, id)).toBe("stale");
    expect(evaluateExport(p1).blockers.map((b) => b.code)).toContain("claim_stale");
    const p2 = decideClaim(p1, id, "approved");
    expect(decision(p2, id)).toBe("approved");
    expect(evaluateExport(p2).eligible).toBe(true);
  });

  it("switching the label, editing either excerpt, replacing the passage, or removing it each make the approval stale", () => {
    const { p, claimId, evidenceId } = withSecond();
    expect(evaluateExport(p).eligible).toBe(true);
    const another = p.evidence.find((e) => e.id !== evidenceId && e.id !== p.claims[0]!.evidenceId)!;
    const changes: Project[] = [
      setSecondPassage(p, claimId, { role: "challenges" }),
      setSecondPassage(p, claimId, { excerpt: p.claims[0]!.second!.excerpt.slice(0, -10) }),
      setSecondPassage(p, claimId, { evidenceId: another.id }),
      setSecondPassage(p, claimId, null),
      updateClaim(p, claimId, { excerpt: p.claims[0]!.excerpt.slice(0, -5) }),
      // Editing the stored text of the second passage changes its version.
      updateEvidenceText(p, evidenceId, p.evidence.find((e) => e.id === evidenceId)!.text + " Added later."),
    ];
    for (const changed of changes) {
      expect(decision(changed, claimId)).toBe("stale");
      expect(evaluateExport(changed).eligible).toBe(false);
    }
    // Switching the label back restores the exact content that was approved.
    const back = setSecondPassage(setSecondPassage(p, claimId, { role: "challenges" }), claimId, { role: "qualifies" });
    expect(decision(back, claimId)).toBe("approved");
  });

  it("a removed linked source is a blocker for the reviewed export, even after approving again", () => {
    const { p, claimId, evidenceId } = withSecond();
    const sourceId = p.evidence.find((e) => e.id === evidenceId)!.sourceId;
    let gone = removeSource(p, sourceId);
    gone = decideClaim(gone, claimId, "approved");
    const ev = evaluateExport(gone);
    expect(ev.eligible).toBe(false);
    expect(ev.blockers.find((b) => b.code === "evidence_missing")?.message).toMatch(/^Claim 1: its qualifying passage has no stored passage/);
    expect(buildBrief(gone, null, "reviewed", NOW).ok).toBe(false);
  });

  it("an excerpt that is not in the second passage's stored text blocks the export", () => {
    const { p, claimId } = withSecond();
    const bad = decideClaim(setSecondPassage(p, claimId, { excerpt: "These words were never in the stored abstract at all." }), claimId, "approved");
    expect(evaluateExport(bad).blockers.map((b) => b.message)).toContain("Claim 1: the excerpt of its qualifying passage is not in the stored source text.");
  });

  it("a second passage that was added but not chosen yet blocks the export until chosen or removed", () => {
    const p0 = reviewedDemo();
    const id = p0.claims[0]!.id;
    const empty = decideClaim(setSecondPassage(p0, id, {}), id, "approved");
    expect(evaluateExport(empty).blockers.map((b) => b.code)).toContain("evidence_missing");
    const removed = decideClaim(setSecondPassage(empty, id, null), id, "approved");
    expect(evaluateExport(removed).eligible).toBe(true);
  });

  it("an inference drops its second passage, and single-passage claims are untouched", () => {
    const { p, claimId } = withSecond();
    const inf = updateClaim(p, claimId, { kind: "inference" });
    expect(inf.claims[0]!.second).toBeUndefined();
    expect(evaluateExport(inf).inspections[0]!.second).toBeNull();
    expect(evaluateExport(p).inspections.slice(1).every((i) => i.second === null)).toBe(true);
  });
});

describe("second passage: brief, bibliography and report", () => {
  it("the reviewed brief shows both passages with their labels, provenance, and both sources", () => {
    const { p, claimId, evidenceId } = withSecond();
    const secondSource = p.evidence.find((e) => e.id === evidenceId)!.sourceId;
    expect(citedSources(p).map((s) => s.id)).toContain(secondSource);
    const refs = citedSources(p).map((s) => ({ id: s.id, parts: [{ text: `Ref ${s.id}.`, italic: false }], text: `Ref ${s.id}.`, inText: `(Ref ${s.id})` }));
    const out = buildBrief(p, refs, "reviewed", NOW);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const c = p.claims.find((x) => x.id === claimId)!;
    expect(out.markdown).toContain(`Supporting excerpt: “${c.excerpt}”`);
    expect(out.markdown).toContain(`**Qualifies** (the student's judgement): “${c.second!.excerpt}” (Ref ${secondSource})`);
    expect(out.markdown).toMatch(/- Claim 1, supporting passage → .+excerpt found in the stored text/);
    expect(out.markdown).toMatch(/- Claim 1, qualifying passage \(labelled Qualifies by the student\) → .+excerpt found in the stored text/);
    expect(out.markdown).toContain(`- Ref ${secondSource}.`);
    // Challenges is carried the same way.
    const ch = decideClaim(setSecondPassage(p, claimId, { role: "challenges" }), claimId, "approved");
    const out2 = buildBrief(ch, refs, "reviewed", NOW);
    expect(out2.ok && out2.markdown.includes("**Challenges** (the student's judgement)")).toBe(true);
  });

  it("a source used by both passages is listed once in the bibliography", () => {
    const { p } = withSecond(true);
    const before = citedSources(reviewedDemo()).length;
    expect(citedSources(p).length).toBe(before);
    const ids = citedSources(p).map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a draft with a stale second passage is labelled DRAFT and lists the open point", () => {
    const { p, claimId } = withSecond();
    const out = brief(setSecondPassage(p, claimId, { role: "challenges" }));
    expect(out.ok && out.markdown.startsWith("> **DRAFT — NOT REVIEWED.**")).toBe(true);
    expect(out.ok && out.markdown.includes("Claim 1: changed after you approved it.")).toBe(true);
  });

  it("the verification report shows the second passage's role, checks and the student's decision", () => {
    const { p, claimId } = withSecond();
    const text = buildVerificationReport(p, NOW).text;
    expect(text).toContain("- Second passage, role: Qualifies (the student's judgement, not checked by TRACE)");
    expect(text).toMatch(/ {2}- Quote check: Excerpt found in stored text/);
    expect(text).toContain("- Student decision: Student approved");
    const stale = buildVerificationReport(setSecondPassage(p, claimId, { role: "challenges" }), NOW).text;
    expect(stale).toContain("- Second passage, role: Challenges");
    expect(stale).toMatch(/- Student decision: (?!Student approved)/);
  });

  it("round-trips through the project schema with the second passage intact", () => {
    const { p } = withSecond();
    const again = ProjectSchema.parse(JSON.parse(JSON.stringify(p)));
    expect(again.claims[0]!.second).toEqual(p.claims[0]!.second);
    expect(evaluateExport(again).eligible).toBe(true);
  });
});
