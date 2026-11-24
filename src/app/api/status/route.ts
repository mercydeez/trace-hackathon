import type { StatusResult } from "@/lib/api";
import { aiConfig } from "@/lib/server/gemini";
import { respond } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Reports which optional providers are configured. Never returns a secret. */
export async function GET() {
  const data: StatusResult = {
    ai: aiConfig(),
    crossrefPolitePool: Boolean(process.env.CROSSREF_MAILTO?.trim()),
    openAlexKey: Boolean(process.env.OPENALEX_API_KEY?.trim()),
  };
  return respond({ ok: true, data });
}
