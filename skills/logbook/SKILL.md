---
name: logbook
description: |
  Update the project's daily work logbook at `.claude/logbook.md` with a succinct, dated, PT-BR record of what was done — written so the user can paste the day's block straight into their Notion logbook. Safe to run many times a day: it merges new work into today's entry instead of duplicating it. Use whenever the user says "logbook", "atualiza o logbook", "registra no log", "log do dia", "anota o que fizemos", "o que fiz hoje", or asks to record/summarize progress so far in a session — even mid-session and even if they don't name the file. Prefer this over end-session when the user wants a short daily record rather than a full end-of-session report.
---

# Logbook

The logbook is a running diary of what the user did in this project, one block per day. Its reader is the user a week from now, and its destination is a Notion page where each day sits in a toggle. So each entry has to be short enough to scan, concrete enough to jog memory ("which PR was that?"), and formatted so a copy-paste into Notion needs no cleanup.

It is not a session report. No sections for overview, file changes, decisions, lessons. Just what got done, the few details worth remembering, and what's left open.

## Step 1: Locate the file and today's date

```bash
date +%F                                                   # today, e.g. 2026-09-24
git rev-parse --path-format=absolute --git-common-dir 2>/dev/null
```

The logbook lives at `<project root>/.claude/logbook.md`. If you are inside a git worktree (for example under `.claude/worktrees/`), the project root is the parent of the `--git-common-dir` path, not the current directory — worktrees get deleted, and the logbook must survive them. Outside a git repo, use the current directory.

## Step 2: Gather what was done today

Two sources:

1. **This conversation** — the main source. What was implemented, fixed, reviewed, planned, decided, investigated, and what's still pending.
2. **Today's git activity**, which catches work from other sessions of this project:

   ```bash
   git log --all --since="$(date +%F) 00:00" --author="$(git config user.email)" --format='%h %ad %s (%D)' --date=format:%H:%M
   git branch --show-current
   ```

   Commits tell you *that* something happened; turn them into outcomes ("Implementei o endpoint de histórico (CHATCONTAS-123)"), not a commit list. Skip commits already covered by the conversation or by today's existing entry.

Only record what you have evidence for. If something is ambiguous (was the PR merged or just opened?), write the weaker claim.

## Step 3: Read the current logbook

Read `.claude/logbook.md` right before writing — another session may have updated it since you last looked. If it doesn't exist, start it with:

```markdown
# Logbook — <project name>
```

where `<project name>` is the basename of the project root.

## Step 4: Write today's entry

File layout: one `## YYYY-MM-DD` heading per day, no month headings, oldest first and newest at the bottom, the same order as the user's Notion logbook:

```markdown
# Logbook — acai-chatcontas-api

## 2026-08-31
- Finalizei a implementação da CHATCONTAS-125 (compactação de versões de checkpoint)
  - Regra de retenção em três `DELETE` numa transação, agendada como `BackgroundTask` após o stream
  - ADR 0015 e guia `docs/guias/limpeza-de-checkpoints.md`

## 2026-09-08
- Finalizei o grill da CHATCONTAS-130 e iniciei a implementação
- [ ] Aprovar o PR 1350
```

**If today's block doesn't exist**, append it at the end of the file.

**If it already exists** (the skill already ran today, or the user wrote in it), merge into it:
- Keep every existing bullet, including ones the user wrote by hand — reword only to reflect progress on the same item.
- When an item progressed, update it in place instead of adding a second bullet: "Iniciei a FRONTACAI-739" becomes "Iniciei e finalizei a FRONTACAI-739"; `- [ ] Aprovar o PR 1350` becomes `- [x] Aprovar o PR 1350` once it's done.
- Add genuinely new items at the end of the block.

Never touch previous days. They are history the user may already have pasted into Notion. If a pending item from an earlier day got done today, record it as done in today's block and leave the old checkbox as it is.

### Writing style

Match the user's own logbook voice:

- **PT-BR, first person, past tense**, with the user as the actor even if Claude did the typing: "Implementei", "Revisei", "Iniciei", "Continuei", "Finalizei", "Corrigi", "Investiguei", "Aprovei", "Decidimos".
- **One bullet per task or outcome**, not per step. "Revisei o PR 1364" — not "abri o PR, li o diff, comentei".
- **Sub-bullets only when they carry something worth remembering**: a decision and its reason, a root cause, a key number, the main files/ADRs produced. At most ~3 per item, one line each.
- **Keep identifiers**: issue keys (FRONTACAI-646), PR numbers, branch or session names, and file paths, in backticks where they're code. They're what the user searches for later.
- **Open items as checkboxes**: `- [ ] Aprovar o PR 1350`. Only real pending actions, not vague "next steps".
- **Leave out** tool mechanics (read files, ran grep), routine test runs unless they revealed something, and assistant-speak ("com sucesso", "de forma robusta").

A typical day is 2–6 bullets. If the block is getting long, merge related items rather than dropping identifiers.

## Step 5: Show the day's block

After saving, print today's block (from its `## YYYY-MM-DD` heading down) in a fenced `markdown` code block so the user can copy it into Notion, followed by one line saying where the file is. Nothing else — no recap of the process.
