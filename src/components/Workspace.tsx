"use client";

import { Check, FlaskConical, Menu, ShieldAlert, TriangleAlert } from "lucide-react";
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

function Welcome() {
  const { addProject } = useStore();
  const [question, setQuestion] = useState("");
  const now = () => new Date().toISOString();
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
      <p className="font-serif text-2xl font-semibold tracking-tight text-brand-deep">TRACE</p>
      <h1 className="mt-6 font-serif text-4xl leading-[1.12] font-medium text-balance text-ink sm:text-5xl">Research you can defend.</h1>
      <p className="mt-5 max-w-prose font-serif text-lg leading-relaxed text-ink-soft">
        Find real sources, read the evidence, decide what to use, and export a short brief in which every claim points to the passage behind it. A real DOI does not make a claim supported, so TRACE checks the two separately and leaves the decisions to you.
      </p>

      <div className="mt-9 grid gap-6 sm:grid-cols-2">
        <section className="rounded border border-line-strong bg-surface p-5">
          <h2 className="font-serif text-xl font-medium">Try the demo project</h2>
          <p className="mt-1.5 text-sm text-ink-soft">
            Seven real papers on retrieval practice and rereading, saved from Crossref on {shortDate(FIXTURES_FETCHED_AT)}. Nothing is approved yet: you walk through the steps yourself.
          </p>
          <Button variant="primary" icon={FlaskConical} className="mt-4" onClick={() => addProject(buildDemoProject(now()))}>
            Open the demo project
          </Button>
        </section>
        <form
          className="rounded border border-line-strong bg-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const q = question.trim();
            if (q) addProject(emptyProject(q.length > 44 ? `${q.slice(0, 44).trimEnd()}…` : q, q, now()));
          }}
        >
          <h2 className="font-serif text-xl font-medium">Start with your own question</h2>
          <label htmlFor="welcome-question" className="mt-1.5 block text-sm text-ink-soft">
            Write a question a source could answer.
          </label>
          <TextArea id="welcome-question" rows={2} className="mt-2" maxLength={400} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="For example: Does spacing study sessions improve exam results?" />
          <Button type="submit" className="mt-3" disabled={!question.trim()}>
            Start a project
          </Button>
        </form>
      </div>

      <ol className="mt-10 grid gap-x-8 gap-y-4 text-sm text-ink-soft sm:grid-cols-2">
        {[
          ["Plan", "Set your question and search terms, and approve them."],
          ["Discover", "Search Crossref, or add a source by DOI. Check a citation someone gave you."],
          ["Library and evidence", "Tag and annotate sources, then choose the passages you will work from."],
          ["Brief and export", "Draft or write short claims, inspect each one against its passage, approve, and export with references and an AI-use disclosure."],
        ].map(([title, text], i) => (
          <li key={title} className="grid grid-cols-[1.5rem_1fr] gap-x-2">
            <span aria-hidden className="font-serif text-lg text-ink-faint">
              {i + 1}
            </span>
            <span>
              <span className="font-medium text-ink">{title}.</span> {text}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-10 border-t border-line pt-4 text-xs text-ink-faint">
        Your work is saved in this browser only, with no account. It is not a cloud backup. TRACE does not detect plagiarism, judge whether a source is correct, or replace your institution&rsquo;s academic-integrity rules.
      </p>
    </main>
  );
}

function ProjectView({ project }: { project: Project }) {
  const { deleteProject } = useStore();
  const [step, setStep] = useState<StepId>(() => (!isPlanApproved(project) ? "plan" : project.claims.length > 0 ? "brief" : "library"));
  const [inspecting, setInspecting] = useState<string | null>(null);
  const wide = useMediaQuery("(min-width: 1200px)");
  const steps = stepStates(project);
  const inspect = (id: string) => {
    setStep("brief");
    setInspecting(id);
  };
  const showAside = wide && inspecting !== null;

  return (
    <div className="flex min-w-0 flex-1">
      <main className="min-w-0 flex-1 px-5 pt-5 pb-16 sm:px-8 lg:px-10">
        {project.kind === "trap" && (
          <Notice tone="bad" icon={ShieldAlert} className="mb-5" role="note">
            <strong className="font-semibold">Citation-trap test copy.</strong> Two items in this project were deliberately corrupted to show the checks working: one reference&rsquo;s details, and one quotation. They are test cases, not research findings.{" "}
            <button type="button" className="font-medium underline underline-offset-2" onClick={() => deleteProject(project.id)}>
              Delete this test copy
            </button>
          </Notice>
        )}
        {project.kind === "demo" && (
          <Notice tone="neutral" icon={FlaskConical} className="mb-5" role="note">
            Demo project. The sources and abstracts are real Crossref records saved on {shortDate(FIXTURES_FETCHED_AT)}. Any sample output is labelled where it appears.
          </Notice>
        )}

        <header>
          <p className="text-xs text-ink-faint">Research question</p>
          <h1 className="mt-0.5 max-w-4xl font-serif text-2xl leading-snug font-medium text-balance text-ink sm:text-[1.75rem]">
            {project.question.trim() || <span className="text-ink-faint">No question yet. Write one in the Plan step.</span>}
          </h1>
        </header>

        <nav aria-label="Steps" className="mt-5 mb-8 border-y border-line-strong">
          <ol className="grid grid-cols-2 md:grid-cols-4">
            {steps.map((s, n) => (
              <li key={s.id} className="border-line max-md:odd:border-r max-md:[&:nth-child(-n+2)]:border-b md:border-r md:last:border-r-0">
                <button
                  type="button"
                  aria-current={step === s.id ? "step" : undefined}
                  onClick={() => setStep(s.id)}
                  className={cx("relative flex h-full w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors", step === s.id ? "bg-surface" : "hover:bg-ink/[0.03]")}
                >
                  {step === s.id && <span aria-hidden className="absolute inset-x-0 -top-px h-0.5 bg-brand" />}
                  <span aria-hidden className={cx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-xs", s.done ? "border-brand bg-brand text-white" : "border-line-strong text-ink-soft")}>
                    {s.done ? <Check className="size-3" /> : n + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cx("block text-sm", step === s.id ? "font-semibold text-ink" : "font-medium text-ink-soft")}>{s.label}</span>
                    <span className="block text-xs text-ink-faint">{s.state}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {step === "plan" && <PlanStep onApproved={() => setStep(project.sources.length ? "library" : "discover")} />}
        {step === "discover" && <DiscoverStep goToPlan={() => setStep("plan")} />}
        {step === "library" && <LibraryStep goToDiscover={() => setStep("discover")} goToBrief={() => setStep("brief")} />}
        {step === "brief" && <BriefStep inspectingId={inspecting} onInspect={inspect} goToLibrary={() => setStep("library")} goToPlan={() => setStep("plan")} />}
      </main>

      {showAside && inspecting && (
        <aside aria-label="Claim Inspector" className="sticky top-0 h-dvh w-[26.5rem] shrink-0 overflow-y-auto border-l border-line-strong bg-surface">
          <ClaimInspector key={inspecting} claimId={inspecting} onClose={() => setInspecting(null)} />
        </aside>
      )}
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
        <p className="font-serif text-lg text-ink-faint">Opening your workspace…</p>
      </div>
    );
  }

  const problem = storageProblem && (
    <Notice tone="warn" icon={TriangleAlert} role="alert" className="m-4">
      {storageProblem === "version"
        ? "The work saved in this browser was made by a different version of TRACE and could not be opened."
        : "The work saved in this browser was damaged and could not be opened."}{" "}
      It was set aside, not deleted, and TRACE started fresh. If you have a backup file, restore it from the sidebar.{" "}
      <button type="button" className="font-medium underline underline-offset-2" onClick={dismissStorageProblem}>
        Dismiss
      </button>
    </Notice>
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
    <div className="flex min-h-dvh">
      <aside aria-label="Projects and tools" className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-r border-line-strong bg-surface lg:block">
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line-strong bg-surface px-4 py-2 lg:hidden">
          <span className="font-serif text-xl font-semibold tracking-tight text-brand-deep">TRACE</span>
          <Button size="sm" icon={Menu} onClick={() => setMenu(true)}>
            Projects and tools
          </Button>
        </div>
        {problem}
        <ProjectView key={project.id} project={project} />
      </div>
      <Drawer open={menu} side="left" label="Projects and tools" onClose={() => setMenu(false)}>
        <Sidebar onNavigate={() => setMenu(false)} />
      </Drawer>
    </div>
  );
}

export function Workspace() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
