# herdr

Layouts for the [Herdr app](https://herdr.dev), a desktop app for terminals and
coding agents. This folder has nothing to do with Claude Code: `external-mods.yaml`
and the rest of Dev-OS are about Claude Code, while everything here installs into
the Herdr home (`~/.config/herdr-app`, or `%USERPROFILE%\.config\herdr-app` on
Windows).

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
