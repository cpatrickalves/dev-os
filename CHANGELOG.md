# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `setup-automated-checks` skill (`engineering/build/`): sets up or audits a
  project's deterministic checks (ruff, mypy, pytest; Biome, tsc, Vitest; hooks,
  Makefile `check`, GitHub Actions) and the files the review layer reads
  (`CODING_STANDARDS.md`, `AGENTS.md` pointers),
  for new and existing Python/TypeScript projects. Based on Matt Pocock's
  "Fixing the PR Bottleneck" talk; ships an `audit-checks.sh` detector.
- `manage-mods.sh` and the `external-mods.yaml` catalog: install/update or
  uninstall Claude Code mods. Entries: `savvy-progress`, `filetree`, `reflect-mod`, `skins` and the
  builtin `cc-plugin-you-should-know` (builtin mods are enabled/disabled, not installed).
- `tlc-skills` entry in `external-skills.yaml`: six Tech Leads Club skills
  (`tlc-spec-lean`, `tlc-discover`, `technical-design-doc-creator`,
  `security-threat-model`, `the-fool`, `the-judge`), installed globally for
  Claude Code only.
- `tlc-playwright` entry in `external-skills.yaml`: the Tech Leads Club
  `playwright-skill`, installed per project.
- `show-me` skill (`learning/`): a third-party copy of the HumanLayer skill,
  installed globally and kept current with `sync-third-party-skills.sh`.
- `tlc-code-review-flow` workflow: a shortcut for `code-review-flow` on
  `tlc-spec-lean` PRs. It takes `args: {pr, plan, issue}`; without `plan`, the
  Setup finds the feature plan in `.specs/features/*/plan.md` by the issue ID.
- `sync-third-party-skills.sh`: reports which third-party skills have upstream
  changes since `metadata.last_synced`, shows the upstream diff, and with
  `--apply` merges it in (three-way, per file) and bumps `last_synced`.

### Changed

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
  `dev-flow` and `tlc-code-review-flow`), which now run 4 reviewers. Across 22
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
  `code-review-flow` (and so from `dev-flow` and `tlc-code-review-flow`), which
  now run 3 reviewers.
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
