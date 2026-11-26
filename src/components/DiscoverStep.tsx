"use client";

import { BookmarkPlus, Check, ExternalLink, FileText, FileX2, ListChecks, Search, WifiOff } from "lucide-react";
import { useRef, useState } from "react";
import { callApi, type SearchResult, type WorkRecord } from "@/lib/api";
import { isPlanApproved } from "@/lib/approvals";
import { parseAuthors, SOURCE_TYPES } from "@/lib/csl";
import { doiUrl, normaliseDoi } from "@/lib/doi";
import type { FieldCheck } from "@/lib/identity";
import { bestCandidate, dupKey, judgeReference, libraryDuplicate, sameWork, type DupKey, type ListVerdict } from "@/lib/refCheck";
import { ResearchAssistant } from "./ResearchAssistant";
import { MAX_REFERENCES, parseReference, splitReferences, type ParsedReference } from "@/lib/refList";
import { addSource, findDuplicate, manualSource, sourceFromWork } from "@/lib/mutations";
import { planQuery } from "@/lib/plan";
import { formatAuthorsShort } from "@/lib/text";
import type { Outcome } from "@/lib/types";
import { FOUND, foundBadge, IDENTITY, RETRACTED, StatusChip, TrustLegend } from "./status";
import { useProject, useStore } from "./store";
import { Button, Chip, cx, Empty, Field, Notice, SectionTitle, Select, TextArea, TextInput } from "./ui";

type Failure = Extract<Outcome<never>, { ok: false }>;

/** One wording for provider failures, so "not found" and "could not check" never blur. */
function failureText(f: Failure): { tone: "warn" | "neutral" | "bad"; text: string } {
  if (f.kind === "not_found") {
    return { tone: "warn", text: `Not found in Crossref. This does not show the paper is fake: it may be registered elsewhere, or the DOI may be mistyped. ${f.message}` };
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
    <li className="border-b border-line py-4 last:border-b-0">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base leading-snug font-semibold text-ink">{r.title || "Untitled record"}</h3>
          <p className="mt-1 text-sm text-ink-soft">
            {formatAuthorsShort(r.authors, r.year)}
            {r.container && <span>, {r.container}</span>}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
            <StatusChip badge={FOUND} />
            {r.retraction && <StatusChip badge={RETRACTED} />}
            {work.abstract ? (
              <Chip tone="ok" icon={FileText}>
                Abstract available
              </Chip>
            ) : (
              <Chip tone="warn" icon={FileX2} title="Without source text, TRACE will not summarise this paper.">
                No abstract in Crossref
              </Chip>
            )}
            <a href={doiUrl(work.doi)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-accent-text underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
              {work.doi}
              <ExternalLink aria-hidden className="size-3 shrink-0" />
            </a>
            {work.abstract && (
              <button type="button" className="font-semibold text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink" aria-expanded={open} onClick={() => setOpen(!open)}>
                {open ? "Hide abstract" : "Read abstract"}
              </button>
            )}
          </div>
          {open && work.abstract && <p className="mt-3 max-w-prose rounded-lg bg-s2 p-4 text-base leading-relaxed whitespace-pre-line text-ink">{work.abstract}</p>}
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
      <SectionTitle>Find sources</SectionTitle>
      <p className="-mt-2 mb-2 text-sm text-ink-soft">Live search of Crossref, a registry of scholarly publications. Searching and checking never change your library: only an Add or Save button does.</p>
      <TrustLegend className="mb-4" />
      {!planOk && (
        <Notice tone="warn" className="mb-4">
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
      <p className="mt-2 text-sm text-ink-soft">
        {yearFrom || yearTo ? `Limited to ${yearFrom ?? "any year"} to ${yearTo ?? "any year"}, from your plan.` : "No year limit in your plan."} Up to 10 results. Results are ordered by Crossref&rsquo;s relevance, not by quality.
      </p>

      <div className="mt-6" aria-live="polite" aria-busy={busy}>
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
            <p className="border-b border-line pb-3 text-sm text-ink-soft">
              Showing {outcome.data.items.length} of about {outcome.data.total.toLocaleString("en-GB")} records for “{outcome.data.query}”.
            </p>
            <ul>
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

/** The result of a DOI check, tied to the exact input it was made for. Nothing here is saved. */
type DoiCheck =
  | { key: string; kind: "invalid" }
  | { key: string; kind: "failed"; failure: Failure }
  | { key: string; kind: "found"; work: WorkRecord };

/**
 * What the student typed, as a reference to compare. Only supplied fields count: a resolving DOI with
 * nothing (or only a junk year) typed is "DOI found, nothing to compare", never a citation match.
 */
function givenReference(doi: string, given: { title: string; author: string; year: string }): ParsedReference {
  const y = Number(given.year.trim());
  return {
    raw: "",
    doi,
    title: given.title.trim() || null,
    firstAuthor: given.author.trim() || null,
    year: given.year.trim() && Number.isInteger(y) && y >= 1000 && y <= 2100 ? y : null,
    query: "",
  };
}

const FIELD_NAME: Record<FieldCheck["field"], string> = { title: "Title", first_author: "First author's surname", year: "Year", venue: "Journal" };

function ByDoi() {
  const project = useProject();
  const { update } = useStore();
  const [doi, setDoi] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<DoiCheck | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  // Only the answer to the latest request is shown; an older one that arrives late is dropped.
  const latest = useRef(0);
  const hasGiven = Boolean(title.trim() || author.trim() || year.trim());
  const key = JSON.stringify([doi.trim(), title.trim(), author.trim(), year.trim()]);
  // A result for different input is stale: editing any field hides it until the student checks again.
  const current = check && check.key === key ? check : null;

  async function submit() {
    setAdded(null);
    const clean = normaliseDoi(doi);
    if (!clean) return setCheck({ key, kind: "invalid" });
    const request = ++latest.current;
    setBusy(true);
    const outcome = await callApi<WorkRecord>(`/api/doi?doi=${encodeURIComponent(clean)}`);
    if (request !== latest.current) return;
    setBusy(false);
    setCheck(outcome.ok ? { key, kind: "found", work: outcome.data } : { key, kind: "failed", failure: outcome });
  }

  function add(work: WorkRecord) {
    // The library keeps the registry's record. The details typed for the comparison are never saved over it.
    const { source, evidence } = sourceFromWork(work, hasGiven ? "citation_check" : "doi_lookup", new Date().toISOString());
    update((p) => addSource(p, source, evidence), `Added “${source.cited.title}” by DOI, with ${work.provider === "datacite" ? "DataCite" : "Crossref"}'s details.`);
    setAdded(source.cited.title);
    setCheck(null);
    setDoi("");
    setTitle("");
    setAuthor("");
    setYear("");
  }

  const judged = current?.kind === "found" ? judgeReference(givenReference(current.work.doi, { title, author, year }), current.work.record, "doi") : null;
  const registry = current?.kind === "found" && current.work.provider === "datacite" ? "DataCite" : "Crossref";
  const verdict = judged ? { ...VERDICT[judged.verdict], label: VERDICT[judged.verdict].label.replace("Crossref", registry) } : null;
  const notes = judged?.fields.some((f) => f.verdict === "note") ?? false;
  const saved = current?.kind === "found" ? findDuplicate(project, { doi: current.work.doi, cited: current.work.record }) : undefined;
  // A trusted add only when nothing was compared (the DOI alone) or everything compared agrees.
  const clean = judged && (judged.verdict === "doi_only" || (judged.verdict === "match" && !notes));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label="DOI" hint="Paste a DOI or a doi.org link. Checking only reads Crossref: nothing is added until you choose to add it.">
        {(id) => <TextInput id={id} required value={doi} maxLength={300} placeholder="10.1126/science.1152408" onChange={(e) => setDoi(e.target.value)} />}
      </Field>
      <fieldset className="rounded-lg bg-s2 p-4">
        <legend className="float-left mb-3 w-full text-sm font-semibold">Checking a citation someone gave you? Add its details to compare (optional)</legend>
        <div className="clear-both grid gap-3 @lg:grid-cols-[1fr_11rem_6rem]">
          <Field label="Title as given">{(id) => <TextInput id={id} value={title} maxLength={400} onChange={(e) => setTitle(e.target.value)} />}</Field>
          <Field label="First author's surname">{(id) => <TextInput id={id} value={author} maxLength={80} onChange={(e) => setAuthor(e.target.value)} />}</Field>
          <Field label="Year">{(id) => <TextInput id={id} inputMode="numeric" value={year} maxLength={4} onChange={(e) => setYear(e.target.value)} />}</Field>
        </div>
        <p className="mt-3 text-sm text-ink-soft">TRACE compares these details with Crossref and shows where they disagree. It does not correct them for you.</p>
      </fieldset>
      <Button type="submit" variant="primary" icon={ListChecks} disabled={busy || !doi.trim()}>
        {busy ? "Checking…" : "Check DOI"}
      </Button>
      <div aria-live="polite" className="space-y-3">
        {added && (
          <Notice tone="ok" role="status">
            Added “{added}” to your library, with Crossref&rsquo;s details.
          </Notice>
        )}
        {current?.kind === "invalid" && (
          <Notice tone="bad" role="status">
            That does not look like a DOI. A DOI starts with 10. and contains a slash, for example 10.1126/science.1152408.
          </Notice>
        )}
        {current?.kind === "failed" && (
          <Notice tone={failureText(current.failure).tone} role="status">
            {current.failure.kind !== "bad_request" && (
              <span className="mb-1.5 flex flex-wrap gap-1.5">
                <StatusChip badge={IDENTITY[current.failure.kind === "not_found" ? "not_found" : "could_not_check"]} />
              </span>
            )}
            {current.failure.kind === "not_found"
              ? failureText(current.failure).text
              : current.failure.kind === "bad_request"
                ? current.failure.message
                : `Could not check. ${current.failure.message} A timeout or usage limit is no evidence that the paper does not exist.`}{" "}
            Nothing was added.
            {current.failure.kind !== "not_found" && current.failure.kind !== "bad_request" && (
              <span className="mt-2 block">
                <Button size="sm" onClick={() => void submit()}>
                  Try again
                </Button>
              </span>
            )}
          </Notice>
        )}
        {current?.kind === "found" && judged && verdict && (
          <div className="space-y-3 rounded-lg border border-line p-4" role="status">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip badge={foundBadge(current.work.provider)} />
              {judged.verdict !== "doi_only" && (
                <Chip tone={notes && judged.verdict === "match" ? "warn" : verdict.tone} icon={verdict.tone === "ok" && !notes ? Check : verdict.tone === "bad" ? FileX2 : undefined}>
                  {notes && judged.verdict === "match" ? "Partial match: check details" : verdict.label}
                </Chip>
              )}
              {current.work.record.retraction && <StatusChip badge={RETRACTED} />}
              {current.work.abstract ? <Chip tone="neutral" icon={FileText}>Abstract available</Chip> : <Chip tone="warn" icon={FileX2}>No abstract in {registry}</Chip>}
            </div>
            <p className="text-sm text-ink">
              {registry} record: <span className="font-semibold">{current.work.record.title || "(no title recorded)"}</span> ({formatAuthorsShort(current.work.record.authors, current.work.record.year)})
            </p>
            {current.work.note && <p className="text-sm text-ink-soft">{current.work.note}</p>}
            {judged.fields.length > 0 ? (
              <ul className="space-y-1.5 text-sm" aria-label="Details compared">
                {judged.fields.map((f) => (
                  <li key={f.field} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-ink">{FIELD_NAME[f.field]}</span>
                    <Chip tone={f.verdict === "match" ? "ok" : f.verdict === "note" ? "warn" : "bad"}>{f.verdict === "match" ? "Agrees" : f.verdict === "note" ? "Check" : "Disagrees"}</Chip>
                    <span className="text-ink-soft">
                      you gave “{f.cited}”, {registry} has “{f.registry}”
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">No usable details were typed, so only the DOI was checked: it resolves. That says nothing about a citation. Adding saves {registry}&rsquo;s details.</p>
            )}
            {judged.fields.length > 0 && <p className="text-xs text-ink-soft">Compared: only the details you typed. Of the authors, only the first author&rsquo;s surname is compared.</p>}
            {saved ? (
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                <Chip tone="neutral" icon={Check}>
                  In your library
                </Chip>
                Your saved record was not changed.
              </p>
            ) : clean ? (
              <Button size="sm" variant="primary" icon={BookmarkPlus} onClick={() => add(current.work)}>
                Add to library
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-ink-soft">
                  The details you gave {judged.verdict === "mismatch" ? "disagree with" : judged.verdict === "possible" ? "agree, but without a title they cannot confirm" : "only partly match"} {registry}&rsquo;s record. To add this paper, take {registry}&rsquo;s details instead. Nothing you typed is saved.
                </p>
                <Button size="sm" icon={BookmarkPlus} onClick={() => add(current.work)}>
                  Use Crossref&rsquo;s details and add
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

function ByHand() {
  const project = useProject();
  const { update } = useStore();
  const [duplicate, setDuplicate] = useState<string | null>(null);
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
    const existing = findDuplicate(project, src);
    if (existing) {
      setSaved(null);
      setDuplicate(existing.cited.title);
      return;
    }
    update((p) => addSource(p, src, null), `Entered “${src.cited.title}” by hand.`);
    setDuplicate(null);
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
      <Notice tone="neutral">A reference you type in is saved exactly as entered and labelled “Not yet verified”. TRACE does not look it up or vouch for it, and keeps it out of reviewed exports and the APA 7 list.</Notice>
      <div className="grid gap-3 @lg:grid-cols-[12rem_1fr]">
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
      <div className="grid gap-3 @lg:grid-cols-[1fr_6rem]">
        <Field label="Authors" hint="One per line, as Surname, Given names. An organisation goes on one line.">
          {(id) => <TextArea id={id} rows={2} value={authors} maxLength={600} onChange={(e) => setAuthors(e.target.value)} />}
        </Field>
        <Field label="Year">{(id) => <TextInput id={id} inputMode="numeric" value={year} maxLength={4} onChange={(e) => setYear(e.target.value)} />}</Field>
      </div>
      <div className="grid gap-3 @lg:grid-cols-2">
        <Field label="Journal, site or publisher">{(id) => <TextInput id={id} value={container} maxLength={200} onChange={(e) => setContainer(e.target.value)} />}</Field>
        <Field label="Web address">{(id) => <TextInput id={id} type="url" value={url} maxLength={500} placeholder="https://" onChange={(e) => setUrl(e.target.value)} />}</Field>
      </div>
      <Button type="submit" variant="primary" disabled={!title.trim()}>
        Add as Not yet verified
      </Button>
      {saved && (
        <Notice tone="neutral" role="status">
          Added “{saved}” as entered by hand. It stays labelled Not yet verified.
        </Notice>
      )}
      {duplicate && (
        <Notice tone="neutral" role="status">
          Already in your library as “{duplicate}” (same title and year). Nothing was added.
        </Notice>
      )}
    </form>
  );
}

// --- Check a pasted reference list ----------------------------------------------------------

type Tone = "ok" | "warn" | "bad" | "neutral";

/** Verdict labels for the single-DOI check. */
const VERDICT: Record<ListVerdict, { tone: Tone; label: string }> = {
  match: { tone: "ok", label: "Details match Crossref" },
  doi_only: { tone: "neutral", label: "DOI found, nothing to compare" },
  possible: { tone: "warn", label: "Possible match, check it" },
  needs_fix: { tone: "warn", label: "Needs fix: the year differs from Crossref" },
  mismatch: { tone: "bad", label: "Details disagree with Crossref" },
  uncertain: { tone: "warn", label: "Uncertain: no confirmed record" },
  no_close_match: { tone: "warn", label: "No close match in Crossref" },
  not_found: { tone: "warn", label: "Not found in Crossref" },
  could_not_check: { tone: "neutral", label: "Could not check" },
  web: { tone: "neutral", label: "Web source · Not checked" },
};

interface ListRow {
  parsed: ParsedReference;
  verdict: ListVerdict;
  work: WorkRecord | null;
  fields: FieldCheck[];
  note: string | null;
}

async function checkOne(parsed: ParsedReference): Promise<ListRow> {
  if (parsed.web) {
    return { parsed, verdict: "web", work: null, fields: [], note: "A web page with no DOI, author or date. It was not checked in a scholarly database." };
  }
  if (parsed.doi) {
    const r = await callApi<WorkRecord>(`/api/doi?doi=${encodeURIComponent(parsed.doi)}`);
    if (!r.ok) {
      return r.kind === "not_found"
        ? { parsed, verdict: "not_found", work: null, fields: [], note: "Looked in Crossref and DataCite: neither has a record for this DOI. TRACE does not swap in a similar paper." }
        : { parsed, verdict: "could_not_check", work: null, fields: [], note: `${r.message} Nothing was concluded about this reference.` };
    }
    const j = judgeReference(parsed, r.data.record, "doi");
    return { parsed, verdict: j.verdict, work: r.data, fields: j.fields, note: null };
  }
  if (parsed.query.length < 8) return { parsed, verdict: "could_not_check", work: null, fields: [], note: "Too little text to search for." };
  const r = await callApi<SearchResult>(`/api/search?${new URLSearchParams({ q: parsed.query, rows: "5" })}`);
  if (!r.ok) return { parsed, verdict: "could_not_check", work: null, fields: [], note: `${r.message} Nothing was concluded about this reference.` };
  const top = bestCandidate(parsed, r.data.items);
  if (!top) return { parsed, verdict: "not_found", work: null, fields: [], note: "Searched Crossref by title and authors: no record came back. With no DOI, that is not evidence it was never published." };
  const j = judgeReference(parsed, top.record, "search");
  const note =
    j.verdict === "possible"
      ? "No DOI was given. Crossref's search found this record with the same title, first author and year. Confirm it is the work you meant."
      : j.verdict === "uncertain"
        ? "No DOI was given. The closest Crossref record has the same title and author but another year (perhaps a later record or reprint). It is not substituted."
        : "Searched Crossref by title and authors (5 candidates): none has this title and first author. With no DOI, that does not show the work is fake.";
  return { parsed, verdict: j.verdict, work: top, fields: j.fields, note };
}

/** The status shown for a row. Retraction outranks everything; web pages are never presented as checked. */
function rowStatus(row: ListRow): { tone: Tone; label: string } {
  const registry = row.work?.provider === "datacite" ? "DataCite" : "Crossref";
  if (row.verdict === "web") return { tone: "neutral", label: "Web source · Not checked" };
  if (row.work?.record.retraction && ["match", "doi_only", "possible", "needs_fix"].includes(row.verdict)) return { tone: "bad", label: `Retracted (${row.work.record.retraction.kind} notice in ${registry})` };
  const partial = row.verdict === "match" && row.fields.some((f) => f.verdict === "note");
  if (partial) return { tone: "warn", label: `Partial match: check details` };
  const map: Record<ListVerdict, { tone: Tone; label: string }> = {
    match: { tone: "ok", label: `Verified · details match ${registry}` },
    doi_only: { tone: "neutral", label: "DOI found, nothing to compare" },
    possible: { tone: "warn", label: "Likely match · confirm it" },
    needs_fix: { tone: "warn", label: "Needs fix" },
    mismatch: { tone: "bad", label: "Mismatch · the DOI points to another paper" },
    uncertain: { tone: "warn", label: "Uncertain · no confirmed record" },
    no_close_match: { tone: "bad", label: "Not found · no matching record in Crossref search" },
    not_found: { tone: "bad", label: row.parsed.doi ? "Not found in Crossref or DataCite" : "Not found in Crossref search" },
    could_not_check: { tone: "neutral", label: "Could not check · Retry" },
    web: { tone: "neutral", label: "Web source · Not checked" },
  };
  return map[row.verdict];
}

const LIST_FIELD: Record<FieldCheck["field"], string> = { title: "Title", first_author: "First author", year: "Year", venue: "Venue" };

/** Letter or number the student used ("A.", "3)"), else the row's position. */
function rowName(row: ListRow, n: number): string {
  return row.parsed.raw.trim().match(/^\[?([A-Z]|\d+)[.)\]]\s/)?.[1] ?? String(n + 1);
}

/** Identity key for duplicates: the pasted DOI, or the DOI of a confirmed search record, then title + first author + year. */
function rowKey(row: ListRow): DupKey {
  const doi = row.parsed.doi ?? (row.verdict === "possible" ? (row.work?.doi ?? null) : null);
  return dupKey(doi, { title: row.parsed.title ?? "", authors: row.parsed.firstAuthor ? [{ family: row.parsed.firstAuthor }] : [], year: row.parsed.year });
}

type Decision = "fix_accepted" | "fix_rejected" | "merged";

function CheckList() {
  const project = useProject();
  const { update } = useStore();
  const [text, setText] = useState("");
  // Results belong to the text they were checked for: editing the list hides them, and a newer run drops an older one.
  const [checked, setChecked] = useState<{ text: string; rows: ListRow[] }>({ text: "", rows: [] });
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  // Rows the student added from this review: they are the library entry, not duplicates of it.
  const [added, setAdded] = useState<number[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const latest = useRef(0);
  const refs = splitReferences(text);
  const capped = refs.slice(0, MAX_REFERENCES);
  const rows = checked.text === text ? checked.rows : [];

  async function run() {
    const ticket = ++latest.current;
    const snapshot = text;
    const parsed = capped.map(parseReference);
    setChecked({ text: snapshot, rows: [] });
    setDecisions({});
    setAdded([]);
    setProgress({ done: 0, total: parsed.length });
    const out: ListRow[] = [];
    // One at a time: the server queues Crossref calls anyway, and results appear as they arrive.
    for (const p of parsed) {
      const row = await checkOne(p);
      if (ticket !== latest.current) return;
      out.push(row);
      setChecked({ text: snapshot, rows: [...out] });
      setProgress({ done: out.length, total: parsed.length });
    }
    setProgress(null);
  }

  async function retry(n: number) {
    const row = rows[n];
    if (!row) return;
    const again = await checkOne(row.parsed);
    setChecked((c) => (c.text === text ? { text, rows: c.rows.map((r, i) => (i === n ? again : r)) } : c));
  }

  const decide = (n: number, d: Decision | null) =>
    setDecisions((all) => {
      const next = { ...all };
      if (d) next[n] = d;
      else delete next[n];
      return next;
    });

  function add(row: ListRow, how: "registry" | "flagged", n: number) {
    if (!row.work) return;
    setAdded((a) => [...a, n]);
    // The library keeps the registry's record. With "flagged", the pasted year is kept as cited, so the
    // identity check keeps showing the disagreement and the reviewed export stays blocked until it is fixed.
    const { source, evidence } = sourceFromWork(row.work, "citation_check", new Date().toISOString());
    const saved = how === "flagged" ? { ...source, cited: { ...source.cited, year: row.parsed.year } } : source;
    update(
      (p) => addSource(p, saved, evidence),
      how === "flagged" ? `Kept “${saved.cited.title}” for review with its pasted year ${row.parsed.year}; it stays flagged.` : `Added “${saved.cited.title}” from a checked reference list, with the registry's details.`,
    );
  }

  const keys = rows.map(rowKey);

  return (
    <div className="space-y-4">
      <Field label="Reference list" hint={`Paste up to ${MAX_REFERENCES} references, one per line or separated by blank lines (A., 1., [1] markers are fine). DOIs are used when present; otherwise TRACE searches Crossref. Checking never changes your library.`}>
        {(id) => <TextArea id={id} rows={8} value={text} maxLength={12000} onChange={(e) => setText(e.target.value)} placeholder="Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning… https://doi.org/10.1111/j.1467-9280.2006.01693.x" />}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" icon={ListChecks} disabled={capped.length === 0 || progress !== null} onClick={() => void run()}>
          {progress ? `Checking ${progress.done + 1} of ${progress.total}…` : `Check ${capped.length || ""} reference${capped.length === 1 ? "" : "s"}`.replace("  ", " ")}
        </Button>
        {refs.length > MAX_REFERENCES && <span className="text-sm text-warn">Only the first {MAX_REFERENCES} will be checked.</span>}
        {rows.length > 0 && <span className="text-sm text-ink-soft">{rows.length} checked. Your library still has {project.sources.length} sources: nothing is saved until you choose an action.</span>}
      </div>

      {rows.length > 0 && (
        <ol className="divide-y divide-line rounded-lg border border-line" aria-live="polite" aria-label="Checked references">
          {rows.map((row, n) => {
            const name = rowName(row, n);
            const status = rowStatus(row);
            const decision = decisions[n];
            const disagree = row.fields.filter((f) => f.verdict !== "match");
            const earlier = keys.slice(0, n).findIndex((k) => sameWork(keys[n]!, k) !== null);
            const earlierKind = earlier >= 0 ? sameWork(keys[n]!, keys[earlier]!) : null;
            const inLibrary = libraryDuplicate(row.verdict === "mismatch" ? { ...keys[n]!, doi: null } : keys[n]!, project.sources);
            const record = row.work?.record;
            const retracted = Boolean(record?.retraction) && status.tone === "bad" && status.label.startsWith("Retracted");
            const duplicateOf = earlier >= 0 ? `row ${rowName(rows[earlier]!, earlier)}` : null;
            const libDup = earlier < 0 && inLibrary && !added.includes(n) ? inLibrary : null;
            const isSaved = added.includes(n) && inLibrary !== null;
            return (
              <li key={n} className="p-4" aria-label={`Reference ${name}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num grid size-7 place-items-center rounded-full bg-s2 text-sm font-bold text-ink-soft">{name}</span>
                  <Chip tone={status.tone} icon={status.tone === "ok" ? Check : status.tone === "bad" ? FileX2 : undefined}>
                    {status.label}
                  </Chip>
                  {duplicateOf && <Chip tone="warn">{earlierKind === "possible" ? `Possible duplicate of ${duplicateOf}` : `Duplicate of ${duplicateOf}`}</Chip>}
                  {libDup && !decision && <Chip tone="neutral">{libDup.kind === "possible" ? "Possibly already in your library" : "Already in your library"}</Chip>}
                  {decision === "fix_accepted" && <Chip tone="ok">Fix accepted</Chip>}
                  {decision === "fix_rejected" && <Chip tone="warn">Fix rejected · original kept</Chip>}
                  {decision === "merged" && <Chip tone="neutral">Merged</Chip>}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="min-w-0 rounded-lg bg-s2/60 p-3 text-sm">
                    <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">As pasted</p>
                    <p className="mt-1 break-words text-ink">{row.parsed.raw}</p>
                    <p className="mt-1 text-ink-soft">
                      Read as: {row.parsed.firstAuthor ?? "author unclear"}, {row.parsed.year ?? "year missing"}, {row.parsed.title ? `“${row.parsed.title}”` : "title unclear"}
                      {row.parsed.doi ? `, DOI ${row.parsed.doi}` : ", no DOI"}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-line p-3 text-sm">
                    <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{row.work ? `${row.work.provider === "datacite" ? "DataCite" : "Crossref"} record${row.verdict === "no_close_match" ? " (closest, does not match)" : ""}` : "Registry record"}</p>
                    {record ? (
                      <>
                        <p className="mt-1 break-words text-ink">“{record.title}”</p>
                        <p className="text-ink-soft">
                          {record.authors[0]?.family ?? "no author listed"}
                          {record.authors.length > 1 ? " et al." : ""}, {record.year ?? "n.d."}
                          {record.container ? `, ${record.container}` : ""}, doi:{row.work!.doi}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-ink-soft">None.</p>
                    )}
                    {row.note && <p className="mt-1 text-ink-soft">{row.note}</p>}
                  </div>
                </div>

                {disagree.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {disagree.map((f) => (
                      <li key={f.field}>
                        <span className="font-semibold">{LIST_FIELD[f.field]}:</span> pasted “{f.cited}”, registry has “{f.registry}”{f.verdict === "note" ? " (close, check it)" : ""}.
                      </li>
                    ))}
                  </ul>
                )}
                {retracted && <p className="mt-2 rounded-lg bg-bad-tint px-3 py-2 text-sm text-ink">This paper has been retracted. Do not cite it as support. If you keep it, it stays marked Retracted and is kept out of the reviewed brief and the APA list.</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {decision === "merged" ? (
                    <p className="text-sm text-ink-soft">
                      Merged. One entry is kept ({duplicateOf ?? "the library entry"}), with its notes, tags and passages. This pasted copy is not saved and will not appear in the reference list.{" "}
                      <button type="button" className="font-semibold text-accent-text underline" onClick={() => decide(n, null)}>
                        Undo
                      </button>
                    </p>
                  ) : duplicateOf || (libDup && row.verdict !== "match" && row.verdict !== "needs_fix") ? (
                    <>
                      <p className="w-full text-sm text-ink-soft">
                        Merge keeps one entry: {duplicateOf ? `row ${duplicateOf.replace("row ", "")} (${rows[earlier]!.parsed.firstAuthor ?? ""} ${rows[earlier]!.parsed.year ?? ""}${rows[earlier]!.parsed.doi ? `, doi:${rows[earlier]!.parsed.doi}` : ""})` : `“${libDup!.source.cited.title}” already in your library`}. This row is not saved.
                        {earlierKind === "possible" || libDup?.kind === "possible" ? " The titles match but the author or year differs: decide whether they are the same work." : ""}
                      </p>
                      <Button size="sm" onClick={() => decide(n, "merged")}>
                        Merge into {duplicateOf ?? "library entry"}
                      </Button>
                    </>
                  ) : isSaved || libDup ? (
                    <Chip tone="neutral" icon={Check}>
                      In your library
                    </Chip>
                  ) : row.verdict === "needs_fix" && row.work ? (
                    decision === "fix_accepted" ? (
                      <>
                        <span className="text-sm text-ink-soft">Fix accepted: only the field shown changes. Adding is a separate choice.</span>
                        <Button size="sm" icon={BookmarkPlus} onClick={() => add(row, "registry", n)}>
                          {retracted ? "Add with retraction warning" : "Add to library"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => decide(n, null)}>
                          Undo
                        </Button>
                      </>
                    ) : decision === "fix_rejected" ? (
                      <>
                        <span className="text-sm text-ink-soft">The pasted details stay as they are, with this warning.</span>
                        <Button size="sm" onClick={() => add(row, "flagged", n)}>
                          Keep for review (flagged)
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => decide(n, null)}>
                          Undo
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="primary" icon={Check} onClick={() => decide(n, "fix_accepted")}>
                          Accept fix
                        </Button>
                        <Button size="sm" onClick={() => decide(n, "fix_rejected")}>
                          Reject fix
                        </Button>
                      </>
                    )
                  ) : row.work && (row.verdict === "match" || row.verdict === "doi_only" || row.verdict === "possible") ? (
                    <Button size="sm" icon={BookmarkPlus} onClick={() => add(row, "registry", n)}>
                      {retracted ? "Add with retraction warning" : row.verdict === "possible" ? "This is the paper: add Crossref’s record" : status.tone === "warn" ? "Use Crossref’s details and add" : "Add to library"}
                    </Button>
                  ) : row.verdict === "could_not_check" ? (
                    <Button size="sm" onClick={() => void retry(n)}>
                      Retry
                    </Button>
                  ) : (
                    <p className="text-sm text-ink-soft">
                      {row.verdict === "mismatch"
                        ? "Nothing is swapped in. Check the DOI against the paper you meant, or find that paper and add it on its own."
                        : row.verdict === "web"
                          ? "Not a scholarly record. If you need it, enter it by hand: it stays labelled Not yet verified."
                          : "Nothing can be added from this result. Add the source by its DOI once you have one, or enter it by hand as Not yet verified."}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function DiscoverStep({ goToPlan }: { goToPlan: () => void }) {
  const [mode, setMode] = useState<"doi" | "list" | "hand" | "ask">("doi");
  // Checking a list and the assistant need the width for pasted text beside the registry record.
  const wide = mode === "list" || mode === "ask";
  return (
    <div className={cx("step-body grid items-start gap-6", !wide && "xl:grid-cols-[minmax(0,1fr)_25rem]")}>
      <SearchPanel goToPlan={goToPlan} />
      <section className={cx("@container", wide ? "order-first" : "xl:sticky xl:top-6")}>
        <SectionTitle>Add a source you already have</SectionTitle>
        <div role="tablist" aria-label="How to add a source" className="mb-6 inline-flex flex-wrap rounded-full bg-s2 p-1">
          {(
            [
              ["doi", "By DOI"],
              ["list", "Check a list"],
              ["hand", "By hand"],
              ["ask", "Research assistant"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} className={cx("h-8 rounded-full px-4 text-sm font-semibold transition-colors", mode === id ? "bg-surface text-ink shadow-[0_1px_3px_rgb(75_54_83/0.15)]" : "text-ink-soft hover:text-ink")} onClick={() => setMode(id)}>
              {label}
            </button>
          ))}
        </div>
        <div role="tabpanel">{mode === "doi" ? <ByDoi /> : mode === "list" ? <CheckList /> : mode === "hand" ? <ByHand /> : <ResearchAssistant />}</div>
      </section>
    </div>
  );
}
