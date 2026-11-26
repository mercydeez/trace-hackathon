"use client";

import { ArrowRight, FlaskConical, LayoutGrid, SearchCheck } from "lucide-react";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import { useState } from "react";
import { buildDemoProject, FIXTURES_FETCHED_AT } from "@/lib/demo";
import { emptyProject } from "@/lib/mutations";
import { buildTrapProject } from "@/lib/trap";
import { EvidencePreview } from "./EvidencePreview";
import { useStore } from "./store";
import type { Project } from "@/lib/types";
import { Brand, Button, LinkButton, shortDate, TextArea } from "./ui";

const now = () => new Date().toISOString();

/** The brief page reveal. Starts mostly opaque so the page is readable before and during it; off for reduced motion. */
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0.6, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

function WelcomeHeader({ onOpenTools }: { onOpenTools: () => void }) {
  return (
    <header className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
      <Brand />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button size="sm" variant="ghost" icon={LayoutGrid} onClick={onOpenTools}>Projects and tools</Button>
        <a href="#new-project" className="hidden text-sm font-semibold text-ink-soft transition-colors hover:text-brand sm:inline">Start a project <ArrowRight aria-hidden className="ml-1 inline size-3.5" /></a>
      </div>
    </header>
  );
}

function Hero({ onCheckReference }: { onCheckReference: () => void }) {
  const { addProject } = useStore();
  return (
    <section className="grid items-start gap-12 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16 lg:pt-16">
      <Reveal>
        <h1 className="max-w-[12ch] text-[2.75rem] leading-[1.04] font-bold tracking-[-0.04em] text-balance text-brand-deep sm:text-6xl lg:text-[4.5rem]">Research you can defend.</h1>
        <p className="mt-6 max-w-[44ch] text-base leading-relaxed text-ink sm:text-lg">
          Find real sources, check each claim against its passage, and export a research brief you’ve reviewed yourself.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          <Button variant="primary" icon={FlaskConical} onClick={() => addProject(buildDemoProject(now()))}>
            Open the demo project
          </Button>
          <Button icon={SearchCheck} onClick={onCheckReference}>
            Check a reference
          </Button>
        </div>
        <p className="mt-4 text-sm text-ink-soft">Demo sources saved from Crossref · {shortDate(FIXTURES_FETCHED_AT)}</p>
      </Reveal>
      <Reveal delay={0.08}>
        <EvidencePreview onRunTrap={() => addProject(buildTrapProject(now()))} />
      </Reveal>
    </section>
  );
}

const WORKFLOW = [
  { title: "Find", text: "Search Crossref, add a source by DOI, or check a citation you were given. A registry check establishes the reference’s identity, not whether it supports your claim." },
  { title: "Compare", text: "Inspect each short claim against its stored passage. The excerpt check shows whether the quoted words occur in that text." },
  { title: "Approve", text: "You decide. Your review determines approval, and an approval goes stale when the claim or its passage changes." },
  { title: "Export", text: "One gate re-checks everything, then exports a brief with APA 7 references and a disclosure of how AI was used." },
];

function Workflow() {
  return (
    <section aria-labelledby="workflow-title" className="mt-20 border-t border-line-strong pt-10 lg:mt-28">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-16">
        <h2 id="workflow-title" className="text-3xl font-bold tracking-[-0.03em] text-balance text-brand-deep">Find, compare, approve, export.</h2>
        <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {WORKFLOW.map((step, i) => (
            <li key={step.title} className="border-t border-line-strong pt-4">
              <span aria-hidden className="num text-sm font-bold text-accent-text">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-1 text-lg font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StartProject() {
  const { addProject } = useStore();
  const [question, setQuestion] = useState("");
  return (
    <section className="mt-20 grid gap-10 border-t border-line-strong pt-10 lg:mt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
      <form
        id="new-project"
        className="scroll-mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          const q = question.trim();
          if (q) addProject(emptyProject(q.length > 44 ? `${q.slice(0, 44).trimEnd()}…` : q, q, now()));
        }}
      >
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-balance text-brand-deep">Start with your own question</h2>
        <label htmlFor="welcome-question" className="mt-3 block text-base text-ink-soft">
          Write a question a source could answer.
        </label>
        <TextArea id="welcome-question" rows={3} className="mt-5 max-w-2xl" maxLength={400} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="For example: Does spacing study sessions improve exam results?" />
        <Button type="submit" variant="primary" className="mt-4" disabled={!question.trim()}>
          Start a project
        </Button>
      </form>
      <aside aria-labelledby="storage-title" className="border-t border-line-strong pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
        <h2 id="storage-title" className="text-lg font-bold tracking-[-0.02em] text-brand-deep">Saved in this browser only</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          There is no account. Your work is stored in this browser, is not a cloud backup, and is lost if site data is cleared. Download a backup from Projects and tools.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          TRACE does not detect plagiarism, judge whether a source is correct, or replace your institution&rsquo;s academic-integrity rules.
        </p>
      </aside>
    </section>
  );
}

/** On /home with a saved project: the way back to it, with everything the browser has saved. */
function ResumePanel({ project }: { project: Project }) {
  const claims = project.claims.filter((c) => c.decision !== "rejected").length;
  const kind = project.kind === "trap" ? "Citation-trap test copy" : project.kind === "demo" ? "Demo project" : "Your project";
  return (
    <section aria-labelledby="resume-title" className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line-strong bg-surface px-5 py-4">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{kind} · saved in this browser</p>
        <h2 id="resume-title" className="mt-1 truncate text-lg font-bold text-ink">
          Continue {project.name}
        </h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          {project.sources.length} source{project.sources.length === 1 ? "" : "s"}, {claims} claim{claims === 1 ? "" : "s"}. Your decisions, notes and edits are kept.
        </p>
      </div>
      <LinkButton href="/" variant="primary" icon={ArrowRight}>
        Resume project
      </LinkButton>
    </section>
  );
}

export function Welcome({ onOpenTools, onCheckReference, resume = null }: { onOpenTools: () => void; onCheckReference: () => void; resume?: Project | null }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="welcome min-h-dvh">
        <WelcomeHeader onOpenTools={onOpenTools} />
        <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          {resume && <ResumePanel project={resume} />}
          <Hero onCheckReference={onCheckReference} />
          <Workflow />
          <StartProject />
        </main>
      </div>
    </MotionConfig>
  );
}
