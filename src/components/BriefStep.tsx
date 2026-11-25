"use client";

import { Bot, Check, Download, Eye, FlaskConical, PenLine, Quote, RotateCcw, ScanSearch, TriangleAlert, X } from "lucide-react";
import { useRef, useState } from "react";
import { callApi, type DraftResult } from "@/lib/api";
import { isEvidenceSetApproved, isPlanApproved, selectedEvidence } from "@/lib/approvals";
import { SAMPLE_RAW, sampleAvailable } from "@/lib/demo";
import { buildBrief, citedSources, STYLE_LABEL } from "@/lib/exportMarkdown";
import { evaluateExport, textCitations, type ClaimInspection, type ExportEvaluation } from "@/lib/exportPolicy";
import { sourceIdentity } from "@/lib/identity";
import { suffixOf } from "@/lib/inText";
import { addClaims, approveEvidenceSet, claimsFromDraft, decideClaim, manualClaim, setCitationStyle, setWriting, toggleEvidence } from "@/lib/mutations";
import { buildDraftPayload, LIMITS, type DraftEvidenceInput } from "@/lib/prompt";
import { formatAuthorsShort, inTextShort, newId } from "@/lib/text";
import type { Project, Source } from "@/lib/types";
import { validateDraft } from "@/lib/validateDraft";
import { DECISION, excerptBadge, IDENTITY, RETRACTED, originBadge, StatusChip } from "./status";
import { useProject, useReferences, useStore, type References } from "./store";
import { Button, cx, downloadText, Empty, Field, Notice, ReferenceText, SectionTitle, Select, shortDate, TextArea } from "./ui";

function evidenceInputs(project: Project): DraftEvidenceInput[] {
  return selectedEvidence(project).map((e) => {
    const s = project.sources.find((x) => x.id === e.sourceId);
    return { id: e.id, label: s ? formatAuthorsShort(s.cited.authors, s.cited.year) : "Unknown source", text: e.text };
  });
}

// --- 1. Evidence set ------------------------------------------------------------------------

function EvidenceSetPanel({ goToLibrary, goToPlan }: { goToLibrary: () => void; goToPlan: () => void }) {
  const project = useProject();
  const { update, status } = useStore();
  const chosen = selectedEvidence(project);
  const planOk = isPlanApproved(project);
  const approved = isEvidenceSetApproved(project);
  const everApproved = project.evidenceSet.approvedFingerprint !== null;
  const tooMany = chosen.length > LIMITS.maxEvidenceItems;
  const inputs = evidenceInputs(project);
  const payload = buildDraftPayload(project.question, inputs);
  const tooLong = payload.totalChars > LIMITS.maxTotalChars;

  const passages = (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {chosen.map((e) => {
        const s = project.sources.find((x) => x.id === e.sourceId);
        return (
          <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
            <span className="min-w-0 flex-1 basis-60 text-sm">
              <span className="font-semibold">{s ? formatAuthorsShort(s.cited.authors, s.cited.year) : "Source removed"}</span>
              <span className="text-ink-soft">
                {" "}
                · {e.scope === "abstract" ? "Abstract only" : "Pasted passage, not checked"}, {e.text.length.toLocaleString("en-GB")} characters
                {payload.truncated.includes(e.id) && `, first ${LIMITS.maxCharsPerEvidence.toLocaleString("en-GB")} sent`}
              </span>
            </span>
            <Button size="sm" variant="ghost" icon={X} onClick={() => update((p) => toggleEvidence(p, e.id), "Removed a passage from the evidence set.")}>
              Remove
            </Button>
          </li>
        );
      })}
    </ul>
  );

  const payloadPreview = (
    <details className="mt-4">
      <summary className="text-sm font-semibold text-ink-soft hover:text-ink">Show exactly what would be sent to the AI model</summary>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        This is the complete request: the instructions, your question and the {chosen.length} passage{chosen.length === 1 ? "" : "s"} above ({payload.totalChars.toLocaleString("en-GB")} characters of source text). Your notes, tags and the rest of your library are not sent.{" "}
        {status?.ai.configured ? `It goes to Google's Gemini API (${status.ai.model}). On Google's free tier, content may be used to improve its products and may be read by reviewers.` : "Live AI is not configured on this server, so nothing is sent anywhere."}
      </p>
      <pre className="thin-scroll mt-3 max-h-72 overflow-auto rounded-lg bg-s2 p-4 text-xs leading-relaxed whitespace-pre-wrap text-ink-soft">{`${payload.system}\n\n----\n\n${payload.user}`}</pre>
    </details>
  );

  if (chosen.length > 0 && approved) {
    return (
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-start gap-2 text-sm" role="status">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
            <span>
              <span className="font-semibold text-ink">You approved this evidence set on {shortDate(project.evidenceSet.approvedAt)}</span>
              <span className="text-ink-soft">
                {" "}
                · {chosen.length} passage{chosen.length === 1 ? "" : "s"}. Adding, removing or editing a passage asks for approval again.
              </span>
            </span>
          </p>
        </div>
        <details className="mt-3">
          <summary className="text-sm font-semibold text-ink-soft hover:text-ink">Show the passages</summary>
          <div className="mt-3">{passages}</div>
          {payloadPreview}
        </details>
      </section>
    );
  }

  return (
    <section>
      <SectionTitle>Evidence set</SectionTitle>
      <p className="-mt-2 mb-4 text-sm text-ink-soft">Only these passages can be quoted or sent to the AI model.</p>
      {chosen.length === 0 ? (
        <Empty title="No passages chosen yet">
          Open a source in the Library and tick “Use in the evidence set” on the text you want to work from. Without source text there is nothing to draft from, and TRACE will not guess.
          <div className="mt-4">
            <Button variant="primary" onClick={goToLibrary}>
              Go to the Library
            </Button>
          </div>
        </Empty>
      ) : (
        <>
          {passages}
          {payloadPreview}
          <div className="mt-6 space-y-3">
            {tooMany && <Notice tone="bad">At most {LIMITS.maxEvidenceItems} passages can be in the evidence set. Remove {chosen.length - LIMITS.maxEvidenceItems}.</Notice>}
            {tooLong && <Notice tone="bad">These passages are too long to send together. Remove one.</Notice>}
            {everApproved && (
              <Notice tone="warn" icon={RotateCcw} role="status">
                The evidence set, a passage in it, or your plan changed after you approved. Check the list and approve it again.
              </Notice>
            )}
            {!planOk && (
              <Notice tone="warn">
                Your search plan is not approved for the current question.{" "}
                <button type="button" className="font-semibold underline underline-offset-2" onClick={goToPlan}>
                  Approve the plan first
                </button>
              </Notice>
            )}
            <Button variant="primary" icon={Check} disabled={!planOk || tooMany || tooLong} onClick={() => update((p) => approveEvidenceSet(p, new Date().toISOString()), `Approved an evidence set of ${chosen.length} passage(s).`)}>
              Approve evidence set
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
// --- 2. Drafting ----------------------------------------------------------------------------

interface DraftReport {
  tone: "ok" | "warn" | "bad" | "neutral";
  title: string;
  rejected: string[];
  /** Shown after a failed live call: the student chooses what happens next. Nothing is substituted. */
  offerChoices?: boolean;
}

function DraftPanel({ onInspect }: { onInspect: (id: string) => void }) {
  const project = useProject();
  const { update, status } = useStore();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<DraftReport | null>(null);
  const setOk = isEvidenceSetApproved(project);
  const aiAllowed = project.rules.aiDrafting !== "off";
  const aiOn = (status?.ai.configured ?? false) && aiAllowed;
  const canSample = sampleAvailable(project);

  function accept(raw: unknown, origin: "live_ai" | "sample", model: string | null) {
    const approved = selectedEvidence(project);
    const v = validateDraft(raw, approved);
    const now = new Date().toISOString();
    if (v.fatal) {
      setReport({ tone: "bad", title: `${v.fatal} Nothing was added to your brief.`, rejected: [], offerChoices: origin === "live_ai" });
      return;
    }
    const claims = claimsFromDraft(v.accepted, origin, model, now);
    const rejected = v.rejected.map((r) => `“${r.preview}” ${r.reason}`);
    update(
      (p) => addClaims(p, claims, { id: newId("run"), at: now, mode: origin === "sample" ? "sample" : "live", model, evidenceIds: approved.map((e) => e.id), accepted: claims.length, rejected: v.rejected.map((r) => r.reason) }),
      origin === "sample" ? `Loaded the sample brief: ${claims.length} claim(s) added, ${rejected.length} rejected.` : `AI draft (${model}): ${claims.length} claim(s) added, ${rejected.length} rejected.`,
    );
    setReport({
      tone: rejected.length ? "warn" : "ok",
      title:
        claims.length === 0 && rejected.length === 0
          ? "The model returned no claims. It may have found nothing in these passages that answers the question."
          : `${claims.length} claim${claims.length === 1 ? "" : "s"} added${origin === "sample" ? " from the sample brief" : ""}, each waiting for your decision.${rejected.length ? ` ${rejected.length} item${rejected.length === 1 ? " was" : "s were"} rejected and not added:` : ""}`,
      rejected,
    });
  }

  async function draftLive() {
    setBusy(true);
    setReport(null);
    const outcome = await callApi<DraftResult>("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: project.question, evidence: evidenceInputs(project), aiDrafting: project.rules.aiDrafting }),
    });
    setBusy(false);
    if (!outcome.ok) {
      setReport({ tone: "bad", title: `The AI draft did not happen. ${outcome.message} Nothing was added to your brief.`, rejected: [], offerChoices: true });
      return;
    }
    accept(outcome.data.raw, "live_ai", outcome.data.model);
  }

  function writeOwn() {
    const c = manualClaim(new Date().toISOString());
    update((p) => addClaims(p, [c]), "Started a hand-written claim.");
    onInspect(c.id);
  }

  return (
    <section>
      <SectionTitle>Draft claims</SectionTitle>
      <p className="-mt-2 mb-4 max-w-prose text-sm leading-relaxed text-ink-soft">
        {!aiAllowed
          ? "AI drafting is switched off in this project's rules (Plan step). Write your claims yourself and link each one to a passage."
          : !setOk
          ? "Approve the evidence set above to draft from it. You can write a claim yourself at any time."
          : aiOn
            ? "One request, at most five short claims. The model sees only the approved passages, may cite only them, and cannot write references."
            : "Live AI is not configured on this server. You can still write claims yourself and link them to passages."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={Bot} disabled={!setOk || !aiOn || busy} title={!aiAllowed ? "AI drafting is switched off in the rules" : !aiOn ? "Live AI is not configured on this server" : !setOk ? "Approve the evidence set first" : undefined} onClick={() => void draftLive()}>
          {busy ? "Drafting…" : "Draft with AI"}
        </Button>
        <Button icon={PenLine} onClick={writeOwn}>
          Write a claim myself
        </Button>
        {canSample && (
          <Button icon={FlaskConical} disabled={!setOk || busy} title={!setOk ? "Approve the evidence set first" : undefined} onClick={() => accept(SAMPLE_RAW, "sample", null)}>
            Load sample brief (not live AI)
          </Button>
        )}
      </div>
      {canSample && <p className="mt-3 max-w-prose text-sm text-ink-soft">The sample brief was written during development for this demo. It is not a live AI call, goes through the same checks, and stays labelled as a sample.</p>}

      <div aria-live="polite">
        {report && (
          <Notice tone={report.tone} role={report.tone === "bad" ? "alert" : "status"} className="mt-4">
            {report.title}
            {report.rejected.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                {report.rejected.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            {report.offerChoices && (
              <span className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" icon={RotateCcw} disabled={!setOk || !aiOn || busy} onClick={() => void draftLive()}>
                  Try the AI draft again
                </Button>
                <Button size="sm" icon={PenLine} onClick={writeOwn}>
                  Write a claim myself
                </Button>
                {canSample && (
                  <Button size="sm" icon={FlaskConical} disabled={!setOk} onClick={() => accept(SAMPLE_RAW, "sample", null)}>
                    Load sample brief (not live AI)
                  </Button>
                )}
              </span>
            )}
          </Notice>
        )}
      </div>
    </section>
  );
}

// --- 3. Claims ------------------------------------------------------------------------------

/** The single most important thing to say about a claim's evidence, so a row carries one status, not five. */
function worstIssueBadge(i: ClaimInspection) {
  const codes = i.issues.map((x) => x.code);
  if (codes.includes("evidence_missing")) return { tone: "bad" as const, icon: X, label: "Passage missing" };
  if (codes.includes("source_retracted")) return RETRACTED;
  if (codes.includes("identity_mismatch") && i.identity) return IDENTITY[i.identity.status];
  if (codes.includes("quote_mismatch") || codes.includes("quote_not_checkable")) return excerptBadge(i.excerpt);
  if (codes.includes("claim_detail_unsupported")) return { tone: "bad" as const, icon: X, label: "Claim detail not in excerpt" };
  if (codes.includes("evidence_unapproved")) return { tone: "warn" as const, icon: RotateCcw, label: "Passage not in evidence set" };
  if (codes.includes("claim_empty")) return { tone: "warn" as const, icon: PenLine, label: "No text yet" };
  if (i.claim.kind === "inference") return { tone: "neutral" as const, icon: PenLine, label: "Inference, no source passage" };
  return excerptBadge(i.excerpt);
}

function ClaimRow({ i, refs, active, onInspect }: { i: ClaimInspection; refs: References; active: boolean; onInspect: () => void }) {
  const { update } = useStore();
  const { claim, source } = i;
  const blocking = i.issues.filter((x) => x.code !== "claim_pending" && x.code !== "claim_stale");
  const rejected = claim.decision === "rejected";
  const inText = source ? (refs.byId.get(source.id)?.inText ?? inTextShort(source.cited.authors, source.cited.year)) : null;

  return (
    <li className={cx("grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 px-4 py-6 transition-colors sm:px-6", active && "bg-brand-tint/60", rejected && "opacity-60")}>
      <span aria-hidden className="num grid size-8 place-items-center rounded-full bg-s2 text-sm font-bold text-ink-soft">
        {i.number}
      </span>
      <div className="min-w-0 max-w-[68ch]">
        <p className={cx("text-lg leading-relaxed text-ink", rejected && "line-through decoration-ink-faint")}>
          {claim.text || <span className="text-ink-faint">No text yet. Open the claim to write it.</span>}{" "}
          {claim.kind === "evidence" && inText && (
            <button type="button" className="text-base font-semibold text-accent-text underline decoration-accent/30 underline-offset-2 hover:decoration-accent" onClick={onInspect}>
              {inText}
            </button>
          )}
        </p>
        {claim.kind === "evidence" && claim.excerpt && (
          <p className="mt-2 text-base leading-relaxed text-ink-soft">
            <span aria-hidden className="font-bold text-accent">“</span>
            {claim.excerpt.length > 240 ? `${claim.excerpt.slice(0, 240).trimEnd()}…` : claim.excerpt}
            <span aria-hidden className="font-bold text-accent">”</span>
          </p>
        )}
        {claim.testCorruption && <p className="mt-3 rounded-lg bg-bad-tint px-3 py-2 text-sm text-ink">{claim.testCorruption}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusChip badge={originBadge(claim)} title={claim.origin === "live_ai" ? `Drafted by ${claim.model ?? "an AI model"}` : undefined} />
          <StatusChip badge={worstIssueBadge(i)} />
          <StatusChip badge={DECISION[i.decision]} />
        </div>
        {blocking.length > 0 && !rejected && <p className="mt-2 text-sm text-bad">{blocking[0]?.message.replace(/^Claim \d+: /, "Needs attention: ")}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" icon={ScanSearch} onClick={onInspect} aria-label={`Inspect claim ${i.number}`}>
            Inspect evidence
          </Button>
          {i.decision !== "approved" && !rejected && (
            <Button size="sm" variant="primary" icon={Check} disabled={blocking.length > 0} title={blocking.length > 0 ? "Open the claim to resolve its open points first" : undefined} aria-label={`Approve claim ${i.number}`} onClick={() => update((p) => decideClaim(p, claim.id, "approved"), `Approved claim ${i.number}.`)}>
              {i.decision === "stale" ? "Approve again" : "Approve"}
            </Button>
          )}
          {!rejected ? (
            <Button size="sm" variant="ghost" icon={X} aria-label={`Reject claim ${i.number}`} onClick={() => update((p) => decideClaim(p, claim.id, "rejected"), `Rejected claim ${i.number}.`)}>
              Reject
            </Button>
          ) : (
            <Button size="sm" variant="ghost" icon={RotateCcw} aria-label={`Restore claim ${i.number}`} onClick={() => update((p) => decideClaim(p, claim.id, "pending"), `Reopened claim ${i.number}.`)}>
              Restore
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

// --- 3b. Writing --------------------------------------------------------------------------------

/** In-text form for inserting a citation: the formatted one when the reference list has it, otherwise built from stored details. */
function inTextFor(source: Source, refs: References, style: Project["citationStyle"]): string {
  const formatted = refs.byId.get(source.id)?.inText;
  if (formatted) return formatted;
  const short = inTextShort(source.cited.authors, source.cited.year);
  return style === "harvard1" ? short.replace(" & ", " and ") : short;
}

function WritingPanel({ refs }: { refs: References }) {
  const project = useProject();
  const { update } = useStore();
  const box = useRef<HTMLTextAreaElement>(null);
  const [choice, setChoice] = useState("");
  const letters = new Map(refs.ordered.map((r) => [r.id, suffixOf(r.inText)]));
  const cites = textCitations(project, letters);
  const words = project.writing.trim() ? project.writing.trim().split(/\s+/).length : 0;
  const withText = new Set(project.evidence.map((e) => e.sourceId));
  const options = [...project.sources].sort((a, b) => Number(withText.has(b.id)) - Number(withText.has(a.id)));

  function insert() {
    const source = project.sources.find((s) => s.id === choice);
    const el = box.current;
    if (!source || !el) return;
    const citation = inTextFor(source, refs, project.citationStyle);
    const at = el.selectionStart ?? project.writing.length;
    const before = project.writing.slice(0, at);
    const after = project.writing.slice(el.selectionEnd ?? at);
    const spaced = (before && !/\s$/.test(before) ? " " : "") + citation;
    update((p) => setWriting(p, before + spaced + after));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(at + spaced.length, at + spaced.length);
    });
  }

  const unique = cites.filter((c, n) => cites.findIndex((x) => x.raw === c.raw) === n);

  return (
    <section>
      <SectionTitle aside={`${words} word${words === 1 ? "" : "s"}`}>Your text</SectionTitle>
      <p className="-mt-2 mb-4 max-w-prose text-sm leading-relaxed text-ink-soft">
        Write your paragraph or essay here and cite as you go. Every in-text citation is checked against the sources in this project as you type. TRACE never writes this text for you.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Source to cite" className="min-w-0 flex-1 basis-72">
          {(id) => (
            <Select id={id} value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="">Choose a source</option>
              {options.map((s) => (
                <option key={s.id} value={s.id}>
                  {inTextFor(s, refs, project.citationStyle)} {s.cited.title.length > 60 ? `${s.cited.title.slice(0, 60)}…` : s.cited.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button icon={Quote} disabled={!choice} onClick={insert}>
          Insert citation
        </Button>
      </div>
      <label htmlFor="writing" className="sr-only">
        Your text
      </label>
      <TextArea
        ref={box}
        id="writing"
        rows={10}
        maxLength={40000}
        className="mt-4 text-base leading-relaxed"
        value={project.writing}
        onChange={(e) => update((p) => setWriting(p, e.target.value))}
        placeholder="Retrieval practice appears to improve long-term retention more than rereading (Roediger & Karpicke, 2006a)…"
      />

      <div className="mt-4" aria-live="polite">
        {cites.length === 0 ? (
          <p className="text-sm text-ink-soft">{project.writing.trim() ? "No citations in your text yet." : "Citations you type or insert are checked here."}</p>
        ) : (
          <ul aria-label="Citations in your text" className="divide-y divide-line rounded-lg border border-line">
            {unique.map((c) => {
              const source = c.sourceId ? project.sources.find((s) => s.id === c.sourceId) : undefined;
              const id = source ? sourceIdentity(source) : null;
              const expected = c.sourceId ? letters.get(c.sourceId) : undefined;
              const badge = !c.sourceId
                ? { tone: "bad" as const, icon: X, label: "Not a source in this project" }
                : id?.status === "mismatch"
                  ? IDENTITY.mismatch
                  : id?.retraction
                    ? RETRACTED
                    : c.ambiguous
                      ? { tone: "warn" as const, icon: TriangleAlert, label: "Matches two sources: add the letter" }
                      : expected !== undefined && expected !== c.suffix
                        ? { tone: "warn" as const, icon: TriangleAlert, label: `Reference list uses ${c.year}${expected}` }
                        : { tone: "ok" as const, icon: Check, label: "Matches a source in this project" };
              return (
                <li key={c.raw} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-ink">{c.raw}</span>
                    {source && <span className="text-ink-soft"> · {source.cited.title}</span>}
                  </span>
                  <StatusChip badge={badge} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
// --- 4. Review and export -------------------------------------------------------------------

function ExportPanel({ evaluation, refs, onInspect, goToPlan }: { evaluation: ExportEvaluation; refs: References; onInspect: (id: string) => void; goToPlan: () => void }) {
  const project = useProject();
  const { update } = useStore();
  const [preview, setPreview] = useState(false);
  const [refused, setRefused] = useState<string[] | null>(null);
  const cited = citedSources(project);
  const refsReady = cited.length === 0 || refs.state === "ok";
  const canReview = evaluation.eligible && refsReady;
  const ordered = refs.state === "ok" ? refs.ordered : null;

  function download(mode: "reviewed" | "draft") {
    const now = new Date().toISOString();
    // The gate is evaluated again here, at the moment of export, whatever the buttons showed.
    const result = buildBrief(project, ordered, mode, now);
    if (!result.ok) return setRefused(result.reasons);
    setRefused(null);
    downloadText(result.filename, result.markdown);
    update((p) => p, mode === "reviewed" ? "Exported a reviewed brief." : "Exported a draft marked as not reviewed.");
  }

  const previewResult = preview ? buildBrief(project, ordered, canReview ? "reviewed" : "draft", new Date().toISOString()) : null;
  const blockers = evaluation.blockers.length;

  return (
    <>
      <section>
        <SectionTitle>Review and export</SectionTitle>
        {evaluation.eligible ? (
          <Notice tone="ok" icon={Check} role="status">
            Every claim that is left has your approval, its excerpt is in the stored text, and no reference disagrees with Crossref. That is what a reviewed brief means here. It does not mean the sources are correct, or that each claim follows from its excerpt.
          </Notice>
        ) : (
          <div className="rounded-xl border border-warn/25 bg-warn-tint px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              {blockers} point{blockers === 1 ? "" : "s"} to resolve before this can be exported as reviewed
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {evaluation.blockers.map((b, n) => (
                <li key={n} className="flex flex-wrap items-baseline gap-x-2">
                  <span>{b.message}</span>
                  {b.claimId && (
                    <button type="button" className="font-semibold text-accent-text underline underline-offset-2" onClick={() => onInspect(b.claimId as string)}>
                      Open claim
                    </button>
                  )}
                  {b.code === "plan_unapproved" && (
                    <button type="button" className="font-semibold text-accent-text underline underline-offset-2" onClick={goToPlan}>
                      Go to the plan
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {cited.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold">References ({STYLE_LABEL[project.citationStyle]})</h3>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-ink-soft">Style</span>
                <Select aria-label="Reference style" className="h-8 w-40 text-sm" value={project.citationStyle} onChange={(e) => update((p) => setCitationStyle(p, e.target.value === "harvard1" ? "harvard1" : "apa"), "Changed the reference style.")}>
                  <option value="apa">APA 7</option>
                  <option value="harvard1">Harvard</option>
                </Select>
              </label>
            </div>
            {refs.state === "error" && (
              <Notice tone="bad" role="alert">
                The references could not be formatted. {refs.message} A reviewed brief needs formatted references; a draft can still be downloaded.
              </Notice>
            )}
            {refs.state !== "error" && refs.ordered.length === 0 && <p className="text-sm text-ink-soft">Formatting…</p>}
            <ul className="max-w-[68ch] space-y-3 text-base leading-relaxed">
              {refs.ordered.map((r) => (
                <li key={r.id} className="pl-6 -indent-6 break-words">
                  <ReferenceText parts={r.parts} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 max-w-prose text-sm leading-relaxed text-ink-soft">
          Both files are Markdown with your text, your claims, the references, source links, where each excerpt came from, limitations, and a disclosure of how AI was used. You remain responsible for what you submit. TRACE does not detect plagiarism and does not certify the work.
        </p>
        <Button variant="ghost" icon={Eye} className="mt-3" aria-expanded={preview} disabled={project.claims.length === 0} onClick={() => setPreview(!preview)}>
          {preview ? "Hide preview" : "Preview the file"}
        </Button>
        {previewResult?.ok && (
          <div className="mt-3">
            <p className="mb-2 text-sm text-ink-soft">
              Preview of {previewResult.filename}
              {!canReview && ". This is the draft version, because the review is not complete."}
            </p>
            <pre tabIndex={0} aria-label="Preview of the exported file" className="thin-scroll max-h-[28rem] overflow-auto rounded-lg bg-s2 p-4 text-xs leading-relaxed whitespace-pre-wrap text-ink">
              {previewResult.markdown}
            </pre>
          </div>
        )}
      </section>

      <div className="float sticky bottom-4 z-10 rounded-xl px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="min-w-0 flex-1 basis-56 text-sm" role="status">
            {evaluation.eligible ? (
              <span className="font-semibold text-ok">Ready to export as reviewed.</span>
            ) : (
              <span className="text-ink-soft">
                <span className="font-semibold text-warn">{blockers} to resolve</span> before a reviewed export. {evaluation.counts.total ? evaluation.summary + "." : ""}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button icon={Download} disabled={project.claims.length === 0} onClick={() => download("draft")}>
              Download draft, marked as not reviewed
            </Button>
            <Button variant="primary" icon={Download} disabled={!canReview} title={!evaluation.eligible ? "Resolve the points listed above first" : !refsReady ? "Waiting for the references to be formatted" : undefined} onClick={() => download("reviewed")}>
              Download reviewed brief
            </Button>
          </div>
        </div>
        {refused && (
          <Notice tone="bad" role="alert" className="mt-3">
            The reviewed brief was not produced:
            <ul className="mt-1 list-disc pl-4">
              {refused.map((r, n) => (
                <li key={n}>{r}</li>
              ))}
            </ul>
          </Notice>
        )}
      </div>
    </>
  );
}

export function BriefStep({ inspectingId, onInspect, goToLibrary, goToPlan }: { inspectingId: string | null; onInspect: (id: string) => void; goToLibrary: () => void; goToPlan: () => void }) {
  const project = useProject();
  const evaluation = evaluateExport(project);
  const refs = useReferences(citedSources(project), "list", project.citationStyle);

  return (
    <div className="step-body max-w-5xl space-y-6">
      <EvidenceSetPanel goToLibrary={goToLibrary} goToPlan={goToPlan} />
      <DraftPanel onInspect={onInspect} />
      <section className="!p-0">
        <div className="px-4 pt-6 sm:px-6">
          <SectionTitle aside={project.claims.length ? evaluation.summary : undefined}>Claims</SectionTitle>
        </div>
        {project.claims.length === 0 ? (
          <div className="px-4 pb-6 sm:px-6">
            <Empty title="No claims yet">Draft from the approved evidence set, or write a claim yourself. Each claim is a short card you can inspect, edit, approve or reject.</Empty>
          </div>
        ) : (
          <ol className="divide-y divide-line border-t border-line">
            {evaluation.inspections.map((i) => (
              <ClaimRow key={i.claim.id} i={i} refs={refs} active={inspectingId === i.claim.id} onInspect={() => onInspect(i.claim.id)} />
            ))}
          </ol>
        )}
      </section>
      <WritingPanel refs={refs} />
      <ExportPanel evaluation={evaluation} refs={refs} onInspect={onInspect} goToPlan={goToPlan} />
    </div>
  );
}