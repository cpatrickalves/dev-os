#!/usr/bin/env bash
# Copies nightgrid's live files from the Herdr home back into this repo
# (macOS / Linux). Edit in Herdr (changes apply live), then run this and commit.
#
# Only what this repo owns comes back: the layout, mods/nightgrid, the theme,
# the background and the pi icon. Personal files (nightgrid-config.json,
# programs.json) and third-party mods stay out; --all also brings back
# tab-notes and herdr-filechanges.
#
# Usage: tools/sync-from-live.sh [--all]
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOME_DIR="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
EXCLUDES=(--exclude jsconfig.json --exclude gpui-kit.d.ts --exclude '*.error' --exclude .DS_Store)

mods=(nightgrid)
[[ "${1:-}" == "--all" ]] && mods+=(tab-notes herdr-filechanges)
# --delete leaves excluded names alone, so repo-only files such as the LICENSE
# next to tab-notes are protected the same way.
for m in "${mods[@]}"; do rsync -a --delete "${EXCLUDES[@]}" --exclude LICENSE "$HOME_DIR/mods/$m/" "$REPO/mods/$m/"; done
for f in layouts/nightgrid.json themes/tokyo-night.json backgrounds/tokyo-grid.png custom-icons/pi.svg; do cp "$HOME_DIR/$f" "$REPO/$f"; done

echo "synced from $HOME_DIR"
git -C "$REPO" status --short -- .
