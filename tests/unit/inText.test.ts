import { describe, expect, it } from "vitest";
import { buildDemoProject } from "@/lib/demo";
import { findCitations, matchCitations, suffixOf, yearLetters } from "@/lib/inText";
import { formatApa } from "@/lib/server/citations";
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

  it("reads the forms students commonly type, so an invented one cannot pass unread", () => {
    const authors = (text: string) => findCitations(text).map((c) => [c.firstAuthor, c.year, c.suffix]);
    expect(authors("(World Health Organization, 2020)")).toEqual([["World Health Organization", 2020, ""]]);
    expect(authors("(Fabricated, n.d.)")).toEqual([["Fabricated", null, ""]]);
    expect(authors("(van der Fake, 2019)")).toEqual([["van der Fake", 2019, ""]]);
    expect(authors("(Ó Súilleabháin, 2020)")).toEqual([["Ó Súilleabháin", 2020, ""]]);
    expect(authors("(Smith, Jones, & Brown, 2020)")).toEqual([["Smith", 2020, ""]]);
    expect(authors("(Roediger & Karpicke, 2006a, 2031)")).toEqual([
      ["Roediger", 2006, "a"],
      ["Roediger", 2031, ""],
    ]);
    expect(authors("(Rowland, 2014; see also Invented, 2015)")).toEqual([
      ["Rowland", 2014, ""],
      ["Invented", 2015, ""],
    ]);
    expect(authors("(as cited in Smith, 2020)")).toEqual([["Smith", 2020, ""]]);
    expect(authors("(U.S. Dept. of Ed., 2020)")).toEqual([["U.S. Dept. of Ed.", 2020, ""]]);
  });

  it("reads the first author of a narrative citation, not the sentence word before it", () => {
    const authors = (text: string) => findCitations(text).map((c) => c.firstAuthor);
    expect(authors("Smith's (2020) study")).toEqual(["Smith"]);
    expect(authors("Smith, Jones and Brown (2020) found")).toEqual(["Smith"]);
    expect(authors("However, Smith and Jones (2020) found")).toEqual(["Smith"]);
    expect(authors("In Roediger and Karpicke (2006a), students")).toEqual(["Roediger"]);
    expect(authors("Adesope et al.'s (2017) meta-analysis")).toEqual(["Adesope"]);
  });

  it("does not treat dates, tables or statistics in brackets as citations", () => {
    expect(findCitations("Data were collected (March 2020) and again (Spring 2021).")).toEqual([]);
    expect(findCitations("See the results (Table 3, 2020) and the sample (N = 120, 2019).")).toEqual([]);
  });

  it("letters same-author, same-year works by title, as the formatted reference list does", () => {
    expect(yearLetters(sources)).toEqual(LETTERS);
    const formatted = formatApa(sources.map((s) => ({ id: s.id, doi: s.doi, cited: s.cited })));
    const fromList = new Map(formatted.filter((r) => suffixOf(r.inText)).map((r) => [r.id, suffixOf(r.inText)]));
    expect(fromList).toEqual(LETTERS);
  });

  it("with no letter, two works by the same authors and year match neither", () => {
    expect(matchCitations(findCitations("(Roediger & Karpicke, 2006)"), sources)).toMatchObject([{ sourceId: null, ambiguous: true }]);
    expect(matchCitations(findCitations("(Roediger & Karpicke, 2006b)"), sources)).toMatchObject([{ sourceId: "src_demo_3", ambiguous: false }]);
  });

  it("reads the a/b letter from a formatted in-text citation", () => {
    expect(suffixOf("(Roediger & Karpicke, 2006b)")).toBe("b");
    expect(suffixOf("(Adesope et al., 2017)")).toBe("");
  });
});
