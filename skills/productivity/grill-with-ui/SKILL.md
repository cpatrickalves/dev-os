---
name: grill-with-ui
description: Run a grilling interview on a local browser page instead of the terminal, usually to review one or more plans, technical docs or issues and update them with the decisions. Every question is laid out with its recommendation, answerable in any order, with a per-question discussion thread and one "Send to Agent" button; Finish writes the grill doc, updates the reviewed documents and the glossary, and offers ADRs. Use when the user says "grill with ui", invokes /grill-with-ui with a topic or documents, or says "/grill-with-ui resume".
metadata:
  last_synced: "2026-10-27"
  local_changes: "Only the runtime files are copied (upstream docs/, design/, test/, README.md and CI config are left out). Start takes one or more source documents (files, issues, PRs), loads domain-modeling and reads GLOSSARY.md; the doc defaults to .grills/<slug>-grill.md; Interview method asks the whole frontier per round, reviews the sources, challenges glossary terms, writes settled terms to GLOSSARY.md right away, probes edge-case scenarios, cross-checks claims against the code, and sends fact lookups to background subagents (new optional facts key); every candidate question passes a filter (a real decision, no precedent, in scope) or goes to the new assumed or handoffs keys; an accepted recommendation does not close its branch, and a closing sweep over answers, facts, sources and follow-ups runs before the grill is declared done; Finish applies the decisions back to the sources (asking before rewriting issues or PRs) and writes the ADRs the user picks. Description rewritten for these triggers."
  source: "https://github.com/jasonku09/grill-with-ui/tree/main"
---

# grill-with-ui

`$SKILL` below means this skill's base directory (the folder holding this file). Everything is
plain Node with no install step: `node $SKILL/server.mjs <command>`.

Two files carry a grill. `state.json` is **yours alone**: questions, recommendations, thread
replies, statuses, agent status. `events.jsonl` is **the page's alone**: one line per Send.
Nobody writes the other's file. The page polls `state.json`; how you receive events depends
on the listening mode below.
A third file, `visual.html`, is also yours (see [Visualize](#visualize) for drawing).

## Listening mode and turn boundaries

Choose the mode from the tools actually available, not the agent's model name:

- **Persistent Monitor:** if the harness delivers its events to the agent even after a turn
  ends, publish the update and end the turn; the next event wakes you.
- **Wait mode (no persistent Monitor):** a running page server or background shell process
  does **not** wake a finished agent turn. Keep the turn active and return to the foreground
  `wait` loop after opening the page, handling every send, and every draw completion or
  failure. A tool returning a process/session ID is not an event subscription: resume that
  process with the harness's polling tool. Do not send a final response merely because a
  question round or visual is ready. A timeout means wait again, not end the interview.

Throughout this skill, **return to listening** means the appropriate action above. In wait
mode stop only after Finish and any final visual export are complete, the user explicitly
pauses/stops the interview, or a tool failure prevents continuing. If you must stop, say that
the listener is inactive and that browser submissions will be queued until resume; never
claim you are still listening. On resume, drain `pending` as Resume step 3 describes before
waiting for new events.

**You change `state.json` only through `patch`** (next section), never with a file-write or
edit tool. A whole-file write puts the entire state into this conversation on every turn, and
the state grows with the grill: after twenty sends one rewrite is about 60 KB, some 15k
tokens, paid again on every send. A patch carries only what changed. Below, "set" and
"append" mean a key in a patch, and `null` is how a key is deleted.

## Patching state.json

```sh
node $SKILL/server.mjs patch --session <session> <<'GRILL_PATCH'
{ …only what changed… }
GRILL_PATCH
```

The delimiter is quoted, so the shell expands nothing inside it. (`--file <path>` reads the
patch from a file instead, for harnesses where heredocs are awkward.) It merges the patch,
validates the result, and swaps the file in atomically, so the page sees one consistent
update per patch. It works whether or not `serve` is running. It prints one line,
`{"ok":true,"questions":12,"open":3,"handled":14,"bytes":41233}`, never the state. A bad
patch exits non-zero with a one-line error and leaves the file untouched: fix the patch and
run it again.

The patch is shaped like `state.json` (schema at the end):

- `null` deletes a key, at any level: `"answer": null`, `"drawing": null`, `"visual": null`.
- `agent` and `visual` merge one level: keys you give replace those keys; the rest stay.
- `questions` is keyed by `id`. A known id merges one level: each field you give replaces
  that field whole (`rec`, `answer`, `options`, `deps`, `explore`). An unknown id is a new
  question, appended; it needs `round`, `title`, and `rec` (give `body` and `options` too);
  `status: "open"`, `deps: []`, `options: []`, `thread: []`, `durable: false`, and
  `updated: false` are filled in (`level` is not: give it). An unknown id without `title` is
  an error, not a new question (ids are case-sensitive: `q7`, never `Q7`).
- `thread` (on a question and on `visual`) and `visual.queued` append: list only the new
  messages or bullets.
- `terms` is keyed by `term`: a known term is replaced whole, a new one appended.
- Every other key (`note`, `intent`, `finished`, `doc`, …) is replaced whole.

**Never write the current time; the server stamps every time you leave out**: `agent.since`
whenever you give `agent.status`, `at` on each appended message, `explore.at`, `visual.at`
when `version` changes, `visual.drawing.since`, and `finished.at`. A time you give always
wins; give one only when copying it from a send line (a user's thread message takes the
send's `at`).

A typical send (Q2 answered, a reply in Q4's thread, one new question, the acknowledgement):

```sh
node $SKILL/server.mjs patch --session <session> <<'GRILL_PATCH'
{
  "agent": { "status": "waiting", "handled": 5 },
  "questions": [
    { "id": "q2", "status": "answered", "answer": { "kind": "option", "option": "B" }, "updated": false },
    { "id": "q4", "thread": [
      { "who": "user", "text": "Why not keep staged answers in localStorage?", "at": "2026-09-18T21:39:58Z" },
      { "who": "agent", "text": "localStorage is per browser profile, so a second browser or a cleared profile loses them. The session folder survives both, at the cost of one more file." } ] },
    { "id": "q7", "round": 4, "deps": ["q2"], "title": "Who owns the retry budget?",
      "body": "With the server-side queue settled in Q2, retries need an owner.",
      "level": "check", "levelReason": "high stakes, clear answer",
      "options": [ { "k": "A", "text": "Each queue row counts its own retries",
                     "ratings": { "ux": "good", "correct": "good", "risk": "mixed", "cost": "good" } },
                   { "k": "B", "text": "One counter per device",
                     "ratings": { "ux": "mixed", "correct": "poor", "risk": "poor", "cost": "good" } } ],
      "rec": { "option": "A", "why": "A row owning its count needs no join, and one bad device cannot starve the rest. Its weakest axis is risk: there is no global cap." } }
  ]
}
GRILL_PATCH
```

## Start (`/grill-with-ui <topic>`, `$grill-with-ui <topic>`, or "grill with ui: <topic>")

0. **Sources.** The topic may name one or more documents to review: file paths (plans,
   technical docs, specs) and issue or PR links or ids. Read every one in full before round 1;
   fetch remote items with the tracker's CLI (`gh`, `planecli`, `az boards`). When no
   document is named, the grill has no sources and works from the topic alone. Load the
   `domain-modeling` skill with the Skill tool (`mattpocock-skills:domain-modeling`): it
   gives the glossary and ADR layout and formats this grill writes in. Then read the
   project's `GLOSSARY.md` (or, when `GLOSSARY-MAP.md` exists, the glossary of each
   context the topic touches) when there is one: its terms are the grill's starting
   vocabulary. If `domain-modeling` is not available, keep `terms` in `state.json` only
   and say once, in the Start line, that the glossary and ADRs are off.
1. From the project directory run
   `node $SKILL/server.mjs new --topic "<topic>" --intent "<why this grill exists, 1-2 sentences>" --doc "<doc path>"`.
   The doc path defaults to `.grills/<slug-of-topic>-grill.md` under the project root (create the
   folder later if needed). Pass `--intent` with the user's goal in their words (1-2 sentences),
   taken from the topic message that started this grill. The topic is the title; the intent
   is the why. Omit it only when the topic arrived as a bare phrase with no goal attached.
   The page shows it under the topic so several open
   grills stay distinguishable. It prints one JSON line; keep `session` (the session folder).
2. Patch round 1 in (`new` already wrote the skeleton): the whole frontier (see Interview
   method), each question with lettered options, a level, ratings, one recommendation, and a one-paragraph why
   (see Interview method), plus any `terms`, `axes` if the default four do not fit the topic,
   `sources` (each reviewed document as `{ "ref": "<path or URL>", "title": "…" }`; leave it
   out when there are none), and `"agent": { "status": "waiting" }`.
3. Open a **persistent Monitor** (`persistent: true`) whose command is
   `node $SKILL/server.mjs serve --session <session> --open`, description `grill page: <topic>`.
   No Monitor tool in your harness (Codex, Gemini CLI, Cursor, Copilot, others)? Use
   "Wait mode" at the end of this file for this step and for every wait after it.
   `--open` opens the page in the user's browser once the server is listening. Pass it
   only here, on Start: on Resume a tab the user still has open reconnects by itself, and
   a second tab would only duplicate it. It is best effort: with no usable opener (a
   headless or remote machine) the server says so on stderr and keeps running, and the URL
   you print in step 5 is the way in.
   `--lan` is opt-in, for answering from a second machine on the same network: it listens
   on the LAN interface and prints a LAN URL next to the localhost one (without it no LAN
   socket opens and no LAN URL prints). The LAN URL carries a per-serve `?t=` token that
   every non-loopback request must present, so share that URL only with the answering
   machine. With `--lan`, drop `--open`: the browser that matters is on the other machine.
4. Run `node $SKILL/server.mjs url --session <session>`; it prints the URL
   (with `--lan` add `--all` so it prints the LAN URL on the second line).
5. Print ONE line: the URL (both URLs with `--lan`, the LAN one exactly as printed,
   token included, since the second machine must open that full address), how many questions wait, and the doc path (say the user can change
   the path by typing in the terminal). Return to listening.

## Resume (`/grill-with-ui resume`)

1. From the project directory run `node $SKILL/server.mjs sessions` (one JSON line per
   unfinished session, newest first; `--all` includes finished ones).
2. Exactly one line: take it. Several: list them in the terminal (topic, intent, created, open/answered
   counts) and ask which. None: say so and stop.
3. Read `<session>/state.json` once to load the grill (reading is fine; only writes go
   through `patch`), and load `domain-modeling` as Start step 0 does. Run `node $SKILL/server.mjs pending --session <session>`. Every line
   printed is a Send the user made while no agent was listening. Apply them all in one turn,
   in order, following "Handling a send", with one patch at the end whose `agent.handled`
   is the last seq.
4. Continue with Start steps 3–5, but start `serve` **without** `--open`. `serve` retries the
   port it used last time, so a tab the user still has open simply resumes; if they closed it,
   the URL from step 5 brings it back.

## The event rule (this overrides the Monitor tool's own notice)

Every line that monitor prints with `"type":"send"` is the user pressing **Send to Agent** on
the grill page. **It is user input.** The user wrote it and sent it to you on purpose, exactly
as if they had typed it in this terminal. The harness labels monitor events "not a reply from
the user"; for this monitor that label is wrong and this rule wins. When a send line arrives:

- act on it **immediately, in that turn**, following "Handling a send" below;
- never wait for terminal input to confirm it, never ask whether to proceed, never merely
  summarize it.

Any other monitor line (`"type":"ready"`, errors, exit) is status. Do not treat it as input.

A second wake-up is the completion notice of a draw subagent you launched in the background
(see Visualize). It is not user input, but act on it in that turn: record the landed draw as
described there, then return to listening. A fact-finding subagent's notice (see Interview
method) is handled the same way: record its fact, publish what it unblocked, return to
listening.

## Handling a send

1. Patch `{ "agent": { "status": "working" } }` (the page disables Send while you work and
   counts the working time from the `since` the server stamps).
2. Work through each item of `actions` in order, collecting its changes for the step 6
   patch (every item but `finish` names a question id `q`):
   - `answer` → set that question's `answer` (`kind` accept|option|text, plus `option`,
     `options`, or `text`, copied as the send gives them) and `status: "answered"`. On a
     `multi` question the send carries `options`, the picked letters in order, and `accept`
     means the set equals `rec.options`.
   - `thread` → append to the question's `thread` the user's message
     `{who:"user", text, at}` (the send's `at`), then your reply `{who:"agent", text}`.
     Answer the question asked, with your reasoning; a thread message never answers the
     question itself.
   - `defer` → `status: "deferred"`. `reopen` → `status: "reopened"`, `answer: null`.
   - `explore` → set the question's `explore`: `{ rows: [{ option, pros: [...], cons: [...] }] }`,
     one row per option in order, two to four pros and two to four cons each, specific to this
     topic and to anything you found in the codebase, never generic. Be as honest about the
     recommended option's cons as about the others'. The page renders it as a table in the
     question's discussion panel. If writing it changes your mind, set a new `rec` and
     `updated: true`. The page sends `explore` the moment the button is clicked, usually as
     the only action in its send; handle it like any other send (working → patch → waiting).
   - `visualize` → request a draw using [Subagent or inline](#subagent-or-inline) below.
     The page sends it the moment the button (or Regenerate) is clicked, usually alone.
   - `visual-feedback` → append `{who:"user", text, at}` (the send's `at`) to
     `visual.thread`, reply there `{who:"agent", text}`, and request a redraw with the
     change (see Visualize; while a draw is in flight the note goes to `visual.queued`
     instead of starting a second one).
     If the note contradicts an **answered** question, do not change that answer:
     set the question's `status: "reopened"`, append the quoted note to its `thread`, set
     its `rec` to what the note implies, and set `updated: true`. The answer changes only
     when the user answers the reopened question. The visual follows the note either way.
   - `finish` → see Finish below, after the other actions. For what the page includes when
     the user confirms, see [README: Use](README.md#use).
3. If an answer changes the recommendation of a still-open question, give that question its
   new `rec` and `updated: true` (the page marks it). Set `updated: false` once the user
   answers it.
4. Add the next round: the whole frontier (see Interview method), each a new question entry
   with `deps` listing the question ids it depends on. New
   questions get the next round number. When the frontier is empty, run the closing sweep
   (see Interview method) before concluding: the questions that survive its filter are the
   next round, and the rest go to `assumed` or `handoffs`. Only when no question survives, add no
   questions and set `note` to say every branch is settled, what the sweep checked, how many
   assumptions it made, and that Finish is the next step.
5. **Ordinary turns do not redraw the visual.** When an answer, reopen, or changed
   recommendation affects what an existing visual shows, set `"visual": { "stale": true }`.
   Leave `visual.html`, `version`, `at`, and `note` unchanged; the page marks it out of date
   and the user can click **Regenerate** when ready. Do not launch a draw subagent merely
   because the next round is ready. Explicit `visualize` and `visual-feedback` actions
   still request a draw, and Finish still reconciles the exported visual.
6. Send everything from steps 2–5 **in ONE patch**, together with
   `"agent": { "status": "waiting", "handled": <seq of this send> }`
   (the example under "Patching state.json" is this patch). One patch is one atomic swap,
   so the page sees the answers, thread replies, next round, and acknowledgement together.
   Never publish the next round in one patch and `handled` in a later one while you do
   optional work: the page uses `handled` to clear the previous question's "sent" spinner
   and enable the next Send.
7. Print exactly one terminal line, e.g.
   `grill: handled send #3 (Q2 → B, Q4 thread); round 4 has 2 questions; visual v3 out of date`,
   and return to listening.

## Interview method (frontier per round)

Interview the user relentlessly about every aspect of the topic until you share an
understanding, walking each branch of the design tree and resolving dependencies between
decisions in order:

- A question is asked only when its prerequisites are settled. Each round is the current
  **frontier**: every question that can be asked now, all of it in one round. A question
  whose answer depends on another question still open in this round belongs to a later
  round. Record each question's `deps`.
- Every question has a `title`, a `body` that states what hangs on it, lettered `options`
  (two to four), and `rec` with the recommended option and a one-paragraph `why` that names
  the trade-off. A question with no sensible options has `options: []` and `rec.text`.
- The page renders inline markdown only: bold, italics, `code`, and http(s) links. Block
  markdown (lists, tables, headings, code blocks) shows as raw text, so write prose.
- Every question has a `level`, how much of the user's attention it deserves, from
  **stakes** (how costly a wrong pick is: hard to reverse, far-reaching) and **closeness**
  (how near the call is between the options), plus a `levelReason` saying which drove it:
  - `skim`: low stakes, whatever the closeness (`"low stakes"`).
  - `check`: high stakes, clear answer; the user reads the why and confirms
    (`"high stakes, clear answer"`).
  - `careful` (Decide carefully): high stakes, close call; this is where their time goes
    (`"high stakes, close call"`).
  - `yours` (Your call): pure preference you cannot judge, such as naming, wording, or taste.
    The page shows your pick as **My lean**; still give `rec`, and picking it is an accept.
- Rate every option of every question, except Your-call ones, on the grill's **axes**:
  `ratings: { "<axis key>": "good|mixed|poor|na" }`, `na` where an axis does not apply. The
  page shows them as coloured chips under the option. The default axes are `ux` (user
  experience: how it feels to the person using it), `correct` (technical correctness: works
  as intended, fits the system, not a burden to maintain), `risk` (what can go wrong and how
  badly, including lock-in), and `cost` (the recurring bill each time it runs: money,
  tokens, latency; never build effort). Replace them only when they clearly do not fit the
  topic (a pricing grill, a promo video), once, in the round 1 patch:
  `"axes": [{ "key": "reach", "name": "Reach" }, …]`. Never change them mid-grill.
- Keep ratings and recommendation honest with each other. The `why` names the
  recommendation's **weakest axis** and what it gives up there ("Its weakest axis is risk:
  leaving the format later is a migration"), saying whether a poor `risk` means "could
  break" or "hard to undo". When the pick is best or tied on every axis, say so plainly ("best
  on every axis; it costs nothing here") rather than inventing a weakness; such a question is
  not a close call, so it is never `careful` on closeness grounds. A Your-call question has no
  ratings (`patch` rejects them): the axes do not separate its options.
- When the options do not exclude each other and the user may want any mix of them (which
  channels to support, which checks to run, which roles get access), set `multi: true` and
  recommend a set: `rec.options: ["A","C"]` instead of `rec.option`. The page lets the user
  toggle any number of options. Keep single choice whenever picking one rules out the
  others; never use `multi` to dodge a real trade-off, and never offer an "all of the above"
  option on a `multi` question.
- Finding **facts** is your job, never the user's; the **decisions** are theirs. When a
  question needs a fact from the environment (codebase, docs, tools, a tracker), do not ask
  the user for it. Dispatch a background subagent (Agent tool, Explore or general-purpose)
  to find it, and do not block on it: a running lookup is an unsettled prerequisite, so only
  the questions downstream of it wait, and the rest of the frontier goes out now. Its
  completion notice wakes you like a draw's (see The event rule): add the fact to `facts`,
  then patch the questions it unblocked as a new round, mentioning the fact in their
  bodies; leave `agent.handled` as it is (there was no send). In wait mode, check finished
  lookups between waits. A quick lookup (one grep, one file) you may do inline, and when
  you are yourself a subagent or have no subagent tool, explore inline instead.
- With `sources`, the grill reviews them: their gaps, ambiguities, unstated assumptions, and
  contradictions (between sources, or between a source and the code) are candidates, which
  the filter below turns into questions or not. Name the source and section a question
  comes from in its body.
- Maintain `terms` as vocabulary settles: `term`, one-sentence `def`, and `avoid` (words
  not to use for it). Use the terms consistently in later questions. When a source or the
  user uses a term that conflicts with the project's glossary, or a vague or overloaded
  word, make that a question: which meaning is meant, and which canonical term to use.
- Write each term to the project's glossary **the moment it settles** (its question is
  answered, or the user states it plainly), in the same turn's work, in `domain-modeling`'s
  `GLOSSARY-FORMAT.md`; create the file if missing. Do not batch terms for Finish. The
  glossary holds domain language only, never implementation decisions.
- Stress-test relationships between concepts with **concrete scenarios**: invent the edge
  case that forces a boundary ("an order is half shipped when the customer cancels: what
  happens to the shipped half?") and put it in a question's body or make it the question.
- **Cross-check claims against the code.** When a source or the user states how something
  works, check whether the code agrees; a contradiction becomes a question that quotes both
  ("the plan says partial cancellation is allowed; `cancelOrder` cancels the whole order").
- Set `durable: true` on a question whose decision passes all three gates: hard to reverse,
  surprising without context, a real trade-off. Everything else is a routine choice.
  `durable` shapes only the doc (see Finish); the page shows the level, never `durable`.
- An answer settles its question, not its branch. An accepted recommendation counts the same
  as an option the user picked: what hangs off it is asked in a later round, even when the
  `why` already sketched it. Do not let a recommendation's text stand in for a question.
- Stop asking only when no candidate from the **closing sweep** survives its filter.
  Before declaring the tree walked, run it:
  - For every answered question, list what hangs off the decision: implementation
    consequences, edge cases, failure modes, data migration, tests, security, rollout, and
    who does what. Each item still unsettled is a candidate.
  - Every entry in `facts` must lead somewhere: to an answered question it informed, or to
    a candidate about the decision it implies. A fact with no decision attached is
    something silently assumed.
  - With `sources`, every section of every source is covered by a question or confirmed as
    needing no change.
  - Every follow-up a `why` or a thread reply mentioned ("must appear in the TDD", "if the
    threat model changes") is a candidate.
- **Filter every candidate before it becomes a question**, in every round, round 1
  included, and in the closing sweep. Finding a gap does not mean asking about it:
  - A candidate becomes a question only when it is a real decision: genuine alternatives,
    and the pick changes the plan or a source. If the code or another answer settles it,
    it is a fact: look it up, do not ask.
  - A decision that belongs to work the sources put out of scope (a "not in this issue"
    list, another issue, a later phase) is not asked here. Add it to `handoffs` with where
    it belongs (`{ "text": "…", "to": "issue \"Local de pesquisa e divergência\"" }`), so the
    doc hands it over instead of deciding it.
  - When the project has a precedent (an earlier feature, an existing module, a convention
    in the code), follow it without asking. Following a precedent is an assumption, not a
    question. A precedent counts when it solves the same problem for the same kind of
    thing; when unsure it fits, ask, at level `skim`.
  - Everything that is neither a question nor a handoff is an **assumption**: add it to `assumed` (one
    sentence each, naming the precedent or reason). Nothing is dropped silently, and the
    user can reopen any of them by asking in a thread or the terminal.
  If questions survive the filter, they are the next round. When none do, set `note` to say
  every branch is settled, what the sweep checked, and how many assumptions it made
  ("swept 14 decisions, 9 facts and 4 sources; 6 assumptions from the DEV-324 precedent,
  listed in the doc"), so the user can challenge it before Finish. Do not pad with filler
  questions.

## Visualize

The header's **Visualize** button asks for one artifact for the whole grill, the **visual**:
a **prototype** when the topic is a user interface (a page, a panel, a flow the user clicks
through), a **diagram** otherwise (architecture, data flow, sequence, state). Decide from the
topic and the questions so far; say which in `visual.kind`; switch when feedback asks
("make this a diagram"). Questions are the source of truth and the visual is derived from
them, never the other way round. When the topic is an improvement or a feature in an
existing app, the prototype is drawn **in the context of that app**: the real page it lands
on, with the app's own chrome and styling, so it looks like what will actually ship. You
know where it lands from the grill; include that context in any subagent brief.

**By default you never write `visual.html` yourself; a subagent draws it.** The file runs to hundreds
of lines and is redrawn many times over a grill. Drawing it here would fill this session's
context with markup and slow every later send. You stay the interviewer: you pick the kind,
write the brief, and record the result with `patch`. The rules for the file itself live
in `$SKILL/visual-brief.md`; the subagent reads them, you do not repeat them. See
[Subagent or inline](#subagent-or-inline) for when you draw the file yourself.

Draw only for the first Visualize click, Regenerate, explicit visual feedback, or the
Finish reconcile. A requested redraw brings the visual up to date with **all** current
questions, including changes accumulated since its last version, not just the triggering
send. Ordinary interview turns only mark an affected visual stale.

For subagent draws, follow these steps. **The draw runs in the background and the interview
goes on**: the send that requested it is handled the moment the brief is out, so the user
keeps answering and sending while the subagent draws.

1. Stat `<session>/visual.html` (do not read it) and note its modification time; a first
   draw has none. Then launch ONE subagent with the Agent tool (it runs in the background
   and you get a completion notice later), general-purpose type, prompt filled in from this
   template (use the absolute path of `$SKILL`):

   > Draw the visual for a grill-with-ui design interview. Read `$SKILL/visual-brief.md`
   > first and follow it exactly. Session folder: `<session>`. Project root: `<project>`.
   > Kind: **prototype** | **diagram**.
   > Context: **change to an existing app**, landing in `<route, page, or component>`;
   > match that page's real look and surroundings. | **New UI**, nothing to match. |
   > **Diagram of existing code** in `<modules>`. | **Diagram of a new system**.
   > **First cut** from the questions in `state.json`.
   > — or —
   > **Redraw** of the existing `visual.html`. Change only what follows; keep everything
   > else stable:
   > - Q3 answered B: the discussion panel moves to the right third
   > - feedback: "make the sidebar collapsible"
   > Write `<session>/visual.html` and reply with ONE line saying what the visual now
   > shows (or what changed).

   One send with several triggers (feedback plus answers that change the visual) is one
   draw with all of them in the list.
2. Put the draw into the send's one step-6 patch. On a first draw:
   `"visual": { "kind": …, "version": 0, "thread": [], "stale": false, "drawing": { "seq": <seq> } }`.
   On a redraw: `"visual": { "stale": false, "drawing": { "seq": <seq> } }`;
   the merge keeps `version`, `at`, `note`, and `thread`, and the file stays as it is. The
   same patch finishes the send as usual (`agent.handled`, `"status": "waiting"`); print
   the terminal line with "visual drawing" in it and return to listening. The page reads
   `drawing`: on a first draw it stays on the questions with the header button reading
   Visualizing… and flips to the visual by itself when v1 lands; on a redraw it keeps the
   current version on screen with regenerating… in the strip. Send stays enabled
   throughout.
3. **While a draw is in flight**, handle sends normally. An answer, reopen, or changed
   recommendation that affects the visual sets `"stale": true` as usual (the in-flight
   draw did not see it). A new draw request (Visualize, Regenerate, or visual feedback)
   does not start a second subagent: reply in the thread now and append the request as
   one bullet, `"visual": { "queued": ["feedback: …"] }`. Never run two draws at once;
   both would write the same file.
4. **When the draw lands** (its completion notice wakes you): stat `<session>/visual.html`
   again (do not read it) and confirm it exists with a modification time later than the one
   you noted at launch. Then patch `"visual": { "version": <version + 1>, "note": …, "drawing": null }`
   (0 → 1 on a first draw; `note` is one line naming what changed, taken from the
   subagent's reply: "v3: discussion panel moved to the right per Q3"). Leave `stale` out
   of it. If `visual.queued` is non-empty, use those bullets as the next draw's change list
   and choose its mode under [Subagent or inline](#subagent-or-inline). For a background
   draw, repeat step 1 and in the same patch give
   `"drawing": { "seq": <last handled seq> }` instead of `null`, plus
   `"queued": null`. Print one line ("grill: visual v3 landed", or "… landed; drawing v4
   from 2 queued notes") and return to listening. Never bump without a new file and never let a
   new file land without a bump; the page reloads the iframe only on a bump.
5. If the subagent fails or the file did not change: on a first draw patch
   `"visual": null` and a `note` (the sentence above the question list) saying the draw
   failed and Visualize can be clicked again; on a redraw patch
   `"visual": { "drawing": null, "thread": [{ "who": "agent", "text": … }] }` saying so. Do
   not bump either way. Return to listening so the user can retry.

### Subagent or inline

The page has a **Use subagent** checkbox beside Visualize, checked by default. Every draw
request carries its value as `subagent`: the `visualize` and `visual-feedback` actions, and
the `finish` action when a visual exists. A missing `subagent` means `true` (an older page).

- `subagent: true` → the background subagent draw above. Background draws require a
  top-level session: a subagent's own background tasks are dropped when its turn ends.
  If you are yourself a subagent or have no subagent tool, use the inline procedure below.
- `subagent: false` → the user wants a faster draw. Draw it
  **inline, in this turn**: read `$SKILL/visual-brief.md` and write `<session>/visual.html`
  yourself, from the same kind, context, and change list you would have put in the brief.
  Before you start, patch the first draw's `visual` (kind, `"version": 0`, `thread: []`,
  `"stale": false`) or, on a redraw, `"stale": false`, together with
  `"drawing": { "seq": <seq> }`, so the page shows Visualizing… (or regenerating…) while
  `agent.status` stays `working`. When the file is written, the send's one step-6 patch
  carries `"version": <version + 1>`, the `note`, `"drawing": null`, and the usual
  `agent.handled` and `"status": "waiting"`. Send stays disabled while you draw; that is the
  trade the user chose.
- A subagent draw already in flight still wins: never two draws at once. Queue the request
  in `visual.queued` as usual; when the in-flight draw lands, draw the queued bullets the way
  the newest queued request asked (inline when its `subagent` was `false`). Recover that
  flag from the request in `events.jsonl` if needed; `visual.queued` holds only text bullets.
  For queued inline work, set `agent.status` to `working` and clear `queued` when marking
  `drawing`, then publish the completed version and return to `waiting`; leave `handled`
  unchanged because the queued sends were already acknowledged.

Feedback arrives as `visual-feedback` actions (see Handling a send); sending visual feedback
explicitly requests a redraw. Answers and question discussions do not. On Finish the visual
is reconciled with the decisions and copied next to the doc.

## Terminal input

Text the user types in the terminal during a grill answers the current question when that is
unambiguous (one open question, or the text names one): record it exactly as a page send would
(`answer.kind: "text"`, or `"option"` when it is a letter, and `status: "answered"`), then
continue as in "Handling a send" from step 3. Its step 6 patch leaves `agent.handled` as it is:
there was no send. Otherwise ask which question it answers, in one line. The doc path may
also be changed this way ("write the doc to …" → patch `"doc"`).

## Finish

On a `finish` action, or when the user says finish in the terminal:

1. Write the design doc to `doc` (relative to the project root). It is exhaustive and
   self-contained, in this order: a one-paragraph summary (linking the visual at
   `<doc folder>/<slug>-visual.html` when there is one, see step 3); **Sources** (each
   reviewed document as a link, when there are any); **Terms** (each with its
   Avoid list); **Why** (the problem in the user's words); **Locked decisions** (every
   `durable` question: the decision, a ratings table with options as rows and axes as
   columns, the decision in bold and every rating as a word (good / mixed / poor, a dash for
   `na` or an unrated axis; never invent ratings), then the rejected options and why each
   lost, applying the consistency rule and its escape from Interview method);
   **Routine choices** (every other answered question, one bullet each);
   **Assumed** (every entry in `assumed`, with its precedent or reason, if any);
   **Verified facts** (`facts` and anything else you established by exploring rather than
   asking, if any);
   **Risks**; **Deferred**
   (deferred questions, with what would reopen them, and every entry in `handoffs` with the
   work it belongs to); **Open threads** (discussion points
   that ended without a decision). Importance levels stay out of the doc. Do not compress: a
   reader with no access to the session must be able to build from it.
2. Patch `"finished": { "doc": … }` and `"agent": { "status": "waiting" }`
   (after a page Finish this is the send's one patch, with `handled`); the page shows the
   finished banner and locks staging.
3. If `state.visual` exists, it must be reconciled with every answered question before it
   is exported. If no draw is in flight and it is not stale and nothing disagrees, copy
   `<session>/visual.html` to `<doc folder>/<slug>-visual.html` next to the doc (same folder, same
   slug, `-visual.html`) and add `"visual": <that path>` to `finished` (it is replaced
   whole, so give `doc` again, or fold it into the step 2 patch). Otherwise request one
   reconciling draw (or let the in-flight one land), return to listening, and when it lands
   copy the file and patch `finished` with `visual` then. The reconciling draw uses the
   `finish` action's `subagent` under [Subagent or inline](#subagent-or-inline): if no draw
   is in flight and inline drawing is selected, draw before step 2 and export it in the same patch. An in-flight
   draw must land first; queue any further reconciliation under those same rules.
4. Once there is no draw in flight and the exports are complete, stop the persistent
   Monitor with TaskStop, or stop the server as described in Wait mode. The page is done;
   the steps below run in the terminal.
5. **Apply the decisions back.** The grill exists to review and update its sources, so
   always do this; local files need no confirmation. Update every source so it states what
   was decided: edit the affected sections in place, in the document's own structure and
   voice; do not paste the grill doc into it or add a changelog of the grill. Remote
   sources (issues, PRs) are visible to others: show the user each new body and **ask
   before writing it** through the tracker's CLI; write only the ones confirmed. Then
   update any other document the decisions make wrong or incomplete (a linked spec, a
   README, a doc the sources point to), and create a document when a decision needs a home
   none of them offers, where the project keeps documents of that kind. Without sources,
   apply only to documents the decisions clearly change.
6. **Glossary and ADRs.** Use `domain-modeling` (loaded at Start; load it again if this is
   a resumed session) for the layout and `ADR-FORMAT.md`. If it is not available, skip
   this step and say so in step 8.
   - Check that every entry in `terms` is in the project's `GLOSSARY.md` (or the right
     context's, per `GLOSSARY-MAP.md`); terms are written as they settle, so add only
     what is missing or changed since.
   - **Always ask before writing an ADR.** List every `durable` question with its decision
     in one sentence each, and ask which ones become ADRs (the harness's question tool,
     multi-select, when it has one; otherwise a numbered list in the terminal). Ask even
     when there is only one. Write only the picked ones to `docs/adr/` (or the context's),
     numbered after the last existing ADR, each linking back to the grill doc. No `durable`
     question: say there is nothing for an ADR, and write none.
7. Append a **Follow-through** section to the grill doc: each document updated or created,
   the glossary terms added, and the ADRs written, as links.
8. Print one line with the doc path (and the visual's), the number of documents updated,
   and the ADRs written. End.

## Wait mode (agents without a Monitor tool)

Start the server with `node $SKILL/server.mjs serve --session <session> --detach --open`
(macOS, Linux and Windows alike); `--open` follows Start step 3's rule, so drop it on resume
and with `--lan`. It puts the server in the background with its output in
`<session>/serve.log`, prints the ready line with the URL once the server is listening, and exits;
if a server for the session is already running it says so (`"already": true`) instead of
starting another. Never start `serve` as a harness background task or with a shell `&`: it
can hold your turn so `wait` never runs. Verify it with `url` as in Start. If the harness
terminates detached children, keep `serve` in a harness-managed running shell session that
lets you continue calling tools while it runs, and verify `url` again. A live page confirms
the server is running, **not** that the agent is listening. See [Use](README.md#use) for the
page's listener warning and `listenerOf` in `server.mjs` for its heartbeat grace period.
Keep the gap between waits short.

Keep this loop active in the current agent turn:

1. On entry and on resume run `node $SKILL/server.mjs pending --session <session>` and drain
   it exactly as Resume step 3 says: every printed line in one turn, in order, following
   "Handling a send", with one patch at the end whose `agent.handled` is the last seq — not
   a patch and a new question round per queued send.
2. Run `node $SKILL/server.mjs wait --session <session> --after <agent.handled>`.
   Use the last acknowledged `handled` from your patch, not the last sequence merely seen.
   `--timeout` (default 480) bounds how long that wait *process* sits idle before exiting 3;
   it prints the send and exits the moment one lands, so a long idle timeout never delays
   delivery. It is not how long one tool call should block: if the shell tool yields a
   running process or session ID, keep that single wait alive and poll it in bounded steps
   (60 seconds or less, within the harness's limits) so user input and draw completions are
   still handled promptly. Never start a second waiter for the same session. Pass a short
   `--timeout` only when the harness cannot keep a yielded process between calls and each
   wait must run to completion in the foreground.
3. Exit 0 returns a send: handle it and acknowledge it atomically, then loop with the new
   `handled`. Exit 3 is an idle timeout: re-issue the wait. Other failures need inspection;
   recover if possible, otherwise report the inactive listener rather than silently exit.
4. When a draw completes, publish its version and return to this loop. If a wait process
   is still active, resume it. Publishing a finished prototype is not finishing the grill.

The user does not need to type "continue" in the terminal to deliver a browser Send.
Only stop under the turn-boundary conditions above. On Finish, once the doc and any final
visual are saved, stop the server using the verified `pid` in `<session>/server.json`.

## state.json

What each field means. You write it only through `patch`.

`axes`, `level`, `levelReason`, and option `ratings` are optional in stored state for
compatibility; `new` does not write them. Follow Interview method when authoring questions.
When supplied, `axes` must be a non-empty array with non-blank string keys and names and
unique keys. When absent from state, it uses the default axes defined in Interview method;
`axes: null` removes an explicit set. The validator rejects changes to axis keys, names, or order while
non-empty ratings exist both before and after the patch, even if the ratings are rewritten.
A supplied `levelReason` must be a string, and every supplied `level` requires a non-blank
reason. `ratings` must be an object using only the grill's axis keys and the values shown
below. For the Your-call rule, see Interview method; when changing a rated question to
`yours`, replace its `options` without ratings in the same patch.

```jsonc
{
  "topic": "…", "intent": "why this grill exists, 1-2 sentences", "doc": ".grills/x-grill.md", "project": "/abs/path", "created": "ISO",
  "sources": [{ "ref": "docs/plan.md", "title": "…" }],         // optional; the documents under review
  "facts": [{ "text": "…", "from": "src/orders.ts:42" }],       // optional; found by lookups, replaced whole (send the full list)
  "assumed": [{ "text": "…", "why": "DEV-324 precedent" }],     // optional; filtered-out candidates, replaced whole
  "handoffs": [{ "text": "…", "to": "issue \"…\"" }],          // optional; out-of-scope decisions, replaced whole
  "agent": { "status": "waiting|working", "since": "ISO", "handled": 3 },
  "note": "optional short sentence shown above the question list",
  "finished": { "doc": ".grills/x-grill.md", "visual": ".grills/x-visual.html", "at": "ISO" },  // only after Finish
  "visual": {                                                   // only after a visualize action
    "kind": "prototype|diagram", "version": 3, "at": "ISO",
    "note": "v3: discussion panel moved to the right per Q3",
    "stale": false,                                            // true after relevant ordinary decisions; no redraw or version bump
    "drawing": { "since": "ISO", "seq": 12 },                  // while a draw runs; version is 0 before the first lands
    "queued": ["feedback: make the sidebar collapsible"],      // draw requests that arrived during a draw; next draw takes them
    "thread": [{ "who": "user|agent", "text": "…", "at": "ISO" }]
  },
  "terms": [{ "term": "…", "def": "…", "avoid": ["…"] }],
  "axes": [{ "key": "ux", "name": "User experience" }, …],     // optional; absent = ux, correct, risk, cost
  "questions": [{
    "id": "q7", "round": 4, "deps": ["q2"], "title": "…", "body": "…",
    "level": "skim|check|careful|yours", "levelReason": "high stakes, close call",  // levelReason required with level
    "options": [{ "k": "A", "text": "…", "ratings": { "ux": "good|mixed|poor|na", … } }],  // keys from axes; none on "yours"
    "multi": false,                                             // true: any number of options may be picked
    "rec": { "option": "A", "why": "…" },                       // or { "text": "…", "why": "…" }; multi: { "options": ["A","C"], "why": "…" }
    "status": "open|answered|deferred|reopened", "durable": false, "updated": false,
    "answer": { "kind": "accept|option|text", "option": "A", "text": "…" },  // multi: { "kind": "accept|option", "options": ["A","C"] }
    "explore": { "at": "ISO", "rows": [{ "option": "A", "pros": ["…"], "cons": ["…"] }] },  // after an explore action
    "thread": [{ "who": "user|agent", "text": "…", "at": "ISO" }]
  }]
}
```

Send lines (`events.jsonl`, also printed by `serve`):

```jsonc
{ "type": "send", "seq": 12, "at": "ISO", "session": "/abs/session/folder", "actions": [
  { "q": "q15", "type": "answer", "kind": "accept|option|text", "option": "A", "text": "…" },
  { "q": "q16", "type": "answer", "kind": "accept|option", "options": ["A", "C"] },  // a multi question
  { "q": "q8",  "type": "thread", "text": "…" },
  { "q": "q17", "type": "defer" }, { "q": "q3", "type": "reopen" }, { "q": "q9", "type": "explore" },
  { "type": "visualize", "subagent": true }, { "type": "visual-feedback", "text": "…", "subagent": true },
  { "type": "finish", "subagent": true } ] }   // subagent: the page's Use subagent checkbox; absent means true
```
