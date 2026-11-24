/**
 * Builds the exported brief (Markdown) and the project backup (JSON).
 *
 * A "reviewed" brief is only produced when evaluateExport() passes at the moment of export.
 * Anything else can be downloaded as a draft, which is labelled DRAFT in its filename, its first
 * line and its list of unresolved points, so it cannot pass for a reviewed brief.
 */
import type { FormattedReference } from "./api";
import { sourceLink } from "./csl";
import { buildDisclosure } from "./disclosure";
import { evaluateExport, type ClaimInspection } from "./exportPolicy";
import { newId, formatAuthorsShort, inTextShort } from "./text";
import { ProjectSchema, SCHEMA_VERSION, type Claim, type Project, type Source } from "./types";

export type ExportMode = "reviewed" | "draft";
export type ExportResult = { ok: true; markdown: string; filename: string } | { ok: false; reasons: string[] };

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const day = (iso: string) => iso.slice(0, 10);

export function referenceMarkdown(ref: FormattedReference): string {
  return ref.parts.map((p) => (p.italic ? `*${p.text.replaceAll("*", "\\*")}*` : p.text.replaceAll("*", "\\*"))).join("");
}

function originLabel(c: Claim): string {
  const edited = c.edited ? ", then edited by the student" : "";
  if (c.origin === "live_ai") return `AI-drafted (${c.model ?? "model not recorded"})${edited}`;
  if (c.origin === "sample") return `SAMPLE output, not a live AI call${edited}`;
  return "Written by the student";
}

function quoteCheck(i: ClaimInspection): string {
  if (i.excerpt.status === "matched") return "excerpt found in the stored text";
  if (i.excerpt.status === "mismatch") return "EXCERPT NOT FOUND in the stored text";
  return "excerpt could not be checked";
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "brief"
  );
}

export function citedSources(project: Project): Source[] {
  const ids = new Set<string>();
  for (const c of project.claims) {
    if (c.decision === "rejected" || !c.evidenceId) continue;
    const ev = project.evidence.find((e) => e.id === c.evidenceId);
    if (ev) ids.add(ev.sourceId);
  }
  return project.sources.filter((s) => ids.has(s.id));
}

export function buildBrief(project: Project, refs: FormattedReference[] | null, mode: ExportMode, now: string): ExportResult {
  const evaluation = evaluateExport(project);
  const cited = citedSources(project);
  const refById = new Map((refs ?? []).map((r) => [r.id, r]));
  const allFormatted = cited.every((s) => refById.has(s.id));

  if (mode === "reviewed") {
    if (!evaluation.eligible) return { ok: false, reasons: evaluation.blockers.map((b) => b.message) };
    if (!allFormatted) {
      return { ok: false, reasons: ["The references could not be formatted, so a reviewed brief cannot be produced. Try again, or download a draft."] };
    }
  }

  const included = evaluation.inspections.filter((i) => i.claim.decision !== "rejected");
  const isTrap = project.kind === "trap";
  const out: string[] = [];

  if (mode === "draft") {
    out.push("> **DRAFT — NOT REVIEWED.** This file was exported before the review was complete. Do not submit or cite it as a reviewed brief.", "");
  }
  if (isTrap) {
    out.push("> **CITATION-TRAP TEST COPY.** This project contains content that was deliberately corrupted to test TRACE's checks. It is not a research brief.", "");
  }

  out.push(`# ${oneLine(project.question) || "Untitled research question"}`, "");
  out.push(
    mode === "reviewed"
      ? `Research brief prepared with TRACE. Every claim below was approved by the student on or before ${day(now)}.`
      : `Research brief in progress, exported from TRACE on ${day(now)}. ${evaluation.summary}.`,
    "",
  );

  if (mode === "draft" && evaluation.blockers.length) {
    out.push("## Unresolved before this can be a reviewed brief", "");
    for (const b of evaluation.blockers) out.push(`- ${b.message}`);
    out.push("");
  }

  out.push("## Brief", "");
  for (const i of included) {
    const c = i.claim;
    const ref = i.source ? refById.get(i.source.id) : undefined;
    const inText = c.kind === "inference" ? "" : ` ${ref?.inText ?? (i.source ? inTextShort(i.source.cited.authors, i.source.cited.year) : "(source missing)")}`;
    out.push(`${i.number}. ${oneLine(c.text)}${inText}`);
    if (c.kind === "inference") {
      out.push("   - **Inference.** No source passage states this. It is the writer's own reasoning.");
    } else {
      out.push(`   - Excerpt: “${oneLine(c.excerpt)}”${i.evidence ? ` (${i.evidence.locator})` : ""}`);
    }
    if (c.limitations.trim()) out.push(`   - Limits: ${oneLine(c.limitations)}`);
    const support = c.kind === "evidence" && c.support ? `; ${c.origin === "sample" ? "sample" : "model"}-suggested support: ${c.support} (can be wrong)` : "";
    out.push(`   - Origin: ${originLabel(c)}${support}`);
    if (mode === "draft") out.push(`   - Status: ${i.issues.length ? i.issues.map((x) => x.message.replace(/^Claim \d+: /, "")).join(" ") : "approved, no open points"}`);
    if (c.testCorruption) out.push(`   - ${c.testCorruption}`);
    out.push("");
  }

  out.push("## References (APA 7)", "");
  if (cited.length === 0) out.push("No sources are cited.", "");
  const ordered = refs ? refs.filter((r) => cited.some((s) => s.id === r.id)) : [];
  const unformatted = cited.filter((s) => !refById.has(s.id));
  for (const r of ordered) {
    const s = cited.find((x) => x.id === r.id);
    out.push(`- ${referenceMarkdown(r)}`);
    if (s?.testCorruption) out.push(`  - ${s.testCorruption}`);
  }
  for (const s of unformatted) {
    out.push(`- UNFORMATTED: ${formatAuthorsShort(s.cited.authors, s.cited.year)}. ${s.cited.title}. ${sourceLink(s.doi, s.cited) ?? ""}`);
  }
  if (cited.length) {
    out.push(
      "",
      "Formatted by Citation.js from stored metadata. Titles keep the capitalisation recorded in the registry; APA 7 asks for sentence case, so check titles before submitting.",
      "",
    );
  }

  out.push("## Evidence and provenance", "");
  for (const i of included.filter((x) => x.claim.kind === "evidence")) {
    const src = i.source ? formatAuthorsShort(i.source.cited.authors, i.source.cited.year) : "source missing";
    const ev = i.evidence;
    const where = ev
      ? `${ev.scope === "abstract" ? "abstract only" : "passage pasted by the student, not checked against the publication"}, from ${ev.provenance.provider === "user" ? "the student" : ev.provenance.provider === "crossref" ? "Crossref" : "OpenAlex"} on ${day(ev.provenance.retrievedAt)}`
      : "no stored text";
    out.push(`- Claim ${i.number} → ${src}: ${where}; ${quoteCheck(i)}. Reference identity: ${i.identity?.summary ?? "not applicable."}`);
  }
  if (!included.some((x) => x.claim.kind === "evidence")) out.push("No claim cites a stored passage.");
  out.push("");

  out.push("## Limitations", "");
  const scopes = new Set(included.flatMap((i) => (i.evidence ? [i.evidence.scope] : [])));
  if (scopes.has("abstract")) out.push("- Evidence was limited to abstracts. Methods, results tables and caveats in the full papers were not read by TRACE.");
  if (scopes.has("user_pasted")) out.push("- Some passages were pasted by the student and were not checked against the publication.");
  out.push("- A matched excerpt shows that the quoted words are in the stored text. It does not show that the paper is right or that the claim follows from the words.");
  out.push("- The source list reflects one search of Crossref and the student's choices. It is not a systematic review and may miss or over-represent some work.");
  out.push("");

  out.push("## AI-use disclosure", "");
  for (const line of buildDisclosure(project, evaluation)) out.push(line, "");

  const prefix = isTrap ? "trace-TEST-COPY" : "trace-brief";
  return { ok: true, markdown: out.join("\n").trimEnd() + "\n", filename: `${prefix}-${slug(project.question)}-${mode === "reviewed" ? "reviewed" : "DRAFT"}.md` };
}

// --- Project backup ------------------------------------------------------------------------

export function exportProjectJson(project: Project, now: string): { json: string; filename: string } {
  return {
    json: JSON.stringify({ format: "trace-project", version: SCHEMA_VERSION, exportedAt: now, project }, null, 2),
    filename: `trace-project-${slug(project.name)}.json`,
  };
}

export function importProjectJson(text: string): { ok: true; project: Project } | { ok: false; reason: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: "That file is not valid JSON." };
  }
  const wrapper = json as { format?: unknown; version?: unknown; project?: unknown };
  if (wrapper?.format !== "trace-project") return { ok: false, reason: "That file is not a TRACE project backup." };
  if (wrapper.version !== SCHEMA_VERSION) return { ok: false, reason: `That backup uses format version ${String(wrapper.version)}; this build reads version ${SCHEMA_VERSION}.` };
  const parsed = ProjectSchema.safeParse(wrapper.project);
  if (!parsed.success) return { ok: false, reason: "That backup is damaged or incomplete, so it was not imported." };
  // A fresh ID, so importing never overwrites a project that is already here.
  return { ok: true, project: { ...parsed.data, id: newId("prj"), name: `${parsed.data.name} (imported)` } };
}
