# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `manage-mods.sh` and the `external-mods.yaml` catalog: install/update or
  uninstall Claude Code mods. Entries: `savvy-progress`, `filetree` and the builtin
  `cc-plugin-you-should-know` (builtin mods are enabled/disabled, not installed).
- `sync-third-party-skills.sh`: reports which third-party skills have upstream
  changes since `metadata.last_synced`, shows the upstream diff, and with
  `--apply` merges it in (three-way, per file) and bumps `last_synced`.

### Changed

- Third-party skill `metadata.source` values normalized to GitHub `tree/` URLs
  or gist `#file-` URLs. `ai-agent-security-analysis` and `pr-security-review`
  now cite their inspiration in `metadata.reference` and are no longer synced.

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
