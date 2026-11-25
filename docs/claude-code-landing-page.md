# Claude Code brief for the TRACE landing page

Redesign the public welcome screen in the existing TRACE Next.js app. The backend and workspace already implement all five judging requirements. Build a complete, responsive landing page with React components and Motion for React (formerly Framer Motion). Preserve the current project, demo, reference checker and citation-trap entry points.

## Visual direction

Use a light editorial style with plum typography, generous spacing and a single dark plum evidence panel as the visual anchor. Use frosted glass selectively where the result floats over the evidence panel. Give text a solid, high-contrast surface. The overall composition should feel like a finished research product, with one clear focal point and a quiet workspace behind it.

- **First viewport.** Keep the product name and the headline **Research you can defend.** Show a clear sentence describing what a student gets. Give **Open the demo project** primary weight and **Check a reference** secondary weight. Put **Run the citation trap** beside the proof it demonstrates. Keep the existing **Projects and tools** action and the link to the start-project form.
- **Signature interaction.** Build a real React evidence preview from the existing Roediger and Karpicke fixture. Let visitors switch between the stored excerpt and the altered version. The change from **one week** to **one month** must be visible. Derive the result from the existing `checkExcerpt` helper and show an explicit status in words. Animate the active control and status transition with Motion. Keep both states the same approximate height and make both usable with the keyboard and with reduced motion enabled. The preview makes no external request.
- **Below the fold.** Use one concise workflow section for finding, comparing, approving and exporting. Then offer a directly usable new-project form and a short explanation of local storage. Use typography and dividers to organise the sections. Product content should carry the visual weight. Keep the existing layout flexible at phone widths.

## Implementation

- Build the welcome screen as a small number of readable React components. Keep Phase 2 app behaviour in place. Use the existing `Button`, input and status primitives where they fit. Scope the dedicated styles to the welcome screen. Preserve the current accessible names and mobile controls used by the deployed journeys.
- Use the `motion` package with imports from `motion/react`. Limit motion to a brief page reveal and the interactive evidence transition. Respect reduced-motion preferences and keep the interface readable before and during animation. Match the installed React version, reuse the self-hosted fonts and avoid adding another UI framework.
- Keep copy factual. The excerpt check establishes whether words occur in the stored passage. A registry check establishes reference identity. Student review determines approval. Keep the sample label where needed and use the real sample values rather than fabricated testimonials, customer numbers or results.
- Keep all API routes, citation logic, exports, approval rules, deployment settings and presentation files outside the implementation scope. Preserve the relative project flow once visitors leave the welcome screen.

## Verification

Run lint, typecheck, unit tests and the production build. Open a fresh desktop and phone viewport. Confirm the demo, reference checker, citation trap, project tools and new-project form still open the right workflow. Exercise the excerpt switch by keyboard, verify its status change, check the reduced-motion path, and check for overflow at phone width. Return the finished component changes and actual test results.
