import { z } from "zod";
import { formatApa, formatApaEach } from "@/lib/server/citations";
import { clientKey, rateLimiter, respond } from "@/lib/server/http";
import { BiblioSchema } from "@/lib/types";

// Formatting runs on every source edit, so the limit is generous; it only stops a script hammering the formatter.
const allow = rateLimiter(120, 60_000);

const Body = z.object({
  /** "list" = one reference list (a/b letters applied); "each" = every reference on its own. */
  mode: z.enum(["list", "each"]).default("list"),
  style: z.enum(["apa", "harvard1"]).default("apa"),
  items: z
    .array(z.object({ id: z.string().min(1).max(60), doi: z.string().max(300).nullable(), cited: BiblioSchema, accessed: z.string().max(40).optional() }))
    .max(150),
});

export async function POST(req: Request) {
  if (!allow(clientKey(req))) {
    return respond({ ok: false, kind: "rate_limited", message: "Too many formatting requests in a short time. Wait a minute and try again." });
  }
  let json: unknown;
  try {
    const body = await req.text();
    // 60 real references are well under this; anything larger is not a reference list.
    if (body.length > 300_000) return respond({ ok: false, kind: "bad_request", message: "Too many or too long references to format at once." });
    json = JSON.parse(body);
  } catch {
    return respond({ ok: false, kind: "bad_request", message: "The request could not be read." });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return respond({ ok: false, kind: "bad_request", message: "The references could not be read." });
  try {
    const { mode, items, style } = parsed.data;
    return respond({ ok: true, data: mode === "each" ? formatApaEach(items, style) : formatApa(items, style) });
  } catch {
    return respond({ ok: false, kind: "unavailable", message: "The reference formatter failed. The stored details are unchanged." });
  }
}
