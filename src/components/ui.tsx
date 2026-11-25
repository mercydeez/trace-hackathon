"use client";

import { Inbox, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// --- Buttons -------------------------------------------------------------------------------

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  icon?: LucideIcon;
};

/*
 * One control height scale shared with inputs: md 40px, sm 32px. A disabled primary keeps a
 * solid, legible fill instead of fading, so it reads as "not yet" rather than "broken".
 */
const BUTTON_VARIANT = {
  primary:
    "bg-brand text-white border-brand shadow-[0_4px_12px_rgb(75_54_83/0.18)] enabled:hover:bg-brand-deep enabled:hover:border-brand-deep disabled:bg-s3 disabled:border-s3 disabled:text-ink-faint disabled:shadow-none",
  secondary: "bg-surface text-ink border-line-strong enabled:hover:bg-s2 disabled:text-ink-faint disabled:bg-surface",
  ghost: "bg-transparent text-ink-soft border-transparent enabled:hover:bg-s2 enabled:hover:text-ink disabled:text-ink-faint/70",
  danger: "bg-surface text-bad border-bad/30 enabled:hover:bg-bad-tint disabled:text-ink-faint",
};

export function Button({ variant = "secondary", size = "md", icon: Icon, className, children, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-full border text-center text-sm font-semibold transition-colors duration-150 ease-out",
        "disabled:cursor-not-allowed",
        size === "sm" ? "min-h-8 px-3" : "min-h-10 px-4",
        BUTTON_VARIANT[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
      {children}
    </button>
  );
}

// --- Status chips: always an icon and words, never colour alone ----------------------------

export type Tone = "ok" | "warn" | "bad" | "neutral" | "sample";

const CHIP_TONE: Record<Tone, string> = {
  ok: "bg-ok-tint text-ok",
  warn: "bg-warn-tint text-warn",
  bad: "bg-bad-tint text-bad",
  neutral: "bg-s2 text-ink-soft",
  sample: "bg-info-tint text-info outline outline-1 -outline-offset-1 outline-dashed outline-info/50",
};

export function Chip({ tone = "neutral", icon: Icon, children, title }: { tone?: Tone; icon?: LucideIcon; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap", CHIP_TONE[tone])}>
      {Icon && <Icon aria-hidden className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}

// --- Form fields ---------------------------------------------------------------------------

const INPUT =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-base text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-faint/70 hover:border-ink-faint/40 focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_rgb(201_85_159/0.16)] focus-visible:outline-none disabled:bg-s2 disabled:text-ink-faint";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: (id: string) => React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-2 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(INPUT, "h-10", className)} {...props} />;
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(INPUT, "resize-y py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(INPUT, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

// --- Messages ------------------------------------------------------------------------------

const NOTICE_TONE: Record<Tone, string> = {
  ok: "border-ok/20 bg-ok-tint text-ok",
  warn: "border-warn/25 bg-warn-tint text-warn",
  bad: "border-bad/25 bg-bad-tint text-bad",
  neutral: "border-line bg-surface text-ink-soft",
  sample: "border-dashed border-info/40 bg-info-tint text-info",
};

export function Notice({ tone = "neutral", icon: Icon, children, className, role }: { tone?: Tone; icon?: LucideIcon; children: React.ReactNode; className?: string; role?: "status" | "alert" | "note" }) {
  return (
    <div role={role} className={cx("flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed", NOTICE_TONE[tone], className)}>
      {Icon && <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />}
      <div className="min-w-0 flex-1 text-ink">{children}</div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
      <span aria-hidden className="mx-auto mb-4 grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-text">
        <Inbox className="size-5" />
      </span>
      <p className="text-base font-semibold text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">{children}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">{children}</h2>
      {aside && <div className="text-sm text-ink-soft">{aside}</div>}
    </div>
  );
}
// --- Dialogs (native <dialog>: focus trap, Esc and backdrop come from the platform) --------

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  const props = {
    ref,
    // React passes a nested dialog's close event up to its parent dialogs; react only to our own.
    onClose: (e: React.SyntheticEvent<HTMLDialogElement>) => {
      if (e.target === ref.current) onClose();
    },
    onClick: (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === ref.current) onClose();
    },
  };
  return props;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialog = useDialog(open, onClose);
  const titleId = useId();
  return (
    <dialog {...dialog} className="confirm" aria-labelledby={titleId}>
      <div className="p-5">
        <h2 id={titleId} className="text-base font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        <div className="mt-2 text-sm text-ink-soft">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export function Drawer({ open, side, label, onClose, children, bare }: { open: boolean; side: "left" | "right"; label: string; onClose: () => void; children: React.ReactNode; bare?: boolean }) {
  const dialog = useDialog(open, onClose);
  return (
    <dialog {...dialog} className={cx("drawer", side)} aria-label={label}>
      {!bare && <div className="sticky top-0 z-10 flex justify-end bg-surface/95 px-2 pt-2">
        <Button variant="ghost" size="sm" icon={X} onClick={onClose}>
          Close
        </Button>
      </div>}
      {open && children}
    </dialog>
  );
}

// --- Small helpers -------------------------------------------------------------------------

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}

export function downloadText(filename: string, text: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "unknown date";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** An APA reference drawn from plain and italic runs. No HTML is injected. */
export function ReferenceText({ parts }: { parts: { text: string; italic: boolean }[] }) {
  return (
    <>
      {parts.map((p, i) => (p.italic ? <i key={i}>{p.text}</i> : <span key={i}>{p.text}</span>))}
    </>
  );
}
