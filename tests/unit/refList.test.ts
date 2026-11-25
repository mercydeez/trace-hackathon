import { describe, expect, it } from "vitest";
import { MAX_REFERENCES, parseReference, splitReferences } from "@/lib/refList";

const APA =
  "Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255. https://doi.org/10.1111/j.1467-9280.2006.01693.x";
const NO_DOI =
  "Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. Science, 319(5865), 966–968.";
const HARVARD =
  "Adesope, O.O., Trevisan, D.A. and Sundararajan, N., 2017. Rethinking the use of tests: A meta-analysis of practice testing. Review of Educational Research, 87(3), pp.659–701. doi:10.3102/0034654316689306.";

describe("parseReference", () => {
  it("parses an APA reference with a doi.org link", () => {
    expect(parseReference(APA)).toEqual({
      raw: APA,
      doi: "10.1111/j.1467-9280.2006.01693.x",
      year: 2006,
      firstAuthor: "Roediger",
      title: "Test-enhanced learning: Taking memory tests improves long-term retention",
      query:
        "Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255.",
    });
  });

  it("parses a reference with no DOI", () => {
    const r = parseReference(NO_DOI);
    expect(r).toMatchObject({ doi: null, year: 2008, firstAuthor: "Karpicke", title: "The critical importance of retrieval for learning" });
    expect(r.query).toBe(NO_DOI);
  });

  it("parses a Harvard reference and strips sentence punctuation from the DOI", () => {
    expect(parseReference(HARVARD)).toMatchObject({
      doi: "10.3102/0034654316689306",
      year: 2017,
      firstAuthor: "Adesope",
      title: "Rethinking the use of tests: A meta-analysis of practice testing",
    });
    expect(parseReference(HARVARD).query).not.toContain("10.3102");
  });

  it("handles Harvard '(YYYY) Title' and 'Surname I.I.' authors", () => {
    const r = parseReference("Rowland C.A. (2014) The effect of testing versus restudy on retention: A meta-analytic review of the testing effect. Psychological Bulletin, 140(6), 1432–1463.");
    expect(r).toMatchObject({ firstAuthor: "Rowland", year: 2014, title: "The effect of testing versus restudy on retention: A meta-analytic review of the testing effect" });
  });

  it("parses bare DOI lines and doi.org URLs", () => {
    for (const line of ["10.1126/science.1152408", "https://doi.org/10.1126/science.1152408", "doi:10.1126/SCIENCE.1152408."]) {
      expect(parseReference(line)).toEqual({ raw: line, doi: "10.1126/science.1152408", year: null, firstAuthor: null, title: null, query: "" });
    }
  });

  it("keeps brackets that belong to the DOI", () => {
    expect(parseReference("See 10.1002/(SICI)1097-4571(199806)49:8<693::AID-ASI4>3.0.CO;2-0).").doi).toBe(
      "10.1002/(sici)1097-4571(199806)49:8<693::aid-asi4>3.0.co;2-0",
    );
  });

  it("returns nulls for undated, organisational or garbage text, without throwing", () => {
    expect(parseReference("World Health Organization. (n.d.). Something. https://who.int")).toMatchObject({ year: null, firstAuthor: null, title: null, doi: null });
    expect(parseReference("asdf qwer !!! (12) ...")).toMatchObject({ doi: null, year: null, firstAuthor: null, title: null, query: "asdf qwer !!! (12) ..." });
    expect(parseReference("")).toMatchObject({ doi: null, year: null, firstAuthor: null, title: null, query: "" });
  });

  it("caps the query at 300 characters", () => {
    expect(parseReference("x ".repeat(400)).query.length).toBeLessThanOrEqual(300);
  });
});

describe("splitReferences", () => {
  it("splits one reference per line and drops empty lines", () => {
    expect(splitReferences(`  ${APA}\n\n${NO_DOI}\n   \n`)).toEqual([APA, NO_DOI]);
    expect(splitReferences(`${APA}\n${NO_DOI}`)).toEqual([APA, NO_DOI]);
  });

  it("joins wrapped lines", () => {
    const wrapped = "Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests\n  improves long-term retention. Psychological Science, 17(3), 249–255.\nhttps://doi.org/10.1111/j.1467-9280.2006.01693.x";
    expect(splitReferences(wrapped)).toEqual([APA]);
    expect(splitReferences("Roediger, H. L., &\nKarpicke, J. D. (2006). Title.")).toEqual(["Roediger, H. L., & Karpicke, J. D. (2006). Title."]);
  });

  it("keeps a list of bare DOIs one per line", () => {
    expect(splitReferences("10.1126/science.1152408\nhttps://doi.org/10.1037/a0037559\n")).toEqual([
      "10.1126/science.1152408",
      "https://doi.org/10.1037/a0037559",
    ]);
  });

  it("separates numbered references and blank-line blocks", () => {
    expect(splitReferences(`1. ${NO_DOI}\n2. ${HARVARD}`)).toHaveLength(2);
    expect(splitReferences("World Health Organization. (2020). Report.\n\nAnother Org. (2021). Report.")).toHaveLength(2);
  });

  it("exposes the cap for callers", () => {
    expect(MAX_REFERENCES).toBe(15);
  });
});
