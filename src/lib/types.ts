import { z } from "zod";

/** Bump when the stored shape changes; storage.ts quarantines anything else. */
export const SCHEMA_VERSION = 1;

export const AuthorSchema = z.object({
  family: z.string(),
  given: z.string().optional(),
});
export type Author = z.infer<typeof AuthorSchema>;

/** Bibliographic metadata. Kept apart from source text (see Evidence). */
export const BiblioSchema = z.object({
  title: z.string(),
  authors: z.array(AuthorSchema),
  year: z.number().int().nullable(),
  container: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
});
export type Biblio = z.infer<typeof BiblioSchema>;

/** A registry record also carries every year the registry lists, so online/print differences stay visible. */
/** A retraction or withdrawal notice that the registry links to this work (Crossref `updated-by`). */
export const RetractionSchema = z.object({
  kind: z.enum(["retraction", "withdrawal"]),
  noticeDoi: z.string().nullable(),
  date: z.string().nullable(),
  source: z.string().nullable(),
});
export type Retraction = z.infer<typeof RetractionSchema>;

export const RegistryRecordSchema = BiblioSchema.extend({
  retraction: RetractionSchema.optional(),
  years: z.object({
    print: z.number().int().optional(),
    online: z.number().int().optional(),
    issued: z.number().int().optional(),
  }),
});
export type RegistryRecord = z.infer<typeof RegistryRecordSchema>;

export const RegistrySnapshotSchema = z.object({
  provider: z.enum(["crossref", "datacite"]),
  retrievedAt: z.string(),
  url: z.string(),
  record: RegistryRecordSchema,
});
export type RegistrySnapshot = z.infer<typeof RegistrySnapshotSchema>;

export const LookupSchema = z.object({
  status: z.enum(["found", "not_found", "could_not_check", "not_attempted"]),
  checkedAt: z.string().nullable(),
  detail: z.string().optional(),
});
export type Lookup = z.infer<typeof LookupSchema>;

export const SourceSchema = z.object({
  id: z.string(),
  /** Normalised DOI, or null for hand-entered references. */
  doi: z.string().nullable(),
  origin: z.enum(["crossref_search", "doi_lookup", "citation_check", "manual", "demo_fixture"]),
  /** What the student cites. APA references are formatted from this, never from a model. */
  cited: BiblioSchema,
  /** The registry record as retrieved, untouched. Null when none was obtained. */
  registry: RegistrySnapshotSchema.nullable(),
  lookup: LookupSchema,
  tags: z.array(z.string()),
  note: z.string(),
  addedAt: z.string(),
  /** Set only on citation-trap copies: says what was deliberately altered. */
  testCorruption: z.string().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const EvidenceSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  text: z.string(),
  /** MVP scope: abstracts and passages the student pastes. Full-text retrieval is out of scope. */
  scope: z.enum(["abstract", "user_pasted"]),
  /** "Abstract", or the student's own locator. Never an invented page number. */
  locator: z.string(),
  provenance: z.object({
    provider: z.enum(["crossref", "openalex", "user"]),
    retrievedAt: z.string(),
    url: z.string().optional(),
    note: z.string().optional(),
  }),
  /** Hash of `text`; approvals and excerpt checks are tied to it. */
  version: z.string(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const SupportSchema = z.enum(["supports", "partial", "insufficient"]);
export type Support = z.infer<typeof SupportSchema>;

export const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  /** "inference" = no source passage; shown and exported as such. */
  kind: z.enum(["evidence", "inference"]),
  evidenceId: z.string().nullable(),
  excerpt: z.string(),
  /** Suggested by the model (or by the sample). Fallible; never computed by TRACE. */
  support: SupportSchema.nullable(),
  limitations: z.string(),
  origin: z.enum(["live_ai", "sample", "manual"]),
  model: z.string().optional(),
  /** The drafting run that produced this claim (AI or sample), so a disclosure counts that run's passages only. */
  runId: z.string().optional(),
  /** True once the student changes wording, excerpt or evidence after creation. */
  edited: z.boolean(),
  decision: z.enum(["pending", "approved", "rejected"]),
  /** Fingerprint of the claim at approval time; see approvals.ts. */
  approvedFingerprint: z.string().nullable(),
  testCorruption: z.string().optional(),
  createdAt: z.string(),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const PlanSchema = z.object({
  terms: z.array(z.string()),
  yearFrom: z.number().int().nullable(),
  yearTo: z.number().int().nullable(),
  scopeNote: z.string(),
  approvedFingerprint: z.string().nullable(),
  approvedAt: z.string().nullable(),
});
export type Plan = z.infer<typeof PlanSchema>;

/**
 * Rules in force for this project: the assignment's or institution's constraints, set by the student.
 * Defaults apply to projects saved before rules existed, so stored data stays readable.
 */
export const RulesSchema = z.object({
  aiDrafting: z.enum(["approved_evidence", "off"]),
  minYear: z.number().int().nullable(),
  blockRetracted: z.boolean(),
});
export type Rules = z.infer<typeof RulesSchema>;
export const DEFAULT_RULES: Rules = { aiDrafting: "approved_evidence", minYear: null, blockRetracted: true };

export const AiRunSchema = z.object({
  id: z.string(),
  at: z.string(),
  mode: z.enum(["live", "sample"]),
  model: z.string().nullable(),
  evidenceIds: z.array(z.string()),
  accepted: z.number().int(),
  rejected: z.array(z.string()),
});
export type AiRun = z.infer<typeof AiRunSchema>;

export const ActivitySchema = z.object({ at: z.string(), text: z.string() });
export type Activity = z.infer<typeof ActivitySchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** "trap" = disposable citation-trap test copy; labelled everywhere, including exports. */
  kind: z.enum(["user", "demo", "trap"]),
  question: z.string(),
  plan: PlanSchema,
  rules: RulesSchema.default(DEFAULT_RULES),
  /** The student's own text, written in TRACE's writing space. Never generated by TRACE. */
  writing: z.string().max(40000).default(""),
  /** Reference style for the list and in-text citations. */
  citationStyle: z.enum(["apa", "harvard1"]).default("apa"),
  sources: z.array(SourceSchema),
  evidence: z.array(EvidenceSchema),
  evidenceSet: z.object({
    ids: z.array(z.string()),
    approvedFingerprint: z.string().nullable(),
    approvedAt: z.string().nullable(),
  }),
  claims: z.array(ClaimSchema),
  aiRuns: z.array(AiRunSchema),
  /** Local convenience history. Not tamper-resistant and not a compliance record. */
  activity: z.array(ActivitySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const AppStateSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  projects: z.array(ProjectSchema),
  activeProjectId: z.string().nullable(),
  /** Ids of projects deleted in this browser, so a second open tab cannot bring them back (see mergeStates). */
  deletedIds: z.array(z.string()).optional(),
});
export type AppState = z.infer<typeof AppStateSchema>;

/** Every provider adapter answers with one of these, so "not found" can never be confused with "could not check". */
export type Outcome<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      kind: "not_found" | "rate_limited" | "timeout" | "unavailable" | "no_key" | "malformed" | "bad_request";
      message: string;
    };
