import { describe, expect, it } from "vitest";
import { checkClaimDetails, extractQuantities } from "@/lib/claimNumbers";
import sample from "@/data/sample-brief.json";

const REAL = "Students then took a final retention test 5 min, 2 days, or 1 week later.";
const TRAP_CLAIM =
  "Students who took practice recall tests remembered more than students who restudied, even on a test one month later.";

const values = (text: string) => extractQuantities(text).map((q) => `${q.value} ${q.unit ?? "-"}`);

describe("extractQuantities", () => {
  it("reads digits, number words and units, normalising plurals and short forms", () => {
    expect(values(REAL)).toEqual(["5 minute", "2 day", "1 week"]);
    expect(values("after five minutes, two days or one week")).toEqual(["5 minute", "2 day", "1 week"]);
    expect(values("13% of 1,200 participants; 13 percent; 0.5 h")).toEqual(["13 percent", "1200 participant", "13 percent", "0.5 hour"]);
    expect(values("twenty-five students and two hundred items")).toEqual(["25 student", "200 item"]);
  });

  it("counts a/an/one only before a time unit", () => {
    expect(values("a week later, one month later, an hour")).toEqual(["1 week", "1 month", "1 hour"]);
    expect(values("a student in one condition")).toEqual([]);
  });

  it("skips publication years but keeps other numbers", () => {
    expect(values("Roediger (2006) and in 2008 found 2006 items")).toEqual(["2006 item"]);
  });

  it("keeps the claim's own wording as raw text", () => {
    expect(extractQuantities(TRAP_CLAIM)).toEqual([{ value: 1, unit: "month", raw: "one month" }]);
  });
});

describe("checkClaimDetails: numbers", () => {
  it("flags the citation trap: a claim of one month against the real '1 week' excerpt", () => {
    const issues = checkClaimDetails(TRAP_CLAIM, REAL);
    expect(issues).toEqual([
      { kind: "number", claimText: "one month", message: 'The claim says "one month", but the excerpt does not mention one month.' },
    ]);
  });

  it("does not flag the trap claim against its altered excerpt (the excerpt check catches that)", () => {
    expect(checkClaimDetails(TRAP_CLAIM, "Students then took a final retention test 5 min, 2 days, or 1 month later.")).toEqual([]);
  });

  it("matches digits and words with the same unit, and not with a different unit", () => {
    expect(checkClaimDetails("tested one week later", REAL)).toEqual([]);
    expect(checkClaimDetails("after five minutes and two days", REAL)).toEqual([]);
    expect(checkClaimDetails("tested 1 month later", REAL)).toHaveLength(1);
    expect(checkClaimDetails("tested 3 days later", REAL)).toHaveLength(1);
  });

  it("accepts a unitless claim number if the value appears, and reports each missing detail once", () => {
    expect(checkClaimDetails("the 2 groups", REAL)).toEqual([]);
    expect(checkClaimDetails("ten techniques, ten in all", REAL).map((i) => i.claimText)).toEqual(["ten"]);
  });

  it("returns nothing for an empty excerpt", () => {
    expect(checkClaimDetails(TRAP_CLAIM, "  ")).toEqual([]);
  });
});

describe("checkClaimDetails: negations", () => {
  it("flags a negated claim against an excerpt with no negation", () => {
    const issues = checkClaimDetails("Testing did not improve retention.", "Testing improved retention.");
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ kind: "negation", claimText: "not" });
  });

  it("flags a claim that drops the excerpt's negation", () => {
    const issues = checkClaimDetails("Restudying improved delayed recall.", "Repeated studying had no effect on delayed recall.");
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('The excerpt says "no effect"');
  });

  it("accepts different wording of the same negation, and ignores 'not only'", () => {
    expect(checkClaimDetails("It didn’t help.", "It did not help.")).toEqual([]);
    expect(checkClaimDetails("Testing improves learning.", "Testing improves learning, not just assessing it.")).toEqual([]);
  });
});

describe("checkClaimDetails on the sample brief", () => {
  const claims = sample.claims;

  it("passes every sample claim: each number and negation it states is in its excerpt", () => {
    // Claim 1's excerpt starts at the sentence naming the delays; claim 4 no longer says "ten".
    const flagged = claims.map((c) => checkClaimDetails(c.text, c.excerpt).map((i) => i.claimText));
    expect(flagged).toEqual([[], [], [], [], []]);
  });

  it("would flag the earlier wording of sample claims 1 and 4", () => {
    const first = claims[0]!;
    expect(checkClaimDetails(first.text, first.excerpt.replace(`${REAL} `, "")).map((i) => i.claimText)).toEqual(["two days", "one week"]);
    expect(checkClaimDetails(`A review of ten learning techniques. ${claims[3]!.text}`, claims[3]!.excerpt).map((i) => i.claimText)).toEqual(["ten"]);
  });
});
