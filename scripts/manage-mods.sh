#!/bin/bash

# =============================================================================
# Dev-OS Manage Mods Script
# Pick Claude Code mods from external-mods.yaml and install or uninstall them
# =============================================================================
#
# A mod is a plugin built from function hooks that changes the Claude Code UI
# (panes, bands, status lines, toasts). It installs like any plugin, so the
# install flow is the same as install-plugins.sh: update first, and only if
# that fails add the marketplace and install.
#
# Selection uses the same shared keyboard picker as import-skills.sh
# (select_items in common-functions.sh): ↑/↓ navigate, Space toggle,
# a all, n none, Enter confirm, q quit.
#
# Catalog: external-mods.yaml at the Dev-OS root (see its header for the
# fields). Commands are built from those fields and run as argv arrays.
#
# Uninstall removes the plugin from its catalog scope and leaves the
# marketplace registered, since other plugins may come from it.

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Source common functions
source "$SCRIPT_DIR/common-functions.sh"

# -----------------------------------------------------------------------------
# Default Values
# -----------------------------------------------------------------------------

ACTION=""
VERBOSE="false"
SELECT_ALL="false"

CATALOG_FILE="$BASE_DIR/external-mods.yaml"

# Parallel catalog arrays (bash 3.2: no associative arrays).
declare -a MOD_NAMES
declare -a MOD_DESCS
declare -a MOD_MARKETPLACES
declare -a MOD_SOURCES  # marketplace_source, may be ""
declare -a MOD_SCOPES
declare -a MOD_GITHUBS  # github, may be ""
declare -a SELECTED_MODS

# -----------------------------------------------------------------------------
# Mod Catalog
# -----------------------------------------------------------------------------

load_mods() {
    MOD_NAMES=(); MOD_DESCS=(); MOD_MARKETPLACES=(); MOD_SOURCES=(); MOD_SCOPES=(); MOD_GITHUBS=()

    local records
    records="$(load_catalog "$CATALOG_FILE" mods \
        name,description,marketplace,marketplace_source,scope,github \
        name,description,marketplace,scope)" || exit 1

    local name desc marketplace source scope github
    while IFS="$CATALOG_SEP" read -r name desc marketplace source scope github; do
        [[ -z "$name" ]] && continue
        case "$scope" in
            user|project|local) ;;
            *)
                print_error "$CATALOG_FILE: $name: invalid scope \"$scope\" (user, project or local)"
                exit 1
                ;;
        esac
        # Relative paths resolve against the Dev-OS root, not the target project.
        case "$source" in
            .|./*|../*) source="$BASE_DIR/${source#./}"; source="${source%/.}" ;;
        esac
        MOD_NAMES+=("$name")
        MOD_DESCS+=("$desc ($scope)")
        MOD_MARKETPLACES+=("$marketplace")
        MOD_SOURCES+=("$source")
        MOD_SCOPES+=("$scope")
        MOD_GITHUBS+=("$github")
    done <<< "$records"

    print_verbose "Catalog contains ${#MOD_NAMES[@]} mods"
    if [[ ${#MOD_NAMES[@]} -eq 0 ]]; then
        print_error "No mods found in $CATALOG_FILE"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 <install|uninstall> [OPTIONS]

Pick Claude Code mods from external-mods.yaml and install or uninstall them.

Actions:
    install            Update each selected mod; install it if the update fails
    uninstall          Uninstall each selected mod (its marketplace stays registered)

Options:
    --all              Select every mod (skip the interactive picker)
    --verbose          Show command output (default: only on failure/fallback)
    -h, --help         Show this help message

Examples:
    $0 install
    $0 install --all
    $0 uninstall

EOF
    exit "${1:-0}"
}

# -----------------------------------------------------------------------------
# Parse Command Line Arguments
# -----------------------------------------------------------------------------

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            install|uninstall)
                if [[ -n "$ACTION" ]]; then
                    print_error "Only one action allowed (got \"$ACTION\" and \"$1\")"
                    show_help 1
                fi
                ACTION="$1"
                shift
                ;;
            --all)
                SELECT_ALL="true"
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
                show_help 1
                ;;
        esac
    done

    if [[ -z "$ACTION" ]]; then
        print_error "Missing action: install or uninstall"
        show_help 1
    fi
}

# -----------------------------------------------------------------------------
# Validation
# -----------------------------------------------------------------------------

validate_environment() {
    if ! command -v claude >/dev/null 2>&1; then
        print_error "The 'claude' CLI was not found on PATH."
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Selection
# -----------------------------------------------------------------------------

select_mods() {
    if [[ "$SELECT_ALL" == "true" ]]; then
        SELECTED_MODS=()
        local n=${#MOD_NAMES[@]}
        local i
        for ((i=0; i<n; i++)); do
            SELECTED_MODS+=("$i")
        done
        print_verbose "Selected all ${#SELECTED_MODS[@]} mods"
        return
    fi

    # Interactive keyboard picker (shared, in common-functions.sh).
    PICKER_NAMES=("${MOD_NAMES[@]}")
    PICKER_DESCS=("${MOD_DESCS[@]}")
    PICKER_NOUN="mods"
    select_items

    SELECTED_MODS=("${PICKER_SELECTED[@]}")
    print_verbose "Selected ${#SELECTED_MODS[@]} mods"
}

# -----------------------------------------------------------------------------
# Install / Uninstall Execution
# -----------------------------------------------------------------------------

# Run a command, hiding its output unless --verbose.
run_quiet() {
    if [[ "$VERBOSE" == "true" ]]; then
        "$@"
    else
        "$@" >/dev/null 2>&1
    fi
}

# Update first; on failure add the marketplace then install.
# Every command sits in an `if` condition so a non-zero exit never trips
# the script-level `set -e`.
install_one() {
    local idx=$1
    local name="${MOD_NAMES[$idx]}"
    local marketplace="${MOD_MARKETPLACES[$idx]}"
    local source="${MOD_SOURCES[$idx]}"
    local scope="${MOD_SCOPES[$idx]}"
    local ref="$name@$marketplace"

    local github="${MOD_GITHUBS[$idx]}"

    print_status "→ ${name}: trying update..."
    if [[ -n "$source" ]]; then
        run_quiet claude plugin marketplace update "$marketplace" || true
    fi
    if run_quiet claude plugin update "$ref" --scope "$scope"; then
        print_success "${name}: updated"
        [[ -n "$github" ]] && echo "    $github"
        return 0
    fi

    print_warning "${name}: update failed — installing"
    if [[ -n "$source" ]]; then
        run_quiet claude plugin marketplace add "$source" || true
    fi
    if claude plugin install "$ref" --scope "$scope"; then
        print_success "${name}: installed"
        [[ -n "$github" ]] && echo "    $github"
        return 0
    fi

    print_error "${name}: install failed"
    return 1
}

uninstall_one() {
    local idx=$1
    local name="${MOD_NAMES[$idx]}"
    local ref="$name@${MOD_MARKETPLACES[$idx]}"
    local scope="${MOD_SCOPES[$idx]}"

    print_status "→ ${name}: uninstalling..."
    if claude plugin uninstall "$ref" --scope "$scope"; then
        print_success "${name}: uninstalled"
        return 0
    fi

    print_error "${name}: uninstall failed"
    return 1
}

execute_action() {
    local failed=()
    local ok=0
    local idx
    for idx in "${SELECTED_MODS[@]}"; do
        if "${ACTION}_one" "$idx"; then
            ok=$((ok + 1))
        else
            failed+=("${MOD_NAMES[$idx]}")
        fi
    done

    echo ""
    if [[ "$ACTION" == "install" ]]; then
        print_success "$ok mod(s) installed/updated"
    else
        print_success "$ok mod(s) uninstalled"
    fi
    if [[ $ok -gt 0 ]]; then
        print_status "Run /reload-plugins in open Claude Code sessions to apply."
    fi
    if [[ ${#failed[@]} -gt 0 ]]; then
        print_error "${#failed[@]} failed:"
        local f
        for f in "${failed[@]}"; do
            echo "    - $f"
        done
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_section "Dev-OS Manage Mods"

    parse_arguments "$@"
    validate_environment
    load_mods

    echo ""
    print_status "Available mods: ${#MOD_NAMES[@]}"
    echo ""

    select_mods

    echo ""
    print_status "Summary:"
    echo "  Mods to ${ACTION}: ${#SELECTED_MODS[@]}"
    echo ""

    execute_action

    echo ""
}

# Run main function
main "$@"
