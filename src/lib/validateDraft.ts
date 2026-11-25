/**
 * Checks model output before any of it reaches the workspace.
 *
 * The model is treated as an untrusted writer. It may only cite evidence IDs from the approved
 * set and may not supply bibliographic details. Anything else is rejected with a reason and
 * shown to the student as rejected; it is never repaired or dropped silently.
 *
 * A quote that fails to match is NOT rejected here: it is kept and flagged, so the student can
 * see the model misquoted and fix or remove it.
 */
import { z } from "zod";
import { LIMITS } from "./prompt";
import { SupportSchema, type Evidence, type Support } from "./types";

const DraftClaimSchema = z.strictObject({
  text: z.string().trim().min(1).max(LIMITS.maxClaimChars),
  kind: z.enum(["evidence", "inference"]),
  evidenceId: z.string().nullable().optional(),
  excerpt: z.string().max(LIMITS.maxExcerptChars).optional(),
  support: SupportSchema.nullable().optional(),
  limitations: z.string().max(LIMITS.maxLimitationsChars).optional(),
});

export interface AcceptedDraftClaim {
  text: string;
  kind: "evidence" | "inference";
  evidenceId: string | null;
  excerpt: string;
  support: Support | null;
  limitations: string;
}

export interface DraftValidation {
  /** Set when the whole answer is unusable. `accepted` is then empty. */
  fatal: string | null;
  accepted: AcceptedDraftClaim[];
  rejected: { index: number; reason: string; preview: string }[];
}

function preview(item: unknown): string {
  const text = typeof item === "object" && item !== null && "text" in item ? String((item as { text: unknown }).text) : JSON.stringify(item);
  return (text ?? "").slice(0, 140);
}

function describe(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "It does not match the expected shape.";
  if (issue.code === "unrecognized_keys") {
    return `It contains fields the model may not supply: ${issue.keys.join(", ")}. References come from stored records only.`;
  }
  return `It does not match the expected shape (${issue.path.join(".") || "claim"}: ${issue.message}).`;
}

export function validateDraft(raw: unknown, approved: Pick<Evidence, "id">[]): DraftValidation {
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return { fatal: "The model's answer was not valid JSON.", accepted: [], rejected: [] };
    }
  }
  const claims = typeof data === "object" && data !== null ? (data as { claims?: unknown }).claims : undefined;
  if (!Array.isArray(claims)) {
    return { fatal: "The model's answer did not contain a list of claims.", accepted: [], rejected: [] };
  }

  const allowed = new Set(approved.map((e) => e.id));
  const accepted: AcceptedDraftClaim[] = [];
  const rejected: DraftValidation["rejected"] = [];

  claims.forEach((item, index) => {
    const reject = (reason: string) => rejected.push({ index, reason, preview: preview(item) });
    if (accepted.length >= LIMITS.maxClaims) return reject(`Over the limit of ${LIMITS.maxClaims} claims.`);

    const parsed = DraftClaimSchema.safeParse(item);
    if (!parsed.success) return reject(describe(parsed.error));
    const c = parsed.data;
    const evidenceId = c.evidenceId?.trim() || null;
    const excerpt = c.excerpt?.trim() ?? "";

    if (c.kind === "inference") {
      if (evidenceId) return reject("It is marked as an inference but cites evidence. A claim is one or the other.");
      accepted.push({ text: c.text, kind: "inference", evidenceId: null, excerpt: "", support: null, limitations: c.limitations?.trim() ?? "" });
      return;
    }
    if (!evidenceId) return reject("It cites no evidence. Unsupported points must be marked as inference.");
    if (!allowed.has(evidenceId)) return reject(`It cites "${evidenceId}", which is not in the approved evidence set.`);
    if (!excerpt) return reject("It gives no supporting excerpt.");
    accepted.push({
      text: c.text,
      kind: "evidence",
      evidenceId,
      excerpt,
      support: c.support ?? null,
      limitations: c.limitations?.trim() ?? "",
    });
  });

  return { fatal: null, accepted, rejected };
}

export type ScreenedDraft =
  | { ok: true; raw: { claims: unknown[] }; rejected: { reason: string; preview: string }[] }
  | { ok: false; fatal: string };

/**
 * Server-side screening of a provider answer, with the same validator the browser uses. Items it
 * rejects are dropped and their reasons returned, so nothing invalid leaves the server. The browser
 * still validates what remains against the evidence set as it is when the answer arrives.
 */
export function screenDraft(raw: unknown, approved: Pick<Evidence, "id">[]): ScreenedDraft {
  const v = validateDraft(raw, approved);
  if (v.fatal) return { ok: false, fatal: v.fatal };
  const claims = (typeof raw === "string" ? JSON.parse(raw) : raw) as { claims: unknown[] };
  const dropped = new Set(v.rejected.map((r) => r.index));
  return { ok: true, raw: { claims: claims.claims.filter((_, i) => !dropped.has(i)) }, rejected: v.rejected.map(({ reason, preview }) => ({ reason, preview })) };
}
