"use client";

import { Check, ExternalLink, Plus, RotateCcw, TextSelect, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { sourceLink } from "@/lib/csl";
import type { ExcerptCheck } from "@/lib/excerpt";
import { inspectClaim, type ClaimInspection } from "@/lib/exportPolicy";
import { sourceIdentity } from "@/lib/identity";
import { decideClaim, removeClaim, setSecondPassage, updateClaim } from "@/lib/mutations";
import { formatAuthorsShort } from "@/lib/text";
import { IdentityPanel } from "./IdentityPanel";
import type { Evidence, Project, Source } from "@/lib/types";
import { ACCESS, DECISION, excerptBadge, originBadge, StatusChip, SUPPORT_LABEL, trustBadge } from "./status";
import { useProject, useReferences, useStore } from "./store";
import { Button, Chip, ConfirmDialog, Field, Notice, ReferenceText, Select, shortDate, TextArea } from "./ui";

const PROVIDER = { crossref: "Crossref", openalex: "OpenAlex", user: "you" } as const;
const NOT_CHECKABLE = {
  no_evidence: "There is no stored source text to compare with.",
  no_excerpt: "No excerpt has been given yet.",
  too_short: "The excerpt is too short to be meaningful. Quote a longer run of words.",
} as const;

/** The stored passage, with the matched excerpt (or, on a mismatch, the closest real wording) marked. */
function Passage({ text, check, onSelection, follow = true }: { text: string; check: ExcerptCheck; onSelection: (selected: string) => void; follow?: boolean }) {
  const box = useRef<HTMLParagraphElement>(null);
  const range = check.status === "matched" ? { start: check.start, end: check.end, cls: "match" } : check.status === "mismatch" && check.nearest ? { ...check.nearest, cls: "near" } : null;
  const anchor = range ? `${range.start}-${range.end}-${range.cls}` : "";

  useEffect(() => {
    // Bring the marked words into view by scrolling the inspector panel itself (never the page behind it).
    // Deferred one frame: inside a drawer, the dialog is not laid out until after this effect runs.
    const frame = requestAnimationFrame(() => {
      const mark = follow ? box.current?.querySelector("mark") : null;
      const panel = box.current?.closest("aside, dialog");
      if (!mark || !panel) return;
      const offset = mark.getBoundingClientRect().top - panel.getBoundingClientRect().top;
      if (offset > panel.clientHeight * 0.6) panel.scrollTop += offset - panel.clientHeight * 0.4;
    });
    return () => cancelAnimationFrame(frame);
  }, [anchor, follow]);

  function readSelection() {
    const sel = window.getSelection();
    const inside = sel && sel.rangeCount > 0 && box.current?.contains(sel.anchorNode) && box.current.contains(sel.focusNode);
    onSelection(inside ? sel.toString().replace(/\s+/g, " ").trim() : "");
  }

  return (
    <p ref={box} tabIndex={0} aria-label="Stored source text" onMouseUp={readSelection} onKeyUp={readSelection} className="relative rounded-lg bg-s2 p-4 text-base leading-[1.7] whitespace-pre-line text-ink">
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
    <li className="grid grid-cols-[1.5rem_1fr] gap-x-2 border-b border-line py-4 last:border-b-0">
      <span aria-hidden className="text-sm font-semibold text-ink-faint">
        {n}
      </span>
      <div className="min-w-0">
        <h4 className="text-sm font-semibold">{name}</h4>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">{children}</div>
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
      <Field label="Claim">{(id) => <TextArea id={id} rows={3} maxLength={600} value={claim.text} onChange={(e) => update((p) => updateClaim(p, claim.id, { text: e.target.value }))} />}</Field>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">This claim</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="radio" className="accent-[#c9559f]" name={`kind-${claim.id}`} checked={claim.kind === "evidence"} onChange={() => update((p) => updateClaim(p, claim.id, { kind: "evidence" }))} />
            quotes a stored passage
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" className="accent-[#c9559f]" name={`kind-${claim.id}`} checked={claim.kind === "inference"} onChange={() => update((p) => updateClaim(p, claim.id, { kind: "inference" }))} />
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
            {(id) => <TextArea id={id} rows={3} maxLength={600} className="font-reading" value={claim.excerpt} onChange={(e) => update((p) => updateClaim(p, claim.id, { excerpt: e.target.value }))} />}
          </Field>
        </>
      )}
      <Field label="Limits of this claim">{(id) => <TextArea id={id} rows={2} maxLength={600} value={claim.limitations} placeholder="What the passage does not establish." onChange={(e) => update((p) => updateClaim(p, claim.id, { limitations: e.target.value }))} />}</Field>
    </div>
  );
}

const ROLE = {
  qualifies: { label: "Qualifies", hint: "limits where or when the claim applies" },
  challenges: { label: "Challenges", hint: "points against the claim" },
} as const;

const shortSource = (project: Project, sourceId: string) => {
  const s = project.sources.find((x) => x.id === sourceId);
  return s ? formatAuthorsShort(s.cited.authors, s.cited.year) : "Source removed";
};

/** One passage in the side-by-side view: its source, where the text came from, the excerpt and its checks. */
function PassageCard({ heading, note, source, evidence, check, quote }: { heading: string; note: string; source: Source | null; evidence: Evidence | null; check: ExcerptCheck; quote: string }) {
  const identity = source ? sourceIdentity(source) : null;
  return (
    <div className="min-w-0 rounded-lg border border-line bg-s2/60 p-3 text-sm">
      <p className="font-bold text-ink">{heading}</p>
      <p className="text-xs text-ink-soft">{note}</p>
      <p className="mt-2 font-semibold break-words text-ink">{source ? formatAuthorsShort(source.cited.authors, source.cited.year) : "No source"}</p>
      <p className="text-ink-soft">{evidence ? `${evidence.locator}, ${evidence.provenance.provider === "user" ? "pasted by you" : `from ${PROVIDER[evidence.provenance.provider]}`}` : "No stored passage"}</p>
      {/* The cards are narrow beside each other, so a chip's label wraps instead of spilling out of its card. */}
      <div className="mt-2 flex flex-wrap gap-1.5 [&>span]:h-auto [&>span]:min-h-6 [&>span]:py-0.5 [&>span]:whitespace-normal">
        {identity && <StatusChip badge={trustBadge(identity)} />}
        <StatusChip badge={excerptBadge(check)} />
      </div>
      <p className="mt-2 font-reading break-words text-ink">{quote.trim() ? `“${quote.trim()}”` : <span className="text-ink-faint">No excerpt yet.</span>}</p>
    </div>
  );
}

/**
 * The student's optional second passage: one that qualifies the claim or challenges it. The label is the
 * student's judgement; TRACE checks the quote and the reference exactly as it does for the supporting passage.
 */
function SecondPassageSection({ i }: { i: ClaimInspection }) {
  const project = useProject();
  const { update } = useStore();
  const [selection, setSelection] = useState("");
  const { claim, second } = i;
  if (claim.kind !== "evidence") return null;

  if (!claim.second || !second) {
    return (
      <section>
        <h3 className="text-base font-bold">Qualifying or challenging passage</h3>
        <p className="mt-1 mb-3 text-sm text-ink-soft">Optional. Attach a passage from a saved source that limits this claim or points against it. You choose the label, and TRACE checks the quote.</p>
        <Button size="sm" icon={Plus} onClick={() => update((p) => setSecondPassage(p, claim.id, {}), `Added a qualifying or challenging passage to claim ${i.number}.`)}>
          Add qualifying or challenging passage
        </Button>
      </section>
    );
  }

  const current = claim.second;
  const options = project.evidence.filter((e) => project.evidenceSet.ids.includes(e.id) || e.id === current.evidenceId);
  const name = ROLE[current.role].label;

  return (
    <section aria-label="Supporting and second passages">
      <h3 className="text-base font-bold">Supporting and {second.noun} passages</h3>
      <p className="mt-1 mb-3 text-sm text-ink-soft">“{name}” is your judgement, not a TRACE check. TRACE checks only that each excerpt is in its stored text and that each reference matches its registry record.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <PassageCard heading="Supports" note="The passage the claim relies on" source={i.source} evidence={i.evidence} check={i.excerpt} quote={claim.excerpt} />
        <PassageCard heading={name} note={`Your judgement: it ${ROLE[current.role].hint}`} source={second.source} evidence={second.evidence} check={second.excerpt} quote={current.excerpt} />
      </div>

      <div className="mt-4 space-y-3">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Your label for this passage</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {(["qualifies", "challenges"] as const).map((role) => (
              <label key={role} className="inline-flex items-center gap-2">
                <input type="radio" className="accent-[#c9559f]" name={`role-${claim.id}`} checked={current.role === role} onChange={() => update((p) => setSecondPassage(p, claim.id, { role }), `Labelled the second passage of claim ${i.number} “${ROLE[role].label}”.`)} />
                {ROLE[role].label}: {ROLE[role].hint}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={`${name} passage`} hint={options.length === 0 ? "No passages are in the evidence set. Add some in the Library." : undefined}>
          {(id) => (
            <Select id={id} value={current.evidenceId ?? ""} onChange={(e) => update((p) => setSecondPassage(p, claim.id, { evidenceId: e.target.value || null }))}>
              <option value="">Choose a passage</option>
              {options.map((e) => (
                <option key={e.id} value={e.id}>
                  {shortSource(project, e.sourceId)}, {e.scope === "abstract" ? "abstract" : "pasted passage"}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={`Excerpt that ${current.role === "qualifies" ? "qualifies" : "challenges"} the claim`} hint="The exact words from the passage. Select them in the source text below, or paste them here.">
          {(id) => <TextArea id={id} rows={3} maxLength={600} className="font-reading" value={current.excerpt} onChange={(e) => update((p) => setSecondPassage(p, claim.id, { excerpt: e.target.value }))} />}
        </Field>
        {second.evidence && (
          <>
            <Passage text={second.evidence.text} check={second.excerpt} onSelection={setSelection} follow={false} />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                icon={TextSelect}
                disabled={selection.length < 12}
                onClick={() => {
                  update((p) => setSecondPassage(p, claim.id, { excerpt: selection }), `Set the ${second.noun} excerpt of claim ${i.number} from the stored text.`);
                  setSelection("");
                  window.getSelection()?.removeAllRanges();
                }}
              >
                Use selected text as this excerpt
              </Button>
            </div>
          </>
        )}
        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => update((p) => setSecondPassage(p, claim.id, null), `Removed the ${second.noun} passage from claim ${i.number}.`)}>
          Remove {second.noun} passage
        </Button>
      </div>
    </section>
  );
}

const wordKey = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * The quote as cited beside the closest real sentence, with the cited words the source does not contain
 * highlighted (for example "month" where the source says "week"). A reading aid only: the decision comes
 * from the excerpt check, not from this word comparison.
 */
function QuoteComparison({ quote, text, nearest }: { quote: string; text: string; nearest: { start: number; end: number } }) {
  // Widen the closest shared stretch to its whole sentence, so the real wording reads naturally.
  const start = Math.max(0, text.lastIndexOf(".", nearest.start - 1) + 1);
  const stop = text.indexOf(".", nearest.end);
  const sentence = text.slice(start, stop === -1 ? text.length : stop + 1).trim();
  const real = new Set(sentence.split(/\s+/).map(wordKey));
  return (
    <div className="mb-3 space-y-2 rounded-lg border border-bad/30 p-3 text-sm">
      <p>
        <span className="font-semibold text-ink">Quoted in the claim: </span>
        <span>
          “
          {quote.split(/(\s+)/).map((w, n) =>
            /\s+/.test(w) || !wordKey(w) || real.has(wordKey(w)) ? w : (
              <mark key={n} className="rounded bg-bad-tint px-0.5 font-semibold text-bad">
                {w}
              </mark>
            ),
          )}
          ”
        </span>
      </p>
      <p>
        <span className="font-semibold text-ink">Closest wording in the source: </span>“{sentence}”
      </p>
    </div>
  );
}

export function ClaimInspector({ claimId, onClose }: { claimId: string; onClose: () => void }) {
  const project = useProject();
  const { update } = useStore();
  const [selection, setSelection] = useState("");
  const [confirm, setConfirm] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const claim = project.claims.find((c) => c.id === claimId);

  // Each claim opens at the top of the panel, wherever the previous one was scrolled to.
  useEffect(() => {
    root.current?.closest("aside, dialog")?.scrollTo({ top: 0 });
  }, []);
  // The editing fields start open when there is something to fix or fill in, and closed when the claim is in order.
  const [editing, setEditing] = useState(() => {
    if (!claim) return false;
    const first = inspectClaim(project, claim);
    return !claim.text.trim() || (claim.kind === "evidence" && first.excerpt.status !== "matched");
  });
  const refs = useReferences(
    project.sources.filter((s) => s.id === project.evidence.find((e) => e.id === claim?.evidenceId)?.sourceId),
    "each",
    project.citationStyle,
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
    // Opening a claim slides the inspector content in a few pixels, so the eye lands on the new evidence.
    <motion.div ref={root} className="flex flex-col" initial={{ opacity: 0.4, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-6 pt-4 pb-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-[-0.02em]">Claim {i.number}</h2>
          <Button variant="ghost" size="sm" icon={X} onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusChip badge={originBadge(claim)} title={claim.origin === "live_ai" ? `Drafted by ${claim.model ?? "an AI model"}` : undefined} />
          <StatusChip badge={DECISION[decision]} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={Check}
            disabled={decision === "approved" || blocking.length > 0}
            title={blocking.length > 0 ? "Resolve the open points first" : undefined}
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
        {blocking.length > 0 && decision !== "rejected" && (
          <div className="mt-3 rounded-lg bg-bad-tint px-3 py-2" role="note" aria-label="Why the reviewed export is blocked">
            <p className="text-xs font-semibold tracking-wide text-bad uppercase">Blocks the reviewed export</p>
            <ul className="mt-1 space-y-1 text-sm text-ink">
              {blocking.map((b) => (
                <li key={`${b.code}-${b.message}`}>{b.message.replace(/^Claim \d+: /, decision === "approved" ? "Still open: " : "Before approving: ")}</li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <div className="space-y-8 px-6 py-6">
        {claim.testCorruption && (
          <Notice tone="bad" role="note">
            {claim.testCorruption}
          </Notice>
        )}

        {evidence && claim.kind === "evidence" && (
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="text-base font-bold">Source text</h3>
              <StatusChip badge={excerptBadge(excerpt)} />
            </div>
            <p className="mt-1 mb-3 text-sm text-ink-soft">
              {source ? formatAuthorsShort(source.cited.authors, source.cited.year) : "Source removed"}, {evidence.locator.toLowerCase()}. Stored exactly as retrieved.
              {excerpt.status === "matched" && " The excerpt is marked."}
              {excerpt.status === "mismatch" && excerpt.nearest && " The excerpt is not here; the closest real wording is marked."}
            </p>
            {excerpt.status === "mismatch" && excerpt.nearest && <QuoteComparison quote={claim.excerpt} text={evidence.text} nearest={excerpt.nearest} />}
            <Passage text={evidence.text} check={excerpt} onSelection={setSelection} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
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
              <span className="text-sm text-ink-soft">{selection.length >= 12 ? `${selection.length} characters selected.` : "Select words in the source text to use them as the excerpt."}</span>
            </div>
          </section>
        )}

        <SecondPassageSection i={i} />

        <details open={editing} onToggle={(e) => setEditing(e.currentTarget.open)}>
          <summary className="text-base font-bold">Edit this claim</summary>
          <div className="mt-4">
            <Editor i={i} />
          </div>
        </details>

        <section>
          <h3 className="text-base font-bold">Five separate checks</h3>
          <p className="mt-1 text-sm text-ink-soft">Each answers a different question. None of them, alone or together, means “verified”.</p>
          <ol className="mt-2">
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
                  {i.details.length > 0 ? (
                    <div className="rounded-lg bg-bad-tint px-3 py-2 text-ink">
                      <p className="font-semibold text-bad">Details in the claim that the excerpt does not contain</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {i.details.map((d, n) => (
                          <li key={n}>{d.message}</li>
                        ))}
                      </ul>
                      <p className="mt-1 text-ink-soft">Change the claim to match the excerpt, quote the passage that states it, or mark the claim as your own inference.</p>
                    </div>
                  ) : (
                    claim.excerpt.trim() && <p>Every number and negation in the claim also appears in the excerpt.</p>
                  )}
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
              <p>Approve or reject with the buttons at the top of this panel. Only you can approve a claim.</p>
            </Check5>
          </ol>
        </section>

        {source && (
          <section>
            <h3 className="text-base font-bold">Reference</h3>
            <p className="mt-2 text-base leading-relaxed break-words">
              {reference ? <ReferenceText parts={reference.parts} /> : <span className="text-ink-faint">{refs.state === "error" ? "Could not format this reference." : "Formatting…"}</span>}
            </p>
            {link && (
              <a href={link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold break-all text-accent-text underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
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
    </motion.div>
  );
}
