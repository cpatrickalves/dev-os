---
name: setup-automated-checks
description: Set up or audit a project's deterministic checks (lint, format, types, tests, hooks, CI) and the files that feed code review (CODING_STANDARDS.md, AGENTS.md pointers), for Python and TypeScript, new or existing.
argument-hint: "[optional: audit | python | typescript | hooks | ci | standards]"
disable-model-invocation: true
metadata:
  reference: "Matt Pocock, 'Fixing the PR Bottleneck' (AI Engineer Paris 2025): https://ai.engineer/talks/LlgiOCmFG_w-youtube-40c0a903db79223717ca"
---

# Setup Automated Checks

Agents write code faster than people review it. Three layers absorb the difference: deterministic **checks** (lint, format, types, tests), **review agents** that apply the team's standards, and a human who reviews only what cannot be undone. This skill installs the checks and writes the files the review agents read. Checks cost CPU, not tokens or reviewer attention, so stack many of them; some exist only as **lie detectors** that catch a suite going green for the wrong reason (tautological tests, tests that read source text, mocks that cannot fail).

Every rule this skill meets lands in one place:

- **Mechanical** (a banned API, an import shape, a file location, formatting): a check in the **gate**, `make check`. Building the check beats writing the rule.
- **Judgement** (cross-file consistency, naming in context, module depth): `CODING_STANDARDS.md` at the repo root, the name the `code-review` and `retro` skills look for. It holds only what no tool can check.
- `AGENTS.md` / `CLAUDE.md`: **navigation pointers** only. Standards placed there crowd out the implementer, who may or may not read them.

## Scope

`$ARGUMENTS` picks the steps. Step 1 always runs, and `audit` stops after it. A layer name runs Steps 1–2, that layer's step, then Step 7: `python` / `typescript` → Step 3 for that component, `hooks` → Step 4, `ci` → Step 5, `standards` → Step 6. No argument runs every step.

## Step 1: Audit

Run the bundled detector (read-only) and read its report:

```bash
bash <skill base directory>/scripts/audit-checks.sh <project root>
```

Then read `README.md` and `AGENTS.md` / `CLAUDE.md` for two facts the script cannot see: the **documentation language** (every prose file this skill writes uses it, Makefile comments and `AGENTS.md` pointers included) and the **run model** (tools run natively through `uv` / `pnpm`, or everything runs inside Docker Compose).

The catalog:

| Layer | Python | TypeScript | Both |
|---|---|---|---|
| Lint + format | ruff | Biome | `.editorconfig` |
| Types | mypy `strict` | `tsc` strict flags | |
| Tests | pytest + coverage | Vitest + coverage | coverage as a report only |
| Lie detectors | `xfail_strict`, `--strict-markers`, `filterwarnings`, PT rules | `noFocusedTests`, `noSkippedTests`, `passWithNoTests: false` | |
| Hooks | pre-commit framework | Husky + lint-staged (TS-only) or pre-commit (mixed) | fast on commit, the gate on push |
| Entry point | | | `make check` (Makefile) |
| CI | | | GitHub Actions, same targets as `make check` |
| Review files | | | `CODING_STANDARDS.md`, `AGENTS.md` pointers |
| Extras | `references/extra-checks.md` | | actionlint, shellcheck, secrets |

Done when every catalog row is classified, per component, as *present*, *missing*, or *present with a different tool*. With `audit`, present that gap table with a recommendation per row and stop.

## Step 2: Agree on the plan

Show the gap table, then ask one question at a time with `AskUserQuestion`, only where the audit leaves a real choice:

- **Tool conflicts** (ESLint + Prettier vs Biome, black / flake8 / isort vs ruff, Jest vs Vitest, pyright vs mypy): the conflicts table in `references/existing-projects.md` gives the default for each pair and the migration recipe. Offer that default as the recommended option.
- **Extras**: the tier-1 list from `references/extra-checks.md` as a multi-select. A tier-2 entry only when the audit shows its shape (migrations, generated API types, a bundle budget).
- **Standards in `AGENTS.md` / `CLAUDE.md`**: when the audit counts many standard/convention/always/never/must lines there, list the sections you would move to `CODING_STANDARDS.md` and ask which may move. A rule the user keeps on purpose (a guardrail the implementer must see) stays.
- **Commits** (existing projects): commit as you go, with the automatic fixes in their own commit before any manual change so the review of the real work is not buried under reformatting, or leave everything uncommitted for the user.

New projects have no conflicts and nothing to move: offer the extras and install the full default set.

## Step 3: Install the checks per language

Read and apply the reference for each component in scope: `references/python.md`, `references/typescript.md`. Install dev dependencies with the project's own package manager, so the lockfile stays the source of truth for versions.

Run every check once right after configuring it and record the findings count per tool. In a new project every count is zero. In an existing project:

1. Apply the automatic fixes (`ruff check --fix`, `ruff format`, `biome check --write`), committed on their own when the user chose commits in Step 2.
2. Show the remaining counts and ask: fix now, or baseline and ratchet. `references/existing-projects.md` holds the baseline mechanism and the ratchet for each tool.

Done when every canonical command in the language reference exits 0, with each remaining finding fixed or baselined and the before/after counts recorded for the report.

## Step 4: Hooks and the gate

Read `references/hooks-and-makefile.md` and write the hook config and the Makefile targets it lists. The Makefile is the single entry point: hooks and CI call its targets, so what passes locally passes in CI. When a Makefile exists, add the missing targets and keep the working ones.

Done when `make check` runs the canonical commands of every component and `make setup` installs both the pre-commit and the pre-push hook.

## Step 5: CI

Read `references/ci-github-actions.md` and write `.github/workflows/ci.yml`. When the remote is not GitHub, write the equivalent pipeline for that host and record what you could not verify.

Done when actionlint passes on the workflow.

## Step 6: Repository files

- `.editorconfig` from `assets/editorconfig`, when none exists.
- `CODING_STANDARDS.md` from `assets/CODING_STANDARDS.md`, in the documentation language. Resolve every `<!-- adapt -->` comment against the audit, delete the sections that do not apply (no API, no frontend), and delete every rule a check now enforces. When the repo already holds standards nobody reads (`CONTRIBUTING.md`, wiki exports, docs), fold their judgement rules into this file.
- `AGENTS.md` / `CLAUDE.md`: edit whichever exists (create `AGENTS.md` when neither does), add these pointers in the documentation language, and move the sections the user approved in Step 2 to `CODING_STANDARDS.md`:

  ```markdown
  ## Checks
  - `make check` runs every automated check (lint, format, types, tests). Run it before opening a PR; CI runs the same targets.
  - `CODING_STANDARDS.md` holds the coding standards. A review agent applies them; implementation does not need to read it.
  ```

- `README.md`: the setup section tells each contributor to run `make setup`, since hooks live per clone.

Done when `CODING_STANDARDS.md` keeps no HTML comment from the seed and every rule left in it needs judgement.

## Step 7: Verify and report

Run, and paste the relevant output of:

- `make check` (each canonical command when there is no Makefile). It covers actionlint and shellcheck through `lint-infra`.
- `git hook run pre-commit`, which runs the hook the way `git commit` does (it honours `core.hooksPath`, so it proves Husky and pre-commit wiring alike); in pre-commit projects also `uvx pre-commit run --hook-stage pre-push --all-files`.

Commit only what the user approved in Step 2. Finish with the report:

```markdown
## Checks installed
| Check | Tool | Runs on commit | Runs on push | Runs in CI | Findings now |
...
## Baselined (existing projects only)
What was suppressed, where, and the ratchet that stops it from growing.
## Moved from AGENTS.md (only when sections moved)
Which sections went to `CODING_STANDARDS.md`, and which the user kept in place.
## Next steps
- Enable branch protection on `main` requiring the CI jobs, after the first run (checks only appear for selection after that).
- Run `/retro` after agent sessions: it proposes new checks and standards so no review comment is written twice.
- `/create-update-makefile` for the remaining project targets, `/docs-generator` to document the commands.
```
