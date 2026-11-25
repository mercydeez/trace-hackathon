"use client";

import { Download, FlaskConical, Plus, RotateCcw, ShieldAlert, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { buildDemoProject } from "@/lib/demo";
import { exportProjectJson, importProjectJson } from "@/lib/exportMarkdown";
import { emptyProject } from "@/lib/mutations";
import { buildTrapProject } from "@/lib/trap";
import { useStore } from "./store";
import { Button, ConfirmDialog, cx, downloadText, Notice, shortDate, TextArea } from "./ui";

const KIND_LABEL = { user: null, demo: "Demo", trap: "Test copy" } as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { state, project, status, saveFailed, addProject, selectProject, deleteProject, replaceProject, resetAll } = useStore();
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [confirm, setConfirm] = useState<null | "delete" | "resetDemo" | "erase">(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const now = () => new Date().toISOString();
  const demo = state.projects.find((p) => p.kind === "demo");

  function create() {
    const q = question.trim();
    if (!q) return;
    addProject(emptyProject(q.length > 44 ? `${q.slice(0, 44).trimEnd()}…` : q, q, now()));
    setQuestion("");
    setCreating(false);
    onNavigate?.();
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    const result = importProjectJson(await file.text());
    if (result.ok) {
      addProject(result.project);
      setImportMessage(`Restored “${result.project.name}”.`);
      onNavigate?.();
    } else {
      setImportMessage(result.reason);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex min-h-full flex-col gap-7 px-5 pt-1 pb-6 text-sm">
      <div>
        <p className="font-display text-xl leading-none font-bold tracking-[-0.02em] text-ink">Projects and tools</p>
        <p className="mt-1.5 text-[0.8125rem] text-ink-faint">Switch project, run the demo or the citation trap, and keep a backup.</p>
      </div>

      <nav aria-label="Projects">
        <h2 className="mb-2 text-[0.8125rem] font-semibold text-ink-faint">Projects</h2>
        <ul className="space-y-0.5">
          {state.projects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-current={p.id === project?.id ? "true" : undefined}
                onClick={() => {
                  selectProject(p.id);
                  onNavigate?.();
                }}
                className={cx(
                  "flex w-full items-start gap-2 rounded-[14px] px-3 py-2.5 text-left text-[0.9375rem] transition-colors",
                  p.id === project?.id ? "bg-brand-tint font-semibold text-brand" : "text-ink hover:bg-s2",
                )}
              >
                <span className="min-w-0 flex-1 break-words">{p.name}</span>
                {KIND_LABEL[p.kind] && (
                  <span className={cx("mt-0.5 shrink-0 rounded-full border px-2 text-[0.6875rem] leading-4 font-semibold", p.kind === "trap" ? "border-bad/30 text-bad" : "border-line-strong text-ink-faint")}>
                    {KIND_LABEL[p.kind]}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {state.projects.length === 0 && <p className="text-ink-faint">No projects yet.</p>}

        {creating ? (
          <form
            className="mt-2 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <TextArea autoFocus rows={3} aria-label="Research question for the new project" placeholder="Your research question" value={question} maxLength={400} onChange={(e) => setQuestion(e.target.value)} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" variant="primary" disabled={!question.trim()}>
                Create project
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button size="sm" variant="ghost" icon={Plus} className="mt-1.5" onClick={() => setCreating(true)}>
            New project
          </Button>
        )}
      </nav>

      <section aria-label="Demo and test case">
        <h2 className="mb-2 text-[0.8125rem] font-semibold text-ink-faint">Demo and test case</h2>
        <div className="flex flex-col items-stretch gap-2">
          {demo ? (
            <Button size="sm" icon={RotateCcw} onClick={() => setConfirm("resetDemo")}>
              Reset demo project
            </Button>
          ) : (
            <Button
              size="sm"
              icon={FlaskConical}
              onClick={() => {
                addProject(buildDemoProject(now()));
                onNavigate?.();
              }}
            >
              Open demo project
            </Button>
          )}
          <Button
            size="sm"
            icon={ShieldAlert}
            onClick={() => {
              addProject(buildTrapProject(now()));
              onNavigate?.();
            }}
          >
            Run the citation trap
          </Button>
          <p className="text-xs text-ink-faint">The trap opens a separate test copy with two planted errors. Your projects are not touched.</p>
        </div>
      </section>

      <section aria-label="Backup">
        <h2 className="mb-2 text-[0.8125rem] font-semibold text-ink-faint">Backup</h2>
        <div className="flex flex-col items-stretch gap-2">
          <Button
            size="sm"
            icon={Download}
            disabled={!project}
            title={project ? undefined : "Open a project first"}
            onClick={() => {
              if (!project) return;
              const { json, filename } = exportProjectJson(project, now());
              downloadText(filename, json, "application/json");
            }}
          >
            Download project backup
          </Button>
          <Button size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>
            Restore from backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Backup file to restore" onChange={(e) => void restore(e.target.files?.[0])} />
          {importMessage && (
            <p role="status" className="text-xs text-ink-soft">
              {importMessage}
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Your work is saved in this browser only. It is not a cloud backup and is lost if site data is cleared.
        </p>
        {saveFailed && (
          <Notice tone="bad" role="alert" className="mt-2">
            The last change could not be saved to this browser. Download a backup now.
          </Notice>
        )}
      </section>

      <section aria-label="AI status" className="rounded-[18px] bg-s2 p-3.5 text-[0.8125rem] text-ink-soft">
        <h2 className="mb-1 text-xs font-semibold">Live AI drafting</h2>
        {status === null ? (
          <p className="text-ink-faint">Checking…</p>
        ) : status.ai.configured ? (
          <p>
            On. Model: <span className="break-all text-ink">{status.ai.model}</span>
          </p>
        ) : (
          <p>Not configured on this server. Search, checking, manual claims and the labelled sample still work.</p>
        )}
      </section>

      {project && (
        <details className="text-xs text-ink-soft">
          <summary className="font-semibold">Activity in this project</summary>
          <p className="mt-1.5 text-ink-faint">A local history for your own reference. It is not a tamper-proof record.</p>
          <ol className="mt-1.5 max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {project.activity.length === 0 && <li className="text-ink-faint">Nothing recorded yet.</li>}
            {project.activity.map((a, i) => (
              <li key={i}>
                <span className="text-ink-faint">{shortDate(a.at)}</span> {a.text}
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="mt-auto flex flex-col items-start gap-1 border-t border-line pt-4">
        {project && (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirm("delete")}>
            Delete this project
          </Button>
        )}
        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirm("erase")}>
          Erase all TRACE data here
        </Button>
      </div>

      <ConfirmDialog open={confirm === "delete"} title="Delete this project?" confirmLabel="Delete project" danger onClose={() => setConfirm(null)} onConfirm={() => { if (project) deleteProject(project.id); onNavigate?.(); }}>
        “{project?.name}” and its sources, notes, claims and approvals will be removed from this browser. This cannot be undone unless you have a backup file.
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "resetDemo"} title="Reset the demo project?" confirmLabel="Reset demo" onClose={() => setConfirm(null)} onConfirm={() => { if (demo) replaceProject(demo.id, buildDemoProject(now())); onNavigate?.(); }}>
        The demo returns to its starting state: seven saved sources, nothing approved, no claims. Changes you made to the demo are discarded.
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "erase"} title="Erase all TRACE data in this browser?" confirmLabel="Erase everything" danger onClose={() => setConfirm(null)} onConfirm={() => { resetAll(); onNavigate?.(); }}>
        Every project in this browser will be deleted, including the demo and any test copies. Download a backup first if you want to keep anything.
      </ConfirmDialog>
    </div>
  );
}
