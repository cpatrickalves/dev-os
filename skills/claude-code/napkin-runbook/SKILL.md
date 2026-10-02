---
name: napkin
description: |
  Napkin — this repo's runbook of reusable rules, at `.claude/napkin.md`. Use at the start of every session to read and curate it, and again mid-session whenever work surfaces a gotcha, a user directive, or a tactic worth reusing next time.
author: Codex
version: 7.1.0
date: 2026-08-03
---

# Napkin

The napkin is a **runbook**: the short list of rules that will change how you work in this repo next session. Nothing earns a slot for having happened — only for what it makes you do differently.

## Step 1: Read and curate

Read `.claude/napkin.md` first, before any other work. Apply what's there silently — no announcement that you read it.

Curate it in the same pass:

- Merge items that say the same thing; drop ones that stopped being true.
- Re-sort each category highest-priority first.
- Re-file items whose category no longer fits.
- Cut the lowest-priority entries in any category holding more than 10.

Done when every category is at most 10 items sorted highest-first, and every surviving item carries a date, a short rule title, and a `Do instead:` line.

If `.claude/napkin.md` does not exist yet, read `TEMPLATE.md` in this skill folder and write the napkin from it, adapting the categories to this repo.

## Step 2: Extend as you work

When you learn something reusable, add it right then — waiting until session end loses it.

An item earns a slot when it will change what you do in a future session:

- A gotcha in this repo or toolchain you would otherwise rediscover the hard way.
- A user directive governing repeated behavior.
- A tactic that has now worked more than once.

Everything else stays out: timelines, postmortems, and mistakes with no fix attached belong in the transcript, not the napkin.

## Entry format

```markdown
1. **[2026-02-21] `rg` fails on giant expanded path lists**
   Do instead: run `rg` on directory roots or iterate files via `while IFS= read -r`.
```

`Do instead:` is the load-bearing line. An entry without a concrete repeatable action is a mistake log, and a mistake log is what curation exists to remove.
