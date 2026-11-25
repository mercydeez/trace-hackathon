/**
 * Claim details: do the specific numbers and negations a claim states appear in the excerpt it cites?
 *
 * This is a deterministic word check, not a reading of meaning. It can only say that a detail in
 * the claim is not in the excerpt; it never says the claim is right. The student resolves a flag by
 * editing the claim or the excerpt, or by marking the claim as their own inference.
 *
 * Numbers: digits ("5", "1,200", "0.5", "13%") and cardinal words (zero–twenty, tens, hundred,
 * thousand; "twenty-five" and "two hundred" combine). "a", "an" and "one" count only before a time
 * unit ("a week", "one month"), because "a student" or "one condition" is not a reported detail.
 * Years in parentheses or after "in" ("(2006)", "in 2006") are skipped as publication years.
 */

export interface DetailIssue {
  kind: "number" | "negation";
  /** The words in the claim that raised the issue. For a negation the claim leaves out, the whole claim. */
  claimText: string;
  message: string;
}

export interface Quantity {
  value: number;
  unit: string | null;
  raw: string;
}

// Maps, not object literals, so words like "constructor" never hit the prototype.
const WORDS = new Map(Object.entries({
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
}));

const TIME_UNITS = new Map(Object.entries({
  second: "second", seconds: "second", sec: "second", secs: "second",
  minute: "minute", minutes: "minute", min: "minute", mins: "minute",
  hour: "hour", hours: "hour", h: "hour", hr: "hour", hrs: "hour",
  day: "day", days: "day", week: "week", weeks: "week",
  month: "month", months: "month", year: "year", years: "year", yr: "year", yrs: "year",
}));

const UNITS = new Map([
  ...TIME_UNITS,
  ...Object.entries({
    "%": "percent", percent: "percent",
    participant: "participant", participants: "participant", student: "student", students: "student",
    person: "person", people: "person", item: "item", items: "item",
    experiment: "experiment", experiments: "experiment", study: "study", studies: "study",
  }),
]);

const TOKEN = /\d+(?:,\d{3})*(?:\.\d+)?|%|\p{L}+/gu;

export function extractQuantities(text: string): Quantity[] {
  const tokens = [...text.matchAll(TOKEN)].map((m) => ({ word: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length }));
  const out: Quantity[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;
    const startIndex = i;
    let value = WORDS.get(t.word);
    if (/^\d/.test(t.word)) {
      value = Number(t.word.replace(/,/g, ""));
    } else if (t.word === "a" || t.word === "an" || t.word === "one") {
      if (!TIME_UNITS.has(tokens[i + 1]?.word ?? "")) continue;
      value = 1;
    } else if (value !== undefined) {
      // "twenty five", "two hundred", "three thousand"
      for (let n = WORDS.get(tokens[i + 1]?.word ?? ""); n !== undefined; n = WORDS.get(tokens[i + 1]?.word ?? "")) {
        if (n === 100 || n === 1000) value *= n;
        else if (value >= 20 && value < 100 && value % 10 === 0 && n < 10) value += n;
        else break;
        i++;
      }
    } else {
      continue;
    }

    const unit = UNITS.get(tokens[i + 1]?.word ?? "") ?? null;
    if (unit) i++;
    const last = tokens[i] ?? t;
    if (unit === null && isPublicationYear(text, value, t.start, tokens[startIndex - 1]?.word)) continue;
    out.push({ value, unit, raw: text.slice(t.start, last.end) });
  }
  return out;
}

function isPublicationYear(text: string, value: number, start: number, previousWord: string | undefined): boolean {
  return Number.isInteger(value) && value >= 1900 && value <= 2099 && (text[start - 1] === "(" || previousWord === "in");
}

// "not only X but also Y" is not a negation.
const NEGATION = /\b(?:not(?!\s+(?:only|just|merely)\b)|no|never|neither|nor|without|cannot|failed to)\b|\b\p{L}+n['’]t\b/iu;
// Narrower set for the reverse direction, where false alarms would be more common.
const EXCERPT_NEGATION = /\bno\s+(?:effect|difference)\b|\bnot\b(?!\s+(?:only|just|merely)\b)|\b\p{L}+n['’]t\b/iu;

export function checkClaimDetails(claim: string, excerpt: string): DetailIssue[] {
  if (!excerpt.trim()) return [];
  const issues: DetailIssue[] = [];

  const inExcerpt = extractQuantities(excerpt);
  const seen = new Set<string>();
  for (const q of extractQuantities(claim)) {
    const key = `${q.value}|${q.unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // An excerpt number without a unit counts, so lists like "5, 10 or 15 min" do not raise false alarms.
    const found = inExcerpt.some((e) => e.value === q.value && (q.unit === null || e.unit === null || e.unit === q.unit));
    if (!found) {
      issues.push({ kind: "number", claimText: q.raw, message: `The claim says "${q.raw}", but the excerpt does not mention ${q.raw}.` });
    }
  }

  // ponytail: word-level heuristic, blind to scope ("no" in "no more than", negation in a different clause).
  // False positives are possible; the student resolves them by editing or marking the claim as inference.
  const claimNeg = claim.match(NEGATION);
  if (claimNeg && !NEGATION.test(excerpt)) {
    issues.push({
      kind: "negation",
      claimText: claimNeg[0],
      message: `The claim says "${claimNeg[0]}", but the excerpt contains no negation. Check that the claim does not reverse what the excerpt says.`,
    });
  }
  const excerptNeg = excerpt.match(EXCERPT_NEGATION);
  if (excerptNeg && !claimNeg) {
    issues.push({
      kind: "negation",
      claimText: claim.trim(),
      message: `The excerpt says "${excerptNeg[0]}", but the claim contains no negation. Check that the claim does not reverse what the excerpt says.`,
    });
  }
  return issues;
}
