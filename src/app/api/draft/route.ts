import { z } from "zod";
import { buildDraftPayload, checkPayloadInputs, LIMITS, type PayloadProblem } from "@/lib/prompt";
import { draftWithGemini } from "@/lib/server/gemini";
import { clientKey, rateLimiter, respond } from "@/lib/server/http";

export const maxDuration = 60;

const allow = rateLimiter(6, 60_000);

const Body = z.object({
  /** The project's rule. Checked here as well as in the browser; it only guards honest clients (no accounts). */
  aiDrafting: z.enum(["approved_evidence", "off"]).default("approved_evidence"),
  question: z.string().max(LIMITS.maxQuestionChars * 2),
  evidence: z
    .array(z.object({ id: z.string().min(1).max(60), label: z.string().max(200), text: z.string().max(LIMITS.maxTotalChars) }))
    .max(LIMITS.maxEvidenceItems),
});

const PROBLEMS: Record<PayloadProblem, string> = {
  no_question: "There is no research question to answer.",
  no_evidence: "No source text was approved, so there is nothing to draft from. Add an abstract or passage first.",
  too_many_items: `At most ${LIMITS.maxEvidenceItems} evidence passages can be sent at once.`,
  too_long: "The approved evidence is too long to send in one request. Remove a passage.",
};

export async function POST(req: Request) {
  if (!allow(clientKey(req))) {
    return respond({ ok: false, kind: "rate_limited", message: "Too many drafting requests in a short time. Wait a minute and try again." });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return respond({ ok: false, kind: "bad_request", message: "The request could not be read." });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return respond({ ok: false, kind: "bad_request", message: "The request is larger than TRACE allows." });
  }
  const { question, evidence, aiDrafting } = parsed.data;
  if (aiDrafting === "off") {
    return respond({ ok: false, kind: "bad_request", message: "AI drafting is switched off in this project's rules, so no request was sent." });
  }
  const problem = checkPayloadInputs(question, evidence);
  if (problem) return respond({ ok: false, kind: "bad_request", message: PROBLEMS[problem] });

  // The answer is returned as-is. The browser validates it against the student's approved evidence set.
  return respond(await draftWithGemini(buildDraftPayload(question, evidence)));
}
