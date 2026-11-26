/**
 * The AI-use disclosure is computed from what actually happened in the project:
 * which claims came from a live model, from the labelled sample, or from the student.
 * It is never a fixed paragraph.
 */
import type { ExportEvaluation } from "./exportPolicy";
import { referenceListEligibility } from "./referenceList";
import { formatAuthorsShort } from "./text";
import type { Claim, Project } from "./types";

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * How many approved passages were sent in the runs that produced these claims, or null when that
 * is not recorded (claims saved before runs were linked). Never read from an unrelated, larger run.
 */
export function passagesSentFor(project: Project, claims: Claim[]): number | null {
  if (claims.some((c) => !c.runId)) return null;
  const runs = project.aiRuns.filter((r) => claims.some((c) => c.runId === r.id));
  if (runs.length === 0) return null;
  return new Set(runs.flatMap((r) => r.evidenceIds)).size;
}


const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** Small counts as words ("three claims"), larger ones as digits. */
function count(n: number, one: string, many = `${one}s`): string {
  return `${WORDS[n] ?? n} ${n === 1 ? one : many}`;
}
const word = (n: number) => WORDS[n] ?? String(n);

function list(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/**
 * What TRACE can substantiate about live AI drafting, from the recorded runs and each claim's decision.
 * "Drafted" counts every claim a live run added, including ones the student later rejected or deleted;
 * "included" counts the ones still in the work. Older projects whose claims are not linked to their run
 * give a minimum ("at least"), never a guess.
 */
export interface DraftingRecord {
  used: boolean;
  drafted: number;
  atLeast: boolean;
  included: number;
  approved: number;
  rejected: number;
  removed: number;
  edited: number;
  /** Items the model returned that TRACE discarded because they broke its output rules. */
  discarded: number;
  passages: number | null;
  models: string;
}

export function draftingRecord(project: Project, evaluation: ExportEvaluation): DraftingRecord {
  const runs = project.aiRuns.filter((r) => r.mode === "live");
  const present = project.claims.filter((c) => c.origin === "live_ai");
  const exact = runs.length > 0 && present.every((c) => c.runId && runs.some((r) => r.id === c.runId));
  const drafted = exact ? runs.reduce((n, r) => n + r.accepted, 0) : present.length;
  const includedIds = new Set(present.filter((c) => c.decision !== "rejected").map((c) => c.id));
  const decisions = new Map(evaluation.inspections.map((i) => [i.claim.id, i.decision]));
  const included = present.filter((c) => includedIds.has(c.id));
  return {
    used: runs.length > 0 || present.length > 0,
    drafted,
    atLeast: !exact && present.length > 0,
    included: included.length,
    approved: included.filter((c) => decisions.get(c.id) === "approved").length,
    rejected: present.length - included.length,
    removed: exact ? Math.max(0, drafted - present.length) : 0,
    edited: included.filter((c) => c.edited).length,
    discarded: runs.reduce((n, r) => n + r.rejected.length, 0),
    // Passages behind the drafted claims: runs that produced at least one claim. A run whose output was all discarded drafted nothing.
    passages: exact ? new Set(runs.filter((r) => r.accepted > 0).flatMap((r) => r.evidenceIds)).size : passagesSentFor(project, present),
    models: [...new Set([...runs.map((r) => r.model), ...present.map((c) => c.model)].filter(Boolean))].join(", ") || "model not recorded",
  };
}

/** "I approved and included two, rejected one" in the first person, or the same facts about "the student". */
function decisionsSentence(d: DraftingRecord, who: "I" | "The student"): string {
  const parts: string[] = [];
  if (d.included) {
    parts.push(
      d.approved === d.included
        ? `approved and included ${word(d.included)}`
        : d.approved === 0
          ? `included ${word(d.included)}, none approved yet`
          : `included ${word(d.included)}, of which ${word(d.approved)} ${d.approved === 1 ? "is" : "are"} approved so far`,
    );
  }
  if (d.rejected) parts.push(d.rejected === d.drafted && !d.atLeast ? `rejected ${d.drafted === 1 ? "it" : `all ${word(d.drafted)}`}` : `rejected ${word(d.rejected)}`);
  if (d.removed) parts.push(`removed ${word(d.removed)}`);
  if (!parts.length) return "";
  return `${who} ${list(parts)}${d.included === 0 ? ", so none is included" : ""}.`;
}

/**
 * A short, paste-ready AI-use statement for the student's own submission. It states only what TRACE
 * recorded: who drafted each included claim, what was sent for live drafting, edits, and the student's
 * decisions. The fuller disclosure stays in the exported brief.
 */
export function aiUseStatement(project: Project, evaluation: ExportEvaluation): string {
  const included = evaluation.inspections.filter((i) => i.claim.decision !== "rejected");
  const claims = included.map((i) => i.claim);
  const live = claims.filter((c) => c.origin === "live_ai");
  const sample = claims.filter((c) => c.origin === "sample");
  const manual = claims.filter((c) => c.origin === "manual");
  const out: string[] = [];

  const d = draftingRecord(project, evaluation);
  if (claims.length === 0 && !d.used) out.push("This work contains no claims drafted or recorded in TRACE.");
  if (d.drafted > 0) {
    const passages = d.passages === null ? "passages I had approved" : `${count(d.passages, "source passage")} I had approved`;
    out.push(
      `AI (${d.models}) drafted ${d.atLeast ? "at least " : ""}${count(d.drafted, "claim")} in TRACE, from ${passages}; the model was sent the research question and those passages only.`,
    );
    const decided = decisionsSentence(d, "I");
    if (decided) out.push(decided);
    if (d.edited) out.push(`I edited ${d.edited === d.included ? (d.included === 1 ? "the included claim" : `all ${word(d.included)} included claims`) : `${word(d.edited)} of the included claims`}.`);
  } else if (d.used) {
    out.push("AI drafting was used in this project, but none of its claims are included here.");
  }
  if (d.discarded) out.push(`TRACE discarded ${count(d.discarded, "further item")} the model returned because ${d.discarded === 1 ? "it" : "they"} broke its output rules.`);
  if (sample.length) out.push(`${plural(sample.length, "claim")} ${sample.length === 1 ? "comes" : "come"} from TRACE's labelled SAMPLE brief, written during the tool's development; ${sample.length === 1 ? "it is" : "they are"} not the result of a live AI call.`);
  if (manual.length) out.push(`I wrote ${plural(manual.length, "claim")} myself, without AI drafting.`);
  if (claims.length && !live.length && !sample.length && !d.used) out.push("No generative AI drafted any claim.");
  if (project.writing.trim()) out.push("I wrote the main text myself; TRACE did not generate it.");
  out.push(`References were formatted from registry records by Citation.js, not written by AI.`);
  const flagged = flaggedReferences(project);
  if (flagged) out.push(flagged);

  const approved = included.filter((i) => i.decision === "approved").length;
  if (claims.length) {
    out.push(
      approved === claims.length
        ? `I reviewed and approved ${claims.length === 1 ? "the claim" : claims.length === 2 ? "both claims" : `all ${word(claims.length)} claims`} against the stored source text and remain responsible for the work.`
        : `I have approved ${approved} of ${plural(claims.length, "claim")} so far; the rest are not yet reviewed. I remain responsible for the work.`,
    );
  }
  return out.join(" ");
}

/** Warnings travel: references used by included claims that are retracted, disagree with the registry, or are unverified. */
export function flaggedReferences(project: Project): string | null {
  const used = new Set(
    project.claims
      .filter((c) => c.decision !== "rejected" && c.kind === "evidence")
      .flatMap((c) => [c.evidenceId, c.second?.evidenceId])
      .flatMap((id) => project.evidence.find((e) => e.id === id)?.sourceId ?? []),
  );
  const { excluded } = referenceListEligibility(project.sources.filter((s) => used.has(s.id)));
  if (excluded.length === 0) return null;
  return `WARNING: ${excluded.length === 1 ? "one reference used here is" : `${word(excluded.length)} references used here are`} flagged: ${excluded.map((e) => `${formatAuthorsShort(e.source.cited.authors, e.source.cited.year)} (${e.reason.toUpperCase()})`).join("; ")}.`;
}

export function buildDisclosure(project: Project, evaluation: ExportEvaluation, { reviewed = evaluation.eligible, referencesFormatted = true } = {}): string[] {
  const included = evaluation.inspections.filter((i) => i.claim.decision !== "rejected").map((i) => i.claim);
  const live = included.filter((c) => c.origin === "live_ai");
  const sample = included.filter((c) => c.origin === "sample");
  const manual = included.filter((c) => c.origin === "manual");
  const lines: string[] = [];

  const d = draftingRecord(project, evaluation);
  if (d.drafted > 0) {
    lines.push(
      `A generative AI model (${d.models}) drafted ${d.atLeast ? "at least " : ""}${count(d.drafted, "claim")} through TRACE. ` +
        `The model was sent the research question and ${d.passages === null ? "passages" : plural(d.passages, "passage")} that the student had approved, and nothing else. ` +
        `${decisionsSentence(d, "The student")} ` +
        (d.included ? (d.edited ? `${plural(d.edited, "included claim was", "included claims were")} then edited by the student.` : "The student did not change the wording of the included claims.") : ""),
    );
  }
  if (sample.length) {
    lines.push(
      `${plural(sample.length, "claim")} in this brief ${sample.length === 1 ? "comes" : "come"} from TRACE's built-in SAMPLE brief, ` +
        "which was written during the tool's development and is not the result of a live AI call. It is included for demonstration.",
    );
  }
  if (manual.length) {
    lines.push(`${plural(manual.length, "claim")} ${manual.length === 1 ? "was" : "were"} written by the student without AI drafting.`);
  }
  if (project.writing.trim()) {
    lines.push(
      "The section \"Your text\" was typed or pasted by the student in TRACE's writing space. TRACE did not generate any of it, and it cannot tell whether pasted text came from elsewhere. " +
        (evaluation.blockers.some((b) => b.code.startsWith("text_citation"))
          ? "Some in-text citations in it do not match a source in this project, or match a source with a problem; see the export checks."
          : "TRACE matched the author–date citations it recognised to sources in this project."),
    );
  }
  if (!live.length && !sample.length) {
    lines.push(d.used ? (d.drafted > 0 ? "None of the AI-drafted claims is included in this brief." : "TRACE's AI drafting was used in this project, but none of its claims are included.") : "TRACE did not use generative AI to draft any included claims.");
  }

  // Only live runs: items rejected from the labelled sample brief were never AI-drafted.
  const failedRuns = project.aiRuns.filter((r) => r.mode === "live").reduce((n, r) => n + r.rejected.length, 0);
  if (failedRuns) {
    lines.push(`TRACE rejected ${plural(failedRuns, "AI-drafted item")} that cited evidence outside the approved set or broke its output rules. None of those items appears here.`);
  }

  lines.push(
    "The student chose the search terms and sources. References come from the project's stored source records. " +
      (referencesFormatted
        ? `Citation.js formatted the references in ${project.citationStyle === "harvard1" ? "Harvard" : "APA 7th edition"} style.`
        : "This draft contains some unformatted references."),
  );
  const flagged = flaggedReferences(project);
  if (flagged) lines.push(flagged);
  lines.push(
    "TRACE checked three things automatically: that each quoted excerpt appears, by text matching, in the stored source passage; that the numbers " +
    "and negations stated in each claim also appear in its excerpt; and that cited details agree with the registry record (Crossref, or DataCite when Crossref has none) for sources with a DOI. Sources without a DOI may be entered manually. These checks do not establish that a source is correct, that a claim follows from " +
      "its excerpt, or that the work is free of plagiarism. Any support rating shown beside a claim was suggested by the AI model or the sample and can be wrong.",
  );
  const r = project.rules;
  lines.push(
    `Rules in force for this project: AI drafting ${r.aiDrafting === "off" ? "switched off" : "allowed from student-approved passages only"}; ` +
      `${r.minYear ? `sources published in ${r.minYear} or later` : "no publication-year limit"}; ` +
      `retracted sources ${r.blockRetracted ? "blocked" : "allowed, with a warning"}.`,
  );
  lines.push(
    reviewed
      ? "The student reviewed and approved each claim individually and remains responsible for the content of this brief."
      : "This is a DRAFT export. The student remains responsible for the content.",
  );
  return lines;
}
