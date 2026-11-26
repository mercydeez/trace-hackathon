import { describe, expect, it } from "vitest";
import { evaluateExport } from "@/lib/exportPolicy";
import { buildTrapProject } from "@/lib/trap";
import { buildVerificationReport } from "@/lib/verificationReport";
import { NOW, reviewedDemo } from "./helpers";

describe("verification report", () => {
  it("documents a blocked citation-trap project, labelled as a test copy, with its blockers", () => {
    const trap = buildTrapProject(NOW);
    const { filename, text } = buildVerificationReport(trap, NOW);
    expect(filename).toMatch(/^trace-verification-TEST-COPY-/);
    expect(text).toContain("CITATION-TRAP TEST COPY");
    expect(text).toContain("**Reviewed export: BLOCKED**");
    for (const b of evaluateExport(trap).blockers) expect(text).toContain(b.message);
    expect(text).toContain("Excerpt not in stored text");
    expect(text).toContain("Details disagree with Crossref (Crossref record retrieved");
  });

  it("says ALLOWED for a fully reviewed project, with each claim's origin, quote check and decision", () => {
    const p = reviewedDemo();
    const { text } = buildVerificationReport(p, NOW);
    expect(text).toContain("**Reviewed export: ALLOWED.**");
    expect(text).toContain("DEMO PROJECT");
    expect(text).toContain("SAMPLE output, not a live AI call");
    expect(text).toContain("Quote check: Excerpt found in stored text");
    expect(text).toContain("Student decision: Student approved");
    expect(text).toContain("## AI-use statement");
    expect(text).toContain("None. The reviewed export is allowed.");
  });

  it("never contains a complete source passage", () => {
    const p = reviewedDemo();
    const { text } = buildVerificationReport(p, NOW);
    for (const e of p.evidence) if (e.text.length > 200) expect(text).not.toContain(e.text);
  });
});
