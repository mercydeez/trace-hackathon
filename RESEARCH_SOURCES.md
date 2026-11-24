# Research notes and official sources

Checked on 24 November 2026. External references inform the proposed implementation; they are not additional hackathon rules. API availability, model access, prices, quotas and package behaviour should be rechecked when implementing. No product uniqueness or contest outcome is guaranteed.

## Authoritative competition sources

- inputs/AI_Club_Hackathon_2026_Problem_Statement.pdf, pages 1-2: combined research assistant/reference manager; real references, traceable claims, human control; example approaches and phase overview.
- inputs/AI_Club_Hackathon_2026_Submission_Guidelines_and_Rubrics.pdf, pages 1-3: six-slide deck, deadlines, submission requirements, sample labels, 30/5/65 scoring and full criteria.
- inputs/AI_Club_Hackathon_2026_Rules_and_Regulations.pdf, pages 1-3: event schedule, preparation/tools, assigned-team rules, prompt logging, honesty/privacy, presentation length, quiz and attendance requirements.

## Model choice and execution environment

- Anthropic Claude Fable: https://www.anthropic.com/claude/fable
  Describes Fable 5.2 as its most capable generally available model for difficult technical work; says Opus 5.5 is a starting point for everyday coding. Our recommendation of Fable 5.2/xhigh for this broad one-shot build is a judgement based on that positioning, not an independent benchmark claim.
- Claude Code model configuration: https://code.claude.com/docs/en/model-config
  Current model aliases/IDs, effort settings, version/access restrictions and tradeoffs. Use the exact model ID to avoid ambiguity in aliases or gateways.
- Claude model/effort settings: https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings
  High is described as a quality/speed balance; Extra high is suited to long-running coding/agentic tasks. Higher effort uses more tokens. Do not assume Max is the most practical default.
- API billing and subscription distinction: https://support.claude.com/en/articles/9876003-why-is-claude-api-usage-billed-separately-from-my-paid-claude-plan
- Subscription API credits: https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers
  Some current plans include separately claimed API credits. Having chat access is not the same as having a configured application API key or sufficient credits.

## Relevant skills

- Official Anthropic skills repository: https://github.com/anthropics/skills
- Frontend design: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- Web application testing: https://github.com/anthropics/skills/blob/main/skills/webapp-testing/SKILL.md
- Security considerations: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
  Use trusted sources; review scripts and dependencies. Skills available in one Claude surface are not necessarily installed in another.

## Reference management and research products

- Zotero basics: https://www.zotero.org/support/quick_start_guide
- Mendeley collections: https://www.elsevier.support/mendeley/answer/how-do-i-organize-my-references-in-to-collections-in-mendeley-reference-manager
- ResearchRabbit: https://www.researchrabbit.ai/
- SciSpace: https://scispace.com/
- Elicit reports: https://elicit.com/solutions/reports

These products already address combinations of reference organisation, discovery and cited synthesis. TRACE's proposed hackathon focus is a small, understandable, demonstrable checking workflow, not a claim that evidence-linked research is new.

## Implementation references

- Crossref REST API: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- Crossref access/authentication: https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/
  Public metadata access is available. Member-deposited metadata and abstract coverage vary; registry matches do not establish scientific truth or claim support.
- OpenAlex authentication: https://help.openalex.org/api/authentication/
  The current documentation allows basic no-key usage with limited budget and recommends a free key for larger use. Older indexed documentation differs; use the current official page and test the actual API.
- OpenAlex pricing: https://help.openalex.org/access/pricing/
- Citation.js: https://citation.js.org/
  Provides CSL-based bibliography formatting; verify the exact APA 7 style and required plugins during implementation.
- Gemini API pricing/availability/privacy: https://ai.google.dev/gemini-api/docs/pricing
  Some models have free-tier access, with limits and model-specific availability. The free-tier table states content can be used to improve products. Use public/non-sensitive demonstration data and disclose what leaves the browser; do not assume all models are free or all provider modes have identical terms.

## Suggested seed topic, not pre-implemented demo data

The retrieval-practice topic is proposed for student relevance and a compact evidence set. These are real starting points to inspect, not a substitute for fetching and validating metadata/content:
- Roediger and Karpicke (2006), Test-Enhanced Learning: https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/
- Dunlosky et al. (2013), Improving Students' Learning With Effective Learning Techniques: https://journals.sagepub.com/doi/10.1177/1529100612453266

No source abstracts, claims, quotations, UI screenshots or live API responses have been preloaded into an application in this kit. Claude must obtain legitimate usable evidence and clearly distinguish authentic cached records, sample AI writing and deliberately corrupted test cases.
