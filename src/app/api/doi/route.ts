import { normaliseDoi, withoutTrailingPunctuation } from "@/lib/doi";
import { lookupCrossref } from "@/lib/server/crossref";
import { clientKey, rateLimiter, respond } from "@/lib/server/http";

const allow = rateLimiter(60, 60_000);

export async function GET(req: Request) {
  if (!allow(clientKey(req))) {
    return respond({ ok: false, kind: "rate_limited", message: "Too many lookups in a short time. Wait a minute and try again." });
  }
  const doi = normaliseDoi((new URL(req.url).searchParams.get("doi") ?? "").slice(0, 300));
  if (!doi) {
    return respond({ ok: false, kind: "bad_request", message: "That does not look like a DOI. A DOI starts with 10. and contains a slash." });
  }
  const first = await lookupCrossref(doi);
  if (first.ok || first.kind !== "not_found") return respond(first);

  // The DOI as typed is unknown. If it ends in punctuation, that may have come from the surrounding sentence.
  const variant = withoutTrailingPunctuation(doi);
  if (!variant) return respond(first);
  const second = await lookupCrossref(variant);
  if (!second.ok) return respond(second.kind === "not_found" ? first : second);
  return respond({
    ok: true,
    data: { ...second.data, note: `"${doi}" is not in Crossref. This record is for "${variant}" (trailing punctuation removed).` },
  });
}
