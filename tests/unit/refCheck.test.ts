import { describe, expect, it } from "vitest";
import { judgeReference } from "@/lib/refCheck";
import { parseReference } from "@/lib/refList";
import { TEST_RECORD } from "./helpers";

// TEST_RECORD (helpers.ts) is synthetic: "A Test Record About Memory: Online and Print Years Differ", Okafor & Lindqvist, print 2011 / online 2010.
const APA = "Okafor, A., & Lindqvist, B. (2011). A test record about memory: Online and print years differ. Journal of Test Fixtures, 15(1), 20-27.";

describe("judging a pasted reference against the registry", () => {
  it("a bare DOI that resolves is 'DOI found, nothing to compare', never a match", () => {
    expect(judgeReference(parseReference("https://doi.org/10.5555/test.fixture"), TEST_RECORD, "doi").verdict).toBe("doi_only");
  });

  it("a DOI with only an agreeing year is a possible match, not a match", () => {
    expect(judgeReference(parseReference("https://doi.org/10.5555/test.fixture (2011)"), TEST_RECORD, "doi").verdict).not.toBe("match");
  });

  it("matches when the supplied title, first author and year agree with the DOI's record", () => {
    const r = judgeReference(parseReference(`${APA} https://doi.org/10.5555/test.fixture`), TEST_RECORD, "doi");
    expect(r.verdict).toBe("match");
    expect(r.fields.map((f) => f.field).sort()).toEqual(["first_author", "title", "year"]);
  });

  it("a real DOI with only the wrong year needs a fix; with the wrong first author it is a mismatch", () => {
    const wrongYear = APA.replace("(2011)", "(2006)");
    expect(judgeReference(parseReference(`${wrongYear} https://doi.org/10.5555/test.fixture`), TEST_RECORD, "doi").verdict).toBe("needs_fix");
    const wrongAuthor = APA.replace("Okafor, A., & Lindqvist, B.", "Lindqvist, B., & Okafor, A.");
    expect(judgeReference(parseReference(`${wrongAuthor} https://doi.org/10.5555/test.fixture`), TEST_RECORD, "doi").verdict).toBe("mismatch");
  });

  it("a record found by search is at best a possible match", () => {
    expect(judgeReference(parseReference(APA), TEST_RECORD, "search").verdict).toBe("possible");
  });

  it("a search hit with a different title is 'no close match', not the student's paper", () => {
    const other = "Okafor, A. (2011). Sleep spindles and vocabulary learning in adults. Journal of Test Fixtures, 3, 1-9.";
    expect(judgeReference(parseReference(other), TEST_RECORD, "search").verdict).toBe("no_close_match");
  });
});
