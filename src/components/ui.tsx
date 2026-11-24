"use client";

import { X, type LucideIcon } from "lucide-react";
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

const BUTTON_VARIANT = {
  primary: "bg-brand text-white border-brand hover:bg-brand-deep hover:border-brand-deep",
  secondary: "bg-surface text-ink border-line-strong hover:bg-canvas",
  ghost: "bg-transparent text-ink-soft border-transparent hover:bg-ink/5 hover:text-ink",
  danger: "bg-surface text-bad border-bad/35 hover:bg-bad-tint",
};

export function Button({ variant = "secondary", size = "md", icon: Icon, className, children, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded border font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "min-h-8 px-2.5 text-[0.8125rem]" : "min-h-9 px-3.5 text-sm",
        BUTTON_VARIANT[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden className={size === "sm" ? "size-3.5" : "size-4"} />}
      {children}
    </button>
  );
}

// --- Status chips: always an icon and words, never colour alone ----------------------------

export type Tone = "ok" | "warn" | "bad" | "neutral" | "sample";

const CHIP_TONE: Record<Tone, string> = {
  ok: "bg-brand-tint text-brand-deep border-brand/20",
  warn: "bg-warn-tint text-warn border-warn/25",
  bad: "bg-bad-tint text-bad border-bad/25",
  neutral: "bg-canvas text-ink-soft border-line-strong",
  sample: "bg-surface text-ink-soft border-dashed border-ink-faint",
};

export function Chip({ tone = "neutral", icon: Icon, children, title }: { tone?: Tone; icon?: LucideIcon; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs leading-4 font-medium whitespace-nowrap", CHIP_TONE[tone])}>
      {Icon && <Icon aria-hidden className="size-3 shrink-0" />}
      {children}
    </span>
  );
}

// --- Form fields ---------------------------------------------------------------------------

const INPUT =
  "w-full rounded border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint/80 focus-visible:border-brand disabled:bg-canvas disabled:text-ink-faint";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: (id: string) => React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[0.8125rem] font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(INPUT, className)} {...props} />;
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(INPUT, "resize-y leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(INPUT, "pr-7", className)} {...props}>
      {children}
    </select>
  );
}

// --- Messages ------------------------------------------------------------------------------

const NOTICE_TONE: Record<Tone, string> = {
  ok: "border-brand/25 bg-brand-tint text-brand-deep",
  warn: "border-warn/30 bg-warn-tint text-warn",
  bad: "border-bad/30 bg-bad-tint text-bad",
  neutral: "border-line-strong bg-surface text-ink-soft",
  sample: "border-dashed border-ink-faint bg-surface text-ink-soft",
};

export function Notice({ tone = "neutral", icon: Icon, children, className, role }: { tone?: Tone; icon?: LucideIcon; children: React.ReactNode; className?: string; role?: "status" | "alert" | "note" }) {
  return (
    <div role={role} className={cx("flex gap-2 rounded border px-3 py-2 text-sm", NOTICE_TONE[tone], className)}>
      {Icon && <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />}
      <div className="min-w-0 flex-1 text-ink">{children}</div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded border border-dashed border-line-strong px-5 py-8 text-center">
      <p className="font-serif text-lg text-ink">{title}</p>
      {children && <div className="mx-auto mt-1.5 max-w-prose text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="font-serif text-xl font-medium text-ink">{children}</h2>
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
    onClose,
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
        <h2 id={titleId} className="font-serif text-lg font-medium">
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

export function Drawer({ open, side, label, onClose, children }: { open: boolean; side: "left" | "right"; label: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useDialog(open, onClose);
  return (
    <dialog {...dialog} className={cx("drawer", side)} aria-label={label}>
      <div className="sticky top-0 z-10 flex justify-end bg-surface/95 px-2 pt-2">
        <Button variant="ghost" size="sm" icon={X} onClick={onClose}>
          Close
        </Button>
      </div>
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
