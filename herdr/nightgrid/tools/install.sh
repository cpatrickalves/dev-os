#!/usr/bin/env bash
# Installs the nightgrid layout into the Herdr home (macOS / Linux).
#
# Copies, never symlinks: Herdr's asset loader does not follow symlinks, so
# icons and the background would silently go missing.
#
# Owned by this repo, always updated: layouts/nightgrid.json, mods/nightgrid,
# themes/tokyo-night.json, backgrounds/tokyo-grid.png, custom-icons/pi.svg.
# Third-party mods (tab-notes, herdr-filechanges) are copied only when missing,
# unless --force. nightgrid-config.json is personal: created only when missing.
# programs.json: the `pi` entry is merged in, the rest of the file is kept.
#
# Usage: tools/install.sh [--force]
#        HERDR_APP_HOME=/other/home tools/install.sh
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOME_DIR="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

[[ -d "$HOME_DIR" ]] || { echo "Herdr home not found: $HOME_DIR (open the Herdr app once first)" >&2; exit 1; }

EXCLUDES=(--exclude jsconfig.json --exclude gpui-kit.d.ts --exclude '*.error' --exclude .DS_Store)

# A new mod folder is staged in a hidden folder and moved in whole, so Herdr
# never sees main.js without mod.json (it would dock the mod into the layout).
copy_mod() {
  local name="$1" dest="$HOME_DIR/mods/$1"
  if [[ -d "$dest" ]]; then
    rsync -a --delete "${EXCLUDES[@]}" "$REPO/mods/$name/" "$dest/"
  else
    local stage="$HOME_DIR/mods/.$name.stage"
    rm -rf "$stage"
    rsync -a "${EXCLUDES[@]}" "$REPO/mods/$name/" "$stage/"
    mv "$stage" "$dest"
  fi
  echo "  mods/$name"
}

copy_file() {
  mkdir -p "$HOME_DIR/$(dirname "$1")"
  cp "$REPO/$1" "$HOME_DIR/$1"
  echo "  $1"
}

echo "Installing nightgrid into $HOME_DIR"
copy_mod nightgrid
for m in tab-notes herdr-filechanges; do
  if [[ ! -d "$HOME_DIR/mods/$m" || $FORCE == 1 ]]; then copy_mod "$m"; else echo "  mods/$m (kept, --force to update)"; fi
done
copy_file themes/tokyo-night.json
copy_file backgrounds/tokyo-grid.png
copy_file custom-icons/pi.svg
copy_file layouts/nightgrid.json
[[ -f "$HOME_DIR/nightgrid-config.json" ]] || copy_file nightgrid-config.json

if [[ ! -f "$HOME_DIR/programs.json" ]]; then
  copy_file programs.json
elif command -v python3 >/dev/null; then
  python3 - "$REPO/programs.json" "$HOME_DIR/programs.json" <<'PY'
import json, sys
src, dst = (json.load(open(p)) for p in sys.argv[1:3])
dst.setdefault("programs", {})
added = [k for k in src["programs"] if k not in dst["programs"]]
for k in added: dst["programs"][k] = src["programs"][k]
if added:
    json.dump(dst, open(sys.argv[2], "w"), indent=2)
print("  programs.json (" + ("added " + ", ".join(added) if added else "pi already there") + ")")
PY
else
  echo "  programs.json: python3 missing; add the \"pi\" entry from $REPO/programs.json by hand" >&2
fi

if command -v herdr-app >/dev/null; then
  for m in nightgrid tab-notes herdr-filechanges; do herdr-app check "$HOME_DIR/mods/$m"; done
  echo "Done. Switch with: herdr-app do layout.switch --name nightgrid"
else
  echo "Done. herdr-app not on PATH: run 'herdr-app check' on each mod, then switch to nightgrid (Ctrl+Shift+L)."
fi
