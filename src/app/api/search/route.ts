import { z } from "zod";
import { searchCrossref } from "@/lib/server/crossref";
import { clientKey, rateLimiter, respond } from "@/lib/server/http";

const allow = rateLimiter(30, 60_000);

const Query = z.object({
  q: z.string().trim().min(2).max(300),
  rows: z.coerce.number().int().min(1).max(20).optional(),
  from: z.coerce.number().int().min(1500).max(2100).optional(),
  to: z.coerce.number().int().min(1500).max(2100).optional(),
});

export async function GET(req: Request) {
  if (!allow(clientKey(req))) {
    return respond({ ok: false, kind: "rate_limited", message: "Too many searches in a short time. Wait a minute and try again." });
  }
  const sp = new URL(req.url).searchParams;
  const parsed = Query.safeParse({
    q: sp.get("q") ?? "",
    rows: sp.get("rows") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return respond({ ok: false, kind: "bad_request", message: "Enter at least two characters to search (up to 300)." });
  }
  const { q, rows, from, to } = parsed.data;
  return respond(await searchCrossref(q, { rows, yearFrom: from, yearTo: to }));
}
