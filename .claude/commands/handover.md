---
name: handover
description: Use when the user asks to create a handover, session handover, or context dump to pass to a fresh Claude session. Triggers on "handover", "session handover", "context dump for another session", or when the current context is getting too long and the user wants to continue elsewhere. Generates a structured summary and saves it to a timestamped file under `.claude/handovers/` so the user can paste it into a fresh session.
source: Adapted from https://gist.github.com/vedovelli/6200225227eb0f801517ebd52e825788
---

# Handover

Produces a complete, self-contained handover document for a fresh Claude session to pick up exactly where the current one left off. The output is written to a timestamped markdown file under `.claude/handovers/` in the current project so the user can open it, paste it into a fresh Claude window, and keep a durable record of past handovers.

## Why this matters

A handover is not a changelog. A changelog tells you what changed; a handover tells you **what is about to happen next and why the next session can act immediately**. A fresh session has zero memory of this conversation — no prior messages, no tool results, no partial reasoning. Whatever you do not explicitly hand over is lost. The quality bar is: someone who never saw this conversation should be able to read the handover and start productive work in the very first turn, without asking clarifying questions.

Favor specificity over brevity. File paths, line numbers, exact commit hashes, exact error messages, and literal command invocations belong in the handover. Vague phrases like "fix the auth bug" or "the usual deploy flow" are worse than useless because they create false confidence. If the next session will need to run a specific command because another one silently fails after a particular sequence, say exactly that.

## Structure

Write the handover as a single markdown document with the sections below, in this order. Skip a section only if it is genuinely empty — do not pad. The target length is whatever the context actually requires: a small task might need 300 words, a multi-layer debugging saga with three hotfixes might need 3000. Do not artificially compress.

```markdown
# Handover Summary — [one-line subject of current work]

## Where we are
Two or three sentences: what is the goal, what state are we in right now, what is the immediate next action. This is the TL;DR — if someone only reads this paragraph they should know whether they can jump in or need to read more.

## What was done in this session
Chronological or logical summary of the work already completed. Include:
- Commits made (with hashes and one-line summaries)
- Files touched and the nature of the change
- Decisions reached and the reasoning
- Dead ends explored and ruled out (so the next session does not re-walk them)
- Validation performed (tests run, smoke tests, deploys verified)

## Current blocker or next step
If there is an active blocker, describe it precisely: the symptom, the diagnosis so far, the hypothesis, and what would prove or disprove it. If work is unblocked and simply needs continuation, describe the next concrete action in enough detail that the next session can execute without re-planning.

## Technical context the next session needs
Anything non-obvious the fresh session cannot derive by reading files:
- Environment quirks (e.g. "service X reload fails after git pull, restart the container instead")
- Gotchas discovered (e.g. "client Y needs a real HTTP 401, not a JSON-RPC error")
- Why the current approach was chosen over alternatives that look equivalent
- Memory/CLAUDE.md rules that are load-bearing for the decision
- Relevant file paths with line numbers where something specific lives

## Plan for the next session
Concrete sequence of steps. Not "refactor the auth layer" but "1. Read src/server.py:LINE-LINE. 2. Add OAuthChallengeMiddleware class. 3. Run `pytest tests/unit/test_auth.py -x`. 4. Commit with message format matching <hash>." The next session should not need to decide anything already decided in this session.

## State of the repo
- Working dir (absolute path)
- Current branch and whether it is clean
- HEAD commit hash and one-line summary
- Unpushed commits or uncommitted changes if any
- Production state if relevant (deploy green/red, last verified commit)

## References
Links that will be useful:
- Issue and PR numbers
- Relevant notes / docs (by title, since the fresh session can find them)
- Log file paths or telemetry dashboards to check
- Previous handovers in this saga, if any

## First action recommended for the next session
One paragraph explicitly telling the next session what to do in its very first turn. This is a hand-off, not a puzzle. Example: "Read this handover. Then read src/server.py:LINE-LINE to see the current build_http_app structure. The blocker is X. Implement Y as described in the plan section. Do NOT refactor Z — that path was explored and ruled out because W."
```

## Writing principles

**Write for the fresh session, not for the user.** The user will probably skim the handover once to sanity-check it; the fresh Claude session is the actual reader. Address it as a colleague who just walked into the room. Explain what you are trying to accomplish and why, not just what button to push.

**Convert relative time to absolute.** "Earlier today" means nothing in a new session. Write "at 17:29 UTC" or "commit <hash> (the second of three)". Same for "the user just said" — quote the exact instruction.

**Include failure paths.** If you tried something and it did not work, say so, with the reason. A handover that only lists successes forces the next session to re-explore the same dead ends.

**Quote exact errors and commands.** If a log line matters, paste it verbatim in a code block. If a curl command is the smoke test, paste the full command. Paraphrasing loses the detail that made debugging possible.

**Name the load-bearing memories.** If a memory file or CLAUDE.md rule is shaping the approach, name it. The fresh session has access to the same memory store but will not know which rules apply to this specific task without being told.

**End with a concrete first action.** The very last thing the fresh session reads should be an unambiguous instruction for turn 1. No "good luck" — a directive.

## Delivery: save to file

After writing the handover to your response, also save it to a timestamped markdown file under `.claude/handovers/` in the current project. Use a single Bash heredoc so the full markdown — including backticks and quotes — round-trips safely:

```bash
mkdir -p .claude/handovers && cat > ".claude/handovers/handover-$(date +%Y-%m-%d-%H%M%S).md" <<'HANDOVER_EOF'
# Handover Summary — [subject]

[full handover content here]
HANDOVER_EOF
```

Use the literal sentinel `HANDOVER_EOF` with single quotes around it on the opening line — that prevents the shell from interpolating anything inside the document. The `mkdir -p` is idempotent and ensures the directory exists on the first run.

The filename pattern is `handover-YYYY-MM-DD-HHMMSS.md`, so handovers sort chronologically and never collide. Keep this directory out of version control if the project does not already ignore `.claude/` — handovers are session artifacts, not source.

## Confirming the delivery

After the Bash command runs, tell the user the absolute path of the file that was written, plus a one-line size hint (N words / M sections) so they know what they are about to open. Do not re-print the full handover after the Bash call — it is already visible in your response above the tool call and saved to disk. Keep the confirmation line short, e.g.:

> Handover saved to `/abs/path/.claude/handovers/handover-2026-05-01-142355.md` (1240 words, 8 sections).

### Ready-to-paste prompt for the next session

Right after the confirmation line, output a fenced code block containing a copy-paste-ready prompt the user can drop into a fresh Claude session. The prompt must reference the **absolute path** of the saved handover, instruct the new session to read it first, and tell it to execute the "First action recommended for the next session" section without re-planning. Example:

````
```
Read the handover at /abs/path/.claude/handovers/handover-2026-05-01-142355.md in full, then execute the "First action recommended for the next session" section. Do not re-plan work that was already decided — the handover is the source of truth. Ask only if something in the handover is ambiguous or contradicted by the current repo state.
```
````

Use the real absolute path (not a placeholder). Keep the prompt as a single short paragraph inside one code block so it round-trips cleanly through copy and paste. Do not add commentary inside the code block — only the prompt text.

## Example outcome

A good handover enables this exchange in the fresh session:

> User: [pastes the ready-to-paste prompt referencing the saved handover path]
>
> Claude: [reads the handover file, runs the first concrete action from the plan section without asking any clarifying questions]

If the fresh session has to ask "what were you working on?" or "which file?" or "did you already try X?", the handover failed. Iterate on the template or add more detail next time.