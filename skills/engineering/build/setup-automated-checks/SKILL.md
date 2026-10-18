---
name: setup-automated-checks
description: Set up or audit a project's deterministic checks (lint, format, types, tests, hooks, CI) and the repository files that feed code review (CODING_STANDARDS.md, AGENTS.md pointers) for Python and TypeScript, in new or existing projects.
argument-hint: "[optional: audit | python | typescript | ci | hooks | standards]"
disable-model-invocation: true
metadata:
  reference: "Matt Pocock, 'Fixing the PR Bottleneck' (AI Engineer Paris 2025): https://ai.engineer/talks/LlgiOCmFG_w-youtube-40c0a903db79223717ca
---

# Setup Automated Checks

Agents write code faster than people review it. The fix is **brakes**, in three layers: deterministic **checks** (lint, format, types, tests), an automated **reviewer** that applies the team's standards, and a human who only reviews what cannot be undone. This skill installs the first layer and writes the repository files the other two layers read.

Checks cost CPU, not tokens or reviewer attention, so stack many of them. A green CI still lies (tautological tests, tests that read source text, mocks that cannot fail), so some checks exist only as **lie detectors** for the test suite itself.

Three rules decide where every finding of this skill goes:

- A **mechanical** rule (a banned API, an import shape, a file location, formatting) becomes a check. Building the check beats writing the rule.
- A **judgement** rule (cross-file consistency, naming in context, module depth) goes to `CODING_STANDARDS.md`, which the review agent reads. Rules that tooling already enforces are left out of it.
- `AGENTS.md` / `CLAUDE.md` carries **navigation pointers** only. Standards placed there crowd out the implementer, who may or may not read them.

The `CODING_STANDARDS.md` name matters: the `code-review`, `retro` and `code-review-flow` skills look for it at the repo root.

## Step 1: Audit

Run the bundled detector (read-only) against the project root and read its report:

```bash
bash <skill base directory>/scripts/audit-checks.sh <project root>
```

It lists components (Python / TypeScript, and where), package managers, every known tool config, hooks, CI workflows, repository files and the tools available on this machine. Then read `README.md` and `AGENTS.md` / `CLAUDE.md` for two facts the script cannot see: the **documentation language** (every generated prose file follows it) and the **run model** (tools run natively through `uv` / `pnpm`, or everything runs inside Docker Compose).

Done when you can classify every item of the catalog below as *present*, *missing*, or *present with a different tool*:

| Layer | Python | TypeScript | Both |
|---|---|---|---|
| Lint + format | ruff | Biome | `.editorconfig` |
| Types | mypy `strict` | `tsc` strict flags | |
| Tests | pytest + coverage | Vitest + coverage | coverage reported, never a gate |
| Lie detectors | `xfail_strict`, `--strict-markers`, `filterwarnings`, PT rules | `noFocusedTests`, `noSkippedTests`, `passWithNoTests: false` | |
| Hooks | pre-commit framework | Husky + lint-staged (TS-only) or pre-commit (mixed) | fast on commit, full on push |
| Entry point | | | `make check` (Makefile) |
| CI | | | GitHub Actions, same commands as `make check` |
| Review files | | | `CODING_STANDARDS.md`, `AGENTS.md` pointers |
| Extras | see `references/extra-checks.md` | | actionlint, shellcheck, secrets |

When `$ARGUMENTS` is `audit`, stop here and present the gap table with a recommendation per row.

## Step 2: Agree on the plan

Show the gap table and ask one question at a time with `AskUserQuestion`, only where the audit leaves a real choice:

- **Tool conflicts** (ESLint + Prettier where Biome is proposed, black / flake8 / isort where ruff is proposed, Jest where Vitest is proposed, pyright where mypy is proposed). Default in an existing project: keep a working tool that already gates the same thing, and tighten its config. Migrate only when the user picks it; `references/existing-projects.md` has the migration recipes.
- **Extras**: offer the tier-1 list from `references/extra-checks.md` as a multi-select. Tier 2 only when the project's shape calls for it (migrations, generated API types, a bundle budget).
- **Strictness in an existing codebase**: fix now, or baseline and ratchet. Decide after measuring (Step 3 records the counts).

New projects skip most of this: install the full default set.

## Step 3: Install the checks per language

Read the reference for each component present and apply it: `references/python.md`, `references/typescript.md`. Each one gives the install command, the config block, the canonical commands and the rules worth the noise they make.

Install dev dependencies with the project's own package manager, so lockfiles stay the source of truth for versions. Generate a config with the tool when it offers it (`biome init`, `tsc --init`) and edit the result, instead of pasting a config written for another version.

Run every check once right after configuring it and write down the count of findings per tool. In a new project every count is zero. In an existing project the counts drive the next decision: apply the automatic fixes (`ruff check --fix`, `ruff format`, `biome check --write`) in their own commit, then follow `references/existing-projects.md` for what remains.

Done when each canonical command runs and its exit status is understood (green, or red with a counted, baselined reason).

## Step 4: Hooks and the Makefile entry point

Read `references/hooks-and-makefile.md`. Hooks split by speed: staged-file lint and format on **pre-commit**, the full `make check` on **pre-push**. A slow pre-commit gets bypassed with `--no-verify`, and a bypassed hook protects nothing.

The Makefile is the single entry point: `check` (the gate), `lint`, `format`, `typecheck`, `test`, `lint-infra`, `setup` (installs dependencies and hooks). CI calls the same targets, so what passes locally passes in CI. Follow the self-documenting format of the `/create-update-makefile` skill; when a Makefile already exists, add the missing targets and keep the working ones.

Hooks are per clone, so `make setup` installs them and the README says so. CI remains the real gate.

## Step 5: CI

Read `references/ci-github-actions.md` and write `.github/workflows/ci.yml`: one job per component plus an `infra` job, running on every PR and on pushes to the default branch. The reference carries the pitfalls that cost real debugging time (`shell: bash` for `pipefail`, concurrency that never cancels on `main`, pinned action versions resolved with `gh`, coverage in the job summary).

Validate the workflow with actionlint before committing it. When the remote is not GitHub, write the equivalent pipeline for the host and say what you could not verify.

## Step 6: Repository files

- `.editorconfig` from `assets/editorconfig` (skip when one exists).
- `CODING_STANDARDS.md` from `assets/CODING_STANDARDS.md`, translated to the documentation language. Resolve every `<!-- adapt -->` comment against what you learned in the audit; delete sections that do not apply (no API, no frontend) and any rule a check now enforces. When the repo already has standards nobody reads (`CONTRIBUTING.md`, wiki exports, docs), fold the judgement rules into this file instead of writing new ones.
- `AGENTS.md` / `CLAUDE.md`: edit whichever exists (create `AGENTS.md` when neither does) and add pointers only:

  ```markdown
  ## Checks
  - `make check` runs every automated check (lint, format, types, tests). Run it before opening a PR; CI runs the same targets.
  - `CODING_STANDARDS.md` holds the coding standards. The review agent applies them; implementation does not need to read it.
  ```

  If the file already holds detailed standards, move them to `CODING_STANDARDS.md` and leave the pointer. Tell the user what moved.

## Step 7: Verify and report

Run, and paste the relevant output of:

- `make check` (or each canonical command when there is no Makefile).
- `uvx pre-commit run --all-files` or `pnpm exec lint-staged`, plus one real commit on a scratch branch, to prove the hooks fire.
- actionlint on the workflow.

Do not commit unless the user asked. Finish with a report:

```markdown
## Checks installed
| Check | Tool | Runs on commit | Runs on push | Runs in CI | Findings now |
...
## Baselined (existing projects only)
What was suppressed, where, and the ratchet that stops it from growing.
## Next steps
- Enable branch protection on `main` requiring the CI jobs, after the first run (checks only appear for selection after that).
- Run `/retro` after agent sessions: it proposes new checks and standards so no review comment is written twice.
- `/create-update-makefile` for the remaining project targets, `/docs-generator` to document the commands.
```
