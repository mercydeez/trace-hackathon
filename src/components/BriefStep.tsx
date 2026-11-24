"use client";

import { Bot, Check, Download, Eye, FlaskConical, PenLine, RotateCcw, ScanSearch, X } from "lucide-react";
import { useState } from "react";
import { callApi, type DraftResult } from "@/lib/api";
import { isEvidenceSetApproved, isPlanApproved, selectedEvidence } from "@/lib/approvals";
import { SAMPLE_RAW, sampleAvailable } from "@/lib/demo";
import { buildBrief, citedSources } from "@/lib/exportMarkdown";
import { evaluateExport, type ClaimInspection, type ExportEvaluation } from "@/lib/exportPolicy";
import { addClaims, approveEvidenceSet, claimsFromDraft, decideClaim, manualClaim, toggleEvidence } from "@/lib/mutations";
import { buildDraftPayload, LIMITS, type DraftEvidenceInput } from "@/lib/prompt";
import { formatAuthorsShort, inTextShort, newId } from "@/lib/text";
import type { Project } from "@/lib/types";
import { validateDraft } from "@/lib/validateDraft";
import { DECISION, excerptBadge, IDENTITY, originBadge, StatusChip } from "./status";
import { useProject, useReferences, useStore, type References } from "./store";
import { Button, Chip, cx, downloadText, Empty, Notice, ReferenceText, SectionTitle, shortDate } from "./ui";

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

  return (
    <section>
      <SectionTitle aside="Only these passages can be quoted or sent to the AI model.">Evidence set</SectionTitle>
      {chosen.length === 0 ? (
        <Empty title="No passages chosen yet">
          Open a source in the Library and tick “Use in the evidence set” on the text you want to work from. Without source text there is nothing to draft from, and TRACE will not guess.
          <div className="mt-3">
            <Button variant="primary" onClick={goToLibrary}>
              Go to the Library
            </Button>
          </div>
        </Empty>
      ) : (
        <>
          <ul className="border-t border-line">
            {chosen.map((e) => {
              const s = project.sources.find((x) => x.id === e.sourceId);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2">
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="font-medium">{s ? formatAuthorsShort(s.cited.authors, s.cited.year) : "Source removed"}</span>
                    <span className="text-ink-soft">
                      {" "}
                      {e.scope === "abstract" ? "Abstract only" : "Pasted passage, not checked"}, {e.text.length.toLocaleString("en-GB")} characters
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

          <details className="mt-3 text-sm">
            <summary className="font-medium text-ink-soft">Show exactly what would be sent to the AI model</summary>
            <p className="mt-2 text-xs text-ink-faint">
              This is the complete request: the instructions, your question and the {chosen.length} passage{chosen.length === 1 ? "" : "s"} above ({payload.totalChars.toLocaleString("en-GB")} characters of source text). Your notes, tags and the rest of your library are not sent.{" "}
              {status?.ai.configured ? `It would go to Google's Gemini API (${status.ai.model}). On Google's free tier, content may be used to improve its products and may be read by reviewers.` : "Live AI is not configured on this server, so nothing is sent anywhere."}
            </p>
            <pre className="mt-2 max-h-72 overflow-auto rounded border border-line bg-surface p-3 text-xs leading-relaxed whitespace-pre-wrap text-ink-soft">{`${payload.system}\n\n----\n\n${payload.user}`}</pre>
          </details>

          <div className="mt-4 space-y-3">
            {tooMany && <Notice tone="bad">At most {LIMITS.maxEvidenceItems} passages can be in the evidence set. Remove {chosen.length - LIMITS.maxEvidenceItems}.</Notice>}
            {tooLong && <Notice tone="bad">These passages are too long to send together. Remove one.</Notice>}
            {approved ? (
              <Notice tone="ok" icon={Check} role="status">
                You approved this evidence set on {shortDate(project.evidenceSet.approvedAt)}. Adding, removing or editing a passage will ask for approval again.
              </Notice>
            ) : everApproved ? (
              <Notice tone="warn" icon={RotateCcw} role="status">
                The evidence set, a passage in it, or your plan changed after you approved. Check the list and approve it again.
              </Notice>
            ) : null}
            {!planOk && (
              <Notice tone="warn">
                Your search plan is not approved for the current question.{" "}
                <button type="button" className="font-medium underline underline-offset-2" onClick={goToPlan}>
                  Approve the plan first
                </button>
              </Notice>
            )}
            <Button variant="primary" icon={Check} disabled={approved || !planOk || tooMany || tooLong} onClick={() => update((p) => approveEvidenceSet(p, new Date().toISOString()), `Approved an evidence set of ${chosen.length} passage(s).`)}>
              {approved ? "Evidence set approved" : "Approve evidence set"}
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
  const aiOn = status?.ai.configured ?? false;
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
      body: JSON.stringify({ question: project.question, evidence: evidenceInputs(project) }),
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
      <SectionTitle aside="One request, at most five short claims.">Draft claims</SectionTitle>
      {!setOk && <p className="mb-3 text-sm text-ink-soft">Approve the evidence set above to draft from it. You can write a claim yourself at any time.</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={Bot} disabled={!setOk || !aiOn || busy} title={!aiOn ? "Live AI is not configured on this server" : !setOk ? "Approve the evidence set first" : undefined} onClick={() => void draftLive()}>
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
      <p className="mt-2 max-w-prose text-xs text-ink-faint">
        {aiOn
          ? "The AI model sees only the approved passages. It may cite only those passages and cannot write references. Its answer is checked before anything is added."
          : "Live AI is not configured on this server. You can still write claims yourself and link them to passages."}
        {canSample && " The sample brief was written during development for this demo project and is not a live AI call. It is checked by the same rules as live output and stays labelled as a sample."}
      </p>

      <div aria-live="polite" className="mt-3">
        {report && (
          <Notice tone={report.tone} role={report.tone === "bad" ? "alert" : "status"}>
            {report.title}
            {report.rejected.length > 0 && (
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                {report.rejected.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            {report.offerChoices && (
              <span className="mt-2 flex flex-wrap gap-2">
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

function ClaimCard({ i, refs, active, onInspect }: { i: ClaimInspection; refs: References; active: boolean; onInspect: () => void }) {
  const { update } = useStore();
  const { claim, source } = i;
  const blocking = i.issues.filter((x) => x.code !== "claim_pending" && x.code !== "claim_stale");
  const rejected = claim.decision === "rejected";
  const inText = source ? (refs.byId.get(source.id)?.inText ?? inTextShort(source.cited.authors, source.cited.year)) : null;

  return (
    <li className={cx("relative border-b border-line py-4 pl-9 last:border-b-0", active && "bg-brand-tint/45", rejected && "opacity-60")}>
      <span aria-hidden className="absolute top-4 left-1 font-serif text-lg text-ink-faint">
        {i.number}
      </span>
      <p className={cx("max-w-prose font-serif text-[1.0625rem] leading-relaxed text-ink", rejected && "line-through decoration-ink-faint")}>
        {claim.text || <span className="text-ink-faint">No text yet. Open the claim to write it.</span>}{" "}
        {claim.kind === "evidence" && inText && (
          <button type="button" className="font-sans text-sm text-brand underline decoration-brand/40 underline-offset-2 hover:text-brand-deep" onClick={onInspect}>
            {inText}
          </button>
        )}
      </p>
      {claim.kind === "evidence" && claim.excerpt && <p className="mt-1.5 max-w-prose border-l-2 border-line-strong pl-3 font-serif text-sm leading-relaxed text-ink-soft">“{claim.excerpt.length > 220 ? `${claim.excerpt.slice(0, 220).trimEnd()}…` : claim.excerpt}”</p>}
      {claim.testCorruption && <p className="mt-2 max-w-prose rounded border border-bad/30 bg-bad-tint px-2.5 py-1.5 text-sm">{claim.testCorruption}</p>}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <StatusChip badge={originBadge(claim)} title={claim.origin === "live_ai" ? `Drafted by ${claim.model ?? "an AI model"}` : undefined} />
        {claim.kind === "inference" ? <Chip tone="neutral">Inference, no source passage</Chip> : <StatusChip badge={excerptBadge(i.excerpt)} />}
        {i.identity && i.identity.status !== "matched" && <StatusChip badge={IDENTITY[i.identity.status]} />}
        {i.evidence && <Chip tone="neutral">{i.evidence.scope === "abstract" ? "Abstract only" : "Pasted passage"}</Chip>}
        <StatusChip badge={DECISION[i.decision]} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
        {blocking.length > 0 && !rejected && <span className="text-xs text-bad">{blocking[0]?.message.replace(/^Claim \d+: /, "Needs attention: ")}</span>}
      </div>
    </li>
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

  return (
    <section>
      <SectionTitle aside={evaluation.counts.total ? evaluation.summary : undefined}>Review and export</SectionTitle>

      {evaluation.eligible ? (
        <Notice tone="ok" icon={Check} role="status">
          Every claim that is left has your approval, its excerpt is in the stored text, and no reference disagrees with Crossref. That is what a reviewed brief means here. It does not mean the sources are correct, or that each claim follows from its excerpt.
        </Notice>
      ) : (
        <div className="rounded border border-warn/30 bg-warn-tint px-3 py-2.5">
          <p className="text-sm font-medium text-ink">
            {evaluation.blockers.length} point{evaluation.blockers.length === 1 ? "" : "s"} to resolve before this can be exported as reviewed
          </p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {evaluation.blockers.map((b, n) => (
              <li key={n} className="flex flex-wrap items-baseline gap-x-2">
                <span>{b.message}</span>
                {b.claimId && (
                  <button type="button" className="font-medium text-brand underline underline-offset-2" onClick={() => onInspect(b.claimId as string)}>
                    Open claim
                  </button>
                )}
                {b.code === "plan_unapproved" && (
                  <button type="button" className="font-medium text-brand underline underline-offset-2" onClick={goToPlan}>
                    Go to the plan
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cited.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-1.5 text-[0.8125rem] font-semibold text-ink-soft">References (APA 7)</h3>
          {refs.state === "error" && (
            <Notice tone="bad" role="alert">
              The references could not be formatted. {refs.message} A reviewed brief needs formatted references; a draft can still be downloaded.
            </Notice>
          )}
          {refs.state !== "error" && refs.ordered.length === 0 && <p className="text-sm text-ink-faint">Formatting…</p>}
          <ul className="max-w-prose space-y-2 font-serif text-[0.9375rem] leading-relaxed">
            {refs.ordered.map((r) => (
              <li key={r.id} className="pl-6 -indent-6 break-words">
                <ReferenceText parts={r.parts} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant="primary" icon={Download} disabled={!canReview} title={!evaluation.eligible ? "Resolve the points listed above first" : !refsReady ? "Waiting for the references to be formatted" : undefined} onClick={() => download("reviewed")}>
          Download reviewed brief
        </Button>
        <Button icon={Download} disabled={project.claims.length === 0} onClick={() => download("draft")}>
          Download draft, marked as not reviewed
        </Button>
        <Button variant="ghost" icon={Eye} aria-expanded={preview} disabled={project.claims.length === 0} onClick={() => setPreview(!preview)}>
          {preview ? "Hide preview" : "Preview the file"}
        </Button>
      </div>
      <p className="mt-2 max-w-prose text-xs text-ink-faint">
        Both files are Markdown text with your brief, APA 7 references, source links, where each excerpt came from, limitations, and a disclosure of how AI was used. You remain responsible for what you submit. TRACE does not detect plagiarism and does not certify the work.
      </p>
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
      {previewResult?.ok && (
        <div className="mt-4">
          <p className="mb-1 text-xs text-ink-faint">
            Preview of {previewResult.filename}
            {!canReview && ". This is the draft version, because the review is not complete."}
          </p>
          <pre tabIndex={0} aria-label="Preview of the exported file" className="max-h-[28rem] overflow-auto rounded border border-line bg-surface p-4 text-xs leading-relaxed whitespace-pre-wrap text-ink">
            {previewResult.markdown}
          </pre>
        </div>
      )}
    </section>
  );
}

export function BriefStep({ inspectingId, onInspect, goToLibrary, goToPlan }: { inspectingId: string | null; onInspect: (id: string) => void; goToLibrary: () => void; goToPlan: () => void }) {
  const project = useProject();
  const evaluation = evaluateExport(project);
  const refs = useReferences(citedSources(project), "list");

  return (
    <div className="max-w-3xl space-y-10">
      <EvidenceSetPanel goToLibrary={goToLibrary} goToPlan={goToPlan} />
      <DraftPanel onInspect={onInspect} />
      <section>
        <SectionTitle aside={project.claims.length ? evaluation.summary : undefined}>Claims</SectionTitle>
        {project.claims.length === 0 ? (
          <Empty title="No claims yet">Draft from the approved evidence set, or write a claim yourself. Each claim is a short card you can inspect, edit, approve or reject.</Empty>
        ) : (
          <ol className="border-t border-line">
            {evaluation.inspections.map((i) => (
              <ClaimCard key={i.claim.id} i={i} refs={refs} active={inspectingId === i.claim.id} onInspect={() => onInspect(i.claim.id)} />
            ))}
          </ol>
        )}
      </section>
      <ExportPanel evaluation={evaluation} refs={refs} onInspect={onInspect} goToPlan={goToPlan} />
    </div>
  );
}
