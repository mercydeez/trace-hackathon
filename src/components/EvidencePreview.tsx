"use client";

import { Check, ScanSearch, ShieldAlert, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { demoSourcesAndEvidence } from "@/lib/demo";
import { checkExcerpt, type ExcerptCheck } from "@/lib/excerpt";
import { Button, cx } from "./ui";

/*
 * The welcome screen's proof: the Roediger & Karpicke excerpt, checked against the stored demo abstract by
 * the same checkExcerpt the workspace uses. Nothing here is fetched; the status words come from the helper.
 */

const PREFIX = "Students then took a final retention test 5 min, 2 days, or 1 ";
const VERSIONS = [
  { id: "stored", label: "Stored excerpt", word: "week" },
  { id: "altered", label: "Altered version", word: "month" },
] as const;

const STATUS: Record<ExcerptCheck["status"], { icon: LucideIcon; title: string; note: string; text: string; mark: string }> = {
  matched: {
    icon: Check,
    title: "Matched: found in the stored abstract",
    note: "Every word occurs in the stored passage. Whether it supports your claim is still yours to review.",
    text: "text-ok",
    mark: "bg-ok-tint text-ok",
  },
  mismatch: {
    icon: X,
    title: "Mismatch: not in the stored abstract",
    note: "The stored passage says one week. A quote that differs from it blocks reviewed export until you fix it.",
    text: "text-bad",
    mark: "bg-bad-tint text-bad",
  },
  not_checkable: {
    icon: TriangleAlert,
    title: "Not checkable: no stored text to compare",
    note: "The check needs the stored abstract, and it was not available here.",
    text: "text-warn",
    mark: "bg-warn-tint text-warn",
  },
};

export function EvidencePreview({ onRunTrap }: { onRunTrap: () => void }) {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const group = useId();
  const evidenceText = useMemo(() => demoSourcesAndEvidence(new Date(0).toISOString()).evidence.find((e) => e.id === "ev_demo_1")?.text, []);
  const checks = useMemo(() => VERSIONS.map((v) => checkExcerpt(`${PREFIX}${v.word} later.`, evidenceText).status), [evidenceText]);

  const version = VERSIONS[active]!;
  const status = STATUS[checks[active]!];
  const StatusIcon = status.icon;
  const fade = reduce ? { duration: 0 } : { duration: 0.16, ease: "easeOut" as const };
  const shift = reduce ? 0 : 6;

  return (
    <section aria-label="Excerpt check preview">
      <div className="welcome-panel rounded-3xl p-5 sm:p-7">
        <header className="flex items-start gap-3">
          <ScanSearch aria-hidden className="mt-0.5 size-5 shrink-0 text-[#cdb8ee]" />
          <div>
            <h2 className="text-sm font-bold">Excerpt check</h2>
            <p className="welcome-panel-soft text-xs">Roediger &amp; Karpicke (2006) · stored Crossref abstract</p>
          </div>
        </header>

        <fieldset className="mt-5 flex w-fit max-w-full gap-1 rounded-full bg-white/10 p-1 ring-1 ring-white/20">
          <legend className="sr-only">Excerpt version</legend>
          {VERSIONS.map((v, i) => (
            <label key={v.id} className={cx("welcome-seg relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors", i === active ? "text-brand-deep" : "welcome-panel-soft hover:bg-white/10")}>
              <input type="radio" name={group} className="sr-only" checked={i === active} onChange={() => setActive(i)} />
              {i === active && <motion.span layoutId={`${group}-pill`} aria-hidden className="absolute inset-0 rounded-full bg-white" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }} />}
              <span className="relative">{v.label}</span>
            </label>
          ))}
        </fieldset>

        <blockquote className="mt-6 min-h-[8.5rem] text-lg leading-8 font-medium sm:text-xl sm:leading-9">
          &ldquo;{PREFIX}
          <AnimatePresence mode="wait" initial={false}>
            <motion.mark
              key={version.word}
              className={cx("inline-block rounded px-1.5 font-bold", status.mark)}
              initial={{ opacity: 0, y: shift }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -shift }}
              transition={fade}
            >
              {version.word}
            </motion.mark>
          </AnimatePresence>{" "}
          later.&rdquo;
        </blockquote>

        <div role="status" className="welcome-glass min-h-[8.25rem] rounded-2xl p-4 text-ink sm:p-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={active} initial={{ opacity: 0, y: shift }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -shift }} transition={fade}>
              <p className={cx("flex items-start gap-2 text-sm font-bold", status.text)}>
                <StatusIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                {status.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{status.note}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button icon={ShieldAlert} onClick={onRunTrap}>
          Run the citation trap
        </Button>
        <p className="min-w-0 flex-1 basis-56 text-sm leading-relaxed text-ink-soft">Opens a test copy with one altered quote and incorrect citation details for you to catch.</p>
      </div>
    </section>
  );
}
