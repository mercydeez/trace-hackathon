// Live smoke test: real calls to Crossref, OpenAlex, Citation.js and (if a key is set) Gemini,
// made through TRACE's own routes. Needs network and a running app:
//   npm run dev        (or npm run build && npm start)
//   npm run smoke:live
// Kept apart from `npm test`, which never touches the network.

import { readFile } from "node:fs/promises";

const BASE = process.env.TRACE_URL ?? "http://localhost:3000";
let failed = 0;

async function call(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  return { status: res.status, body: await res.json() };
}

/** A registry record minus its list of years, which is the shape the formatter takes. */
function withoutYears(record) {
  const copy = { ...record };
  delete copy.years;
  return copy;
}

function report(name, pass, detail) {
  if (pass === null) return console.log(`SKIP  ${name} - ${detail}`);
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name} - ${detail}`);
}

const status = await call("/api/status");
report("status route", status.body.ok === true, `AI configured: ${status.body.data?.ai.configured}, model: ${status.body.data?.ai.model}`);

const search = await call(`/api/search?q=${encodeURIComponent("retrieval practice long-term retention rereading")}&rows=5`);
report("Crossref search", search.body.ok && search.body.data.items.length > 0, search.body.ok ? `${search.body.data.items.length} items, first: ${search.body.data.items[0]?.record.title}` : `${search.body.kind}: ${search.body.message}`);

const doi = await call(`/api/doi?doi=${encodeURIComponent("10.1126/science.1152408")}`);
report("Crossref DOI lookup", doi.body.ok && doi.body.data.record.year === 2008, doi.body.ok ? `${doi.body.data.record.title} (${doi.body.data.record.year}), abstract: ${doi.body.data.abstract ? "yes" : "no"}` : `${doi.body.kind}: ${doi.body.message}`);

const unknown = await call(`/api/doi?doi=${encodeURIComponent("10.1234/trace-smoke-test-no-such-doi")}`);
report("unknown DOI is 'not_found'", unknown.status === 404 && unknown.body.kind === "not_found", `HTTP ${unknown.status}, kind: ${unknown.body.kind}`);

const oa = await call(`/api/abstract?doi=${encodeURIComponent("10.1037/a0037559")}`);
report("OpenAlex abstract fallback", oa.body.ok && oa.body.data.text.length > 100, oa.body.ok ? `${oa.body.data.text.length} characters` : `${oa.body.kind}: ${oa.body.message}`);

const cite = await call("/api/cite", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mode: "list", items: [{ id: "s1", doi: doi.body.data?.doi ?? "10.1126/science.1152408", cited: doi.body.ok ? withoutYears(doi.body.data.record) : { title: "x", authors: [], year: null } }] }),
});
report("APA 7 formatting", cite.body.ok && cite.body.data[0]?.text.includes("(2008)"), cite.body.ok ? cite.body.data[0].text : `${cite.body.kind}: ${cite.body.message}`);

if (!status.body.data?.ai.configured) {
  report("live AI draft", null, "no GEMINI_API_KEY on the server, so the live call was not made");
} else {
  const fixtures = JSON.parse(await readFile(new URL("../src/data/demo-sources.json", import.meta.url), "utf8"));
  const evidence = fixtures.works.filter((w) => w.abstract).slice(0, 2).map((w, i) => ({ id: `ev_smoke_${i + 1}`, label: `${w.record.authors[0].family} (${w.record.year})`, text: w.abstract }));
  const draft = await call("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Does retrieval practice improve long-term retention compared with rereading?", evidence }),
  });
  if (!draft.body.ok) {
    report("live AI draft", false, `${draft.body.kind}: ${draft.body.message}`);
  } else {
    const claims = draft.body.data.raw?.claims ?? [];
    const ids = new Set(evidence.map((e) => e.id));
    const cited = claims.filter((c) => c.kind === "evidence");
    const known = cited.filter((c) => ids.has(c.evidenceId)).length;
    const verbatim = cited.filter((c) => evidence.find((e) => e.id === c.evidenceId)?.text.includes(c.excerpt)).length;
    report("live AI draft", Array.isArray(claims) && claims.length > 0, `model ${draft.body.data.model}: ${claims.length} claims, ${known}/${cited.length} cite a supplied ID, ${verbatim}/${cited.length} excerpts are byte-for-byte in the passage`);
    for (const c of claims) console.log(`        [${c.kind}${c.evidenceId ? ` ${c.evidenceId}` : ""}] ${c.text}`);
  }
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll live checks that ran passed.");
process.exitCode = failed ? 1 : 0;
