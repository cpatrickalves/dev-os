# herdr

Layouts for the [Herdr app](https://herdr.dev), a desktop app for terminals and
coding agents. This folder has nothing to do with Claude Code: `external-mods.yaml`
and the rest of Dev-OS are about Claude Code, while everything here installs into
the Herdr home (`~/.config/herdr-app`, or `%USERPROFILE%\.config\herdr-app` on
Windows). The `HERDR_APP_HOME` env var overrides the default in the install
scripts. From WSL, the Windows Herdr home is reachable at
`/mnt/c/Users/<user>/.config/herdr-app` — editing it from there works, since
Herdr only cares about the files. To run the scripts from WSL against that
home, call the `.ps1` ones through Windows PowerShell
(`powershell.exe -NoProfile -File 'C:\...\tools\sync-from-live.ps1'`): the `.sh`
ones default to the WSL home and, in a checkout made by Git for Windows, fail
on their CRLF line endings (`set: pipefail: invalid option name`).

Each layout is a folder in Herdr's shared-layout format
([herdr.dev/gallery](https://herdr.dev/gallery/)). It mirrors the Herdr home
(`layouts/`, `mods/`, `themes/`, `backgrounds/`, ...) and has a `RECIPE.md` that
another agent can rebuild it from.

| Layout | What it is |
|---|---|
| [`nightgrid/`](nightgrid/) | Tokyo Night over a paper grid ([herdr-van](https://github.com/VanKurnia/herdr-van) based), with a Files / Changes / Notes panel, a status bar and Settings + Add machine in the sidebar |

## Usage

Each layout comes with its own scripts in `tools/`:

```sh
<layout>/tools/install.sh           # repo -> Herdr home (macOS / Linux)
<layout>/tools/sync-from-live.sh    # Herdr home -> repo, after editing live
```

On Windows, use `install.ps1` and `sync-from-live.ps1` (`pwsh -File ...`).

- **Install by copying, never symlinking.** Herdr's asset loader doesn't follow
  symlinks, so icons and backgrounds go missing.
- **Edit in the Herdr home, version here.** Herdr applies edits live. Once it looks
  right, run `sync-from-live` and commit.
- **Don't commit screenshots from real sessions.** This repo is public, and
  `herdr-app shot` captures space names and terminal contents.

## Suggested: match Claude Code to nightgrid

Optional, and separate from the layout: nothing below goes into the Herdr home.
A layout only styles Herdr itself, so a Claude Code session in one of its
terminals keeps its own colours. Three Dev-OS pieces make that session look
like the rest of the window:

- the [`skins`](https://github.com/hellosverre/claude-skins) mod, which restyles
  the Claude Code transcript;
- the `nightgrid` skin in [`configs/claude-skins`](../configs/README.md):
  `tokyo-night` with the secondary text and the table zebra set to the colours
  of the nightgrid theme;
- the [`quiet-edits`](../plugins/quiet-edits/) mod, which folds the diff under
  `Edit`, `MultiEdit` and `Write` rows until the row is opened. It needs `skins`.

Run the steps where Claude Code runs (inside WSL if that is where you start
it), with Dev-OS cloned at `~/dev-os`. They write to `~/.claude`:

1. Install the two mods. Pick `skins` and `quiet-edits` in the picker:

   ```sh
   ~/dev-os/scripts/manage-mods.sh install
   ```

2. Open Claude Code once, so `skins` writes its store file, then close every
   Claude Code session.
3. Import the skin and the settings:

   ```sh
   ~/dev-os/scripts/import-skins.sh
   ```

   This adds the `nightgrid` skin and applies `prefs.json`, which selects it
   and replaces this machine's `skins` settings. To keep your settings, run it
   with `--no-prefs` and pick the skin in `/skin` afterwards. If a `nightgrid`
   skin already exists and differs, `--overwrite` replaces it.
4. Start a new Claude Code session: `skins` reads its store when a session
   starts.

[`configs/README.md`](../configs/README.md) has the details of the import, and
`~/dev-os/scripts/manage-mods.sh uninstall` removes the mods.
