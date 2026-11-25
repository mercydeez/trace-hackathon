import { describe, expect, it } from "vitest";
import fixtures from "@/data/demo-sources.json";
import type { CitableInput, FormattedReference, WorkRecord } from "@/lib/api";
import { buildDisclosure } from "@/lib/disclosure";
import { buildBrief, citedSources } from "@/lib/exportMarkdown";
import { evaluateExport } from "@/lib/exportPolicy";
import { decideClaim, setCitationStyle, setWriting } from "@/lib/mutations";
import { formatApa } from "@/lib/server/citations";
import { parseStored } from "@/lib/storage";
import { NOW, reviewedDemo } from "./helpers";

const refsFor = (p: ReturnType<typeof reviewedDemo>): FormattedReference[] =>
  formatApa(
    citedSources(p).map((s) => ({ id: s.id, doi: s.doi, cited: s.cited })),
    p.citationStyle,
  );

describe("the student's own text", () => {
  it("a citation with no source in the project blocks a reviewed export", () => {
    const p = setWriting(reviewedDemo(), "Testing beats rereading (Smith & Jones, 2020).");
    const e = evaluateExport(p);
    expect(e.eligible).toBe(false);
    expect(e.blockers.map((b) => b.message)).toEqual(['Your text cites "Smith & Jones, 2020", which is not a source in this project. Add the source, correct the citation, or remove it.']);
  });

  it("a correct citation passes, and its source joins the reference list even if no claim cites it", () => {
    // Rowland (2014) is in the demo library but no sample claim cites it.
    const p = setWriting(reviewedDemo(), "A meta-analysis supports this (Rowland, 2014).");
    expect(evaluateExport(p).eligible).toBe(true);
    expect(citedSources(p).map((s) => s.id)).toContain("src_demo_6");
  });

  it("does not accept a year suffix the source was never assigned", () => {
    const p = setWriting(reviewedDemo(), "A meta-analysis supports this (Rowland, 2014b).");
    expect(evaluateExport(p).blockers.map((b) => b.code)).toEqual(["text_citation_unknown"]);
  });

  it("rejects an explicitly wrong coauthor in both narrative and parenthetical citations", () => {
    for (const cite of ["(Karpicke & Smith, 2008)", "However, Karpicke and Smith (2008)"]) {
      const p = setWriting(reviewedDemo(), `${cite} found a benefit.`);
      expect(evaluateExport(p).blockers.map((b) => b.code)).toEqual(["text_citation_unknown"]);
    }
    const p = setWriting(reviewedDemo(), "However, Karpicke and Roediger (2008) found a benefit.");
    expect(evaluateExport(p).eligible).toBe(true);
  });

  it("the export carries the text, the matching references and an honest disclosure", () => {
    const p = setWriting(reviewedDemo(), "Testing helps (Karpicke & Roediger, 2008). Rowland (2014) agrees.");
    const r = buildBrief(p, refsFor(p), "reviewed", NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.markdown).toContain("## Your text\n\nTesting helps (Karpicke & Roediger, 2008). Rowland (2014) agrees.");
    expect(r.markdown).toContain("## Claims and evidence");
    expect(r.markdown).toContain("Rowland, C. A. (2014).");
    const d = buildDisclosure(p, evaluateExport(p)).join(" ");
    expect(d).toContain("typed or pasted by the student");
    expect(d).toContain("TRACE did not generate any of it");
  });

  it("a cited source whose details disagree with Crossref blocks, like a claim would", () => {
    let p = reviewedDemo();
    p = { ...p, sources: p.sources.map((s) => (s.id === "src_demo_6" ? { ...s, cited: { ...s.cited, title: "A different title entirely about sleep" } } : s)) };
    p = setWriting(p, "See Rowland (2014).");
    expect(evaluateExport(p).blockers.map((b) => b.code)).toEqual(["text_citation_flagged"]);
  });

  it("every unusual form of an invented citation still blocks", () => {
    for (const cite of ["(World Health Organization, 2020)", "(Fabricated, n.d.)", "(van der Fake, 2019)", "(Smith, Jones, & Brown, 2020)", "(Roediger & Karpicke, 2006a, 2031)", "(Rowland, 2014; see also Invented, 2015)", "(as cited in Smith, 2020)", "(al-Rashid, 2020)", "(fake, 2020)", "(Fake, in press)", "(Rowland, 2014; bogus, 2019)"]) {
      const e = evaluateExport(setWriting(reviewedDemo(), `A claim ${cite}.`));
      expect(e.eligible, cite).toBe(false);
      expect(e.blockers.every((b) => b.code === "text_citation_unknown"), cite).toBe(true);
    }
  });

  it("the a/b letter decides which source is cited, at the gate and in the reference list", () => {
    const p = setWriting(reviewedDemo(), "Testing helps (Roediger & Karpicke, 2006b).");
    expect(evaluateExport(p).eligible).toBe(true);
    expect(citedSources(p).map((s) => s.id)).toContain("src_demo_3");
    const unlettered = evaluateExport(setWriting(reviewedDemo(), "Testing helps (Roediger & Karpicke, 2006)."));
    expect(unlettered.blockers.map((b) => b.code)).toEqual(["text_citation_ambiguous"]);
  });

  it.each(["apa", "harvard1"] as const)("aligns exported year suffixes with the %s reference list", (style) => {
    const p = setCitationStyle(reviewedDemo(), style);
    const writing = "  However, Roediger and Karpicke (2006b, p. 3) agreed (see Rowland, 2014; see also Roediger & Karpicke, 2006b).";
    const single = setWriting(decideClaim(p, p.claims[0]!.id, "rejected"), writing);
    const one = buildBrief(single, refsFor(single), "reviewed", NOW);
    expect(one.ok && one.markdown).toContain(writing.trim().replaceAll("2006b", "2006"));
    expect(one.ok && one.markdown).toContain("TRACE adjusted citation year letters");
    expect(single.writing).toBe(writing);

    const both = setWriting(p, "See Roediger and Karpicke (2006a, 2006b).");
    const two = buildBrief(both, refsFor(both), "reviewed", NOW);
    expect(two.ok && two.markdown).toContain("See Roediger and Karpicke (2006a, 2006b).");
  });

  it("a citation in the text follows the minimum-year rule, as a claim's source does", () => {
    let p = setWriting(reviewedDemo(), "See Rowland (2014).");
    p = { ...p, rules: { ...p.rules, minYear: 2015 } };
    expect(evaluateExport(p).blockers.map((b) => b.code)).toContain("rule_min_year");
    expect(evaluateExport(p).blockers.some((b) => b.message.includes('"Rowland (2014)"'))).toBe(true);
  });

  it("a DRAFT export's disclosure does not claim the student approved everything", () => {
    const p = setWriting(reviewedDemo(), "Testing helps (Smith & Jones, 2020).");
    const d = buildDisclosure(p, evaluateExport(p)).join(" ");
    expect(d).toContain("This is a DRAFT");
    expect(d).not.toContain("Every in-text citation in it was matched");
    expect(d).not.toContain("reviewed and approved each claim");
  });

  it("projects saved before the writing space existed load with empty text and APA", () => {
    const { writing: _w, citationStyle: _c, ...old } = reviewedDemo();
    void _w;
    void _c;
    const { state } = parseStored(JSON.stringify({ version: 1, projects: [old], activeProjectId: old.id }));
    expect(state.projects[0]).toMatchObject({ writing: "", citationStyle: "apa" });
  });
});

describe("Harvard reference style", () => {
  it("formats the same stored metadata in Harvard, with 'and' in text", () => {
    const works = fixtures.works as WorkRecord[];
    const inputs: CitableInput[] = [works[1]!].map((w) => {
      const { years: _y, ...cited } = w.record;
      void _y;
      return { id: "s2", doi: w.doi, cited };
    });
    const [ref] = formatApa(inputs, "harvard1");
    expect(ref!.inText).toBe("(Karpicke and Roediger, 2008)");
    expect(ref!.text).toContain("Karpicke, J.D. and Roediger, H.L. (2008)");
  });

  it("the export heading follows the chosen style", () => {
    const p = setCitationStyle(reviewedDemo(), "harvard1");
    const r = buildBrief(p, refsFor(p), "reviewed", NOW);
    expect(r.ok && r.markdown).toContain("## References (Harvard)");
  });
});
