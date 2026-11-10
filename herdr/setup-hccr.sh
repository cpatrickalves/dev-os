#!/bin/bash

# =============================================================================
# Dev-OS Setup hccr Script
# Make ~/.zshrc load herdr/hccr.zsh (the hccr and _hc_tab_name zsh
# functions), replacing any copy of them pasted into ~/.zshrc by hand
# =============================================================================

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Source common functions
source "$BASE_DIR/scripts/common-functions.sh"

# -----------------------------------------------------------------------------
# Default Values
# -----------------------------------------------------------------------------

DRY_RUN="false"

SOURCE_FILE="$SCRIPT_DIR/hccr.zsh"
ZSHRC="${ZDOTDIR:-$HOME}/.zshrc"
MARK_BEGIN="# >>> dev-os hccr >>>"
MARK_END="# <<< dev-os hccr <<<"
# Written into ~/.zshrc as is: $HOME expands when the shell starts
SOURCE_LINE='[[ -r "$HOME/dev-os/herdr/hccr.zsh" ]] && source "$HOME/dev-os/herdr/hccr.zsh"'

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Make ~/.zshrc load herdr/hccr.zsh, which defines hccr (open Claude Code
in a herdr-core terminal and name the Herdr tab after it) and its helper
_hc_tab_name. Since ~/.zshrc sources the file from ~/dev-os, a git pull
updates the functions on this machine.

Any hccr or _hc_tab_name defined in ~/.zshrc itself (with the comment lines
right above it) is removed, so the versioned copy is the only one. ~/.zshrc is
backed up first. Running it again changes nothing.

Options:
    --dry-run          Show the change to ~/.zshrc without writing it
    -h, --help         Show this help message

Requires zsh, python3 and hc (herdr-core) on the PATH.
EOF
}

# -----------------------------------------------------------------------------
# Parse Arguments
# -----------------------------------------------------------------------------

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

print_section "Setup hccr"

if [ ! -f "$SOURCE_FILE" ]; then
    print_error "Source not found: $SOURCE_FILE"
    exit 1
fi
if [ "$BASE_DIR" != "$HOME/dev-os" ]; then
    print_error "Dev-OS must be cloned at ~/dev-os (found at $BASE_DIR)"
    exit 1
fi

for cmd in zsh python3 hc; do
    command -v "$cmd" > /dev/null || print_warning "$cmd not found on the PATH: hccr needs it"
done

[ -f "$ZSHRC" ] || touch "$ZSHRC"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

# Drop every hand-made definition of the two functions, from its opening line
# to the first `}` at column 0, with the comment lines right above it and the
# blank line right below it. Drop the marked block too: it is written again
# below, so an older one (another path) is replaced.
status=0
awk -v begin="$MARK_BEGIN" -v end="$MARK_END" '
    !skip && $0 == begin { block = 1; next }
    block { if ($0 == end) { block = 0; gap = 1 }; next }
    !skip && /^[[:space:]]*#/ { buf = buf $0 "\n"; gap = 0; next }
    !skip && /^(function[[:space:]]+)?(hccr|_hc_tab_name)[[:space:]]*(\(\))?[[:space:]]*\{/ {
        skip = 1; buf = ""; next
    }
    skip { if ($0 ~ /^\}[[:space:]]*$/) { skip = 0; gap = 1 }; next }
    gap && /^[[:space:]]*$/ { gap = 0; next }
    { printf "%s", buf; buf = ""; gap = 0; print }
    END { printf "%s", buf; if (skip) exit 2; if (block) exit 3 }
' "$ZSHRC" > "$tmp" || status=$?
if [ "$status" -eq 2 ]; then
    print_error "A definition of hccr or _hc_tab_name in $ZSHRC has no closing '}' at column 0; fix it by hand"
    exit 1
elif [ "$status" -ne 0 ]; then
    print_error "$ZSHRC has '$MARK_BEGIN' without '$MARK_END'; fix it by hand"
    exit 1
fi

# A blank line before the block, unless the file ends in one already
[ -s "$tmp" ] && [ -n "$(tail -n 1 "$tmp")" ] && echo >> "$tmp"
printf '%s\n%s\n%s\n' "$MARK_BEGIN" "$SOURCE_LINE" "$MARK_END" >> "$tmp"

if cmp -s "$ZSHRC" "$tmp"; then
    print_success "$ZSHRC already loads hccr.zsh; nothing to do"
    exit 0
fi

if [ "$DRY_RUN" = "true" ]; then
    diff -u "$ZSHRC" "$tmp" || true
    print_status "Dry run: $ZSHRC was not changed"
    exit 0
fi

backup="$ZSHRC.bak-$(date +%Y%m%d-%H%M%S)"
cp "$ZSHRC" "$backup"
cat "$tmp" > "$ZSHRC"

if command -v zsh > /dev/null && ! zsh -n "$ZSHRC"; then
    cp "$backup" "$ZSHRC"
    print_error "$ZSHRC failed zsh -n after the change; restored it from $backup"
    exit 1
fi

print_success "$ZSHRC now loads herdr/hccr.zsh (backup: $backup)"
print_status "Run 'source $ZSHRC' or open a new shell to use it"
