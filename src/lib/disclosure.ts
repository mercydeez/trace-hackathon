/**
 * The AI-use disclosure is computed from what actually happened in the project:
 * which claims came from a live model, from the labelled sample, or from the student.
 * It is never a fixed paragraph.
 */
import type { ExportEvaluation } from "./exportPolicy";
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

const modelsOf = (claims: Claim[]) => [...new Set(claims.map((c) => c.model).filter(Boolean))].join(", ") || "model not recorded";

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

  if (claims.length === 0) out.push("This work contains no claims drafted or recorded in TRACE.");
  if (live.length) {
    const passages = passagesSentFor(project, live);
    const edited = live.filter((c) => c.edited).length;
    out.push(
      `I used TRACE with a generative AI model (${modelsOf(live)}) to draft ${plural(live.length, "claim")}` +
        (passages === null ? ", from passages I had approved." : `, from ${plural(passages, "source passage")} I had approved; the model was sent the research question and those passages only.`) +
        (edited ? ` I edited ${edited === live.length ? (live.length === 1 ? "it" : "all of them") : `${edited} of them`}.` : ""),
    );
  }
  if (sample.length) out.push(`${plural(sample.length, "claim")} ${sample.length === 1 ? "comes" : "come"} from TRACE's labelled SAMPLE brief, written during the tool's development; ${sample.length === 1 ? "it is" : "they are"} not the result of a live AI call.`);
  if (manual.length) out.push(`I wrote ${plural(manual.length, "claim")} myself, without AI drafting.`);
  const usedLiveAi = project.aiRuns.some((r) => r.mode === "live");
  if (claims.length && !live.length && !sample.length) {
    out.push(usedLiveAi ? "AI drafting was used in this project, but none of its claims are included here." : "No generative AI drafted any claim.");
  }
  if (project.writing.trim()) out.push("I wrote the main text myself; TRACE did not generate it.");
  out.push(`References were formatted from registry records by Citation.js, not written by AI.`);

  const approved = included.filter((i) => i.decision === "approved").length;
  if (claims.length) {
    out.push(
      approved === claims.length
        ? `I reviewed and approved ${claims.length === 1 ? "the claim" : `all ${claims.length} claims`} against the stored source text and remain responsible for the work.`
        : `I have approved ${approved} of ${plural(claims.length, "claim")} so far; the rest are not yet reviewed. I remain responsible for the work.`,
    );
  }
  return out.join(" ");
}

export function buildDisclosure(project: Project, evaluation: ExportEvaluation, { reviewed = evaluation.eligible, referencesFormatted = true } = {}): string[] {
  const included = evaluation.inspections.filter((i) => i.claim.decision !== "rejected").map((i) => i.claim);
  const live = included.filter((c) => c.origin === "live_ai");
  const sample = included.filter((c) => c.origin === "sample");
  const manual = included.filter((c) => c.origin === "manual");
  const lines: string[] = [];

  if (live.length) {
    const passages = passagesSentFor(project, live);
    const edited = live.filter((c) => c.edited).length;
    lines.push(
      `${plural(live.length, "claim")} in this brief ${live.length === 1 ? "was" : "were"} drafted by a generative AI model (${modelsOf(live)}) ` +
        `through TRACE. The model was sent the research question and ${passages === null ? "passages" : plural(passages, "passage")} that the student had approved, ` +
        `and nothing else. ${edited ? `${plural(edited, "of these claims was", "of these claims were")} then edited by the student.` : "The student did not change their wording."}`,
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
    lines.push(project.aiRuns.some((r) => r.mode === "live") ? "TRACE's AI drafting was used in this project, but none of its claims are included." : "TRACE did not use generative AI to draft any included claims.");
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
