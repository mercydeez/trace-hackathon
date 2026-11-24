"use client";

import { Check, RotateCcw, Wand2, X } from "lucide-react";
import { useState } from "react";
import { isPlanApproved } from "@/lib/approvals";
import { approvePlan, setPlan, setQuestion } from "@/lib/mutations";
import { MAX_TERMS, suggestTerms } from "@/lib/plan";
import { useProject, useStore } from "./store";
import { Button, Field, Notice, SectionTitle, shortDate, TextArea, TextInput } from "./ui";

function yearOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() && Number.isInteger(n) && n >= 1500 && n <= 2100 ? n : null;
}

export function PlanStep({ onApproved }: { onApproved: () => void }) {
  const project = useProject();
  const { update } = useStore();
  const { plan } = project;
  const [term, setTerm] = useState("");
  const approved = isPlanApproved(project);
  const everApproved = plan.approvedFingerprint !== null;
  const canApprove = project.question.trim().length > 0 && plan.terms.length > 0;

  function addTerm() {
    const t = term.trim().toLowerCase();
    if (!t || plan.terms.includes(t) || plan.terms.length >= MAX_TERMS) return setTerm("");
    update((p) => setPlan(p, { terms: [...p.plan.terms, t] }));
    setTerm("");
  }

  return (
    <div className="max-w-3xl space-y-7">
      <section>
        <SectionTitle>Your research question</SectionTitle>
        <Field label="Question" hint="Write it as a question a source could answer.">
          {(id) => (
            <TextArea id={id} rows={2} maxLength={400} className="font-serif text-lg" value={project.question} onChange={(e) => update((p) => setQuestion(p, e.target.value))} />
          )}
        </Field>
      </section>

      <section>
        <SectionTitle aside="Suggested by a simple rule, not by AI. Edit freely.">Search plan</SectionTitle>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-[0.8125rem] font-medium">Search terms</p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Search terms">
              {plan.terms.map((t) => (
                <li key={t} className="inline-flex items-center gap-1 rounded-sm border border-line-strong bg-surface py-0.5 pr-0.5 pl-2 text-sm">
                  {t}
                  <button type="button" aria-label={`Remove term ${t}`} className="rounded-sm p-0.5 text-ink-faint hover:bg-ink/10 hover:text-ink" onClick={() => update((p) => setPlan(p, { terms: p.plan.terms.filter((x) => x !== t) }))}>
                    <X aria-hidden className="size-3.5" />
                  </button>
                </li>
              ))}
              {plan.terms.length === 0 && <li className="text-sm text-ink-faint">No terms yet. Add one, or suggest terms from the question.</li>}
            </ul>
            <form
              className="mt-2 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addTerm();
              }}
            >
              <TextInput aria-label="Add a search term" placeholder="Add a term" className="max-w-56" value={term} maxLength={40} onChange={(e) => setTerm(e.target.value)} />
              <Button type="submit" size="sm" disabled={!term.trim() || plan.terms.length >= MAX_TERMS}>
                Add term
              </Button>
              <Button size="sm" variant="ghost" icon={Wand2} disabled={!project.question.trim()} onClick={() => update((p) => setPlan(p, { terms: suggestTerms(p.question) }))}>
                Suggest terms from the question
              </Button>
            </form>
          </div>

          <div className="flex flex-wrap gap-4">
            <Field label="Published from (year)" className="w-40">
              {(id) => <TextInput id={id} inputMode="numeric" placeholder="Any" defaultValue={plan.yearFrom ?? ""} key={`from-${plan.yearFrom}`} onBlur={(e) => update((p) => setPlan(p, { yearFrom: yearOrNull(e.target.value) }))} />}
            </Field>
            <Field label="Published to (year)" className="w-40">
              {(id) => <TextInput id={id} inputMode="numeric" placeholder="Any" defaultValue={plan.yearTo ?? ""} key={`to-${plan.yearTo}`} onBlur={(e) => update((p) => setPlan(p, { yearTo: yearOrNull(e.target.value) }))} />}
            </Field>
          </div>

          <Field label="Scope note" hint="What you will and will not look at. This stays in your project; it is not sent anywhere.">
            {(id) => <TextArea id={id} rows={2} maxLength={500} placeholder="For example: studies with students; exclude animal research." value={plan.scopeNote} onChange={(e) => update((p) => setPlan(p, { scopeNote: e.target.value }))} />}
          </Field>
        </div>
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        {approved ? (
          <Notice tone="ok" icon={Check} role="status">
            You approved this plan on {shortDate(plan.approvedAt)}. Changing the question, terms or years will ask for approval again and mark the evidence set and claims for another look.
          </Notice>
        ) : everApproved ? (
          <Notice tone="warn" icon={RotateCcw} role="status">
            The question or scope changed after you approved the plan. Approve it again. Your evidence set and claims will also need another look.
          </Notice>
        ) : (
          <p className="text-sm text-ink-soft">Searching and drafting use this plan. Approve it when the question and terms say what you mean.</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            icon={Check}
            disabled={approved || !canApprove}
            onClick={() => {
              update((p) => approvePlan(p, new Date().toISOString()), "Approved the search plan.");
              onApproved();
            }}
          >
            {approved ? "Plan approved" : "Approve plan"}
          </Button>
          {!canApprove && <span className="text-sm text-ink-faint">Add a question and at least one search term first.</span>}
        </div>
      </section>
    </div>
  );
}
