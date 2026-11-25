# TRACE — design system

TRACE uses a light workspace with a restrained plum accent. Tokens live in `src/app/globals.css` and shared controls in `src/components/ui.tsx`.

## World

A research workbench on near-white paper. Plum carries action and selection, teal marks a passed check, amber signals attention, and red marks a blocker.

## Welcome screen

The welcome screen uses plum type and a dark evidence panel as its focal point. `Welcome.tsx` and `EvidencePreview.tsx` use styles scoped to `.welcome*` in `globals.css`. The panel switches between the stored Roediger and Karpicke excerpt ("1 week") and the altered one ("1 month"). `checkExcerpt` compares both against the local demo fixture. A glyph and a text label show the result. The frosted result card is 92% opaque for readable text. Below the hero, visitors can read the workflow and start a project. Motion is limited to a brief reveal, the active-control pill and the status swap. Reduced-motion preferences turn off these effects.

## Layout

Three panes at desktop width: a 248px step rail (project, question, four steps), the main workspace, and a 400px Claim Inspector column while a claim is open (≥1200px). Below 1024px the rail becomes a top bar plus a four-segment stepper; the inspector becomes a right drawer below 1200px. The real task for each step is above the fold at 1366×768: no banners, bands or repeated status above it.

- Plan: one 720px column, sticky action footer.
- Discover: search and results; "add a source you already have" in a side column at ≥1280px.
- Library: master–detail (340px list with its own scroll, stacked detail pane).
- Brief: evidence and drafting come first in a new brief. Existing claims come first during review. The sticky export bar links to the blockers and reports reference formatting failures.

## Tokens

- **Type:** Plus Jakarta Sans. 12 meta · 14 label/secondary · 16 body · 18 claim and reading · 20 section heading · 24 page heading. Weights 600 and 700. Tracking −0.02em on headings.
- **Spacing:** 4 · 8 · 12 · 16 · 24 · 32 · 48. Card padding 24, section gap 32, inline gap 8, field stack 12.
- **Radius:** 8 inputs, buttons and inner boxes · 12 cards and panels · full for status chips.
- **Controls:** 40px (md) and 32px (sm), shared by inputs and buttons.
- **Colour:** paper `#f8f7fa`, sheet `#fff`, tint `#f3f0f7`, ink `#241d32`, ink-soft `#5a5268`, faint `#6c6279`, rule `#e9e4ef`, rule-strong `#d8d0e3`, plum `#473471`, accent `#7052a0` and text `#62438d`, ok `#236b5e` on `#e2f3ef`, warn `#84530d` on `#fbeedb`, bad `#a92d26` on `#fce6e3`.
- **Depth:** a deep shadow on the welcome evidence panel, soft shadows on primary actions and floating layers.
- **Motion:** 150 ms control feedback, a 350 ms welcome reveal, a 160 ms excerpt status swap, and short dialog entrances. Reduced-motion preferences turn off these effects.

## Rules

One card level; rows inside cards use dividers. Status is always glyph + words, never colour alone. One "worst issue" chip per claim row. No eyebrow labels above headings, no hover lift on non-clickable surfaces, no coloured side borders on cards or quotes.
