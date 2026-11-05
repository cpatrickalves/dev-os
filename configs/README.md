# configs

Settings of tools Dev-OS installs but does not own, versioned here so every
machine can be made to look the same. One folder per tool.

| Folder | What it holds | Applied with |
|---|---|---|
| [`claude-skins/`](claude-skins/) | Skins and settings of the [`skins`](https://github.com/hellosverre/claude-skins) Claude Code mod | `scripts/import-skins.sh` |

## claude-skins

The `skins` mod has no export or import: it keeps the skins you make and its
settings in its own store file,
`~/.claude/plugins/store/skins_hellosverre-mods-<hash>.json`. The files here
are the versioned copy of two keys of that store:

- `<name>.json`: one made skin, in the mod's own shape (`name`, `label`,
  `base`, `palette`, `spinner`, `done`). The file name is the skin's name. A
  made skin lists only the palette slots it changes from its `base`.
  `nightgrid.json` is `tokyo-night` with the secondary text and the table
  zebra set to the colours of the [`herdr/nightgrid`](../herdr/nightgrid/)
  layout's theme.
- `prefs.json`: the mod's settings (the `/skin` screen): the skin in use and
  every part switched on or off.

`scripts/import-skins.sh` merges them into the store and leaves the rest of it
(the mod's update check and other bookkeeping) alone:

```sh
~/dev-os/scripts/import-skins.sh              # add missing skins, apply prefs.json
~/dev-os/scripts/import-skins.sh --overwrite  # also replace skins that differ
~/dev-os/scripts/import-skins.sh --no-prefs   # skins only, keep this machine's settings
```

- The mod must be installed (`scripts/manage-mods.sh install`) and Claude Code
  opened once, so the store file exists.
- Run it with no Claude Code session open, then start a new one: the mod reads
  the store when a session starts, and an open session can write its old
  state back.
- It writes a file the mod treats as private. If a later version of the mod
  changes that file's shape, the script and the validation in
  `common-functions.sh` (`check_skin_configs`) need to follow. Written against
  skins 0.5.16.
- To bring a change made in `/skin` back here, copy the skin from the store's
  `custom` key, or its `prefs` key, into these files by hand.

`scripts/check.sh` validates these files with the rules the mod applies when
it reads its store, so a file it would drop fails the check.
