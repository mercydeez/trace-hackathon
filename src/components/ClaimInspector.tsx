"use client";

import { Check, ExternalLink, RotateCcw, TextSelect, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sourceLink } from "@/lib/csl";
import type { ExcerptCheck } from "@/lib/excerpt";
import { inspectClaim, type ClaimInspection } from "@/lib/exportPolicy";
import { decideClaim, removeClaim, updateClaim } from "@/lib/mutations";
import { formatAuthorsShort } from "@/lib/text";
import { IdentityPanel } from "./IdentityPanel";
import { ACCESS, DECISION, excerptBadge, originBadge, StatusChip, SUPPORT_LABEL } from "./status";
import { useProject, useReferences, useStore } from "./store";
import { Button, Chip, ConfirmDialog, Field, Notice, ReferenceText, Select, shortDate, TextArea } from "./ui";

const PROVIDER = { crossref: "Crossref", openalex: "OpenAlex", user: "you" } as const;
const NOT_CHECKABLE = {
  no_evidence: "There is no stored source text to compare with.",
  no_excerpt: "No excerpt has been given yet.",
  too_short: "The excerpt is too short to be meaningful. Quote a longer run of words.",
} as const;

/** The stored passage, with the matched excerpt (or, on a mismatch, the closest real wording) marked. */
function Passage({ text, check, onSelection }: { text: string; check: ExcerptCheck; onSelection: (selected: string) => void }) {
  const box = useRef<HTMLParagraphElement>(null);
  const range = check.status === "matched" ? { start: check.start, end: check.end, cls: "match" } : check.status === "mismatch" && check.nearest ? { ...check.nearest, cls: "near" } : null;
  const anchor = range ? `${range.start}-${range.end}-${range.cls}` : "";

  useEffect(() => {
    // Bring the marked words into view inside the passage box only, without moving the panel around it.
    // Deferred one frame: inside a drawer, the dialog is not laid out until after this effect runs.
    const frame = requestAnimationFrame(() => {
      const el = box.current;
      const mark = el?.querySelector("mark");
      if (el && mark) el.scrollTop = Math.max(0, mark.offsetTop - 24);
    });
    return () => cancelAnimationFrame(frame);
  }, [anchor]);

  function readSelection() {
    const sel = window.getSelection();
    const inside = sel && sel.rangeCount > 0 && box.current?.contains(sel.anchorNode) && box.current.contains(sel.focusNode);
    onSelection(inside ? sel.toString().replace(/\s+/g, " ").trim() : "");
  }

  return (
    <p ref={box} tabIndex={0} aria-label="Stored source text" onMouseUp={readSelection} onKeyUp={readSelection} className="relative max-h-64 overflow-y-auto rounded border border-line bg-canvas/70 px-3.5 py-3 font-serif text-base leading-[1.7] whitespace-pre-line text-ink">
      {range ? (
        <>
          {text.slice(0, range.start)}
          <mark className={range.cls}>{text.slice(range.start, range.end)}</mark>
          {text.slice(range.end)}
        </>
      ) : (
        text
      )}
    </p>
  );
}

function Check5({ n, name, children }: { n: number; name: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1.25rem_1fr] gap-x-2 border-b border-line py-3 last:border-b-0">
      <span aria-hidden className="pt-px font-serif text-sm text-ink-faint">
        {n}
      </span>
      <div className="min-w-0">
        <h4 className="text-sm font-semibold">{name}</h4>
        <div className="mt-1.5 space-y-1.5 text-sm text-ink-soft">{children}</div>
      </div>
    </li>
  );
}

function Editor({ i }: { i: ClaimInspection }) {
  const project = useProject();
  const { update } = useStore();
  const { claim } = i;
  const options = project.evidence.filter((e) => project.evidenceSet.ids.includes(e.id) || e.id === claim.evidenceId);
  const label = (sourceId: string) => {
    const s = project.sources.find((x) => x.id === sourceId);
    return s ? formatAuthorsShort(s.cited.authors, s.cited.year) : "Source removed";
  };

  return (
    <div className="space-y-3">
      <Field label="Claim">{(id) => <TextArea id={id} rows={3} maxLength={600} className="font-serif text-base" value={claim.text} onChange={(e) => update((p) => updateClaim(p, claim.id, { text: e.target.value }))} />}</Field>
      <fieldset>
        <legend className="mb-1 text-[0.8125rem] font-medium">This claim</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="radio" className="accent-brand" name={`kind-${claim.id}`} checked={claim.kind === "evidence"} onChange={() => update((p) => updateClaim(p, claim.id, { kind: "evidence" }))} />
            quotes a stored passage
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" className="accent-brand" name={`kind-${claim.id}`} checked={claim.kind === "inference"} onChange={() => update((p) => updateClaim(p, claim.id, { kind: "inference" }))} />
            is my own inference, with no source
          </label>
        </div>
      </fieldset>
      {claim.kind === "evidence" && (
        <>
          <Field label="Passage it relies on" hint={options.length === 0 ? "No passages are in the evidence set. Add some in the Library." : undefined}>
            {(id) => (
              <Select id={id} value={claim.evidenceId ?? ""} onChange={(e) => update((p) => updateClaim(p, claim.id, { evidenceId: e.target.value || null }))}>
                <option value="">Choose a passage</option>
                {options.map((e) => (
                  <option key={e.id} value={e.id}>
                    {label(e.sourceId)}, {e.scope === "abstract" ? "abstract" : "pasted passage"}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Excerpt that supports it" hint="The exact words from the passage. Select them in the source text below, or paste them here.">
            {(id) => <TextArea id={id} rows={3} maxLength={600} className="font-serif" value={claim.excerpt} onChange={(e) => update((p) => updateClaim(p, claim.id, { excerpt: e.target.value }))} />}
          </Field>
        </>
      )}
      <Field label="Limits of this claim">{(id) => <TextArea id={id} rows={2} maxLength={600} value={claim.limitations} placeholder="What the passage does not establish." onChange={(e) => update((p) => updateClaim(p, claim.id, { limitations: e.target.value }))} />}</Field>
    </div>
  );
}

export function ClaimInspector({ claimId, onClose }: { claimId: string; onClose: () => void }) {
  const project = useProject();
  const { update } = useStore();
  const [selection, setSelection] = useState("");
  const [confirm, setConfirm] = useState(false);
  const claim = project.claims.find((c) => c.id === claimId);
  // The editing fields start open when there is something to fix or fill in, and closed when the claim is in order.
  const [editing, setEditing] = useState(() => {
    if (!claim) return false;
    const first = inspectClaim(project, claim);
    return !claim.text.trim() || (claim.kind === "evidence" && first.excerpt.status !== "matched");
  });
  const refs = useReferences(
    project.sources.filter((s) => s.id === project.evidence.find((e) => e.id === claim?.evidenceId)?.sourceId),
    "each",
  );

  if (!claim) {
    return (
      <div className="p-5">
        <p className="text-sm text-ink-soft">This claim is no longer in the brief.</p>
        <Button className="mt-3" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  const i = inspectClaim(project, claim);
  const { source, evidence, excerpt, decision } = i;
  const blocking = i.issues.filter((x) => x.code !== "claim_pending" && x.code !== "claim_stale");
  const reference = source ? refs.byId.get(source.id) : undefined;
  const link = source ? sourceLink(source.doi, source.cited) : null;

  return (
    <div className="flex flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 pt-4 pb-3">
        <div>
          <h2 className="font-serif text-xl font-medium">Claim {i.number}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusChip badge={originBadge(claim)} title={claim.origin === "live_ai" ? `Drafted by ${claim.model ?? "an AI model"}` : undefined} />
            <StatusChip badge={DECISION[decision]} />
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={X} onClick={onClose} className="max-[1199px]:hidden">
          Close
        </Button>
      </header>

      <div className="space-y-6 px-5 py-4">
        {claim.testCorruption && (
          <Notice tone="bad" role="note">
            {claim.testCorruption}
          </Notice>
        )}

        {evidence && claim.kind === "evidence" && (
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="font-serif text-lg font-medium">Source text</h3>
              <StatusChip badge={excerptBadge(excerpt)} />
            </div>
            <p className="mt-0.5 mb-2 text-xs text-ink-faint">
              {source ? formatAuthorsShort(source.cited.authors, source.cited.year) : "Source removed"}, {evidence.locator.toLowerCase()}. Stored exactly as retrieved.
              {excerpt.status === "matched" && " The excerpt is marked."}
              {excerpt.status === "mismatch" && excerpt.nearest && " The excerpt is not here; the closest real wording is marked."}
            </p>
            <Passage text={evidence.text} check={excerpt} onSelection={setSelection} />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                icon={TextSelect}
                disabled={selection.length < 12}
                onClick={() => {
                  update((p) => updateClaim(p, claim.id, { excerpt: selection }), `Replaced the excerpt of claim ${i.number} with words selected from the stored text.`);
                  setSelection("");
                  window.getSelection()?.removeAllRanges();
                }}
              >
                Use selected text as the excerpt
              </Button>
              <span className="text-xs text-ink-faint">{selection.length >= 12 ? `${selection.length} characters selected.` : "Select words in the source text to use them as the excerpt."}</span>
            </div>
          </section>
        )}

        <details open={editing} onToggle={(e) => setEditing(e.currentTarget.open)}>
          <summary className="font-serif text-lg font-medium">Edit this claim</summary>
          <div className="mt-3">
            <Editor i={i} />
          </div>
        </details>

        <section>
          <h3 className="font-serif text-lg font-medium">Five separate checks</h3>
          <p className="mt-0.5 text-xs text-ink-faint">Each answers a different question. None of them, alone or together, means “verified”.</p>
          <ol className="mt-1">
            <Check5 n={1} name="Reference identity">
              {source ? <IdentityPanel source={source} compact /> : <p>{claim.kind === "inference" ? "Not applicable: an inference cites no reference." : "No reference is linked to this claim."}</p>}
            </Check5>

            <Check5 n={2} name="Evidence access">
              <StatusChip badge={ACCESS[i.access]} />
              {evidence ? (
                <p>
                  {evidence.locator}, from {PROVIDER[evidence.provenance.provider]} on {shortDate(evidence.provenance.retrievedAt)}. {evidence.provenance.note}
                  {evidence.scope === "abstract" && " The full paper was not read by TRACE."}
                </p>
              ) : (
                <p>{claim.kind === "inference" ? "An inference has no source text behind it." : "There is no source text for this claim, so nothing can be checked."}</p>
              )}
            </Check5>

            <Check5 n={3} name="Excerpt integrity">
              {claim.kind === "inference" ? (
                <p>Not applicable: an inference quotes nothing.</p>
              ) : (
                <>
                  <StatusChip badge={excerptBadge(excerpt)} />
                  {excerpt.status === "matched" && <p>The excerpt appears word for word in the stored text, and is marked below. This shows the words are there. It does not show the paper is right, or that the claim follows from them.</p>}
                  {excerpt.status === "mismatch" && (
                    <p>
                      These words are not in the stored text. {excerpt.nearest ? "The closest wording that is there is marked below: compare it with the excerpt." : "Nothing close to them was found."} Correct the excerpt from the real passage, or reject the claim.
                    </p>
                  )}
                  {excerpt.status === "not_checkable" && <p>{NOT_CHECKABLE[excerpt.reason]}</p>}
                </>
              )}
            </Check5>

            <Check5 n={4} name="Support assessment">
              {claim.kind === "inference" ? (
                <p>None. An inference is your reasoning, and is labelled as such in the export.</p>
              ) : claim.support ? (
                <>
                  <Chip tone="neutral">
                    {claim.origin === "sample" ? "Sample suggests" : "AI suggests"}: the excerpt {SUPPORT_LABEL[claim.support]}
                  </Chip>
                  <p>
                    This is a suggestion from {claim.origin === "sample" ? "the sample brief" : "the language model"}, and it can be wrong. TRACE does not judge whether a claim follows from its excerpt. That is your call.
                    {claim.edited && " It was made for the original wording, before your edit."}
                  </p>
                </>
              ) : (
                <p>No AI assessment. You wrote this claim, so whether the excerpt supports it is your judgement.</p>
              )}
            </Check5>

            <Check5 n={5} name="Your decision">
              <StatusChip badge={DECISION[decision]} />
              {decision === "stale" && <p>The claim, its passage or the research question changed after you approved it. Read it again and decide.</p>}
              {blocking.length > 0 && decision !== "rejected" && (
                <ul className="list-disc space-y-0.5 pl-4 text-bad">
                  {blocking.map((b) => (
                    <li key={b.code}>{b.message.replace(/^Claim \d+: /, "Before approving: ")}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Check}
                  disabled={decision === "approved" || blocking.length > 0}
                  title={blocking.length > 0 ? "Resolve the points listed above first" : undefined}
                  onClick={() => update((p) => decideClaim(p, claim.id, "approved"), `Approved claim ${i.number}.`)}
                >
                  {decision === "stale" ? "Approve again" : "Approve claim"}
                </Button>
                <Button size="sm" icon={X} disabled={decision === "rejected"} onClick={() => update((p) => decideClaim(p, claim.id, "rejected"), `Rejected claim ${i.number}.`)}>
                  Reject claim
                </Button>
                {claim.decision !== "pending" && (
                  <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => update((p) => decideClaim(p, claim.id, "pending"), `Reopened claim ${i.number}.`)}>
                    Undo decision
                  </Button>
                )}
              </div>
            </Check5>
          </ol>
        </section>

        {source && (
          <section>
            <h3 className="font-serif text-lg font-medium">Reference</h3>
            <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed break-words">
              {reference ? <ReferenceText parts={reference.parts} /> : <span className="text-ink-faint">{refs.state === "error" ? "Could not format this reference." : "Formatting…"}</span>}
            </p>
            {link && (
              <a href={link} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-sm break-all text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink">
                Open the source <ExternalLink aria-hidden className="size-3.5 shrink-0" />
              </a>
            )}
          </section>
        )}

        <div className="border-t border-line pt-4">
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>
            Delete this claim
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Delete this claim?"
        confirmLabel="Delete claim"
        danger
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          update((p) => removeClaim(p, claim.id), `Deleted claim ${i.number}.`);
          onClose();
        }}
      >
        The claim is removed from the brief. To keep a record that you considered it, reject it instead.
      </ConfirmDialog>
    </div>
  );
}
