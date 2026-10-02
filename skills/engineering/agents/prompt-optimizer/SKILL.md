---
name: prompt-optimizer
description: Rightsize prompts and context documents for Claude 5-generation models — system prompts, CLAUDE.md, SKILL.md files, tool and agent descriptions. Use when the user asks to optimize, simplify, or review a prompt or context file, says "rightsize", or mentions Claude 5 / Fable / Opus 5 prompting rules.
disable-model-invocation: true
---

# Prompt Optimizer

Rightsize a prompt or context document for Claude 5-generation models (Opus 5, Fable 5). The default move is **deletion** — replace rules with judgement, examples with interfaces, and upfront detail with progressive disclosure. A line earns its place only if it changes behavior versus the model's default; otherwise it is a **no-op**.

## Steps

1. **Read the target document in full.** Identify its type (system prompt, CLAUDE.md, skill, tool/agent description, spec), then read [`references/document-types.md`](references/document-types.md) for what that type should carry — it also covers the case where no target is named.
2. **Audit line by line against the six shifts below.** Judge each line against the principle; the wordings in the rubric are illustrations, and a line can look innocent and still break a shift. Mark every line with one verdict: **keep** (earns its load), **rewrite** (right idea, over-constrained wording), **delete** (no-op, stale, duplicated, or discoverable from the environment), or **disclose** (live, but only some runs need it — move behind a pointer). The audit is done when every line of the original carries a verdict — count them against the original.
3. **Conflict check.** Scan the *assembled* context, not just the target file: the system prompt, skills, CLAUDE.md, and user request all land in one window, and Claude has to reconcile them. If a kept line contradicts another layer the user controls (e.g. a skill saying "do not add comments" while CLAUDE.md says "document as appropriate"), flag the pair and propose which single place should own that instruction.
4. **Report.** For every rewrite, delete, and disclose verdict, quote the actual passage and name the shift that justifies it; show estimated before/after size. Wait for the user's approval.
5. **Apply the approved verdicts.** Rewrite in place; for *disclose* verdicts, move the material to a separate file and leave a one-line pointer that states what the file is and when to reach it.

Done means every applied change was approved.

## The six shifts (audit rubric)

**1. Rules → Judgement.** Absolute prohibitions ("never", "DO NOT", all-caps warnings) existed to stop worst cases in older models, and are wrong for some subset of prompts. Rewrite each as a principle that states the target behavior — *"default to no comments; never write multi-line blocks"* becomes *"write code that reads like the surrounding code: match its comment density"*. Keep a hard rule only where a wrong call is genuinely costly (data loss, external side effects, money, approvals, backups) — those are legitimately hard: keep them verbatim.

**2. Examples → Interfaces.** Worked examples constrain the model's exploration space. Delete them and make the interface expressive instead: enum values that hint at usage (`pending | in_progress | completed`), one-line constraints (*"only one task in_progress at a time"*), parameter names that carry meaning.

**3. Upfront → Progressive disclosure.** Material that every run needs stays in the main file; material only some runs reach moves to a separate file behind a pointer whose wording says when to load it. Long documents split into a tree of files loaded at the right time.

**4. Repetition → Single statement.** The same instruction in two places (system prompt + tool description, CLAUDE.md + skill) is a maintenance bug, not emphasis — Claude 5 models don't need it repeated. Keep the most local copy (the tool description over the system prompt) and delete the rest.

**5. Environment is the source of truth.** Delete anything the model can find by looking: file layout, `package.json` scripts, config values, `--help` output. Keep only what no file confesses — unwritten conventions, the reason behind a choice, the gotcha.

**6. Simple specs → Rich references.** Where the document describes desired output in prose, point to a higher-fidelity reference instead: a test suite as the spec, a function to port, an HTML mockup over a design description, a rubric a verifier agent can apply.
