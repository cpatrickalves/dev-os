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
~/dev-os/scripts/import-agents.sh [--all] [--overwrite]

# Import curated assets globally into ~/.claude/ (all projects)
~/dev-os/scripts/import-workflows.sh [--all] [--overwrite]
~/dev-os/scripts/import-output-styles.sh [--all] [--overwrite]

# Install/update external plugins (external-plugins.yaml) and skill packages (external-skills.yaml)
~/dev-os/scripts/install-plugins.sh [--all] [--verbose]
~/dev-os/scripts/install-external-skills.sh [--all] [--verbose]

# Report, diff or merge (--apply) upstream changes into third-party skills; works on ~/dev-os itself
~/dev-os/scripts/sync-third-party-skills.sh [--all] [--apply] [--verbose]

# One-time, per-machine: install the skill-usage logging hook into ~/.claude
~/dev-os/scripts/setup-skill-hook.sh
```

## Architecture

The curated asset library lives in root-level folders: `skills/`, `agents/`, `hooks/`, `workflows/`, `output-styles/`. The `import-*` scripts copy them into other projects (or globally). Each skill is a self-contained directory with `SKILL.md` (name + description frontmatter) plus optional `references/`, `scripts/`, `rules/`. There are no separate slash commands: a skill with `disable-model-invocation: true` is the equivalent of a command, invoked only as `/<name>`.

Skills are grouped by activity into four top-level categories: `skills/claude-code/`, `skills/engineering/` (with subcategories such as `build/`, `code-review/`, `documentation/`), `skills/learning/` and `skills/productivity/`. Categories exist only in this source library. Claude Code discovers skills one level deep (`.claude/skills/<name>/SKILL.md`), so `import-skills.sh` finds `SKILL.md` at any depth and flattens each skill to its basename at the destination. Skill names must therefore be unique across all categories.

`.claude/` holds only local session state/config (`settings.json`, `napkin.md`, logs) plus a committed relative symlink `.claude/agents → ../agents`. The curated skills do not auto-load when the Dev-OS repo itself is opened in Claude Code; import them like in any other project.

External assets — Claude plugins and `npx skills` packages that are installed rather than copied — are declared in `external-plugins.yaml` and `external-skills.yaml` at the repo root, the single source for `install-plugins.sh` and `install-external-skills.sh`. The YAML holds data only (name, marketplace, source, scope); the scripts build the commands from those fields. `load_catalog` in `common-functions.sh` parses a restricted YAML subset with `awk` (one top-level list of flat `key: value` maps, no nesting or multi-line values), so there is no `yq` dependency; it rejects unknown keys. To add a plugin or package, add an entry to the YAML, not to the scripts. `plugins/` plus `.claude-plugin/marketplace.json` is Dev-OS's own marketplace (`thermos`), installed through the same catalog.

Third-party skills (see `CONTEXT.md`) are copied, not installed: a skill is third-party when its frontmatter has `metadata.last_synced`, and its `metadata.source` must be a GitHub `tree/<ref>/<dir>` URL or a gist `#file-<name>` URL. `sync-third-party-skills.sh` uses the last upstream commit up to that date as the merge base, so keep `last_synced` accurate when copying by hand.

The skill-usage hook has a single source of truth in `hooks/log-skill.sh`; `setup-skill-hook.sh` copies it into `~/.claude/hooks/` and registers it.

## Conventions

- Kebab-case for all file and directory names.
- Interactive *slash commands* ask one question at a time via the `AskUserQuestion` tool; interactive *scripts* use the shared `select_items` picker instead.
- Skill-usage logging: `setup-skill-hook.sh` registers a `PreToolUse` hook (`~/.claude/hooks/log-skill.sh`) that appends every Skill invocation to the target project's `.claude/skill-usage.log`.
- `.claude/settings.json` holds enabled plugins and permissions; `plansDirectory` is `./.plans`.
