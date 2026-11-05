# Nightgrid

A full-window Tokyo Night layout for the Herdr app. It is
[herdr-van](https://github.com/VanKurnia/herdr-van) (indigo `#1a1b26`, blue
`#7aa2f7` accents, a paper grid behind everything) with three things brought back
from Herdr's `main` layout: a Files / Changes / Notes side panel toggled from the
tab bar, a bottom status bar, and Settings + Add machine rows in the sidebar footer.
All three stay transparent, so the grid shows through them.

This file covers what nightgrid changes. Everything it doesn't mention matches
[herdr-van's RECIPE](https://github.com/VanKurnia/herdr-van/blob/main/RECIPE.md):
the theme, the backdrop, the brand row, spaces, agents, the pane header, Pi Changes
and the Pi logo. The only renames are the mod (`herdr-van` → `nightgrid`) and the
config file (`herdr-van-config.json` → `nightgrid-config.json`).

## What you see

Left to right. The 268px transparent sidebar as in herdr-van: brand row (46px),
spaces, agents. Its footer is 69px instead of 40px and has two 28px rows in 13px
text, 8px side padding, 4px above and 8px below, a 1px `border` line on top:

- **Settings**: Lucide `settings.svg` at 14px, the word Settings, an accent dot when
  an app update is ready, and, at the right end, the herdr-tui `⌥ Prefix` chip
  while a prefix waits.
- **Add machine**: Lucide `plus.svg`, the word Add machine, in `dim`.

On the rail (under 160px) both rows show only their icons.

Top to bottom on the right:

- **Tab bar (42px)**, as in herdr-van, plus a group of three pills at the right end,
  8px from the edges and 3px apart. Each pill is 26px tall with 8px side padding,
  6px radius, a 14px icon, a 5px gap and a 12px label: **Files**
  (`mods/files/file.svg`), **Changes** (`mods/changes/changes.svg`), **Notes**
  (`mods/tab-notes/notes.svg`). An idle pill is transparent in `muted`. Hovered, it
  fills with `hover` in `foreground`. The pill of the open panel fills with `raised` in `accent`.
  The pills always show. The `+` and the window ✕ still appear only while the
  pointer is on the bar.
- **Work body**: the terminal card as in herdr-van and, when opened, a `panel`
  column to its right, 368px wide (resizable from 280 to 900px), with a 1px
  `border`. The column holds a stack of `files`, `changes` and `tab-notes`. Those
  mods paint their own `chrome` fill, so the grid doesn't show through the panel.
- **Status bar (28px)**: no fill, 1px `border` line on top, 14px side padding, 16px
  gaps, 11.8px `muted` text. From the left: `monitor.svg` + "This computer" (or
  `server.svg` + the machine name), `branch.svg` + the active space's branch when
  there is one, a 6px dot + "N agents" (the dot is `working` amber while any agent
  works, `dim` otherwise), and "· N needs you" in `blocked` red when agents are
  blocked. On the right is the palette key as bound (`⌘⇧P  commands`) in `dim`.

## How it behaves

- **Panel pills**: clicking a closed pill selects its child in `panel-body` and shows
  `panel`. Clicking the open pill hides `panel`. The choice is remembered per space
  in the tab part's `localStorage` (`panels`): switching spaces restores that
  space's panel, or closes it if the space never had one. This is the shipped
  `tabs` mod's `syncPanel` as it is, including the one-second grace while a restore lands.
- Which of Files / Changes show follows shared `workspace.panels` (default both).
  Notes always shows.
- **Status bar**: clicking the palette hint runs `app.palette`. Everything else
  updates live (spaces, agents, keys). The bar polls nothing.
- **Footer**: Settings runs `app.settings`. Add machine runs
  `mod.open { name: "machine-add" }`. Both stop the press from reaching the sidebar.
- Agent statuses, tabs, spaces, brand hover and the prefix badge behave as in herdr-van.

## Built from

**Layout** `layouts/nightgrid.json`, which is herdr-van's tree with two additions.
Every herdr-van block points at `nightgrid`.

- `work-body` (row, `padding: 0`)
  - `main`, as in herdr-van
  - `panel` (column, 368px, min 280, max 900, `hidden: true`, 1px `border`)
    - `panel-body` (stack, `active: "files"`): `files` → `files`, `changes` →
      `changes`, `tab-notes` → `tab-notes`
- `status` (block, 28px, last child of `work`) → `nightgrid`, `props: { part: "status" }`
- `sidebar-footer` is 69px.

The stack and child ids must stay `panel`, `panel-body`, `files`, `changes` and
`tab-notes`, because the tab part looks them up by id.

**Mod** `mods/nightgrid/`: herdr-van's single mod with a seventh part.

| part | change from herdr-van |
| --- | --- |
| `tabs` | adds `find()`, `syncPanel()` and `panelButton()`, ported from the shipped `tabs` mod, restyled as transparent pills. The pill group is drawn only when the layout has a `panel` node |
| `footer` | the gear becomes a Settings row, and an Add machine row is added (as in the shipped `workspace-chrome` footer). The prefix chip moves to the Settings row's right end |
| `status` | new (`status.js`): the shipped `workspace-status` without `.bg(t.chrome)`, with herdr-van's icons and the working-amber dot |

`main.js` maps `status: Status`. The Prefix chip's code stays, and it shows only
when the separate `herdr-tui-prefix` mod sets `prefix.armed`.

**Shipped mods it uses**: `files`, `changes`, `new-menu`, `menu`, `picker`,
`machine-add`.
**Bundled third-party mods**: `tab-notes` (from ozcberkay/herdr-coban, Apache-2.0)
and `herdr-filechanges` (from herdr-van).

**Commands**: `layout.select`, `layout.show`, `layout.hide`, `app.settings`,
`app.palette`, `mod.open`, plus herdr-van's.

## Watch out

- `workspace-status` paints `chrome`, which would cover the grid. That's why the
  status bar is its own part and not the shipped mod.
- The panel pills read the layout tree each render. A layout without a `panel`
  node shows no pills instead of buttons that do nothing.
- Install by copying, never symlinking: Herdr's asset loader doesn't follow
  symlinks.
- Don't commit a `preview.png` taken from a real session: it shows space names
  and terminal contents. Take one from a demo space.
- Version skew: built against Herdr 0.1.12. On a newer Herdr, diff the shipped
  `tabs`, `workspace-chrome` and `workspace-status` against the ported code.

## Done when

- [ ] `herdr-app check` passes for `nightgrid`, `tab-notes` and `herdr-filechanges`,
      and `herdr-app status` shows no errors after `layout.switch` to `nightgrid`.
- [ ] Files, Changes and Notes each open their panel. The active pill turns
      accent, and clicking it again closes the panel.
- [ ] Switching spaces restores each space's last panel, or none.
- [ ] The status bar shows the grid through it, the machine, the branch and the
      agent count, and its palette hint opens the palette.
- [ ] The footer shows Settings and Add machine. Add machine opens the
      machine-add dialog. On the rail the rows show icons only.
- [ ] Everything on herdr-van's own Done-when list still holds, except the "no
      Files/Changes buttons" and "no status bar" items.
