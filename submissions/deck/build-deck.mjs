// Generates submissions/phase-1-deck.pptx — six slides, 16:9, read without a presenter.
// Run from the project root:  node submissions/deck/build-deck.mjs   (or: npm run deck)
// Wording source: submissions/phase-1-content.md. Each slide section below starts with its
// content as plain data; edit the wording there. "**text**" inside a string renders bold.

// ── STATUS ── rendered as the status line on slide 6. Replace at the final pass with real values.
const STATUS = {
  // Values from the full run recorded in docs/qa-report.md. Update only from a real run.
  unitTests: '192 of 192', // number of unit tests passing
  e2eTests: '18 of 18', // number of browser journey tests passing
  date: '25 Nov 2026', // date the tests were run
  liveAi: 'Yes, 25 Nov', // live AI call verified: yes / no
  deployed: 'trace-hackathon.vercel.app', // URL, or "laptop demo declared"
};
const PLACEHOLDER = 'to be confirmed';

import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');
const JSZip = createRequire(require.resolve('pptxgenjs'))('jszip'); // pptxgenjs's own dependency
const OUT = fileURLToPath(new URL('../phase-1-deck.pptx', import.meta.url));

// ── Design tokens ──────────────────────────────────────────────────────────────────────────
const C = {
  bg: 'FAF7F2', ink: '1C1B19', soft: '3F3B36', muted: '5C574F', border: 'D9D4CA', card: 'FFFFFF', tint: 'F2EDE3',
  accent: '0F5C4A', amber: 'B45309', red: '9F1239', redTint: 'F9ECF0', white: 'FFFFFF',
};
const F = { head: 'Georgia', body: 'Calibri', mono: 'Consolas' };
const W = 13.333, M = 0.5, CW = W - 2 * M; // slide width, side margin, content width (inches)
const TOP = 1.68, BOTTOM = 6.86; // content band
const TOTAL = 6;
const FOOTER = 'TRACE — Research you can defend.';

const pres = new PptxGenJS();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in = 16:9
pres.title = 'TRACE — Research you can defend.';
const S = pres.ShapeType;

// ── Helpers ────────────────────────────────────────────────────────────────────────────────
// Text-box margins are [left, right, bottom, top] in points (pptxgenjs quirk).
const txt = (slide, t, o) =>
  slide.addText(t, { fontFace: F.body, fontSize: 10.5, color: C.ink, margin: 0, valign: 'top', isTextBox: true, ...o });

const card = (slide, x, y, w, h, o = {}) =>
  slide.addShape(S.rect, { x, y, w, h, fill: { color: o.fill ?? C.card }, line: { color: o.line ?? C.border, width: o.lineW ?? 0.75 } });

const label = (slide, t, x, y, w, o = {}) =>
  txt(slide, t.toUpperCase(), { x, y, w, h: 0.22, bold: true, color: C.accent, charSpacing: 0.6, ...o });

const rule = (slide, x, y, w, h = 0) => slide.addShape(S.line, { x, y, w, h, line: { color: C.border, width: 0.75 } });

// "**bold**" markup -> runs. Paragraph-level options go on the first run of the paragraph.
function rich(s, first = {}) {
  const runs = s.split('**').map((t, i) => ({ text: t, options: i % 2 ? { bold: true } : {} })).filter((r) => r.text);
  Object.assign(runs[0].options, first);
  return runs;
}
const paras = (list, first = {}) =>
  list.flatMap((p, i) => {
    const runs = rich(p, first);
    if (i < list.length - 1) runs.at(-1).options.breakLine = true;
    return runs;
  });
const bullets = (list) => paras(list, { bullet: { indent: 10 } });

const CHIP = {
  student: { fill: C.accent, line: C.accent, text: C.white },
  code: { fill: C.card, line: C.ink, text: C.ink },
  ai: { fill: C.amber, line: C.amber, text: C.white },
  red: { fill: C.red, line: C.red, text: C.white },
};
function chip(slide, t, x, y, kind, perChar = 0.08) {
  const st = CHIP[kind];
  const w = 0.22 + t.length * perChar; // estimated width; use ~0.1 per character for all-caps text
  slide.addText(t, {
    shape: S.roundRect, rectRadius: 0.05, x, y, w, h: 0.24, fill: { color: st.fill }, line: { color: st.line, width: 0.75 },
    fontFace: F.body, fontSize: 10.5, bold: true, color: st.text, align: 'center', valign: 'middle', margin: 0,
  });
  return w;
}

function num(slide, n, x, y, fill = C.accent) {
  slide.addText(String(n), {
    shape: S.ellipse, x, y, w: 0.3, h: 0.3, fill: { color: fill }, line: { color: fill, width: 0.75 },
    fontFace: F.head, fontSize: 11, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0,
  });
}

// Straight horizontal or vertical connector; arrowhead at (x2, y2) unless head is 'none'.
function arrow(slide, x1, y1, x2, y2, o = {}) {
  const forward = x2 >= x1 && y2 >= y1;
  slide.addShape(S.line, {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    line: { color: o.color ?? C.ink, width: o.width ?? 1.25, [forward ? 'endArrowType' : 'beginArrowType']: o.head ?? 'triangle' },
  });
}

// Real pptx table: hairline row rules, emerald header rule, no fills. Row heights auto-size.
function table(slide, head, rows, o) {
  const line = (pt, color) => [{ type: 'none' }, { type: 'none' }, { type: 'solid', pt, color }, { type: 'none' }];
  const data = [
    head.map((t) => ({ text: t.toUpperCase(), options: { bold: true, color: C.accent, charSpacing: 0.6, border: line(1.25, C.accent) } })),
    ...rows.map((r) =>
      r.map((t, i) => ({ text: t.includes('**') ? rich(t) : t, options: { border: line(0.75, C.border), ...(o.colOpts?.[i] ?? {}) } })),
    ),
  ];
  slide.addTable(data, {
    x: o.x, y: o.y, w: o.w, colW: o.colW, fontFace: F.body, fontSize: o.fontSize ?? 10, color: C.ink, valign: 'top',
    margin: o.margin ?? [4, 6, 4, 6], // points: top, right, bottom, left
  });
}

// Consistent header (rubric-area kicker, title, headline) and footer.
function frame(n, kickers, title, headline, o = {}) {
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  let x = M;
  for (const k of kickers) {
    const w = 0.3 + k.length * 0.105;
    slide.addText(k.toUpperCase(), {
      shape: S.rect, x, y: 0.38, w, h: 0.26, fill: { color: C.accent }, line: { color: C.accent, width: 0.75 },
      fontFace: F.body, fontSize: 10.5, bold: true, color: C.white, charSpacing: 1, align: 'center', valign: 'middle', margin: 0,
    });
    x += w + 0.1;
  }
  txt(slide, title, { x: M, y: 0.68, w: CW, h: 0.5, fontFace: F.head, fontSize: 28, bold: true, valign: 'middle' });
  txt(slide, headline, { x: M, y: 1.2, w: o.headlineW ?? CW, h: o.headlineH ?? 0.3, fontFace: F.head, fontSize: 13, color: C.soft });
  rule(slide, M, 7.0, CW);
  txt(slide, FOOTER, { x: M, y: 7.06, w: 6, h: 0.24, color: C.muted, valign: 'middle' });
  txt(slide, `${n} / ${TOTAL}`, { x: W - M - 2, y: 7.06, w: 2, h: 0.24, color: C.muted, align: 'right', valign: 'middle' });
  return slide;
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Slide 1 — TRACE: Research you can defend.
// ════════════════════════════════════════════════════════════════════════════════════════════
{
  const D = {
    kicker: 'Framing',
    title: 'TRACE: Research you can defend.',
    subtitle:
      'A reference manager and a bounded AI research assistant. Find real sources, inspect the evidence, approve its use, and export a cited brief with an honest AI-use disclosure.',
    left: [
      ['The problem (from the brief)',
        'AI tools give a real author the wrong paper, cite a DOI that does not exist, quote a sentence that is not in the source, or state a guess as a fact. A polished assignment hides these errors, and the student is responsible for every one.'],
      ['Who it is for',
        'A student writing a short evidence-based assignment who wants the speed of AI but has to defend every citation.'],
      ['What they leave with',
        'A brief with excerpts for sourced claims, clearly labelled inferences, APA 7 references and a disclosure of TRACE’s AI use.'],
    ],
    positionLabel: 'Our position',
    quote: 'A real DOI does not make a claim supported.',
    position:
      'Checking that a reference exists is only the first of five questions. TRACE answers them separately and never merges them into one green tick:',
    questions: [
      ['Reference identity', 'Do the cited title, first author and year agree with Crossref’s record for that DOI?'],
      ['Evidence access', 'Abstract, a passage the student pasted, or no text at all.'],
      ['Excerpt integrity', 'Is the quoted excerpt really in the stored text? (exact text match)'],
      ['Support assessment', 'The AI’s own suggestion, labelled as fallible.'],
      ['Student decision', 'Pending, approved, rejected, or stale after an edit.'],
    ],
    notNew: ['What is not new',
      'Elicit and SciSpace already link AI claims to source quotes, and Zotero already looks up DOIs. TRACE’s contribution is a small workflow in which the checks are deterministic, shown one by one, and enforced at export.'],
  };

  const slide = frame(1, [D.kicker], D.title, D.subtitle, { headlineH: 0.56, headlineW: 9.8 });
  const y0 = 1.98, stripH = 0.62, stripY = BOTTOM - stripH, colH = stripY - 0.15 - y0;

  // Left column: problem, audience, outcome
  const lw = 4.5, pad = 0.18, lh = [1.42, 1.08, colH - 2.5 - 0.3];
  let y = y0;
  D.left.forEach(([lab, body], i) => {
    card(slide, M, y, lw, lh[i]);
    label(slide, lab, M + pad, y + 0.14, lw - 2 * pad);
    txt(slide, body, { x: M + pad, y: y + 0.42, w: lw - 2 * pad, h: lh[i] - 0.52, fontSize: 11 });
    y += lh[i] + 0.15;
  });

  // Right column: position, quote, the five separate questions
  const rx = M + lw + 0.2, rw = CW - lw - 0.2, rp = 0.22;
  card(slide, rx, y0, rw, colH);
  label(slide, D.positionLabel, rx + rp, y0 + 0.16, 3);
  txt(slide, D.quote, {
    x: rx + rp, y: y0 + 0.42, w: rw - 2 * rp, h: 0.5, fontFace: F.head, fontSize: 21, bold: true, italic: true, color: C.accent, valign: 'middle',
  });
  txt(slide, D.position, { x: rx + rp, y: y0 + 1.0, w: rw - 2 * rp, h: 0.42, fontSize: 11 });
  const qy = y0 + 1.52, qh = (colH - 1.52 - 0.08) / D.questions.length;
  D.questions.forEach(([name, desc], i) => {
    const ry = qy + i * qh;
    rule(slide, rx + rp, ry, rw - 2 * rp);
    num(slide, i + 1, rx + rp, ry + (qh - 0.3) / 2);
    txt(slide, name, { x: rx + 0.66, y: ry, w: 1.95, h: qh, fontFace: F.head, fontSize: 12, bold: true, valign: 'middle' });
    txt(slide, desc, { x: rx + 2.7, y: ry, w: rw - 2.7 - rp, h: qh, fontSize: 11, valign: 'middle' });
  });

  // Bottom strip: what is not new
  card(slide, M, stripY, CW, stripH, { fill: C.tint });
  label(slide, D.notNew[0], M + pad, stripY, 1.75, { h: stripH, valign: 'middle' });
  txt(slide, D.notNew[1], { x: M + 2.05, y: stripY, w: CW - 2.05 - pad, h: stripH, fontSize: 11, valign: 'middle' });
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Slide 2 — Workflow
// ════════════════════════════════════════════════════════════════════════════════════════════
{
  const D = {
    kicker: 'Workflow',
    title: 'Workflow: the student decides, code checks, AI drafts once',
    headline: 'Eight steps, three roles, four human checkpoints.',
    // who: [chip text, role]; role is student | code | ai.  checkpoint: [name, what is approved]
    steps: [
      { name: 'Ask', who: [['Student', 'student']], text: 'Writes the research question.' },
      { name: 'Plan', who: [['Code', 'code'], ['Student', 'student']],
        text: 'Rule-based search terms (no AI); the student edits terms and year scope and sets the rules in force.',
        checkpoint: ['Checkpoint 1', 'Approve the plan and its rules.'] },
      { name: 'Discover', who: [['Code — FIND', 'code']],
        text: 'Live Crossref search. Each result shows title, authors, year, venue, DOI and whether an abstract exists.' },
      { name: 'Organise', who: [['Student', 'student']],
        text: 'Save to the library, tag, annotate, filter. Add by DOI. Check a citation someone gave you, or a pasted reference list. Duplicate DOIs are blocked.' },
      { name: 'Approve evidence', who: [['Student', 'student']],
        text: 'Select passages and see exactly what will be sent to the model. No source text means no AI summary.',
        checkpoint: ['Checkpoint 2', 'Approve the evidence set.'] },
      { name: 'Draft', who: [['AI — DRAFT', 'ai']],
        text: 'One structured call returns up to 5 claims. Sourced claims carry an evidence ID and verbatim excerpt. A manual path and labelled sample are available.' },
      { name: 'Check and inspect', who: [['Code — CHECK', 'code'], ['then Student', 'student']],
        text: 'Code validates every claim. The student opens the Claim Inspector, edits or rejects.',
        checkpoint: ['Checkpoint 3', 'Approve each claim.'] },
      { name: 'Export', who: [['Code', 'code'], ['Student', 'student']],
        text: 'The export gate re-checks everything at that moment.',
        checkpoint: ['Checkpoint 4', 'Reviewed brief, or a file marked DRAFT.'] },
    ],
    notes: [
      ['Three roles',
        '**FIND** = code calling scholarly APIs. **DRAFT** = one AI model call over approved evidence only. **CHECK** = deterministic code. We call these steps, not agents: only one of them is an AI model, and none of them acts on its own.'],
      ['The checking step', 'Step 7 runs automatically on every claim, and again inside step 8.'],
      ['Edits propagate',
        'Changing the question, the scope, a passage or a claim makes every approval that depended on it stale. Nothing stays approved by accident.'],
    ],
  };

  const slide = frame(2, [D.kicker], D.title, D.headline);
  const gx = 0.25, gy = 0.28, cw = (CW - 3 * gx) / 4, ch = 1.89, bandH = 0.46, pad = 0.14;
  const cardX = (col) => M + col * (cw + gx);
  const cardY = (row) => TOP + row * (ch + gy);

  D.steps.forEach((st, i) => {
    const col = i % 4, x = cardX(col), y = cardY(Math.floor(i / 4));
    card(slide, x, y, cw, ch);
    num(slide, i + 1, x + pad, y + 0.11);
    txt(slide, st.name, { x: x + 0.54, y: y + 0.1, w: cw - 0.64, h: 0.32, fontFace: F.head, fontSize: 14, bold: true, valign: 'middle' });
    let cx = x + pad;
    for (const [t, role] of st.who) cx += chip(slide, t, cx, y + 0.49, role) + 0.08;
    txt(slide, st.text, { x: x + pad, y: y + 0.82, w: cw - 2 * pad, h: ch - 0.82 - (st.checkpoint ? bandH : 0) - 0.04 });
    if (st.checkpoint) {
      slide.addText(
        [
          { text: st.checkpoint[0].toUpperCase(), options: { bold: true, charSpacing: 0.6, breakLine: true } },
          { text: st.checkpoint[1] },
        ],
        {
          shape: S.rect, x, y: y + ch - bandH, w: cw, h: bandH, fill: { color: C.accent }, line: { color: C.accent, width: 0.75 },
          fontFace: F.body, fontSize: 10.5, color: C.white, valign: 'middle', margin: [10, 6, 0, 0],
        },
      );
    }
    if (col < 3) arrow(slide, x + cw + 0.03, y + ch / 2, x + cw + gx - 0.03, y + ch / 2, { color: C.accent, width: 1.5 });
  });
  // Step 4 -> step 5: down, back to the left, into the second row
  const xa = cardX(3) + cw / 2, xb = cardX(0) + cw / 2, ya = cardY(0) + ch, ym = ya + gy / 2;
  arrow(slide, xa, ya, xa, ym, { color: C.accent, width: 1.5, head: 'none' });
  arrow(slide, xb, ym, xa, ym, { color: C.accent, width: 1.5, head: 'none' });
  arrow(slide, xb, ym, xb, cardY(1) - 0.02, { color: C.accent, width: 1.5 });

  // Notes row
  const ny = cardY(1) + ch + 0.14, nh = BOTTOM - ny, nw = [5.4, 2.6, CW - 5.4 - 2.6 - 0.4];
  let nx = M;
  D.notes.forEach(([lab, body], i) => {
    card(slide, nx, ny, nw[i], nh, { fill: C.tint });
    label(slide, lab, nx + pad, ny + 0.1, nw[i] - 2 * pad);
    txt(slide, rich(body), { x: nx + pad, y: ny + 0.34, w: nw[i] - 2 * pad, h: nh - 0.4 });
    nx += nw[i] + 0.2;
  });
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Slide 3 — Architecture
// ════════════════════════════════════════════════════════════════════════════════════════════
{
  const D = {
    kicker: 'Architecture',
    title: 'Architecture: one small web app',
    headline: 'The browser holds the student’s work. The server only relays to three providers.',
    browser: {
      title: 'Browser (Next.js + React)',
      parts: [
        '**Workspace:** Plan · Discover · Library and evidence · Brief and export · Claim Inspector.',
        '**Domain core** in plain TypeScript, unit-tested: excerpt check, identity comparison, approvals, AI-output validator, export gate.',
        '**Reference storage:** the project (sources, tags, notes, evidence, claims, approvals) is saved in the browser’s local storage, versioned, with JSON backup and restore. No accounts, no database.',
      ],
    },
    link: ['requests', 'results'], // browser -> server, server -> browser
    server: {
      title: 'Server routes (same app)',
      // route, note under the route, provider [name, what it gives], flow = what is sent (label on the arrow)
      routes: [
        { route: '/api/search  /api/doi', provider: ['Crossref REST API', 'metadata and abstracts'], flow: ['search terms, DOIs'] },
        { route: '/api/abstract', provider: ['OpenAlex', 'abstract by DOI when Crossref has none'], flow: ['DOI'] },
        { route: '/api/draft', note: 'The key never reaches the browser.', provider: ['Gemini API', 'one structured call'],
          flow: ['question +', 'approved passages'] },
        { route: '/api/cite', note: 'Citation.js with the APA 7th-edition CSL style, running on our server.' },
      ],
    },
    providersLabel: 'Three providers',
    leaves: ['What leaves the browser',
      'Search terms and DOIs go to scholarly registries. The question and approved passages go to Gemini. The app previews this request and flags that Google’s free tier may use the content to improve its products. Use public material for the hackathon.'],
    change: ['Realistic to change in 90 minutes',
      'One file per provider, one pure function per check, one export gate. A new rule touches one function and its test.'],
    failureLabel: 'Failure is reported as what it is',
    failureHead: ['Situation', 'What the student sees'],
    failures: [
      ['DOI unknown to Crossref', '“Not found in Crossref. This does not show the paper is fake.”'],
      ['Timeout or rate limit', '“Could not check.” Never “Not found”.'],
      ['No abstract available', 'Saved as metadata only; no AI summary is offered.'],
      ['No AI key, or the AI call fails', 'Retry, write manually, or load the labelled sample. Never a silent substitute.'],
      ['Model cites an unknown ID or adds a DOI', 'That item is rejected and shown as rejected.'],
      ['Paper retracted', 'Shown as Retracted beside identity; blocked at export by default.'],
    ],
  };

  const slide = frame(3, [D.kicker], D.title, D.headline);
  const y0 = TOP, dh = 2.6, titleH = 0.32;
  const bx = M, bw = 4.0, sx = 5.6, sw = 3.0, px = 10.1, pw = M + CW - px;
  const container = (x, w, title) => {
    card(slide, x, y0, w, dh, { line: C.accent, lineW: 1 });
    slide.addText(title, {
      shape: S.rect, x, y: y0, w, h: titleH, fill: { color: C.accent }, line: { color: C.accent, width: 1 },
      fontFace: F.head, fontSize: 12, bold: true, color: C.white, valign: 'middle', margin: [9, 6, 0, 0],
    });
  };

  // Browser
  container(bx, bw, D.browser.title);
  txt(slide, paras(D.browser.parts, { paraSpaceAfter: 8 }), { x: bx + 0.16, y: y0 + titleH + 0.12, w: bw - 0.32, h: dh - titleH - 0.2, fontSize: 11 });

  // Browser <-> server
  const my = y0 + dh / 2;
  arrow(slide, bx + bw + 0.05, my - 0.14, sx - 0.05, my - 0.14);
  txt(slide, D.link[0], { x: bx + bw, y: my - 0.4, w: sx - bx - bw, h: 0.22, align: 'center', valign: 'bottom', color: C.soft });
  arrow(slide, sx - 0.05, my + 0.14, bx + bw + 0.05, my + 0.14);
  txt(slide, D.link[1], { x: bx + bw, y: my + 0.18, w: sx - bx - bw, h: 0.22, align: 'center', color: C.soft });

  // Server routes, provider boxes and the arrows between them
  container(sx, sw, D.server.title);
  label(slide, D.providersLabel, px, y0, pw, { h: titleH, valign: 'middle', color: C.muted });
  const rowH = [0.46, 0.46, 0.46, 0.6];
  let ry = y0 + titleH + 0.08;
  D.server.routes.forEach((r, i) => {
    const h = rowH[i], cy = ry + h / 2;
    slide.addText(
      r.note
        ? [{ text: r.route, options: { fontFace: F.mono, bold: true, breakLine: true } }, { text: r.note }]
        : [{ text: r.route, options: { fontFace: F.mono, bold: true } }],
      {
        shape: S.rect, x: sx + 0.12, y: ry, w: sw - 0.24, h, fill: { color: C.bg }, line: { color: C.border, width: 0.75 },
        fontFace: F.body, fontSize: 10.5, color: C.ink, valign: 'middle', margin: [6, 6, 0, 0],
      },
    );
    if (r.provider) {
      arrow(slide, sx + sw + 0.05, cy, px - 0.05, cy);
      txt(slide, r.flow[0], { x: sx + sw, y: cy - 0.25, w: px - sx - sw, h: 0.22, align: 'center', valign: 'bottom', color: C.soft });
      if (r.flow[1]) txt(slide, r.flow[1], { x: sx + sw, y: cy + 0.03, w: px - sx - sw, h: 0.22, align: 'center', color: C.soft });
      slide.addText(
        [{ text: r.provider[0], options: { bold: true, breakLine: true } }, { text: r.provider[1] }],
        {
          shape: S.rect, x: px, y: ry, w: pw, h, fill: { color: C.card }, line: { color: C.ink, width: 1 },
          fontFace: F.body, fontSize: 10.5, color: C.ink, valign: 'middle', margin: [7, 5, 0, 0],
        },
      );
    }
    ry += h + 0.05;
  });

  // Lower band: failure table (left), data-flow note and change note (right)
  const zy = y0 + dh + 0.16, tw = 7.0, nx = M + tw + 0.2, nw = CW - tw - 0.2, pad = 0.14;
  label(slide, D.failureLabel, M, zy, tw);
  table(slide, D.failureHead, D.failures, { x: M, y: zy + 0.28, w: tw, colW: [2.75, tw - 2.75], fontSize: 10.5, colOpts: [{ bold: true }], margin: [3, 6, 3, 6] });

  const h1 = 1.3, h2 = BOTTOM - zy - h1 - 0.12;
  card(slide, nx, zy, nw, h1);
  label(slide, D.leaves[0], nx + pad, zy + 0.12, nw - 2 * pad);
  txt(slide, D.leaves[1], { x: nx + pad, y: zy + 0.38, w: nw - 2 * pad, h: h1 - 0.46 });
  card(slide, nx, zy + h1 + 0.12, nw, h2, { fill: C.tint });
  label(slide, D.change[0], nx + pad, zy + h1 + 0.24, nw - 2 * pad);
  txt(slide, D.change[1], { x: nx + pad, y: zy + h1 + 0.5, w: nw - 2 * pad, h: h2 - 0.56 });
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Slide 4 — Guardrails
// ════════════════════════════════════════════════════════════════════════════════════════════
{
  const D = {
    kicker: 'Guardrails',
    title: 'Guardrails: code paths, not promises',
    headline: 'Eight risks, the code path for each, and one test case that shows them working.',
    head: ['#', 'What could go wrong', 'Mechanism in TRACE'],
    rows: [
      ['An invented reference',
        'The formatter uses stored source records. Hand-entered sources without a DOI carry their own label. The output validator rejects model-supplied reference fields.'],
      ['Citing a source the student never approved',
        'ID allow-list: the model may return only evidence IDs from the approved set. Anything else is rejected and shown.'],
      ['A quote that is not in the source',
        'Deterministic excerpt match against the stored text. Curly quotes, spacing and case are tolerated; numbers, negations and punctuation are not. The real passage is highlighted.'],
      ['A claim that says more than its quote',
        'Claim-details check: numbers and negations in the claim must also appear in the excerpt it quotes, or reviewed export is blocked. Deterministic, no AI.'],
      ['A real DOI with the wrong details, or a retracted paper',
        'Cited title, first author and year are compared with the Crossref record; disagreements are shown, never silently repaired. Crossref retraction notices (largely Retraction Watch data) give a separate “Retracted” status, blocked at export by default.'],
      ['A guess stated as fact',
        'Points without a source passage are marked “inference”. Support ratings are labelled “AI-suggested, can be wrong”. No confidence scores, no global “Verified” badge.'],
      ['A stale approval, or unreviewed work leaving the tool',
        'Approvals store a fingerprint; any later edit makes them “stale”. One export gate re-checks IDs, quotes, claim details, approvals, mismatches and project rules; anything else downloads as DRAFT.'],
      ['A failure dressed up as success',
        '“Not found” and “Could not check” are different states. Sample output is labelled in the workspace, on each claim and in the export. Hard limits: 6 passages, 5 claims, 1 AI call, 1 retry. Source text is treated as data, never as instructions.'],
    ],
    trap: {
      label: 'The citation trap (in the demo)',
      intro: 'A labelled test copy of the demo project with two planted errors:',
      errors: [
        ['A real DOI with an altered year and author order', 'Identity mismatch'],
        ['A real source with a quotation changed from “1 week” to “1 month”', 'Quote mismatch'],
      ],
      result: [
        'Both are caught by the same validators used in normal work. **Reviewed export is blocked.** Fixing one error clears only that error.',
        'Fix only the quote and the claim’s “one month” is still blocked.',
      ],
    },
    quote: ['The paper is real.', 'That does not make this claim supported.'],
  };

  const slide = frame(4, [D.kicker], D.title, D.headline);
  const tw = 8.1, rx = M + tw + 0.25, rw = CW - tw - 0.25, pad = 0.16;

  table(slide, D.head, D.rows.map((r, i) => [String(i + 1), ...r]), {
    x: M, y: TOP, w: tw, colW: [0.42, 2.25, tw - 2.67], fontSize: 10.5,
    colOpts: [{ bold: true, color: C.accent, fontFace: F.head }, { bold: true }],
  });

  // Citation trap
  const th = 3.84, eh = 0.84;
  card(slide, rx, TOP, rw, th);
  label(slide, D.trap.label, rx + pad, TOP + 0.14, rw - 2 * pad);
  txt(slide, D.trap.intro, { x: rx + pad, y: TOP + 0.42, w: rw - 2 * pad, h: 0.38 });
  D.trap.errors.forEach(([what, tag], i) => {
    const ey = TOP + 0.86 + i * (eh + 0.08);
    card(slide, rx + pad, ey, rw - 2 * pad, eh, { fill: C.redTint, line: C.redTint });
    num(slide, i + 1, rx + pad + 0.1, ey + 0.09, C.red);
    txt(slide, what, { x: rx + pad + 0.5, y: ey + 0.08, w: rw - 2 * pad - 0.6, h: 0.38 });
    chip(slide, tag.toUpperCase(), rx + pad + 0.5, ey + eh - 0.33, 'red', 0.1);
  });
  const ty = TOP + 0.86 + 2 * (eh + 0.08) + 0.02;
  txt(slide, paras(D.trap.result, { paraSpaceAfter: 4 }), { x: rx + pad, y: ty, w: rw - 2 * pad, h: TOP + th - ty - 0.08 });

  // Pull quote
  const qy = TOP + th + 0.14;
  slide.addText(
    [{ text: D.quote[0], options: { breakLine: true } }, { text: D.quote[1] }],
    {
      shape: S.rect, x: rx, y: qy, w: rw, h: BOTTOM - qy, fill: { color: C.accent }, line: { color: C.accent, width: 0.75 },
      fontFace: F.head, fontSize: 20, bold: true, color: C.white, valign: 'middle', margin: [16, 14, 0, 0],
    },
  );
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Slide 5 — Ethics and governance
// ════════════════════════════════════════════════════════════════════════════════════════════
{
  const D = {
    kickers: ['Ethical considerations', 'Governance'],
    title: 'Ethics and governance',
    headline: 'Each risk has a design response. The student stays accountable, and AI use is disclosed from what actually happened.',
    ethicsLabel: 'Ethical considerations: risk → response',
    ethicsHead: ['Risk', 'How the design handles it'],
    ethics: [
      ['Invented citations',
        'Sources enter only through Crossref search, DOI lookup, or as hand-entered references labelled “Not yet verified”, kept out of reviewed exports. AI never writes a reference.'],
      ['False or overstated claims',
        'Sourced claims are checked against excerpts. Inferences are labelled. Evidence scope and claim limitations are visible during review.'],
      ['Plagiarism',
        'Excerpts are kept as quotations with their source, in the workspace and in the export. TRACE does not detect plagiarism and says so.'],
      ['Privacy',
        'No accounts, tracking or personal data. Work stays in the browser. Only the question and approved passages reach the AI provider, and its data-use terms are shown.'],
      ['Biased or narrow sources',
        'Search terms and scope are visible and student-approved; every source shows where it came from; the export states it is not a systematic review; missing abstracts are flagged, not hidden.'],
      ['Over-reliance on AI',
        'AI drafts at most five short claims, only after two human approvals. Every claim needs its own decision. A full manual path works with no AI.'],
      ['Copyright', 'Only metadata, abstracts and short excerpts are stored. No full-text ingestion.'],
      ['Instructions hidden in source text',
        'Passages are delimited as data, the model has no tools, and its output is validated against the allow-list.'],
    ],
    governanceLabel: 'Governance',
    governance: [
      ['Accountability',
        'The student is the author and approves the plan, the evidence set and every claim. TRACE never approves on the student’s behalf. The export states that the student reviewed each claim and remains responsible. The builders answer for the tool doing what it says: the checks are unit-tested, the limits documented.'],
      ['AI disclosure',
        'Generated from recorded activity, not a fixed paragraph: which claims were AI-drafted (model named), which are sample output, which the student wrote; what was sent to the model; what was rejected; what the checks do and do not show.'],
      ['Rules and policies followed',
        '**Project rules:** set by the student in the Plan step to match the assignment’s policy: AI drafting on (approved passages only) or off, oldest publication year, block retracted sources. The export gate, the draft button and the server enforce them; the disclosure lists them. **Hackathon rules:** sample content labelled, no invented references, no personal or confidential data, prompt log kept. **Provider terms:** Crossref rate limits, OpenAlex budget, Gemini free-tier terms. SP Jain’s academic-integrity and AI-use policies apply to how a student uses the output; their text was not supplied to us, so TRACE enforces disclosure and human sign-off rather than quoting clauses. We will confirm specifics with the organisers.'],
      ['What TRACE does not claim',
        'Plagiarism detection, that sources are correct, institutional approval, or a tamper-proof audit trail. The activity history is local and for convenience.'],
    ],
  };

  const slide = frame(5, D.kickers, D.title, D.headline);
  const tw = 6.5, gx = M + tw + 0.5, gw = CW - tw - 0.5;

  label(slide, D.ethicsLabel, M, TOP, tw);
  table(slide, D.ethicsHead, D.ethics, { x: M, y: TOP + 0.28, w: tw, colW: [1.65, tw - 1.65], fontSize: 10.5, colOpts: [{ bold: true }] });

  rule(slide, M + tw + 0.25, TOP, 0, BOTTOM - TOP);

  label(slide, D.governanceLabel, gx, TOP, gw);
  const runs = D.governance.flatMap(([head, body], i) => [
    { text: head, options: { fontFace: F.head, fontSize: 13, bold: true, color: C.accent, breakLine: true, paraSpaceAfter: 2 } },
    ...paras([body], { paraSpaceAfter: 9 }).map((r, j, a) => (j === a.length - 1 && i < D.governance.length - 1 ? { ...r, options: { ...r.options, breakLine: true } } : r)),
  ]);
  txt(slide, runs, { x: gx, y: TOP + 0.3, w: gw, h: BOTTOM - TOP - 0.3, fontSize: 11.5 });
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Slide 6 — MVP scope, proof and limits
// ════════════════════════════════════════════════════════════════════════════════════════════
{
  const D = {
    kicker: 'Architecture realism',
    title: 'MVP scope, proof and limits',
    headline: 'A narrow MVP that runs end to end, states its limits, and is built to absorb new requirements.',
    scope: ['In the MVP', [
      'The eight-step journey on one page.',
      'Live Crossref search and DOI lookup; OpenAlex abstract fallback.',
      'Library with tags, notes, filters; evidence approval with a preview of what is sent.',
      'One live AI provider (Gemini), a full manual path, a labelled sample brief.',
      'Claim Inspector and citation trap.',
      'Writing space with live citation checks; list check; retraction flag; project rules.',
      'APA 7 or Harvard (Citation.js); Markdown brief; JSON backup; local storage.',
    ]],
    acceptance: ['Acceptance criteria we demonstrate', 'Each has an automated test.', [
      'Search → save → tag → reload → approve → brief → inspect → export runs end to end.',
      'A model answer that cites an unknown ID, or carries a DOI or author field, is rejected.',
      'An altered number or a dropped negation in a quotation fails the check.',
      'A claim stating a number its excerpt lacks, or an in-text citation with no source, is blocked.',
      'Editing a claim, a passage or the question makes approvals stale and blocks reviewed export.',
      'A timeout shows “Could not check”, never “Not found”.',
      'Sample output stays labelled through to the exported file.',
    ]],
    limits: ['Honest limits', [
      'Evidence is abstract-only unless the student pastes a passage.',
      'A text match shows the words are in the stored text, not that the paper is right or the reading follows.',
      'The AI’s support rating can be wrong.',
      'Crossref lacks abstracts for many papers.',
      'Browser storage is not a backup.',
      'Titles keep the registry’s capitalisation; APA 7 wants sentence case.',
    ]],
    dayOf: ['Ready for day-of requirements', ['If asked for…', 'We change…'], [
      ['Another source or AI provider', 'one adapter file'],
      ['A new check or trust label', 'one pure function, plus the export gate'],
      ['A new rule or policy', 'one field in Rules in force, plus the export gate'],
      ['Another citation style', 'one CSL style name'],
      ['Another export format', 'one builder function'],
      ['A new workflow step', 'one tab and one approval fingerprint'],
    ]],
    outOfScope: ['Deliberately out of scope',
      'Accounts and collaboration; PDF or full-text ingestion; browser extension; plagiarism detection; systematic-review coverage.'],
    // Status line: rendered from the STATUS constant at the top of this file.
    statusLabel: 'Status',
    status: [
      ['Unit tests passing', STATUS.unitTests],
      ['Browser journey tests passing', STATUS.e2eTests],
      ['Tests run on', STATUS.date],
      ['Live AI call verified', STATUS.liveAi],
      ['Deployed', STATUS.deployed],
    ],
  };

  const slide = frame(6, [D.kicker], D.title, D.headline);
  const gap = 0.18, pad = 0.16, colH = 3.72, cw = [2.95, 3.45, 2.45, CW - 8.85 - 3 * gap];
  const cx = cw.map((_, i) => M + cw.slice(0, i).reduce((a, b) => a + b + gap, 0));
  cw.forEach((w, i) => card(slide, cx[i], TOP, w, colH));
  const list = (items, i, y) =>
    txt(slide, bullets(items), { x: cx[i] + pad, y, w: cw[i] - 2 * pad, h: TOP + colH - y - 0.1, fontSize: 11, paraSpaceAfter: 4 });

  label(slide, D.scope[0], cx[0] + pad, TOP + 0.14, cw[0] - 2 * pad);
  list(D.scope[1], 0, TOP + 0.46);

  label(slide, D.acceptance[0], cx[1] + pad, TOP + 0.14, cw[1] - 2 * pad);
  txt(slide, D.acceptance[1], { x: cx[1] + pad, y: TOP + 0.38, w: cw[1] - 2 * pad, h: 0.22, color: C.muted, italic: true });
  list(D.acceptance[2], 1, TOP + 0.7);

  label(slide, D.limits[0], cx[2] + pad, TOP + 0.14, cw[2] - 2 * pad);
  list(D.limits[1], 2, TOP + 0.46);

  label(slide, D.dayOf[0], cx[3] + pad, TOP + 0.14, cw[3] - 2 * pad);
  table(slide, D.dayOf[1], D.dayOf[2], {
    x: cx[3] + 0.1, y: TOP + 0.5, w: cw[3] - 0.2, colW: [(cw[3] - 0.2) / 2, (cw[3] - 0.2) / 2], fontSize: 10.5, colOpts: [{ bold: true }], margin: [3, 5, 2, 5],
  });

  // Out-of-scope strip
  const oy = TOP + colH + 0.12, oh = 0.42;
  card(slide, M, oy, CW, oh, { fill: C.tint });
  label(slide, D.outOfScope[0], M + pad, oy, 2.7, { h: oh, valign: 'middle' });
  txt(slide, D.outOfScope[1], { x: M + 3.0, y: oy, w: CW - 3.0 - pad, h: oh, valign: 'middle' });

  // Status line
  const sy = oy + oh + 0.12, sh = BOTTOM - sy, labelW = 1.1;
  card(slide, M, sy, CW, sh, { line: C.accent, lineW: 1 });
  slide.addText(D.statusLabel.toUpperCase(), {
    shape: S.rect, x: M, y: sy, w: labelW, h: sh, fill: { color: C.accent }, line: { color: C.accent, width: 1 },
    fontFace: F.body, fontSize: 10.5, bold: true, color: C.white, charSpacing: 1, align: 'center', valign: 'middle', margin: 0,
  });
  const sw = [1.95, 2.45, 1.95, 2.0], rest = CW - labelW - sw.reduce((a, b) => a + b, 0);
  let x = M + labelW;
  D.status.forEach(([name, value], i) => {
    const w = sw[i] ?? rest;
    if (i > 0) rule(slide, x, sy + 0.12, 0, sh - 0.24);
    txt(slide, name, { x: x + pad, y: sy + 0.14, w: w - 2 * pad, h: 0.22, color: C.muted });
    txt(slide, String(value), {
      x: x + pad, y: sy + 0.4, w: w - 2 * pad, h: sh - 0.5, fontFace: F.head, bold: true, valign: 'middle',
      fontSize: String(value).length > 20 ? 10.5 : 13, // long values (a URL) drop to body size so they still fit
      color: value === PLACEHOLDER ? C.amber : C.ink,
    });
    x += w;
  });
}

// ── Write ──────────────────────────────────────────────────────────────────────────────────
assert.equal(pres.slides.length, TOTAL, `deck must have exactly ${TOTAL} slides`);
const zip = await JSZip.loadAsync(await pres.write({ outputType: 'nodebuffer' }));
// pptxgenjs 4.0.1 repeats <a:pPr> before every run after the first in a paragraph, which is not
// schema-valid. Keep the paragraph's first <a:pPr>, drop the repeats.
const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
assert.equal(slideFiles.length, TOTAL, `pptx must contain exactly ${TOTAL} slide parts`);
for (const f of slideFiles) {
  const xml = await zip.file(f).async('string');
  zip.file(f, xml.replace(/(<\/a:r>)<a:pPr\b[^>]*?(?:\/>|>.*?<\/a:pPr>)/g, '$1'));
}
// Drop bare folder entries: some cloud viewers refuse packages that contain them.
for (const [name, entry] of Object.entries(zip.files)) if (entry.dir) delete zip.files[name];
writeFileSync(OUT, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log(`Wrote ${OUT} (${TOTAL} slides)`);
