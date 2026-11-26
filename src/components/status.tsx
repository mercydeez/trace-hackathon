"use client";

import {
  Bot,
  Check,
  CircleDashed,
  FileText,
  FlaskConical,
  PenLine,
  RotateCcw,
  SearchCheck,
  SearchX,
  TriangleAlert,
  UserRound,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import type { EffectiveDecision } from "@/lib/approvals";
import type { ExcerptCheck } from "@/lib/excerpt";
import type { Identity, IdentityStatus } from "@/lib/identity";
import { DECISION_LABEL, excerptLabel, IDENTITY_LABEL, PARTIAL_LABEL, trustLabel } from "@/lib/labels";
import type { Claim, Support } from "@/lib/types";
import { Chip, type Tone } from "./ui";

interface Badge {
  tone: Tone;
  icon: LucideIcon;
  label: string;
}

/** Shown beside identity, never merged with it: a correctly cited paper can still be retracted. */
export const RETRACTED: Badge = { tone: "bad", icon: TriangleAlert, label: "Retracted" };

/** 1. Reference identity. "Details match Crossref" is about the citation details only. */

export const IDENTITY: Record<IdentityStatus, Badge> = {
  matched: { tone: "ok", icon: Check, label: IDENTITY_LABEL.matched },
  mismatch: { tone: "bad", icon: TriangleAlert, label: IDENTITY_LABEL.mismatch },
  not_found: { tone: "warn", icon: SearchX, label: IDENTITY_LABEL.not_found },
  could_not_check: { tone: "neutral", icon: WifiOff, label: IDENTITY_LABEL.could_not_check },
  user_entered: { tone: "neutral", icon: UserRound, label: IDENTITY_LABEL.user_entered },
};

/** No compared detail disagrees, but the title wording, author count or year needs a look. Not a verified match. */
export const PARTIAL: Badge = { tone: "warn", icon: TriangleAlert, label: PARTIAL_LABEL };

/** A registry record exists. Says nothing yet about the details anyone cites. */
export const FOUND: Badge = { tone: "neutral", icon: SearchCheck, label: "Found in Crossref" };

export const INFERENCE: Badge = { tone: "neutral", icon: PenLine, label: "Inference" };

/** The one trust label for a reference, used on every surface so the wording never drifts. Names the registry compared. */
export function trustBadge(identity: Pick<Identity, "status" | "partial"> & { registry?: Identity["registry"] }): Badge {
  const badge = identity.status === "matched" && identity.partial ? PARTIAL : IDENTITY[identity.status];
  return { ...badge, label: trustLabel(identity) };
}

/** "Found in Crossref" or "Found in DataCite": the DOI resolves there. Says nothing yet about cited details. */
export function foundBadge(provider: "crossref" | "datacite" | undefined): Badge {
  return provider === "datacite" ? { ...FOUND, label: "Found in DataCite" } : FOUND;
}

/** 2. Evidence access. */
export const ACCESS: Record<"abstract" | "user_pasted" | "none", Badge> = {
  abstract: { tone: "neutral", icon: FileText, label: "Abstract only" },
  user_pasted: { tone: "neutral", icon: PenLine, label: "Pasted passage, not checked" },
  none: { tone: "warn", icon: CircleDashed, label: "No source text" },
};

/** 3. Excerpt integrity. */
export function excerptBadge(check: ExcerptCheck): Badge {
  if (check.status === "matched") return { tone: "ok", icon: Check, label: excerptLabel(check) };
  if (check.status === "mismatch") return { tone: "bad", icon: X, label: excerptLabel(check) };
  return { tone: "warn", icon: CircleDashed, label: excerptLabel(check) };
}

/** 4. Support assessment: a suggestion from the model or the sample, never TRACE's own verdict. */
export const SUPPORT_LABEL: Record<Support, string> = {
  supports: "supports the claim",
  partial: "partly supports the claim",
  insufficient: "is not enough for the claim",
};

/** 5. Student decision. */
export const DECISION: Record<EffectiveDecision, Badge> = {
  pending: { tone: "warn", icon: CircleDashed, label: DECISION_LABEL.pending },
  approved: { tone: "ok", icon: Check, label: DECISION_LABEL.approved },
  rejected: { tone: "neutral", icon: X, label: DECISION_LABEL.rejected },
  stale: { tone: "warn", icon: RotateCcw, label: DECISION_LABEL.stale },
};

export function originBadge(claim: Pick<Claim, "origin" | "model" | "edited">): Badge {
  const edited = claim.edited ? ", edited" : "";
  if (claim.origin === "live_ai") return { tone: "neutral", icon: Bot, label: `AI suggestion${edited}` };
  if (claim.origin === "sample") return { tone: "sample", icon: FlaskConical, label: `Sample, not live AI${edited}` };
  return { tone: "neutral", icon: PenLine, label: "Written by you" };
}

export function StatusChip({ badge, title }: { badge: Badge; title?: string }) {
  return (
    <Chip tone={badge.tone} icon={badge.icon} title={title}>
      {badge.label}
    </Chip>
  );
}

const LEGEND: [Badge, string][] = [
  [FOUND, "Crossref has a record for this DOI. Nothing anyone cites has been compared yet. When Crossref has none, TRACE asks DataCite and says so."],
  [IDENTITY.matched, "The cited title, first author's surname and year agree with Crossref. Given names and other authors are not compared."],
  [PARTIAL, "Nothing disagrees, but the title wording, author count or year needs a look."],
  [IDENTITY.mismatch, "At least one of title, first author's surname or year differs from Crossref."],
  [{ tone: "warn", icon: TriangleAlert, label: "Possible match" }, "Crossref's closest record for a reference without a DOI. Confirm it is the work you meant."],
  [IDENTITY.not_found, "No Crossref record. That does not show the source is fake: it may be registered elsewhere or mistyped."],
  [IDENTITY.could_not_check, "Crossref did not answer (a timeout or usage limit). This is evidence of nothing."],
  [IDENTITY.user_entered, "Typed in or never checked. Kept out of reviewed exports and the APA 7 list."],
  [RETRACTED, "Crossref lists a retraction notice. Separate from whether the details match."],
  [{ tone: "ok", icon: Check, label: "Excerpt found in stored text" }, "The quoted words occur in the stored passage. It does not show the paper is right."],
  [{ tone: "neutral", icon: Bot, label: "AI suggestion" }, "Drafted by the AI model from approved passages. The sample brief is labelled “Sample, not live AI”."],
  [INFERENCE, "No source passage states this. It is the writer's own reasoning."],
  [DECISION.approved, "You approved this exact version. Any later edit asks again."],
];

/** What the labels mean. Each one is evidence about a single check, never a general "verified". */
export function TrustLegend({ className }: { className?: string }) {
  return (
    <details className={className}>
      <summary className="cursor-pointer text-sm font-semibold text-ink-soft hover:text-ink">What the labels mean</summary>
      <p className="mt-2 text-sm text-ink-soft">Each label is evidence about one check only. None of them means &ldquo;verified&rdquo;.</p>
      <ul className="mt-2 space-y-2">
        {LEGEND.map(([badge, text]) => (
          <li key={badge.label} className="flex flex-wrap items-start gap-x-2 gap-y-1 text-sm">
            <StatusChip badge={badge} />
            <span className="min-w-0 flex-1 basis-48 text-ink-soft">{text}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
