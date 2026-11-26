/**
 * A compact verification report, built from the same validators and state as the Claim Inspector and the
 * export gate (evaluateExport, exportReadiness, sourceIdentity, the shared labels). It documents a project
 * as it stands, including a blocked one, and states review status and download readiness separately.
 *
 * It never contains prompts, API payloads or complete source passages: claims are quoted, excerpts are
 * shortened, and evidence is described by where it came from.
 */
import { aiUseStatement } from "./disclosure";
import { citedSources, ROLE_LABEL } from "./exportMarkdown";
import { evaluateExport, exportReadiness, type ClaimInspection, type ReferenceState } from "./exportPolicy";
import { sourceIdentity } from "./identity";
import { DECISION_LABEL, excerptLabel, trustLabel } from "./labels";
import { referenceListEligibility } from "./referenceList";
import { formatAuthorsShort } from "./text";
import type { Claim, Project, Source } from "./types";

const SUPPORT: Record<string, string> = { supports: "supports", partial: "partly supports", insufficient: "is not enough for" };

function short(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t;
}

function origin(c: Claim): string {
  const edited = c.edited ? ", edited by the student" : "";
  if (c.origin === "live_ai") return `AI suggestion (${c.model ?? "model not recorded"})${edited}`;
  if (c.origin === "sample") return `SAMPLE output, not a live AI call${edited}`;
  return "Written by the student";
}

function reference(s: Source): string {
  const id = sourceIdentity(s);
  const label = trustLabel(id);
  const registry = id.registry ? `${id.registry} record retrieved ${id.registryRetrievedAt?.slice(0, 10) ?? "on an unknown date"}` : s.doi ? "no registry record" : "entered by hand, no DOI";
  const retraction = id.retraction ? `; RETRACTED (${id.retraction.kind} notice${id.retraction.date ? ` ${id.retraction.date.slice(0, 10)}` : ""})` : "";
  return `${label} (${registry})${retraction}`;
}

function evidenceOrigin(i: { kind: Claim["kind"]; evidence: ClaimInspection["evidence"] }): string {
  if (i.kind === "inference") return "none: marked as an inference";
  if (!i.evidence) return "missing: the passage is no longer in the project";
  if (i.evidence.scope === "user_pasted") return "passage pasted by the student, not checked against the publication";
  const p = i.evidence.provenance;
  return `abstract from ${p.provider === "openalex" ? "OpenAlex" : "Crossref"}, retrieved ${p.retrievedAt.slice(0, 10)}`;
}

/**
 * `references` is the formatting state the export controls see right now, so the report states the same
 * readiness as the buttons beside it. Without it (tests, scripts) formatting is assumed to have finished.
 */
export function buildVerificationReport(project: Project, now: string, references: ReferenceState = "ready"): { filename: string; text: string } {
  const evaluation = evaluateExport(project);
  const readiness = exportReadiness(evaluation, references);
  const out: string[] = [];
  const kind = project.kind === "trap" ? "CITATION-TRAP TEST COPY: two errors were planted on purpose." : project.kind === "demo" ? "DEMO PROJECT: real Crossref records saved for the demo; sample output is labelled." : null;

  out.push("# TRACE verification report", "");
  out.push(`Generated ${now.slice(0, 16).replace("T", " ")} UTC from the checks TRACE runs in the browser. Project: ${project.name}.`);
  if (kind) out.push("", `> ${kind}`);
  out.push("", `**Question:** ${short(project.question, 300) || "(none yet)"}`, "");
  // Two separate facts: whether the review checks pass, and whether the reviewed brief can be downloaded now.
  out.push(
    `**Review:** ${evaluation.counts.total === 0 ? "no claims to review yet." : evaluation.eligible ? "all checks passed and every included claim is approved." : `blocked by ${evaluation.blockers.length} open point${evaluation.blockers.length === 1 ? "" : "s"} (listed below).`}`,
    "",
    `**Download:** ${readiness.label}`,
    "",
  );

  const sources = citedSources(project);
  out.push(`## References used (${sources.length})`, "");
  if (sources.length === 0) out.push("No claim or in-text citation uses a reference yet.");
  for (const s of sources) out.push(`- ${formatAuthorsShort(s.cited.authors, s.cited.year)}, “${short(s.cited.title, 120)}”${s.doi ? `, doi:${s.doi}` : ""}: ${reference(s)}.`);
  const others = project.sources.length - sources.length;
  if (others > 0) out.push(`- ${others} other source${others === 1 ? "" : "s"} in the library ${others === 1 ? "is" : "are"} not used.`);
  out.push("");

  // Every saved reference that is not clean, with its warning, whether or not a claim uses it.
  const { excluded } = referenceListEligibility(project.sources);
  out.push(`## Excluded or unresolved references (${excluded.length})`, "");
  if (excluded.length === 0) out.push("None. Every saved reference agrees with its registry record and has no retraction notice.");
  for (const e of excluded) out.push(`- **${e.reason.toUpperCase()}:** ${formatAuthorsShort(e.source.cited.authors, e.source.cited.year)}, “${short(e.source.cited.title, 120)}”${e.source.doi ? `, doi:${e.source.doi}` : ""}. Kept out of the APA 7 reference list.`);
  out.push("");

  out.push(`## Claims (${evaluation.counts.total} included${evaluation.counts.rejected ? `, ${evaluation.counts.rejected} rejected` : ""})`, "");
  if (evaluation.inspections.length === 0) out.push("No claims yet.", "");
  for (const i of evaluation.inspections) {
    const c = i.claim;
    out.push(`### Claim ${i.number}${c.decision === "rejected" ? " (rejected, not exported)" : ""}`, "");
    out.push(`- Claim: “${short(c.text, 280) || "(no text yet)"}”`);
    out.push(`- Origin: ${origin(c)}`);
    if (c.kind === "evidence") {
      out.push(`- Reference: ${i.source ? reference(i.source) : "missing"}`);
      out.push(`- Evidence: ${evidenceOrigin({ kind: c.kind, evidence: i.evidence })}`);
      out.push(`- Quote check: ${excerptLabel(i.excerpt)}${c.excerpt ? ` (“${short(c.excerpt, 120)}”)` : ""}`);
      if (i.details.length) out.push(`- Claim details: ${i.details.map((d) => d.message).join(" ")}`);
      out.push(`- AI-suggested support: ${c.support ? `the excerpt ${SUPPORT[c.support] ?? c.support} the claim (a suggestion, can be wrong)` : "none recorded"}`);
      const s = i.second;
      if (s && c.second) {
        // The second passage, checked like the first. Its role is the student's judgement, not a TRACE check.
        out.push(`- Second passage, role: ${ROLE_LABEL[s.role]} (the student's judgement, not checked by TRACE)`);
        out.push(`  - Reference: ${s.source ? reference(s.source) : "missing"}`);
        out.push(`  - Evidence: ${evidenceOrigin({ kind: "evidence", evidence: s.evidence })}`);
        out.push(`  - Quote check: ${excerptLabel(s.excerpt)}${c.second.excerpt ? ` (“${short(c.second.excerpt, 120)}”)` : ""}`);
      }
    } else {
      out.push(`- Evidence: ${evidenceOrigin({ kind: c.kind, evidence: i.evidence })}`);
    }
    out.push(`- Student decision: ${DECISION_LABEL[i.decision]}`);
    out.push("");
  }

  out.push("## Export blockers", "");
  if (evaluation.blockers.length === 0) out.push(evaluation.counts.total === 0 ? "None, but there are no claims yet." : "None. The review checks pass.");
  for (const b of evaluation.blockers) out.push(`- ${b.message}`);
  out.push("", "## AI-use statement", "", aiUseStatement(project, evaluation), "");

  out.push(
    "## What this report does not show",
    "",
    "A matched excerpt shows the quoted words occur in the stored passage, not that the claim follows from it or that the paper is right. A matching reference shows the cited title, first author's surname and year agree with the registry record. Support ratings are suggestions. TRACE does not detect plagiarism.",
    "",
  );

  const prefix = project.kind === "trap" ? "trace-verification-TEST-COPY" : "trace-verification";
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";
  return { filename: `${prefix}-${slug}-${now.slice(0, 10)}.md`, text: out.join("\n").trimEnd() + "\n" };
}
