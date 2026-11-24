/**
 * A rule-based search plan. No AI is involved, and the UI says so.
 * The student edits the terms and scope, then approves the plan before searching.
 */
import type { Plan } from "./types";

const STOPWORDS = new Set(
  (
    "a an the and or but if of to in on at by for from with without into onto over under about as is are was were be been " +
    "being do does did done can could should would will may might must shall have has had it its this that these those " +
    "what which who whom whose when where why how than then so such not no nor very more most less least much many " +
    "compared compare versus vs between among affect affects effect effects improve improves improved better worse " +
    "there their they them we our you your i my me he she his her also only just any some all each other"
  ).split(" "),
);

export const MAX_TERMS = 8;

export function suggestTerms(question: string): string[] {
  const words = question.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (w.length < 3 || STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out.slice(0, MAX_TERMS);
}

export function suggestPlan(question: string): Plan {
  return {
    terms: suggestTerms(question),
    yearFrom: null,
    yearTo: null,
    scopeNote: "",
    approvedFingerprint: null,
    approvedAt: null,
  };
}

export function planQuery(plan: Pick<Plan, "terms">): string {
  return plan.terms.join(" ").trim();
}
