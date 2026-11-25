# TRACE — design system

Visual language follows ReproSense (reprosense.vercel.app), light theme only, chosen by the owner on 25 Nov 2026. Tokens live in `src/app/globals.css`; primitives in `src/components/ui.tsx`.

## World

A calm research workbench on soft plum paper. Plum carries action and selection, pink is the accent, teal means a check passed, amber needs attention, red blocks. Colour washes stay behind the page; surfaces are white and flat.

## Layout

Three panes at desktop width: a 248px step rail (project, question, four steps), the main workspace, and a 400px Claim Inspector column while a claim is open (≥1200px). Below 1024px the rail becomes a top bar plus a four-segment stepper; the inspector becomes a right drawer below 1200px. The real task for each step is above the fold at 1366×768: no banners, bands or repeated status above it.

- Plan: one 720px column, sticky action footer.
- Discover: search and results; "add a source you already have" in a side column at ≥1280px.
- Library: master–detail (340px list with its own scroll, stacked detail pane).
- Brief: evidence summary bar, draft toolbar, flat claim list, sticky export gate.

## Tokens

- **Type:** Plus Jakarta Sans. 12 meta · 14 label/secondary · 16 body · 18 claim and reading · 20 section heading · 24 page heading. Weights 600 and 700. Tracking −0.02em on headings.
- **Spacing:** 4 · 8 · 12 · 16 · 24 · 32 · 48. Card padding 24, section gap 32, inline gap 8, field stack 12.
- **Radius:** 8 inputs and inner boxes · 12 cards and panels · full for pills.
- **Controls:** 40px (md) and 32px (sm), shared by inputs and buttons.
- **Colour:** paper `#f6f1f4`, sheet `#fff`, tint `#f4edf4`, ink `#2e2233`, ink-soft `#6e5d73`, faint `#746479`, rule `#eee5ef`, rule-strong `#dfd2e2`, plum `#4b3653`, accent `#c9559f` / text `#a24884`, ok `#37776f` on `#e2f3ef`, warn `#986013` on `#fbeedb`, bad `#c0352b` on `#fce6e3`.
- **Depth:** shadows only on floating layers (dialogs, sticky bars, inspector).
- **Motion:** 0.15s hovers, 0.28s entrances, exponential ease-out; off under reduced motion.

## Rules

One card level; rows inside cards use dividers. Status is always glyph + words, never colour alone. One "worst issue" chip per claim row. No eyebrow labels above headings, no hover lift on non-clickable surfaces, no coloured side borders on cards or quotes.
