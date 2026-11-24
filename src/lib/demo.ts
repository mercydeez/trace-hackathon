/**
 * The seeded demo project and the labelled sample brief.
 *
 * Sources and abstracts are real Crossref records (src/data/demo-sources.json, with retrieval
 * dates). The sample brief is sample output and says so everywhere it appears.
 */
import fixtures from "@/data/demo-sources.json";
import sampleBrief from "@/data/sample-brief.json";
import type { WorkRecord } from "./api";
import { suggestPlan } from "./plan";
import { hashText, newId } from "./text";
import type { Evidence, Project, Source } from "./types";

export const DEMO_QUESTION = "Does retrieval practice improve long-term retention compared with rereading?";
export const SAMPLE_LABEL: string = sampleBrief.label;
export const SAMPLE_RAW: unknown = { claims: sampleBrief.claims };
export const FIXTURES_FETCHED_AT: string = fixtures.fetchedAt;

/** Organising tags added for the demo. They are labels chosen by the builder, not claims about the papers. */
const DEMO_TAGS: Record<string, string[]> = {
  "10.1111/j.1467-9280.2006.01693.x": ["experiment", "prose"],
  "10.1126/science.1152408": ["experiment", "vocabulary"],
  "10.1111/j.1745-6916.2006.00012.x": ["review"],
  "10.3102/0034654316689306": ["meta-analysis"],
  "10.1177/1529100612453266": ["review", "study-techniques"],
  "10.1037/a0037559": ["meta-analysis", "no-abstract-yet"],
  "10.1016/j.tics.2010.09.003": ["review", "no-abstract-yet"],
};

/** Demo IDs are fixed so the sample brief can point at them: src_demo_1.., ev_demo_1.. in fixture order. */
export function demoSourcesAndEvidence(now: string): { sources: Source[]; evidence: Evidence[] } {
  const sources: Source[] = [];
  const evidence: Evidence[] = [];
  (fixtures.works as WorkRecord[]).forEach((work, i) => {
    const n = i + 1;
    const { years: _years, ...cited } = work.record;
    void _years;
    sources.push({
      id: `src_demo_${n}`,
      doi: work.doi,
      origin: "demo_fixture",
      cited,
      registry: { provider: "crossref", retrievedAt: work.retrievedAt, url: work.url, record: work.record },
      lookup: { status: "found", checkedAt: work.retrievedAt },
      tags: DEMO_TAGS[work.doi] ?? [],
      note: "",
      addedAt: now,
    });
    if (work.abstract) {
      evidence.push({
        id: `ev_demo_${n}`,
        sourceId: `src_demo_${n}`,
        text: work.abstract,
        scope: "abstract",
        locator: "Abstract",
        provenance: {
          provider: "crossref",
          retrievedAt: work.retrievedAt,
          url: work.url,
          note: "Abstract as deposited with Crossref, markup removed. Saved with the demo project.",
        },
        version: hashText(work.abstract),
      });
    }
  });
  return { sources, evidence };
}

export function buildDemoProject(now: string): Project {
  const { sources, evidence } = demoSourcesAndEvidence(now);
  return {
    id: newId("prj"),
    name: "Demo: retrieval practice",
    kind: "demo",
    question: DEMO_QUESTION,
    plan: suggestPlan(DEMO_QUESTION),
    sources,
    evidence,
    evidenceSet: { ids: [], approvedFingerprint: null, approvedAt: null },
    claims: [],
    aiRuns: [],
    activity: [
      {
        at: now,
        text: `Demo project created with ${sources.length} real Crossref records saved on ${FIXTURES_FETCHED_AT.slice(0, 10)}.`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/** The sample brief cites the demo evidence by ID, so it is only offered where that evidence exists. */
export function sampleAvailable(p: Pick<Project, "evidence">): boolean {
  return p.evidence.some((e) => e.id.startsWith("ev_demo_"));
}
