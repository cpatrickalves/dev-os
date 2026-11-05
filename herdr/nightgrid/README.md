# nightgrid

A [Herdr app](https://herdr.dev) layout: Tokyo Night colors and a faded paper grid
behind the terminal, the sidebar, the tab bar and the status bar. It is
[herdr-van](https://github.com/VanKurnia/herdr-van) (MIT, Ivan Kurniawan) with
the parts of Herdr's default `main` layout that herdr-van leaves out:

- **Files · Changes · Notes** pills at the top right of the tab bar. Each one
  toggles a 368px side panel (Herdr's `files` and `changes`, plus the `tab-notes`
  mod for one markdown note per tab). The open panel is remembered per space.
- **A status bar** at the bottom: machine, the focused terminal's folder (its
  last 3 segments), branch, agent count (the dot turns
  amber while an agent works), blocked agents and the palette key. It has no fill
  of its own, so the grid shows through it.
- **Settings and Add machine** rows in the sidebar footer.

Everything else is herdr-van: the indigo sidebar with spaces and agents, flat tabs
with `+` after the last one, the pane header with the Pi Changes toggle, and the Pi logo.

## Install

The Herdr home is `~/.config/herdr-app` on macOS and Linux and
`%USERPROFILE%\.config\herdr-app` on Windows (`HERDR_APP_HOME` overrides both).
Open the Herdr app once before installing, so the home exists.

```sh
# macOS / Linux
~/dev-os/herdr/nightgrid/tools/install.sh
```

```powershell
# Windows
pwsh -File $HOME\dev-os\herdr\nightgrid\tools\install.ps1
```

Then switch to it with `Ctrl+Shift+L` / `⌘⇧L`, or `herdr-app do layout.switch --name nightgrid`.

The installer copies files. It never symlinks, because Herdr's asset loader doesn't
follow symlinks and the icons and background would go missing. Running it again updates
the files this repo owns: `layouts/nightgrid.json`, `mods/nightgrid`, the theme,
the background and the Pi icon. It also:

- copies `mods/tab-notes` and `mods/herdr-filechanges` only when they're missing
  (`--force` / `-Force` updates them too);
- creates `nightgrid-config.json` only when missing (it holds your brand name);
- merges the `pi` entry into an existing `programs.json` and keeps the rest;
- runs `herdr-app check` on the three mods when `herdr-app` is on PATH.

You can also hand it to an agent running in Herdr:
`Read ~/.config/herdr-app/AGENTS.md, then add the layout in ~/dev-os/herdr/nightgrid`.

## Change it

The Herdr home is where you edit, because Herdr applies changes live. Then copy the
changes back into the repo and commit:

```sh
~/dev-os/herdr/nightgrid/tools/sync-from-live.sh        # --all also brings back the third-party mods
```

```powershell
pwsh -File $HOME\dev-os\herdr\nightgrid\tools\sync-from-live.ps1   # -All, same
```

The sync scripts skip what Herdr generates (`jsconfig.json`, `gpui-kit.d.ts`,
`*.error`) and your personal files (`nightgrid-config.json`, `programs.json`).
Run `herdr-app check ~/.config/herdr-app/mods/nightgrid` before committing.

## Needs

- Herdr app 0.1.12 or later.
- For the UI and terminal font, `JetBrainsMono Nerd Font Mono` (the typographic family name of
  JetBrainsMono NFM). Without it, Herdr falls back to plain JetBrains Mono, which has no
  Nerd Font icons.
- A window of roughly 1080p or larger. The backdrop is 2560×1440, cover-fit.

## What it runs

- `mods/nightgrid` runs `git` per space (on that space's machine), `whoami` once,
  and `hc machine ls`. On Windows, when `nightgrid-config.json` exists, it makes
  one `powershell` call to resolve a symlinked config. It makes no network calls.
- `mods/tab-notes` stores notes in `~/.config/herdr-app/tab-notes/`. It runs no
  programs and makes no network calls.
- `mods/herdr-filechanges` reads the Pi extension's snapshots under
  `data/herdr-filechanges/`, and runs `hc send` only when you accept or decline
  changes.

## Files

| Path | What it is |
|---|---|
| `layouts/nightgrid.json` | the window: tree, theme, background, fonts |
| `mods/nightgrid/` | one mod with seven parts (`tabs`, `spaces`, `agents`, `brand`, `footer`, `pane`, `status`) |
| `mods/tab-notes/` | per-tab notes ([ozcberkay/herdr-coban](https://github.com/ozcberkay/herdr-coban), Apache-2.0) |
| `mods/herdr-filechanges/` | Pi Changes panel opened from a Pi pane's header (from herdr-van) |
| `themes/tokyo-night.json` | the Tokyo Night Night palette |
| `backgrounds/tokyo-grid.png` | the grid backdrop |
| `custom-icons/pi.svg`, `programs.json` | the Pi logo |
| `nightgrid-config.json` | the default brand config (`""` = your username) |
| `RECIPE.md` | the brief to rebuild it from scratch |

## License

MIT. See `LICENSE`. `mods/tab-notes` is Apache-2.0 (`mods/tab-notes/LICENSE`), and the
Lucide icons are ISC.
