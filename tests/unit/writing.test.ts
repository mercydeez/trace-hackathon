import { describe, expect, it } from "vitest";
import fixtures from "@/data/demo-sources.json";
import type { CitableInput, FormattedReference, WorkRecord } from "@/lib/api";
import { buildDisclosure } from "@/lib/disclosure";
import { buildBrief, citedSources } from "@/lib/exportMarkdown";
import { evaluateExport } from "@/lib/exportPolicy";
import { setCitationStyle, setWriting } from "@/lib/mutations";
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
