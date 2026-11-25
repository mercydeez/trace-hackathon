"use client";

import { BookmarkPlus, Check, ExternalLink, FileText, FileX2, Search, WifiOff } from "lucide-react";
import { useState } from "react";
import { callApi, type SearchResult, type WorkRecord } from "@/lib/api";
import { isPlanApproved } from "@/lib/approvals";
import { parseAuthors, SOURCE_TYPES } from "@/lib/csl";
import { doiUrl, normaliseDoi } from "@/lib/doi";
import { sourceIdentity } from "@/lib/identity";
import { addSource, findDuplicate, manualSource, sourceFromWork } from "@/lib/mutations";
import { planQuery } from "@/lib/plan";
import { formatAuthorsShort } from "@/lib/text";
import type { Lookup, Outcome, Source } from "@/lib/types";
import { IDENTITY, StatusChip } from "./status";
import { useProject, useStore } from "./store";
import { Button, Chip, cx, Empty, Field, Notice, SectionTitle, Select, TextArea, TextInput } from "./ui";

type Failure = Extract<Outcome<never>, { ok: false }>;

/** One wording for provider failures, so "not found" and "could not check" never blur. */
function failureText(f: Failure): { tone: "warn" | "neutral" | "bad"; text: string } {
  if (f.kind === "not_found") {
    return { tone: "warn", text: "Not found in Crossref. This does not show the paper is fake: it may be registered with another agency, or the DOI may be mistyped." };
  }
  if (f.kind === "bad_request") return { tone: "bad", text: f.message };
  return { tone: "neutral", text: `Could not check. ${f.message} Nothing has been marked as checked.` };
}

function ResultRow({ work }: { work: WorkRecord }) {
  const project = useProject();
  const { update } = useStore();
  const [open, setOpen] = useState(false);
  const saved = findDuplicate(project, { doi: work.doi, cited: work.record });
  const r = work.record;

  return (
    <li className="border-b border-line py-3.5 last:border-b-0">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[0.975rem] leading-snug font-semibold text-ink">{r.title || "Untitled record"}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            {formatAuthorsShort(r.authors, r.year)}
            {r.container && <span>, {r.container}</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-faint">
            {work.abstract ? (
              <Chip tone="ok" icon={FileText}>
                Abstract available
              </Chip>
            ) : (
              <Chip tone="warn" icon={FileX2} title="Without source text, TRACE will not summarise this paper.">
                No abstract in Crossref
              </Chip>
            )}
            <a href={doiUrl(work.doi)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all underline decoration-line-strong underline-offset-2 hover:text-ink">
              {work.doi}
              <ExternalLink aria-hidden className="size-3 shrink-0" />
            </a>
            <span>From Crossref, just now</span>
            {work.abstract && (
              <button type="button" className="underline decoration-line-strong underline-offset-2 hover:text-ink" aria-expanded={open} onClick={() => setOpen(!open)}>
                {open ? "Hide abstract" : "Read abstract"}
              </button>
            )}
          </div>
          {open && work.abstract && <p className="mt-2 max-w-prose font-reading text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink-soft">{work.abstract}</p>}
        </div>
        {saved ? (
          <Chip tone="neutral" icon={Check}>
            In your library
          </Chip>
        ) : (
          <Button
            size="sm"
            icon={BookmarkPlus}
            onClick={() => {
              const { source, evidence } = sourceFromWork(work, "crossref_search", new Date().toISOString());
              update((p) => addSource(p, source, evidence), `Saved “${r.title}” from a Crossref search.`);
            }}
          >
            Save
          </Button>
        )}
      </div>
    </li>
  );
}

function SearchPanel({ goToPlan }: { goToPlan: () => void }) {
  const project = useProject();
  const planOk = isPlanApproved(project);
  const [query, setQuery] = useState(() => planQuery(project.plan));
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome<SearchResult> | null>(null);
  const { yearFrom, yearTo } = project.plan;

  async function run() {
    const q = query.trim();
    if (q.length < 2 || busy) return;
    setBusy(true);
    const params = new URLSearchParams({ q, rows: "10" });
    if (yearFrom) params.set("from", String(yearFrom));
    if (yearTo) params.set("to", String(yearTo));
    setOutcome(await callApi<SearchResult>(`/api/search?${params}`));
    setBusy(false);
  }

  return (
    <section>
      <SectionTitle aside="Live search of Crossref, a registry of scholarly publications.">Find sources</SectionTitle>
      {!planOk && (
        <Notice tone="warn" className="mb-3">
          Approve your search plan before searching, so the search follows the question and scope you chose.{" "}
          <button type="button" className="font-medium underline underline-offset-2" onClick={goToPlan}>
            Go to the plan
          </button>
        </Notice>
      )}
      <form
        className="flex flex-wrap gap-2"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <TextInput aria-label="Search terms" className="min-w-0 flex-1 basis-64" value={query} maxLength={300} disabled={!planOk} onChange={(e) => setQuery(e.target.value)} />
        <Button type="submit" variant="primary" icon={Search} disabled={!planOk || busy || query.trim().length < 2}>
          {busy ? "Searching…" : "Search Crossref"}
        </Button>
      </form>
      <p className="mt-1.5 text-xs text-ink-faint">
        {yearFrom || yearTo ? `Limited to ${yearFrom ?? "any year"} to ${yearTo ?? "any year"}, from your plan.` : "No year limit in your plan."} Up to 10 results. Results are ordered by Crossref&rsquo;s relevance, not by quality.
      </p>

      <div className="mt-4" aria-live="polite" aria-busy={busy}>
        {busy && <p className="py-6 text-sm text-ink-soft">Asking Crossref…</p>}
        {!busy && outcome === null && planOk && <Empty title="Nothing searched yet">Search with the terms from your plan, or change them here for this search only.</Empty>}
        {!busy && outcome && !outcome.ok && (
          <Notice tone={failureText(outcome).tone} icon={WifiOff} role="alert">
            {outcome.kind === "not_found" ? "Could not search Crossref right now." : failureText(outcome).text}{" "}
            <button type="button" className="font-medium underline underline-offset-2" onClick={() => void run()}>
              Try again
            </button>
          </Notice>
        )}
        {!busy && outcome?.ok && outcome.data.items.length === 0 && (
          <Empty title="Crossref returned no results">No record matched “{outcome.data.query}” in this scope. Try fewer or broader terms. An empty result is not evidence that nothing has been published.</Empty>
        )}
        {!busy && outcome?.ok && outcome.data.items.length > 0 && (
          <>
            <p className="text-sm text-ink-soft">
              Showing {outcome.data.items.length} of about {outcome.data.total.toLocaleString("en-GB")} records for “{outcome.data.query}”.
            </p>
            <ul className="mt-1">
              {outcome.data.items.map((w) => (
                <ResultRow key={w.doi} work={w} />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

interface AddResult {
  tone: "ok" | "warn" | "neutral" | "bad";
  text: string;
  source?: Source;
}

function ByDoi() {
  const project = useProject();
  const { update } = useStore();
  const [doi, setDoi] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AddResult | null>(null);
  const [unchecked, setUnchecked] = useState<{ doi: string; lookup: Lookup } | null>(null);
  const hasGiven = Boolean(title.trim() || author.trim() || year.trim());

  async function submit() {
    setResult(null);
    setUnchecked(null);
    const clean = normaliseDoi(doi);
    if (!clean) return setResult({ tone: "bad", text: "That does not look like a DOI. A DOI starts with 10. and contains a slash, for example 10.1126/science.1152408." });
    const existing = project.sources.find((s) => s.doi === clean);
    if (existing) return setResult({ tone: "neutral", text: `Already in your library: “${existing.cited.title}”. Nothing was added.` });

    setBusy(true);
    const outcome = await callApi<WorkRecord>(`/api/doi?doi=${encodeURIComponent(clean)}`);
    setBusy(false);
    const now = new Date().toISOString();

    if (!outcome.ok) {
      const f = failureText(outcome);
      if (outcome.kind !== "bad_request") {
        setUnchecked({ doi: clean, lookup: { status: outcome.kind === "not_found" ? "not_found" : "could_not_check", checkedAt: now, detail: outcome.message } });
      }
      return setResult({ tone: f.tone, text: f.text });
    }

    const work = outcome.data;
    if (project.sources.some((s) => s.doi === work.doi)) return setResult({ tone: "neutral", text: "That record is already in your library. Nothing was added." });
    const { source, evidence } = sourceFromWork(work, hasGiven ? "citation_check" : "doi_lookup", now);
    if (hasGiven) {
      // Keep what the student was given, so the comparison with the registry is visible. Nothing is repaired.
      const y = Number(year);
      const givenFamily = author.trim();
      source.cited = {
        ...source.cited,
        title: title.trim() || source.cited.title,
        year: year.trim() && Number.isInteger(y) ? y : source.cited.year,
        authors: givenFamily && givenFamily.toLowerCase() !== (source.cited.authors[0]?.family ?? "").toLowerCase() ? [{ family: givenFamily }] : source.cited.authors,
      };
    }
    update((p) => addSource(p, source, evidence), `Added “${source.cited.title}” by DOI${hasGiven ? " and compared the details given with Crossref" : ""}.`);
    const identity = sourceIdentity(source);
    setResult({
      tone: identity.status === "mismatch" ? "bad" : "ok",
      text: `${work.note ? `${work.note} ` : ""}Saved to your library. ${identity.summary}${evidence ? "" : " Crossref has no abstract for it, so there is no source text yet."}`,
      source,
    });
    setDoi("");
    setTitle("");
    setAuthor("");
    setYear("");
  }

  function saveUnchecked() {
    if (!unchecked) return;
    const y = Number(year);
    const src: Source = {
      ...manualSource({ title: title.trim() || "Title not entered", authors: author.trim() ? [{ family: author.trim() }] : [], year: year.trim() && Number.isInteger(y) ? y : null, type: "article-journal" }, unchecked.doi, new Date().toISOString()),
      lookup: unchecked.lookup,
    };
    update((p) => addSource(p, src, null), `Saved DOI ${unchecked.doi} without a registry record (${unchecked.lookup.status === "not_found" ? "not found in Crossref" : "could not check"}).`);
    setResult({ tone: "neutral", text: `Saved without a registry record. It is labelled “${IDENTITY[sourceIdentity(src).status].label}” and can be edited in the Library.` });
    setUnchecked(null);
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label="DOI" hint="Paste a DOI or a doi.org link. TRACE looks it up in Crossref.">
        {(id) => <TextInput id={id} required value={doi} maxLength={300} placeholder="10.1126/science.1152408" onChange={(e) => setDoi(e.target.value)} />}
      </Field>
      <fieldset className="rounded border border-line p-3">
        <legend className="px-1 text-[0.8125rem] font-medium">Checking a citation someone gave you? Enter its details to compare (optional)</legend>
        <div className="grid gap-3 sm:grid-cols-[1fr_11rem_6rem]">
          <Field label="Title as given">{(id) => <TextInput id={id} value={title} maxLength={400} onChange={(e) => setTitle(e.target.value)} />}</Field>
          <Field label="First author's surname">{(id) => <TextInput id={id} value={author} maxLength={80} onChange={(e) => setAuthor(e.target.value)} />}</Field>
          <Field label="Year">{(id) => <TextInput id={id} inputMode="numeric" value={year} maxLength={4} onChange={(e) => setYear(e.target.value)} />}</Field>
        </div>
        <p className="mt-2 text-xs text-ink-faint">TRACE saves the details as you give them and shows where they disagree with Crossref. It does not correct them for you.</p>
      </fieldset>
      <Button type="submit" variant="primary" disabled={busy || !doi.trim()}>
        {busy ? "Looking up…" : hasGiven ? "Look up and compare" : "Look up and save"}
      </Button>
      <div aria-live="polite">
        {result && (
          <Notice tone={result.tone} role="status">
            {result.text}
            {result.source && (
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                <StatusChip badge={IDENTITY[sourceIdentity(result.source).status]} />
              </span>
            )}
            {unchecked && (
              <span className="mt-2 block">
                <Button size="sm" onClick={saveUnchecked}>
                  Save it anyway, marked as not confirmed
                </Button>
              </span>
            )}
          </Notice>
        )}
      </div>
    </form>
  );
}

function ByHand() {
  const { update } = useStore();
  const [type, setType] = useState("webpage");
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [year, setYear] = useState("");
  const [container, setContainer] = useState("");
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  function submit() {
    const y = Number(year);
    const src = manualSource(
      {
        title: title.trim(),
        authors: parseAuthors(authors),
        year: year.trim() && Number.isInteger(y) ? y : null,
        container: container.trim() || undefined,
        url: url.trim() || undefined,
        type,
      },
      null,
      new Date().toISOString(),
    );
    update((p) => addSource(p, src, null), `Entered “${src.cited.title}” by hand.`);
    setSaved(src.cited.title);
    setTitle("");
    setAuthors("");
    setYear("");
    setContainer("");
    setUrl("");
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Notice tone="neutral">A reference you type in is saved exactly as entered and labelled “Entered by hand, not checked”. TRACE does not look it up or vouch for it.</Notice>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Field label="Type">
          {(id) => (
            <Select id={id} value={type} onChange={(e) => setType(e.target.value)}>
              {SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Title">{(id) => <TextInput id={id} required value={title} maxLength={400} onChange={(e) => setTitle(e.target.value)} />}</Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
        <Field label="Authors" hint="One per line, as Surname, Given names. An organisation goes on one line.">
          {(id) => <TextArea id={id} rows={2} value={authors} maxLength={600} onChange={(e) => setAuthors(e.target.value)} />}
        </Field>
        <Field label="Year">{(id) => <TextInput id={id} inputMode="numeric" value={year} maxLength={4} onChange={(e) => setYear(e.target.value)} />}</Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Journal, site or publisher">{(id) => <TextInput id={id} value={container} maxLength={200} onChange={(e) => setContainer(e.target.value)} />}</Field>
        <Field label="Web address">{(id) => <TextInput id={id} type="url" value={url} maxLength={500} placeholder="https://" onChange={(e) => setUrl(e.target.value)} />}</Field>
      </div>
      <Button type="submit" variant="primary" disabled={!title.trim()}>
        Save as entered
      </Button>
      {saved && (
        <Notice tone="neutral" role="status">
          Saved “{saved}” as entered by hand. It will stay labelled as not checked.
        </Notice>
      )}
    </form>
  );
}

export function DiscoverStep({ goToPlan }: { goToPlan: () => void }) {
  const [mode, setMode] = useState<"doi" | "hand">("doi");
  return (
    <div className="step-body space-y-5">
      <SearchPanel goToPlan={goToPlan} />
      <section>
        <SectionTitle>Add a source you already have</SectionTitle>
        <div role="tablist" aria-label="How to add a source" className="mb-4 inline-flex rounded border border-line-strong bg-surface p-0.5">
          {(
            [
              ["doi", "By DOI"],
              ["hand", "By hand"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} className={cx("rounded-sm px-3 py-1 text-sm font-medium", mode === id ? "bg-brand-tint text-brand-deep" : "text-ink-soft hover:text-ink")} onClick={() => setMode(id)}>
              {label}
            </button>
          ))}
        </div>
        <div role="tabpanel">{mode === "doi" ? <ByDoi /> : <ByHand />}</div>
      </section>
    </div>
  );
}
