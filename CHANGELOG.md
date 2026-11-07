# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `usage-meter` and `next-steps` mods (`plugins/usage-meter`,
  `plugins/next-steps`, in `external-mods.yaml`), both from
  [hamzafer/claude-code-mods](https://github.com/hamzafer/claude-code-mods)
  at commit `7e60143` (MIT, `LICENSE` kept in each folder). `next-steps` is an
  unchanged copy of 0.3.0: after each turn, 2 or 3 likely next prompts above
  the prompt, drafted with `1` to `3` and dismissed with `0`. `usage-meter` is
  a restyled fork of 0.1.1: instead of block bars and the session's cost it
  draws a row of pills in the Tokyo Night colors of `nightgrid`, `Model`, `Ctx Used`, `Session` (the 5-hour
  window, amber from 75% and red from 90%) and `Reset` (its countdown); the 7-day
  window joins only once it runs high. The readings, the toasts past 90% and
  the band order are upstream's. From 0.3.0 the row sits under the prompt, in
  the footer where a status line would, and `position: above` puts it back in
  the band over the prompt, two empty rows below the transcript. From 0.4.0
  the pills are flat, side by side and tinted, to match herdr's straight
  lines: each pill's text is its color, over that color at 25% on the theme's
  background, and an empty row parts them from the footer's hint line. Its
  `caps: round` option adds powerline pill ends (they need a Nerd Font). From
  0.5.0 the model pill carries the effort, `Model: Opus 5.5 (medium)`: the
  level the main loop's last model request asked for, read from `turn.step`,
  so it shows from the session's first message and follows `/effort` at the
  next one.
- `quiet-edits` mod (`plugins/quiet-edits`, in `external-mods.yaml`): in the
  terminal, the diff under an `Edit`, `MultiEdit` or `Write` row is folded away
  while the row is closed, and the `skins` mod's `▸` on the row opens it. A
  failed edit and the full transcript (ctrl+o) still show everything. It
  depends on `skins@hellosverre-mods` and leaves the diff alone while `skins`
  is missing or off; `marketplace.json` allows that cross-marketplace
  dependency. From 0.2.0 it folds the output under a `Bash` or `PowerShell`
  row the same way: `skins` already hides the output of a command it can tell
  only reads, and shows a card for every other one (`SP=/tmp/x; git diff
  --stat` has an assignment). A command that failed, was interrupted, timed
  out or went to the background keeps its result.
- `configs/claude-skins` and `scripts/import-skins.sh`: the skins made for the
  `skins` Claude Code mod and the mod's settings, versioned and merged into the
  mod's store on each machine (`--overwrite` replaces a skin that differs,
  `--no-prefs` keeps the machine's settings). First skin: `nightgrid`,
  `tokyo-night` with the secondary text and table zebra of the
  `herdr/nightgrid` theme. `check.sh` validates the folder with the rules the
  mod applies to its store. `configs/README.md` explains the folder.
- `herdr/nightgrid`: a Herdr app layout (herdr-van with a Files / Changes /
  Notes side panel, a transparent status bar and Settings + Add machine in the
  sidebar footer), with copy-based install and sync-from-live scripts for
  macOS/Linux and Windows. `herdr/README.md` explains the folder.
- `scripts/check.sh` and a `.githooks/pre-commit` hook that runs it: validates
  the three YAML catalogs with the install scripts' schema, compiles
  `workflows/*.js`, and runs `bash -n` on the scripts. Enable the hook per clone
  with `git config core.hooksPath .githooks`.
- `setup-automated-checks` skill (`engineering/build/`): sets up or audits a
  project's deterministic checks (ruff, mypy, pytest; Biome, tsc, Vitest; hooks,
  Makefile `check`, GitHub Actions) and the files the review layer reads
  (`CODING_STANDARDS.md`, `AGENTS.md` pointers),
  for new and existing Python/TypeScript projects. Based on Matt Pocock's
  "Fixing the PR Bottleneck" talk; ships an `audit-checks.sh` detector.
- `manage-mods.sh` and the `external-mods.yaml` catalog: install/update or
  uninstall Claude Code mods. Entries: `savvy-progress`, `filetree`, `reflect-mod`, `skins` and the
  builtin `cc-plugin-you-should-know` (builtin mods are enabled/disabled, not installed).
- `tlc-skills` entry in `external-skills.yaml`: seven Tech Leads Club skills
  (`tlc-spec-lean`, `tlc-discover`, `technical-design-doc-creator`,
  `security-threat-model`, `the-fool`, `the-judge`, `demo`), installed globally
  for Claude Code only.
- `tlc-playwright` entry in `external-skills.yaml`: the Tech Leads Club
  `playwright-skill`, installed per project.
- `show-me` skill (`learning/`): a third-party copy of the HumanLayer skill,
  installed globally and kept current with `sync-third-party-skills.sh`.
- `grill-with-ui` skill (`productivity/`): a third-party copy of Jason Ku's
  skill that runs a grilling interview on a local browser page (plain Node, no
  dependencies), installed globally. Only the runtime files are copied; kept current with
  `sync-third-party-skills.sh`. Adapted to review documents: it takes one or
  more plans, docs or issues, writes `.grills/<slug>-grill.md`, applies the
  decisions back to the reviewed documents (asking before rewriting an issue or
  PR), and writes the ADRs you pick. Brought closer to Matt Pocock's
  `grill-with-docs`: it asks the whole frontier per round, sends fact lookups
  to background subagents, writes terms to `GLOSSARY.md` as they settle, and
  probes edge cases and claims against the code (through `domain-modeling`).
- `tlc-dev-flow` workflow: implements an approved `tlc-plan` plan end to end.
  `tlc-implement` builds it, the PR is reviewed by `code-review-flow` with the
  plan, `tlc-implement` applies the accepted findings, and the docs are
  audited. `code-review-flow` takes `plan: "auto"` to find the feature plan in
  `.specs/features/*/plan.md` by the issue ID.
- `sync-third-party-skills.sh`: reports which third-party skills have upstream
  changes since `metadata.last_synced`, shows the upstream diff, and with
  `--apply` merges it in (three-way, per file) and bumps `last_synced`.
- `create-update-user-manual` skill (`engineering/documentation/`), installed
  globally: creates or updates a product's user manual, with chapters by user
  journey, screenshots regenerated by one command, an `audit_manual.mjs` checker
  for links and images, a mirrored manual test script and, when it makes sense,
  the manual rendered inside the application.

### Changed

- `tlc-skills` in `external-skills.yaml` installs `tlc-plan` and
  `tlc-implement` in place of `tlc-spec-lean`. `code-review-flow` now
  describes the plan as a `tlc-plan` plan, with its
  `Surface` and `Differences from the source` sections. For a plan in
  `.../features/<feature>/plan.md`, the reviewers and the Final Review also
  read the `**Settled mid-build:**` line of the `checks.md` beside it and the
  `AD-NNN` decisions in `.specs/STATE.md`. Before, a change the user settled
  during the build was reported as a divergence from the plan.
- `grill-with-ui` serves from a fixed port range (`GRILL_PORTS`, default
  `4700-4704`) before falling back to a random port, so a remote machine needs
  one SSH forward set up once instead of a new one per grill.
  `GRILL_PORTS=0` restores the random port. Setup guide in
  `docs/grill-with-ui-remote.md`.

- `code-review-flow`: the Setup now hands every reviewer the same detached
  worktree at the PR's head, the repository's coding standards
  (`AGENTS.md`/`CLAUDE.md`, `CODING_STANDARDS.md` and the docs they point to),
  the CI result on that commit and the related issues' title, status and
  description. A broken written rule is a finding for every reviewer and a
  valid verdict in the Final Review; the-judge reuses the CI result and only
  runs the checks CI does not cover, in its own worktree; each reviewer keeps
  its scratch files in `/tmp/pr-<n>/<reviewer>/`. Metadata and CI status are
  read from GitHub, GitLab or Azure DevOps (or the host's equivalent CLI/API),
  and GitLab merge request URLs set the report suffix. On PR #22 of
  setur-observatorio-turismo only one of four reviewers had read the coding
  standards, four reviewers made four copies of the repository, and the-judge
  rebuilt the stack to repeat checks CI had already passed.
- `README.md`: the mods table lists the eight mods of `external-mods.yaml`
  again; it still showed only `savvy-progress`, which the catalog no longer has.
- `herdr/nightgrid`: the status bar shows the focused terminal's folder (its
  last 3 segments) between the machine and the branch, and terminal text sits
  60px from the pane's side borders instead of 5px, and 30px from its top and
  bottom instead of 2px. `herdr/README.md` notes
  how to reach the Windows Herdr home and run the sync script from WSL.
- `grill-with-ui`: page restyled with the cpatrickalves.com visual identity (Gelo
  palette, square plates, Outfit and Martian Mono served locally from
  `fonts/`). Also fixes the sideways scroll at 390px.
- Catalog schemas moved into `load_plugins_catalog`, `load_skills_catalog` and
  `load_mods_catalog` (`common-functions.sh`), shared by the install scripts and
  `check.sh`.
- `dev-flow` and the README no longer state how many
  reviewers `code-review-flow` runs; only its own `meta` does.
- `code-review-flow` workflow (and so `dev-flow`):
  `the-judge` joins as a 4th reviewer, in report-only mode. The Setup already
  resolves the PR (GitHub or Azure DevOps), so the reviewer skips the skill's
  `gh` steps (fetching and posting the review), runs the repo checks in a
  temporary worktree at the PR head, and writes its findings to the report.
- `code-review-flow` workflow: the Setup finds the PR's issue, detects the
  project's tracker (Linear, Plane, GitHub Issues, Jira, Azure Boards), and saves
  the issue with all its comments once; every reviewer and the Final Review read
  it. It now takes `args: {pr, issue, plan, called_by}`, where `issue` pins the
  issue, `plan` is a plan path or `"auto"`, and `called_by` names the calling
  workflow in the reviewer evaluation.
- `dev-flow` workflow: its Code Review runs `code-review-flow` as a sub-workflow
  instead of a copy of it. PR Fixes applies the findings that the Final Review
  marked valid, and the reviewer evaluation comes from `code-review-flow`.
- Third-party skill `metadata.source` values normalized to GitHub `tree/` URLs
  or gist `#file-` URLs. `ai-agent-security-analysis` and `claude-security-review`
  now cite their inspiration in `metadata.reference` and are no longer synced.
- `pr-review-to-subtasks` now installs globally into `~/.claude/skills/`.
- `code-review-flow` workflow: a new Setup step resolves the PR once (branches,
  base/head/merge-base SHAs, saved diff) and every reviewer reviews that exact
  commit. Final Review checks whether the PR moved and judges findings against
  the new head when it did.
- `pr-security-review` renamed to `claude-security-review`, since its rubric
  comes from Claude Code's bundled `/security-review`. In `code-review-flow`
  and `dev-flow` the reviewer keys for the Claude-derived reviewers are now
  `claude-code-review` and `claude-security-review`.

### Removed

- `claude-security-review` reviewer from `code-review-flow` (and so from
  `dev-flow`), which now run 4 reviewers. Across 22
  reviewed PRs it found no accepted issue that another reviewer had not also
  found.
- `claude-security-review` skill: it was no longer used by any workflow and
  proved ineffective on its own.
- `frontend-code-review` skill and the `frontend-code-reviewer` agent that
  required it: neither was used.
- `/pr-review-workflow` skill: `code-review-flow` already reviews the PR and
  writes the report that `/pr-review-to-subtasks` takes.
- `html-it` skill. `code-review-flow` now renders the final review's HTML
  version with `html-anything`.
- `ce-code-review` skill, and with it the `ce-code-review` reviewer from
  `code-review-flow` (and so from `dev-flow`), which now run 3 reviewers.
- `compound-engineering` plugin from `external-plugins.yaml`, and the
  `ce-code-simplicity-reviewer` agent copied from it.

## [1.0.0] - 2026-10-06

First versioned release. Dev-OS started as a fork of Agent OS and has since
become a personal library of Claude Code assets; this entry summarizes its
state at that point instead of reconstructing the history.

### Added

- Skill library in `skills/` with 50 skills, grouped by activity into
  `claude-code/`, `engineering/` (agents, architecture, build, code-review,
  documentation, git, integrations), `learning/` and `productivity/`.
- `import-skills.sh` with a keyboard picker that lists skills under
  category headers, flattens the categorized tree into `.claude/skills/<name>/`,
  and always installs the skills in `GLOBAL_SKILLS` into `~/.claude/skills/`.
- Sub-agents in `agents/`, imported per project with `import-agents.sh`.
- Multi-agent workflows `dev-flow` and `code-review-flow`, with five reviewers
  and a reviewer effectiveness report, installed globally with
  `import-workflows.sh`.
- Output styles `ELI5` and `Escrita Técnica Clara`, installed globally with
  `import-output-styles.sh`.
- Skill-usage logging hook (`hooks/log-skill.sh`), registered once per machine
  with `setup-skill-hook.sh`.
- Self-hosted plugin marketplace (`.claude-plugin/marketplace.json`) with the
  `thermos` branch-review plugin.
- External catalogs `external-plugins.yaml` and `external-skills.yaml`, read by
  `install-plugins.sh` and the new `install-external-skills.sh`. Both scripts
  update installed entries and fall back to installing the missing ones.
- `CLAUDE.md` and `CONTEXT.md` (domain glossary).

### Changed

- Slash commands became skills with `disable-model-invocation: true`, invoked
  only as `/<name>`.
- Curated assets moved from `.claude/` to root-level folders (`skills/`,
  `agents/`, `hooks/`, `workflows/`, `output-styles/`).
- The project was renamed from `agent-os` to `dev-os`.

### Removed

- The Agent OS standards framework (profiles, standards, `config.yml`,
  `project-install.sh`, `sync-to-profile.sh`) and its changelog.
- The `commands/` folder and `import-commands.sh`.
- `skills-lock.json`.

### Fixed

- `thermos` was installed with the invalid `--scope global`; it now uses
  `user`.

[Unreleased]: https://github.com/cpatrickalves/dev-os/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/cpatrickalves/dev-os/releases/tag/v1.0.0
