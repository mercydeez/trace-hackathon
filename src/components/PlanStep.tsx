"use client";

import { Check, RotateCcw, Wand2, X } from "lucide-react";
import { useState } from "react";
import { isPlanApproved } from "@/lib/approvals";
import { approvePlan, setPlan, setRules, setQuestion } from "@/lib/mutations";
import { MAX_TERMS, suggestTerms } from "@/lib/plan";
import { useProject, useStore } from "./store";
import { Button, Field, Select, shortDate, TextArea, TextInput } from "./ui";

function yearOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() && Number.isInteger(n) && n >= 1500 && n <= 2100 ? n : null;
}

export function PlanStep({ onApproved }: { onApproved: () => void }) {
  const project = useProject();
  const { update } = useStore();
  const { plan, rules } = project;
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
    <div className="max-w-[720px]">
      <div className="card divide-y divide-line">
        <section className="p-6">
          <h2 className="text-xl font-bold tracking-[-0.02em]">Question</h2>
          <p className="mt-1 text-sm text-ink-soft">Write it as a question a source could answer.</p>
          <label htmlFor="plan-question" className="sr-only">
            Question
          </label>
          <TextArea id="plan-question" rows={2} maxLength={400} className="mt-4 text-lg" value={project.question} onChange={(e) => update((p) => setQuestion(p, e.target.value))} />
        </section>

        <section className="p-6">
          <h2 className="text-xl font-bold tracking-[-0.02em]">Search plan</h2>
          <p className="mt-1 text-sm text-ink-soft">Suggested by a simple rule from your question, not by AI. Edit freely.</p>

          <p className="mt-6 mb-2 text-sm font-semibold">Search terms</p>
          <ul className="flex flex-wrap gap-2" aria-label="Search terms">
            {plan.terms.map((t) => (
              <li key={t} className="inline-flex h-8 items-center gap-1 rounded-full bg-s2 pr-1 pl-3 text-sm font-medium">
                {t}
                <button type="button" aria-label={`Remove term ${t}`} className="grid size-6 place-items-center rounded-full text-ink-soft hover:bg-s3 hover:text-ink" onClick={() => update((p) => setPlan(p, { terms: p.plan.terms.filter((x) => x !== t) }))}>
                  <X aria-hidden className="size-3.5" />
                </button>
              </li>
            ))}
            {plan.terms.length === 0 && <li className="text-sm text-ink-soft">No terms yet. Add one, or suggest terms from the question.</li>}
          </ul>
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addTerm();
            }}
          >
            <div className="w-56">
              <TextInput aria-label="Add a search term" placeholder="Add a term" value={term} maxLength={40} onChange={(e) => setTerm(e.target.value)} />
            </div>
            <Button type="submit" disabled={!term.trim() || plan.terms.length >= MAX_TERMS}>
              Add term
            </Button>
            <Button variant="ghost" icon={Wand2} disabled={!project.question.trim()} onClick={() => update((p) => setPlan(p, { terms: suggestTerms(p.question) }))}>
              Suggest terms from the question
            </Button>
          </form>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-sm">
            <Field label="Published from">
              {(id) => <TextInput id={id} inputMode="numeric" placeholder="Any year" defaultValue={plan.yearFrom ?? ""} key={`from-${plan.yearFrom}`} onBlur={(e) => update((p) => setPlan(p, { yearFrom: yearOrNull(e.target.value) }))} />}
            </Field>
            <Field label="Published to">
              {(id) => <TextInput id={id} inputMode="numeric" placeholder="Any year" defaultValue={plan.yearTo ?? ""} key={`to-${plan.yearTo}`} onBlur={(e) => update((p) => setPlan(p, { yearTo: yearOrNull(e.target.value) }))} />}
            </Field>
          </div>

          <Field label="Scope note" hint="What you will and will not look at. It stays in your project and is not sent anywhere." className="mt-6">
            {(id) => <TextArea id={id} rows={2} maxLength={500} placeholder="For example: studies with students; exclude animal research." value={plan.scopeNote} onChange={(e) => update((p) => setPlan(p, { scopeNote: e.target.value }))} />}
          </Field>
        </section>

        <section className="p-6">
          <h2 className="text-xl font-bold tracking-[-0.02em]">Rules in force</h2>
          <p className="mt-1 text-sm text-ink-soft">Set these to match your assignment or your institution&rsquo;s AI policy. TRACE enforces them at export and lists them in the AI-use disclosure.</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <Field label="AI drafting">
              {(id) => (
                <Select id={id} value={rules.aiDrafting} onChange={(e) => update((p) => setRules(p, { aiDrafting: e.target.value === "off" ? "off" : "approved_evidence" }), "Changed the AI drafting rule.")}>
                  <option value="approved_evidence">Allowed, from approved passages only</option>
                  <option value="off">Off: I write every claim myself</option>
                </Select>
              )}
            </Field>
            <Field label="Oldest publication year allowed" hint="Leave blank for no limit.">
              {(id) => (
                <TextInput
                  id={id}
                  inputMode="numeric"
                  placeholder="No limit"
                  defaultValue={rules.minYear ?? ""}
                  key={`min-${rules.minYear}`}
                  onBlur={(e) => {
                    const y = yearOrNull(e.target.value);
                    if (y !== rules.minYear) update((p) => setRules(p, { minYear: y }), "Changed the publication-year rule.");
                  }}
                />
              )}
            </Field>
          </div>
          <label className="mt-6 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-[#4b3653]" checked={rules.blockRetracted} onChange={(e) => update((p) => setRules(p, { blockRetracted: e.target.checked }), "Changed the retracted-sources rule.")} />
            <span>
              <span className="font-semibold">Block retracted sources</span>
              <span className="block text-ink-soft">A claim that cites a retracted paper cannot be exported as reviewed.</span>
            </span>
          </label>
        </section>
      </div>

      <div className="float sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl px-6 py-4">
        <div className="min-w-0 flex-1 basis-64 text-sm" role="status">
          {approved ? (
            <p className="flex items-start gap-2 text-ok">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                You approved this plan on {shortDate(plan.approvedAt)}. <span className="text-ink-soft">Changing the question, terms or years asks for approval again.</span>
              </span>
            </p>
          ) : everApproved ? (
            <p className="flex items-start gap-2 text-warn">
              <RotateCcw aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>The question or scope changed after you approved the plan. Approve it again; your evidence set and claims will need another look.</span>
            </p>
          ) : (
            <p className="text-ink-soft">{canApprove ? "Search and drafting use this plan. Approve it when it says what you mean." : "Add a question and at least one search term first."}</p>
          )}
        </div>
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
      </div>
    </div>
  );
}