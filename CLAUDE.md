# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Dev-OS

Dev-OS is a personal development operating system: a curated, version-controlled repository of Claude Code skills, slash commands, sub-agents, hooks, workflows, output styles, and plugins. It is cloned into `~/dev-os` and acts as the single source of truth; its `scripts/` install assets into other projects' `.claude/` directories or globally into `~/.claude/`.

There are no build, test, or lint commands — this is bash scripts plus markdown.

See `CONTEXT.md` for the domain glossary (curated asset, per-project import, global import).

## Scripts

All scripts live in `scripts/`, `source common-functions.sh`, and follow the same shape: `SCRIPT_DIR`/`BASE_DIR` locate the Dev-OS clone, `PROJECT_DIR` is `$(pwd)`. You run them from inside a *target* project; they read from `~/dev-os` and write into the target's `.claude/` (per-project) or into `~/.claude/` (global). Source/dest paths are hardcoded to `$HOME/dev-os`, so the clone must live at `~/dev-os`.

```bash
# Import curated assets into the current project (interactive picker; --all to skip it)
~/dev-os/scripts/import-skills.sh [--all] [--overwrite]
~/dev-os/scripts/import-commands.sh [--all] [--overwrite]
~/dev-os/scripts/import-agents.sh [--all] [--overwrite]

# Import curated assets globally into ~/.claude/ (all projects)
~/dev-os/scripts/import-workflows.sh [--all] [--overwrite]
~/dev-os/scripts/import-output-styles.sh [--all] [--overwrite]

# Install/update Claude plugins from the curated catalog
~/dev-os/scripts/install-plugins.sh

# One-time, per-machine: install the skill-usage logging hook into ~/.claude
~/dev-os/scripts/setup-skill-hook.sh
```

## Architecture

The curated asset library lives in root-level folders: `skills/`, `commands/`, `agents/`, `hooks/`, `workflows/`, `output-styles/`. The `import-*` scripts copy them into other projects (or globally). Each skill is a self-contained directory with `SKILL.md` (name + description frontmatter) plus optional `references/`, `scripts/`, `rules/`.

`.claude/` holds only local session state/config (`settings.json`, `napkin.md`, logs) plus committed relative symlinks (`.claude/skills → ../skills`, `.claude/commands → ../commands`, `.claude/agents → ../agents`) so the curated assets auto-load when the Dev-OS repo itself is opened in Claude Code.

The skill-usage hook has a single source of truth in `hooks/log-skill.sh`; `setup-skill-hook.sh` copies it into `~/.claude/hooks/` and registers it.

## Conventions

- Kebab-case for all file and directory names.
- Interactive *slash commands* ask one question at a time via the `AskUserQuestion` tool; interactive *scripts* use the shared `select_items` picker instead.
- Skill-usage logging: `setup-skill-hook.sh` registers a `PreToolUse` hook (`~/.claude/hooks/log-skill.sh`) that appends every Skill invocation to the target project's `.claude/skill-usage.log`.
- `.claude/settings.json` holds enabled plugins and permissions; `plansDirectory` is `./.plans`.
