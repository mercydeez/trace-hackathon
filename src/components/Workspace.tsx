"use client";

import { Check, FlaskConical, LayoutGrid, ShieldAlert, TriangleAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import { isEvidenceSetApproved, isPlanApproved } from "@/lib/approvals";
import { buildDemoProject, demoSourcesAndEvidence, FIXTURES_FETCHED_AT } from "@/lib/demo";
import { checkExcerpt } from "@/lib/excerpt";
import { evaluateExport } from "@/lib/exportPolicy";
import { emptyProject } from "@/lib/mutations";
import type { Project } from "@/lib/types";
import { BriefStep } from "./BriefStep";
import { ClaimInspector } from "./ClaimInspector";
import { DiscoverStep } from "./DiscoverStep";
import { LibraryStep } from "./LibraryStep";
import { PlanStep } from "./PlanStep";
import { Sidebar } from "./Sidebar";
import { StoreProvider, useStore } from "./store";
import { Button, cx, Drawer, Notice, shortDate, TextArea, useMediaQuery } from "./ui";

type StepId = "plan" | "discover" | "library" | "brief";

interface StepState {
  id: StepId;
  label: string;
  short: string;
  state: string;
  done: boolean;
}

function stepStates(project: Project): StepState[] {
  const planOk = isPlanApproved(project);
  const setOk = isEvidenceSetApproved(project);
  const evaluation = evaluateExport(project);
  const { total } = evaluation.counts;
  const open = evaluation.blockers.length;
  const s = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return [
    { id: "plan", label: "Plan", short: "Plan", state: planOk ? "Approved" : project.plan.approvedFingerprint ? "Changed, approve again" : "Not approved yet", done: planOk },
    { id: "discover", label: "Discover", short: "Find", state: "Search Crossref, add by DOI", done: project.sources.length > 0 },
    {
      id: "library",
      label: "Library and evidence",
      short: "Library",
      state: `${s(project.sources.length, "source")}, ${s(project.evidenceSet.ids.length, "passage")} chosen`,
      done: setOk,
    },
    {
      id: "brief",
      label: "Brief and export",
      short: "Brief",
      state: total === 0 ? "No claims yet" : evaluation.eligible ? `${s(total, "claim")}, ready to export` : `${s(total, "claim")}, ${open} to resolve`,
      done: evaluation.eligible,
    },
  ];
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <span className="flex flex-none items-center gap-2">
      <span aria-hidden className="orb size-6 rounded-full" />
      <span className={cx("text-base font-bold tracking-[-0.02em] text-ink", compact && "lg:sr-only")}>TRACE</span>
    </span>
  );
}

// --- Welcome -------------------------------------------------------------------------------

/* The trap, computed live from the demo fixture by the same function the workspace uses. */
function TrapPreview() {
  const result = useMemo(() => {
    const ev = demoSourcesAndEvidence(new Date(0).toISOString()).evidence.find((e) => e.id === "ev_demo_1");
    const real = "Students then took a final retention test 5 min, 2 days, or 1 week later.";
    const altered = "Students then took a final retention test 5 min, 2 days, or 1 month later.";
    return { ok: checkExcerpt(real, ev?.text).status === "matched", bad: checkExcerpt(altered, ev?.text).status === "mismatch" };
  }, []);
  return (
    <figure className="float rounded-xl p-6">
      <figcaption className="text-sm text-ink-soft">Roediger &amp; Karpicke (2006), abstract as stored from Crossref</figcaption>
      <ul className="mt-4 space-y-3">
        <li className="rounded-lg bg-ok-tint/70 p-4">
          <p className="text-base leading-relaxed text-ink">&ldquo;Students then took a final retention test 5 min, 2 days, or 1 week later.&rdquo;</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-ok">
            <Check aria-hidden className="size-4" /> {result.ok ? "Found in the stored abstract" : "Check unavailable"}
          </p>
        </li>
        <li className="rounded-lg bg-bad-tint/70 p-4">
          <p className="text-base leading-relaxed text-ink">
            &ldquo;Students then took a final retention test 5 min, 2 days, or 1 <span className="rounded bg-bad/15 px-0.5 font-semibold">month</span> later.&rdquo;
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-bad">
            <X aria-hidden className="size-4" /> {result.bad ? "Not in the stored abstract" : "Check unavailable"}
          </p>
        </li>
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">The paper is real. One changed word makes the quotation false, and TRACE blocks the brief until it is fixed. Checked just now, in your browser, by the same code the workspace uses.</p>
    </figure>
  );
}

function Welcome() {
  const { addProject } = useStore();
  const [question, setQuestion] = useState("");
  const now = () => new Date().toISOString();
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <Brand />
      </header>
      <main className="animate-page-enter mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="grid items-center gap-12 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:pt-16">
          <div>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-[-0.035em] text-balance sm:text-6xl">Research you can defend.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              A real DOI does not make a claim supported. TRACE finds real sources, keeps the passage behind every claim, checks the two separately, and leaves every decision to you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="primary" icon={FlaskConical} onClick={() => addProject(buildDemoProject(now()))}>
                Open the demo project
              </Button>
              <span className="text-sm text-ink-soft">Seven real papers, saved from Crossref on {shortDate(FIXTURES_FETCHED_AT)}</span>
            </div>
          </div>
          <TrapPreview />
        </section>

        <section className="mt-24 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.02em]">How it works</h2>
            <ol className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {[
                ["Plan", "Write your question, edit the search terms, and approve them."],
                ["Discover", "Search Crossref, add a source by DOI, or check a citation someone gave you."],
                ["Library and evidence", "Tag and annotate sources, then choose the passages you will work from."],
                ["Brief and export", "Draft or write short claims, inspect each against its passage, approve, and export."],
              ].map(([title, text], i) => (
                <li key={title} className="grid grid-cols-[2rem_1fr] gap-x-3">
                  <span aria-hidden className="grid size-8 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent-text">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-base font-semibold text-ink">{title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <form
            className="card p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const q = question.trim();
              if (q) addProject(emptyProject(q.length > 44 ? `${q.slice(0, 44).trimEnd()}…` : q, q, now()));
            }}
          >
            <h2 className="text-xl font-bold tracking-[-0.02em]">Start with your own question</h2>
            <label htmlFor="welcome-question" className="mt-2 block text-sm text-ink-soft">
              Write a question a source could answer.
            </label>
            <TextArea id="welcome-question" rows={3} className="mt-4" maxLength={400} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="For example: Does spacing study sessions improve exam results?" />
            <Button type="submit" variant="primary" className="mt-4" disabled={!question.trim()}>
              Start a project
            </Button>
          </form>
        </section>

        <p className="mt-24 border-t border-line pt-6 text-sm leading-relaxed text-ink-soft">
          Your work is saved in this browser only, with no account. It is not a cloud backup. TRACE does not detect plagiarism, judge whether a source is correct, or replace your institution&rsquo;s academic-integrity rules.
        </p>
      </main>
    </div>
  );
}

// --- Project workspace ---------------------------------------------------------------------

function StepNav({ steps, step, compact, onSelect }: { steps: StepState[]; step: StepId; compact: boolean; onSelect: (id: StepId) => void }) {
  return (
    <nav aria-label="Steps">
      <ol className="grid grid-cols-4 gap-1 lg:grid-cols-1">
        {steps.map((s, n) => {
          const active = step === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(s.id)}
                className={cx(
                  "relative flex w-full items-center gap-3 rounded-lg text-left transition-colors duration-150",
                  "max-lg:flex-col max-lg:gap-1 max-lg:px-1 max-lg:py-2",
                  compact ? "lg:justify-center lg:p-2" : "lg:px-3 lg:py-2",
                  active ? "bg-brand text-white" : "text-ink hover:bg-s2",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                    active ? "bg-white/20 text-white" : s.done ? "bg-ok-tint text-ok" : "bg-s3 text-ink-soft",
                  )}
                >
                  {s.done ? <Check className="size-3.5" strokeWidth={3} /> : n + 1}
                </span>
                <span aria-hidden className="text-xs font-semibold lg:hidden">
                  {s.short}
                </span>
                <span className={cx("min-w-0 max-lg:sr-only", compact && "lg:sr-only")}>
                  <span className="block text-sm font-semibold">{s.label}</span>
                  <span className={cx("line-clamp-2 block text-xs leading-snug", active ? "text-white/75" : "text-ink-soft")}>
                    <span className="sr-only">: </span>
                    {s.state}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ProjectView({ project, onOpenTools }: { project: Project; onOpenTools: () => void }) {
  const { deleteProject, status } = useStore();
  const [step, setStep] = useState<StepId>(() => (!isPlanApproved(project) ? "plan" : project.claims.length > 0 ? "brief" : "library"));
  const [inspecting, setInspecting] = useState<string | null>(null);
  const inspectorColumn = useMediaQuery("(min-width: 1200px)");
  const roomy = useMediaQuery("(min-width: 1440px)");
  const steps = stepStates(project);
  const current = steps.find((s) => s.id === step) ?? steps[0]!;
  const position = steps.findIndex((s) => s.id === step) + 1;
  const showAside = inspectorColumn && inspecting !== null;
  const compactRail = showAside && !roomy;
  const inspect = (id: string) => {
    setStep("brief");
    setInspecting(id);
  };

  return (
    <div
      className={cx(
        "grid min-h-dvh grid-cols-1",
        !showAside && "lg:grid-cols-[248px_minmax(0,1fr)]",
        showAside && (compactRail ? "lg:grid-cols-[72px_minmax(0,1fr)_400px]" : "lg:grid-cols-[248px_minmax(0,1fr)_400px]"),
      )}
    >
      <aside aria-label="Project" className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur lg:h-dvh lg:overflow-y-auto lg:border-r lg:border-b-0 lg:bg-surface">
        <div className={cx("flex flex-col gap-3 px-4 py-3 lg:h-full lg:gap-6 lg:py-6", compactRail ? "lg:px-3" : "lg:px-5")}>
          <div className={cx("flex items-center justify-between gap-2 lg:flex-col lg:items-stretch lg:gap-4", compactRail && "lg:items-center")}>
            <Brand compact={compactRail} />
            <Button size="sm" variant="ghost" icon={LayoutGrid} onClick={onOpenTools} aria-label={compactRail ? "Projects and tools" : undefined} className={cx("lg:justify-start", compactRail ? "lg:px-2" : "lg:-mx-3")}>
              <span className={cx(compactRail && "lg:sr-only")}>Projects and tools</span>
            </Button>
          </div>

          {!compactRail && (
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-ink">{project.name}</p>
              {project.kind !== "user" && (
                <span className={cx("mt-2 inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold", project.kind === "trap" ? "bg-bad-tint text-bad" : "bg-s2 text-ink-soft")}>
                  {project.kind === "trap" ? "Citation-trap test copy" : "Demo project"}
                </span>
              )}
            </div>
          )}

          <StepNav steps={steps} step={step} compact={compactRail} onSelect={setStep} />

          {!compactRail && (
            <div className="mt-auto hidden border-t border-line pt-4 text-xs leading-relaxed text-ink-soft lg:block">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <span aria-hidden className={cx("size-2 rounded-full", status?.ai.configured ? "bg-ok" : "bg-ink-faint/50")} />
                {status === null ? "Checking live AI…" : status.ai.configured ? "Live AI drafting on" : "Live AI not configured"}
              </p>
              {status?.ai.configured && <p className="mt-1 break-all">{status.ai.model}</p>}
              <p className="mt-2">Saved in this browser only.</p>
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0">
        <header className="border-b border-line bg-surface px-4 py-4 sm:px-8 lg:py-6">
          <p className="text-sm text-ink-soft">
            Step {position} of 4 <span aria-hidden>·</span> <span className="font-semibold text-ink">{current.label}</span> <span aria-hidden>·</span> {current.state}
          </p>
          <h1 className="mt-1 line-clamp-2 max-w-4xl text-xl leading-snug font-bold tracking-[-0.02em] text-ink sm:text-2xl">
            {project.question.trim() || <span className="text-ink-faint">No question yet. Write one in the Plan step.</span>}
          </h1>
          {project.kind === "trap" && (
            <Notice tone="bad" icon={ShieldAlert} className="mt-4" role="note">
              <strong className="font-semibold">Citation-trap test copy.</strong> One reference&rsquo;s details and one quotation were deliberately corrupted to show the checks working. They are test cases, not research findings.{" "}
              <button type="button" className="font-semibold underline underline-offset-2" onClick={() => deleteProject(project.id)}>
                Delete this test copy
              </button>
            </Notice>
          )}
          {project.kind === "demo" && (
            <p role="note" className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
              <FlaskConical aria-hidden className="size-4 shrink-0" />
              Demo project: real Crossref records saved on {shortDate(FIXTURES_FETCHED_AT)}. Any sample output is labelled where it appears.
            </p>
          )}
        </header>

        <div key={step} className="animate-page-enter px-4 py-6 sm:px-8 sm:py-8">
          {step === "plan" && <PlanStep onApproved={() => setStep(project.sources.length ? "library" : "discover")} />}
          {step === "discover" && <DiscoverStep goToPlan={() => setStep("plan")} />}
          {step === "library" && <LibraryStep goToDiscover={() => setStep("discover")} goToBrief={() => setStep("brief")} />}
          {step === "brief" && <BriefStep inspectingId={inspecting} onInspect={inspect} goToLibrary={() => setStep("library")} goToPlan={() => setStep("plan")} />}
        </div>
      </main>

      {showAside && inspecting && (
        <aside aria-label="Claim Inspector" className="thin-scroll sticky top-0 h-dvh overflow-y-auto border-l border-line bg-surface">
          <ClaimInspector key={inspecting} claimId={inspecting} onClose={() => setInspecting(null)} />
        </aside>
      )}
      {!inspectorColumn && (
        <Drawer open={inspecting !== null} side="right" label="Claim Inspector" bare onClose={() => setInspecting(null)}>
          {inspecting && <ClaimInspector key={inspecting} claimId={inspecting} onClose={() => setInspecting(null)} />}
        </Drawer>
      )}
    </div>
  );
}

function Shell() {
  const { ready, project, state, storageProblem, dismissStorageProblem } = useStore();
  const [menu, setMenu] = useState(false);

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status">
        <div className="flex flex-col items-center gap-3">
          <Brand />
          <p className="text-sm text-ink-soft">Opening your workspace…</p>
        </div>
      </div>
    );
  }

  const problem = storageProblem && (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
      <Notice tone="warn" icon={TriangleAlert} role="alert">
        {storageProblem === "version"
          ? "The work saved in this browser was made by a different version of TRACE and could not be opened."
          : "The work saved in this browser was damaged and could not be opened."}{" "}
        It was set aside, not deleted, and TRACE started fresh. If you have a backup file, restore it from Projects and tools.{" "}
        <button type="button" className="font-semibold underline underline-offset-2" onClick={dismissStorageProblem}>
          Dismiss
        </button>
      </Notice>
    </div>
  );

  if (state.projects.length === 0 || !project) {
    return (
      <>
        {problem}
        <Welcome />
      </>
    );
  }

  return (
    <>
      {problem}
      <ProjectView key={project.id} project={project} onOpenTools={() => setMenu(true)} />
      <Drawer open={menu} side="left" label="Projects and tools" onClose={() => setMenu(false)}>
        <Sidebar onNavigate={() => setMenu(false)} />
      </Drawer>
    </>
  );
}

export function Workspace() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
