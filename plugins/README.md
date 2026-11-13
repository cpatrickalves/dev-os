# plugins/

Dev-OS's own marketplace, `dev-os` (`.claude-plugin/marketplace.json` at the repo root). Each folder is one plugin. `thermos` holds agents and skills; the others are mods, plugins built from function hooks (`hooks/hooks.json` naming a hooks module). They install through `external-mods.yaml` and `external-plugins.yaml`, like any external plugin.

## A mod's layout

- `.claude-plugin/plugin.json`: the manifest. `version` goes up with each change, so an installed copy updates.
- `hooks/hooks.json` names the hooks module, `hooks/register.tsx`.
- `types/index.d.ts`: the contract of the values the mod keeps in `$.state`.
- Tests: `hooks/*.test.tsx`. `usage-meter` (a restyled fork) and `next-steps` (a copy without the band order file) come from [hamzafer/claude-code-mods](https://github.com/hamzafer/claude-code-mods) and keep upstream's layout: tests in `tests/*.test.ts`, a `tsconfig.json` and the MIT `LICENSE`.

## Checking a mod

`scripts/check.sh` checks every mod: `claude plugin validate`, `claude plugin test`, and a type check of `hooks/` and `types/` with `tsc`. With `--staged`, as the pre-commit hook runs it, it checks only the mods the commit touches.

- **Where the API types come from:** the engine writes them under its temp folder, once per Claude Code version, when the `plugin-authoring` skill loads (`$TMPDIR/claude-<uid>/bundled-skills/<version>/*/plugin-authoring/types/claude-code.d.ts`). Until then, `check.sh` skips the type check with a warning.
- **What the type check leaves out:** test files. `next-steps`' upstream tests use a `$.prompt.edit` the current types no longer declare, though they still pass.
- **The `tsconfig.json` inside a mod:** it extends `.claude-plugin/types/tsconfig.json`, which the engine writes only beside a mod it hot-reloads from a dev folder. That folder is gitignored, and `check.sh` builds its own tsconfig instead.

## Depending on another marketplace's mod

`quiet-edits` reads the state of `skins` (whether it is on, and each tool row's chevron). So its `plugin.json` lists `skins@hellosverre-mods` under `dependencies`, and `marketplace.json` allows that marketplace in `allowCrossMarketplaceDependenciesOn`. `check.sh` type-checks such a mod against the installed dependency's `types` contract.

## Where a mod is described

A mod's one-line description is repeated in five places. Update every one when the mod changes what it shows:

- `plugins/<mod>/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `external-mods.yaml`
- the mods table in `README.md`
- `CHANGELOG.md`
