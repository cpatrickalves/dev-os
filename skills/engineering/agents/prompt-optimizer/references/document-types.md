# What each document type should carry

Per-type guidance for the audit in [`SKILL.md`](../SKILL.md). Read the section for the target's type; the six shifts still apply on top.

## No target named

Map everything the workspace actually loads as context — CLAUDE.md files, skills, rules, memory indexes — and audit that set, excluding generated output, dependency folders, and version-control internals.

## System prompt

Product context: what product the agent operates in and what it is doing there. This is where harness builders spend most of their effort. Tool usage instructions live in each tool's description (shift 4) and task-specific procedures live in skills (shift 3). For Claude Code itself the system prompt is not editable; if the user is auditing one, they are building their own agent harness.

## CLAUDE.md / AGENTS.md

Lightweight: a brief statement of what the repo is for, then spend the remaining tokens on gotchas — the unwritten convention ("types live only in this monolithic file"), the reason behind a choice, the trap no config file confesses. Detailed procedures (how to verify work, how to run a review) become skills referenced from here with a one-line pointer (shift 3). Session or personal facts belong in auto-memory, not here.

## Skills (SKILL.md)

A lightweight guide that lets Claude find information when needed — best when it encodes opinions, knowledge, or practices particular to the user, their team, or their product. Long skills split into a main file plus `references/` files loaded on demand. The `description` frontmatter is an always-loaded pointer: front-load the trigger word, list the distinct cases that should fire it, and cut anything the body already says. With `disable-model-invocation: true` the description is human-facing — a one-line summary, trigger lists stripped.

## Tool and agent descriptions

The description is the single home for how to use the tool (shift 4). The old ~9,100-character TodoWrite description became a two-line summary plus `pending | in_progress | completed` and "only one task in_progress at a time".

## Specs and plan files

Prefer code over prose: a detailed test suite, a function in another codebase to port, an HTML mockup instead of a description or screenshot (shift 6). Rubrics are specs too — written so a verifier agent can apply them to check taste (e.g. what good API design looks like). Plans can live as rich artifacts rather than flat markdown when the structure helps.
