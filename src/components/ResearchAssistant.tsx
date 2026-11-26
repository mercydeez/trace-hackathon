"use client";

import { Check, MessageSquareText, Search, StickyNote } from "lucide-react";
import { useState } from "react";
import { callApi, type SearchResult, type WorkRecord } from "@/lib/api";
import { checkQuote, judgeStudies, looksLikeInstruction, parseNoteRequest, routeRequest, type Intent, type QuoteResult } from "@/lib/assistant";
import { setNote } from "@/lib/mutations";
import { formatAuthorsShort } from "@/lib/text";
import { useProject, useStore } from "./store";
import { Button, Chip, Field, Notice, Select, TextArea } from "./ui";

type Answer =
  | { kind: "find"; state: "loading" }
  | { kind: "find"; state: "error"; message: string }
  | { kind: "find"; state: "done"; terms: string[]; examined: number; answers: WorkRecord[]; related: WorkRecord[] }
  | { kind: "quote"; result: QuoteResult; quote: string }
  | { kind: "note"; note: string | null; targetIds: string[] }
  | { kind: "unclear" };

const ACTIONS: [Exclude<Intent, "unclear">, string][] = [
  ["find", "Find studies"],
  ["quote", "Check a quote"],
  ["note", "Save a note"],
];

function Record({ w, label }: { w: WorkRecord; label: string }) {
  return (
    <li className="rounded-lg border border-line p-3 text-sm">
      <p className="text-ink">{w.record.title}</p>
      <p className="text-ink-soft">
        {formatAuthorsShort(w.record.authors, w.record.year)}, doi:{w.doi}
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <Chip tone="neutral">{label}</Chip>
        {w.record.retraction && <Chip tone="bad">Retracted</Chip>}
      </div>
    </li>
  );
}

/**
 * Three bounded actions behind one input: find studies, check a quote, save a note. The request is routed by
 * its wording, and an unclear one asks the student to pick. No language model is called here.
 */
export function ResearchAssistant() {
  const project = useProject();
  const { update } = useStore();
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [chosen, setChosen] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  async function run(intent: Intent) {
    setSaved(null);
    if (intent === "unclear") return setAnswer({ kind: "unclear" });
    if (intent === "quote") {
      const quote = text.match(/["“]([^"”]{4,})["”]/)?.[1] ?? "";
      return setAnswer({ kind: "quote", result: checkQuote(text, project.sources, project.evidence), quote });
    }
    if (intent === "note") {
      const { note, targets } = parseNoteRequest(text, project.sources);
      setChosen(targets.length === 1 ? targets[0]!.id : "");
      return setAnswer({ kind: "note", note, targetIds: targets.map((t) => t.id) });
    }
    setAnswer({ kind: "find", state: "loading" });
    const r = await callApi<SearchResult>(`/api/search?${new URLSearchParams({ q: text.slice(0, 300), rows: "20" })}`);
    if (!r.ok) return setAnswer({ kind: "find", state: "error", message: r.message });
    const j = judgeStudies(text, r.data.items);
    setAnswer({ kind: "find", state: "done", terms: j.terms, examined: r.data.items.length, answers: j.answers, related: j.related.slice(0, 3) });
  }

  const name = (id: string) => {
    const s = project.sources.find((x) => x.id === id);
    return s ? `${formatAuthorsShort(s.cited.authors, s.cited.year)}, “${s.cited.title}”` : "";
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">Ask for studies, a quote check, or a note. Answers come from Crossref and from the text stored in your library. No AI model writes them, and nothing here can change a reference’s status.</p>
      <Field label="Ask the research assistant">
        {(id) => <TextArea id={id} rows={3} maxLength={1200} value={text} onChange={(e) => setText(e.target.value)} placeholder='e.g. Find studies on retrieval practice and long-term retention' />}
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" icon={MessageSquareText} disabled={!text.trim() || (answer?.kind === "find" && answer.state === "loading")} onClick={() => void run(routeRequest(text))}>
          Ask
        </Button>
        <span className="text-sm text-ink-soft">or choose:</span>
        {ACTIONS.map(([intent, label]) => (
          <Button key={intent} size="sm" disabled={!text.trim()} onClick={() => void run(intent)}>
            {label}
          </Button>
        ))}
      </div>

      {answer?.kind === "unclear" && (
        <Notice tone="neutral" role="status">
          TRACE could not tell which action you want. Choose Find studies, Check a quote or Save a note.
        </Notice>
      )}

      {answer?.kind === "find" && (
        <section aria-label="Assistant answer" className="space-y-3">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Search aria-hidden className="size-4" /> Find studies
          </h3>
          {answer.state === "loading" && <p className="text-sm text-ink-soft">Searching Crossref…</p>}
          {answer.state === "error" && (
            <Notice tone="warn" role="status">
              Could not check: {answer.message} Nothing was concluded. Try again.
            </Notice>
          )}
          {answer.state === "done" &&
            (answer.answers.length === 0 ? (
              <Notice tone="bad" role="status">
                <strong>Not found.</strong> TRACE searched Crossref and examined {answer.examined} records. None of them has all of these terms in its title or abstract: {answer.terms.join(", ")}. TRACE does not invent sources to fill a gap.
              </Notice>
            ) : (
              <>
                <p className="text-sm text-ink">
                  {answer.answers.length} Crossref record{answer.answers.length === 1 ? "" : "s"} contain{answer.answers.length === 1 ? "s" : ""} every term you used ({answer.terms.join(", ")}). Read each before relying on it: matching words do not show the study answers your question.
                </p>
                <ul className="space-y-2">
                  {answer.answers.map((w) => (
                    <Record key={w.doi} w={w} label="Real Crossref record · contains every term" />
                  ))}
                </ul>
              </>
            ))}
          {answer.state === "done" && answer.related.length > 0 && (
            <>
              <p className="text-sm text-ink-soft">Related records, not answers to your question. Each exists in Crossref and shares some of your terms.</p>
              <ul className="space-y-2">
                {answer.related.map((w) => (
                  <Record key={w.doi} w={w} label="Related only · not an answer" />
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {answer?.kind === "quote" && (
        <section aria-label="Assistant answer" className="space-y-2">
          <h3 className="text-base font-bold">Check a quote</h3>
          {answer.quote && <p className="text-sm text-ink">Quote: “{answer.quote}”</p>}
          {answer.result.kind === "unparsed" && <Notice tone="neutral">Put the quote in quotation marks, followed by its citation, e.g. “…” (Author, 2015).</Notice>}
          {answer.result.kind === "no_source" && (
            <Notice tone="warn" role="status">
              Could not check: {answer.result.surname ? `no source by ${answer.result.surname}${answer.result.year ? ` (${answer.result.year})` : ""} is in your library` : "the citation could not be read"}. Add the paper first (Check a list or By DOI), so TRACE has its stored text to compare with. TRACE never confirms a quote from memory.
            </Notice>
          )}
          {answer.result.kind === "ambiguous" && <Notice tone="warn">More than one saved source matches that citation. Make the citation more specific.</Notice>}
          {answer.result.kind === "no_text" && (
            <Notice tone="warn" role="status">
              <strong>Could not check.</strong> TRACE has no stored text for {name(answer.result.source.id)}. The full text was not available, so the quote is not confirmed. Paste the passage in the Library to check against it.
            </Notice>
          )}
          {answer.result.kind === "not_found" && (
            <Notice tone="bad" role="status">
              <strong>Not found in the available {answer.result.scopes.includes("abstract") ? "abstract" : "stored text"}</strong> of {name(answer.result.source.id)}. {answer.result.scopes.includes("abstract") ? "Only the abstract was available; the full text was not checked." : ""} Do not use this quote unless you find it in the paper.
            </Notice>
          )}
          {answer.result.kind === "found" && (
            <Notice tone="ok" role="status">
              The words appear in the stored {answer.result.evidence.scope === "abstract" ? "abstract" : "passage"} of {name(answer.result.source.id)}. That shows they are there, not that the claim is right.
            </Notice>
          )}
        </section>
      )}

      {answer?.kind === "note" && (
        <section aria-label="Assistant answer" className="space-y-3">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <StickyNote aria-hidden className="size-4" /> Save a note
          </h3>
          {!answer.note ? (
            <Notice tone="neutral">Put the note in quotation marks so TRACE knows exactly what to save.</Notice>
          ) : project.sources.length === 0 || (answer.targetIds.length === 0 && !chosen) ? (
            <>
              <Notice tone="warn" role="status">
                {answer.targetIds.length === 0 ? "TRACE could not find the paper you named in your library." : ""} Choose the source, or add the paper first.
              </Notice>
              {project.sources.length > 0 && (
                <Field label="Source for this note">
                  {(id) => (
                    <Select id={id} value={chosen} onChange={(e) => setChosen(e.target.value)}>
                      <option value="">Choose a source</option>
                      {project.sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatAuthorsShort(s.cited.authors, s.cited.year)}: {s.cited.title.slice(0, 60)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
            </>
          ) : (
            <>
              {answer.targetIds.length > 1 && (
                <Field label="More than one saved source matches. Choose one">
                  {(id) => (
                    <Select id={id} value={chosen} onChange={(e) => setChosen(e.target.value)}>
                      <option value="">Choose a source</option>
                      {answer.targetIds.map((t) => (
                        <option key={t} value={t}>
                          {name(t)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
              <div className="rounded-lg bg-s2/60 p-3 text-sm">
                <p className="font-semibold text-ink">Note, exactly as it will be saved{chosen ? ` on ${name(chosen)}` : ""}:</p>
                <p className="mt-1 font-reading break-words whitespace-pre-wrap text-ink">{answer.note}</p>
              </div>
              {looksLikeInstruction(answer.note) && (
                <Notice tone="warn" role="note">
                  This note reads like an instruction to the system. TRACE stores it as plain text. It does not change any status, skip any check, or reach the AI model. Statuses change only when a check runs.
                </Notice>
              )}
              <Button
                variant="primary"
                icon={Check}
                disabled={!chosen || saved === chosen}
                onClick={() => {
                  const note = answer.note!;
                  update((p) => {
                    const s = p.sources.find((x) => x.id === chosen);
                    return setNote(p, chosen, s?.note ? `${s.note}\n${note}` : note);
                  }, "Saved a note on a source, as text.");
                  setSaved(chosen);
                }}
              >
                {saved === chosen ? "Note saved" : "Save note"}
              </Button>
              {saved === chosen && <p className="text-sm text-ink-soft">Saved as text. The source’s status is unchanged.</p>}
            </>
          )}
        </section>
      )}
    </div>
  );
}
