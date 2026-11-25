"use client";

import { ArrowRight, BookOpen, Check, Compass, FileCheck2, FlaskConical, LayoutGrid, ListChecks, ShieldAlert, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { isEvidenceSetApproved, isPlanApproved } from "@/lib/approvals";
import { buildDemoProject, FIXTURES_FETCHED_AT } from "@/lib/demo";
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

const STEP_ICON: Record<StepId, LucideIcon> = { plan: Compass, discover: BookOpen, library: ListChecks, brief: FileCheck2 };

/* Mockup G: one strict container for every band of the page. */
function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

function stepStates(project: Project): { id: StepId; label: string; state: string; done: boolean }[] {
  const planOk = isPlanApproved(project);
  const setOk = isEvidenceSetApproved(project);
  const evaluation = evaluateExport(project);
  const { total, needsReview } = evaluation.counts;
  return [
    { id: "plan", label: "Plan", state: planOk ? "Approved" : project.plan.approvedFingerprint ? "Changed, approve again" : "Not approved yet", done: planOk },
    { id: "discover", label: "Discover", state: "Search Crossref, add by DOI", done: project.sources.length > 0 },
    {
      id: "library",
      label: "Library and evidence",
      state: `${project.sources.length} source${project.sources.length === 1 ? "" : "s"}, ${project.evidenceSet.ids.length} passage${project.evidenceSet.ids.length === 1 ? "" : "s"} chosen`,
      done: setOk,
    },
    {
      id: "brief",
      label: "Brief and export",
      state: total === 0 ? "No claims yet" : evaluation.eligible ? `${total} claim${total === 1 ? "" : "s"}, ready to export` : `${total} claim${total === 1 ? "" : "s"}, ${needsReview} to review`,
      done: evaluation.eligible,
    },
  ];
}

const NEXT_ACTION: Record<StepId, string> = {
  plan: "Approve your search plan",
  discover: "Find and save sources",
  library: "Choose and approve your evidence",
  brief: "Review your claims and export",
};

function todayLine(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function Brand() {
  return (
    <span className="flex flex-none items-center gap-2.5">
      <span aria-hidden className="orb size-7 rounded-full" />
      <span className="text-[1.0625rem] leading-none font-bold tracking-[-0.02em] text-ink">TRACE</span>
    </span>
  );
}

function Footer() {
  return (
    <Container>
      <p className="mt-14 flex flex-wrap items-center justify-center gap-x-2 border-t border-line py-6 text-[0.8125rem] text-ink-faint">
        <span className="font-semibold text-ink-soft">TRACE</span> Research you can defend. Your work stays in this browser.
      </p>
    </Container>
  );
}

function Welcome() {
  const { addProject } = useStore();
  const [question, setQuestion] = useState("");
  const now = () => new Date().toISOString();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 pt-3">
        <Container>
          <div className="glass-bar flex h-[60px] items-center justify-between rounded-[24px] border border-white/70 px-5 shadow-1">
            <Brand />
            <span className="rounded-full bg-accent-soft px-3 py-1 text-[0.8125rem] font-semibold text-accent-text">Research you can defend</span>
          </div>
        </Container>
      </header>
      <main className="animate-page-enter">
        <Container className="pt-6 sm:pt-9">
          <p className="text-[0.9375rem] text-ink-soft">{todayLine()}</p>
          <h1 className="mt-0.5 font-display text-[2.1rem] leading-[1.04] font-bold tracking-[-0.035em] text-balance sm:text-[3rem]">Research you can defend.</h1>
        </Container>

        <Container className="mt-5">
          <section className="field-band rounded-[24px] px-6 py-8 shadow-2 sm:rounded-[28px] sm:px-10 sm:py-12">
            <div className="max-w-[600px]">
              <h2 className="font-display text-[1.5rem] leading-[1.1] font-bold tracking-[-0.02em] sm:text-[2.4rem]">A real DOI does not make a claim supported.</h2>
              <p className="mt-3 max-w-[52ch] text-base text-on-field-2 sm:text-[1.0625rem]">
                Find real sources, read the evidence, decide what to use, and export a short brief in which every claim points to the passage behind it. TRACE checks the reference and the quotation separately, and leaves the decisions to you.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  type="button"
                  onClick={() => addProject(buildDemoProject(now()))}
                  className="flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[0.9375rem] font-semibold text-field shadow-1 transition-transform hover:bg-s2 active:scale-[0.98]"
                >
                  <FlaskConical aria-hidden className="size-[17px]" />
                  Open the demo project
                </button>
                <span className="text-[0.8125rem] font-medium text-on-field-2">Seven real papers, saved from Crossref on {shortDate(FIXTURES_FETCHED_AT)}</span>
              </div>
            </div>
          </section>
        </Container>

        <Container className="mt-10 grid gap-6 lg:grid-cols-12">
          <form
            className="card lift p-6 sm:p-7 lg:col-span-5"
            onSubmit={(e) => {
              e.preventDefault();
              const q = question.trim();
              if (q) addProject(emptyProject(q.length > 44 ? `${q.slice(0, 44).trimEnd()}…` : q, q, now()));
            }}
          >
            <span aria-hidden className="grid size-11 place-items-center rounded-[14px] bg-accent-soft text-accent-text">
              <Sparkles className="size-5" />
            </span>
            <h2 className="mt-4 font-display text-[1.375rem] leading-tight font-bold tracking-[-0.015em]">Start with your own question</h2>
            <label htmlFor="welcome-question" className="mt-1 block text-[0.9375rem] text-ink-soft">
              Write a question a source could answer.
            </label>
            <TextArea id="welcome-question" rows={3} className="mt-3" maxLength={400} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="For example: Does spacing study sessions improve exam results?" />
            <Button type="submit" variant="primary" className="mt-4" disabled={!question.trim()}>
              Start a project
            </Button>
          </form>

          <section className="lg:col-span-7">
            <h2 className="mb-4 font-display text-[1.375rem] leading-tight font-bold tracking-[-0.015em] sm:text-[1.5rem]">How it works</h2>
            <ol className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["plan", "Plan", "Set your question and search terms, and approve them."],
                  ["discover", "Discover", "Search Crossref, or add a source by DOI. Check a citation someone gave you."],
                  ["library", "Library and evidence", "Tag and annotate sources, then choose the passages you will work from."],
                  ["brief", "Brief and export", "Draft or write short claims, inspect each against its passage, approve, and export."],
                ] as const
              ).map(([id, title, text], i) => {
                const Icon = STEP_ICON[id];
                return (
                  <li key={title} className="card lift flex gap-3.5 rounded-[22px] p-4">
                    <span aria-hidden className="grid size-11 flex-none place-items-center rounded-[14px] bg-accent-soft text-accent-text">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.8125rem] font-semibold text-ink-faint">Step {i + 1}</span>
                      <span className="block text-base font-semibold text-ink">{title}</span>
                      <span className="mt-0.5 block text-[0.875rem] leading-relaxed text-ink-soft">{text}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-[0.8125rem] text-ink-faint">
              Your work is saved in this browser only, with no account. It is not a cloud backup. TRACE does not detect plagiarism, judge whether a source is correct, or replace your institution&rsquo;s academic-integrity rules.
            </p>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "attention" }) {
  return (
    <div className={cx("min-w-0 rounded-[16px] px-4 py-3", tone ? "bg-white text-ink" : "bg-white/[0.1]")}>
      <p className={cx("num font-display text-[1.75rem] leading-none font-bold", tone ? "text-warn" : "text-white")}>{value}</p>
      <p className={cx("mt-1.5 truncate text-[0.8125rem] font-medium", tone ? "text-ink-soft" : "text-on-field-2")}>{label}</p>
    </div>
  );
}

function ProjectView({ project, onOpenTools }: { project: Project; onOpenTools: () => void }) {
  const { deleteProject } = useStore();
  const [step, setStep] = useState<StepId>(() => (!isPlanApproved(project) ? "plan" : project.claims.length > 0 ? "brief" : "library"));
  const [inspecting, setInspecting] = useState<string | null>(null);
  const wide = useMediaQuery("(min-width: 1200px)");
  const steps = stepStates(project);
  const evaluation = evaluateExport(project);
  const next = steps.find((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;
  const inspect = (id: string) => {
    setStep("brief");
    setInspecting(id);
  };
  const showAside = wide && inspecting !== null;
  const current = steps.find((s) => s.id === step);

  return (
    <div className="min-h-dvh">

      <div className="flex items-start">
        <main className="animate-page-enter min-w-0 flex-1">
          <header className="sticky top-0 z-30 pt-3">
            <Container>
              <div className="glass-bar rounded-[24px] border border-white/70 px-3 pt-2 pb-2.5 shadow-1 sm:px-4">
              <div className="flex h-11 items-center justify-between gap-3 px-1">
                <Brand />
                <Button size="sm" icon={LayoutGrid} onClick={onOpenTools}>
                  Projects and tools
                </Button>
              </div>
              <nav aria-label="Steps" className="no-scrollbar mt-1.5 overflow-x-auto">
                <ol className="flex items-center gap-1">
                  {steps.map((s, n) => (
                    <li key={s.id} className="flex-none">
                      <button
                        type="button"
                        aria-current={step === s.id ? "step" : undefined}
                        title={s.state}
                        onClick={() => setStep(s.id)}
                        className={cx(
                          "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.875rem] font-semibold whitespace-nowrap transition-colors duration-150",
                          step === s.id ? "bg-brand text-white shadow-[0_6px_16px_rgb(75_54_83/0.22)]" : "text-ink-soft hover:bg-s2 hover:text-ink",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cx(
                            "grid size-5 place-items-center rounded-full text-[0.6875rem] font-bold",
                            step === s.id ? "bg-white/20 text-white" : s.done ? "bg-ok-tint text-ok" : "bg-s3 text-ink-soft",
                          )}
                        >
                          {s.done ? <Check className="size-3" strokeWidth={3} /> : n + 1}
                        </span>
                        {s.label}
                        <span className="sr-only">: {s.state}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
              </div>
            </Container>
          </header>
          <Container className="pt-5 sm:pt-7">
            {project.kind === "trap" && (
              <Notice tone="bad" icon={ShieldAlert} className="mb-5" role="note">
                <strong className="font-semibold">Citation-trap test copy.</strong> Two items in this project were deliberately corrupted to show the checks working: one reference&rsquo;s details, and one quotation. They are test cases, not research findings.{" "}
                <button type="button" className="font-semibold underline underline-offset-2" onClick={() => deleteProject(project.id)}>
                  Delete this test copy
                </button>
              </Notice>
            )}
            {project.kind === "demo" && (
              <Notice tone="neutral" icon={FlaskConical} className="mb-5" role="note">
                Demo project. The sources and abstracts are real Crossref records saved on {shortDate(FIXTURES_FETCHED_AT)}. Any sample output is labelled where it appears.
              </Notice>
            )}

            <p className="text-[0.9375rem] text-ink-soft">
              {todayLine()} <span aria-hidden>·</span> {project.name}
            </p>
            <h1 className="mt-0.5 max-w-4xl font-display text-[1.6rem] leading-[1.12] font-bold tracking-[-0.03em] text-balance sm:text-[2.25rem]">
              {project.question.trim() || <span className="text-ink-faint">No question yet. Write one in the Plan step.</span>}
            </h1>
          </Container>

          <Container className="mt-5">
            <section aria-label="Project summary" className="field-band rounded-[24px] p-5 shadow-2 sm:rounded-[28px] sm:p-7">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-[0.8125rem] font-semibold text-on-field-2">
                    <span className="num">{doneCount} of 4</span> steps done
                  </p>
                  <span aria-hidden className="mt-2 block h-1.5 w-full max-w-sm rounded-full bg-white/15">
                    <span className="block h-full rounded-full bg-white transition-[width] duration-500 ease-out" style={{ width: `${(doneCount / 4) * 100}%` }} />
                  </span>
                  <p className="mt-4 font-display text-[1.25rem] leading-tight font-bold tracking-[-0.015em] sm:text-[1.6rem]">
                    {next ? NEXT_ACTION[next.id] : "Your brief is reviewed and ready to export"}
                  </p>
                  <p className="mt-1 text-[0.9375rem] text-on-field-2">{next ? next.state : evaluation.summary}</p>
                  {(next ? next.id !== step : step !== "brief") && (
                    <button
                      type="button"
                      onClick={() => setStep(next ? next.id : "brief")}
                      className="mt-4 flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[0.9375rem] font-semibold text-field transition-transform hover:bg-s2 active:scale-[0.98]"
                    >
                      {next ? `Go to ${next.label}` : "Go to Brief and export"} <ArrowRight aria-hidden className="size-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-[32rem]">
                  <Stat label="Sources" value={project.sources.length} />
                  <Stat label="Passages" value={project.evidenceSet.ids.length} />
                  <Stat label="Claims" value={evaluation.counts.total} />
                  <Stat label="Need review" value={evaluation.counts.needsReview} tone={evaluation.counts.needsReview > 0 ? "attention" : undefined} />
                </div>
              </div>
            </section>
          </Container>

          <Container className="mt-8">
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="font-display text-[1.5rem] leading-tight font-bold tracking-[-0.015em] sm:text-[1.75rem]">{current?.label}</h2>
              <span className="rounded-full bg-s2 px-2.5 py-1 text-[0.8125rem] font-semibold text-ink-soft">{current?.state}</span>
            </div>
            <div key={step} className="animate-page-enter">
              {step === "plan" && <PlanStep onApproved={() => setStep(project.sources.length ? "library" : "discover")} />}
              {step === "discover" && <DiscoverStep goToPlan={() => setStep("plan")} />}
              {step === "library" && <LibraryStep goToDiscover={() => setStep("discover")} goToBrief={() => setStep("brief")} />}
              {step === "brief" && <BriefStep inspectingId={inspecting} onInspect={inspect} goToLibrary={() => setStep("library")} goToPlan={() => setStep("plan")} />}
            </div>
          </Container>
          <Footer />
        </main>

        {showAside && inspecting && (
          <aside aria-label="Claim Inspector" className="thin-scroll sticky top-3 my-3 mr-4 h-[calc(100dvh-1.5rem)] w-[27rem] shrink-0 overflow-y-auto rounded-[24px] border border-line bg-surface shadow-2">
            <ClaimInspector key={inspecting} claimId={inspecting} onClose={() => setInspecting(null)} />
          </aside>
        )}
      </div>
      {!wide && (
        <Drawer open={inspecting !== null} side="right" label="Claim Inspector" onClose={() => setInspecting(null)}>
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
          <p className="text-sm text-ink-faint">Opening your workspace…</p>
        </div>
      </div>
    );
  }

  const problem = storageProblem && (
    <Container className="pt-4">
      <Notice tone="warn" icon={TriangleAlert} role="alert">
        {storageProblem === "version"
          ? "The work saved in this browser was made by a different version of TRACE and could not be opened."
          : "The work saved in this browser was damaged and could not be opened."}{" "}
        It was set aside, not deleted, and TRACE started fresh. If you have a backup file, restore it from Projects and tools.{" "}
        <button type="button" className="font-semibold underline underline-offset-2" onClick={dismissStorageProblem}>
          Dismiss
        </button>
      </Notice>
    </Container>
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
