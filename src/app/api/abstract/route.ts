import { normaliseDoi } from "@/lib/doi";
import { clientKey, rateLimiter, respond } from "@/lib/server/http";
import { lookupOpenAlexAbstract } from "@/lib/server/openalex";

const allow = rateLimiter(30, 60_000);

export async function GET(req: Request) {
  if (!allow(clientKey(req))) {
    return respond({ ok: false, kind: "rate_limited", message: "Too many lookups in a short time. Wait a minute and try again." });
  }
  const doi = normaliseDoi((new URL(req.url).searchParams.get("doi") ?? "").slice(0, 300));
  if (!doi) return respond({ ok: false, kind: "bad_request", message: "That does not look like a DOI." });
  return respond(await lookupOpenAlexAbstract(doi));
}
