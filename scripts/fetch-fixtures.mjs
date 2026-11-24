// Fetches the real records behind the demo project and writes src/data/demo-sources.json.
//
// It calls TRACE's own /api/doi route, so the fixtures are exactly what the app's Crossref
// adapter returns: nothing is typed in by hand. Start the app first (npm run dev), then:
//   npm run fixtures
//
// Every record keeps its retrieval time and the API URL it came from.

import { writeFile } from "node:fs/promises";

const BASE = process.env.TRACE_URL ?? "http://localhost:3000";

// Chosen on 24 Nov 2026 for the demo question
// "Does retrieval practice improve long-term retention compared with rereading?"
const DOIS = [
  "10.1111/j.1467-9280.2006.01693.x", // Roediger & Karpicke 2006, Test-Enhanced Learning
  "10.1126/science.1152408", // Karpicke & Roediger 2008
  "10.1111/j.1745-6916.2006.00012.x", // Roediger & Karpicke 2006, The Power of Testing Memory
  "10.3102/0034654316689306", // Adesope, Trevisan & Sundararajan 2017
  "10.1177/1529100612453266", // Dunlosky et al. 2013
  "10.1037/a0037559", // Rowland 2014 (no abstract in Crossref when chosen)
  "10.1016/j.tics.2010.09.003", // Roediger & Butler 2011 (no abstract in Crossref when chosen)
];

const works = [];
for (const doi of DOIS) {
  const res = await fetch(`${BASE}/api/doi?doi=${encodeURIComponent(doi)}`);
  const body = await res.json();
  if (!body.ok) {
    console.error(`FAILED ${doi}: ${body.kind} - ${body.message}`);
    process.exitCode = 1;
    continue;
  }
  works.push(body.data);
  const a = body.data.abstract;
  console.log(`${doi}  abstract: ${a ? a.length + " chars" : "none"}  | ${body.data.record.title}`);
}

if (process.exitCode !== 1) {
  const out = {
    _about:
      "Real Crossref records for the TRACE demo project, fetched through the app's own /api/doi route. " +
      "Abstract text is as deposited with Crossref by the publishers, with JATS markup removed; copyright in the " +
      "abstracts remains with the publishers. Regenerate with `npm run fixtures`.",
    fetchedAt: new Date().toISOString(),
    works,
  };
  await writeFile(new URL("../src/data/demo-sources.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${works.length} records to src/data/demo-sources.json`);
}
