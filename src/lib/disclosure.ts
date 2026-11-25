/**
 * The AI-use disclosure is computed from what actually happened in the project:
 * which claims came from a live model, from the labelled sample, or from the student.
 * It is never a fixed paragraph.
 */
import type { ExportEvaluation } from "./exportPolicy";
import type { Project } from "./types";

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function buildDisclosure(project: Project, evaluation: ExportEvaluation): string[] {
  const included = evaluation.inspections.filter((i) => i.claim.decision !== "rejected").map((i) => i.claim);
  const live = included.filter((c) => c.origin === "live_ai");
  const sample = included.filter((c) => c.origin === "sample");
  const manual = included.filter((c) => c.origin === "manual");
  const lines: string[] = [];

  if (live.length) {
    const models = [...new Set(live.map((c) => c.model).filter(Boolean))].join(", ") || "model not recorded";
    const liveRuns = project.aiRuns.filter((r) => r.mode === "live");
    const passages = Math.max(0, ...liveRuns.map((r) => r.evidenceIds.length));
    const edited = live.filter((c) => c.edited).length;
    lines.push(
      `${plural(live.length, "claim")} in this brief ${live.length === 1 ? "was" : "were"} drafted by a generative AI model (${models}) ` +
        `through TRACE. The model was sent the research question and ${plural(passages, "passage")} that the student had approved, ` +
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
      "The section \"Your text\" was typed or pasted by the student in TRACE's writing space. TRACE did not generate any of it, and it cannot tell whether pasted text came from elsewhere. Every in-text citation in it was matched to a source in this project.",
    );
  }
  if (!live.length && !sample.length) {
    lines.push("No generative AI system drafted any text in this brief.");
  }

  const failedRuns = project.aiRuns.reduce((n, r) => n + r.rejected.length, 0);
  if (failedRuns) {
    lines.push(`TRACE rejected ${plural(failedRuns, "AI-drafted item")} that cited evidence outside the approved set or broke its output rules. None of those items appears here.`);
  }

  lines.push(
    "Sources were found through Crossref, and the search terms came from a rule-based suggestion that the student edited and approved. " +
      `References were formatted from stored metadata by Citation.js (${project.citationStyle === "harvard1" ? "Harvard" : "APA 7th edition"} style), not written by an AI model.`,
  );
  lines.push(
    "TRACE checked three things automatically: that each quoted excerpt appears, by text matching, in the stored source passage; that the numbers " +
      "and negations stated in each claim also appear in its excerpt; and that cited details agree with the Crossref record for the DOI. These checks do not establish that a source is correct, that a claim follows from " +
      "its excerpt, or that the work is free of plagiarism. Any support rating shown beside a claim was suggested by the AI model or the sample and can be wrong.",
  );
  const r = project.rules;
  lines.push(
    `Rules in force for this project: AI drafting ${r.aiDrafting === "off" ? "switched off" : "allowed from student-approved passages only"}; ` +
      `${r.minYear ? `sources published in ${r.minYear} or later` : "no publication-year limit"}; ` +
      `retracted sources ${r.blockRetracted ? "blocked" : "allowed, with a warning"}.`,
  );
  lines.push("The student reviewed and approved each claim individually and remains responsible for the content of this brief.");
  return lines;
}
