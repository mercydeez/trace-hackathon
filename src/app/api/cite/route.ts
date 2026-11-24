import { z } from "zod";
import { formatApa, formatApaEach } from "@/lib/server/citations";
import { respond } from "@/lib/server/http";
import { BiblioSchema } from "@/lib/types";

const Body = z.object({
  /** "list" = one reference list (a/b letters applied); "each" = every reference on its own. */
  mode: z.enum(["list", "each"]).default("list"),
  items: z
    .array(z.object({ id: z.string().min(1).max(60), doi: z.string().max(300).nullable(), cited: BiblioSchema, accessed: z.string().max(40).optional() }))
    .max(60),
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
    const { mode, items } = parsed.data;
    return respond({ ok: true, data: mode === "each" ? formatApaEach(items) : formatApa(items) });
  } catch {
    return respond({ ok: false, kind: "unavailable", message: "The reference formatter failed. The stored details are unchanged." });
  }
}
