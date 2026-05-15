# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Dev-OS

Dev-OS is a personal development operating system: a curated, version-controlled repository of Claude Code skills, slash commands, sub-agents, plugins, and a lightweight coding-standards framework (profiles + standards). It is cloned into `~/dev-os` and acts as the single source of truth; its `scripts/` install assets into other projects' `.claude/` directories.

There are no build, test, or lint commands — this is bash scripts plus markdown.

## Scripts

All scripts live in `scripts/`, `source common-functions.sh`, and follow the same shape: `SCRIPT_DIR`/`BASE_DIR` locate the Dev-OS clone, `PROJECT_DIR` is `$(pwd)`. You run them from inside a *target* project; they read from `~/dev-os` and write into the target's `.claude/` (or `agent-os/`). Source/dest paths are hardcoded to `$HOME/dev-os`, so the clone must live at `~/dev-os`.

```bash
# Install standards + commands into the current project (profile-driven)
~/dev-os/scripts/project-install.sh --profile python
~/dev-os/scripts/project-install.sh --commands-only   # update commands, keep standards

# Import curated assets into the current project (interactive picker; --all to skip it)
~/dev-os/scripts/import-skills.sh [--all] [--overwrite]
~/dev-os/scripts/import-commands.sh [--all] [--overwrite]
~/dev-os/scripts/import-agents.sh [--all] [--overwrite]

# Install/update Claude plugins from the curated catalog
~/dev-os/scripts/install-plugins.sh

# Push project standards back into a base profile (backs up to .backups/<ts>/)
~/dev-os/scripts/sync-to-profile.sh --profile python [--all] [--overwrite]

# One-time, per-machine: install the skill-usage logging hook into ~/.claude
~/dev-os/scripts/setup-skill-hook.sh
```

## Architecture

### Two halves of the repo

1. **Curated asset library** — `.claude/skills/`, `.claude/commands/`, `.claude/agents/`. Loaded automatically when this repo is opened in Claude Code; copied into other projects by the `import-*` scripts. Each skill is a self-contained directory with `SKILL.md` (name + description frontmatter) plus optional `references/`, `scripts/`, `rules/`.
2. **Standards framework** — `profiles/` + `commands/dev-os/`. Profiles are reusable standards sets with file-level inheritance (`config.yml` → `profiles:` `inherits_from`). `project-install.sh` walks the inheritance chain base-first (child overrides parent), copies `.md` standards into the target's `agent-os/standards/`, and regenerates `index.yml`. Note: `profiles/` may be empty in the current tree even though the scripts still reference it — verify a profile exists before assuming it.


## Conventions

- Kebab-case for all file and directory names.
- Interactive *slash commands* ask one question at a time via the `AskUserQuestion` tool; interactive *scripts* use the shared `select_items` picker instead.
- Standards files are injected into context windows — optimize for tokens: lead with the rule, code over prose, bullets over paragraphs, one concept per file, skip what the code already makes obvious.
- Skill-usage logging: `setup-skill-hook.sh` registers a `PreToolUse` hook (`~/.claude/hooks/log-skill.sh`) that appends every Skill invocation to the target project's `.claude/skill-usage.log`.
- `.claude/settings.json` holds enabled plugins and permissions; `plansDirectory` is `./.plans`.
