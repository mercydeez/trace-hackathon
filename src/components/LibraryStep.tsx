"use client";

import { ClipboardCopy, ExternalLink, ListChecks, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { callApi, type AbstractResult, type FormattedReference } from "@/lib/api";
import { missingForApa, sourceLink } from "@/lib/csl";
import { sourceIdentity } from "@/lib/identity";
import { abstractEvidence, addEvidence, pastedEvidence, removeEvidence, removeSource, setNote, setTags, toggleEvidence } from "@/lib/mutations";
import { formatAuthorsShort } from "@/lib/text";
import type { Evidence, Source } from "@/lib/types";
import { IdentityPanel } from "./IdentityPanel";
import { ACCESS, IDENTITY, RETRACTED, StatusChip } from "./status";
import { useProject, useReferences, useStore, type References } from "./store";
import { Button, Chip, ConfirmDialog, cx, Empty, Field, Notice, ReferenceText, SectionTitle, Select, shortDate, TextArea, TextInput, useMediaQuery } from "./ui";

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
  const long = evidence.text.length > 480;
  const cited = project.claims.filter((c) => c.evidenceId === evidence.id).length;

  return (
    <div className={cx("rounded-lg border p-4 transition-colors", selected ? "border-ok/30 bg-ok-tint/40" : "border-line bg-s2/60")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" className="size-4 accent-[#4b3653]" checked={selected} onChange={() => update((p) => toggleEvidence(p, evidence.id), selected ? "Removed a passage from the evidence set." : "Added a passage to the evidence set.")} />
          Use in the evidence set
        </label>
        <StatusChip badge={ACCESS[evidence.scope]} />
      </div>
      <p className="mt-3 max-w-prose text-base leading-relaxed whitespace-pre-line text-ink">{all || !long ? evidence.text : `${evidence.text.slice(0, 480).trimEnd()}…`}</p>
      <p className="mt-3 text-sm text-ink-soft">
        {evidence.locator}, from {PROVIDER[evidence.provenance.provider]} on {shortDate(evidence.provenance.retrievedAt)}. {evidence.provenance.note}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {long && (
          <button type="button" className="text-sm font-semibold text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink" aria-expanded={all} onClick={() => setAll(!all)}>
            {all ? "Show less" : `Show all ${evidence.text.length.toLocaleString("en-GB")} characters`}
          </button>
        )}
        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => update((p) => removeEvidence(p, evidence.id), "Removed a source passage.")}>
          Remove passage
        </Button>
      </div>
      {cited > 0 && <p className="mt-2 text-sm text-warn">{cited} claim{cited === 1 ? "" : "s"} cite this passage and would need attention if it is removed.</p>}
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
      <details className="group">
        <summary className="text-sm font-semibold text-ink-soft hover:text-ink">Paste a passage from this source</summary>
        <form
          className="mt-4 space-y-4"
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
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={text.trim().length < 40}>
              Save passage
            </Button>
            {text.trim().length > 0 && text.trim().length < 40 && <span className="text-sm text-ink-soft">A passage needs at least 40 characters.</span>}
          </div>
        </form>
      </details>
    </div>
  );
}

function evidenceAccess(project: ReturnType<typeof useProject>, sourceId: string): "abstract" | "user_pasted" | "none" {
  const evidence = project.evidence.filter((e) => e.sourceId === sourceId);
  return evidence.some((e) => e.scope === "abstract") ? "abstract" : evidence.length ? "user_pasted" : "none";
}

/** One row of the source list. Its accessible name starts with the title. */
function SourceRow({ source, selected, onSelect }: { source: Source; selected: boolean; onSelect: () => void }) {
  const project = useProject();
  const identity = sourceIdentity(source);
  const inSet = project.evidence.some((e) => e.sourceId === source.id && project.evidenceSet.ids.includes(e.id));
  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className={cx("flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors", selected ? "bg-brand-tint" : "hover:bg-s2/70")}
    >
      <span className={cx("text-sm leading-snug font-semibold", selected ? "text-brand" : "text-ink")}>{source.cited.title || "Untitled reference"}</span>
      <span className="text-sm text-ink-soft">
        {formatAuthorsShort(source.cited.authors, source.cited.year)}
        {source.cited.container && `, ${source.cited.container}`}
      </span>
      <span className="flex flex-wrap gap-1">
        <StatusChip badge={IDENTITY[identity.status]} />
        {identity.retraction && <StatusChip badge={RETRACTED} />}
        <StatusChip badge={ACCESS[evidenceAccess(project, source.id)]} />
        {inSet && (
          <Chip tone="ok" icon={ListChecks}>
            In evidence set
          </Chip>
        )}
      </span>
    </button>
  );
}

function DetailSection({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="px-6 py-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-ink">{title}</h3>
        {aside && <div className="text-sm text-ink-soft">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function SourceDetail({ source, reference, refs }: { source: Source; reference: FormattedReference | undefined; refs: References }) {
  const project = useProject();
  const { update } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tag, setTag] = useState("");
  const evidence = project.evidence.filter((e) => e.sourceId === source.id);
  const missing = missingForApa(source.cited, source.doi);
  const link = sourceLink(source.doi, source.cited);

  return (
    <div className="divide-y divide-line">
      <header className="px-6 pt-6 pb-4">
        <h2 className="text-xl leading-snug font-bold tracking-[-0.02em] text-ink">{source.cited.title || "Untitled reference"}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {formatAuthorsShort(source.cited.authors, source.cited.year)}
          {source.cited.container && `, ${source.cited.container}`}. {ORIGIN[source.origin]} on {shortDate(source.addedAt)}.
        </p>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold break-all text-accent-text underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
            Open the source <ExternalLink aria-hidden className="size-3.5 shrink-0" />
          </a>
        )}
      </header>

      <DetailSection title="Source text">
        {evidence.length === 0 && (
          <Notice tone="warn" className="mb-4">
            There is no source text for this reference, so TRACE will not summarise it or let a claim quote it. You can keep it as a reference only, or add text below.
          </Notice>
        )}
        <div className="space-y-3">
          {evidence.map((e) => (
            <EvidenceBlock key={e.id} evidence={e} />
          ))}
          <AddEvidence source={source} hasAbstract={evidence.some((e) => e.scope === "abstract")} />
        </div>
      </DetailSection>

      <DetailSection title="Reference (APA 7)">
        {reference ? (
          <p className="max-w-prose text-base leading-relaxed break-words">
            <ReferenceText parts={reference.parts} />
          </p>
        ) : (
          <p className="text-sm text-ink-soft">{refs.state === "error" ? `Could not format this reference. ${refs.message ?? ""}` : "Formatting…"}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
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
          <span className="text-sm text-ink-soft">Built from the stored details by Citation.js, not written by AI.</span>
        </div>
        {missing.length > 0 && (
          <Notice tone="warn" className="mt-4">
            This reference is missing: {missing.join(", ")}. TRACE does not guess missing details. Add them under “Edit the details you cite”.
          </Notice>
        )}
      </DetailSection>

      <DetailSection title="Reference identity">
        <IdentityPanel source={source} />
      </DetailSection>

      <DetailSection title="Tags and note">
        <div className="grid gap-6 @2xl:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">Tags</p>
            <ul className="flex flex-wrap gap-2">
              {source.tags.map((t) => (
                <li key={t} className="inline-flex h-8 items-center gap-1 rounded-full bg-s2 pr-1 pl-3 text-sm font-medium">
                  {t}
                  <button type="button" aria-label={`Remove tag ${t}`} className="grid size-6 place-items-center rounded-full text-ink-soft hover:bg-s3 hover:text-ink" onClick={() => update((p) => setTags(p, source.id, source.tags.filter((x) => x !== t)))}>
                    <X aria-hidden className="size-3.5" />
                  </button>
                </li>
              ))}
              {source.tags.length === 0 && <li className="text-sm text-ink-soft">No tags.</li>}
            </ul>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (tag.trim()) update((p) => setTags(p, source.id, [...source.tags, tag]));
                setTag("");
              }}
            >
              <TextInput aria-label={`Add a tag to ${source.cited.title}`} placeholder="Add a tag" value={tag} maxLength={30} onChange={(e) => setTag(e.target.value)} />
              <Button type="submit" disabled={!tag.trim()}>
                Add tag
              </Button>
            </form>
          </div>
          <Field label="Note" hint="Your own note. It is not sent to any AI provider.">
            {(id) => <TextArea id={id} rows={3} key={source.id} defaultValue={source.note} maxLength={2000} onBlur={(e) => e.target.value !== source.note && update((p) => setNote(p, source.id, e.target.value), "Edited a source note.")} />}
          </Field>
        </div>
      </DetailSection>

      <div className="px-6 py-4">
        <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>
          Delete this source
        </Button>
      </div>
      <ConfirmDialog open={confirm} title="Delete this source?" confirmLabel="Delete source" danger onClose={() => setConfirm(false)} onConfirm={() => update((p) => removeSource(p, source.id), `Deleted “${source.cited.title}” from the library.`)}>
        “{source.cited.title}” and its stored text will be removed from this project. Claims that cite it stay in the brief and will be flagged for your attention.
      </ConfirmDialog>
    </div>
  );
}

export function LibraryStep({ goToDiscover, goToBrief }: { goToDiscover: () => void; goToBrief: () => void }) {
  const project = useProject();
  const refs = useReferences(project.sources, "each");
  const split = useMediaQuery("(min-width: 1280px)");
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
  const open = project.sources.find((s) => s.id === openId) ?? null;

  if (project.sources.length === 0) {
    return (
      <div className="card max-w-[720px] p-6">
        <SectionTitle>Your library</SectionTitle>
        <Empty title="No sources saved yet">
          Search Crossref or add a source by DOI, and it will appear here with its details, tags, notes and any source text.
          <div className="mt-4">
            <Button variant="primary" onClick={goToDiscover}>
              Find sources
            </Button>
          </div>
        </Empty>
      </div>
    );
  }

  const detail = (s: Source) => <SourceDetail key={s.id} source={s} reference={refs.byId.get(s.id)} refs={refs} />;

  return (
    <div>
      <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="card overflow-hidden xl:sticky xl:top-6">
          <div className="space-y-3 border-b border-line p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold tracking-[-0.02em]">Your library</h2>
              <span className="text-sm text-ink-soft">{`${shown.length} of ${project.sources.length} source${project.sources.length === 1 ? "" : "s"} shown`}</span>
            </div>
            <Field label="Filter">{(id) => <TextInput id={id} type="search" placeholder="Title, author, tag or note" value={text} onChange={(e) => setText(e.target.value)} />}</Field>
            <div className="flex items-end gap-3">
              <Field label="Tag" className="min-w-0 flex-1">
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
              <label className="inline-flex h-10 shrink-0 items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-[#4b3653]" checked={withText} onChange={(e) => setWithText(e.target.checked)} />
                With text only
              </label>
            </div>
          </div>
          {shown.length === 0 ? (
            <div className="p-4">
              <Empty title="No source matches these filters">Clear the filter, or pick another tag.</Empty>
            </div>
          ) : (
            <ul className="thin-scroll divide-y divide-line xl:max-h-[calc(100dvh-22rem)] xl:overflow-y-auto">
              {shown.map((s) => (
                <li key={s.id}>
                  <SourceRow source={s} selected={openId === s.id} onSelect={() => setOpenId(split ? s.id : openId === s.id ? null : s.id)} />
                  {!split && openId === s.id && <div className="@container border-t border-line bg-surface">{detail(s)}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {split && (
          <div className="card @container min-h-[24rem]">
            {open ? (
              detail(open)
            ) : (
              <div className="p-6">
                <Empty title="Choose a source">Its stored text, APA reference and identity check open here. Tick “Use in the evidence set” on the passages you want to work from.</Empty>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="float sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl px-6 py-4">
        <p className="text-sm text-ink-soft">
          {selected === 0 ? "No passages chosen yet. Open a source and tick “Use in the evidence set”." : `${selected} passage${selected === 1 ? "" : "s"} chosen for the evidence set.`}
        </p>
        <Button variant="primary" icon={ListChecks} disabled={selected === 0} onClick={goToBrief}>
          Review evidence set
        </Button>
      </div>
    </div>
  );
}