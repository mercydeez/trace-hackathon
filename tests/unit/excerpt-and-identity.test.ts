import { describe, expect, it } from "vitest";
import { checkExcerpt } from "@/lib/excerpt";
import { compareMetadata, sourceIdentity } from "@/lib/identity";
import { manualSource } from "@/lib/mutations";
import type { Biblio, Source } from "@/lib/types";
import { NOW, TEST_RECORD } from "./helpers";

const PASSAGE =
  "Students then took a final retention test 5 min, 2 days, or 1 week later. " +
  "Repeated studying did not improve recall on the delayed tests — students’ confidence rose, yet “testing” won.";

describe("excerpt integrity", () => {
  it("matches a verbatim excerpt and returns offsets into the original text", () => {
    const r = checkExcerpt("took a final retention test 5 min, 2 days, or 1 week later", PASSAGE);
    expect(r.status).toBe("matched");
    if (r.status === "matched") {
      expect(PASSAGE.slice(r.start, r.end)).toBe("took a final retention test 5 min, 2 days, or 1 week later");
    }
  });

  it("tolerates harmless typography: quotes, dashes, spacing, case, wrapping quotation marks", () => {
    const typed = "  \"...delayed tests - students' confidence rose,   yet \"TESTING\" won.\"  ";
    const r = checkExcerpt(typed, PASSAGE);
    expect(r.status).toBe("matched");
    if (r.status === "matched") expect(PASSAGE.slice(r.start, r.end)).toContain("students’ confidence rose");
  });

  it("fails when a number is altered, and points at the closest real passage", () => {
    const r = checkExcerpt("Students then took a final retention test 5 min, 2 days, or 1 month later.", PASSAGE);
    expect(r.status).toBe("mismatch");
    if (r.status === "mismatch") {
      expect(r.nearest).not.toBeNull();
      expect(PASSAGE.slice(r.nearest!.start, r.nearest!.end)).toContain("final retention test 5 min, 2 days, or 1 ");
    }
  });

  it("fails when a negation is dropped", () => {
    expect(checkExcerpt("Repeated studying did improve recall on the delayed tests", PASSAGE).status).toBe("mismatch");
    expect(checkExcerpt("Repeated studying did not improve recall on the delayed tests", PASSAGE).status).toBe("matched");
  });

  it("fails when punctuation that carries meaning changes", () => {
    expect(checkExcerpt("test 5 min, 2 days; or 1 week later", PASSAGE).status).toBe("mismatch");
    expect(checkExcerpt("5 min, 20 days", PASSAGE).status).toBe("mismatch");
  });

  it("says when a check is not possible instead of passing or failing", () => {
    expect(checkExcerpt("anything long enough here", "")).toEqual({ status: "not_checkable", reason: "no_evidence" });
    expect(checkExcerpt("anything long enough here", null)).toEqual({ status: "not_checkable", reason: "no_evidence" });
    expect(checkExcerpt("  … ", PASSAGE)).toEqual({ status: "not_checkable", reason: "no_excerpt" });
    expect(checkExcerpt("1 week", PASSAGE)).toEqual({ status: "not_checkable", reason: "too_short" });
  });
});

const cited = (patch: Partial<Biblio> = {}): Biblio => {
  const { years: _y, ...b } = TEST_RECORD;
  void _y;
  return { ...b, ...patch };
};

describe("reference identity", () => {
  const verdict = (b: Biblio, field: string) => compareMetadata(b, TEST_RECORD).find((f) => f.field === field)!.verdict;

  it("matches when the cited details agree", () => {
    expect(verdict(cited(), "title")).toBe("match");
    expect(verdict(cited(), "first_author")).toBe("match");
    expect(verdict(cited(), "venue")).toBe("match");
  });

  it("reports a wrong title, first author, or year as a mismatch", () => {
    expect(verdict(cited({ title: "A completely different paper about sleep" }), "title")).toBe("mismatch");
    expect(verdict(cited({ authors: [...TEST_RECORD.authors].reverse() }), "first_author")).toBe("mismatch");
    expect(verdict(cited({ year: 2006 }), "year")).toBe("mismatch");
  });

  it("handles online/print year differences conservatively: a note, never a silent pass or a mismatch", () => {
    for (const year of [2010, 2011]) {
      const f = compareMetadata(cited({ year }), TEST_RECORD).find((x) => x.field === "year")!;
      expect(f.verdict).toBe("note");
      expect(f.registry).toBe("print 2011, online 2010, issued 2010");
    }
  });

  it("flags small title differences and venue abbreviations for a look, without calling them mismatches", () => {
    expect(verdict(cited({ title: "A Test Record About Memory: Online and Print Years" }), "title")).toBe("note");
    expect(verdict(cited({ container: "J. Test Fixt." }), "venue")).toBe("note");
  });

  const withRegistry = (patch: Partial<Source> = {}): Source => ({
    ...manualSource(cited(), "10.5555/test.fixture", NOW),
    registry: { provider: "crossref", retrievedAt: NOW, url: "https://api.crossref.org/works/x", record: TEST_RECORD },
    lookup: { status: "found", checkedAt: NOW },
    ...patch,
  });

  it("summarises a source: matched, mismatch", () => {
    expect(sourceIdentity(withRegistry()).status).toBe("matched");
    expect(sourceIdentity(withRegistry({ cited: cited({ year: 1999 }) })).status).toBe("mismatch");
  });

  it("never gives a hand-entered reference registry-confirmed status", () => {
    const manual = manualSource(cited(), null, NOW);
    expect(sourceIdentity(manual).status).toBe("user_entered");
    // Even with a DOI typed in, nothing is confirmed until a lookup has actually run.
    expect(sourceIdentity(manualSource(cited(), "10.5555/test.fixture", NOW)).status).toBe("user_entered");
  });

  it("keeps 'not found' and 'could not check' apart", () => {
    const base = manualSource(cited(), "10.5555/test.fixture", NOW);
    const notFound = sourceIdentity({ ...base, lookup: { status: "not_found", checkedAt: NOW } });
    expect(notFound.status).toBe("not_found");
    expect(notFound.summary).toContain("does not show the paper is fake");
    const failed = sourceIdentity({ ...base, lookup: { status: "could_not_check", checkedAt: NOW, detail: "the registry timed out" } });
    expect(failed.status).toBe("could_not_check");
    expect(failed.summary).not.toMatch(/not found/i);
  });

  it("keeps comparing against the earlier record when a refresh fails", () => {
    const id = sourceIdentity(withRegistry({ lookup: { status: "could_not_check", checkedAt: NOW, detail: "timeout" } }));
    expect(id.status).toBe("matched");
    expect(id.summary).toContain("last refresh failed");
  });
});
