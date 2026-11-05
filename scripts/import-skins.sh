#!/bin/bash

# =============================================================================
# Dev-OS Import Skins Script
# Merge the versioned skins and settings of the `skins` Claude Code mod
# (configs/claude-skins) into the mod's store on this machine
# (~/.claude/plugins/store/skins_hellosverre-mods-*.json)
# =============================================================================

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Source common functions
source "$SCRIPT_DIR/common-functions.sh"

# -----------------------------------------------------------------------------
# Default Values
# -----------------------------------------------------------------------------

VERBOSE="false"
OVERWRITE="false"
WITH_PREFS="true"

SKINS_SOURCE="$HOME/dev-os/configs/claude-skins"
# The mod keeps everything in one store file. Its name ends in a hash the
# engine derives from the plugin id, so it is found by pattern.
STORE_DIR="$HOME/.claude/plugins/store"
STORE_PATTERN="skins_hellosverre-mods-*.json"

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Merge the skins and settings versioned in configs/claude-skins into the store
of the skins Claude Code mod (https://github.com/hellosverre/claude-skins), so
this machine looks like the others. Nothing else in the store is touched.

Each <name>.json is one made skin; prefs.json holds the mod's settings (the
skin in use and every part switched on or off).

Run it with no Claude Code session open, then start a new one: the mod reads
its store when a session starts, and an open session can write its old state
back.

Options:
    --overwrite        Replace a skin already in the store when it differs
                       (without it, such a skin is skipped)
    --no-prefs         Import the skins only; keep this machine's settings
    --verbose          Show detailed output
    -h, --help         Show this help message

Examples:
    $0
    $0 --overwrite
    $0 --no-prefs

EOF
    exit 0
}

# -----------------------------------------------------------------------------
# Parse Command Line Arguments
# -----------------------------------------------------------------------------

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --overwrite)
                OVERWRITE="true"
                shift
                ;;
            --no-prefs)
                WITH_PREFS="false"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                ;;
        esac
    done
}

# -----------------------------------------------------------------------------
# Validation Functions
# -----------------------------------------------------------------------------

validate_source() {
    if ! command -v node > /dev/null; then
        print_error "node not found: it is needed to read and write the store"
        exit 1
    fi

    if [[ ! -d "$SKINS_SOURCE" ]]; then
        print_error "Skins source not found: $SKINS_SOURCE"
        exit 1
    fi

    if ! check_skin_configs "$SKINS_SOURCE"; then
        print_error "configs/claude-skins is invalid; nothing was imported"
        exit 1
    fi
}

# Fills STORE_FILES with the mod's store file(s).
find_stores() {
    STORE_FILES=()
    local file
    for file in "$STORE_DIR"/$STORE_PATTERN; do
        if [[ -f "$file" ]]; then
            STORE_FILES+=("$file")
        fi
    done

    if [[ ${#STORE_FILES[@]} -eq 0 ]]; then
        print_error "The skins mod has no store in $STORE_DIR"
        echo "Install the mod (~/dev-os/scripts/manage-mods.sh install), open Claude Code"
        echo "once so the mod writes its store, close it, then run this script again."
        exit 1
    fi

    print_verbose "Found ${#STORE_FILES[@]} store file(s)"
}

# -----------------------------------------------------------------------------
# Import Execution
# -----------------------------------------------------------------------------

# Merges the skins into the store's `custom` key and prefs.json over its
# `prefs` key. Prints one line per skin and per changed setting. Exit status:
# 0 store written, 3 store left as it was; 4 and 5 are the same two with at
# least one skin skipped because it differs.
merge_into_store() {
    node -e '
const fs = require("fs"), path = require("path")
const [dir, storeFile, overwrite, withPrefs] = process.argv.slice(1)
const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value)

const text = fs.readFileSync(storeFile, "utf8")
let store
try {
  store = JSON.parse(text)
} catch (e) {
  console.error(`${storeFile} is not valid JSON: ${e.message}`)
  process.exit(1)
}
if (!isObject(store)) {
  console.error(`${storeFile} is not a JSON object`)
  process.exit(1)
}

// A made skin as the mod stores it: every field present, colours lowercase.
const full = skin => ({
  name: skin.name,
  label: typeof skin.label === "string" && skin.label.trim() !== "" ? skin.label.trim().slice(0, 32) : skin.name,
  base: skin.base,
  palette: Object.fromEntries(Object.entries(skin.palette ?? {}).map(([slot, hex]) => [slot, hex.toLowerCase()])),
  spinner: (skin.spinner ?? []).map(word => word.trim()),
  done: (skin.done ?? []).map(word => word.trim()),
})
// The same, with the palette in a fixed order, to compare two skins.
const canonical = skin => {
  try {
    const whole = full(skin)
    return JSON.stringify({ ...whole, palette: Object.entries(whole.palette).sort(([a], [b]) => (a < b ? -1 : 1)) })
  } catch {
    return undefined
  }
}
const show = value => (value === undefined ? "unset" : JSON.stringify(value))
const sameCalm = (a, b) =>
  (a ?? null) === (b ?? null) ||
  (isObject(a) && isObject(b) && ["shimmer", "rail", "quiet"].every(part => a[part] === b[part]))

let changed = false
let skipped = false
const custom = isObject(store.custom) ? { ...store.custom } : {}
const files = fs.readdirSync(dir).filter(file => file.endsWith(".json") && file !== "prefs.json").sort()

for (const file of files) {
  const skin = full(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")))
  const existing = custom[skin.name]

  if (existing === undefined) {
    custom[skin.name] = skin
    changed = true
    console.log(`  added      ${skin.name}`)
  } else if (canonical(existing) === canonical(skin)) {
    console.log(`  unchanged  ${skin.name}`)
  } else if (overwrite === "true") {
    custom[skin.name] = skin
    changed = true
    console.log(`  updated    ${skin.name}`)
  } else {
    skipped = true
    console.log(`  skipped    ${skin.name}: differs from the one in the store`)
  }
}
store.custom = custom

const prefsFile = path.join(dir, "prefs.json")
if (withPrefs === "true" && fs.existsSync(prefsFile)) {
  const wanted = JSON.parse(fs.readFileSync(prefsFile, "utf8"))
  const prefs = isObject(store.prefs) ? { ...store.prefs } : {}
  let settings = 0

  for (const [key, value] of Object.entries(wanted)) {
    const same = key === "calm" ? sameCalm(prefs[key], value) : prefs[key] === value
    if (same) continue
    console.log(`  setting    ${key}: ${show(prefs[key])} -> ${show(value)}`)
    prefs[key] = value
    settings += 1
  }

  if (settings === 0) {
    console.log("  unchanged  settings")
  } else {
    store.prefs = prefs
    changed = true
  }
}

if (!changed) process.exit(skipped ? 4 : 3)

const indent = /\n\s+"/.test(text) ? 2 : undefined
const temp = `${storeFile}.tmp-${process.pid}`
fs.writeFileSync(temp, JSON.stringify(store, null, indent) + (text.endsWith("\n") ? "\n" : ""), { mode: 0o600 })
fs.renameSync(temp, storeFile)
if (skipped) process.exit(5)
' "$SKINS_SOURCE" "$1" "$OVERWRITE" "$WITH_PREFS"
}

execute_import() {
    local store status written=0 skipped=0
    for store in "${STORE_FILES[@]}"; do
        print_verbose "Store: $store"
        status=0
        merge_into_store "$store" || status=$?
        case "$status" in
            0) written=$((written + 1)) ;;
            3) ;;
            4) skipped=$((skipped + 1)) ;;
            5)
                written=$((written + 1))
                skipped=$((skipped + 1))
                ;;
            *)
                print_error "Could not update $store"
                exit 1
                ;;
        esac
    done

    echo ""
    if [[ "$written" -gt 0 ]]; then
        print_success "Updated the skins mod's store in $STORE_DIR/"
        print_status "Start a new Claude Code session to see it."
    elif [[ "$skipped" -eq 0 ]]; then
        print_success "The skins mod's store already matches configs/claude-skins"
    else
        print_status "Nothing was written to the skins mod's store."
    fi
    if [[ "$skipped" -gt 0 ]]; then
        print_warning "A skipped skin is still this machine's version; rerun with --overwrite to replace it."
    fi
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_section "Dev-OS Import Skins"

    # Parse arguments
    parse_arguments "$@"

    # Validate source and locate the mod's store
    validate_source
    find_stores

    # Show summary
    echo ""
    print_status "Source: $SKINS_SOURCE"
    print_status "Destination: $STORE_DIR/$STORE_PATTERN"
    if [[ "$WITH_PREFS" == "false" ]]; then
        print_status "Settings (prefs.json): not imported (--no-prefs)"
    fi
    echo ""

    # Execute import
    execute_import

    echo ""
}

# Run main function
main "$@"
