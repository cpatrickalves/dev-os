# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Dev-OS

Dev-OS is a personal development operating system: a curated, version-controlled repository of Claude Code skills, slash commands, sub-agents, hooks, workflows, output styles, and plugins. It is cloned into `~/dev-os` and acts as the single source of truth; its `scripts/` install assets into other projects' `.claude/` directories or globally into `~/.claude/`.

Run `scripts/check.sh` after changing a catalog, a workflow, a file in `configs/`, a skill, a script or a mod: it validates the YAML catalogs, compiles `workflows/*.js`, validates `configs/claude-skins`, checks every skill's `metadata.version`, runs `bash -n`, and validates, tests and type-checks the mods in `plugins/`. `.githooks/pre-commit` runs it with `--staged` (only the mods the commit touches, plus a required version bump in every skill the commit changes) once `git config core.hooksPath .githooks` is set in the clone.

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

# Install/update or uninstall Claude Code mods (external-mods.yaml)
~/dev-os/scripts/manage-mods.sh install|uninstall [--all] [--verbose]

# Merge the versioned skins and settings of the skins mod (configs/claude-skins) into its store in ~/.claude
~/dev-os/scripts/import-skins.sh [--overwrite] [--no-prefs] [--verbose]

# After `git pull`: update every Dev-OS asset already installed on this machine
# (skills/agents in ~/.claude and in each project in ~/.claude.json, workflows,
# output styles, the hook, catalog plugins/mods, npx skill packages, skins)
~/dev-os/scripts/update-all.sh [--dry-run] [--yes] [--project DIR] [--files-only] [--verbose]

# Report, diff or merge (--apply) upstream changes into third-party skills; works on ~/dev-os itself
~/dev-os/scripts/sync-third-party-skills.sh [--all] [--apply] [--verbose]

# One-time, per-machine: install the skill-usage logging hook into ~/.claude
~/dev-os/scripts/setup-skill-hook.sh
```

## Architecture

The curated asset library lives in root-level folders: `skills/`, `agents/`, `hooks/`, `workflows/`, `output-styles/`. The `import-*` scripts copy them into other projects (or globally). Each skill is a self-contained directory with `SKILL.md` (name + description frontmatter) plus optional `references/`, `scripts/`, `rules/`. There are no separate slash commands: a skill with `disable-model-invocation: true` is the equivalent of a command, invoked only as `/<name>`.

Skills are grouped by activity into four top-level categories: `skills/claude-code/`, `skills/engineering/` (with subcategories such as `build/`, `code-review/`, `documentation/`), `skills/learning/` and `skills/productivity/`. Categories exist only in this source library. Claude Code discovers skills one level deep (`.claude/skills/<name>/SKILL.md`), so `import-skills.sh` finds `SKILL.md` at any depth and flattens each skill to its basename at the destination. Skill names must therefore be unique across all categories.

`.claude/` is gitignored and local to each clone: session state and config (`settings.json`, `napkin.md`, logs), and on this machine a relative symlink `.claude/agents → ../agents`. The curated skills do not auto-load when the Dev-OS repo itself is opened in Claude Code; import them like in any other project.

External assets — Claude plugins and `npx skills` packages that are installed rather than copied — are declared in `external-plugins.yaml` and `external-skills.yaml` at the repo root, the single source for `install-plugins.sh` and `install-external-skills.sh`. The YAML holds data only (name, marketplace, source, scope); the scripts build the commands from those fields. Each catalog's schema lives in `load_<kind>_catalog` in `common-functions.sh`, shared by its install script and `check.sh`; `load_catalog` parses a restricted YAML subset with `awk` (one top-level list of flat `key: value` maps, no nesting or multi-line values), so there is no `yq` dependency; it rejects unknown keys. To add a plugin or package, add an entry to the YAML, not to the scripts. Mods (plugins built from function hooks that change the Claude Code UI) have their own catalog, `external-mods.yaml`, with the same fields plus an optional `github`; `manage-mods.sh` installs them like `install-plugins.sh` and also uninstalls them, leaving the marketplace registered; a mod with `marketplace: builtin` ships with Claude Code, so it is enabled/disabled instead. `plugins/` plus `.claude-plugin/marketplace.json` is Dev-OS's own marketplace (`dev-os`), installed through the same catalogs. Before changing a mod in `plugins/`, read `plugins/README.md`: layout, upstream forks, checks and API types, cross-marketplace dependencies, and the five places a mod's description is repeated.

Third-party skills (see `CONTEXT.md`) are copied, not installed: a skill is third-party when its frontmatter has `metadata.last_synced`, and its `metadata.source` must be a GitHub `tree/<ref>/<dir>` URL or a gist `#file-<name>` URL. `sync-third-party-skills.sh` uses the last upstream commit up to that date as the merge base, so keep `last_synced` accurate when copying by hand. A third-party skill's `metadata.version` is the version of Dev-OS's copy, not upstream's: bump it on every local change and every sync, and leave it out of `local_changes`. If upstream has its own `version`, a sync can conflict on that line; keep ours, bumped.

`herdr/` holds layouts for the [Herdr app](https://herdr.dev), one folder each in Herdr's shared-layout format (`layouts/`, `mods/`, `themes/`, ... mirroring `~/.config/herdr-app`, plus `RECIPE.md`). They are unrelated to Claude Code mods (`external-mods.yaml`). Each has `tools/install.sh` / `install.ps1` (copy into the Herdr home; never symlink, Herdr's asset loader doesn't follow links) and `tools/sync-from-live.sh` / `.ps1` (copy live edits back before committing).

`configs/` holds settings of tools Dev-OS installs but does not own, one folder per tool (`configs/README.md`). `configs/claude-skins/` is the versioned copy of two keys of the `skins` mod's store (`~/.claude/plugins/store/skins_hellosverre-mods-<hash>.json`): each `<name>.json` is one made skin in the mod's own shape, and `prefs.json` is the mod's settings. The mod has no export or import, so `import-skins.sh` merges them into the store with `node` and leaves the store's other keys alone. The rules live in `check_skin_configs` in `common-functions.sh`, shared with `check.sh`, and mirror what the mod accepts when it reads its store (`buildCustom`, `parsePrefs`; written against skins 0.5.16), so they must follow the mod when that shape changes.

The skill-usage hook has a single source of truth in `hooks/log-skill.sh`; `setup-skill-hook.sh` copies it into `~/.claude/hooks/` and registers it.

## Conventions

- Kebab-case for all file and directory names.
- Every skill carries `metadata.version: "X.Y.Z"` (semver, quoted, under `metadata:`, never a top-level `version`). Bump it in the same commit as any change to the skill's folder: patch for wording or a fix that keeps the behavior, minor for a new rule or behavior, major when how it is invoked or what it produces changes. A new skill starts at `1.0.0`. `check.sh` enforces the format, and the pre-commit hook rejects a changed skill whose version did not go up.
- Interactive *slash commands* ask one question at a time via the `AskUserQuestion` tool; interactive *scripts* use the shared `select_items` picker instead.
- Skill-usage logging: `setup-skill-hook.sh` registers a `PreToolUse` hook (`~/.claude/hooks/log-skill.sh`) that appends every Skill invocation to the target project's `.claude/skill-usage.log`.
- `.claude/settings.json` (local, not versioned) holds enabled plugins and permissions; `plansDirectory` is `./.plans`.
