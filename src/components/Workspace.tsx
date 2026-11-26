"use client";

import { Check, FlaskConical, House, LayoutGrid, ShieldAlert, TriangleAlert } from "lucide-react";
import { MotionConfig } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isEvidenceSetApproved, isPlanApproved } from "@/lib/approvals";
import { buildDemoProject, FIXTURES_FETCHED_AT } from "@/lib/demo";
import { evaluateExport } from "@/lib/exportPolicy";
import type { Project } from "@/lib/types";
import { BriefStep } from "./BriefStep";
import { ClaimInspector } from "./ClaimInspector";
import { DiscoverStep } from "./DiscoverStep";
import { LibraryStep } from "./LibraryStep";
import { PlanStep } from "./PlanStep";
import { Sidebar } from "./Sidebar";
import { StoreProvider, useStore } from "./store";
import { Brand, Button, cx, Drawer, LinkButton, Notice, shortDate, useMediaQuery } from "./ui";
import { Welcome } from "./Welcome";

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

/**
 * A step to open the next project at, set by a welcome-screen shortcut and used once.
 * ponytail: module-level one-shot flag, enough for one entry point; a router would replace it.
 */
let openAt: StepId | null = null;

const STEP_IDS: StepId[] = ["plan", "discover", "library", "brief"];
/** The step last shown for a project in this tab. Session storage only: a convenience, never project data. */
function rememberedStep(projectId: string): StepId | null {
  try {
    const s = window.sessionStorage.getItem(`trace:step:${projectId}`);
    return STEP_IDS.includes(s as StepId) ? (s as StepId) : null;
  } catch {
    return null;
  }
}
function rememberStep(projectId: string, step: StepId) {
  try {
    window.sessionStorage.setItem(`trace:step:${projectId}`, step);
  } catch {
    /* storage blocked: resuming falls back to the step the project's state suggests */
  }
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
                  active ? "bg-brand-tint text-brand" : "text-ink hover:bg-s2",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                    active ? "bg-brand text-white" : s.done ? "bg-ok-tint text-ok" : "bg-s3 text-ink-soft",
                  )}
                >
                  {s.done ? <Check className="size-3.5" strokeWidth={3} /> : n + 1}
                </span>
                <span aria-hidden className="text-xs font-semibold lg:hidden">
                  {s.short}
                </span>
                <span className={cx("min-w-0 max-lg:sr-only", compact && "lg:sr-only")}>
                  <span className="block text-sm font-semibold">{s.label}</span>
                  <span className="line-clamp-2 block text-xs leading-snug text-ink-soft">
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
  const [step, setStep] = useState<StepId>(() => openAt ?? rememberedStep(project.id) ?? (!isPlanApproved(project) ? "plan" : project.claims.length > 0 ? "brief" : "library"));
  const [inspecting, setInspecting] = useState<string | null>(null);
  // "Check a reference" on the welcome screen opens the demo straight at Discover, where checking a DOI is read-only.
  // Read in the initial step above (safe if React calls the initialiser twice), then cleared so it applies once.
  useEffect(() => {
    openAt = null;
  }, []);
  // A new step starts at its top, not wherever the last one was scrolled to. The step is remembered for
  // this tab, so Home → Resume (or a refresh) returns to the same place.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    rememberStep(project.id, step);
  }, [step, project.id]);
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
  function navigate(id: StepId) {
    setStep(id);
    if (id !== "brief") setInspecting(null);
  }

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
            <Brand compact={compactRail} href="/home" />
            <div className={cx("flex items-center gap-1 lg:flex-col lg:items-stretch lg:gap-1", compactRail && "lg:items-center")}>
              <LinkButton href="/home" size="sm" variant="ghost" icon={House} aria-label="Home" className={cx("lg:justify-start", compactRail ? "lg:px-2" : "lg:-mx-3")}>
                <span className={cx("max-sm:sr-only", compactRail && "lg:sr-only")}>Home</span>
              </LinkButton>
              <Button size="sm" variant="ghost" icon={LayoutGrid} onClick={onOpenTools} aria-label="Projects and tools" className={cx("lg:justify-start", compactRail ? "lg:px-2" : "lg:-mx-3")}>
                <span className={cx("max-sm:sr-only", compactRail && "lg:sr-only")}>Projects and tools</span>
              </Button>
            </div>
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

          <StepNav steps={steps} step={step} compact={compactRail} onSelect={navigate} />

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
        <header className="border-b border-line bg-surface px-4 py-4 sm:px-8 lg:py-5">
          <p className="text-sm text-ink-soft">
            Step {position} of 4 <span aria-hidden>·</span> <span className="font-semibold text-ink">{current.label}</span> <span aria-hidden>·</span> {current.state}
          </p>
          <h1 className="mt-1 line-clamp-2 max-w-4xl text-xl leading-snug font-bold tracking-[-0.02em] text-ink sm:text-2xl">
            {project.question.trim() || <span className="text-ink-faint">No question yet. Write one in the Plan step.</span>}
          </h1>
          {project.kind === "trap" && (
            <Notice tone="bad" icon={ShieldAlert} className="mt-3" role="note">
              <strong className="font-semibold">Citation-trap test copy.</strong> Two deliberate errors: an altered quote and incorrect citation details.{" "}
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

        <div key={step} className="px-4 py-5 sm:px-8 sm:py-6">
          {step === "plan" && <PlanStep onApproved={() => setStep(project.sources.length ? "library" : "discover")} />}
          {step === "discover" && <DiscoverStep goToPlan={() => setStep("plan")} />}
          {step === "library" && <LibraryStep goToDiscover={() => setStep("discover")} goToBrief={() => setStep("brief")} />}
          {step === "brief" && <BriefStep inspectingId={inspecting} onInspect={inspect} goToLibrary={() => navigate("library")} goToPlan={() => navigate("plan")} />}
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

function Shell({ view }: { view: "app" | "home" }) {
  const { ready, state, project, addProject, storageProblem, saveFailed, dismissStorageProblem, syncNotice, dismissSyncNotice } = useStore();
  const [menu, setMenu] = useState(false);
  const router = useRouter();
  // On /home, opening or starting a project (demo, trap, new question, Projects and tools) goes to the workspace.
  // The active project at arrival is not a change: Home must not bounce a returning student straight back.
  const [arrivedWith, setArrivedWith] = useState<string | null | undefined>(undefined);
  if (view === "home" && ready && arrivedWith === undefined) setArrivedWith(state.activeProjectId);
  const activeId = state.activeProjectId;
  useEffect(() => {
    if (view === "home" && arrivedWith !== undefined && activeId !== arrivedWith && activeId !== null) router.push("/");
  }, [view, arrivedWith, activeId, router]);

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
        {saveFailed ? "The original data remains in this browser." : "TRACE kept a recovery copy in this browser."}{" "}
        You can restore a backup from Projects and tools.{" "}
        <button type="button" className="font-semibold underline underline-offset-2" onClick={dismissStorageProblem}>
          Dismiss
        </button>
      </Notice>
    </div>
  );

  return (
    <>
      {problem}
      {syncNotice && (
        <Notice tone="warn" icon={TriangleAlert} role="status" className="m-3">
          Another tab saved a newer version of this work, so TRACE loaded it here. Keep one tab per project to avoid losing edits.{" "}
          <button type="button" className="font-semibold underline underline-offset-2" onClick={dismissSyncNotice}>
            Dismiss
          </button>
        </Notice>
      )}
      {saveFailed && (
        <Notice tone="warn" icon={TriangleAlert} role="alert" className="m-3">
          TRACE couldn’t save to this browser. Keep this tab open and download a backup from Projects and tools.
        </Notice>
      )}
      {project && view === "app" ? <ProjectView key={project.id} project={project} onOpenTools={() => setMenu(true)} /> : (
        <Welcome
          resume={view === "home" ? project : null}
          onOpenTools={() => setMenu(true)}
          // "Check a reference" opens the demo at Discover, where checking a DOI is read-only.
          onCheckReference={() => {
            openAt = "discover";
            addProject(buildDemoProject(new Date().toISOString()));
          }}
        />
      )}
      <Drawer open={menu} side="left" label="Projects and tools" onClose={() => setMenu(false)}>
        <Sidebar onNavigate={() => setMenu(false)} />
      </Drawer>
    </>
  );
}

/** `view="home"` is the landing page at /home: always shown, with a way to resume the open project. */
export function Workspace({ view = "app" }: { view?: "app" | "home" }) {
  return (
    // reducedMotion="user": for visitors who ask for less motion, movement is dropped and only opacity changes remain.
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <Shell view={view} />
      </StoreProvider>
    </MotionConfig>
  );
}
