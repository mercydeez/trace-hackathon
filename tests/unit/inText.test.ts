import { describe, expect, it } from "vitest";
import { buildDemoProject } from "@/lib/demo";
import { findCitations, matchCitations, suffixOf } from "@/lib/inText";
import { NOW } from "./helpers";

const sources = buildDemoProject(NOW).sources;
// The formatted APA list gives src_demo_1 the letter "a" and src_demo_3 "b" (see providers.test.ts).
const LETTERS = new Map([["src_demo_1", "a"], ["src_demo_3", "b"]]);
const summary = (text: string) => matchCitations(findCitations(text), sources, LETTERS).map((c) => [c.firstAuthor, c.year, c.suffix, c.sourceId]);

describe("finding in-text citations in the student's text", () => {
  it("reads parenthetical citations, including several in one bracket and page numbers", () => {
    const text = "Testing helps (Roediger & Karpicke, 2006b). It holds broadly (Adesope et al., 2017; Dunlosky et al., 2013, p. 4).";
    expect(summary(text)).toEqual([
      ["Roediger", 2006, "b", "src_demo_3"],
      ["Adesope", 2017, "", "src_demo_4"],
      ["Dunlosky", 2013, "", "src_demo_5"],
    ]);
  });

  it("reads narrative citations and Harvard's 'and'", () => {
    expect(summary("Karpicke and Roediger (2008) showed it. Rowland (2014) reviewed it.")).toEqual([
      ["Karpicke", 2008, "", "src_demo_2"],
      ["Rowland", 2014, "", "src_demo_6"],
    ]);
    expect(summary("(Karpicke and Roediger, 2008)")).toEqual([["Karpicke", 2008, "", "src_demo_2"]]);
  });

  it("flags a citation with no source in the project instead of trusting it", () => {
    expect(summary("As shown before (Smith & Jones, 2020).")).toEqual([["Smith", 2020, "", null]]);
    // A real author with the wrong year is not the paper in the library.
    expect(summary("Karpicke and Roediger (2011) found this.")).toEqual([["Karpicke", 2011, "", null]]);
  });

  it("ignores brackets that are not citations", () => {
    expect(findCitations("Retention was higher (by about a week) and recall improved (see Table 2).")).toEqual([]);
    expect(findCitations("Rates rose (2019 data were incomplete).")).toEqual([]);
  });

  it("records the offset of each citation", () => {
    const text = "Intro. Roediger and Karpicke (2006) argued.";
    const [c] = findCitations(text);
    expect(text.slice(c!.start, c!.start + c!.raw.length)).toBe("Roediger and Karpicke (2006)");
  });

  it("uses the a/b letter to choose between two works by the same authors in the same year, and says when it cannot", () => {
    const [a] = matchCitations(findCitations("(Roediger & Karpicke, 2006a)"), sources, LETTERS);
    expect(a).toMatchObject({ sourceId: "src_demo_1", ambiguous: false });
    const [none] = matchCitations(findCitations("(Roediger & Karpicke, 2006)"), sources, LETTERS);
    expect(none?.ambiguous).toBe(true);
  });

  it("reads the a/b letter from a formatted in-text citation", () => {
    expect(suffixOf("(Roediger & Karpicke, 2006b)")).toBe("b");
    expect(suffixOf("(Adesope et al., 2017)")).toBe("");
  });
});
