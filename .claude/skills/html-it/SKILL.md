---
name: html-it
description: Produce HTML output instead of markdown for any agent task. Four levels — Static Doc, Visual Artifact, Two-Way Interactive, Throwaway Tool. Based on Thariq Shihipar's "Unreasonable Effectiveness of HTML" framework. Triggers on "/html-it", "html-it", "html this", "render as html", "build me an html", "make an html artifact".
source: https://github.com/robonuggets/html-it
---

# /html-it — HTML output skill

**Stop reaching for markdown.** When the agent is asked to produce a doc, plan, report, review, design, prototype, dashboard, or editor — make it HTML instead. Higher information density, easier to read, easier to share, and (at levels 3-4) interactive.

This skill encodes the four levels of HTML output, the patterns that work at each level, and the rules that keep agent-generated HTML from looking AI-slop.

> **Credit:** Framework and use-case taxonomy from **Thariq Shihipar** ([@trq212](https://x.com/trq212)) of the Anthropic Claude Code team. Original article: [Using Claude Code — The Unreasonable Effectiveness of HTML](https://x.com/trq212/status/2052809885763747935). Examples gallery: [thariqs.github.io/html-effectiveness](https://thariqs.github.io/html-effectiveness/). This skill is one community implementation of his ideas — go read the source.

---

## When to reach for HTML over markdown

Markdown's default. HTML wins when **any** of these are true:

- The output is over ~100 lines (markdown stops getting read)
- It needs charts, tables, SVG diagrams, side-by-sides, or spatial layout
- It needs to be shared (HTML is a link; markdown is an attachment)
- The reader will manipulate it (sliders, toggles, drags, picks)
- It synthesises data from multiple sources (filesystem, MCPs, git, browser)
- It will exist for one use and then be thrown away

Markdown stays better for: tiny notes, commit messages, README first-pass, things that need to round-trip through git diffs.

---

## The Four Levels

Each level is a strict superset of the last in capability and effort. Most agent output stops at Level 1. The unlock is recognising when you should be at 3 or 4.

### Level 1 — Static Doc

**HTML as a better markdown.** One-way, read-only. Replaces a long .md file with something readable.

**Use cases:** specs, research reports, explainers, incident write-ups, weekly status, plans, PR write-ups, summaries.

**Defining moves:**
- Headings, sections, intro/TL;DR up top
- Body text with serif typography (looks like a magazine, not a wiki)
- Pull-quotes, callouts, footnotes
- Mobile responsive — viewer might open on phone
- Sticky table of contents for anything > 1500 words

**Example prompt:**
> "Create a thorough implementation plan as an HTML file. Headers, TL;DR at top, key code snippets inline, sticky TOC on the left. Easy to digest."

### Level 2 — Visual Artifact

**HTML adds visual density.** Still read-only. Information that text can't convey lands here.

**Use cases:** design systems, slide decks, flowcharts, dashboards (snapshot view), comparison tables, SVG illustrations, component galleries, before/after pairs.

**Defining moves:**
- SVG for diagrams (never ASCII art, never PNG when SVG works)
- Tables for any comparison or matrix
- Spatial layout — grids, side-by-sides, columns
- Inline charts (`<svg>` bar/line/donut, no charting library)
- Colour as data (severity badges, diff annotations, heatmaps)
- Slide-deck format with `scroll-snap` for talks

**Example prompt:**
> "Read the rate limiter code and produce a single HTML explainer page: a token-bucket SVG flow diagram at the top, 3-4 annotated code snippets, gotchas section at the bottom. Optimised for someone reading it once."

### Level 3 — Two-Way Interactive

**HTML the reader can manipulate.** Sliders, toggles, drags, inline edits. The export pattern is mandatory: every Level 3 artifact ends with a button that turns the manipulated state back into a prompt or structured output the agent can act on.

**Use cases:** design tuning (animations, colours, easing curves), parameter sweeps, A/B option pickers, prompt iteration with live preview, draft review with inline comments, picking values from a range.

**Defining moves:**
- Sliders, toggles, dropdowns, draggable cards
- Live preview that re-renders on input
- **Export button at the end** — `Copy as prompt` / `Copy as JSON` / `Copy as markdown`. Uses `navigator.clipboard.writeText`. Without it the level collapses to a toy.
- State stays in the DOM — no backend. Reload = reset is fine for throwaways.
- Inline edits use `contenteditable` or `<input>` directly on the page

**Example prompt:**
> "I'm tuning this system prompt. Make a side-by-side HTML editor: editable prompt on the left with variable slots highlighted, three sample inputs on the right that re-render the filled template live. Add a character counter and a Copy button."

### Level 4 — Throwaway Tool

**A purpose-built mini-app for one task.** Looks like a real product but exists for this one piece of data. Always ends with an export back to Claude.

**Use cases:** triage boards (drag tickets across columns), feature-flag editors with dependency warnings, dataset curation (approve/reject/tag rows), annotation tools, config editors with validation, prompt-template tuners, file-comparison views, manual data entry with constraints.

**Defining moves:**
- Multi-panel layout (toolbar / sidebar / canvas / inspector)
- Domain-specific UI: kanban columns, file tree, diff view, editable table
- Validation and feedback inline (warnings, errors, dependency hints)
- Keyboard shortcuts where useful
- **Export button is the unlock** — `Copy as markdown` / `Copy diff` / `Copy as JSON`. Without it this is a useless one-off. With it, the reader's manual work becomes Claude's next prompt.
- Throwaway aesthetic — don't over-engineer. No build step, no framework, single file.

**Example prompt:**
> "I need to reprioritise these 30 Linear tickets. Make an HTML file with each ticket as a draggable card across Now / Next / Later / Cut columns. Pre-sort by your best guess. Add a 'Copy as markdown' button that exports the final ordering with a one-line rationale per bucket."

---

## Best Practices (scoured from Thariq's 20 examples)

### Design system that doesn't scream "I'm AI-generated"

**Colour palette — print-mag warm neutrals beat tech-dark.** Default to:

```css
--ivory:  #FAF9F5;   /* background */
--paper:  #FFFFFF;   /* card surface */
--slate:  #141413;   /* body text */
--clay:   #D97757;   /* accent (warm orange) */
--clay-d: #B85C3E;   /* accent hover */
--oat:    #E3DACC;   /* underline / subtle dividers */
--olive:  #788C5D;   /* positive / success */
--g100:   #F0EEE6;
--g200:   #E6E3DA;
--g300:   #D1CFC5;
--g500:   #87867F;
--g700:   #3D3D3A;
```

Override only if the brand requires it. Dark mode is fine for editor-style Level 4 tools — keep the warm-neutral instinct (orange/amber accents, not neon).

**Type stack — three families, distinct jobs:**

```css
--serif: ui-serif, Georgia, "Times New Roman", serif;   /* H1 + display */
--sans:  system-ui, -apple-system, "Segoe UI", sans;    /* body */
--mono:  ui-monospace, "SF Mono", Menlo, Consolas;      /* eyebrow + code + meta */
```

**Typographic moves that elevate immediately:**

- `font-size: clamp(38px, 5.4vw, 62px)` for H1 — responsive without media queries
- Italic accent on the key word in a serif H1: `<h1>The <em>unreasonable</em> effectiveness</h1>`
- Eyebrow label above titles — small mono, uppercase, 0.08-0.12em letter-spacing, with a 24px clay bar before it
- `letter-spacing: -0.018em` on display sizes
- `line-height: 1.06` on display, `1.55` on body

### Layout

- Max-width `1120-1180px` wrap, `padding: 48px 32px 64px`
- Sections separated by `border-bottom: 1.5px solid var(--g300)` + 56-80px breathing room
- 2-column hero: text left, illustration right, collapse to 1-col at 880px
- For editor patterns (Level 4): sticky toolbar at top, full-bleed canvas, optional inspector panel right

### Interaction patterns (Level 3-4)

**The Export button is the contract.** Every interactive HTML must end with a button labelled exactly what it exports:

```html
<button id="copyBtn" class="primary">Copy as markdown</button>
```

Standard handler:

```js
const btn = document.getElementById('copyBtn');
btn.addEventListener('click', () => {
  const md = buildExport();
  navigator.clipboard.writeText(md).then(() => {
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy as markdown';
      btn.classList.remove('copied');
    }, 2000);
  });
});
```

**Tri-state buttons for review patterns** (approve / skip / blank) — cycle on click. Encode as `data-state` on the row, style via CSS.

**Inline picks** — for "choose A/B/C" UIs, make each option a clickable card that toggles a `.picked` class. Single pick per group.

### Single-file discipline

- One `.html` file. Inline `<style>` and `<script>`. No build step. No external CSS/JS deps except optional Google Fonts.
- All assets either inline SVG or `data:` URLs. No `/img/foo.png` folders.
- The file is the artifact — Jay (or the viewer) can email it, drop it in Slack, open it on a phone, archive it.

### Anti-patterns to avoid

- Linear gradients on everything (AI-slop tell)
- Glassmorphism for documents (save it for product UIs)
- Icon libraries — use bespoke SVG or skip icons entirely
- Loading spinners (this isn't a web app, it's a doc)
- "Generated by AI on {date}" footers
- Animations longer than 200ms (jittery to read past)

---

## Recipes (this session's HTML artifacts, generalised)

### Recipe — Interactive Review (Level 3)

For triaging N options visually with comments + status + clipboard export. Used in this session for hook variations and b-roll review.

**Anatomy:**
1. Topline seed block — show original input verbatim
2. Table or grid, one row per item
3. Variation cards per row (click to pick, single per row, `.picked` style)
4. Tri-state status button (blank → ✓ → ✗ → blank)
5. Comments textarea per row
6. Optional secondary pickers (style, tag, mode)
7. Live summary line at bottom (accumulates picks)
8. **Export button** — builds structured directive prompt, copies to clipboard

**Canonical samples:**
- `C:/ROBO/agents/EDDO/output/hook-workshop-sample.html`
- `C:/ROBO/agents/EDDO/output/broll-review-html-vs-markdown.html`

### Recipe — Session Recap (Level 1)

Render the current conversation as a clean static doc. Original `/html-it` use case.

**Sections:**
1. **Intent** — what the user was trying to do (1 sentence)
2. **Key turns** — prompts + replies that mattered, skip throat-clearing
3. **Decisions** — explicit picks
4. **Artifacts** — file paths created/edited, clickable
5. **Open threads** — anything unresolved

**Save location:** `C:/ROBO/output/html-it/{YYYY-MM-DD_HHMM}_{slug}.html`. If a project is loaded via `coordinate`, also copy to the project folder.

### Recipe — Comparison Explainer (Level 2)

For "X vs Y" lessons (Markdown vs HTML, before vs after). Side-by-side panels, inline SVG of the key concept, callout cards.

**Anatomy:**
- Eyebrow + H1 (italic accent on the pivot word)
- TL;DR card with the verdict
- Two panes side by side, full width on mobile
- Inline SVG of the mechanism if applicable
- Closing "When to use which" matrix

---

## How to invoke

### Inside Robo (Eddo or any agent)

- User says `/html-it`, "html-it", "html this", "render as html", "build me an html for X"
- Agent picks the level (1-4) based on the task
- Generates a single `.html` file, saves to the right place, opens with `start ""` on Windows
- Confirms the path back to the user

### Community version (share with viewers)

Public mirror at: **[github.com/robonuggets/html-it](https://github.com/robonuggets/html-it)** *(prep — push pending Jay's go)*

Install prompt for users:
```
I'm giving you a skill called html-it. Get the files with:

git clone https://github.com/robonuggets/html-it

Follow the README to set it up.
Recommend how it would best apply to my setup in plain language, and ask me
a few questions to clarify my intent before installing it.
```

### Related skills

- **`tweak`** — Inject a live tweak panel into any HTML file (5 or 10 sliders), bake selected values back into source CSS. Pairs with Level 3/4 outputs from `html-it`. Community version: [github.com/robonuggets/skills](https://github.com/robonuggets/skills).
- **`master-slides`** — for slide-deck HTML specifically (Level 2). Different stylistic system (paper typography + isometric graphics).

---

## Rules

- **Pick a level explicitly** at the top of the response: "Using html-it Level 3 (Two-Way Interactive)" — same upfront-skill-signal rule as packaging.
- **One file. Always.** Inline CSS, inline JS, inline SVG. No asset folder. No build step.
- **Mobile responsive by default.** Test at 360px and 1200px.
- **Export button is mandatory at Level 3+.** Without it, an interactive HTML is a toy.
- **Don't summarise away the substance.** If rendering a conversation or doc, preserve actual phrasing of important content.
- **Skip system-reminders, tool-call noise, meta chatter** when extracting source content.
- **Match the level to the task.** A status report doesn't need sliders; a triage board doesn't work without them.
