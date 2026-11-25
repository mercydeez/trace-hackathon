"use client";

import {
  Bot,
  Check,
  CircleDashed,
  FileText,
  FlaskConical,
  PenLine,
  RotateCcw,
  SearchX,
  TriangleAlert,
  UserRound,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react";
import type { EffectiveDecision } from "@/lib/approvals";
import type { ExcerptCheck } from "@/lib/excerpt";
import type { IdentityStatus } from "@/lib/identity";
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
  matched: { tone: "ok", icon: Check, label: "Details match Crossref" },
  mismatch: { tone: "bad", icon: TriangleAlert, label: "Details disagree with Crossref" },
  not_found: { tone: "warn", icon: SearchX, label: "Not found in Crossref" },
  could_not_check: { tone: "neutral", icon: WifiOff, label: "Could not check" },
  user_entered: { tone: "neutral", icon: UserRound, label: "Entered by hand, not checked" },
};

/** 2. Evidence access. */
export const ACCESS: Record<"abstract" | "user_pasted" | "none", Badge> = {
  abstract: { tone: "neutral", icon: FileText, label: "Abstract only" },
  user_pasted: { tone: "neutral", icon: PenLine, label: "Pasted passage, not checked" },
  none: { tone: "warn", icon: CircleDashed, label: "No source text" },
};

/** 3. Excerpt integrity. */
export function excerptBadge(check: ExcerptCheck): Badge {
  if (check.status === "matched") return { tone: "ok", icon: Check, label: "Excerpt found in stored text" };
  if (check.status === "mismatch") return { tone: "bad", icon: X, label: "Excerpt not in stored text" };
  return { tone: "warn", icon: CircleDashed, label: "Excerpt cannot be checked" };
}

/** 4. Support assessment: a suggestion from the model or the sample, never TRACE's own verdict. */
export const SUPPORT_LABEL: Record<Support, string> = {
  supports: "supports the claim",
  partial: "partly supports the claim",
  insufficient: "is not enough for the claim",
};

/** 5. Student decision. */
export const DECISION: Record<EffectiveDecision, Badge> = {
  pending: { tone: "warn", icon: CircleDashed, label: "Waiting for your decision" },
  approved: { tone: "ok", icon: Check, label: "Approved by you" },
  rejected: { tone: "neutral", icon: X, label: "Rejected by you" },
  stale: { tone: "warn", icon: RotateCcw, label: "Changed since you approved" },
};

export function originBadge(claim: Pick<Claim, "origin" | "model" | "edited">): Badge {
  const edited = claim.edited ? ", edited" : "";
  if (claim.origin === "live_ai") return { tone: "neutral", icon: Bot, label: `AI draft${edited}` };
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
