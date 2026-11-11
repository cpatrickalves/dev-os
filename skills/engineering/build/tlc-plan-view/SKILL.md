---
name: tlc-plan-view
description: 'Turns a plan.md written by tlc-plan into one review page (a Claude artifact, or a local HTML file when artifacts are unavailable) that keeps every criterion, door and assumption literal and puts a plain-language explanation box, cross-links, diagrams and the pending decisions around them, plus a "copy feedback" button. Use when the user says "tlc-plan-view", "show me the plan", "make the plan easier to read", "explain this plan.md", "I do not understand this plan", "página de revisão do plano", "mostre o plano", "me ajude a revisar o plano" or points at a .specs/features/<feature>/plan.md to review. Do NOT use to write or change a plan (that is tlc-plan), to implement one (tlc-implement), for plans in other formats (use html-plan), or for an interactive grilling session (grill-with-ui).'
metadata:
  version: "1.2.1"
---

# TLC Plan View

A `plan.md` from **tlc-plan** is written for a builder: dense, literal, full of references to code
and to other sections. The human who approves it often stalls on a criterion they cannot parse.
This skill builds a page for that human. The plan stays the only source of truth: the page shows
its literals untouched and explains them beside it, so the reviewer approves the text that will
be built, not a paraphrase of it.

## Rules

1. **Literal first, explanation beside it.** Every criterion (with its examples), every Landing
   door and every Assumptions row appears exactly as written in the plan, followed by an
   explanation box. `scripts/build.mjs` fails the page when any literal is missing or changed.
2. **The explanation adds no facts.** Say only what the plan says, or what you read in the code
   or the project's glossary. Wrap anything you inferred in `<span class="inferred">`. A wrong
   explanation is worse than none: the reviewer trusts it as much as the plan.
3. **Freedom in the body.** Diagrams, flowcharts, tables, small interactive widgets: use whatever
   makes the plan easier to understand. The skeleton fixes only the frame and the visual identity.
4. **No network but Mermaid.** The page is one self-contained file. The build blocks any other
   resource URL. Links (`<a href>`) are fine.
5. **Read-only.** Never edit `plan.md`. Feedback goes back to the chat; **tlc-plan** applies it.

## Workflow

1. **Find the plan.** Use the path the user gave. Otherwise look for `.specs/features/*/plan.md`;
   with more than one, ask which. Read the whole plan.
2. **Check the format.** It needs `## Problem`, `## Criteria` and `## Landing`. If any is
   missing, tell the user this skill reads only tlc-plan plans, and stop.
3. **Gather vocabulary.** Read the project's `GLOSSARY.md` (or `CONTEXT.md`, or what
   `GLOSSARY-MAP.md` points to). Copy the definitions of the terms the plan uses, literally. Terms
   with no glossary entry get a definition from the plan's own usage, marked inferred. Read code
   only to settle what a term or an `(exists)` module means, and only when the plan does not say.
4. **Read [references/sections.md](references/sections.md)**: the purpose line of each section and
   what each kind of explanation box owes.
5. **Write `body.html`** in a temporary directory (your scratchpad when you have one), following
   the page order and the markup below.
6. **Build and verify:**
   ```bash
   node <skill-dir>/scripts/build.mjs <plan.md> <tmp>/body.html <tmp>/plan.html
   ```
   Exit 0 means every literal is present and the only network resource is Mermaid. Exit 1 lists
   what is `MISSING` or `BLOCKED`: fix `body.html` and rerun. Never deliver a page that did not
   exit 0. The script detects the plan's language; pass `--lang pt|en` to override.
7. **Deliver.** If an artifact tool is available (`mcp__claude-artifacts__publish_files`), read
   its guide when it asks for that, then publish `<tmp>/plan.html` as a new artifact titled after
   the plan. If no artifact tool exists or publishing fails, copy the page to
   `.specs/features/<feature>/plan.html`; if `.gitignore` does not cover it, recommend adding
   `.specs/features/*/plan.html` (it is derived and goes stale), without editing `.gitignore`.
   Every run makes a new page; there is nothing to update in place.
8. **Report** in the chat: the link or the path, how many pending decisions and attention points
   the page has, and that the "copy feedback" button produces text to paste back here.

## Page order

Each item is a `<section data-nav="<short label>">`; the skeleton builds the side navigation from
`data-nav` and appends the checklist and feedback section at the end. Every section that mirrors
a plan section titles it in the page's language and keeps the plan's heading in a `.src` span:
`<h2><span class="src">## Criteria</span> Critérios</h2>`. The skeleton shows the span as a small
label above the title. Under the title goes the purpose line from `references/sections.md`, in
`<p class="purpose">`.

1. **Summary** (`<section class="summary">`): the problem in 1–2 sentences, what changes for the
   user, and the titles of the decisions waiting at the end. No details yet: the reviewer decides
   after reading, not before.
2. **Terms**: `<dl class="terms">` with the glossary definitions the plan relies on. Each `<dt>`
   holds the term exactly as the plan writes it, one term per `<dt>`; list other spellings the
   plan uses (plural, inflection) in `data-alias="Arquivos Gerados|arquivo gerado"`. The skeleton
   underlines every use of a term on the page and shows its `<dd>` on hover, so a definition here
   reaches every box. With 8 or more terms the skeleton adds a filter.
3. **Problem**.
4. **Criteria**: one item per criterion, grouped by story (`<h3>` with the story title, literal).
5. **Shape, Surface, Landing**: the path with one item per step, the plan's own diagrams, Changes
   underneath, the interface, then one item per door.
6. **Out of scope, Differences from the source, Sources**: the tables literal, one box per table.
7. **Pending decisions**: every Assumptions row with `n`, every open question, every door whose
   rejected alternative is still viable, and every attention point. Each is a `.decision`, links
   back to the passage it is about, and repeats the literal it decides.

Sections the plan does not have are left out.

## Markup

The skeleton styles these classes and wires their behaviour. Escape `<` and `&` in text. Inline
`code` in the plan becomes `<code>`; `**bold**` becomes `<strong>` or plain text.

```html
<!-- one literal and its explanation -->
<div class="item" id="c-7">
  <div class="literal"><span class="n">7</span> IF <code>continue_from</code> não é UUID4 ...
    <ul><li><code>../x</code> → recusa sem acesso ao disco; ...</li></ul></div>
  <div class="explain" data-ref="Critério 7">
    <p>1–2 sentences: what this means for whoever observes the system.</p>
    <details><summary>mais</summary><p>Detail, a worked example, links:
      <a class="xref" href="#step-2">passo 2</a> <a class="xref" href="#door-1">door 1</a></p></details>
  </div>
</div>

<!-- a box that explains a whole table -->
<div class="explain standalone" data-ref="Changes underneath">...</div>

<!-- a diagram from the plan: its source verbatim, inside the literal -->
<div class="literal"><pre class="mermaid">flowchart LR ...</pre></div>

<!-- a diagram you add: marked as explanation -->
<figure class="explain-fig"><svg>...</svg><figcaption>What it shows</figcaption></figure>

<!-- something inferred, inline -->
<span class="inferred">o node roda no worker</span>

<!-- an attention point -->
<div class="attention" id="a-1"><strong>Referência cruzada</strong> ...</div>

<!-- a pending decision; the skeleton adds agree/change and the checklist entry -->
<div class="decision" id="d-a5" data-id="A5" data-title="Textos das recusas e do stub">
  <h3>...</h3><div class="literal">...</div><div class="explain" data-ref="A5">...</div>
</div>
```

The skeleton labels each literal from its box: a literal whose `.explain` has
`data-ref="Critério 7"` is labelled "Critério 7", and the label replaces the `.n` number. Give
every box a `data-ref`, so the reader always knows which criterion, door or assumption a literal
is. Explanation boxes start closed, with a button in the header to open them all; the reader opens
the one they need.

IDs: `c-<n>` criteria, `step-<n>` Shape steps, `door-<n>` doors, `a-<n>` attention points,
`d-<id>` decisions. `data-ref` names the box in the feedback, so make it readable ("Critério 7",
"Door 2"). A box without `data-ref` gets no note field.

## Diagrams

The plan's own mermaid blocks go in as written; the build checks their source. Add diagrams of
your own wherever they shorten the reading: the path as a flowchart, the calls of a criterion as a
sequence diagram, the states of an entity, a decision tree for a criterion with many branches.

A diagram is shapes joined by edges, drawn in Mermaid (`flowchart`, `sequenceDiagram`,
`stateDiagram-v2`) or, when Mermaid cannot draw it, in inline SVG. Boxes of text laid out in HTML
are not a diagram: they read as cards, so don't build them. Keep each node to a few words and each
edge label to what passes along it; the detail goes in the explanation box after the figure.

```html
<figure class="explain-fig">
  <figcaption>Três chamadas montam um documento de três seções.</figcaption>
  <pre class="mermaid">flowchart LR
  c1["Chamada 1: grava A"] -- "continue_from = A" --> c2["Chamada 2: grava B = A + seção 2"]
  c2 -- "continue_from = B" --> c3["Chamada 3: grava C = B + seção 3"]</pre>
</figure>
<div class="explain standalone" data-ref="Diagrama: continuação">...</div>
```

Put the caption first, in one sentence that says what the figure shows, and keep the figure free
of paragraphs. Inside `<pre class="mermaid">` escape `<` and `&` like any text, and use no HTML tags. The skeleton styles Mermaid with the page's colours and fonts, draws a diagram
inside a closed box when the box opens, and shows the source with a warning if Mermaid cannot
load.

## Writing the explanations

Write in the plan's language; never translate identifiers.

1. One idea per sentence.
2. No metaphors or analogies. Use the technical term and explain it.
3. Subject before the verb, in the active voice: "o node grava o arquivo", not "o arquivo é
   gravado".
4. One term per concept. Use the plan's and the glossary's terms; no synonyms for variety.
5. Concrete values instead of adjectives: "200.000 caracteres", not "um documento grande".

The first sentence of a box carries the meaning; `<details>` carries the rest. A box that repeats
the literal in other words without adding the observable consequence or an example has not
explained anything.
