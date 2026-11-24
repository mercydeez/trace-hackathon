import { z } from "zod";
import { formatApa } from "@/lib/server/citations";
import { respond } from "@/lib/server/http";
import { BiblioSchema } from "@/lib/types";

const Body = z.object({
  items: z.array(z.object({ id: z.string().min(1).max(60), doi: z.string().max(300).nullable(), cited: BiblioSchema, accessed: z.string().max(40).optional() })).max(60),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return respond({ ok: false, kind: "bad_request", message: "The request could not be read." });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return respond({ ok: false, kind: "bad_request", message: "The references could not be read." });
  try {
    return respond({ ok: true, data: formatApa(parsed.data.items) });
  } catch {
    return respond({ ok: false, kind: "unavailable", message: "The reference formatter failed. The stored details are unchanged." });
  }
}
