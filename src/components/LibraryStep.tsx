"use client";

import { ChevronDown, ChevronRight, ClipboardCopy, ExternalLink, ListChecks, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { callApi, type AbstractResult, type FormattedReference } from "@/lib/api";
import { missingForApa, sourceLink } from "@/lib/csl";
import { sourceIdentity } from "@/lib/identity";
import { abstractEvidence, addEvidence, pastedEvidence, removeEvidence, removeSource, setNote, setTags, toggleEvidence } from "@/lib/mutations";
import { formatAuthorsShort } from "@/lib/text";
import type { Evidence, Source } from "@/lib/types";
import { IdentityPanel } from "./IdentityPanel";
import { ACCESS, IDENTITY, StatusChip } from "./status";
import { useProject, useReferences, useStore, type References } from "./store";
import { Button, Chip, ConfirmDialog, Empty, Field, Notice, ReferenceText, SectionTitle, Select, shortDate, TextArea, TextInput } from "./ui";

const PROVIDER = { crossref: "Crossref", openalex: "OpenAlex", user: "you" } as const;

/** How each source entered the library, shown with the source so its provenance is never a guess. */
const ORIGIN: Record<Source["origin"], string> = {
  crossref_search: "Saved from a Crossref search",
  doi_lookup: "Added by looking up its DOI in Crossref",
  citation_check: "Added by DOI, with the details kept as they were given",
  manual: "Entered by hand",
  demo_fixture: "Saved from Crossref with the demo project",
};

function EvidenceBlock({ evidence }: { evidence: Evidence }) {
  const project = useProject();
  const { update } = useStore();
  const [all, setAll] = useState(false);
  const selected = project.evidenceSet.ids.includes(evidence.id);
  const long = evidence.text.length > 420;
  const cited = project.claims.filter((c) => c.evidenceId === evidence.id).length;

  return (
    <div className="rounded border border-line bg-canvas/60 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StatusChip badge={ACCESS[evidence.scope]} />
        <span className="text-xs text-ink-faint">
          {evidence.locator}, from {PROVIDER[evidence.provenance.provider]} on {shortDate(evidence.provenance.retrievedAt)}
        </span>
      </div>
      {evidence.provenance.note && <p className="mt-1 text-xs text-ink-faint">{evidence.provenance.note}</p>}
      <p className="mt-2 max-w-prose font-serif text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink">{all || !long ? evidence.text : `${evidence.text.slice(0, 420).trimEnd()}…`}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-brand" checked={selected} onChange={() => update((p) => toggleEvidence(p, evidence.id), selected ? "Removed a passage from the evidence set." : "Added a passage to the evidence set.")} />
          Use in the evidence set
        </label>
        {long && (
          <button type="button" className="text-sm text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink" aria-expanded={all} onClick={() => setAll(!all)}>
            {all ? "Show less" : `Show all ${evidence.text.length.toLocaleString("en-GB")} characters`}
          </button>
        )}
        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => update((p) => removeEvidence(p, evidence.id), "Removed a source passage.")}>
          Remove passage
        </Button>
        {cited > 0 && <span className="text-xs text-warn">{cited} claim{cited === 1 ? "" : "s"} cite this passage and would need attention if it is removed.</span>}
      </div>
    </div>
  );
}

function AddEvidence({ source, hasAbstract }: { source: Source; hasAbstract: boolean }) {
  const { update } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [locator, setLocator] = useState("");

  async function openAlex() {
    if (!source.doi) return;
    setBusy(true);
    setMessage(null);
    const outcome = await callApi<AbstractResult>(`/api/abstract?doi=${encodeURIComponent(source.doi)}`);
    setBusy(false);
    if (outcome.ok) {
      const ev = abstractEvidence(source.id, outcome.data.text, "openalex", outcome.data.retrievedAt, outcome.data.url);
      update((p) => addEvidence(p, ev), `Added an abstract for “${source.cited.title}” from OpenAlex.`);
      setMessage("Abstract added from OpenAlex.");
    } else {
      setMessage(outcome.kind === "not_found" ? `${outcome.message} This source stays metadata-only.` : `Could not check OpenAlex. ${outcome.message}`);
    }
  }

  return (
    <div className="space-y-3">
      {source.doi && !hasAbstract && (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" icon={Search} disabled={busy} onClick={() => void openAlex()}>
            {busy ? "Asking OpenAlex…" : "Look for an abstract in OpenAlex"}
          </Button>
          {message && (
            <span role="status" className="text-sm text-ink-soft">
              {message}
            </span>
          )}
        </div>
      )}
      <details className="text-sm">
        <summary className="font-medium text-ink-soft">Paste a passage from this source</summary>
        <form
          className="mt-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const ev = pastedEvidence(source.id, text.trim(), locator, new Date().toISOString());
            update((p) => addEvidence(p, ev), `Pasted a passage for “${source.cited.title}”.`);
            setText("");
            setLocator("");
          }}
        >
          <Field label="Passage" hint="Copy the exact words from the source. TRACE stores them as given and cannot confirm they come from the publication.">
            {(id) => <TextArea id={id} rows={4} value={text} maxLength={6000} onChange={(e) => setText(e.target.value)} />}
          </Field>
          <Field label="Where in the source (optional)" hint="For example: p. 12, or Results, paragraph 2. Leave blank if you do not know; TRACE never invents a page number.">
            {(id) => <TextInput id={id} value={locator} maxLength={80} onChange={(e) => setLocator(e.target.value)} />}
          </Field>
          <Button type="submit" size="sm" disabled={text.trim().length < 40}>
            Save passage
          </Button>
          {text.trim().length > 0 && text.trim().length < 40 && <span className="ml-2 text-xs text-ink-faint">A passage needs at least 40 characters.</span>}
        </form>
      </details>
    </div>
  );
}

function SourceCard({ source, open, onToggle, reference, refs }: { source: Source; open: boolean; onToggle: () => void; reference: FormattedReference | undefined; refs: References }) {
  const project = useProject();
  const { update } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tag, setTag] = useState("");
  const evidence = project.evidence.filter((e) => e.sourceId === source.id);
  const identity = sourceIdentity(source);
  const missing = missingForApa(source.cited, source.doi);
  const link = sourceLink(source.doi, source.cited);
  const inSet = evidence.filter((e) => project.evidenceSet.ids.includes(e.id)).length;
  const access = evidence.some((e) => e.scope === "abstract") ? "abstract" : evidence.length ? "user_pasted" : "none";
  const Caret = open ? ChevronDown : ChevronRight;

  return (
    <li className="border-b border-line last:border-b-0">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-start gap-2 py-3 text-left hover:bg-ink/[0.025]">
        <Caret aria-hidden className="mt-1 size-4 shrink-0 text-ink-faint" />
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[1.0625rem] leading-snug font-medium text-ink">{source.cited.title || "Untitled reference"}</span>
          <span className="mt-0.5 block text-sm text-ink-soft">
            {formatAuthorsShort(source.cited.authors, source.cited.year)}
            {source.cited.container && `, ${source.cited.container}`}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusChip badge={IDENTITY[identity.status]} />
            <StatusChip badge={ACCESS[access]} />
            {inSet > 0 && (
              <Chip tone="ok" icon={ListChecks}>
                In evidence set
              </Chip>
            )}
            {source.tags.map((t) => (
              <span key={t} className="rounded-sm bg-ink/[0.06] px-1.5 py-0.5 text-xs text-ink-soft">
                {t}
              </span>
            ))}
          </span>
        </span>
      </button>

      {open && (
        <div className="mb-4 ml-6 space-y-6 border-l-2 border-line pb-1 pl-4">
          <section>
            <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-ink-soft">Reference (APA 7)</h4>
            {reference ? (
              <p className="max-w-prose font-serif text-[0.9375rem] leading-relaxed break-words">
                <ReferenceText parts={reference.parts} />
              </p>
            ) : (
              <p className="text-sm text-ink-faint">{refs.state === "error" ? `Could not format this reference. ${refs.message ?? ""}` : "Formatting…"}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                icon={ClipboardCopy}
                disabled={!reference}
                onClick={() => {
                  if (!reference) return;
                  void navigator.clipboard?.writeText(reference.text).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  });
                }}
              >
                {copied ? "Copied" : "Copy reference"}
              </Button>
              {link && (
                <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm break-all text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-ink">
                  Open the source <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                </a>
              )}
            </div>
            {missing.length > 0 && (
              <Notice tone="warn" className="mt-2">
                This reference is missing: {missing.join(", ")}. TRACE does not guess missing details. Add them under “Edit the details you cite”.
              </Notice>
            )}
            <p className="mt-2 text-xs text-ink-faint">Built from the stored details by Citation.js, not written by AI. Titles keep the registry&rsquo;s capitalisation; APA 7 asks for sentence case.</p>
          </section>

          <section>
            <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-ink-soft">Reference identity</h4>
            <p className="mb-2 text-xs text-ink-faint">
              {ORIGIN[source.origin]} on {shortDate(source.addedAt)}.
            </p>
            <IdentityPanel source={source} />
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-ink-soft">Tags</h4>
              <ul className="flex flex-wrap gap-1.5">
                {source.tags.map((t) => (
                  <li key={t} className="inline-flex items-center gap-1 rounded-sm bg-ink/[0.06] py-0.5 pr-0.5 pl-1.5 text-xs">
                    {t}
                    <button type="button" aria-label={`Remove tag ${t}`} className="rounded-sm px-1 text-ink-faint hover:bg-ink/10 hover:text-ink" onClick={() => update((p) => setTags(p, source.id, source.tags.filter((x) => x !== t)))}>
                      ×
                    </button>
                  </li>
                ))}
                {source.tags.length === 0 && <li className="text-sm text-ink-faint">No tags.</li>}
              </ul>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (tag.trim()) update((p) => setTags(p, source.id, [...source.tags, tag]));
                  setTag("");
                }}
              >
                <TextInput aria-label={`Add a tag to ${source.cited.title}`} placeholder="Add a tag" value={tag} maxLength={30} onChange={(e) => setTag(e.target.value)} />
                <Button type="submit" size="sm" disabled={!tag.trim()}>
                  Add tag
                </Button>
              </form>
            </div>
            <Field label="Note" hint="Your own note. It is not sent to any AI provider.">
              {(id) => <TextArea id={id} rows={3} key={source.id} defaultValue={source.note} maxLength={2000} onBlur={(e) => e.target.value !== source.note && update((p) => setNote(p, source.id, e.target.value), "Edited a source note.")} />}
            </Field>
          </section>

          <section>
            <h4 className="mb-1.5 text-[0.8125rem] font-semibold text-ink-soft">Source text</h4>
            {evidence.length === 0 && (
              <Notice tone="warn" className="mb-3">
                There is no source text for this reference, so TRACE will not summarise it or let a claim quote it. You can keep it as a reference only, or add text below.
              </Notice>
            )}
            <div className="space-y-3">
              {evidence.map((e) => (
                <EvidenceBlock key={e.id} evidence={e} />
              ))}
              <AddEvidence source={source} hasAbstract={evidence.some((e) => e.scope === "abstract")} />
            </div>
          </section>

          <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>
            Delete this source
          </Button>
          <ConfirmDialog open={confirm} title="Delete this source?" confirmLabel="Delete source" danger onClose={() => setConfirm(false)} onConfirm={() => update((p) => removeSource(p, source.id), `Deleted “${source.cited.title}” from the library.`)}>
            “{source.cited.title}” and its stored text will be removed from this project. Claims that cite it stay in the brief and will be flagged for your attention.
          </ConfirmDialog>
        </div>
      )}
    </li>
  );
}

export function LibraryStep({ goToDiscover, goToBrief }: { goToDiscover: () => void; goToBrief: () => void }) {
  const project = useProject();
  const refs = useReferences(project.sources, "each");
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [tag, setTag] = useState("");
  const [withText, setWithText] = useState(false);

  const tags = useMemo(() => [...new Set(project.sources.flatMap((s) => s.tags))].sort(), [project.sources]);
  const shown = project.sources.filter((s) => {
    if (tag && !s.tags.includes(tag)) return false;
    if (withText && !project.evidence.some((e) => e.sourceId === s.id)) return false;
    const q = text.trim().toLowerCase();
    if (!q) return true;
    return [s.cited.title, s.cited.container ?? "", s.note, s.doi ?? "", ...s.tags, ...s.cited.authors.map((a) => a.family)].join(" ").toLowerCase().includes(q);
  });
  const selected = project.evidenceSet.ids.length;

  if (project.sources.length === 0) {
    return (
      <div className="max-w-3xl">
        <SectionTitle>Your library</SectionTitle>
        <Empty title="No sources saved yet">
          Search Crossref or add a source by DOI, and it will appear here with its details, tags, notes and any source text.
          <div className="mt-3">
            <Button variant="primary" onClick={goToDiscover}>
              Find sources
            </Button>
          </div>
        </Empty>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <SectionTitle aside={`${shown.length} of ${project.sources.length} source${project.sources.length === 1 ? "" : "s"} shown`}>Your library</SectionTitle>
      <div className="mb-2 flex flex-wrap items-end gap-3">
        <Field label="Filter" className="min-w-0 flex-1 basis-56">
          {(id) => <TextInput id={id} type="search" placeholder="Title, author, tag or note" value={text} onChange={(e) => setText(e.target.value)} />}
        </Field>
        <Field label="Tag" className="w-44">
          {(id) => (
            <Select id={id} value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <label className="inline-flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-brand" checked={withText} onChange={(e) => setWithText(e.target.checked)} />
          Only with source text
        </label>
      </div>

      {shown.length === 0 ? (
        <Empty title="No source matches these filters">Clear the filter, or pick another tag.</Empty>
      ) : (
        <ul className="border-t border-line">
          {shown.map((s) => (
            <SourceCard key={s.id} source={s} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} reference={refs.byId.get(s.id)} refs={refs} />
          ))}
        </ul>
      )}

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line-strong bg-canvas py-3">
        <p className="text-sm text-ink-soft">
          {selected === 0 ? "No passages chosen for the evidence set yet. Open a source and tick “Use in the evidence set”." : `${selected} passage${selected === 1 ? "" : "s"} chosen for the evidence set.`}
        </p>
        <Button variant="primary" icon={ListChecks} disabled={selected === 0} onClick={goToBrief}>
          Review evidence set
        </Button>
      </div>
    </div>
  );
}
