# Start here: TRACE hackathon build kit

Prepared on 24 November 2026. This is a build-prompt and source-document kit, not an implemented application.

## Recommended workflow

1. Extract this ZIP. Open the resulting trace-hackathon folder in Claude Code (terminal or supported editor integration), with access to its files, terminal and web research. Keep normal permission checks enabled.
2. For the main build, my recommendation is Claude Fable 5.2 at Extra high (xhigh) effort. In a current Claude Code session, select `/model claude-fable-5-2`, then `/effort xhigh`. See RESEARCH_SOURCES.md for the official model documentation checked on 24 November 2026. For small event-day fixes, Opus 5.5 at High is a practical alternative; that is a recommendation, not a guarantee.
3. Paste the entire contents of MASTER_PROMPT.md as one request. The three original PDFs are already in inputs/. Claude should create the application, durable context, tests and submission assets in this folder. Do not create a nested second trace-hackathon folder.
4. Supply an application API key only through the local/deployment secret configuration when needed. Access to a model in a chat does not itself configure a runtime API key. Some subscription plans now offer separately claimed API credits; verify your actual Console balance and access. Do not paste keys into the prompt log or commit them.
5. Run the app and all generated checks yourself before trusting the demo. No single prompt guarantees a finished app or a hackathon win. Review actual test results and any missing credentials, access or tools.

## Using Claude in a browser instead

Upload MASTER_PROMPT.md and all three PDFs individually to a Claude project/chat. Enable the available web research and code/file tools. Paste the full prompt into the message. The browser environment may not be able to launch, inspect or deploy a complete Next.js application; Claude must report those limitations rather than claim a tested local build. Claude Code is the intended execution environment for this prompt.

## What is in this kit

- MASTER_PROMPT.md: the single self-contained build request.
- inputs/: exact copies of all three uploaded organiser PDFs.
- RESEARCH_SOURCES.md: official external references used to inform the recommendations.
- .gitignore: initial protection for the organiser PDFs, secrets and generated local files. Claude should refine it as it scaffolds the app.

No frontend files need to be created manually first. GitHub and deployment accounts are useful for eventual submission, but the local build can start without a live deployment. The hackathon documents explicitly allow a declared laptop-only demo when a live URL is not possible.

## Deadlines and non-technical risks

- Thursday 26 November 2026, before 9:00 AM: at most six PowerPoint slides, judged without a presentation. Submit early.
- Thursday 26 November, 1:15 PM: arrive for briefing and surprise requirements; development is 1:30-3:00 PM.
- Before 3:00 PM: submit accessible repository, actual prompt log, and live link where possible; declare laptop-only execution when necessary.
- Presentation is eight minutes plus two minutes of questions. Team AI quiz starts at 3:15 PM.
- Building ahead is expected. Changing an assigned team needs organiser approval, and every member is expected to contribute. Notify the organisers about non-responsive teammates rather than silently changing the team or fabricating contributions.

See the original PDFs for authoritative details. Their requirements override this summary.

## Resume without the original chat

The build prompt requires Claude to maintain CLAUDE.md and PROGRESS.md. Start any later coding session in the same folder and direct it to those files and the original PDFs. The application itself should store a reload-safe local project, but browser-local storage is not a cloud backup.
