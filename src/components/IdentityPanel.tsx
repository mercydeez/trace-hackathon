"use client";

import { Check, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { callApi, type WorkRecord } from "@/lib/api";
import { authorsToText, parseAuthors } from "@/lib/csl";
import { sourceIdentity, type FieldCheck } from "@/lib/identity";
import { setRegistry, takeRegistryValue, updateCited } from "@/lib/mutations";
import type { Source } from "@/lib/types";
import { IDENTITY, StatusChip } from "./status";
import { useStore } from "./store";
import { Button, Chip, Field, TextArea, TextInput } from "./ui";

const FIELD_LABEL: Record<FieldCheck["field"], string> = { title: "Title", first_author: "First author", year: "Year", venue: "Journal" };

const VERDICT = {
  match: { tone: "ok", icon: Check, label: "Agrees" },
  note: { tone: "warn", icon: TriangleAlert, label: "Check" },
  mismatch: { tone: "bad", icon: TriangleAlert, label: "Disagrees" },
} as const;

/**
 * Reference identity for one source: what is cited, what Crossref records, and where they differ.
 * Used in the Library and in the Claim Inspector, so both always show the same comparison.
 */
export function IdentityPanel({ source, compact }: { source: Source; compact?: boolean }) {
  const { update } = useStore();
  const [busy, setBusy] = useState(false);
  const identity = sourceIdentity(source);

  async function recheck() {
    if (!source.doi) return;
    setBusy(true);
    const outcome = await callApi<WorkRecord>(`/api/doi?doi=${encodeURIComponent(source.doi)}`);
    setBusy(false);
    const now = new Date().toISOString();
    if (outcome.ok) {
      const w = outcome.data;
      update(
        (p) => setRegistry(p, source.id, { provider: "crossref", retrievedAt: w.retrievedAt, url: w.url, record: w.record }, { status: "found", checkedAt: now }),
        `Checked “${source.cited.title}” against Crossref again.`,
      );
    } else {
      const status = outcome.kind === "not_found" ? "not_found" : "could_not_check";
      update((p) => setRegistry(p, source.id, null, { status, checkedAt: now, detail: outcome.message }), `Tried to check “${source.cited.title}” against Crossref: ${status === "not_found" ? "not found" : "could not check"}.`);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip badge={IDENTITY[identity.status]} />
        {source.doi && (
          <Button size="sm" variant="ghost" icon={RefreshCw} disabled={busy} onClick={() => void recheck()}>
            {busy ? "Checking…" : "Check against Crossref again"}
          </Button>
        )}
      </div>
      <p className="text-sm text-ink-soft">{identity.summary}</p>
      {source.testCorruption && <p className="rounded border border-bad/30 bg-bad-tint px-2.5 py-1.5 text-sm text-ink">{source.testCorruption}</p>}

      {/* In the narrow inspector, only the details that need attention are listed, stacked rather than tabulated. */}
      {compact && (
        <ul className="space-y-2">
          {identity.fields
            .filter((f) => f.verdict !== "match")
            .map((f) => {
              const v = VERDICT[f.verdict];
              return (
                <li key={f.field} className="rounded border border-line bg-canvas/60 p-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{FIELD_LABEL[f.field]}</span>
                    <Chip tone={v.tone} icon={v.icon}>
                      {v.label}
                    </Chip>
                  </div>
                  <p className="mt-1.5 break-words">
                    You cite <span className="font-medium text-ink">{f.cited}</span>. Crossref records <span className="font-medium text-ink">{f.registry}</span>.
                  </p>
                  <p className="mt-1 text-xs">{f.message}</p>
                  <Button size="sm" className="mt-2" onClick={() => update((p) => takeRegistryValue(p, source.id, f.field), `Replaced the cited ${FIELD_LABEL[f.field].toLowerCase()} of “${source.cited.title}” with Crossref's value.`)}>
                    Use Crossref&rsquo;s {FIELD_LABEL[f.field].toLowerCase()}
                  </Button>
                </li>
              );
            })}
        </ul>
      )}

      {!compact && identity.fields.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left text-xs text-ink-faint">
                <th className="py-1.5 pr-3 font-medium">Detail</th>
                <th className="py-1.5 pr-3 font-medium">You cite</th>
                <th className="py-1.5 pr-3 font-medium">Crossref records</th>
                <th className="py-1.5 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {identity.fields.map((f) => {
                const v = VERDICT[f.verdict];
                return (
                  <tr key={f.field} className="border-b border-line align-top last:border-b-0">
                    <th scope="row" className="py-2 pr-3 text-left font-medium whitespace-nowrap">
                      {FIELD_LABEL[f.field]}
                    </th>
                    <td className="py-2 pr-3 break-words">{f.cited}</td>
                    <td className="py-2 pr-3 break-words text-ink-soft">{f.registry}</td>
                    <td className="py-2">
                      <Chip tone={v.tone} icon={v.icon} title={f.message}>
                        {v.label}
                      </Chip>
                      {f.verdict !== "match" && (
                        <>
                          <p className="mt-1 max-w-56 text-xs text-ink-soft">{f.message}</p>
                          <Button size="sm" className="mt-1.5" onClick={() => update((p) => takeRegistryValue(p, source.id, f.field), `Replaced the cited ${FIELD_LABEL[f.field].toLowerCase()} of “${source.cited.title}” with Crossref's value.`)}>
                            Use Crossref&rsquo;s {FIELD_LABEL[f.field].toLowerCase()}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!compact && (
        <details className="text-sm">
          <summary className="font-medium text-ink-soft">Edit the details you cite</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_6rem]" key={`${source.id}-${source.cited.title}-${source.cited.year}-${source.cited.authors.length}-${source.cited.container}`}>
            <Field label="Title">{(id) => <TextInput id={id} defaultValue={source.cited.title} maxLength={400} onBlur={(e) => e.target.value !== source.cited.title && update((p) => updateCited(p, source.id, { title: e.target.value }), "Edited a cited title.")} />}</Field>
            <Field label="Year">
              {(id) => (
                <TextInput
                  id={id}
                  inputMode="numeric"
                  defaultValue={source.cited.year ?? ""}
                  maxLength={4}
                  onBlur={(e) => {
                    const y = e.target.value.trim() ? Number(e.target.value) : null;
                    if ((y === null || Number.isInteger(y)) && y !== source.cited.year) update((p) => updateCited(p, source.id, { year: y }), "Edited a cited year.");
                  }}
                />
              )}
            </Field>
            <Field label="Authors" hint="One per line, as Surname, Given names.">
              {(id) => (
                <TextArea
                  id={id}
                  rows={2}
                  defaultValue={authorsToText(source.cited.authors)}
                  onBlur={(e) => e.target.value !== authorsToText(source.cited.authors) && update((p) => updateCited(p, source.id, { authors: parseAuthors(e.target.value) }), "Edited cited authors.")}
                />
              )}
            </Field>
            <div />
            <Field label="Journal, site or publisher">
              {(id) => <TextInput id={id} defaultValue={source.cited.container ?? ""} maxLength={200} onBlur={(e) => e.target.value !== (source.cited.container ?? "") && update((p) => updateCited(p, source.id, { container: e.target.value || undefined }), "Edited a cited journal.")} />}
            </Field>
          </div>
        </details>
      )}
    </div>
  );
}
